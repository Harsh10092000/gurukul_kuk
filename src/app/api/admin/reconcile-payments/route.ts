import { NextResponse } from 'next/server';
import { db, getDbPool, isUsingFallbackStorage } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { fetchRazorpayOrderPayments, fetchRazorpayOrder } from '@/lib/razorpay';
import { completePaymentAndRegistration } from '@/lib/payment-completion';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'verifier')) {
      return NextResponse.json({ error: 'Unauthorized. Admin credentials required.' }, { status: 403 });
    }

    const pool = await getDbPool();
    const useFallback = isUsingFallbackStorage() || !pool;

    let pendingOrders: any[] = [];

    if (!useFallback && pool) {
      const [rows]: any = await pool.query(
        `SELECT order_id, status, customer_email, customer_phone, amount, application_payload, created_at
         FROM payment_orders
         WHERE status IN ('PENDING', 'PROCESSING', 'CANCELLED')
           AND created_at >= NOW() - INTERVAL 7 DAY
         ORDER BY created_at DESC
         LIMIT 50`
      );
      pendingOrders = (rows || []).map((r: any) => ({
        orderId: r.order_id,
        status: r.status,
        customerEmail: r.customer_email,
        customerPhone: r.customer_phone,
        applicationPayload: typeof r.application_payload === 'string' ? JSON.parse(r.application_payload) : r.application_payload,
        createdAt: r.created_at,
      }));
    } else {
      const store = (db as any).initFallbackFile ? (db as any).initFallbackFile() : null;
      if (store && store.paymentOrders) {
        pendingOrders = store.paymentOrders.filter(
          (o: any) => o.status === 'PENDING' || o.status === 'PROCESSING' || o.status === 'CANCELLED'
        );
      }
    }

    const results = {
      totalChecked: pendingOrders.length,
      recoveredCount: 0,
      alreadyCharged: 0,
      stillUnpaid: 0,
      errors: 0,
      details: [] as any[],
    };

    for (const order of pendingOrders) {
      const orderId = order.orderId;
      try {
        // Query Razorpay payments for this order
        const paymentsRes = await fetchRazorpayOrderPayments(orderId);
        const captured = paymentsRes?.items?.find((p) => p.status === 'captured' || p.status === 'authorized');

        let isPaid = Boolean(captured);
        let paymentId = captured?.id || '';

        if (!isPaid) {
          const rzpOrder = await fetchRazorpayOrder(orderId);
          if (rzpOrder && (rzpOrder.status === 'paid' || rzpOrder.amount_paid > 0)) {
            isPaid = true;
            paymentId = `pay_admin_reconcile_${Date.now()}`;
          }
        }

        if (isPaid) {
          const completionResult = await completePaymentAndRegistration({
            orderId,
            paymentId,
            gateway: 'razorpay',
          });

          if (completionResult.success) {
            results.recoveredCount++;
            results.details.push({
              orderId,
              status: 'RECOVERED_AND_REGISTERED',
              registrationNumber: completionResult.registrationNumber,
              rollNumber: completionResult.rollNumber,
              customerEmail: order.customerEmail,
            });
          } else {
            results.errors++;
            results.details.push({
              orderId,
              status: 'RECOVERY_FAILED',
              error: completionResult.error,
            });
          }
        } else {
          results.stillUnpaid++;
          results.details.push({
            orderId,
            status: 'UNPAID_ON_RAZORPAY',
            customerEmail: order.customerEmail,
          });
        }
      } catch (err: any) {
        results.errors++;
        results.details.push({
          orderId,
          status: 'ERROR',
          error: err?.message || 'Check failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: results,
    });
  } catch (error: any) {
    console.error('Error during payment reconciliation:', error);
    return NextResponse.json(
      { error: error?.message || 'Reconciliation failed.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
