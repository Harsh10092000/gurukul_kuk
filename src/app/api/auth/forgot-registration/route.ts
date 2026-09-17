import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';

// Shared global in-memory OTP cache
declare global {
  var _gurukulOtps: Map<string, { otp: string; expiresAt: number; verified: boolean }> | undefined;
}

const otpStore = global._gurukulOtps || new Map();
global._gurukulOtps = otpStore;

function maskEmail(email?: string) {
  if (!email || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local}***@${domain}`;
  return `${local[0]}${'*'.repeat(Math.min(4, local.length - 2))}${local[local.length - 1]}@${domain}`;
}

function maskPhone(phone?: string) {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '').slice(-10);
  if (clean.length !== 10) return phone;
  return `${clean.slice(0, 2)}******${clean.slice(-2)}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, identifier, otp } = body;

    const rawTarget = (identifier || '').trim();
    if (!rawTarget) {
      return NextResponse.json(
        { error: 'Registered Mobile Number or Email Address is required.' },
        { status: 400 }
      );
    }

    const cleanPhone = rawTarget.replace(/\D/g, '').slice(-10);
    const cleanId = rawTarget.toLowerCase();

    // Action 1: Send / Resend OTP
    if (action === 'send_otp' || action === 'resend_otp') {
      const user = 
        (cleanPhone.length === 10 ? await db.findUserByPhone(cleanPhone) : null) ||
        (await db.findUserByIdentifier(cleanId));

      if (!user) {
        return NextResponse.json(
          { error: 'No registered account found matching this Mobile Number or Email. Please check your credentials or create a new registration.' },
          { status: 404 }
        );
      }

      // Generate 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store OTP in cache
      const payload = { otp: generatedOtp, expiresAt, verified: false };
      otpStore.set(cleanId, payload);
      if (cleanPhone.length === 10) otpStore.set(cleanPhone, payload);
      if (user.email) otpStore.set(user.email.toLowerCase(), payload);
      if (user.phone) otpStore.set(user.phone.replace(/\D/g, '').slice(-10), payload);

      // Send OTP to registered email
      if (user.email) {
        await sendNotification({
          to: user.email,
          name: user.name || 'Candidate',
          type: 'REGISTRATION_OTP',
          data: { otp: generatedOtp },
        });
      }

      console.log(`[Forgot Reg No] Dispatched OTP for user ${user.id} (${user.email || user.phone}): ${generatedOtp}`);

      return NextResponse.json({
        success: true,
        message: `A 6-digit verification code has been dispatched to ${maskEmail(user.email) || maskPhone(user.phone)}.`,
        maskedEmail: maskEmail(user.email),
        maskedPhone: maskPhone(user.phone),
        expiresInSeconds: 600,
      });
    }

    // Action 2: Verify OTP and return Registration Number
    if (action === 'verify_otp') {
      const userOtp = (otp || '').trim();
      if (!userOtp || userOtp.length !== 6) {
        return NextResponse.json(
          { error: 'Please enter the 6-digit verification code sent to your registered email/mobile.' },
          { status: 400 }
        );
      }

      const stored = 
        otpStore.get(cleanId) ||
        (cleanPhone.length === 10 ? otpStore.get(cleanPhone) : null);

      if (!stored) {
        return NextResponse.json(
          { error: 'No active OTP request found for this account or code expired. Please click "Resend OTP".' },
          { status: 400 }
        );
      }

      if (Date.now() > stored.expiresAt) {
        otpStore.delete(cleanId);
        if (cleanPhone) otpStore.delete(cleanPhone);
        return NextResponse.json(
          { error: 'Verification code has expired. Please request a new OTP.' },
          { status: 400 }
        );
      }

      if (stored.otp !== userOtp) {
        return NextResponse.json(
          { error: 'Incorrect verification code. Please double-check and try again.' },
          { status: 400 }
        );
      }

      // Find user
      const user = 
        (cleanPhone.length === 10 ? await db.findUserByPhone(cleanPhone) : null) ||
        (await db.findUserByIdentifier(cleanId));

      if (!user) {
        return NextResponse.json(
          { error: 'User account not found.' },
          { status: 404 }
        );
      }

      // Check registration number on user or linked application
      let registrationNumber = user.registrationNumber;
      let classApplying = '';

      const linkedApp = await db.getApplicationByUserId(user.id);

      if (linkedApp) {
        registrationNumber = registrationNumber || linkedApp.registrationNumber || linkedApp.applicationNumber;
        classApplying = linkedApp.classApplying || '';
      }

      // Clear verified OTP
      if (otpStore) {
        otpStore.delete(cleanId);
        if (cleanPhone) otpStore.delete(cleanPhone);
        if (user.email) otpStore.delete(user.email.toLowerCase());
      }

      if (!registrationNumber) {
        return NextResponse.json({
          success: true,
          hasRegistrationNumber: false,
          name: user.name,
          message: 'Your candidate account is registered, but your permanent Registration Number is generated after application submission and fee payment. You can sign in using your Mobile Number / Email and Password to continue filling your form.',
        });
      }

      // Securely dispatch registration number directly to candidate's registered email
      if (user.email) {
        await sendNotification({
          to: user.email,
          name: user.name || 'Candidate',
          type: 'FORGOT_REGISTRATION_RECOVERY',
          data: {
            registrationNumber,
            className: classApplying || 'Entrance Exam 2027-28',
          },
        });
        console.log(`[Forgot Reg No] Dispatched registration number ${registrationNumber} to candidate email ${user.email}`);
      }

      return NextResponse.json({
        success: true,
        hasRegistrationNumber: true,
        sentToEmail: true,
        name: user.name,
        maskedEmail: maskEmail(user.email),
        maskedPhone: maskPhone(user.phone),
        message: `Your permanent Registration Number has been dispatched to your registered email address (${maskEmail(user.email)}). Please check your email inbox.`,
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to process request.' },
      { status: 500 }
    );
  }
}

