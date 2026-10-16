import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, getAuthCookieOptions } from '@/lib/auth';
import { fetchRazorpayOrder, fetchRazorpayOrderPayments } from '@/lib/razorpay';
import { completePaymentAndRegistration } from '@/lib/payment-completion';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  try {
    const { searchParams } = new URL(request.url);
    const orderId = (searchParams.get('orderId') || searchParams.get('order_id') || '').trim();
    const regNo = (searchParams.get('regNo') || searchParams.get('reg_no') || '').trim();

    if (!orderId) {
      return NextResponse.json(
        { verified: false, error: 'Order ID is required for verification.' },
        { status: 400, headers }
      );
    }

    // 1. Fetch live order record directly from MySQL
    let paymentOrder = await db.getPaymentOrderByOrderId(orderId);
    if (!paymentOrder) {
      return NextResponse.json(
        { verified: false, error: 'No transaction record found in database for this Order ID.' },
        { status: 404, headers }
      );
    }

    // 2. Verify actual payment status (strictly CHARGED or SUCCESS)
    let orderStatusStr = String(paymentOrder.status || '').toUpperCase();
    let isCharged = orderStatusStr === 'CHARGED' || orderStatusStr === 'SUCCESS';

    if (!isCharged) {
      // Self-Healing Live Check with Razorpay:
      try {
        let capturedPaymentId = '';
        const paymentsRes = await fetchRazorpayOrderPayments(orderId);
        if (paymentsRes && paymentsRes.items && paymentsRes.items.length > 0) {
          const captured = paymentsRes.items.find((p) => p.status === 'captured' || p.status === 'authorized');
          if (captured) {
            capturedPaymentId = captured.id;
          }
        } else {
          const rzpOrder = await fetchRazorpayOrder(orderId);
          if (rzpOrder && (rzpOrder.status === 'paid' || rzpOrder.amount_paid > 0)) {
            capturedPaymentId = `pay_recovered_${Date.now()}`;
          }
        }

        if (capturedPaymentId) {
          const completionResult = await completePaymentAndRegistration({
            orderId,
            paymentId: capturedPaymentId,
            gateway: 'razorpay',
          });
          if (completionResult.success) {
            const reloadedOrder = await db.getPaymentOrderByOrderId(orderId);
            if (reloadedOrder) {
              paymentOrder = reloadedOrder;
              orderStatusStr = String(paymentOrder.status || '').toUpperCase();
              isCharged = orderStatusStr === 'CHARGED' || orderStatusStr === 'SUCCESS';
            }
          }
        }
      } catch (recoveryErr) {
        console.warn(`[VerifyOrder] Live recovery check error for ${orderId}:`, recoveryErr);
      }
    }

    if (!isCharged) {
      return NextResponse.json(
        {
          verified: false,
          status: paymentOrder.status,
          error: `Payment is not confirmed. Current gateway status is '${paymentOrder.status}'.`,
        },
        { status: 400, headers }
      );
    }

    // 3. Verify application record in MySQL
    let application: any = null;
    if (paymentOrder.applicationId) {
      application = await db.getApplicationById(paymentOrder.applicationId);
    }
    if (!application && paymentOrder.registrationNumber) {
      application = await db.getApplicationById(paymentOrder.registrationNumber);
    }
    if (!application && regNo) {
      application = await db.getApplicationById(regNo);
    }
    if (!application && paymentOrder.customerEmail) {
      application = await db.findApplicationByEmail(paymentOrder.customerEmail);
    }

    if (!application || application.paymentStatus !== 'completed') {
      return NextResponse.json(
        {
          verified: false,
          error: 'Entrance application record has not been finalized or fee payment status is unverified.',
        },
        { status: 400, headers }
      );
    }

    // 4. Verify candidate user record in MySQL
    let user: any = null;
    if (application.userId) {
      user = await db.getUserById(application.userId);
    }
    if (!user && paymentOrder.customerEmail) {
      user = await db.findUserByEmail(paymentOrder.customerEmail);
    }

    if (!user) {
      return NextResponse.json(
        {
          verified: false,
          error: 'Candidate user profile could not be verified in the institutional database.',
        },
        { status: 400, headers }
      );
    }

    const resolvedRegNo =
      application.registrationNumber ||
      application.applicationNumber ||
      paymentOrder.registrationNumber ||
      user.registrationNumber;

    const txnId =
      paymentOrder.paymentResponse?.txn_id ||
      paymentOrder.paymentResponse?.transaction_id ||
      application.transactionId ||
      `TXN_${orderId.replace(/^GUR_/, '')}`;

    const response = NextResponse.json(
      {
        verified: true,
        order: {
          orderId: paymentOrder.orderId,
          amount: paymentOrder.amount,
          currency: paymentOrder.currency,
          status: paymentOrder.status,
          createdAt: paymentOrder.createdAt,
          txnId,
        },
        application: {
          id: application.id,
          registrationNumber: resolvedRegNo,
          applicationNumber: application.applicationNumber || resolvedRegNo,
          classApplying: application.classApplying,
          studyLocation: application.studyLocationPref || application.examCentrePref || {},
          candidateName: application.personalInfo?.fullName || user.name,
          candidateEmail: application.personalInfo?.candidateEmail || user.email,
          candidatePhone: application.personalInfo?.candidateMobile || user.phone,
          paymentStatus: application.paymentStatus,
          amountPaid: application.amountPaid,
          transactionId: txnId,
          createdAt: application.createdAt,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          registrationNumber: resolvedRegNo,
        },
      },
      { status: 200, headers }
    );

    // Issue authentication cookie so candidate is immediately logged into portal
    if (user) {
      const token = signToken({
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role as any,
      });
      const cookieOptions = getAuthCookieOptions();
      response.cookies.set(cookieOptions.name, token, cookieOptions);
    }

    return response;
  } catch (error: any) {
    console.error('Order verification error:', error);
    return NextResponse.json(
      { verified: false, error: 'Database verification failed: ' + (error?.message || 'Server error') },
      { status: 500, headers }
    );
  }
}
