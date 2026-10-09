import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, signToken, getAuthCookieOptions } from '@/lib/auth';
import { sendNotification, ADMIN_NOTIFICATION_EMAIL } from '@/lib/notifications';
import { getExamDetailsForGender } from '@/lib/validations';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Incomplete Razorpay payment verification parameters.' },
        { status: 400 }
      );
    }

    // 1. Cryptographically verify signature using HMAC-SHA256
    const isSignatureValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isSignatureValid) {
      console.error(`[Razorpay Verify Security Alert] Invalid signature for order ${razorpay_order_id}`);
      return NextResponse.json(
        { error: 'Payment signature verification failed. Transaction cannot be validated.' },
        { status: 400 }
      );
    }

    // 2. Fetch internal payment order record from MySQL
    const paymentOrder = await db.getPaymentOrderByOrderId(razorpay_order_id);
    if (!paymentOrder) {
      console.error(`[Razorpay Verify] Order ${razorpay_order_id} not found in database.`);
      return NextResponse.json(
        { error: 'Payment order record not found in institutional database.' },
        { status: 404 }
      );
    }

    // 3. Idempotency check: if order was already processed
    if (paymentOrder.status === 'CHARGED' && paymentOrder.registrationNumber) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        orderId: razorpay_order_id,
        registrationNumber: paymentOrder.registrationNumber,
        redirectUrl: `/payment/thank-you?orderId=${encodeURIComponent(razorpay_order_id)}&regNo=${encodeURIComponent(paymentOrder.registrationNumber)}&txnId=${encodeURIComponent(razorpay_payment_id)}`,
      });
    }

    // 4. Retrieve application payload
    const payload = paymentOrder.applicationPayload;
    if (!payload || !payload.personalInfo) {
      console.error(`[Razorpay Verify] Missing application payload for order ${razorpay_order_id}`);
      return NextResponse.json(
        { error: 'Application payload is missing. Please contact the admission helpline.' },
        { status: 400 }
      );
    }

    const {
      classApplying,
      stream,
      personalInfo,
      parentInfo,
      addressInfo,
      studyLocationPref,
      documents,
      password,
    } = payload;

    const gender = (personalInfo?.gender || 'Male') as 'Male' | 'Female';
    const candidateEmail = (personalInfo?.candidateEmail || paymentOrder.customerEmail || '').trim().toLowerCase();
    const candidateMobile = (personalInfo?.candidateMobile || paymentOrder.customerPhone || '').trim();
    const cleanPhone = candidateMobile.replace(/\D/g, '').slice(-10);

    // 5. Check if an official application already exists for this email
    const existingAppByEmail = await db.findApplicationByEmail(candidateEmail);
    if (existingAppByEmail && existingAppByEmail.paymentStatus === 'completed') {
      const regId = existingAppByEmail.registrationNumber || existingAppByEmail.applicationNumber;
      await db.updatePaymentOrderRecord(razorpay_order_id, {
        status: 'CHARGED',
        applicationId: existingAppByEmail.id,
        registrationNumber: regId,
        paymentResponse: { razorpay_payment_id, razorpay_order_id, razorpay_signature },
      });

      const existingUser = await db.findUserByEmail(candidateEmail);
      const redirectUrl = `/payment/thank-you?orderId=${encodeURIComponent(razorpay_order_id)}&regNo=${encodeURIComponent(regId)}&txnId=${encodeURIComponent(razorpay_payment_id)}`;
      const response = NextResponse.json({
        success: true,
        registrationNumber: regId,
        redirectUrl,
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

    // 6. Atomically Generate Official Registration Number and Sequential Roll Number
    const registrationId = await db.getNextRegistrationNumber(gender);
    const assignedRollNo = await db.getNextRollNumber(
      classApplying,
      gender,
      stream || payload.academicInfo?.stream
    );

    // 7. Secure Password Hashing
    let passwordHash = '';
    if (password) {
      passwordHash = await hashPassword(password);
    } else {
      passwordHash = await hashPassword('Student@123');
    }

    // 8. Create or Link Candidate Account
    let officialUser: any;
    const existingUser = await db.findUserByEmail(candidateEmail);
    if (existingUser) {
      officialUser = existingUser;
    } else {
      officialUser = await db.createUser({
        name: personalInfo.fullName.trim(),
        email: candidateEmail,
        phone: cleanPhone,
        role: 'applicant',
        passwordHash,
        registrationNumber: registrationId,
      });
    }

    // 9. Create Official Application Record
    const newApplication = await db.createApplication({
      userId: officialUser.id,
      registrationNumber: registrationId,
      rollNumber: assignedRollNo,
      classApplying: classApplying.replace(/^Class\s*/i, 'Class '),
      stream: classApplying.includes('11') ? stream : undefined,
      personalInfo: {
        ...personalInfo,
        candidateEmail,
        candidateMobile,
        whatsappNumber: addressInfo?.whatsappNumber || candidateMobile,
      },
      parentInfo,
      addressInfo,
      academicInfo: {
        applyingClass: classApplying,
        stream: classApplying.includes('11') ? stream : undefined,
        previousSchoolName: personalInfo.previousSchoolName,
        previousBoard: personalInfo.previousBoard,
        otherBoard: personalInfo.otherBoard,
      },
      studyLocationPref: studyLocationPref,
      examCentrePref: studyLocationPref,
      documents: documents || {},
      status: 'approved',
      paymentStatus: 'completed',
      amountPaid: 800,
      transactionId: razorpay_payment_id,
    });

    // 10. Generate Admit Card
    const settings = await db.getSettings();
    const examDetails = getExamDetailsForGender(gender, registrationId);

    const isFemale = gender === 'Female';
    const rawSeq = parseInt(assignedRollNo.slice(4), 10) || 1;
    const candidateIndex = isFemale ? (rawSeq > 5000 ? rawSeq - 5000 : rawSeq) : rawSeq;
    const indexForSeating = (candidateIndex % 1000) || candidateIndex;
    const hallNumber = Math.ceil(indexForSeating / 30);
    const deskNumber = ((indexForSeating - 1) % 30) + 1;

    await db.generateOrReleaseAdmitCard({
      id: 'admit-' + newApplication.id,
      applicationId: newApplication.id,
      applicationNumber: registrationId,
      rollNumber: assignedRollNo,
      candidateName: personalInfo.fullName.trim(),
      fatherName: parentInfo?.fatherName?.trim() || '',
      classApplying: newApplication.classApplying,
      stream: newApplication.stream,
      examCentreName: examDetails.examCentreName,
      examCentreAddress: examDetails.examCentreAddress,
      examDate: examDetails.examDate,
      reportingTime: examDetails.reportingTime,
      examDuration: examDetails.examDuration,
      roomNumber: `Hall-${hallNumber}, Desk ${deskNumber}`,
      candidatePhotoUrl: documents?.photo || '/logo-gurukul.png',
      candidateSignatureUrl: documents?.signature || undefined,
      isReleased: Boolean(settings.admitCardsReleased),
      instructions: [
        'Bring a printed clear copy of this Admit Card along with your original Aadhaar Card.',
        'Candidates must report to their allotted examination centre at least 45 minutes before exam start time.',
        'Calculators, smart devices, watches, and mobile phones are strictly prohibited in the exam hall.',
        'Only Blue or Black ballpoint pens are permitted for marking answers.',
      ],
      createdAt: new Date().toISOString(),
    });

    // 11. Finalize Payment Order Record
    await db.updatePaymentOrderRecord(razorpay_order_id, {
      status: 'CHARGED',
      applicationId: newApplication.id,
      registrationNumber: registrationId,
      paymentResponse: {
        gateway: 'razorpay',
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        verifiedAt: new Date().toISOString(),
      },
    });

    // 12. Record Audit Log
    await recordAuditLog({
      userId: officialUser.id,
      userName: officialUser.name,
      userRole: officialUser.role,
      action: 'PAYMENT_SUCCESS_RAZORPAY',
      entity: 'payment_orders',
      entityId: razorpay_order_id,
      details: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        registrationNumber: registrationId,
        rollNumber: assignedRollNo,
        amount: 800,
      },
    });

    // 13. Dispatch Confirmation Email & Notification in background (non-blocking)
    (async () => {
      try {
        await sendNotification({
          to: candidateEmail,
          name: personalInfo.fullName,
          type: 'APPLICATION_SUBMITTED',
          data: {
            registrationNumber: registrationId,
            applicationNumber: registrationId,
            classApplying: newApplication.classApplying,
          },
        });

        const receiptNo = 'REC-RZP-' + Math.floor(100000 + Math.random() * 900000);
        await sendNotification({
          to: candidateEmail,
          name: personalInfo.fullName,
          type: 'FEE_PAYMENT_RECEIPT',
          data: {
            registrationNumber: registrationId,
            applicationNumber: registrationId,
            receiptNumber: receiptNo,
            transactionId: razorpay_payment_id,
            amount: 800,
            classApplying: newApplication.classApplying,
            candidateEmail,
            candidateMobile,
            paymentDate: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          },
        });

        // 13b. Dispatch Official Administrative Registration Alert with Full Candidate Details
        const fullAddress = [
          addressInfo?.streetAddress,
          addressInfo?.city,
          addressInfo?.district,
          addressInfo?.state,
          addressInfo?.pincode ? `PIN: ${addressInfo.pincode}` : '',
        ].filter(Boolean).join(', ') || addressInfo?.city || 'Not provided';

        await sendNotification({
          to: ADMIN_NOTIFICATION_EMAIL,
          name: 'Admissions Desk',
          type: 'ADMIN_NEW_REGISTRATION_ALERT',
          data: {
            registrationNumber: registrationId,
            rollNumber: assignedRollNo || 'Pending Allotment',
            applicationNumber: registrationId,
            receiptNumber: receiptNo,
            fullName: personalInfo.fullName,
            classApplying: newApplication.classApplying,
            fatherName: parentInfo?.fatherName || 'N/A',
            fatherOccupation: parentInfo?.fatherOccupation || 'N/A',
            motherName: parentInfo?.motherName || 'N/A',
            motherOccupation: parentInfo?.motherOccupation || 'N/A',
            gender: personalInfo?.gender || 'N/A',
            dob: personalInfo?.dob || 'N/A',
            aadhaarNumber: personalInfo?.aadhaarNumber || 'N/A',
            address: fullAddress,
            transactionId: razorpay_payment_id,
            amount: 800,
            paymentDate: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }),
          },
        });
      } catch (notifErr) {
        console.warn('[Razorpay Verify] Background notification dispatch notice:', notifErr);
      }
    })();

    // 14. Sign Auth Token and set Cookie
    const token = signToken({
      userId: officialUser.id,
      name: officialUser.name,
      email: officialUser.email,
      role: officialUser.role,
    });

    const redirectUrl = `/payment/thank-you?orderId=${encodeURIComponent(razorpay_order_id)}&regNo=${encodeURIComponent(registrationId)}&txnId=${encodeURIComponent(razorpay_payment_id)}`;

    const response = NextResponse.json({
      success: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      registrationNumber: registrationId,
      rollNumber: assignedRollNo,
      redirectUrl,
    });

    const cookieOptions = getAuthCookieOptions();
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    return NextResponse.json(
      { error: error?.message || 'Payment verification failed.' },
      { status: 500 }
    );
  }
}
