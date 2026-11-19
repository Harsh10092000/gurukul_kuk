import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  validateName,
  validateOccupation,
  validatePhone,
  validateAadhaar,
  validateDob,
  validateClassAndStream,
  validateStudyLocation,
  validateAllFourDocuments,
  validateUploadedFile,
} from '@/lib/validations';
import {
  generateHdfcOrderId,
  resolveReturnUrl,
  createHdfcOrderSession,
  fetchHdfcOrderStatus,
  HDFC_CONFIG,
} from '@/lib/hdfc';
import { fetchRazorpayOrderPayments } from '@/lib/razorpay';
import { completePaymentAndRegistration } from '@/lib/payment-completion';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authUser = await getCurrentUser();
    const body = await request.json();

    const {
      classApplying,
      stream,
      personalInfo,
      parentInfo,
      addressInfo,
      studyLocationPref,
      documents,
      password,
    } = body;

    // 1. Candidate Full Name Validation
    const candNameVal = validateName(personalInfo?.fullName, 'Candidate Full Name');
    if (!candNameVal.isValid) {
      return NextResponse.json({ error: candNameVal.error }, { status: 400 });
    }

    // 2. Date of Birth Validation
    const dobVal = validateDob(personalInfo?.dob);
    if (!dobVal.isValid) {
      return NextResponse.json({ error: dobVal.error }, { status: 400 });
    }

    // 3. Gender Validation
    const gender = personalInfo?.gender;
    if (gender !== 'Male' && gender !== 'Female') {
      return NextResponse.json(
        { error: 'Gender must be selected as either Male or Female.' },
        { status: 400 }
      );
    }

    // 3b. Religion Validation
    if (!personalInfo?.religion || !personalInfo.religion.trim()) {
      return NextResponse.json(
        { error: 'Please select Candidate Religion.' },
        { status: 400 }
      );
    }

    // 4. Aadhaar Validation
    const aadhaarVal = validateAadhaar(personalInfo?.aadhaarNumber);
    if (!aadhaarVal.isValid) {
      return NextResponse.json({ error: aadhaarVal.error }, { status: 400 });
    }

    // Check duplicate Aadhaar across registered candidates (only in production)
    const isDemo = HDFC_CONFIG.PAYMENT_MODE === 'demo';
    if (!isDemo) {
      const existingAadhaarApp = await db.findApplicationByAadhaar(personalInfo.aadhaarNumber);
      if (existingAadhaarApp && existingAadhaarApp.status !== 'draft') {
        return NextResponse.json(
          {
            error:
              'An official application with this Aadhaar Number already exists in the system. Duplicate applications are strictly prohibited.',
          },
          { status: 409 }
        );
      }
    }

    // 5. Preferred Study Location Validation
    const systemSettings = await db.getSettings();
    const studyPref = studyLocationPref || body.examCentrePref || {};
    const locVal = validateStudyLocation(
      gender,
      studyPref.firstPreference,
      studyPref.secondPreference,
      systemSettings?.activeStudyLocations
    );
    if (!locVal.isValid) {
      return NextResponse.json({ error: locVal.error }, { status: 400 });
    }

    // 6. Class & Stream Validation
    const classVal = validateClassAndStream(
      classApplying,
      stream,
      studyPref.firstPreference,
      gender
    );
    if (!classVal.isValid) {
      return NextResponse.json({ error: classVal.error }, { status: 400 });
    }

    // 7. Previous School & Board Validation
    if (!personalInfo?.previousSchoolName || !personalInfo.previousSchoolName.trim()) {
      return NextResponse.json({ error: 'Previous School Name is required.' }, { status: 400 });
    }
    if (!personalInfo?.previousBoard || !personalInfo.previousBoard.trim()) {
      return NextResponse.json({ error: 'Previous Educational Board is required.' }, { status: 400 });
    }
    if (
      personalInfo.previousBoard === 'Others' &&
      (!personalInfo.otherBoard || !personalInfo.otherBoard.trim())
    ) {
      return NextResponse.json({ error: 'Please specify your Educational Board.' }, { status: 400 });
    }

    // 8. Parent Information Validation
    const fatherNameVal = validateName(parentInfo?.fatherName, "Father's Full Name");
    if (!fatherNameVal.isValid) {
      return NextResponse.json({ error: fatherNameVal.error }, { status: 400 });
    }
    const motherNameVal = validateName(parentInfo?.motherName, "Mother's Full Name");
    if (!motherNameVal.isValid) {
      return NextResponse.json({ error: motherNameVal.error }, { status: 400 });
    }
    const fatherPhoneVal = validatePhone(parentInfo?.fatherPhone, "Father's Mobile Phone");
    if (!fatherPhoneVal.isValid) {
      return NextResponse.json({ error: fatherPhoneVal.error }, { status: 400 });
    }
    const fatherOccVal = validateOccupation(parentInfo?.fatherOccupation, "Father's Occupation");
    if (!fatherOccVal.isValid) {
      return NextResponse.json({ error: fatherOccVal.error }, { status: 400 });
    }
    const motherOccVal = validateOccupation(parentInfo?.motherOccupation, "Mother's Occupation");
    if (!motherOccVal.isValid) {
      return NextResponse.json({ error: motherOccVal.error }, { status: 400 });
    }
    if (parentInfo?.motherPhone && parentInfo.motherPhone.trim()) {
      const motherPhoneVal = validatePhone(parentInfo.motherPhone, "Mother's Mobile Phone");
      if (!motherPhoneVal.isValid) {
        return NextResponse.json({ error: motherPhoneVal.error }, { status: 400 });
      }
    }

    // 9. Address Validation
    const cityVal = addressInfo?.city?.trim() || addressInfo?.district?.trim();
    if (
      !addressInfo?.streetAddress?.trim() ||
      !cityVal ||
      !addressInfo?.state?.trim() ||
      !addressInfo?.pincode?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            'Complete permanent address (Street, City/District, State, PIN Code) is required.',
        },
        { status: 400 }
      );
    }

    // 10. Mandatory 4 Documents Validation
    const docsVal = validateAllFourDocuments(documents);
    if (!docsVal.isValid) {
      return NextResponse.json({ error: docsVal.error }, { status: 400 });
    }

    // 11. File Content, Size (<=2MB), and Magic Byte Validation
    for (const docKey of ['photo', 'signature', 'aadhaarCard']) {
      const fileVal = validateUploadedFile(documents[docKey], docKey);
      if (!fileVal.isValid) {
        return NextResponse.json({ error: fileVal.error }, { status: 400 });
      }
    }

    // Clean contact information
    const candidateEmail = (
      personalInfo?.candidateEmail ||
      authUser?.email ||
      ''
    ).trim().toLowerCase();
    const candidateMobile = (
      personalInfo?.candidateMobile ||
      parentInfo?.fatherPhone ||
      (authUser as any)?.phone ||
      ''
    ).trim();
    const cleanPhone = candidateMobile.replace(/\D/g, '').slice(-10);

    // Strict Check: Prevent duplicate registration for already completed candidates
    if (candidateEmail) {
      const existingEmailApp = await db.findApplicationByEmail(candidateEmail);
      if (existingEmailApp && existingEmailApp.paymentStatus === 'completed') {
        return NextResponse.json(
          {
            error: `An entrance application with email '${candidateEmail}' has already been submitted and confirmed (Registration ID: ${existingEmailApp.registrationNumber || existingEmailApp.applicationNumber}). Duplicate applications are strictly prohibited.`,
          },
          { status: 409 }
        );
      }

      const existingEmailUser = await db.findUserByEmail(candidateEmail);
      if (existingEmailUser && existingEmailUser.role !== 'admin' && existingEmailUser.registrationNumber) {
        return NextResponse.json(
          {
            error: `An official candidate account with email '${candidateEmail}' already exists (Registration ID: ${existingEmailUser.registrationNumber}). Please login to your dashboard instead of creating a duplicate registration.`,
          },
          { status: 409 }
        );
      }
    }

    // In-flight stuck payment guard (checks bank live status and auto-expires stale sessions > 15 mins)
    const activePendingOrder = await db.findActivePendingOrder({
      email: candidateEmail,
      aadhaar: personalInfo?.aadhaarNumber,
    });

    if (activePendingOrder) {
      const orderTime = new Date(activePendingOrder.createdAt).getTime();
      const elapsedMins = Math.max(1, Math.round((Date.now() - orderTime) / 60000));
      let isCaptured = false;
      let isStaleOrFailed = false;
      let capturedPaymentId = '';

      if (activePendingOrder.orderId.startsWith('GUR_')) {
        // HDFC SmartGateway order
        try {
          const hdfcStatus = await fetchHdfcOrderStatus(activePendingOrder.orderId);
          const hdfcStatusUpper = (hdfcStatus?.status || '').toUpperCase();
          if (hdfcStatusUpper === 'CHARGED' || hdfcStatusUpper === 'SUCCESS') {
            isCaptured = true;
            capturedPaymentId = hdfcStatus?.txn_id || hdfcStatus?.transaction_id || `TXN_${activePendingOrder.orderId}`;
          } else if (
            hdfcStatusUpper === 'USER_ABORTED' ||
            hdfcStatusUpper === 'CANCELLED' ||
            hdfcStatusUpper === 'FAILED' ||
            hdfcStatusUpper === 'AUTHORIZATION_FAILED' ||
            elapsedMins > 15
          ) {
            isStaleOrFailed = true;
          }
        } catch {
          if (elapsedMins > 15) {
            isStaleOrFailed = true;
          }
        }
      } else {
        // Old Razorpay order
        try {
          const paymentsRes = await fetchRazorpayOrderPayments(activePendingOrder.orderId);
          const captured = paymentsRes?.items?.find((p: any) => p.status === 'captured' || p.status === 'authorized');
          if (captured) {
            isCaptured = true;
            capturedPaymentId = captured.id;
          } else {
            const everyFailed = paymentsRes?.items?.every(
              (p: any) => p.status === 'failed' || p.status === 'refunded'
            );
            if (everyFailed || elapsedMins > 15) {
              isStaleOrFailed = true;
            }
          }
        } catch {
          if (elapsedMins > 15) {
            isStaleOrFailed = true;
          }
        }
      }

      // If the earlier payment was captured, automatically finalize registration!
      if (isCaptured) {
        const result = await completePaymentAndRegistration({
          orderId: activePendingOrder.orderId,
          paymentId: capturedPaymentId,
          gateway: activePendingOrder.orderId.startsWith('GUR_') ? 'hdfc' : 'razorpay',
        });

        if (result.success) {
          return NextResponse.json({
            success: true,
            alreadyProcessed: true,
            registrationNumber: result.registrationNumber,
            rollNumber: result.rollNumber,
            redirectUrl: result.redirectUrl,
            message: 'Your earlier payment was already confirmed by the bank. Your registration has been finalized.',
          });
        }
      }

      // If the earlier order failed, expired, or was abandoned >15 mins ago, purge it and allow fresh checkout!
      if (isStaleOrFailed || elapsedMins > 15) {
        console.log(`[HDFC Initiate] Auto-clearing stale in-flight order ${activePendingOrder.orderId} (${elapsedMins} mins old) for ${candidateEmail}`);
        await db.purgeFailedPaymentCandidate({
          email: candidateEmail,
          orderId: activePendingOrder.orderId,
          reason: 'Stale in-flight order expired or failed',
        });
      } else {
        // Genuinely in-flight within last 15 minutes
        return NextResponse.json(
          {
            error: `A payment transaction of ₹${activePendingOrder.amount || HDFC_CONFIG.FEE_AMOUNT} is already in process with the bank for this candidate (Order ID: ${activePendingOrder.orderId}, initiated ${elapsedMins} minute${elapsedMins > 1 ? 's' : ''} ago). To prevent accidental double payment, you cannot initiate another payment until this transaction is confirmed or rejected by the bank.`,
            paymentPending: true,
            orderId: activePendingOrder.orderId,
            status: activePendingOrder.status,
            elapsedMins,
          },
          { status: 409 }
        );
      }
    }

    // Generate unique order ID
    const orderId = generateHdfcOrderId('GUR');
    const returnUrl = resolveReturnUrl(request);
    console.log(`[HDFC Initiate] Order: ${orderId} | Resolved return_url: ${returnUrl}`);
    const customerId = cleanPhone ? `cust_${cleanPhone}` : `cust_${Date.now()}`;

    // Create session on HDFC SmartGateway
    const session = await createHdfcOrderSession({
      orderId,
      customerId,
      customerEmail: candidateEmail,
      customerPhone: cleanPhone,
      returnUrl,
      description: `The Gurukul Entrance Fee - ${personalInfo.fullName}`,
      metadata: {
        candidateName: personalInfo.fullName,
        applyingClass: classApplying,
        studyLocation: studyPref.firstPreference,
      },
    });

    // Store pending payment order with the validated application payload
    await db.createPaymentOrderRecord({
      orderId,
      amount: HDFC_CONFIG.FEE_AMOUNT, // Strictly ₹800
      currency: HDFC_CONFIG.CURRENCY,
      status: 'PENDING',
      customerEmail: candidateEmail,
      customerPhone: cleanPhone,
      customerId,
      applicationPayload: {
        classApplying,
        stream,
        personalInfo: {
          ...personalInfo,
          candidateEmail,
          candidateMobile,
        },
        parentInfo,
        addressInfo,
        studyLocationPref: studyPref,
        examCentrePref: studyPref,
        documents,
        password: password || undefined,
        authUserId: authUser?.userId,
      },
    });

    return NextResponse.json({
      success: true,
      orderId,
      paymentUrl: session.paymentUrl,
      amount: HDFC_CONFIG.FEE_AMOUNT,
      currency: HDFC_CONFIG.CURRENCY,
    });
  } catch (error: any) {
    console.error('Error initiating HDFC payment:', error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          'Failed to initialize HDFC payment gateway session. Please try again.',
      },
      { status: 500 }
    );
  }
}
