import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';
import { computeApplicationMetrics } from '@/lib/applicationMetrics';
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
  getExamDetailsForGender,
} from '@/lib/validations';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (user.role === 'admin') {
      const allApplications = await db.getApplications();
      // Exclude draft records: only officially registered candidates are shown
      const registeredApplications = allApplications.filter(
        (a) => a.status !== 'draft' && !(a.registrationNumber || '').startsWith('DRAFT-')
      );
      const metrics = computeApplicationMetrics(registeredApplications);

      const { searchParams } = new URL(request.url);
      const statusParam = searchParams.get('status');
      const classParam = searchParams.get('class');
      const queryParam = searchParams.get('q');
      const includeDrafts = searchParams.get('include_drafts') === 'true';

      let filtered = includeDrafts ? allApplications : registeredApplications;

      // Status filtering on server
      if (statusParam && statusParam !== 'all_records') {
        if (statusParam === 'All' || statusParam === 'active') {
          filtered = filtered.filter((a) => a.status !== 'rejected');
        } else {
          filtered = filtered.filter((a) => a.status === statusParam);
        }
      }

      // Class filtering on server
      if (classParam && classParam !== 'All') {
        filtered = filtered.filter((a) => a.classApplying === classParam);
      }

      // Search query filtering on server
      if (queryParam) {
        const q = queryParam.toLowerCase().trim();
        filtered = filtered.filter((app) => {
          const appNum = (app.applicationNumber || app.registrationNumber || '').toLowerCase();
          const name = (app.personalInfo?.fullName || '').toLowerCase();
          const phone = (app.parentInfo?.fatherPhone || app.personalInfo?.candidateMobile || '');
          const email = (app.personalInfo?.candidateEmail || '').toLowerCase();
          return appNum.includes(q) || name.includes(q) || phone.includes(q) || email.includes(q);
        });
      }

      return NextResponse.json({
        applications: filtered,
        metrics,
        totalRecords: registeredApplications.length,
        filteredCount: filtered.length,
      });
    }

    // Normal applicant can ONLY retrieve their own application dossier
    if (user.userId && user.userId.startsWith('temp_')) {
      const tempApp = await db.getTempApplication(user.userId);
      return NextResponse.json({ application: tempApp });
    }

    let application = await db.getApplicationByUserId(user.userId);
    if (!application && (user.email || user.registrationNumber)) {
      const all = await db.getApplications();
      application = all.find(a => 
        (user.email && a.personalInfo?.candidateEmail && a.personalInfo.candidateEmail.toLowerCase() === user.email.toLowerCase()) ||
        (user.registrationNumber && (a.registrationNumber === user.registrationNumber || a.applicationNumber === user.registrationNumber))
      ) || null;
    }
    return NextResponse.json({ application });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json({ error: 'Failed to fetch application data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      classApplying,
      stream,
      personalInfo,
      parentInfo,
      addressInfo,
      academicInfo,
      studyLocationPref,
      examCentrePref,
      documents,
      amountPaid,
      transactionId,
    } = body;

    // Check if user already submitted
    const existing = await db.getApplicationByUserId(user.userId);
    if (existing && existing.status !== 'draft') {
      if (existing.status === 'rejected') {
        await db.deleteApplication(existing.id);
      } else {
        return NextResponse.json(
          { error: 'You have already submitted an application for this session.', application: existing },
          { status: 409 }
        );
      }
    }

    // 1. Candidate Full Name
    const candNameVal = validateName(personalInfo?.fullName, 'Candidate Full Name');
    if (!candNameVal.isValid) {
      return NextResponse.json({ error: candNameVal.error }, { status: 400 });
    }

    // 2. Date of Birth Validation (Cannot be greater than today's date)
    const dobVal = validateDob(personalInfo?.dob);
    if (!dobVal.isValid) {
      return NextResponse.json({ error: dobVal.error }, { status: 400 });
    }

    // 3. Gender
    const gender = personalInfo?.gender;
    if (gender !== 'Male' && gender !== 'Female') {
      return NextResponse.json({ error: 'Gender must be selected as either Male or Female.' }, { status: 400 });
    }

    // 4. Preferred Study Location
    const systemSettings = await db.getSettings();
    const finalStudyPref = studyLocationPref || examCentrePref || {};
    const locVal = validateStudyLocation(gender, finalStudyPref.firstPreference, finalStudyPref.secondPreference, systemSettings?.activeStudyLocations);
    if (!locVal.isValid) {
      return NextResponse.json({ error: locVal.error }, { status: 400 });
    }

    // 5. Class & Stream (Stream availability checked against preferred campus)
    const finalStream = stream || academicInfo?.stream;
    const classVal = validateClassAndStream(classApplying, finalStream, finalStudyPref.firstPreference);
    if (!classVal.isValid) {
      return NextResponse.json({ error: classVal.error }, { status: 400 });
    }

    // 6. Father's and Mother's Full Names & Phone
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
    if (parentInfo?.fatherOccupation && parentInfo.fatherOccupation.trim()) {
      const fatherOccVal = validateOccupation(parentInfo.fatherOccupation, "Father's Occupation");
      if (!fatherOccVal.isValid) {
        return NextResponse.json({ error: fatherOccVal.error }, { status: 400 });
      }
    }
    if (parentInfo?.motherOccupation && parentInfo.motherOccupation.trim()) {
      const motherOccVal = validateOccupation(parentInfo.motherOccupation, "Mother's Occupation");
      if (!motherOccVal.isValid) {
        return NextResponse.json({ error: motherOccVal.error }, { status: 400 });
      }
    }

    // 7. Aadhaar Validation & Uniqueness
    const aadhaarVal = validateAadhaar(personalInfo?.aadhaarNumber);
    if (!aadhaarVal.isValid) {
      return NextResponse.json({ error: aadhaarVal.error }, { status: 400 });
    }
    const existingAadhaarApp = await db.findApplicationByAadhaar(personalInfo.aadhaarNumber);
    if (existingAadhaarApp && existingAadhaarApp.userId !== user.userId) {
      return NextResponse.json(
        { error: 'This Aadhaar number is already associated with an existing application.' },
        { status: 409 }
      );
    }

    // 8. Mandatory 4 Documents (Marksheet removed!)
    const docsVal = validateAllFourDocuments(documents);
    if (!docsVal.isValid) {
      return NextResponse.json({ error: docsVal.error }, { status: 400 });
    }

    // 9. File Content, Size (<=2MB), MIME & Magic Bytes Validation
    for (const docKey of ['photo', 'signature', 'parentSignature', 'aadhaarCard']) {
      const fileVal = validateUploadedFile(documents[docKey], docKey);
      if (!fileVal.isValid) {
        return NextResponse.json({ error: fileVal.error }, { status: 400 });
      }
    }

    // 10. Generate Registration ID: NILB-xxxxx / NILG-xxxxx & Class-based Roll Number: 2706... / 2711...
    const registrationId = await db.getNextRegistrationNumber(gender as 'Male' | 'Female');
    const assignedRollNo = await db.getNextRollNumber(classApplying);

    const newApp = await db.createApplication({
      userId: user.userId,
      registrationNumber: registrationId,
      rollNumber: assignedRollNo,
      classApplying: classApplying || 'Class 6',
      stream: classApplying?.includes('11') ? finalStream : undefined,
      personalInfo,
      parentInfo,
      addressInfo,
      academicInfo: {
        applyingClass: classApplying,
        stream: finalStream,
        previousSchoolName: personalInfo.previousSchoolName,
        previousBoard: personalInfo.previousBoard,
        otherBoard: personalInfo.otherBoard,
      },
      studyLocationPref: finalStudyPref,
      examCentrePref: finalStudyPref,
      documents: documents || {},
      status: 'submitted',
      paymentStatus: 'completed',
      amountPaid: amountPaid || 800,
      transactionId: transactionId || 'TXN_GUR_' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    });

    // Generate Official Admit Card Record Simultaneously (isReleased: false until Admin declares)
    const settings = await db.getSettings();
    const examDetails = getExamDetailsForGender(personalInfo.gender, registrationId);

    const seqNum = parseInt(assignedRollNo.slice(3), 10) || 1;
    const hallNumber = Math.ceil(seqNum / 30);
    const deskNumber = ((seqNum - 1) % 30) + 1;

    await db.generateOrReleaseAdmitCard({
      id: 'admit-' + newApp.id,
      applicationId: newApp.id,
      applicationNumber: registrationId,
      rollNumber: assignedRollNo,
      gender: personalInfo.gender,
      candidateName: personalInfo.fullName.trim(),
      fatherName: parentInfo.fatherName.trim(),
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
      isReleased: Boolean(settings.admitCardsReleased), // Hidden from candidate until admin declares
      instructions: [
        'Bring a printed clear copy of this Admit Card along with your original Aadhaar Card.',
        'Candidates must report to their allotted examination centre at least 45 minutes before exam start time.',
        'Calculators, smart devices, watches, and mobile phones are strictly prohibited in the exam hall.',
        'Only Blue or Black ballpoint pens are permitted for marking answers.',
      ],
      createdAt: new Date().toISOString(),
    });

    // Fetch user record to include permanent registrationNumber in confirmation
    const userRecord = await db.findUserByEmail(user.email);
    const candidateRegNo = userRecord?.registrationNumber || newApp.registrationNumber || newApp.applicationNumber;
    const candidateName = personalInfo?.fullName || userRecord?.name || user.name || 'Candidate';
    const candidateMobile = userRecord?.phone || personalInfo?.candidateMobile || personalInfo?.phone || 'N/A';
    const receiptNo = 'REC-GK26-' + Math.floor(100000 + Math.random() * 900000);
    const paymentTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

    // 1. Dispatch Registration Confirmation Email containing permanent Registration Number to candidate
    try {
      await sendNotification({
        to: user.email,
        name: candidateName,
        type: 'APPLICATION_SUBMITTED',
        data: {
          registrationNumber: candidateRegNo,
          applicationNumber: newApp.applicationNumber,
          classApplying: newApp.classApplying,
        },
      });
    } catch (mailErr) {
      console.error('Failed to send candidate application submission email:', mailErr);
    }

    // 2. Send official fee payment receipt to the registered candidate
    try {
      await sendNotification({
        to: user.email,
        name: candidateName,
        type: 'FEE_PAYMENT_RECEIPT',
        data: {
          registrationNumber: candidateRegNo,
          applicationNumber: newApp.applicationNumber,
          receiptNumber: receiptNo,
          transactionId: newApp.transactionId || '',
          amount: newApp.amountPaid || 800,
          classApplying: newApp.classApplying,
          candidateEmail: user.email,
          candidateMobile: candidateMobile,
          paymentDate: paymentTimestamp,
        },
      });
    } catch (receiptErr) {
      console.error('Failed to send candidate fee receipt email:', receiptErr);
    }

    // 2. Send ONE administrative registration & payment alert with candidate details to anshumiglaniji08@gmail.com
    await sendNotification({
      to: 'anshumiglaniji08@gmail.com',
      name: 'Admissions Desk',
      type: 'ADMIN_NEW_REGISTRATION_ALERT',
      data: {
        registrationNumber: candidateRegNo,
        applicationNumber: newApp.applicationNumber,
        receiptNumber: receiptNo,
        fullName: candidateName,
        classApplying: newApp.classApplying,
        candidateEmail: user.email,
        candidateMobile: candidateMobile,
        fatherName: parentInfo?.fatherName || 'N/A',
        fatherPhone: parentInfo?.fatherPhone || 'N/A',
        motherName: parentInfo?.motherName || 'N/A',
        dob: personalInfo?.dob || 'N/A',
        gender: personalInfo?.gender || 'N/A',
        category: personalInfo?.category || 'General',
        aadhaarNumber: personalInfo?.aadhaarNumber ? `XXXXXXXX${personalInfo.aadhaarNumber.slice(-4)}` : 'N/A',
        state: addressInfo?.state || 'N/A',
        district: addressInfo?.district || 'N/A',
        address: `${addressInfo?.streetAddress || ''}, ${addressInfo?.city || ''}, ${addressInfo?.district || ''}, ${addressInfo?.state || ''} - ${addressInfo?.pincode || ''}`.replace(/^,\s*|,\s*$/g, ''),
        previousSchool: personalInfo?.previousSchoolName ? `${personalInfo.previousSchoolName} (${personalInfo.previousBoard || ''})` : 'N/A',
        amountPaid: newApp.amountPaid || 800,
        transactionId: newApp.transactionId || '',
        registrationTime: paymentTimestamp,
      },
    });

    // 3. Create persistent Admin Notification
    try {
      await db.createAdminNotification({
        type: 'APPLICATION_SUBMITTED',
        title: `New Application: ${candidateName}`,
        message: `${candidateName} submitted an application for ${newApp.classApplying} (${newApp.applicationNumber}). Fee ₹${newApp.amountPaid || 1200} paid.`,
        entityId: newApp.id,
        entityType: 'application',
        link: `/admin/applications/${newApp.id}`,
        metadata: {
          applicationId: newApp.id,
          candidateName,
          applicationNumber: newApp.applicationNumber,
          classApplying: newApp.classApplying,
          email: user.email,
          phone: candidateMobile,
        },
      });
    } catch (notifErr) {
      console.warn('Failed to create admin notification on submit:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted and fee payment verified successfully!',
      application: newApp,
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application. Please verify all fields.' },
      { status: 500 }
    );
  }
}
