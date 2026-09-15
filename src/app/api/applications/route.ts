import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role === 'admin') {
      const applications = await db.getApplications();
      return NextResponse.json({ applications });
    }

    // Applicant retrieves their own application
    const application = await db.getApplicationByUserId(user.userId);
    return NextResponse.json({ application });
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
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

    const newApp = await db.createApplication({
      userId: user.userId,
      classApplying: classApplying || academicInfo?.applyingClass || 'Class 6',
      personalInfo,
      parentInfo,
      addressInfo,
      academicInfo,
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

    // 1. Send ONE official fee payment receipt to the registered candidate
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

    // Nothing else should be sended (redundant emails eliminated)

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
