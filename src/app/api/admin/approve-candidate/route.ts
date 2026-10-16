import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { completePaymentAndRegistration } from '@/lib/payment-completion';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET: Retrieve all candidates whose fee payment is recorded but registration is pending admin approval
 */
export async function GET(request: Request) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'verifier')) {
      return NextResponse.json({ error: 'Unauthorized. Admin credentials required.' }, { status: 403 });
    }

    const pendingOrders = await db.getPendingPaidOrders();

    const formatted = pendingOrders.map((p) => {
      const payload = p.applicationPayload || {};
      const personal = payload.personalInfo || {};
      const parent = payload.parentInfo || {};
      const studyLoc = payload.studyLocationPref || {};

      return {
        orderId: p.orderId,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
        paymentId: (p.paymentResponse as any)?.razorpay_payment_id || (p.paymentResponse as any)?.paymentId || '',
        candidateName: personal.fullName || 'Not provided',
        candidateEmail: personal.candidateEmail || p.customerEmail || '',
        candidateMobile: parent.fatherPhone || personal.candidateMobile || p.customerPhone || '',
        gender: personal.gender || 'Male',
        category: personal.category || 'General',
        dob: personal.dob || '',
        classApplying: payload.classApplying || 'Class 6',
        stream: payload.stream || payload.academicInfo?.stream || undefined,
        firstPreference: studyLoc.firstPreference || 'The Gurukul Nilokheri',
        fatherName: parent.fatherName || '',
        documents: payload.documents || {},
      };
    });

    return NextResponse.json({
      success: true,
      pendingCount: formatted.length,
      candidates: formatted,
    });
  } catch (error: any) {
    console.error('Error fetching pending paid candidates:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch pending candidates.' },
      { status: 500 }
    );
  }
}

/**
 * POST: Admin manually approves a paid candidate and generates new latest Registration & Roll numbers ahead of sequence
 */
export async function POST(request: Request) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'verifier')) {
      return NextResponse.json({ error: 'Unauthorized. Admin credentials required.' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, customRemarks } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required to approve candidate.' }, { status: 400 });
    }

    const paymentOrder = await db.getPaymentOrderByOrderId(orderId);
    if (!paymentOrder) {
      return NextResponse.json({ error: `Payment order record for ${orderId} not found.` }, { status: 404 });
    }

    if (!paymentOrder.applicationPayload) {
      return NextResponse.json({ error: 'Application payload is missing from payment order record.' }, { status: 400 });
    }

    // Determine paymentId from payment_response or fallback
    const pResponse = paymentOrder.paymentResponse as any;
    const paymentId = pResponse?.razorpay_payment_id || pResponse?.paymentId || pResponse?.id || `pay_admin_appr_${Date.now()}`;

    // Atomically complete registration, issuing next sequential Registration Number & Roll Number
    const result = await completePaymentAndRegistration({
      orderId,
      paymentId,
      gateway: 'razorpay',
      rawPaymentResponse: {
        ...paymentOrder.paymentResponse,
        adminApprovedBy: authUser.email,
        adminApprovedAt: new Date().toISOString(),
        customRemarks: customRemarks || 'Manually approved by institutional admissions administrator',
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to approve and register candidate.' }, { status: 500 });
    }

    // Record audit log for admin manual approval
    await recordAuditLog({
      userId: authUser.userId,
      userName: authUser.name,
      userRole: authUser.role,
      action: 'ADMIN_APPROVED_AND_REGISTERED_CANDIDATE',
      entity: 'payment_orders',
      entityId: orderId,
      details: {
        orderId,
        paymentId,
        registrationNumber: result.registrationNumber,
        rollNumber: result.rollNumber,
        adminEmail: authUser.email,
        remarks: customRemarks || 'Manual approval from admin portal',
      },
    });

    const finalRollNo = result.rollNumber || 'Allotted in Record';
    console.log(`[AdminApprove] Admin ${authUser.email} approved candidate: Reg ${result.registrationNumber}, Roll ${finalRollNo} for order ${orderId}`);

    return NextResponse.json({
      success: true,
      message: `Candidate approved successfully. Registration Number: ${result.registrationNumber}, Roll Number: ${finalRollNo}`,
      orderId,
      registrationNumber: result.registrationNumber,
      rollNumber: finalRollNo,
      applicationId: result.applicationId,
    });
  } catch (error: any) {
    console.error('Error approving candidate:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to approve candidate.' },
      { status: 500 }
    );
  }
}
