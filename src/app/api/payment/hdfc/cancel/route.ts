import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    if (order && order.status === 'PENDING') {
      await db.updatePaymentOrderRecord(orderId, {
        status: 'CANCELLED',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment cancelled successfully. Candidate registration was not submitted.',
    });
  } catch (error: any) {
    console.error('Error cancelling payment order:', error);
    return NextResponse.json({ error: error?.message || 'Failed to cancel payment' }, { status: 500 });
  }
}
