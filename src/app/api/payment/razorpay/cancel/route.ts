import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';
import { fetchRazorpayOrderPayments, fetchRazorpayOrder } from '@/lib/razorpay';
import { completePaymentAndRegistration } from '@/lib/payment-completion';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const orderId = body.orderId || body.order_id || url.searchParams.get('order_id') || url.searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await db.getPaymentOrderByOrderId(orderId);
    if (order && (order.status === 'PENDING' || order.status === 'PROCESSING')) {
      if (!order.registrationNumber) {
        // Safety check: verify with Razorpay that it wasn't actually captured before cancelling!
        try {
          let capturedPaymentId = '';
          const paymentsRes = await fetchRazorpayOrderPayments(orderId);
          if (paymentsRes && paymentsRes.items && paymentsRes.items.length > 0) {
            const captured = paymentsRes.items.find((p) => p.status === 'captured' || p.status === 'authorized');
            if (captured) capturedPaymentId = captured.id;
          } else {
            const rzpOrder = await fetchRazorpayOrder(orderId);
            if (rzpOrder && (rzpOrder.status === 'paid' || rzpOrder.amount_paid > 0)) {
              capturedPaymentId = `pay_recovered_${Date.now()}`;
            }
          }

          if (capturedPaymentId) {
            const compRes = await completePaymentAndRegistration({
              orderId,
              paymentId: capturedPaymentId,
              gateway: 'razorpay',
            });
            if (compRes.success) {
              return NextResponse.json({
                success: true,
                alreadyProcessed: true,
                registrationNumber: compRes.registrationNumber,
                message: 'Payment was confirmed by bank. Registration has been finalized.',
              });
            }
          }
        } catch (checkErr) {
          console.warn(`[Cancel] Error verifying order ${orderId} before cancellation:`, checkErr);
        }

        const candidateEmail = (order.customerEmail || order.applicationPayload?.personalInfo?.candidateEmail || '').trim().toLowerCase();
        const candidateName = order.applicationPayload?.personalInfo?.fullName || 'Candidate';
        const isFailed = body.status === 'FAILED';
        const failureReason = body.error || body.reason || (isFailed ? 'Payment was declined by bank' : 'Payment session was cancelled');

        // 1. Purge unconfirmed applicant user record and application record
        // This frees the candidate's email and Aadhaar so they can register again without conflicts
        await db.purgeFailedPaymentCandidate({
          email: candidateEmail,
          orderId,
          reason: failureReason,
        });

        // 2. Set exact status on payment order
        await db.updatePaymentOrderRecord(orderId, {
          status: isFailed ? 'FAILED' : 'CANCELLED',
          paymentResponse: {
            reason: failureReason,
            cancelledAt: new Date().toISOString(),
          },
        });

        // 3. Dispatch email alert if payment was declined/failed
        if (isFailed && candidateEmail) {
          sendNotification({
            to: candidateEmail,
            name: candidateName,
            type: 'PAYMENT_FAILED_ALERT',
            data: {
              orderId,
              reason: failureReason,
            },
          }).catch((err) => console.warn('[Cancel] Failed to send payment failed alert email:', err));
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: body.status === 'FAILED' ? 'Payment marked failed. Candidate details are not registered.' : 'Payment cancelled successfully. Candidate registration was not submitted.',
    });
  } catch (error: any) {
    console.error('Error cancelling Razorpay payment order:', error);
    return NextResponse.json({ error: error?.message || 'Failed to cancel payment' }, { status: 500 });
  }
}
