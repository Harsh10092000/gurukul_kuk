import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message, applicationNumber } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: 'Please provide a valid 10-digit Indian contact mobile number.' },
        { status: 400 }
      );
    }

    if (!subject || subject.trim().length < 3) {
      return NextResponse.json({ error: 'Please enter a valid query subject.' }, { status: 400 });
    }

    if (!message || message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a detailed enquiry message (minimum 10 characters).' },
        { status: 400 }
      );
    }

    const enquiry = await db.createContactEnquiry({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: cleanPhone,
      subject: subject.trim(),
      message: message.trim(),
      applicationNumber: applicationNumber ? applicationNumber.trim() : undefined,
      source: 'public_contact',
    });

    return NextResponse.json({
      success: true,
      message: 'Your enquiry has been received successfully. The Examination Cell / Admission Helpdesk will get in touch with you shortly.',
      enquiryId: enquiry.id,
    });
  } catch (error: any) {
    console.error('Error submitting contact enquiry:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit contact enquiry' }, { status: 500 });
  }
}
