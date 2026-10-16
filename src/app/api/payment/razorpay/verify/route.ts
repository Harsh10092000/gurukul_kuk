import { NextResponse } from 'next/server';
import { signToken, getAuthCookieOptions } from '@/lib/auth';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { completePaymentAndRegistration } from '@/lib/payment-completion';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Incomplete Razorpay payment verification parameters.' },
        { status: 400 }
      );
    }

    // 1. Cryptographically verify signature using HMAC-SHA256
    const isSignatureValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isSignatureValid) {
      console.error(`[Razorpay Verify Security Alert] Invalid signature for order ${razorpay_order_id}`);
      return NextResponse.json(
        { error: 'Payment signature verification failed. Transaction cannot be validated.' },
        { status: 400 }
      );
    }

    // 2. Complete payment and guarantee student registration atomically
    const result = await completePaymentAndRegistration({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      gateway: 'razorpay',
      signature: razorpay_signature,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Payment verification failed.' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      orderId: result.orderId,
      paymentId: result.paymentId,
      registrationNumber: result.registrationNumber,
      rollNumber: result.rollNumber,
      redirectUrl: result.redirectUrl,
    });

    // 3. Issue authentication cookie so candidate is immediately logged into portal
    if (result.user) {
      const token = signToken({
        userId: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role as any,
      });
      const cookieOptions = getAuthCookieOptions();
      response.cookies.set(cookieOptions.name, token, cookieOptions);
    }

    return response;
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    return NextResponse.json(
      { error: error?.message || 'Payment verification failed.' },
      { status: 500 }
    );
  }
}
