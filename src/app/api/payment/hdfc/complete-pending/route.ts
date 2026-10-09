import { NextResponse } from 'next/server';
import { db, toMySqlDatetime } from '@/lib/db';
import { hashPassword, signToken, getAuthCookieOptions } from '@/lib/auth';
import { sendNotification, ADMIN_NOTIFICATION_EMAIL } from '@/lib/notifications';
import { getExamDetailsForGender } from '@/lib/validations';
import { fetchHdfcOrderStatus, HDFC_CONFIG } from '@/lib/hdfc';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, formData } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    if (!formData || !formData.personalInfo) {
      return NextResponse.json(
        { error: 'Application details are required to complete registration.' },
        { status: 400 }
      );
    }

    // 1. Verify status of the order from MySQL or directly from HDFC SmartGateway
    let paymentOrder = await db.getPaymentOrderByOrderId(orderId);
    let orderStatus = (paymentOrder?.status || '').toUpperCase();
    let statusResponse: any = paymentOrder?.paymentResponse || null;

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
          error: `Payment for Order ID ${orderId} is not confirmed as CHARGED (Current status: ${orderStatus || 'UNKNOWN'}). If you have already paid, please allow a few moments and try again.`,
        },
        { status: 400 }
      );
    }

    // 2. If already registered with a registrationNumber, return it immediately
    if (paymentOrder?.registrationNumber) {
      const regId = paymentOrder.registrationNumber;
      const candidateEmail = (formData.personalInfo?.candidateEmail || paymentOrder.customerEmail || '').trim().toLowerCase();
      const existingUser = await db.findUserByEmail(candidateEmail);
      let response = NextResponse.json({
        success: true,
        registrationNumber: regId,
        orderId,
        redirectUrl: `/payment/thank-you?orderId=${encodeURIComponent(orderId)}&regNo=${encodeURIComponent(regId)}`,
      });
      if (existingUser) {
        const token = signToken({
          userId: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        });
        const cookieOptions = getAuthCookieOptions();
        response.cookies.set(cookieOptions.name, token, cookieOptions);
      }
      return response;
    }

    // 3. Complete official registration using preserved formData
    const {
      classApplying,
      stream,
      personalInfo,
      parentInfo,
      addressInfo,
      studyLocationPref,
      documents,
      password,
    } = formData;

    const gender = (personalInfo?.gender || 'Male') as 'Male' | 'Female';
    const candidateEmail = (personalInfo?.candidateEmail || paymentOrder?.customerEmail || '').trim().toLowerCase();
    const candidateMobile = (personalInfo?.candidateMobile || paymentOrder?.customerPhone || '').trim();
    const cleanPhone = candidateMobile.replace(/\D/g, '').slice(-10);

    // Atomically generate Registration ID & Roll Number
    const registrationId = await db.getNextRegistrationNumber(gender);
    const assignedRollNo = await db.getNextRollNumber(classApplying, gender, stream);

    let passwordHash = '';
    if (password) {
      passwordHash = await hashPassword(password);
    } else {
      passwordHash = await hashPassword('Student@123');
    }

    // Find or create official candidate user
    let officialUser = await db.findUserByEmail(candidateEmail);
    if (!officialUser) {
      officialUser = await db.createUser({
        name: personalInfo.fullName.trim(),
        email: candidateEmail,
        phone: cleanPhone,
        role: 'applicant',
        passwordHash,
        registrationNumber: registrationId,
      });
    } else if (!officialUser.registrationNumber) {
      await db.updateUser(officialUser.id, { registrationNumber: registrationId });
    }

    // Create official application record
    const studyPref = studyLocationPref || { firstPreference: 'The Gurukul Nilokheri' };
    const newApplication = await db.createApplication({
      userId: officialUser.id,
      registrationNumber: registrationId,
      rollNumber: assignedRollNo,
      classApplying: classApplying.replace(/^Class\s*/i, 'Class '),
      personalInfo: {
        ...personalInfo,
        fullName: personalInfo.fullName.trim(),
        candidateEmail,
        candidateMobile,
      },
      parentInfo: {
        ...parentInfo,
        fatherName: parentInfo?.fatherName || '',
        fatherPhone: parentInfo?.fatherPhone || cleanPhone,
        motherName: parentInfo?.motherName || '',
      },
      addressInfo: addressInfo || {},
      academicInfo: {
        applyingClass: classApplying as any,
        previousSchoolName: personalInfo?.previousSchoolName || '',
        previousBoard: personalInfo?.previousBoard || '',
        otherBoard: personalInfo?.otherBoard || '',
        mediumOfInstruction: personalInfo?.mediumOfInstruction || '',
        stream: (stream as any) || undefined,
      },
      examCentrePref: studyPref,
      studyLocationPref: studyPref,
      documents: documents || {},
      status: 'submitted',
      paymentStatus: 'completed',
      amountPaid: paymentOrder?.amount || HDFC_CONFIG.FEE_AMOUNT,
      transactionId: statusResponse?.txn_id || `TXN_${orderId}`,
    });

    // Generate admit card
    const examDetails = getExamDetailsForGender(gender, assignedRollNo);
    const instructions = [
      'Bring this Admit Card along with an authentic Photo ID proof (e.g., Aadhaar Card) to the examination venue.',
      `Reporting Time: ${examDetails.reportingTime}. Candidates will not be permitted to enter the exam hall 30 minutes after commencement.`,
      'Only Blue/Black ballpoint pens are permitted. Use of calculators, smartwatches, or electronic devices is strictly prohibited.',
      'Parents and guardians will NOT be permitted inside the examination building during testing hours.',
      'Students must appear in decent formal attire or their current school uniform.',
    ];

    await db.generateOrReleaseAdmitCard({
      id: `admit-${newApplication.id}`,
      applicationId: newApplication.id,
      applicationNumber: registrationId,
      rollNumber: assignedRollNo,
      candidateName: personalInfo.fullName.trim(),
      fatherName: parentInfo?.fatherName || 'Parent',
      classApplying: newApplication.classApplying,
      examCentreName: examDetails.examCentreName,
      examCentreAddress: examDetails.examCentreAddress,
      examDate: examDetails.examDate,
      reportingTime: examDetails.reportingTime,
      examDuration: examDetails.examDuration,
      roomNumber: 'Will be displayed on Notice Board at Centre',
      candidatePhotoUrl: documents?.passportPhoto || undefined,
      isReleased: true,
      instructions,
      createdAt: toMySqlDatetime(new Date()),
    });

    // Update payment order in MySQL
    await db.updatePaymentOrderRecord(orderId, {
      status: 'CHARGED',
      applicationId: newApplication.id,
      registrationNumber: registrationId,
      paymentResponse: statusResponse || { status: 'CHARGED' },
    });

    // Create admin notification
    await db.createAdminNotification({
      type: 'APPLICATION_SUBMITTED',
      title: `Registration Completed: ${personalInfo.fullName}`,
      message: `${personalInfo.fullName} successfully completed entrance exam registration for ${newApplication.classApplying}. Reg No: ${registrationId}.`,
      entityId: newApplication.id,
      entityType: 'application',
      link: `/admin/applications/${newApplication.id}`,
      metadata: {
        registrationNumber: registrationId,
        candidateName: personalInfo.fullName,
        email: candidateEmail,
        phone: candidateMobile,
        classApplying: newApplication.classApplying,
        orderId,
      },
    });

    // Dispatch confirmation email
    sendNotification({
      to: candidateEmail,
      name: personalInfo.fullName.trim(),
      type: 'FEE_PAYMENT_RECEIPT',
      data: {
        name: personalInfo.fullName.trim(),
        registrationNumber: registrationId,
        rollNumber: assignedRollNo,
        class: newApplication.classApplying,
        examDate: examDetails.examDate,
        reportingTime: examDetails.reportingTime,
        examCentre: examDetails.examCentreName,
        examCentreAddress: examDetails.examCentreAddress,
        loginEmail: candidateEmail,
        portalUrl: `${request.headers.get('origin') || ''}/login`,
        amount: String(paymentOrder?.amount || HDFC_CONFIG.FEE_AMOUNT),
        transactionId: statusResponse?.txn_id || `TXN_${orderId}`,
      },
    }).catch(err => console.warn('[complete-pending] Notification send notice:', err));

    const token = signToken({
      userId: officialUser.id,
      name: officialUser.name,
      email: officialUser.email,
      role: officialUser.role,
    });

    const response = NextResponse.json({
      success: true,
      registrationNumber: registrationId,
      orderId,
      redirectUrl: `/payment/thank-you?orderId=${encodeURIComponent(orderId)}&regNo=${encodeURIComponent(registrationId)}`,
    });

    const cookieOptions = getAuthCookieOptions();
    response.cookies.set(cookieOptions.name, token, cookieOptions);
    return response;
  } catch (error: any) {
    console.error('Error completing pending payment:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to complete registration for this order.' },
      { status: 500 }
    );
  }
}
