import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  try {
    const { searchParams } = new URL(request.url);
    const orderId = (searchParams.get('orderId') || searchParams.get('order_id') || '').trim();
    const regNo = (searchParams.get('regNo') || searchParams.get('reg_no') || '').trim();

    if (!orderId) {
      return NextResponse.json(
        { verified: false, error: 'Order ID is required for verification.' },
        { status: 400, headers }
      );
    }

    // 1. Fetch live order record directly from MySQL
    const paymentOrder = await db.getPaymentOrderByOrderId(orderId);
    if (!paymentOrder) {
      return NextResponse.json(
        { verified: false, error: 'No transaction record found in database for this Order ID.' },
        { status: 404, headers }
      );
    }

    // 2. Verify actual payment status (strictly CHARGED or SUCCESS)
    const orderStatusStr = String(paymentOrder.status || '').toUpperCase();
    const isCharged = orderStatusStr === 'CHARGED' || orderStatusStr === 'SUCCESS';
    if (!isCharged) {
      return NextResponse.json(
        {
          verified: false,
          status: paymentOrder.status,
          error: `Payment is not confirmed. Current gateway status is '${paymentOrder.status}'.`,
        },
        { status: 400, headers }
      );
    }

    // 3. Verify application record in MySQL
    let application: any = null;
    if (paymentOrder.applicationId) {
      application = await db.getApplicationById(paymentOrder.applicationId);
    }
    if (!application && paymentOrder.registrationNumber) {
      application = await db.getApplicationById(paymentOrder.registrationNumber);
    }
    if (!application && regNo) {
      application = await db.getApplicationById(regNo);
    }
    if (!application && paymentOrder.customerEmail) {
      application = await db.findApplicationByEmail(paymentOrder.customerEmail);
    }

    if (!application || application.paymentStatus !== 'completed') {
      return NextResponse.json(
        {
          verified: false,
          error: 'Entrance application record has not been finalized or fee payment status is unverified.',
        },
        { status: 400, headers }
      );
    }

    // 4. Verify candidate user record in MySQL
    let user: any = null;
    if (application.userId) {
      user = await db.getUserById(application.userId);
    }
    if (!user && paymentOrder.customerEmail) {
      user = await db.findUserByEmail(paymentOrder.customerEmail);
    }

    if (!user) {
      return NextResponse.json(
        {
          verified: false,
          error: 'Candidate user profile could not be verified in the institutional database.',
        },
        { status: 400, headers }
      );
    }

    const resolvedRegNo =
      application.registrationNumber ||
      application.applicationNumber ||
      paymentOrder.registrationNumber ||
      user.registrationNumber;

    const txnId =
      paymentOrder.paymentResponse?.txn_id ||
      paymentOrder.paymentResponse?.transaction_id ||
      application.transactionId ||
      `TXN_${orderId.replace(/^GUR_/, '')}`;

    return NextResponse.json(
      {
        verified: true,
        order: {
          orderId: paymentOrder.orderId,
          amount: paymentOrder.amount,
          currency: paymentOrder.currency,
          status: paymentOrder.status,
          createdAt: paymentOrder.createdAt,
          txnId,
        },
        application: {
          id: application.id,
          registrationNumber: resolvedRegNo,
          applicationNumber: application.applicationNumber || resolvedRegNo,
          classApplying: application.classApplying,
          studyLocation: application.studyLocationPref || application.examCentrePref || {},
          candidateName: application.personalInfo?.fullName || user.name,
          candidateEmail: application.personalInfo?.candidateEmail || user.email,
          candidatePhone: application.personalInfo?.candidateMobile || user.phone,
          paymentStatus: application.paymentStatus,
          amountPaid: application.amountPaid,
          transactionId: txnId,
          createdAt: application.createdAt,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          registrationNumber: resolvedRegNo,
        },
      },
      { status: 200, headers }
    );
  } catch (error: any) {
    console.error('Order verification error:', error);
    return NextResponse.json(
      { verified: false, error: 'Database verification failed: ' + (error?.message || 'Server error') },
      { status: 500, headers }
    );
  }
}
