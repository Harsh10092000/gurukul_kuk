import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, query, phone, applicationNumber } = body;

    if (!query || query.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please enter a detailed description of your query/grievance (minimum 10 characters).' },
        { status: 400 }
      );
    }

    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: 'Please provide a valid 10-digit Indian contact mobile number.' },
        { status: 400 }
      );
    }

    const ticketId = `GRV-${Date.now().toString().slice(-6)}`;

    // 1. Save into persistent contact enquiries and create admin notification
    await db.createContactEnquiry({
      name: user.name || 'Candidate',
      email: user.email || '',
      phone: cleanPhone,
      subject: subject || 'Ground of Rejection Clarification',
      message: query.trim(),
      applicationNumber: applicationNumber || undefined,
      source: 'candidate_grievance',
    });

    // 2. Record grievance into audit log for administrative review
    await recordAuditLog({
      userId: user.userId,
      userName: user.name,
      userRole: user.role,
      action: 'CANDIDATE_GRIEVANCE_SUBMITTED',
      entity: 'HelpdeskTicket',
      details: {
        ticketId,
        applicationNumber: applicationNumber || 'N/A',
        subject: subject || 'Application Rejection Clarification',
        query: query.trim(),
        contactPhone: cleanPhone,
        submittedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Your grievance has been submitted successfully to the Examination Controller.',
    });
  } catch (error: any) {
    console.error('Error submitting grievance query:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit grievance query' }, { status: 500 });
  }
}
