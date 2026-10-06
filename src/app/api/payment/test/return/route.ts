import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchHdfcOrderStatus, getPublicBaseUrl, HDFC_CONFIG } from '@/lib/hdfc';

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
  const isDummy = urlObj.searchParams.get('dummy') === 'true';
  const dueId = urlObj.searchParams.get('dueId') || paymentOrder?.applicationPayload?.dueId || '';
  const dueTitle = paymentOrder?.applicationPayload?.dueTitle || '';

  let statusResponse: any = null;

  if (isDummy && HDFC_CONFIG.PAYMENT_MODE === 'demo') {
    statusResponse = {
      order_id: orderId,
      status: 'CHARGED',
      amount: paymentOrder?.amount || 1,
      txn_id: `TXN_TEST_${Date.now()}`,
      payment_method: 'UPI',
    };
  } else {
    try {
      statusResponse = await fetchHdfcOrderStatus(orderId);
    } catch (err: any) {
      console.warn('HDFC Status check in test flow fallback:', err?.message);
      // In demo mode fallback if server check encounters network issue
      if (HDFC_CONFIG.PAYMENT_MODE === 'demo') {
        statusResponse = {
          order_id: orderId,
          status: 'CHARGED',
          amount: paymentOrder?.amount || 1,
          txn_id: `TXN_TEST_${Date.now()}`,
          payment_method: 'HDFC SmartGateway',
        };
      } else {
        return NextResponse.redirect(
          `${baseUrl}/payment?step=pay&orderId=${encodeURIComponent(orderId)}&status=pending&msg=Verifying+Payment+Status`,
          303
        );
      }
    }
  }

  const orderStatus = (statusResponse?.status || '').toUpperCase();
  const txnId = statusResponse?.txn_id || statusResponse?.transaction_id || `TXN_${orderId.slice(-8)}`;
  const amountVal = statusResponse?.amount || paymentOrder?.amount || 1;

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
