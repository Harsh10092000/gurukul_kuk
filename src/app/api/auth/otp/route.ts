import { NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications';
import { db } from '@/lib/db';

// Global in-memory OTP cache (key: identifier, value: { otp, expiresAt, verified })
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
    const { action, email, phone, identifier, otp, name, actionType } = body;

    // Action 1: Send OTP / Resend OTP
    if (action === 'send' || action === 'resend') {
      const rawTarget = (identifier || email || phone || '').trim();

      if (!rawTarget) {
        return NextResponse.json(
          { error: 'Registration Number, Email, or Mobile Number is required to send OTP.' },
          { status: 400 }
        );
      }

      let recipientEmail = (email || '').trim().toLowerCase();
      let recipientPhone = (phone || '').replace(/\D/g, '').slice(-10);
      let recipientName = (name || '').trim();

      // Case A: New Registration
      if (actionType === 'register') {
        if (email) {
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(email.trim())) {
            return NextResponse.json(
              { error: 'Invalid email address format. Example: candidate@example.com' },
              { status: 400 }
            );
          }

          const existingEmailUser = await db.findUserByEmail(email.trim().toLowerCase());
          if (existingEmailUser) {
            return NextResponse.json(
              { error: 'An account with this email address already exists. Please sign in instead.' },
              { status: 409 }
            );
          }
        }

        if (phone) {
          const phoneClean = phone.replace(/\D/g, '').slice(-10);
          const phoneRegex = /^[6-9]\d{9}$/;
          if (!phoneRegex.test(phoneClean)) {
            return NextResponse.json(
              { error: 'Invalid mobile number. Must be a valid 10-digit Indian mobile number.' },
              { status: 400 }
            );
          }

          const existingPhoneUser = await db.findUserByPhone(phoneClean);
          if (existingPhoneUser) {
            return NextResponse.json(
              { error: `Mobile number +91-${phoneClean} is already registered. Each candidate must have a unique mobile number. Please sign in instead.` },
              { status: 409 }
            );
          }
        }
      } 
      // Case B: Account Recovery / Forgot Password / Verification
      else {
        const foundUser = (await db.findUserByIdentifier(rawTarget)) || (await db.findUserByPhone(rawTarget));
        if (!foundUser) {
          return NextResponse.json(
            { error: 'No registered account found matching this Registration Number, Email, or Mobile Number. Please check your credentials.' },
            { status: 404 }
          );
        }

        recipientEmail = foundUser.email || '';
        recipientPhone = foundUser.phone || '';
        recipientName = foundUser.name || 'Candidate';
      }

      // Generate 6-digit numeric OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

      const otpPayload = {
        otp: generatedOtp,
        expiresAt,
        verified: false,
      };

      // Store in memory cache under all relevant identifiers
      const targetLower = rawTarget.toLowerCase();
      otpStore.set(targetLower, otpPayload);

      const targetAlphaNum = targetLower.replace(/[^a-z0-9]/g, '');
      if (targetAlphaNum) otpStore.set(targetAlphaNum, otpPayload);

      if (recipientEmail) {
        otpStore.set(recipientEmail.toLowerCase(), otpPayload);
      }

      if (recipientPhone) {
        const cleanP = recipientPhone.replace(/\D/g, '').slice(-10);
        otpStore.set(cleanP, otpPayload);
      }

      // Dispatch notification
      const sendTo = recipientEmail || recipientPhone || rawTarget;
      const notifRes = await sendNotification({
        to: sendTo,
        name: recipientName || 'Candidate',
        type: 'REGISTRATION_OTP',
        data: { otp: generatedOtp },
      });

      console.log(`[OTP Engine] OTP for ${rawTarget} (dest: ${sendTo}): ${generatedOtp}`);

      if (recipientEmail && notifRes && notifRes.success === false) {
        return NextResponse.json(
          { error: `Failed to deliver verification email to ${recipientEmail}: ${notifRes.error || 'Please check email address'}` },
          { status: 500 }
        );
      }

      const displayTarget = recipientEmail 
        ? maskEmail(recipientEmail) 
        : recipientPhone 
        ? maskPhone(recipientPhone) 
        : rawTarget;

      return NextResponse.json({
        success: true,
        message: `A 6-digit verification code has been dispatched to ${displayTarget}.`,
        maskedEmail: recipientEmail ? maskEmail(recipientEmail) : undefined,
        maskedPhone: recipientPhone ? maskPhone(recipientPhone) : undefined,
        expiresInSeconds: 600,
      });
    }

    // Action 2: Verify OTP
    if (action === 'verify') {
      const targetIdentifier = (identifier || email || phone || '').trim().toLowerCase();
      const userOtp = (otp || '').trim();

      if (!targetIdentifier || !userOtp) {
        return NextResponse.json(
          { error: 'Identifier and OTP code are both required.' },
          { status: 400 }
        );
      }

      const cleanAlphaNum = targetIdentifier.replace(/[^a-z0-9]/g, '');
      const cleanPhone = targetIdentifier.replace(/\D/g, '').slice(-10);

      const stored = 
        otpStore.get(targetIdentifier) || 
        (cleanAlphaNum ? otpStore.get(cleanAlphaNum) : null) ||
        (cleanPhone.length === 10 ? otpStore.get(cleanPhone) : null);

      // Check existence and expiry
      if (!stored) {
        return NextResponse.json(
          { error: 'No OTP requested for this account or OTP expired. Please request a new code.' },
          { status: 400 }
        );
      }

      if (Date.now() > stored.expiresAt) {
        otpStore.delete(targetIdentifier);
        if (cleanAlphaNum) otpStore.delete(cleanAlphaNum);
        if (cleanPhone.length === 10) otpStore.delete(cleanPhone);
        return NextResponse.json(
          { error: 'The verification code has expired. Please request a new OTP.' },
          { status: 400 }
        );
      }

      if (stored.otp !== userOtp) {
        return NextResponse.json(
          { error: 'Incorrect verification code. Please check and re-enter.' },
          { status: 400 }
        );
      }

      // Mark as verified
      stored.verified = true;
      otpStore.set(targetIdentifier, stored);
      if (cleanAlphaNum) otpStore.set(cleanAlphaNum, stored);
      if (cleanPhone.length === 10) otpStore.set(cleanPhone, stored);

      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Verification completed successfully!',
      });
    }

    return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'OTP operation failed.' },
      { status: 500 }
    );
  }
}
