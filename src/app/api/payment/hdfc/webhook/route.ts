import { NextResponse } from 'next/server';
import { db, toMySqlDatetime, safeJsonParse } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';
import { getExamDetailsForGender } from '@/lib/validations';
import { fetchHdfcOrderStatus, verifyHdfcResponseSignature, HDFC_CONFIG } from '@/lib/hdfc';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      const searchParams = new URLSearchParams(rawBody);
      payload = Object.fromEntries(searchParams.entries());
    }

    const signature = request.headers.get('x-signature') || request.headers.get('signature') || '';
    if (HDFC_CONFIG.RESPONSE_KEY && signature) {
      const isValid = verifyHdfcResponseSignature(signature, rawBody);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    }

    const orderId = payload.order_id || payload.orderId || payload.data?.order?.order_id;
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order_id in webhook' }, { status: 400 });
    }

    const paymentOrder = await db.getPaymentOrderByOrderId(orderId);
    if (!paymentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (paymentOrder.status === 'CHARGED') {
      return NextResponse.json({ message: 'Order already processed' }, { status: 200 });
    }

    // Always fetch server-to-server official status
    const statusResponse = await fetchHdfcOrderStatus(orderId);
    const orderStatus = (statusResponse.status || '').toUpperCase();
    const returnedAmount = parseFloat(String(statusResponse.amount));
    const expectedAmount = paymentOrder.amount || HDFC_CONFIG.FEE_AMOUNT;

    if (orderStatus === 'CHARGED' || orderStatus === 'SUCCESS') {
      if (Math.abs(returnedAmount - expectedAmount) <= 0.01) {
        const appPayload = paymentOrder.applicationPayload;
        if (appPayload) {
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
          } = appPayload;

          const gender = (personalInfo?.gender || 'Male') as 'Male' | 'Female';
          const registrationId = await db.getNextRegistrationNumber(gender);
          const assignedRollNo = await db.getNextRollNumber(classApplying, gender, stream || appPayload.academicInfo?.stream);

          const candidateEmail = (personalInfo?.candidateEmail || paymentOrder.customerEmail || '').trim().toLowerCase();
          const candidateMobile = (personalInfo?.candidateMobile || paymentOrder.customerPhone || '').trim();
          const cleanPhone = candidateMobile.replace(/\D/g, '').slice(-10);

          let passwordHash = '';
          if (password) {
            passwordHash = await hashPassword(password);
          } else {
            passwordHash = await hashPassword('Student@123');
          }

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
          }

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
            studyLocationPref,
            examCentrePref: studyLocationPref,
            documents: documents || {},
            status: 'submitted',
            paymentStatus: 'completed',
            amountPaid: 800,
            transactionId: statusResponse.txn_id || orderId,
          });

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
            createdAt: toMySqlDatetime(new Date()),
          });

          if (authUserId && authUserId.startsWith('temp_')) {
            await db.deleteTempApplication(authUserId);
          }

          await db.updatePaymentOrderRecord(orderId, {
            status: 'CHARGED',
            applicationId: newApplication.id,
            registrationNumber: registrationId,
            paymentResponse: statusResponse,
          });
        }
      }
    } else {
      await db.updatePaymentOrderRecord(orderId, {
        status: orderStatus as any,
        paymentResponse: statusResponse,
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('HDFC Webhook processing error:', error);
    return NextResponse.json({ error: error?.message || 'Webhook failed' }, { status: 500 });
  }
}
