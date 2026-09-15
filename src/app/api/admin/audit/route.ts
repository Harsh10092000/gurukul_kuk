import { NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/audit';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const entity = searchParams.get('entity') || undefined;

    const logs = await getAuditLogs(limit, entity);
    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch audit logs' }, { status: 500 });
  }
}
