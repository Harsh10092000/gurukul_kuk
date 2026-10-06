import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, signToken, getAuthCookieOptions } from '@/lib/auth';
import { sendNotification, ADMIN_NOTIFICATION_EMAIL } from '@/lib/notifications';
import { getExamDetailsForGender } from '@/lib/validations';
import { fetchHdfcOrderStatus, HDFC_CONFIG, getPublicBaseUrl } from '@/lib/hdfc';

export const dynamic = 'force-dynamic';

/**
 * Helper to extract order_id and any posted body
 */
async function extractOrderParams(request: Request): Promise<{ orderId: string | null; body: any }> {
  const url = new URL(request.url);
  let orderId = url.searchParams.get('order_id') || url.searchParams.get('orderId');
  let body: any = {};

  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const formOrderId = formData.get('order_id') || formData.get('orderId');
        if (formOrderId && typeof formOrderId === 'string') {
          orderId = formOrderId;
        }
        formData.forEach((val, key) => {
          body[key] = val;
        });
      } else if (contentType.includes('application/json')) {
        const json = await request.json();
        body = json;
        if (json.order_id || json.orderId) {
          orderId = json.order_id || json.orderId;
        }
      }
    } catch (e) {
      console.warn('Could not parse POST body in HDFC return handler:', e);
    }
  }

  return { orderId, body };
}

/**
 * Core handler for processing return from HDFC Hosted Payment Page
 */
async function handleHdfcReturn(request: Request) {
  const baseUrl = getPublicBaseUrl(request);
  const { orderId, body } = await extractOrderParams(request);

  if (!orderId) {
    console.error('HDFC Return: Missing order_id in return callback');
    return NextResponse.redirect(new URL('/apply?payment=error&msg=Missing+Order+Identifier', baseUrl), 303);
  }

  const urlObj = new URL(request.url);
  const isDummy = urlObj.searchParams.get('dummy') === 'true';

  // 1. Fetch internal payment order record
  let paymentOrder = await db.getPaymentOrderByOrderId(orderId);

  // If order was cancelled / aborted by user on gateway, handle immediately
  const rawStatus = (body?.status || urlObj.searchParams.get('status') || urlObj.searchParams.get('payment') || '').toUpperCase();
  if (rawStatus === 'USER_ABORTED' || rawStatus === 'CANCELLED') {
    if (paymentOrder) {
      await db.updatePaymentOrderRecord(orderId, { status: 'CANCELLED', paymentResponse: body });
    }
    return NextResponse.redirect(
      new URL(
        `/apply?payment=cancelled&orderId=${encodeURIComponent(orderId)}&msg=Payment+session+was+cancelled.+All+your+application+particulars+are+safely+preserved+below;+click+Pay+to+retry.`,
        baseUrl
      ),
      303
    );
  }

  // If order record is missing (e.g. disk permission issue or server restart), recover from HDFC status API
  if (!paymentOrder) {
    console.warn(`HDFC Return: Order ${orderId} not found in database, fetching directly from HDFC status API...`);
    try {
      const liveStatus = await fetchHdfcOrderStatus(orderId);
      const liveStatusUpper = (liveStatus?.status || '').toUpperCase();

      if (liveStatusUpper === 'USER_ABORTED' || liveStatusUpper === 'CANCELLED') {
        return NextResponse.redirect(
          new URL(
            `/apply?payment=cancelled&orderId=${encodeURIComponent(orderId)}&msg=Payment+was+cancelled+at+the+gateway.+All+your+application+particulars+are+safely+preserved+below;+click+Pay+to+retry.`,
            baseUrl
          ),
          303
        );
      }

      if (liveStatus) {
        // Recover a stub record so we can track this order.
        // IMPORTANT: applicationPayload will be empty here — the actual form data
        // was stored on a different serverless container that has since shut down.
        // We set status to CHARGED_PENDING_REGISTRATION so the webhook/admin can
        // manually process it, and redirect the candidate to a payment-received page.
        paymentOrder = await db.createPaymentOrderRecord({
          orderId,
          amount: liveStatus.amount || HDFC_CONFIG.FEE_AMOUNT,
          currency: liveStatus.currency || 'INR',
          status: liveStatusUpper || 'PENDING',
          customerEmail: liveStatus.customer_email || body?.customer_email || null,
          customerPhone: liveStatus.customer_phone || body?.customer_phone || null,
          customerId: liveStatus.customer_id || null,
          applicationPayload: {},  // Form data unavailable — lost across serverless containers
          paymentResponse: liveStatus,
        });

        // If payment is confirmed CHARGED but we have no application data,
        // we cannot complete registration silently with empty data.
        // Redirect to a special recovery page informing the candidate.
        if (liveStatusUpper === 'CHARGED') {
          const txnIdRecovered = liveStatus.txn_id || liveStatus.transaction_id || `TXN_${orderId}`;
          console.error(
            `HDFC Return CRITICAL: Payment CHARGED for ${orderId} but applicationPayload is unavailable. ` +
            `Candidate must contact admin. TxnId: ${txnIdRecovered}`
          );
          return NextResponse.redirect(
            new URL(
              `/apply?payment=pending&orderId=${encodeURIComponent(orderId)}&txnId=${encodeURIComponent(txnIdRecovered)}&msg=Your+payment+was+received+successfully.+However+your+registration+session+expired+during+payment.+Please+contact+our+helpdesk+at+%2B91+7027849858+with+your+Order+ID+%28${encodeURIComponent(orderId)}%29+to+complete+registration.`,
              baseUrl
            ),
            303
          );
        }
      }
    } catch (err: any) {
      console.warn(`HDFC Return: Could not recover order ${orderId} from HDFC API:`, err?.message);
    }
  }

  if (!paymentOrder) {
    console.error(`HDFC Return: Order ${orderId} not found in database and could not be fetched from HDFC`);
    return NextResponse.redirect(
      new URL(`/apply?payment=cancelled&orderId=${encodeURIComponent(orderId)}&msg=Payment+session+expired+or+was+cancelled.+All+your+application+particulars+are+safely+preserved+below;+click+Pay+to+retry.`, baseUrl),
      303
    );
  }

  // 2. Prevent duplicate processing ONLY if registration was fully completed.
  // If status is CHARGED but registrationNumber is missing, it means the order was
  // recovered from HDFC API (serverless container swap) but user/application creation
  // was never completed — fall through to complete registration below.
  if (paymentOrder.status === 'CHARGED' && paymentOrder.registrationNumber) {
    const regNo = paymentOrder.registrationNumber;
    const txnId =
      paymentOrder.paymentResponse?.txn_id ||
      paymentOrder.paymentResponse?.transaction_id ||
      `TXN_${orderId.replace(/^GUR_/, '')}`;
    return NextResponse.redirect(
      new URL(
        `/payment/thank-you?orderId=${encodeURIComponent(orderId)}&regNo=${encodeURIComponent(regNo)}&txnId=${encodeURIComponent(txnId)}`,
        baseUrl
      ),
      303
    );
  }

  // 3. Perform server-to-server HDFC Order Status API call (MANDATORY - Never trust browser redirect)
  let statusResponse: any;
  if (isDummy && HDFC_CONFIG.PAYMENT_MODE === 'demo') {
    // Interactive test gateway submission
    statusResponse = {
      order_id: orderId,
      status: 'CHARGED',
      amount: paymentOrder.amount || HDFC_CONFIG.FEE_AMOUNT,
      txn_id: `TXN_${Date.now()}`,
      payment_method: 'UPI',
      payment_method_type: 'UPI',
    };
  } else {
    try {
      statusResponse = await fetchHdfcOrderStatus(orderId);
    } catch (apiErr: any) {
      console.error(`HDFC Return: Failed server-to-server status check for ${orderId}:`, apiErr);
      return NextResponse.redirect(
        new URL(`/apply?payment=pending&orderId=${orderId}&msg=Verifying+payment+status.+Please+check+back+shortly.`, baseUrl),
        303
      );
    }
  }

  // 4. Verify order ID and transaction amount server-side
  const returnedOrderId = statusResponse.order_id;
  const returnedAmount = parseFloat(String(statusResponse.amount));
  const expectedAmount = paymentOrder.amount || HDFC_CONFIG.FEE_AMOUNT; // ₹800

  if (returnedOrderId !== orderId) {
    console.error(`HDFC Return: Order ID mismatch: returned ${returnedOrderId}, expected ${orderId}`);
    return NextResponse.redirect(
      new URL('/apply?payment=error&msg=Transaction+verification+failed+due+to+order+mismatch', baseUrl),
      303
    );
  }

  const isDemo = HDFC_CONFIG.PAYMENT_MODE === 'demo';
  const amountValid = isDemo
    ? (Math.abs(returnedAmount - expectedAmount) <= 0.01 || Math.abs(returnedAmount - 1) <= 0.01)
    : Math.abs(returnedAmount - expectedAmount) <= 0.01;

  if (!amountValid) {
    console.error(`HDFC Return: Amount mismatch: returned ${returnedAmount}, expected ${expectedAmount}`);
    return NextResponse.redirect(
      new URL('/apply?payment=error&msg=Transaction+verification+failed+due+to+amount+discrepancy', baseUrl),
      303
    );
  }

  const orderStatus = (statusResponse.status || '').toUpperCase();
  const rawStatusId = statusResponse.status_id;
  const paymentMethod = (statusResponse.payment_method || '').toUpperCase();
  const paymentMethodType = (statusResponse.payment_method_type || '').toUpperCase();
  const txnId = statusResponse.txn_id || statusResponse.transaction_id || `TXN_${orderId}`;

  // Check if candidate explicitly clicked Cancel on HDFC gateway
  const isExplicitCancel =
    orderStatus === 'USER_ABORTED' ||
    orderStatus === 'CANCELLED' ||
    rawStatusId === 27 ||
    body?.status === 'USER_ABORTED' ||
    body?.status === 'CANCELLED' ||
    urlObj.searchParams.get('status') === 'USER_ABORTED' ||
    urlObj.searchParams.get('status') === 'CANCELLED' ||
    urlObj.searchParams.get('payment') === 'cancelled';

  if (isExplicitCancel) {
    await db.updatePaymentOrderRecord(orderId, {
      status: 'CANCELLED',
      paymentResponse: statusResponse,
    });
    return NextResponse.redirect(
      new URL(
        `/apply?payment=cancelled&orderId=${orderId}&msg=Payment+was+cancelled.+All+your+application+details+are+safely+preserved+below;+click+Submit+to+retry.`,
        baseUrl
      ),
      303
    );
  }

  // Determine if payment is successfully completed:
  // Strictly verify CHARGED or SUCCESS from HDFC bank.
  // Incomplete states (e.g. AUTHORIZING, PENDING) MUST NOT be auto-redirected as success.
  const isSuccess = orderStatus === 'CHARGED' || orderStatus === 'SUCCESS';

  // 5. Handle Payment Statuses
  if (isSuccess) {
    // Payment verified successfully! Finalize official registration
    const payload = paymentOrder.applicationPayload;
    if (!payload || !payload.personalInfo) {
      console.error(`HDFC Return: Missing or incomplete application payload for order ${orderId}`);
      await db.updatePaymentOrderRecord(orderId, {
        status: 'CHARGED',
        paymentResponse: statusResponse,
      });
      return NextResponse.redirect(
        new URL(
          `/apply?payment=pending&orderId=${encodeURIComponent(orderId)}&txnId=${encodeURIComponent(txnId)}&msg=Payment+was+received+successfully+but+application+details+are+pending.+Please+contact+admissions+helpline.`,
          baseUrl
        ),
        303
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
      authUserId,
    } = payload;

    const gender = (personalInfo?.gender || 'Male') as 'Male' | 'Female';

    // Prepare credentials
    const candidateEmail = (personalInfo?.candidateEmail || paymentOrder.customerEmail || '').trim().toLowerCase();
    const candidateMobile = (personalInfo?.candidateMobile || paymentOrder.customerPhone || '').trim();
    const cleanPhone = candidateMobile.replace(/\D/g, '').slice(-10);

    // Check if an official application already exists for this email
    const existingAppByEmail = await db.findApplicationByEmail(candidateEmail);
    if (existingAppByEmail && existingAppByEmail.paymentStatus === 'completed') {
      const regId = existingAppByEmail.registrationNumber || existingAppByEmail.applicationNumber;
      console.log(`[HDFC Return] Application already exists for email ${candidateEmail}: RegNo ${regId}`);
      await db.updatePaymentOrderRecord(orderId, {
        status: 'CHARGED',
        applicationId: existingAppByEmail.id,
        registrationNumber: regId,
        paymentResponse: statusResponse,
      });

      const existingUser = await db.findUserByEmail(candidateEmail);
      if (existingUser) {
        const token = signToken({
          userId: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        });
        const redirectUrl = new URL(
          `/payment/thank-you?orderId=${encodeURIComponent(orderId)}&regNo=${encodeURIComponent(regId)}&txnId=${encodeURIComponent(txnId)}`,
          baseUrl
        );
        const response = NextResponse.redirect(redirectUrl, 303);
        const cookieOptions = getAuthCookieOptions();
        response.cookies.set(cookieOptions.name, token, cookieOptions);
        return response;
      }
    }

    // Atomically Generate Registration ID & Roll Number
    const registrationId = await db.getNextRegistrationNumber(gender);
    const assignedRollNo = await db.getNextRollNumber(classApplying, gender, stream || payload.academicInfo?.stream);

    let passwordHash = '';
    if (password) {
      passwordHash = await hashPassword(password);
    } else {
      passwordHash = await hashPassword('Student@123');
    }

    // Create official user account if not already existing
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

    // Create official application record
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
      status: 'submitted',
      paymentStatus: 'completed',
      amountPaid: 800,
      transactionId: txnId,
    });

    // Create Admit Card Record
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

    // Clean up temporary session if needed
    if (authUserId && authUserId.startsWith('temp_')) {
      await db.deleteTempApplication(authUserId);
    }

    // Dispatch Confirmation Email & Receipt to Candidate
    const receiptNo = 'REC-HDFC-' + Math.floor(100000 + Math.random() * 900000);
    const paymentTimestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

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

      await sendNotification({
        to: candidateEmail,
        name: personalInfo.fullName,
        type: 'FEE_PAYMENT_RECEIPT',
        data: {
          registrationNumber: registrationId,
          applicationNumber: registrationId,
          receiptNumber: receiptNo,
          transactionId: txnId,
          amount: 800,
          classApplying: newApplication.classApplying,
          candidateEmail,
          candidateMobile,
          paymentDate: paymentTimestamp,
        },
      });
    } catch (mailErr) {
      console.warn('Candidate confirmation notification dispatch error:', mailErr);
    }

    // Dispatch Admin Notification
    try {
      const fullAddress = [
        addressInfo?.streetAddress,
        addressInfo?.city,
        addressInfo?.district,
        addressInfo?.state,
        addressInfo?.pincode ? `PIN: ${addressInfo.pincode}` : '',
      ].filter(Boolean).join(', ') || addressInfo?.city || studyLocationPref?.firstPreference || 'Not provided';

      const prevSchool = personalInfo?.previousSchoolName
        ? `${personalInfo.previousSchoolName}${personalInfo.previousBoard ? ` (${personalInfo.previousBoard})` : ''}`
        : (personalInfo?.previousBoard || 'N/A');

      const prevMarks = personalInfo?.previousMarks || personalInfo?.previousPercentage || personalInfo?.previousClassMarksPercentage || (personalInfo?.previousBoard ? `Board: ${personalInfo.previousBoard}` : 'N/A');

      await sendNotification({
        to: ADMIN_NOTIFICATION_EMAIL,
        name: 'Admissions Desk',
        type: 'ADMIN_NEW_REGISTRATION_ALERT',
        data: {
          registrationNumber: registrationId,
          applicationNumber: registrationId,
          receiptNumber: receiptNo,
          fullName: personalInfo.fullName,
          classApplying: newApplication.classApplying,
          candidateEmail,
          candidateMobile,
          fatherName: parentInfo?.fatherName || 'N/A',
          fatherPhone: parentInfo?.fatherPhone || 'N/A',
          motherName: parentInfo?.motherName || 'N/A',
          dob: personalInfo.dob || 'N/A',
          gender,
          category: personalInfo.category || 'General',
          aadhaarNumber: personalInfo?.aadhaarNumber ? `XXXXXXXX${personalInfo.aadhaarNumber.slice(-4)}` : 'N/A',
          address: fullAddress,
          studyLocation: studyLocationPref?.firstPreference || 'Gurukul Nilokheri',
          previousSchool: prevSchool,
          previousMarks: prevMarks,
          amountPaid: 800,
          transactionId: txnId,
          registrationTime: paymentTimestamp,
        },
      });

      await db.createAdminNotification({
        type: 'APPLICATION_SUBMITTED',
        title: `New HDFC Paid Candidate: ${personalInfo.fullName} (${registrationId})`,
        message: `${personalInfo.fullName} completed registration and paid fee ₹800 via HDFC SmartGateway. Study Location: ${studyLocationPref?.firstPreference}.`,
        entityId: newApplication.id,
        entityType: 'application',
        link: `/admin/applications/${newApplication.id}`,
        metadata: {
          applicationId: newApplication.id,
          candidateName: personalInfo.fullName,
          registrationNumber: registrationId,
          classApplying: newApplication.classApplying,
          email: candidateEmail,
          phone: candidateMobile,
          transactionId: txnId,
        },
      });
    } catch (adminErr) {
      console.warn('Admin notification dispatch error:', adminErr);
    }

    // Update payment order record
    await db.updatePaymentOrderRecord(orderId, {
      status: 'CHARGED',
      applicationId: newApplication.id,
      registrationNumber: registrationId,
      paymentResponse: statusResponse,
    });

    // Sign authentication JWT token for official user
    const token = signToken({
      userId: officialUser.id,
      name: officialUser.name,
      email: officialUser.email,
      role: officialUser.role,
    });

    const redirectUrl = new URL(
      `/payment/thank-you?orderId=${encodeURIComponent(orderId)}&regNo=${encodeURIComponent(registrationId)}&txnId=${encodeURIComponent(txnId)}`,
      baseUrl
    );
    const response = NextResponse.redirect(redirectUrl, 303);

    const cookieOptions = getAuthCookieOptions();
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  }

  if (orderStatus === 'AUTHORIZING' || orderStatus === 'PENDING' || orderStatus === 'PENDING_VBV') {
    return NextResponse.redirect(
      new URL(
        `/apply?payment=pending&orderId=${orderId}&msg=Payment+authorization+is+pending+with+your+bank.+If+the+amount+was+debited,+your+application+will+be+updated+automatically+once+confirmed.`,
        baseUrl
      ),
      303
    );
  }

  if (orderStatus === 'AUTHORIZATION_FAILED' || orderStatus === 'AUTHORIZATION_FAILURE') {
    await db.updatePaymentOrderRecord(orderId, {
      status: 'AUTHORIZATION_FAILED',
      paymentResponse: statusResponse,
    });
    return NextResponse.redirect(
      new URL(
        `/apply?payment=failed&orderId=${orderId}&msg=Payment+authorization+failed+by+bank.+All+details+are+safely+preserved;+please+try+again.`,
        baseUrl
      ),
      303
    );
  }

  if (orderStatus === 'AUTHENTICATION_FAILED' || orderStatus === 'AUTHENTICATION_FAILURE') {
    await db.updatePaymentOrderRecord(orderId, {
      status: 'AUTHENTICATION_FAILED',
      paymentResponse: statusResponse,
    });
    return NextResponse.redirect(
      new URL(
        `/apply?payment=failed&orderId=${orderId}&msg=Payment+authentication+failed+or+was+cancelled.+All+details+are+safely+preserved;+please+try+again.`,
        baseUrl
      ),
      303
    );
  }

  // Any other unfinished / cancelled status (safe cancellation flow)
  await db.updatePaymentOrderRecord(orderId, {
    status: 'CANCELLED',
    paymentResponse: statusResponse,
  });
  return NextResponse.redirect(
    new URL(
      `/apply?payment=cancelled&orderId=${orderId}&msg=Payment+session+was+cancelled.+All+your+application+details+are+safely+preserved+below;+click+Submit+to+retry.`,
      baseUrl
    ),
    303
  );
}

export async function GET(request: Request) {
  return handleHdfcReturn(request);
}

export async function POST(request: Request) {
  return handleHdfcReturn(request);
}
