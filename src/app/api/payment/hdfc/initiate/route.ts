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
  HDFC_CONFIG,
} from '@/lib/hdfc';

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

    // Strict Check: Candidate email and mobile MUST be unique across the entire system (enforced in all environments)
    if (candidateEmail) {
      const existingEmailUser = await db.findUserByEmail(candidateEmail);
      if (existingEmailUser && existingEmailUser.role !== 'admin') {
        return NextResponse.json(
          {
            error: `An official candidate account with email '${candidateEmail}' already exists. Please login to your dashboard instead of creating a duplicate registration.`,
          },
          { status: 409 }
        );
      }

      const existingEmailApp = await db.findApplicationByEmail(candidateEmail);
      if (existingEmailApp && existingEmailApp.paymentStatus === 'completed') {
        return NextResponse.json(
          {
            error: `An entrance application with email '${candidateEmail}' has already been submitted and confirmed (Registration ID: ${existingEmailApp.registrationNumber || existingEmailApp.applicationNumber}). Duplicate applications are strictly prohibited.`,
          },
          { status: 409 }
        );
      }
    }

    if (cleanPhone) {
      const existingPhoneUser = await db.findUserByPhone(cleanPhone);
      if (existingPhoneUser && existingPhoneUser.role !== 'admin') {
        return NextResponse.json(
          {
            error: `A candidate account with mobile +91-${cleanPhone} is already registered. Please login to your dashboard instead.`,
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
