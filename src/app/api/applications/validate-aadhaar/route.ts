import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { validateAadhaar } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { aadhaarNumber } = body;

    // 1. Format & Luhn/Length validation
    const aadhaarVal = validateAadhaar(aadhaarNumber);
    if (!aadhaarVal.isValid) {
      return NextResponse.json(
        { valid: false, error: aadhaarVal.error || 'Aadhaar number must be exactly 12 digits.' },
        { status: 400 }
      );
    }

    // 2. Uniqueness check in database
    const existing = await db.findApplicationByAadhaar(aadhaarNumber);
    if (existing && existing.userId !== user.userId && existing.status !== 'rejected') {
      return NextResponse.json(
        {
          valid: false,
          error: 'This Aadhaar card number is already registered with another active application. Duplicate Aadhaar submissions are not allowed.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      valid: true,
      message: 'Aadhaar card number is valid and available for registration.',
    });
  } catch (error: any) {
    console.error('Error validating Aadhaar number:', error);
    return NextResponse.json({ valid: false, error: 'Failed to validate Aadhaar number' }, { status: 500 });
  }
}
