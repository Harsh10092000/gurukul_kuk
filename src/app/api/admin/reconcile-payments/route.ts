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
      // Set session sort buffer if needed, and query lightweight columns without heavy LONGTEXT payloads
      await pool.query('SET SESSION sort_buffer_size = 4 * 1024 * 1024').catch(() => {});
      const [rows]: any = await pool.query(
        `SELECT id, order_id, status, customer_email, customer_phone, amount, created_at
         FROM payment_orders
         WHERE (registration_number IS NULL OR registration_number = '' OR application_id IS NULL)
           AND status != 'CHARGED'
           AND application_payload IS NOT NULL
           AND created_at >= NOW() - INTERVAL 30 DAY
         ORDER BY id DESC
         LIMIT 100`
      );
      pendingOrders = (rows || []).map((r: any) => ({
        orderId: r.order_id,
        status: r.status,
        customerEmail: r.customer_email,
        customerPhone: r.customer_phone,
        createdAt: r.created_at,
      }));
    } else {
      const store = (db as any).initFallbackFile ? (db as any).initFallbackFile() : null;
      if (store && store.paymentOrders) {
        pendingOrders = store.paymentOrders.filter(
          (o: any) => (!o.registrationNumber || o.status !== 'CHARGED') && o.applicationPayload
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
          // Mark payment order as verified CHARGED with payment ID so it appears in admin approval table
          await db.updatePaymentOrderRecord(orderId, {
            status: 'CHARGED',
            paymentResponse: {
              gateway: 'razorpay',
              razorpay_payment_id: paymentId,
              razorpay_order_id: orderId,
              verifiedAt: new Date().toISOString(),
              syncSource: 'admin_razorpay_sync',
            },
          });

          results.recoveredCount++;
          results.details.push({
            orderId,
            status: 'AWAITING_ADMIN_APPROVAL',
            paymentId,
            customerEmail: order.customerEmail,
          });
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
