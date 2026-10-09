import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await db.getSettings();
    return NextResponse.json(
      {
        success: true,
        settings: {
          academicSession: settings.academicSession,
          applicationFee: settings.applicationFee,
          registrationStartDate: settings.registrationStartDate,
          registrationEndDate: settings.registrationEndDate,
          admitCardReleaseDate: settings.admitCardReleaseDate,
          entranceExamDate: settings.entranceExamDate,
          entranceExamTime: settings.entranceExamTime || '9:30 AM (Boys) / 8:30 AM (Girls)',
          examVenueName: settings.examVenueName || 'Aryakulam Nilokheri (Boys) / The Gurukul Nilokheri (Girls)',
          examVenueAddress: settings.examVenueAddress || 'Nilokheri, Karnal, Haryana - 132117',
          resultDeclarationDate: settings.resultDeclarationDate,
          counselingStartDate: settings.counselingStartDate,
          helplinePhone: settings.helplinePhone,
          helplineEmail: settings.helplineEmail,
          portalOpen: settings.portalOpen,
          resultsDeclared: settings.resultsDeclared,
          admitCardsReleased: settings.admitCardsReleased === true,
          activeStudyLocations: (settings.activeStudyLocations || ['The Gurukul Nilokheri', 'The Gurukul Jyotisar', 'Aryakulam Nilokheri']).map((loc: string) => {
            if (loc === 'Gurukul Jyotisar') return 'The Gurukul Jyotisar';
            if (loc === 'Gurukul Nilokheri') return 'The Gurukul Nilokheri';
            return loc;
          }),
          timezone: settings.timezone || 'Asia/Kolkata (IST)',
          announcementNotice: settings.announcementNotice || '',
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching public settings:', error);
    return NextResponse.json({ error: 'Failed to fetch portal settings' }, { status: 500 });
  }
}
