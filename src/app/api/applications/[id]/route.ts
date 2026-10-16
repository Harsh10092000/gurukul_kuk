import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';
import { isValidApplicationStatus, isValidStatusTransition } from '@/lib/applicationMetrics';
import { validateAadhaar } from '@/lib/validations';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const id = params.id;
    const application = await db.getApplicationById(id);

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Fallback: If transactionId is missing, resolve it from payment_orders
    if (!application.transactionId) {
      const email = application.personalInfo?.candidateEmail || (application.personalInfo as any)?.email;
      if (email) {
        const order = await db.getPaymentOrderByEmail(email);
        if (order) {
          const raw = order.paymentResponse as any;
          const tx = raw?.razorpay_payment_id || raw?.paymentId || (order as any).transactionId || raw?.id;
          if (tx) {
            application.transactionId = tx;
          }
        }
      }
    }

    // Authorization: Prevent IDOR (applicant can only view their own dossier; admin can view all)
    if (user.role !== 'admin' && application.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to access another candidate dossier.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Error fetching application by ID:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }

    const id = params.id;
    const existingApp = await db.getApplicationById(id);
    if (!existingApp) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, remarks } = body;

    // Strict status enum whitelist validation
    if (!status || !isValidApplicationStatus(status)) {
      return NextResponse.json(
        { error: `Invalid application status: '${status}'. Allowed statuses: draft, submitted, under_review, correction_needed, approved, rejected, admit_card_ready, admitted.` },
        { status: 400 }
      );
    }

    // Business-rule transition validation
    const transitionCheck = isValidStatusTransition(existingApp.status, status, user.role);
    if (!transitionCheck.valid) {
      return NextResponse.json({ error: transitionCheck.reason }, { status: 400 });
    }

    // Mandatory rejection reason requirement
    if (status === 'rejected' && (!remarks || remarks.trim().length < 3)) {
      return NextResponse.json(
        { error: 'A documented ground or reason for rejection is strictly required.' },
        { status: 400 }
      );
    }

    const success = await db.updateApplicationStatus(id, status, remarks);
    if (!success) {
      return NextResponse.json({ error: 'Failed to update application' }, { status: 404 });
    }

    const updatedApp = await db.getApplicationById(id);
    if (updatedApp) {
      // Resolve candidate email from application or linked user account
      let candidateEmail = updatedApp.personalInfo?.candidateEmail;
      if (!candidateEmail) {
        const appUser = await db.getUserById(updatedApp.userId);
        candidateEmail = appUser?.email;
      }

      let notifType: 'APPLICATION_APPROVED' | 'APPLICATION_REJECTED' | 'CORRECTION_REQUIRED' | null = null;
      if (status === 'approved') notifType = 'APPLICATION_APPROVED';
      else if (status === 'rejected') notifType = 'APPLICATION_REJECTED';
      else if (status === 'correction_needed') notifType = 'CORRECTION_REQUIRED';

      if (notifType && candidateEmail) {
        try {
          await sendNotification({
            to: candidateEmail,
            name: updatedApp.personalInfo?.fullName || 'Candidate',
            type: notifType,
            data: {
              applicationNumber: updatedApp.applicationNumber,
              remarks: remarks || '',
            },
          });
        } catch (notifErr) {
          console.warn('Notification dispatch error:', notifErr);
        }
      }

      // Create persistent Admin Notification
      try {
        const candidateName = updatedApp.personalInfo?.fullName || 'Candidate';
        let adminTitle = `Application Status Updated: ${candidateName}`;
        let adminMsg = `Application ${updatedApp.applicationNumber} status changed to ${status.toUpperCase()}.`;
        let adminType: any = 'APPLICATION_STATUS_CHANGED';

        if (status === 'approved') {
          adminType = 'APPLICATION_APPROVED';
          adminTitle = `Application Approved: ${candidateName}`;
          adminMsg = `Dossier for ${candidateName} (${updatedApp.applicationNumber}, ${updatedApp.classApplying}) approved and verified.`;
        } else if (status === 'rejected') {
          adminType = 'APPLICATION_REJECTED';
          adminTitle = `Application Rejected: ${candidateName}`;
          adminMsg = `Dossier ${updatedApp.applicationNumber} for ${candidateName} rejected. Reason: "${remarks || 'Eligibility criteria mismatch'}".`;
        } else if (status === 'correction_needed') {
          adminType = 'CORRECTION_REQUIRED';
          adminTitle = `Correction Demanded: ${candidateName}`;
          adminMsg = `Dossier ${updatedApp.applicationNumber} flagged for correction: "${remarks}".`;
        }

        await db.createAdminNotification({
          type: adminType,
          title: adminTitle,
          message: adminMsg,
          entityId: updatedApp.id,
          entityType: 'application',
          link: `/admin/applications/${updatedApp.id}`,
          metadata: {
            applicationId: updatedApp.id,
            candidateName,
            applicationNumber: updatedApp.applicationNumber,
            classApplying: updatedApp.classApplying,
            email: candidateEmail,
            phone: updatedApp.parentInfo?.fatherPhone || updatedApp.personalInfo?.candidateMobile,
            status,
            rejectionReason: status === 'rejected' ? (remarks || 'Eligibility criteria mismatch') : undefined,
            remarks,
            updatedAt: new Date().toISOString(),
          },
        });
      } catch (adminNotifErr) {
        console.warn('Failed to create admin notification for status update:', adminNotifErr);
      }
    }

    return NextResponse.json({ success: true, application: updatedApp });
  } catch (error) {
    console.error('Error updating application status:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }

    const id = params.id;
    const existingApp = await db.getApplicationById(id);
    if (!existingApp) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      personalInfo = {},
      parentInfo = {},
      addressInfo = {},
      academicInfo = {},
      classApplying,
      stream,
      studyLocationPref,
      documents = {},
    } = body;

    // IMMUTABILITY ENFORCEMENT:
    // 1. Email, Registration No., Roll No. cannot be modified
    // 2. Class, Stream, and Gender are locked to preserve Roll Number & Exam Allotment integrity
    const lockedEmail = existingApp.personalInfo?.candidateEmail || existingApp.personalInfo?.email || '';
    const lockedRegNo = existingApp.registrationNumber || existingApp.applicationNumber;
    const lockedRollNo = existingApp.rollNumber;
    const lockedClass = existingApp.classApplying;
    const lockedStream = existingApp.stream;
    const lockedGender = existingApp.personalInfo?.gender || 'Male';
    const lockedStatus = existingApp.status; // Preserve existing status (no under_review changes)

    // AADHAAR CARD VALIDATION & DUPLICATE BLOCKING:
    // Admin can update Aadhaar, but if the new Aadhaar exists on another application, block it.
    const submittedAadhaar = personalInfo.aadhaarNumber !== undefined 
      ? String(personalInfo.aadhaarNumber).trim() 
      : (existingApp.personalInfo?.aadhaarNumber || '');
    const cleanAadhaar = submittedAadhaar.replace(/\D/g, '').slice(0, 12);

    if (cleanAadhaar) {
      const aadhaarCheck = validateAadhaar(cleanAadhaar);
      if (!aadhaarCheck.isValid) {
        return NextResponse.json(
          { error: aadhaarCheck.error || 'Aadhaar card number must be exactly 12 numeric digits.' },
          { status: 400 }
        );
      }

      // Check for duplicate in database if changed
      const existingCleanAadhaar = (existingApp.personalInfo?.aadhaarNumber || '').replace(/\D/g, '');
      if (cleanAadhaar !== existingCleanAadhaar) {
        const duplicateApp = await db.findApplicationByAadhaar(cleanAadhaar);
        if (
          duplicateApp &&
          duplicateApp.id !== existingApp.id &&
          duplicateApp.userId !== existingApp.userId &&
          duplicateApp.applicationNumber !== existingApp.applicationNumber &&
          duplicateApp.registrationNumber !== existingApp.registrationNumber
        ) {
          return NextResponse.json(
            {
              error: `Aadhaar card number '${cleanAadhaar}' already exists in the system for candidate "${duplicateApp.personalInfo?.fullName || 'Another Candidate'}" (Reg: ${duplicateApp.registrationNumber || duplicateApp.applicationNumber || duplicateApp.id}). Duplicate Aadhaar entry is blocked for security.`,
            },
            { status: 409 }
          );
        }
      }
    }

    const targetAadhaar = cleanAadhaar || existingApp.personalInfo?.aadhaarNumber || '';

    // Sanitize and clean phone numbers (10 numeric digits)
    const cleanFatherPhone = parentInfo.fatherPhone ? parentInfo.fatherPhone.replace(/\D/g, '').slice(-10) : (existingApp.parentInfo?.fatherPhone || '');
    const cleanMotherPhone = parentInfo.motherPhone ? parentInfo.motherPhone.replace(/\D/g, '').slice(-10) : (existingApp.parentInfo?.motherPhone || '');
    const cleanCandMobile = personalInfo.candidateMobile ? personalInfo.candidateMobile.replace(/\D/g, '').slice(-10) : (cleanFatherPhone || existingApp.personalInfo?.candidateMobile || '');
    const cleanWhatsapp = addressInfo.whatsappNumber ? addressInfo.whatsappNumber.replace(/\D/g, '').slice(-10) : (personalInfo.whatsappNumber ? personalInfo.whatsappNumber.replace(/\D/g, '').slice(-10) : cleanCandMobile);
    const cleanPincode = addressInfo.pincode ? addressInfo.pincode.replace(/\D/g, '').slice(0, 6) : (existingApp.addressInfo?.pincode || '');

    // Merge documents (excluding parent signature per policy)
    const mergedDocs = {
      ...(existingApp.documents || {}),
      ...(documents || {}),
    };
    delete mergedDocs.parentSignature; // Explicitly ensure parent signature is not stored

    // Class and Stream are locked to existing values
    const targetClass = lockedClass;
    const targetStream = lockedClass.includes('11') ? lockedStream : undefined;

    const updates = {
      classApplying: targetClass,
      stream: targetStream,
      status: lockedStatus, // Unchanged
      registrationNumber: lockedRegNo,
      rollNumber: lockedRollNo,
      personalInfo: {
        ...(existingApp.personalInfo || {}),
        ...personalInfo,
        fullName: personalInfo.fullName ? personalInfo.fullName.trim() : existingApp.personalInfo?.fullName,
        dob: personalInfo.dob ? personalInfo.dob.trim() : existingApp.personalInfo?.dob,
        gender: lockedGender,
        category: personalInfo.category || existingApp.personalInfo?.category || 'General',
        candidateEmail: lockedEmail,
        email: lockedEmail,
        aadhaarNumber: targetAadhaar,
        candidateMobile: cleanCandMobile,
        whatsappNumber: cleanWhatsapp,
      },
      parentInfo: {
        ...(existingApp.parentInfo || {}),
        ...parentInfo,
        fatherName: parentInfo.fatherName ? parentInfo.fatherName.trim() : existingApp.parentInfo?.fatherName,
        fatherOccupation: parentInfo.fatherOccupation ? parentInfo.fatherOccupation.trim() : existingApp.parentInfo?.fatherOccupation,
        fatherPhone: cleanFatherPhone,
        motherName: parentInfo.motherName ? parentInfo.motherName.trim() : existingApp.parentInfo?.motherName,
        motherOccupation: parentInfo.motherOccupation ? parentInfo.motherOccupation.trim() : existingApp.parentInfo?.motherOccupation,
        motherPhone: cleanMotherPhone || undefined,
        annualIncome: parentInfo.annualIncome ? parentInfo.annualIncome.trim() : existingApp.parentInfo?.annualIncome,
      },
      addressInfo: {
        ...(existingApp.addressInfo || {}),
        ...addressInfo,
        streetAddress: addressInfo.streetAddress ? addressInfo.streetAddress.trim() : existingApp.addressInfo?.streetAddress,
        city: addressInfo.city !== undefined ? addressInfo.city.trim() : existingApp.addressInfo?.city,
        district: addressInfo.district ? addressInfo.district.trim() : existingApp.addressInfo?.district,
        state: addressInfo.state ? addressInfo.state.trim() : existingApp.addressInfo?.state,
        pincode: cleanPincode,
        whatsappNumber: cleanWhatsapp,
      },
      academicInfo: {
        ...(existingApp.academicInfo || {}),
        ...academicInfo,
        applyingClass: targetClass,
        stream: targetStream,
        previousSchoolName: academicInfo.previousSchoolName || personalInfo.previousSchoolName || existingApp.academicInfo?.previousSchoolName,
        previousBoard: academicInfo.previousBoard || personalInfo.previousBoard || existingApp.academicInfo?.previousBoard,
        otherBoard: academicInfo.otherBoard || personalInfo.otherBoard || existingApp.academicInfo?.otherBoard,
      },
      studyLocationPref: studyLocationPref || existingApp.studyLocationPref || existingApp.examCentrePref,
      examCentrePref: studyLocationPref || existingApp.studyLocationPref || existingApp.examCentrePref,
      documents: mergedDocs,
    };

    const updated = await db.updateApplicationDetails(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update candidate record in database.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Candidate application and admit card updated successfully.',
      application: updated,
    });
  } catch (error) {
    console.error('Error in admin PUT application update:', error);
    return NextResponse.json({ error: 'Internal server error while saving candidate details.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }

    const id = params.id;
    const existingApp = await db.getApplicationById(id);
    const userIdToDelete = existingApp?.userId;

    const success = await db.deleteApplication(id);
    if (!success) {
      return NextResponse.json({ error: 'Application not found or could not be deleted' }, { status: 404 });
    }

    // Also completely delete user/login credentials when admin deletes applicant record
    if (userIdToDelete) {
      await db.deleteUser(userIdToDelete);
    }

    return NextResponse.json({ success: true, message: 'Application and associated user credentials deleted successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 });
  }
}

