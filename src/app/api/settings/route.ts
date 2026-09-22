import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await db.getSettings();
    return NextResponse.json({
      success: true,
      settings: {
        academicSession: settings.academicSession,
        applicationFee: settings.applicationFee,
        registrationStartDate: settings.registrationStartDate,
        registrationEndDate: settings.registrationEndDate,
        admitCardReleaseDate: settings.admitCardReleaseDate,
        entranceExamDate: settings.entranceExamDate,
        entranceExamTime: settings.entranceExamTime || '9:30 AM',
        examVenueName: settings.examVenueName || 'THE GURUKUL JYOTISAR PEHOWA ROAD, KURUKSHETRA',
        examVenueAddress: settings.examVenueAddress || '136119, Haryana',
        resultDeclarationDate: settings.resultDeclarationDate,
        counselingStartDate: settings.counselingStartDate,
        helplinePhone: settings.helplinePhone,
        helplineEmail: settings.helplineEmail,
        portalOpen: settings.portalOpen,
        resultsDeclared: settings.resultsDeclared,
        admitCardsReleased: settings.admitCardsReleased === true,
        admitCardsReleasedAt: settings.admitCardsReleasedAt || null,
        activeStudyLocations: settings.activeStudyLocations || ['Gurukul Nilokheri', 'Gurukul Jyotisar', 'Aryakulam Nilokheri'],
      },
    });
  } catch (error: any) {
    console.error('Error fetching public settings:', error);
    return NextResponse.json({ error: 'Failed to fetch portal settings' }, { status: 500 });
  }
}
