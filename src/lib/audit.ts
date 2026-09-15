import fs from 'fs';
import path from 'path';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId?: string;
  details: Record<string, any> | string;
  ipAddress?: string;
}

const AUDIT_FILE = path.join(process.cwd(), 'data', 'audit_logs.json');

function ensureAuditStore(): AuditLogEntry[] {
  try {
    const dir = path.dirname(AUDIT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(AUDIT_FILE)) {
      const content = fs.readFileSync(AUDIT_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading audit store:', err);
  }
  return [];
}

function saveAuditStore(logs: AuditLogEntry[]) {
  try {
    const dir = path.dirname(AUDIT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving audit log:', err);
  }
}

export async function recordAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
  const logs = ensureAuditStore();
  const newEntry: AuditLogEntry = {
    ...entry,
    id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
  };

  logs.unshift(newEntry); // Newest first

  // Keep last 2000 entries
  if (logs.length > 2000) {
    logs.length = 2000;
  }

  saveAuditStore(logs);
  console.log(`[AUDIT] [${newEntry.timestamp}] [${newEntry.userRole}: ${newEntry.userName}] ${newEntry.action} on ${newEntry.entity}`);
  return newEntry;
}

export async function getAuditLogs(limit: number = 100, entityFilter?: string): Promise<AuditLogEntry[]> {
  const logs = ensureAuditStore();
  if (entityFilter) {
    return logs.filter((l) => l.entity.toLowerCase() === entityFilter.toLowerCase()).slice(0, limit);
  }
  return logs.slice(0, limit);
}
