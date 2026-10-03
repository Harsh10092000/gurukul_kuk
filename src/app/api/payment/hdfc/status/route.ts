import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchHdfcOrderStatus, HDFC_CONFIG } from '@/lib/hdfc';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id') || searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
    }

    const paymentOrder = await db.getPaymentOrderByOrderId(orderId);
    if (!paymentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only query live bank API if not in dummy mode
    if (paymentOrder.status === 'PENDING' && HDFC_CONFIG.PAYMENT_MODE !== 'dummy') {
      try {
        const liveStatus = await fetchHdfcOrderStatus(orderId);
        const liveStatusUpper = (liveStatus.status || '').toUpperCase();
        if (liveStatusUpper && liveStatusUpper !== 'PENDING') {
          await db.updatePaymentOrderRecord(orderId, {
            status: liveStatusUpper as any,
            paymentResponse: liveStatus,
          });
          paymentOrder.status = liveStatusUpper as any;
        }
      } catch (err) {
        console.warn('Could not sync live HDFC status for order:', orderId, err);
      }
    }

    const payload = paymentOrder.applicationPayload;

    return NextResponse.json({
      success: true,
      order: {
        orderId: paymentOrder.orderId,
        amount: paymentOrder.amount || 800,
        currency: paymentOrder.currency || 'INR',
        status: paymentOrder.status,
        registrationNumber: paymentOrder.registrationNumber || null,
        candidateName: payload?.personalInfo?.fullName || 'Candidate',
        candidateEmail: paymentOrder.customerEmail || payload?.personalInfo?.candidateEmail || '',
        candidatePhone: paymentOrder.customerPhone || payload?.personalInfo?.candidateMobile || '',
        classApplying: payload?.classApplying || '',
        gender: payload?.personalInfo?.gender || '',
        studyLocation: payload?.studyLocationPref?.firstPreference || '',
        createdAt: paymentOrder.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching order status:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch payment order status' },
      { status: 500 }
    );
  }
}
