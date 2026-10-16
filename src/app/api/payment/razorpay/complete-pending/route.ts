import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, getAuthCookieOptions } from '@/lib/auth';
import { fetchRazorpayOrderPayments, fetchRazorpayOrder, fetchRazorpayPayment } from '@/lib/razorpay';
import { completePaymentAndRegistration } from '@/lib/payment-completion';
import { sendNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, paymentId: clientPaymentId, formData } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Razorpay Order ID is required.' }, { status: 400 });
    }

    // 1. Fetch internal order
    let paymentOrder = await db.getPaymentOrderByOrderId(orderId);

    // If order was not found in DB but formData was provided, create the payment order record
    if (!paymentOrder && formData && formData.personalInfo) {
      const candidateEmail = (formData.personalInfo.candidateEmail || '').trim().toLowerCase();
      const candidateMobile = (formData.parentInfo?.fatherPhone || formData.personalInfo.candidateMobile || '').trim();
      const cleanPhone = candidateMobile.replace(/\D/g, '').slice(-10);

      paymentOrder = await db.createPaymentOrderRecord({
        orderId,
        amount: 800.0,
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

    // If order is already completed
    if (paymentOrder.status === 'CHARGED' && paymentOrder.registrationNumber) {
      const regId = paymentOrder.registrationNumber;
      const candidateEmail = (paymentOrder.customerEmail || paymentOrder.applicationPayload?.personalInfo?.candidateEmail || '').trim().toLowerCase();
      const existingUser = candidateEmail ? await db.findUserByEmail(candidateEmail) : null;

      const redirectUrl = `/payment/thank-you?orderId=${encodeURIComponent(orderId)}&regNo=${encodeURIComponent(regId)}`;
      const response = NextResponse.json({
        success: true,
        alreadyProcessed: true,
        orderId,
        registrationNumber: regId,
        redirectUrl,
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
      paymentOrder = await db.getPaymentOrderByOrderId(orderId);
    }

    // 2. Query Razorpay API directly to verify whether payment was captured
    let capturedPaymentId = clientPaymentId || '';
    let isPaidOnRazorpay = false;

    // Check specific payment if provided
    if (clientPaymentId) {
      const pDetails = await fetchRazorpayPayment(clientPaymentId);
      if (pDetails && (pDetails.status === 'captured' || pDetails.status === 'authorized')) {
        isPaidOnRazorpay = true;
        capturedPaymentId = pDetails.id;
      }
    }

    // If not confirmed yet, fetch all payments for this Razorpay order
    if (!isPaidOnRazorpay) {
      const paymentsRes = await fetchRazorpayOrderPayments(orderId);
      if (paymentsRes && paymentsRes.items && paymentsRes.items.length > 0) {
        const successful = paymentsRes.items.find(
          (p) => p.status === 'captured' || p.status === 'authorized'
        );
        if (successful) {
          isPaidOnRazorpay = true;
          capturedPaymentId = successful.id;
        }
      }
    }

    // If still not found, check the Razorpay order itself
    if (!isPaidOnRazorpay) {
      const rzpOrder = await fetchRazorpayOrder(orderId);
      if (rzpOrder && (rzpOrder.status === 'paid' || rzpOrder.amount_paid > 0)) {
        isPaidOnRazorpay = true;
        if (!capturedPaymentId) {
          capturedPaymentId = `pay_recovered_${Date.now()}`;
        }
      }
    }

    if (!isPaidOnRazorpay) {
      let allFailed = false;
      try {
        const checkRes = await fetchRazorpayOrderPayments(orderId);
        if (checkRes && checkRes.items && checkRes.items.length > 0) {
          allFailed = checkRes.items.every(
            (p) => p.status === 'failed' || p.status === 'refunded'
          );
        }
      } catch {}

      if (allFailed) {
        const candidateEmail = (paymentOrder?.customerEmail || paymentOrder?.applicationPayload?.personalInfo?.candidateEmail || '').trim().toLowerCase();
        const candidateName = paymentOrder?.applicationPayload?.personalInfo?.fullName || 'Candidate';
        const failureReason = 'Payment was rejected or declined by bank';

        await db.purgeFailedPaymentCandidate({
          email: candidateEmail,
          orderId,
          reason: failureReason,
        });

        if (candidateEmail) {
          sendNotification({
            to: candidateEmail,
            name: candidateName,
            type: 'PAYMENT_FAILED_ALERT',
            data: {
              orderId,
              reason: failureReason,
            },
          }).catch((err) => console.warn('[CompletePending] Failed to send payment failed alert email:', err));
        }

        return NextResponse.json(
          {
            success: false,
            status: 'FAILED',
            rejected: true,
            error: `Your payment was rejected or declined by your bank. Candidate details will not be registered for this failed attempt. You may now submit your application and try paying again.`,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          status: 'UNPAID',
          error: `Payment for Order ID ${orderId} is still under process with your bank / Razorpay. If your account was debited, your registration will be activated automatically once the bank confirms it, and an email confirmation will be sent to you.`,
        },
        { status: 400 }
      );
    }

    // 3. Atomically complete payment and registration
    const result = await completePaymentAndRegistration({
      orderId,
      paymentId: capturedPaymentId,
      gateway: 'razorpay',
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
    console.error('Error completing pending Razorpay payment:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process pending payment recovery.' },
      { status: 500 }
    );
  }
}
