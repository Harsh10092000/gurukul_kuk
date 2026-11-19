import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchHdfcOrderStatus, verifyHdfcResponseSignature, HDFC_CONFIG } from '@/lib/hdfc';
import { completePaymentAndRegistration } from '@/lib/payment-completion';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      const searchParams = new URLSearchParams(rawBody);
      payload = Object.fromEntries(searchParams.entries());
    }

    const signature = request.headers.get('x-signature') || request.headers.get('signature') || '';
    if (HDFC_CONFIG.RESPONSE_KEY && signature) {
      const isValid = verifyHdfcResponseSignature(signature, rawBody);
      if (!isValid) {
        console.error('[HDFC Webhook Alert] Invalid HMAC signature received on webhook endpoint.');
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    }

    const orderId = payload.order_id || payload.orderId || payload.data?.order?.order_id;
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order_id in webhook' }, { status: 400 });
    }

    const paymentOrder = await db.getPaymentOrderByOrderId(orderId);
    if (!paymentOrder) {
      return NextResponse.json({ error: 'Order not found in database' }, { status: 404 });
    }

    if (paymentOrder.status === 'CHARGED' && paymentOrder.registrationNumber) {
      return NextResponse.json({ message: 'Order already processed', registrationNumber: paymentOrder.registrationNumber }, { status: 200 });
    }

    // Always fetch server-to-server authoritative status from HDFC
    const statusResponse = await fetchHdfcOrderStatus(orderId);
    const orderStatus = (statusResponse.status || '').toUpperCase();
    const returnedAmount = parseFloat(String(statusResponse.amount));
    const expectedAmount = paymentOrder.amount || HDFC_CONFIG.FEE_AMOUNT;

    if (orderStatus === 'CHARGED' || orderStatus === 'SUCCESS') {
      if (Math.abs(returnedAmount - expectedAmount) > 0.01) {
        console.error(`[HDFC Webhook Security Alert] Amount tampering detected! Returned: ₹${returnedAmount}, Expected: ₹${expectedAmount}`);
        return NextResponse.json({ error: 'Amount mismatch detected' }, { status: 400 });
      }

      const txnId = statusResponse.txn_id || statusResponse.transaction_id || `TXN_${orderId}`;
      const result = await completePaymentAndRegistration({
        orderId,
        paymentId: txnId,
        gateway: 'hdfc',
        rawPaymentResponse: statusResponse,
      });

      if (result.success) {
        console.log(`[HDFC Webhook] Successfully processed order ${orderId} -> Reg No: ${result.registrationNumber}`);
        return NextResponse.json({
          status: 'ok',
          processed: true,
          orderId,
          registrationNumber: result.registrationNumber,
        });
      } else {
        console.error(`[HDFC Webhook Error] Failed to complete registration for ${orderId}:`, result.error);
        return NextResponse.json({ status: 'error', error: result.error }, { status: 500 });
      }
    }

    if (
      orderStatus === 'USER_ABORTED' ||
      orderStatus === 'CANCELLED' ||
      orderStatus === 'AUTHORIZATION_FAILED' ||
      orderStatus === 'AUTHENTICATION_FAILED'
    ) {
      if (paymentOrder.status !== 'CHARGED') {
        await db.updatePaymentOrderRecord(orderId, {
          status: orderStatus as any,
          paymentResponse: statusResponse,
        });
      }
      return NextResponse.json({ status: 'ok', updated: orderStatus });
    }

    return NextResponse.json({ status: 'ignored', currentStatus: orderStatus }, { status: 200 });
  } catch (error: any) {
    console.error('HDFC Webhook processing error:', error);
    return NextResponse.json({ error: error?.message || 'Webhook failed' }, { status: 500 });
  }
}
