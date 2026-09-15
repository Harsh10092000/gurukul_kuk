import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, comparePassword } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

// Shared global in-memory OTP cache
declare global {
  var _gurukulOtps: Map<string, { otp: string; expiresAt: number; verified: boolean }> | undefined;
}

const otpStore = global._gurukulOtps || new Map();
global._gurukulOtps = otpStore;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, otp, newPassword } = body;

    if (!identifier || !otp || !newPassword) {
      return NextResponse.json(
        { error: 'Identifier (email/mobile), OTP code, and new password are all required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // Verify OTP
    const cleanId = identifier.trim().toLowerCase();
    const cleanAlphaNum = cleanId.replace(/[^a-z0-9]/g, '');
    const phoneClean = identifier.replace(/\D/g, '').slice(-10);

    const stored = 
      otpStore.get(cleanId) || 
      (cleanAlphaNum ? otpStore.get(cleanAlphaNum) : null) || 
      (phoneClean.length === 10 ? otpStore.get(phoneClean) : null);

    if (!stored || stored.otp !== otp.trim()) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP verification code.' },
        { status: 400 }
      );
    }

    // Check user exists
    const user = (await db.findUserByIdentifier(cleanId)) || (await db.findUserByPhone(phoneClean));
    if (!user) {
      return NextResponse.json(
        { error: 'No registered candidate account found with this email or mobile number.' },
        { status: 404 }
      );
    }

    // Check if new password is identical to current password
    if (user.passwordHash) {
      const isSamePassword = await comparePassword(newPassword, user.passwordHash);
      if (isSamePassword) {
        return NextResponse.json(
          { error: 'New password cannot be the same as your old password. Please choose a different password.' },
          { status: 400 }
        );
      }
    }

    // Update password using unique user.id
    const passwordHash = await hashPassword(newPassword);
    const updated = await db.updateUserPassword(user.id, passwordHash);

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update password.' }, { status: 500 });
    }

    // Clear used OTP
    if (otpStore) {
      otpStore.delete(cleanId);
      if (cleanAlphaNum) otpStore.delete(cleanAlphaNum);
      if (phoneClean) otpStore.delete(phoneClean);
      if (user.email) otpStore.delete(user.email.toLowerCase());
    }

    // Audit log
    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'PASSWORD_RESET_SUCCESS',
      entity: 'User',
      details: { identifier: cleanId },
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Password reset failed.' },
      { status: 500 }
    );
  }
}
