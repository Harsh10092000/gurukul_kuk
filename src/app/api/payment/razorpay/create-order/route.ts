import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';
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
import { createRazorpayOrder, RAZORPAY_CONFIG, fetchRazorpayOrderPayments, fetchRazorpayOrder } from '@/lib/razorpay';
import { completePaymentAndRegistration } from '@/lib/payment-completion';
import { checkRateLimit, rateLimitResponse, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const ipCheck = checkRateLimit(`rzp_create_ip:${clientIp}`, 10, 10 * 60 * 1000);
    if (!ipCheck.success) {
      return rateLimitResponse(
        ipCheck,
        'Too many payment sessions initiated from your network. Please wait a few minutes before trying again.'
      );
    }

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

    // 4. Preferred Study Location Validation
    const systemSettings = await db.getSettings();
    const studyPref = studyLocationPref || { firstPreference: 'The Gurukul Nilokheri' };
    const locVal = validateStudyLocation(
      gender,
      studyPref.firstPreference,
      studyPref.secondPreference,
      systemSettings?.activeStudyLocations
    );
    if (!locVal.isValid) {
      return NextResponse.json({ error: locVal.error }, { status: 400 });
    }

    // 5. Class & Stream Validation
    const classVal = validateClassAndStream(
      classApplying,
      stream,
      studyPref.firstPreference,
      gender
    );
    if (!classVal.isValid) {
      return NextResponse.json({ error: classVal.error }, { status: 400 });
    }

    // 6. Parent Information Validation
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

    const fatherOccVal = validateOccupation(parentInfo?.fatherOccupation, "Father's Occupation", true);
    if (!fatherOccVal.isValid) {
      return NextResponse.json({ error: fatherOccVal.error }, { status: 400 });
    }
    const motherOccVal = validateOccupation(parentInfo?.motherOccupation, "Mother's Occupation", true);
    if (!motherOccVal.isValid) {
      return NextResponse.json({ error: motherOccVal.error }, { status: 400 });
    }
    if (parentInfo?.motherPhone && parentInfo.motherPhone.trim()) {
      const motherPhoneVal = validatePhone(parentInfo.motherPhone, "Mother's Mobile Phone");
      if (!motherPhoneVal.isValid) {
        return NextResponse.json({ error: motherPhoneVal.error }, { status: 400 });
      }
    }

    // 7. Aadhaar Validation & Uniqueness
    const aadhaarVal = validateAadhaar(personalInfo?.aadhaarNumber);
    if (!aadhaarVal.isValid) {
      return NextResponse.json({ error: aadhaarVal.error }, { status: 400 });
    }

    const existingAadhaarApp = await db.findApplicationByAadhaar(personalInfo.aadhaarNumber);
    if (
      existingAadhaarApp &&
      existingAadhaarApp.status !== 'rejected' &&
      existingAadhaarApp.status !== 'draft'
    ) {
      return NextResponse.json(
        {
          error:
            'This Aadhaar Card number is already registered with an active entrance application. Duplicate applications are not permitted.',
        },
        { status: 409 }
      );
    }

    // 8. Documents Validation
    const docsVal = validateAllFourDocuments(documents);
    if (!docsVal.isValid) {
      return NextResponse.json(
        { error: 'Please upload all 3 required documents (Candidate Photo, Candidate Signature, Aadhaar Card).' },
        { status: 400 }
      );
    }

    // 9. Document Size & Format Validation
    const photoVal = validateUploadedFile(documents?.passportPhoto || documents?.photo, 'Photograph');
    if (!photoVal.isValid) return NextResponse.json({ error: photoVal.error }, { status: 400 });

    const candSigVal = validateUploadedFile(documents?.candidateSignature || documents?.signature, 'Candidate Signature');
    if (!candSigVal.isValid) return NextResponse.json({ error: candSigVal.error }, { status: 400 });

    const aadhaarFileVal = validateUploadedFile(documents?.aadhaarCard, 'Aadhaar Card File');
    if (!aadhaarFileVal.isValid) return NextResponse.json({ error: aadhaarFileVal.error }, { status: 400 });

    // Derive contact coordinates (candidate mobile matches father's number)
    const candidateEmail = (personalInfo.candidateEmail || '').trim().toLowerCase();
    const candidateMobile = (parentInfo?.fatherPhone || personalInfo.candidateMobile || '').trim();
    const cleanPhone = candidateMobile.replace(/\D/g, '').slice(-10);

    // Prevent duplicate registration for already completed candidates
    if (candidateEmail) {
      const existingEmailApp = await db.findApplicationByEmail(candidateEmail);
      if (existingEmailApp && existingEmailApp.paymentStatus === 'completed') {
        return NextResponse.json(
          {
            error: `An application with email ${candidateEmail} is already registered. Please login to your dashboard.`,
          },
          { status: 409 }
        );
      }
    }

    // 8. Prevent duplicate in-flight payments (stuck payment guard - no time limit, checks Razorpay live status)
    const activePendingOrder = await db.findActivePendingOrder({
      email: candidateEmail,
      aadhaar: personalInfo?.aadhaarNumber,
    });

    if (activePendingOrder) {
      let isCaptured = false;
      let isAllFailed = false;
      let capturedPaymentId = '';

      try {
        const paymentsRes = await fetchRazorpayOrderPayments(activePendingOrder.orderId);
        if (paymentsRes && paymentsRes.items && paymentsRes.items.length > 0) {
          const captured = paymentsRes.items.find((p) => p.status === 'captured' || p.status === 'authorized');
          if (captured) {
            isCaptured = true;
            capturedPaymentId = captured.id;
          } else {
            const everyFailed = paymentsRes.items.every(
              (p) => p.status === 'failed' || p.status === 'refunded'
            );
            if (everyFailed) {
              isAllFailed = true;
            }
          }
        } else {
          const rzpOrder = await fetchRazorpayOrder(activePendingOrder.orderId);
          if (rzpOrder) {
            if (rzpOrder.status === 'paid' || rzpOrder.amount_paid > 0) {
              isCaptured = true;
              capturedPaymentId = `pay_recovered_${Date.now()}`;
            } else if (rzpOrder.status === 'attempted') {
              // In flight payment attempt
            } else {
              // Status is 'created' (0 payment attempts made)
              // If order was created more than 5 minutes ago with 0 attempts, consider it expired/abandoned
              const orderAgeMs = Date.now() - new Date(activePendingOrder.createdAt).getTime();
              if (orderAgeMs > 5 * 60 * 1000) {
                isAllFailed = true;
              }
            }
          } else {
            isAllFailed = true;
          }
        }
      } catch (checkErr) {
        console.warn(`[CreateOrder] Could not verify in-flight Razorpay order ${activePendingOrder.orderId}:`, checkErr);
      }

      // If the in-flight payment was actually captured, automatically register candidate without second payment!
      if (isCaptured) {
        const result = await completePaymentAndRegistration({
          orderId: activePendingOrder.orderId,
          paymentId: capturedPaymentId,
          gateway: 'razorpay',
        });

        if (result.success) {
          return NextResponse.json({
            success: true,
            alreadyProcessed: true,
            registrationNumber: result.registrationNumber,
            rollNumber: result.rollNumber,
            redirectUrl: result.redirectUrl,
            message: 'Your payment was already confirmed by the bank. Your registration has been finalized.',
          });
        }
      }

      // If all payment attempts for this order definitively failed/expired, purge and allow fresh order!
      if (isAllFailed) {
        await db.purgeFailedPaymentCandidate({
          email: candidateEmail,
          orderId: activePendingOrder.orderId,
          reason: 'Previous payment attempt failed or expired during in-flight check',
        });
        // Candidate details purged from unconfirmed records, and candidate is now allowed to try again fresh!
      } else {
        // Payment is genuinely under process / stuck at bank side
        const orderTime = new Date(activePendingOrder.createdAt).getTime();
        const elapsedMins = Math.max(1, Math.round((Date.now() - orderTime) / 60000));

        return NextResponse.json(
          {
            error: `A payment transaction of ₹800 is already in process with your bank / Razorpay for this candidate (Order ID: ${activePendingOrder.orderId}, initiated ${elapsedMins} minute${elapsedMins > 1 ? 's' : ''} ago). To prevent accidental double payment, you cannot initiate another payment until this transaction is confirmed or rejected by the bank. If money was debited from your account, your application will be registered automatically without paying again. Please login with your registered email and password to check your payment status.`,
            paymentPending: true,
            orderId: activePendingOrder.orderId,
            status: activePendingOrder.status,
            elapsedMins,
          },
          { status: 409 }
        );
      }
    }

    // Create unique receipt tag for Razorpay
    const receiptId = `REC_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`.slice(0, 40);
    const customerId = cleanPhone ? `cust_${cleanPhone}` : `cust_${Date.now()}`;

    // Create official order on Razorpay with checkout amount (₹800)
    const rzpOrder = await createRazorpayOrder({
      amount: RAZORPAY_CONFIG.CHECKOUT_AMOUNT_PAISE, // 80000 paise = ₹800
      currency: RAZORPAY_CONFIG.CURRENCY,
      receipt: receiptId,
      notes: {
        candidateName: personalInfo.fullName.slice(0, 30),
        applyingClass: classApplying,
        studyLocation: studyPref.firstPreference,
      },
    });

    // Register or update candidate user record with their chosen password
    // This allows them to log in to their dashboard and view payment status if payment is stuck
    let passwordHash = '';
    if (password) {
      passwordHash = await hashPassword(password);
    } else {
      passwordHash = await hashPassword('Student@123');
    }

    const pendingUserId = await db.createOrUpdatePendingUser({
      name: personalInfo.fullName.trim(),
      email: candidateEmail,
      phone: cleanPhone,
      passwordHash,
    });

    // Store pending payment order record in MySQL with official application fee (₹800)
    await db.createPaymentOrderRecord({
      orderId: rzpOrder.id,
      amount: RAZORPAY_CONFIG.OFFICIAL_FEE_RUPEES,
      currency: RAZORPAY_CONFIG.CURRENCY,
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
          candidateMobile: cleanPhone,
        },
        parentInfo: {
          ...parentInfo,
          fatherPhone: cleanPhone,
          motherPhone: parentInfo?.motherPhone ? parentInfo.motherPhone.trim() : undefined,
        },
        addressInfo,
        studyLocationPref: studyPref,
        examCentrePref: studyPref,
        documents,
        password: password || undefined,
        authUserId: authUser?.userId,
        gateway: 'razorpay',
      },
    });

    return NextResponse.json({
      success: true,
      gateway: 'razorpay',
      orderId: rzpOrder.id,
      amount: rzpOrder.amount, // in paise
      currency: rzpOrder.currency,
      keyId: RAZORPAY_CONFIG.KEY_ID,
      candidateName: personalInfo.fullName,
      candidateEmail,
      candidatePhone: cleanPhone,
      description: `Entrance Exam Application Fee (2027-28) - ${personalInfo.fullName}`,
    });
  } catch (error: any) {
    console.error('Error initiating Razorpay payment order:', error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          'Failed to initialize Razorpay payment gateway session. Please try again.',
      },
      { status: 500 }
    );
  }
}
