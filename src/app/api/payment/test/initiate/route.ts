import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  generateHdfcOrderId,
  createHdfcOrderSession,
  getPublicBaseUrl,
  HDFC_CONFIG,
} from '@/lib/hdfc';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userName = body.name || 'Test Candidate';
    const userEmail = body.email || 'test@gurukul.com';
    const userPhone = body.phone || '9876543210';
    const regNo = body.registrationNumber || 'TEST-GUR-999';
    // Dynamic fee due amount for payment testing sideflow (strictly < 100)
    const rawAmount = typeof body.amount === 'number' ? body.amount : parseFloat(body.amount);
    const requestedAmount = !isNaN(rawAmount) && rawAmount > 0 && rawAmount < 100 ? rawAmount : 1;
    const dueId = typeof body.dueId === 'string' ? body.dueId.trim() : '';
    const dueTitle = typeof body.dueTitle === 'string' ? body.dueTitle.trim() : 'Candidate Fee Due';

    // Generate unique test order ID
    const orderId = generateHdfcOrderId('TEST');

    // Build return URL targeting our dedicated test return handler with due reference
    const baseUrl = getPublicBaseUrl(request);
    const returnUrl = `${baseUrl}/api/payment/test/return?dueId=${encodeURIComponent(dueId)}`;

    // Create session on HDFC SmartGateway with requested due amount
    let session: any = null;
    let gatewayError = null;

    try {
      session = await createHdfcOrderSession({
        orderId,
        customerId: `cust_test_${userPhone.slice(-6)}`,
        customerEmail: userEmail,
        customerPhone: userPhone,
        returnUrl,
        amount: requestedAmount,
        description: `The Gurukul Due: ${dueTitle} - ${userName}`,
        metadata: {
          testMode: 'true',
          candidateName: userName,
          registrationNumber: regNo,
          dueId,
          dueTitle,
          amount: String(requestedAmount),
        },
      });
    } catch (err: any) {
      console.warn('HDFC Gateway Session creation notice in test flow:', err?.message);
      gatewayError = err?.message;
    }

    // Persist payment order record
    await db.createPaymentOrderRecord({
      orderId,
      amount: requestedAmount,
      currency: 'INR',
      status: 'PENDING',
      customerEmail: userEmail,
      customerPhone: userPhone,
      customerId: `cust_test_${userPhone.slice(-6)}`,
      applicationPayload: {
        isTestFlow: true,
        candidateName: userName,
        registrationNumber: regNo,
        classApplying: 'Class 6 (Test)',
        dueId,
        dueTitle,
        personalInfo: {
          fullName: userName,
          candidateEmail: userEmail,
          candidateMobile: userPhone,
        },
      },
    });

    if (session?.paymentUrl) {
      return NextResponse.json({
        success: true,
        orderId,
        paymentUrl: session.paymentUrl,
        amount: requestedAmount,
        currency: 'INR',
      });
    }

    // If HDFC credentials or connection fails in local testing, provide direct mock URL
    return NextResponse.json({
      success: true,
      orderId,
      paymentUrl: `${baseUrl}/payment/gateway?order_id=${encodeURIComponent(orderId)}&testFlow=true`,
      isMockGateway: true,
      mockNotice: gatewayError,
      amount: requestedAmount,
      currency: 'INR',
    });
  } catch (error: any) {
    console.error('Error initiating test payment:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize test payment session.' },
      { status: 500 }
    );
  }
}
