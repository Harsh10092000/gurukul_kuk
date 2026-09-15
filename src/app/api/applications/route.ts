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
  validateMarks,
  validateUploadedFile,
  validateAllFiveDocuments,
} from '@/lib/validations';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (user.role === 'admin') {
      const allApplications = await db.getApplications();
      const metrics = computeApplicationMetrics(allApplications);

      const { searchParams } = new URL(request.url);
      const statusParam = searchParams.get('status');
      const classParam = searchParams.get('class');
      const queryParam = searchParams.get('q');

      let filtered = allApplications;

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
        totalRecords: allApplications.length,
        filteredCount: filtered.length,
      });
    }

    // Normal applicant can ONLY retrieve their own application dossier
    const application = await db.getApplicationByUserId(user.userId);
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
      personalInfo,
      parentInfo,
      addressInfo,
      academicInfo,
      examCentrePref,
      documents,
      amountPaid,
      transactionId,
    } = body;

    // Check if user already submitted
    const existing = await db.getApplicationByUserId(user.userId);
    if (existing && existing.status !== 'draft') {
      if (existing.status === 'rejected') {
        // User was rejected previously and is re-applying; remove previous rejected record for fresh submission
        await db.deleteApplication(existing.id);
      } else {
        return NextResponse.json(
          { error: 'You have already submitted an application for this session.', application: existing },
          { status: 409 }
        );
      }
    }

    // ==========================================
    // SERVER-SIDE VALIDATION CHECKLIST
    // ==========================================
    // 1. Candidate Full Name
    const candNameVal = validateName(personalInfo?.fullName, 'Candidate Full Name');
    if (!candNameVal.isValid) {
      return NextResponse.json({ error: candNameVal.error }, { status: 400 });
    }

    // 2. Father's and Mother's Full Names
    const fatherNameVal = validateName(parentInfo?.fatherName, "Father's Full Name");
    if (!fatherNameVal.isValid) {
      return NextResponse.json({ error: fatherNameVal.error }, { status: 400 });
    }
    const motherNameVal = validateName(parentInfo?.motherName, "Mother's Full Name");
    if (!motherNameVal.isValid) {
      return NextResponse.json({ error: motherNameVal.error }, { status: 400 });
    }

    // 3. Father's Mobile Number (format & length)
    const fatherPhoneVal = validatePhone(parentInfo?.fatherPhone, "Father's Mobile Phone");
    if (!fatherPhoneVal.isValid) {
      return NextResponse.json({ error: fatherPhoneVal.error }, { status: 400 });
    }

    // 4. Father's and Mother's Occupations
    const fatherOccVal = validateOccupation(parentInfo?.fatherOccupation, "Father's Occupation");
    if (!fatherOccVal.isValid) {
      return NextResponse.json({ error: fatherOccVal.error }, { status: 400 });
    }
    const motherOccVal = validateOccupation(parentInfo?.motherOccupation, "Mother's Occupation");
    if (!motherOccVal.isValid) {
      return NextResponse.json({ error: motherOccVal.error }, { status: 400 });
    }

    // 5. Aadhaar Validation & Uniqueness
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

    // 6. Marks Validation & Safe Calculation
    const marksVal = validateMarks(academicInfo?.marksObtained, academicInfo?.marksTotal);
    if (!marksVal.isValid) {
      return NextResponse.json({ error: marksVal.error }, { status: 400 });
    }

    // 7. Mandatory All 5 Documents
    const docsVal = validateAllFiveDocuments(documents);
    if (!docsVal.isValid) {
      return NextResponse.json({ error: docsVal.error }, { status: 400 });
    }

    // 8. File Content, Size (<=2MB), MIME & Magic Bytes Validation
    for (const docKey of ['photo', 'signature', 'parentSignature', 'aadhaarCard', 'lastMarksheet']) {
      const fileVal = validateUploadedFile(documents[docKey], docKey);
      if (!fileVal.isValid) {
        return NextResponse.json({ error: fileVal.error }, { status: 400 });
      }
    }

    const newApp = await db.createApplication({
      userId: user.userId,
      classApplying: classApplying || academicInfo?.applyingClass || 'Class 6',
      personalInfo,
      parentInfo,
      addressInfo,
      academicInfo: {
        ...academicInfo,
        previousClassMarksPercentage: String(marksVal.percentage),
      },
      examCentrePref,
      documents: documents || {},
      status: 'submitted',
      paymentStatus: 'completed',
      amountPaid: amountPaid || 1200,
      transactionId: transactionId || 'TXN_GK_' + Math.random().toString(36).substring(2, 9).toUpperCase(),
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
          amount: newApp.amountPaid || 1200,
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
        previousSchool: academicInfo?.previousSchoolName ? `${academicInfo.previousSchoolName} (${academicInfo.previousBoard || ''})` : 'N/A',
        previousMarks: academicInfo?.previousClassMarksPercentage ? `${academicInfo.previousClassMarksPercentage}%` : (academicInfo?.marksObtained ? `${academicInfo.marksObtained}/${academicInfo.marksTotal}` : 'N/A'),
        amountPaid: newApp.amountPaid || 1200,
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
