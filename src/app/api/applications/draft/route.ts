import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const application = await db.getApplicationByUserId(user.userId);
    return NextResponse.json({ application });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const draft = await db.saveDraftApplication({
      userId: user.userId,
      classApplying: body.classApplying || 'Class 6',
      personalInfo: body.personalInfo || {},
      parentInfo: body.parentInfo || {},
      addressInfo: body.addressInfo || {},
      academicInfo: body.academicInfo || {},
      examCentrePref: body.examCentrePref || {},
      documents: body.documents || {},
      currentStep: body.currentStep || body.step || 1,
    });

    return NextResponse.json({
      success: true,
      message: 'Application draft saved successfully. You can resume anytime.',
      draft,
    });
  } catch (error: any) {
    console.error('Save draft error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save draft' }, { status: 500 });
  }
}
