import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }

    const enquiry = await db.getContactEnquiryById(params.id);
    if (!enquiry) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, enquiry });
  } catch (error: any) {
    console.error('Error fetching enquiry by id:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch enquiry' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }

    const body = await request.json();
    const { status, remarks } = body;

    const updated = await db.updateContactEnquiryStatus(params.id, status, remarks);
    if (!updated) {
      return NextResponse.json({ error: 'Enquiry not found or could not be updated' }, { status: 404 });
    }

    return NextResponse.json({ success: true, enquiry: updated });
  } catch (error: any) {
    console.error('Error updating enquiry:', error);
    return NextResponse.json({ error: error.message || 'Failed to update enquiry' }, { status: 500 });
  }
}
