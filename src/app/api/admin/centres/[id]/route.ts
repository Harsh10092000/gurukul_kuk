import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const id = params.id;
    const body = await req.json();

    const updated = await db.updateCentre(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Examination centre not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, centre: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update examination centre' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const id = params.id;
    const success = await db.deleteCentre(id);
    if (!success) {
      return NextResponse.json({ error: 'Examination centre not found or could not be deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Examination centre deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete examination centre' }, { status: 500 });
  }
}
