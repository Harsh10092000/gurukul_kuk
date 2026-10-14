import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchHdfcOrderStatus, getPublicBaseUrl } from '@/lib/hdfc';

export const dynamic = 'force-dynamic';

async function extractOrderParams(request: Request): Promise<{ orderId: string | null; body: any }> {
  const url = new URL(request.url);
  let orderId = url.searchParams.get('order_id') || url.searchParams.get('orderId');
  let body: any = {};

  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const formOrderId = formData.get('order_id') || formData.get('orderId');
        if (formOrderId && typeof formOrderId === 'string') {
          orderId = formOrderId;
        }
        formData.forEach((val, key) => {
          body[key] = val;
        });
      } else if (contentType.includes('application/json')) {
        const json = await request.json();
        body = json;
        if (json.order_id || json.orderId) {
          orderId = json.order_id || json.orderId;
        }
      }
    } catch (e) {
      console.warn('Could not parse POST body in test return handler:', e);
    }
  }

  return { orderId, body };
}

async function handleTestReturn(request: Request) {
  const baseUrl = getPublicBaseUrl(request);
  const { orderId, body } = await extractOrderParams(request);

  if (!orderId) {
    return NextResponse.redirect(`${baseUrl}/payment?step=pay&status=error&msg=Missing+Order+Identifier`, 303);
  }

  const paymentOrder = await db.getPaymentOrderByOrderId(orderId);
  const urlObj = new URL(request.url);
  const dueId = urlObj.searchParams.get('dueId') || paymentOrder?.applicationPayload?.dueId || '';
  const dueTitle = paymentOrder?.applicationPayload?.dueTitle || '';

  if (!paymentOrder) {
    return NextResponse.redirect(
      `${baseUrl}/payment?step=pay&status=error&msg=Order+record+not+found`,
      303
    );
  }

  // Prevent duplicate processing: if this order was already confirmed CHARGED, don't
  // re-verify or re-redirect as a fresh success — just show the existing receipt.
  if (paymentOrder.status === 'CHARGED') {
    const prevTxnId = paymentOrder.paymentResponse?.txn_id || paymentOrder.paymentResponse?.transaction_id || `TXN_${orderId.slice(-8)}`;
    return NextResponse.redirect(
      `${baseUrl}/payment?step=thankyou&orderId=${encodeURIComponent(orderId)}&txnId=${encodeURIComponent(prevTxnId)}&amount=${encodeURIComponent(String(paymentOrder.amount))}&dueId=${encodeURIComponent(dueId)}&dueTitle=${encodeURIComponent(dueTitle)}&status=success`,
      303
    );
  }

  // SECURITY: Never trust the browser redirect or any client-supplied status/amount.
  // Always re-confirm server-to-server with HDFC before treating a payment as successful.
  // (HDFC's security audit flagged response/amount tampering - this is the mandatory guard.)
  let statusResponse: any = null;
  try {
    statusResponse = await fetchHdfcOrderStatus(orderId);
  } catch (err: any) {
    console.warn('HDFC Status check in test flow failed:', err?.message);
    return NextResponse.redirect(
      `${baseUrl}/payment?step=pay&orderId=${encodeURIComponent(orderId)}&status=pending&msg=Verifying+Payment+Status`,
      303
    );
  }

  // Order ID must match exactly what we requested status for
  if (statusResponse?.order_id !== orderId) {
    console.error(`Test return: order id mismatch - expected ${orderId}, got ${statusResponse?.order_id}`);
    return NextResponse.redirect(
      `${baseUrl}/payment?step=pay&status=error&msg=Order+verification+mismatch`,
      303
    );
  }

  // The amount must match what we stored when the order was created (server-side catalog
  // price), never a client-supplied value.
  const expectedAmount = paymentOrder.amount;
  const returnedAmount = parseFloat(String(statusResponse?.amount));
  if (Math.abs(returnedAmount - expectedAmount) > 0.01) {
    console.error(`Test return: amount mismatch for ${orderId} - expected ${expectedAmount}, bank returned ${returnedAmount}`);
    return NextResponse.redirect(
      `${baseUrl}/payment?step=pay&status=error&msg=Amount+verification+failed`,
      303
    );
  }

  const orderStatus = (statusResponse?.status || '').toUpperCase();
  const txnId = statusResponse?.txn_id || statusResponse?.transaction_id || `TXN_${orderId.slice(-8)}`;
  const amountVal = expectedAmount;

  // Check if cancelled
  const isExplicitCancel =
    orderStatus === 'USER_ABORTED' ||
    orderStatus === 'CANCELLED' ||
    body?.status === 'USER_ABORTED' ||
    body?.status === 'CANCELLED';

  if (isExplicitCancel) {
    await db.updatePaymentOrderRecord(orderId, {
      status: 'CANCELLED',
      paymentResponse: statusResponse,
    });
    return NextResponse.redirect(
      `${baseUrl}/payment?step=pay&orderId=${encodeURIComponent(orderId)}&status=cancelled`,
      303
    );
  }

  const isSuccess = orderStatus === 'CHARGED' || orderStatus === 'SUCCESS';

  if (isSuccess) {
    await db.updatePaymentOrderRecord(orderId, {
      status: 'CHARGED',
      paymentResponse: statusResponse,
    });

    return NextResponse.redirect(
      `${baseUrl}/payment?step=thankyou&orderId=${encodeURIComponent(orderId)}&txnId=${encodeURIComponent(txnId)}&amount=${encodeURIComponent(String(amountVal))}&dueId=${encodeURIComponent(dueId)}&dueTitle=${encodeURIComponent(dueTitle)}&status=success`,
      303
    );
  }

  return NextResponse.redirect(
    `${baseUrl}/payment?step=pay&orderId=${encodeURIComponent(orderId)}&status=failed`,
    303
  );
}

export async function GET(request: Request) {
  return handleTestReturn(request);
}

export async function POST(request: Request) {
  return handleTestReturn(request);
}
