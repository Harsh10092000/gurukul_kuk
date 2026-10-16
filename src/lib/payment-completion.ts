import { db, toMySqlDatetime, getDbPool, isUsingFallbackStorage } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendNotification, ADMIN_NOTIFICATION_EMAIL } from '@/lib/notifications';
import { getExamDetailsForGender } from '@/lib/validations';
import { recordAuditLog } from '@/lib/audit';

export interface CompletePaymentParams {
  orderId: string;
  paymentId: string;
  gateway?: string;
  signature?: string;
  rawPaymentResponse?: any;
}

export interface CompletePaymentResult {
  success: boolean;
  alreadyProcessed?: boolean;
  orderId: string;
  paymentId?: string;
  registrationNumber?: string;
  rollNumber?: string;
  applicationId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  redirectUrl?: string;
  error?: string;
}

/**
 * Centrally and atomically processes a successful payment and guarantees complete
 * institutional student registration across all entry points:
 * 1. Razorpay client verification callback
 * 2. Razorpay server-side webhook
 * 3. Pending payment reconciliation / recovery
 */
export async function completePaymentAndRegistration(
  params: CompletePaymentParams
): Promise<CompletePaymentResult> {
  const { orderId, paymentId, gateway = 'razorpay', signature, rawPaymentResponse } = params;

  if (!orderId) {
    return { success: false, orderId: '', error: 'Missing order ID for payment completion.' };
  }

  // 1. Fetch internal payment order record
  const paymentOrder = await db.getPaymentOrderByOrderId(orderId);
  if (!paymentOrder) {
    console.error(`[PaymentCompletion] Order ${orderId} not found in database.`);
    return { success: false, orderId, error: 'Payment order record not found in institutional database.' };
  }

  // 2. Idempotency check: if order was already completed and charged
  if (paymentOrder.status === 'CHARGED' && paymentOrder.registrationNumber) {
    const candidateEmail = (paymentOrder.customerEmail || paymentOrder.applicationPayload?.personalInfo?.candidateEmail || '').trim().toLowerCase();
    const existingUser = candidateEmail ? await db.findUserByEmail(candidateEmail) : null;

    let resolvedRollNo = '';
    if (paymentOrder.applicationId) {
      const app = await db.getApplicationById(paymentOrder.applicationId);
      resolvedRollNo = app?.rollNumber || '';
    }
    if (!resolvedRollNo && paymentOrder.registrationNumber) {
      const admitCards = await db.getAdmitCards();
      const ac = admitCards.find(c => c.applicationNumber === paymentOrder.registrationNumber || c.applicationId === paymentOrder.applicationId);
      resolvedRollNo = ac?.rollNumber || '';
    }

    return {
      success: true,
      alreadyProcessed: true,
      orderId,
      paymentId: paymentId || (paymentOrder.paymentResponse as any)?.razorpay_payment_id || '',
      registrationNumber: paymentOrder.registrationNumber,
      rollNumber: resolvedRollNo,
      applicationId: paymentOrder.applicationId,
      user: existingUser ? {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
      } : undefined,
      redirectUrl: `/payment/thank-you?orderId=${encodeURIComponent(orderId)}&regNo=${encodeURIComponent(paymentOrder.registrationNumber)}&txnId=${encodeURIComponent(paymentId || '')}`,
    };
  }

  // 3. Extract and validate application payload
  const payload = paymentOrder.applicationPayload;
  if (!payload || !payload.personalInfo) {
    console.error(`[PaymentCompletion] Missing application payload for order ${orderId}`);
    return {
      success: false,
      orderId,
      error: 'Application payload is missing from payment record. Please contact admission helpline.',
    };
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
  const candidateMobile = (parentInfo?.fatherPhone || personalInfo?.candidateMobile || paymentOrder.customerPhone || '').trim();
  const cleanPhone = candidateMobile.replace(/\D/g, '').slice(-10);

  // 4. Check if an official application already exists for this candidate (by Email OR Aadhaar Number)
  let existingCompletedApp: any = null;
  if (candidateEmail) {
    const appByEmail = await db.findApplicationByEmail(candidateEmail);
    if (appByEmail && appByEmail.paymentStatus === 'completed') {
      existingCompletedApp = appByEmail;
    }
  }
  if (!existingCompletedApp && personalInfo?.aadhaarNumber) {
    const appByAadhaar = await db.findApplicationByAadhaar(personalInfo.aadhaarNumber);
    if (appByAadhaar && appByAadhaar.paymentStatus === 'completed') {
      existingCompletedApp = appByAadhaar;
    }
  }

  if (existingCompletedApp) {
    const regId = existingCompletedApp.registrationNumber || existingCompletedApp.applicationNumber;
    
    let rollNo = existingCompletedApp.rollNumber;
    if (!rollNo) {
      const admitCards = await db.getAdmitCards();
      const ac = admitCards.find(c => c.applicationId === existingCompletedApp.id || c.applicationNumber === regId);
      if (ac?.rollNumber) {
        rollNo = ac.rollNumber;
      } else {
        rollNo = await db.getNextRollNumber(
          existingCompletedApp.classApplying || classApplying,
          gender,
          existingCompletedApp.stream || stream
        );
      }
      await db.updateApplication(existingCompletedApp.id, { rollNumber: rollNo });
    }

    // Flag if this is a double/duplicate payment for an already completed application
    const isDoublePayment = existingCompletedApp.transactionId && existingCompletedApp.transactionId !== paymentId;
    
    await db.updatePaymentOrderRecord(orderId, {
      status: 'CHARGED',
      applicationId: existingCompletedApp.id,
      registrationNumber: regId,
      paymentResponse: {
        ...(typeof rawPaymentResponse === 'object' ? rawPaymentResponse : {}),
        gateway,
        paymentId,
        orderId,
        signature: signature || '',
        verifiedAt: new Date().toISOString(),
        isDuplicatePayment: isDoublePayment,
        duplicateNote: isDoublePayment ? `Duplicate payment of ₹800 received for existing registration ${regId}. Original transaction: ${existingCompletedApp.transactionId}` : undefined,
      },
    });

    const existingUser = candidateEmail ? await db.findUserByEmail(candidateEmail) : await db.getUserById(existingCompletedApp.userId);
    return {
      success: true,
      alreadyProcessed: true,
      orderId,
      paymentId,
      registrationNumber: regId,
      rollNumber: rollNo,
      applicationId: existingCompletedApp.id,
      user: existingUser ? {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
      } : undefined,
      redirectUrl: `/payment/thank-you?orderId=${encodeURIComponent(orderId)}&regNo=${encodeURIComponent(regId)}&txnId=${encodeURIComponent(paymentId)}`,
    };
  }

  // Prepare password hash
  let passwordHash = '';
  if (password) {
    passwordHash = await hashPassword(password);
  } else {
    passwordHash = await hashPassword('Student@123');
  }

  const paymentResponseData = rawPaymentResponse || {
    gateway,
    razorpay_payment_id: paymentId,
    razorpay_order_id: orderId,
    razorpay_signature: signature || '',
    verifiedAt: new Date().toISOString(),
  };

  const pool = await getDbPool();
  const useFallback = isUsingFallbackStorage() || !pool;

  let finalRegNo = '';
  let finalRollNo = '';
  let finalAppId = '';
  let officialUserId = '';
  let officialUserName = personalInfo.fullName.trim();
  let officialUserRole = 'applicant';

  if (!useFallback && pool) {
    // 5. ATOMIC MYSQL TRANSACTION
    const conn = await pool.getConnection();
    try {
      // Set order status to PROCESSING to prevent concurrent verification collisions
      await conn.query("UPDATE payment_orders SET status = 'PROCESSING' WHERE order_id = ? AND status != 'CHARGED'", [orderId]);

      await conn.beginTransaction();

      // Step A: Generate Registration & Roll Numbers
      finalRegNo = await db.getNextRegistrationNumber(gender);
      finalRollNo = await db.getNextRollNumber(
        classApplying,
        gender,
        stream || payload.academicInfo?.stream
      );

      // Step B: User Account (Find or Create Idempotently)
      const [userRows]: any = await conn.query('SELECT id, name, role, registration_number FROM users WHERE email = ? LIMIT 1', [candidateEmail]);
      if (userRows && userRows.length > 0) {
        officialUserId = userRows[0].id;
        officialUserName = userRows[0].name || officialUserName;
        officialUserRole = userRows[0].role || 'applicant';
        if (userRows[0].registration_number) {
          finalRegNo = userRows[0].registration_number;
        }
      } else {
        officialUserId = 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        await conn.query(
          `INSERT INTO users (id, name, email, phone, password_hash, role, registration_number, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone)`,
          [
            officialUserId,
            officialUserName,
            candidateEmail,
            cleanPhone,
            passwordHash,
            'applicant',
            finalRegNo,
            toMySqlDatetime(),
          ]
        );

        // Re-read to guarantee exact ID in case of concurrent insert
        const [refetchUser]: any = await conn.query('SELECT id, name, role FROM users WHERE email = ? LIMIT 1', [candidateEmail]);
        if (refetchUser && refetchUser.length > 0) {
          officialUserId = refetchUser[0].id;
          officialUserName = refetchUser[0].name || officialUserName;
          officialUserRole = refetchUser[0].role || 'applicant';
        }
      }

      // Step C: Application Record
      const [existingAppRows]: any = await conn.query(
        'SELECT id, application_number, roll_number FROM applications WHERE user_id = ? OR application_number = ? LIMIT 1',
        [officialUserId, finalRegNo]
      );

      const targetClass = classApplying.replace(/^Class\s*/i, 'Class ');
      const studyLoc = studyLocationPref || { firstPreference: 'The Gurukul Nilokheri' };

      if (existingAppRows && existingAppRows.length > 0) {
        finalAppId = existingAppRows[0].id;
        if (existingAppRows[0].application_number && !existingAppRows[0].application_number.startsWith('DRAFT-')) {
          finalRegNo = existingAppRows[0].application_number;
        }
        if (existingAppRows[0].roll_number) {
          finalRollNo = existingAppRows[0].roll_number;
        }

        await conn.query(
          `UPDATE applications SET
            application_number = ?, roll_number = ?, class_applying = ?, personal_info = ?, parent_info = ?,
            address_info = ?, academic_info = ?, exam_centre_pref = ?, documents = ?,
            status = 'approved', payment_status = 'completed', amount_paid = 800.00,
            transaction_id = ?, updated_at = ?
           WHERE id = ?`,
          [
            finalRegNo,
            finalRollNo,
            targetClass,
            JSON.stringify({ ...personalInfo, candidateEmail, candidateMobile: cleanPhone, whatsappNumber: addressInfo?.whatsappNumber || cleanPhone }),
            JSON.stringify({ ...parentInfo, fatherPhone: cleanPhone, motherPhone: parentInfo?.motherPhone ? parentInfo.motherPhone.trim() : undefined }),
            JSON.stringify(addressInfo || {}),
            JSON.stringify({
              applyingClass: classApplying,
              stream: classApplying.includes('11') ? stream : undefined,
              previousSchoolName: personalInfo.previousSchoolName,
              previousBoard: personalInfo.previousBoard,
              otherBoard: personalInfo.otherBoard,
            }),
            JSON.stringify(studyLoc),
            JSON.stringify(documents || {}),
            paymentId,
            toMySqlDatetime(),
            finalAppId,
          ]
        );
      } else {
        finalAppId = 'app-' + Date.now();
        await conn.query(
          `INSERT INTO applications (
            id, application_number, roll_number, user_id, class_applying, 
            personal_info, parent_info, address_info, academic_info, 
            exam_centre_pref, documents, status, remarks, 
            payment_status, amount_paid, transaction_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            roll_number = VALUES(roll_number),
            status = 'approved',
            payment_status = 'completed',
            amount_paid = 800.00,
            transaction_id = VALUES(transaction_id),
            updated_at = VALUES(updated_at)`,
          [
            finalAppId,
            finalRegNo,
            finalRollNo,
            officialUserId,
            targetClass,
            JSON.stringify({ ...personalInfo, candidateEmail, candidateMobile: cleanPhone, whatsappNumber: addressInfo?.whatsappNumber || cleanPhone }),
            JSON.stringify({ ...parentInfo, fatherPhone: cleanPhone, motherPhone: parentInfo?.motherPhone ? parentInfo.motherPhone.trim() : undefined }),
            JSON.stringify(addressInfo || {}),
            JSON.stringify({
              applyingClass: classApplying,
              stream: classApplying.includes('11') ? stream : undefined,
              previousSchoolName: personalInfo.previousSchoolName,
              previousBoard: personalInfo.previousBoard,
              otherBoard: personalInfo.otherBoard,
            }),
            JSON.stringify(studyLoc),
            JSON.stringify(documents || {}),
            'approved',
            null,
            'completed',
            800.00,
            paymentId,
            toMySqlDatetime(),
            toMySqlDatetime(),
          ]
        );
      }

      // Step D: Admit Card
      const settings = await db.getSettings();
      const examDetails = getExamDetailsForGender(gender, finalRegNo);
      const isFemale = gender === 'Female';
      const rawSeq = parseInt(finalRollNo.slice(4), 10) || 1;
      const candidateIndex = isFemale ? (rawSeq > 5000 ? rawSeq - 5000 : rawSeq) : rawSeq;
      const indexForSeating = (candidateIndex % 1000) || candidateIndex;
      const hallNumber = Math.ceil(indexForSeating / 30);
      const deskNumber = ((indexForSeating - 1) % 30) + 1;
      const admitCardId = 'admit-' + finalAppId;

      const instructionsJson = JSON.stringify([
        'Bring a printed clear copy of this Admit Card along with your original Aadhaar Card.',
        'Candidates must report to their allotted examination centre at least 45 minutes before exam start time.',
        'Calculators, smart devices, watches, and mobile phones are strictly prohibited in the exam hall.',
        'Only Blue or Black ballpoint pens are permitted for marking answers.',
      ]);

      await conn.query(
        `INSERT INTO admit_cards (
          id, application_id, application_number, roll_number, candidate_name, father_name, class_applying,
          exam_centre_name, exam_centre_address, exam_date, reporting_time, exam_duration, room_number,
          candidate_photo_url, candidate_signature_url, is_released, instructions, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          roll_number = VALUES(roll_number),
          candidate_name = VALUES(candidate_name),
          father_name = VALUES(father_name),
          class_applying = VALUES(class_applying),
          exam_centre_name = VALUES(exam_centre_name),
          exam_centre_address = VALUES(exam_centre_address),
          exam_date = VALUES(exam_date),
          reporting_time = VALUES(reporting_time),
          exam_duration = VALUES(exam_duration),
          room_number = VALUES(room_number),
          candidate_photo_url = VALUES(candidate_photo_url),
          candidate_signature_url = VALUES(candidate_signature_url)`,
        [
          admitCardId,
          finalAppId,
          finalRegNo,
          finalRollNo,
          personalInfo.fullName.trim(),
          parentInfo?.fatherName?.trim() || '',
          targetClass,
          examDetails.examCentreName,
          examDetails.examCentreAddress,
          examDetails.examDate,
          examDetails.reportingTime,
          examDetails.examDuration,
          `Hall-${hallNumber}, Desk ${deskNumber}`,
          documents?.passportPhoto || documents?.photo || '/logo-gurukul.png',
          documents?.candidateSignature || documents?.signature || null,
          Boolean(settings.admitCardsReleased) ? 1 : 0,
          instructionsJson,
          toMySqlDatetime(),
        ]
      );

      // Step E: Update Payment Order to CHARGED
      await conn.query(
        `UPDATE payment_orders SET 
          status = 'CHARGED',
          application_id = ?,
          registration_number = ?,
          payment_response = ?,
          updated_at = ?
         WHERE order_id = ?`,
        [
          finalAppId,
          finalRegNo,
          JSON.stringify(paymentResponseData),
          toMySqlDatetime(),
          orderId,
        ]
      );

      // Step F: Sync registration_number to user record
      await conn.query(
        'UPDATE users SET registration_number = ? WHERE id = ? AND (registration_number IS NULL OR registration_number = "")',
        [finalRegNo, officialUserId]
      );

      await conn.commit();
      console.log(`[PaymentCompletion] Successfully registered student ${finalRegNo} (Roll ${finalRollNo}) for order ${orderId} in MySQL.`);
    } catch (txErr: any) {
      await conn.rollback();
      // On failure, revert order status from PROCESSING back to PENDING so retry can succeed
      try {
        await pool.query("UPDATE payment_orders SET status = 'PENDING' WHERE order_id = ? AND status = 'PROCESSING'", [orderId]);
      } catch {}
      console.error(`[PaymentCompletion Error] Rolled back transaction for order ${orderId}:`, txErr);
      throw txErr;
    } finally {
      conn.release();
    }
  } else {
    // 6. JSON FALLBACK STORE EXECUTION
    finalRegNo = await db.getNextRegistrationNumber(gender);
    finalRollNo = await db.getNextRollNumber(classApplying, gender, stream || payload.academicInfo?.stream);

    let officialUser = await db.findUserByEmail(candidateEmail);
    if (!officialUser) {
      officialUser = await db.createUser({
        name: personalInfo.fullName.trim(),
        email: candidateEmail,
        phone: cleanPhone,
        role: 'applicant',
        passwordHash,
        registrationNumber: finalRegNo,
      });
    }

    officialUserId = officialUser.id;
    officialUserName = officialUser.name;
    officialUserRole = officialUser.role;

    const newApp = await db.createApplication({
      userId: officialUser.id,
      registrationNumber: finalRegNo,
      rollNumber: finalRollNo,
      classApplying: classApplying.replace(/^Class\s*/i, 'Class '),
      stream: classApplying.includes('11') ? stream : undefined,
      personalInfo: {
        ...personalInfo,
        candidateEmail,
        candidateMobile: cleanPhone,
        whatsappNumber: addressInfo?.whatsappNumber || cleanPhone,
      },
      parentInfo: {
        ...parentInfo,
        fatherPhone: cleanPhone,
        motherPhone: parentInfo?.motherPhone ? parentInfo.motherPhone.trim() : undefined,
      },
      addressInfo,
      academicInfo: {
        applyingClass: classApplying,
        stream: classApplying.includes('11') ? stream : undefined,
        previousSchoolName: personalInfo.previousSchoolName,
        previousBoard: personalInfo.previousBoard,
        otherBoard: personalInfo.otherBoard,
      },
      studyLocationPref,
      examCentrePref: studyLocationPref,
      documents: documents || {},
      status: 'approved',
      paymentStatus: 'completed',
      amountPaid: 800,
      transactionId: paymentId,
    });

    finalAppId = newApp.id;
    finalRegNo = newApp.registrationNumber || finalRegNo;

    const settings = await db.getSettings();
    const examDetails = getExamDetailsForGender(gender, finalRegNo);
    const isFemale = gender === 'Female';
    const rawSeq = parseInt(finalRollNo.slice(4), 10) || 1;
    const candidateIndex = isFemale ? (rawSeq > 5000 ? rawSeq - 5000 : rawSeq) : rawSeq;
    const indexForSeating = (candidateIndex % 1000) || candidateIndex;
    const hallNumber = Math.ceil(indexForSeating / 30);
    const deskNumber = ((indexForSeating - 1) % 30) + 1;

    await db.generateOrReleaseAdmitCard({
      id: 'admit-' + finalAppId,
      applicationId: finalAppId,
      applicationNumber: finalRegNo,
      rollNumber: finalRollNo,
      candidateName: personalInfo.fullName.trim(),
      fatherName: parentInfo?.fatherName?.trim() || '',
      classApplying: newApp.classApplying,
      stream: newApp.stream,
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

    await db.updatePaymentOrderRecord(orderId, {
      status: 'CHARGED',
      applicationId: finalAppId,
      registrationNumber: finalRegNo,
      paymentResponse: paymentResponseData,
    });
  }

  // 7. Non-blocking Post-Registration Operations (Audit Log & Notifications)
  (async () => {
    try {
      await recordAuditLog({
        userId: officialUserId,
        userName: officialUserName,
        userRole: officialUserRole,
        action: 'PAYMENT_SUCCESS_CONFIRMED',
        entity: 'payment_orders',
        entityId: orderId,
        details: {
          gateway,
          orderId,
          paymentId,
          registrationNumber: finalRegNo,
          rollNumber: finalRollNo,
          amount: 800,
        },
      });

      await sendNotification({
        to: candidateEmail,
        name: personalInfo.fullName,
        type: 'APPLICATION_SUBMITTED',
        data: {
          registrationNumber: finalRegNo,
          applicationNumber: finalRegNo,
          classApplying: classApplying.replace(/^Class\s*/i, 'Class '),
        },
      });

      const receiptNo = 'REC-' + (gateway === 'hdfc' ? 'HDFC-' : 'RZP-') + Math.floor(100000 + Math.random() * 900000);
      await sendNotification({
        to: candidateEmail,
        name: personalInfo.fullName,
        type: 'FEE_PAYMENT_RECEIPT',
        data: {
          registrationNumber: finalRegNo,
          applicationNumber: finalRegNo,
          receiptNumber: receiptNo,
          transactionId: paymentId,
          amount: 800,
          classApplying: classApplying.replace(/^Class\s*/i, 'Class '),
          candidateEmail,
          candidateMobile,
          paymentDate: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        },
      });

      const fullAddress = [
        addressInfo?.streetAddress,
        addressInfo?.city,
        addressInfo?.district,
        addressInfo?.state,
        addressInfo?.pincode ? `PIN: ${addressInfo.pincode}` : '',
      ].filter(Boolean).join(', ') || addressInfo?.city || 'Not provided';

      const prevBoard = (personalInfo?.previousBoard === 'Others' ? personalInfo?.otherBoard : personalInfo?.previousBoard) || 'CBSE';
      const formattedDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

      await sendNotification({
        to: ADMIN_NOTIFICATION_EMAIL,
        name: 'Admissions Desk',
        type: 'ADMIN_NEW_REGISTRATION_ALERT',
        data: {
          registrationNumber: finalRegNo,
          rollNumber: finalRollNo || 'Pending Allotment',
          applicationNumber: finalRegNo,
          receiptNumber: receiptNo,
          fullName: personalInfo.fullName,
          classApplying: classApplying.replace(/^Class\s*/i, 'Class '),
          fatherName: parentInfo?.fatherName || 'Not specified',
          fatherOccupation: parentInfo?.fatherOccupation || 'Not specified',
          motherName: parentInfo?.motherName || 'Not specified',
          motherOccupation: parentInfo?.motherOccupation || 'Not specified',
          motherPhone: parentInfo?.motherPhone || 'Not provided',
          gender: personalInfo?.gender || 'Not specified',
          category: personalInfo?.category || 'General',
          dob: personalInfo?.dob || 'Not specified',
          aadhaarNumber: personalInfo?.aadhaarNumber || 'Not specified',
          address: fullAddress,
          previousSchool: personalInfo?.previousSchoolName || 'Not specified',
          previousSchoolName: personalInfo?.previousSchoolName || 'Not specified',
          previousBoard: prevBoard,
          transactionId: paymentId,
          amount: 800,
          amountPaid: 800,
          registrationTime: formattedDate,
          paymentDate: formattedDate,
        },
      });
    } catch (postErr) {
      console.warn('[PaymentCompletion] Background notification notice:', postErr);
    }
  })();

  const redirectUrl = `/payment/thank-you?orderId=${encodeURIComponent(orderId)}&regNo=${encodeURIComponent(finalRegNo)}&txnId=${encodeURIComponent(paymentId)}`;

  return {
    success: true,
    orderId,
    paymentId,
    registrationNumber: finalRegNo,
    rollNumber: finalRollNo,
    applicationId: finalAppId,
    user: {
      id: officialUserId,
      name: officialUserName,
      email: candidateEmail,
      role: officialUserRole,
    },
    redirectUrl,
  };
}
