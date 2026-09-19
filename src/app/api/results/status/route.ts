import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const declared = await db.areResultsDeclared();
    return NextResponse.json({
      resultsDeclared: declared,
      role: user?.role || 'guest',
    });
  } catch {
    return NextResponse.json({ resultsDeclared: false, role: 'guest' });
  }
}

// Admin-only: toggle whether results are visible to candidates
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    if (typeof body.resultsDeclared !== 'boolean') {
      return NextResponse.json({ error: 'resultsDeclared (boolean) is required' }, { status: 400 });
    }

    await db.updateSettings({ resultsDeclared: body.resultsDeclared });

    let notifiedCount = 0;
    let totalRecipients = 0;

    // When results are declared, send notification to all registered candidates
    if (body.resultsDeclared === true) {
      const recipientMap = new Map<string, { email: string; name: string }>();

      try {
        // Collect candidate emails from applications
        const applications = await db.getApplications();
        for (const app of applications) {
          const email = (app.personalInfo?.candidateEmail || app.personalInfo?.email || '').trim().toLowerCase();
          const name = app.personalInfo?.fullName?.trim() || 'Candidate';
          if (email && email.includes('@') && !recipientMap.has(email)) {
            recipientMap.set(email, { email, name });
          }
        }

        // Collect candidate emails from users
        const users = await db.getAllUsers();
        for (const u of users) {
          if (u.role === 'applicant' || (u.role as any) === 'student' || !u.role) {
            const email = (u.email || '').trim().toLowerCase();
            const name = u.name?.trim() || 'Candidate';
            if (email && email.includes('@') && !recipientMap.has(email)) {
              recipientMap.set(email, { email, name });
            }
          }
        }
      } catch (fetchErr) {
        console.error('Error fetching registered candidates for result declaration:', fetchErr);
      }

      const recipients = Array.from(recipientMap.values());
      totalRecipients = recipients.length;
      console.log(`[Result Declaration] Broadcasting announcement to ${totalRecipients} registered candidates...`);

      // Dispatch to each registered candidate without any roll number or specific details
      for (const r of recipients) {
        try {
          const result = await sendNotification({
            to: r.email,
            name: r.name,
            type: 'RESULT_DECLARED',
            data: {}, // Strict instruction: only message saying result has been declared, no roll no, nothing else
          });
          if (result && result.success) {
            notifiedCount++;
          }
        } catch (err) {
          console.error(`[Result Declaration] Error dispatching to ${r.email}:`, err);
        }
      }

      console.log(`[Result Declaration] Sent result announcement to ${notifiedCount}/${totalRecipients} registered candidates.`);
    }

    return NextResponse.json({
      success: true,
      resultsDeclared: body.resultsDeclared,
      message: body.resultsDeclared
        ? `Results are now visible to candidates. Announcement email sent to ${notifiedCount} registered candidate(s).`
        : 'Results are now hidden from candidates.',
      notifiedCount,
      totalRecipients,
    });
  } catch (error: any) {
    console.error('Error toggling resultsDeclared:', error);
    return NextResponse.json({ error: error.message || 'Failed to update result declaration status' }, { status: 500 });
  }
}
