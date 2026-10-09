import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

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
    const clientIp = getClientIp(req);
    const ipCheck = checkRateLimit(
      `forgot_reg_ip:${clientIp}`,
      RATE_LIMIT_CONFIGS.OTP.limit,
      RATE_LIMIT_CONFIGS.OTP.windowMs
    );
    if (!ipCheck.success) {
      return rateLimitResponse(
        ipCheck,
        'Too many recovery requests from your network. Please wait a few minutes before trying again.'
      );
    }

    const body = await req.json();
    const { action, identifier, otp } = body;

    const cleanEmail = (identifier || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid registered Email Address (e.g. candidate@example.com).' },
        { status: 400 }
      );
    }

    // Action 1: Send / Resend OTP
    if (action === 'send_otp' || action === 'resend_otp') {
      const user = (await db.findUserByEmail(cleanEmail)) || (await db.findUserByIdentifier(cleanEmail));

      if (!user) {
        return NextResponse.json(
          { error: 'No registered candidate account found with this email address. Please check your credentials or create a new registration.' },
          { status: 404 }
        );
      }

      // Generate 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store OTP in cache
      const payload = { otp: generatedOtp, expiresAt, verified: false };
      otpStore.set(cleanEmail, payload);
      if (user.email) otpStore.set(user.email.toLowerCase(), payload);

      // Send OTP to registered email
      const targetEmail = user.email || cleanEmail;
      await sendNotification({
        to: targetEmail,
        name: user.name || 'Candidate',
        type: 'REGISTRATION_OTP',
        data: { otp: generatedOtp },
      });

      console.log(`[Forgot Reg No] Dispatched OTP for user ${user.id} (${targetEmail}): ${generatedOtp}`);

      return NextResponse.json({
        success: true,
        message: `A 6-digit verification code has been dispatched to ${maskEmail(targetEmail)}.`,
        maskedEmail: maskEmail(targetEmail),
        expiresInSeconds: 600,
      });
    }

    // Action 2: Verify OTP and return Registration Number
    if (action === 'verify_otp') {
      const userOtp = (otp || '').trim();
      if (!userOtp || userOtp.length !== 6) {
        return NextResponse.json(
          { error: 'Please enter the 6-digit verification code sent to your registered email.' },
          { status: 400 }
        );
      }

      const stored = otpStore.get(cleanEmail);

      if (!stored) {
        return NextResponse.json(
          { error: 'No active OTP request found for this account or code expired. Please click "Resend OTP".' },
          { status: 400 }
        );
      }

      if (Date.now() > stored.expiresAt) {
        otpStore.delete(cleanEmail);
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
      const user = (await db.findUserByEmail(cleanEmail)) || (await db.findUserByIdentifier(cleanEmail));

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
        otpStore.delete(cleanEmail);
        if (user.email) otpStore.delete(user.email.toLowerCase());
      }

      if (!registrationNumber) {
        return NextResponse.json({
          success: true,
          hasRegistrationNumber: false,
          name: user.name,
          message: 'Your candidate account is registered, but your permanent Registration Number is generated after application submission and fee payment. You can sign in using your Email and Password to continue filling your form.',
        });
      }

      // Securely dispatch registration number directly to candidate's registered email
      const candidateEmail = user.email || cleanEmail;
      await sendNotification({
        to: candidateEmail,
        name: user.name || 'Candidate',
        type: 'FORGOT_REGISTRATION_RECOVERY',
        data: {
          registrationNumber,
          className: classApplying || 'Entrance Exam 2027-28',
        },
      });
      console.log(`[Forgot Reg No] Dispatched registration number ${registrationNumber} to candidate email ${candidateEmail}`);

      return NextResponse.json({
        success: true,
        hasRegistrationNumber: true,
        registrationNumber,
        classApplying: classApplying || 'Entrance Examination',
        sentToEmail: true,
        name: user.name,
        maskedEmail: maskEmail(candidateEmail),
        message: `Your permanent Registration Number (${registrationNumber}) has been dispatched to your registered email address (${maskEmail(candidateEmail)}).`,
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

