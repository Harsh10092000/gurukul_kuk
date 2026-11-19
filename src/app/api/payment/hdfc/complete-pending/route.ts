import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, getAuthCookieOptions } from '@/lib/auth';
import { fetchHdfcOrderStatus, HDFC_CONFIG } from '@/lib/hdfc';
import { completePaymentAndRegistration } from '@/lib/payment-completion';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, formData } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    let paymentOrder = await db.getPaymentOrderByOrderId(orderId);

    // If order was not found in DB but formData was provided, create the payment order record
    if (!paymentOrder && formData && formData.personalInfo) {
      const candidateEmail = (formData.personalInfo.candidateEmail || '').trim().toLowerCase();
      const candidateMobile = (formData.parentInfo?.fatherPhone || formData.personalInfo.candidateMobile || '').trim();
      const cleanPhone = candidateMobile.replace(/\D/g, '').slice(-10);

      paymentOrder = await db.createPaymentOrderRecord({
        orderId,
        amount: HDFC_CONFIG.FEE_AMOUNT,
        currency: 'INR',
        status: 'PENDING',
        customerEmail: candidateEmail,
        customerPhone: cleanPhone,
        customerId: cleanPhone ? `cust_${cleanPhone}` : `cust_${Date.now()}`,
        applicationPayload: formData,
      });
    }

    if (!paymentOrder) {
      return NextResponse.json({ error: 'Order record not found in institutional database.' }, { status: 404 });
    }

    // If already registered with a registrationNumber, return it immediately
    if (paymentOrder.status === 'CHARGED' && paymentOrder.registrationNumber) {
      const regId = paymentOrder.registrationNumber;
      const candidateEmail = (formData?.personalInfo?.candidateEmail || paymentOrder.customerEmail || '').trim().toLowerCase();
      const existingUser = candidateEmail ? await db.findUserByEmail(candidateEmail) : null;
      const response = NextResponse.json({
        success: true,
        alreadyProcessed: true,
        registrationNumber: regId,
        orderId,
        redirectUrl: `/payment/thank-you?orderId=${encodeURIComponent(orderId)}&regNo=${encodeURIComponent(regId)}`,
      });
      if (existingUser) {
        const token = signToken({
          userId: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role as any,
        });
        const cookieOptions = getAuthCookieOptions();
        response.cookies.set(cookieOptions.name, token, cookieOptions);
      }
      return response;
    }

    // If application payload is missing from DB record but provided in request, update it
    if ((!paymentOrder.applicationPayload || !paymentOrder.applicationPayload.personalInfo) && formData && formData.personalInfo) {
      await db.updatePaymentOrderRecord(orderId, {
        applicationPayload: formData,
      });
      const reloaded = await db.getPaymentOrderByOrderId(orderId);
      if (reloaded) {
        paymentOrder = reloaded;
      }
    }

    // 1. Verify status directly with HDFC SmartGateway
    let statusResponse: any = paymentOrder?.paymentResponse || null;
    let orderStatus = (paymentOrder?.status || '').toUpperCase();

    if (orderStatus !== 'CHARGED' && orderStatus !== 'SUCCESS') {
      try {
        statusResponse = await fetchHdfcOrderStatus(orderId);
        orderStatus = (statusResponse?.status || '').toUpperCase();
      } catch (err: any) {
        console.warn(`[complete-pending] Could not fetch live status from HDFC for ${orderId}:`, err?.message);
      }
    }

    const isCharged = orderStatus === 'CHARGED' || orderStatus === 'SUCCESS';
    if (!isCharged) {
      return NextResponse.json(
        {
          success: false,
          status: orderStatus || 'UNPAID',
          error: `Payment for Order ID ${orderId} is not confirmed as CHARGED (Current status: ${orderStatus || 'UNKNOWN'}). If you have already paid, please allow a few moments and try again.`,
        },
        { status: 400 }
      );
    }

    // Check amount tampering
    const returnedAmount = parseFloat(String(statusResponse?.amount));
    const expectedAmount = paymentOrder?.amount || HDFC_CONFIG.FEE_AMOUNT;
    if (Math.abs(returnedAmount - expectedAmount) > 0.01) {
      console.error(`[complete-pending Security Alert] Amount tampering! Returned: ₹${returnedAmount}, Expected: ₹${expectedAmount}`);
      return NextResponse.json({ error: 'Amount mismatch detected' }, { status: 400 });
    }

    const txnId = statusResponse?.txn_id || statusResponse?.transaction_id || `TXN_${orderId}`;

    // 2. Atomically complete payment and registration
    const result = await completePaymentAndRegistration({
      orderId,
      paymentId: txnId,
      gateway: 'hdfc',
      rawPaymentResponse: statusResponse,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to complete registration for this order.' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      success: true,
      recovered: true,
      orderId: result.orderId,
      paymentId: result.paymentId,
      registrationNumber: result.registrationNumber,
      rollNumber: result.rollNumber,
      redirectUrl: result.redirectUrl,
    });

    if (result.user) {
      const token = signToken({
        userId: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role as any,
      });
      const cookieOptions = getAuthCookieOptions();
      response.cookies.set(cookieOptions.name, token, cookieOptions);
    }

    return response;
  } catch (error: any) {
    console.error('Error completing pending payment:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to complete registration for this order.' },
      { status: 500 }
    );
  }
}
