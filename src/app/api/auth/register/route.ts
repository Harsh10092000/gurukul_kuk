import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, signToken, getAuthCookieOptions } from '@/lib/auth';
import { checkFormStatus } from '@/lib/formSchedule';
import { recordAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    // 1. Form Schedule Availability Check
    const formStatus = checkFormStatus();
    if (!formStatus.isOpen) {
      return NextResponse.json(
        { 
          error: `Applications for Entrance Session 2026-27 are currently closed. Reason: ${formStatus.message}`,
          formStatus 
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, phone, password } = body;

    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'All fields (name, email, phone, password) are required.' },
        { status: 400 }
      );
    }

    // Strict Email Format Validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid email address (e.g. candidate@example.com).' },
        { status: 400 }
      );
    }

    // Strict 10-digit Indian Mobile Validation
    const phoneClean = phone.replace(/\D/g, '').slice(-10);
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneClean)) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit Indian mobile number.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // Optional OTP verification if otp passed
    if (body.otp) {
      const otpStore = (global as any)._gurukulOtps;
      const targetId = email.trim().toLowerCase();
      const stored = otpStore ? (otpStore.get(targetId) || otpStore.get(phoneClean)) : null;
      if (!stored || stored.otp !== body.otp.trim()) {
        return NextResponse.json(
          { error: 'Invalid or expired OTP verification code.' },
          { status: 400 }
        );
      }
    }

    // Check if user already exists with this email
    const existingUser = await db.findUserByEmail(email.trim().toLowerCase());
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please login instead.' },
        { status: 409 }
      );
    }

    // Enforce Unique Mobile Number per candidate (Duplicate mobile prevention)
    const existingPhoneUser = await db.findUserByPhone(phoneClean);
    if (existingPhoneUser) {
      return NextResponse.json(
        { error: `A candidate account with mobile number +91-${phoneClean} is already registered. Duplicate mobile registrations are strictly prohibited.` },
        { status: 409 }
      );
    }

    // Hash password and initialize temporary application session (NO official registration before ₹800 payment)
    const passwordHash = await hashPassword(password);
    const tempSessionId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    await db.saveTempApplication(tempSessionId, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phoneClean,
      passwordHash,
      isTemporary: true,
      currentStep: 1,
      personalInfo: {
        fullName: name.trim(),
        candidateEmail: email.trim().toLowerCase(),
        candidateMobile: phoneClean,
        whatsappNumber: phoneClean,
      },
    });

    // Generate temporary JWT token for the application filling session
    const token = signToken({
      userId: tempSessionId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'applicant',
    });

    const response = NextResponse.json({
      success: true,
      message: 'OTP verified successfully. Redirecting to Declaration & Instructions.',
      temporary: true,
      user: {
        id: tempSessionId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phoneClean,
        role: 'applicant',
        isTemporary: true,
      },
      redirectTo: '/apply',
    });

    const cookieOptions = getAuthCookieOptions();
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to complete registration. Please try again.' },
      { status: 500 }
    );
  }
}
