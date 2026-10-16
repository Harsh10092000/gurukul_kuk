import { NextResponse } from 'next/server';
import { RAZORPAY_CONFIG, verifyRazorpayWebhookSignature, fetchRazorpayOrderPayments } from '@/lib/razorpay';
import { completePaymentAndRegistration } from '@/lib/payment-completion';
import { db } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    // Verify webhook signature if secret is configured
    if (RAZORPAY_CONFIG.WEBHOOK_SECRET) {
      const isValid = verifyRazorpayWebhookSignature({
        rawBody,
        signature,
      });

      if (!isValid) {
        console.error('[Razorpay Webhook Alert] Invalid webhook signature from IP or caller.');
        return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
      }
    } else {
      console.warn('[Razorpay Webhook Warning] RAZORPAY_WEBHOOK_SECRET is not set in environment. Webhook processed with caution.');
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload in webhook body.' }, { status: 400 });
    }

    const event = payload.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    // Handle payment.captured or order.paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderEntity = payload.payload?.order?.entity;

      const orderId = paymentEntity?.order_id || orderEntity?.id;
      let paymentId = paymentEntity?.id;

      if (!orderId) {
        console.warn('[Razorpay Webhook] Webhook missing order_id:', payload);
        return NextResponse.json({ error: 'Missing order_id in webhook payload.' }, { status: 400 });
      }

      // If paymentId wasn't directly in entity, fetch from Razorpay API
      if (!paymentId) {
        try {
          const paymentsRes = await fetchRazorpayOrderPayments(orderId);
          const captured = paymentsRes?.items?.find((p) => p.status === 'captured');
          if (captured) {
            paymentId = captured.id;
          }
        } catch (fetchErr) {
          console.warn(`[Razorpay Webhook] Could not fetch order payments for ${orderId}:`, fetchErr);
        }
      }

      if (!paymentId) {
        paymentId = `pay_wh_${Date.now()}`;
      }

      // Complete registration atomically
      const result = await completePaymentAndRegistration({
        orderId,
        paymentId,
        gateway: 'razorpay',
        rawPaymentResponse: payload,
      });

      if (result.success) {
        console.log(`[Razorpay Webhook] Successfully processed order ${orderId} -> Reg No: ${result.registrationNumber}`);
        return NextResponse.json({
          status: 'ok',
          processed: true,
          orderId,
          registrationNumber: result.registrationNumber,
        });
      } else {
        console.error(`[Razorpay Webhook Error] Failed to complete registration for ${orderId}:`, result.error);
        return NextResponse.json({
          status: 'error',
          error: result.error,
        }, { status: 500 });
      }
    }

    // Handle payment.failed
    if (event === 'payment.failed') {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      if (orderId) {
        const order = await db.getPaymentOrderByOrderId(orderId);
        if (order && order.status !== 'CHARGED') {
          // Check if another payment attempt for this order was actually captured
          try {
            const paymentsRes = await fetchRazorpayOrderPayments(orderId);
            if (paymentsRes && paymentsRes.items && paymentsRes.items.some((p) => p.status === 'captured' || p.status === 'authorized')) {
              console.log(`[Razorpay Webhook] Ignoring payment.failed for order ${orderId} because another payment attempt was captured.`);
              return NextResponse.json({ status: 'ok', event, ignored: true });
            }
          } catch {}

          const candidateEmail = (order.customerEmail || order.applicationPayload?.personalInfo?.candidateEmail || '').trim().toLowerCase();
          const candidateName = order.applicationPayload?.personalInfo?.fullName || 'Candidate';
          const failureReason = paymentEntity?.error_description || paymentEntity?.error_reason || 'Declined by bank';

          // 1. Purge unconfirmed user data and mark order as FAILED
          await db.purgeFailedPaymentCandidate({
            email: candidateEmail,
            orderId,
            reason: failureReason,
          });

          // 2. Send email notifying candidate of payment failure and telling them to register again
          if (candidateEmail) {
            sendNotification({
              to: candidateEmail,
              name: candidateName,
              type: 'PAYMENT_FAILED_ALERT',
              data: {
                orderId,
                reason: failureReason,
              },
            }).catch((err) => console.warn('[Webhook] Failed to send payment failed alert email:', err));
          }

          console.log(`[Razorpay Webhook] Purged unconfirmed candidate data and marked order ${orderId} as FAILED based on webhook.`);
        }
      }
      return NextResponse.json({ status: 'ok', event, processed: true });
    }

    // Acknowledge other informational events
    return NextResponse.json({ status: 'ok', event, ignored: true });
  } catch (error: any) {
    console.error('[Razorpay Webhook Unexpected Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal webhook error.' },
      { status: 500 }
    );
  }
}
