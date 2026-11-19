import { SchoolSystemBootstrap } from '../types/schoolConfig';

const DB_SNAPSHOT_KEY = 'danlog_school_db_snapshot_v1';
const PENDING_ENTRIES_KEY = 'danlog_school_pending_entries_v1';

export interface QueuedDbWrite {
  id: string;
  url: string;
  method: 'POST' | 'PATCH';
  headers: Record<string, string>;
  body: unknown;
  createdAt: string;
}

export function saveBootstrapCache(snapshot: SchoolSystemBootstrap): void {
  try {
    window.localStorage.setItem(DB_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota errors in restricted browsing modes
  }
}

export function loadBootstrapCache(): SchoolSystemBootstrap | null {
  try {
    const raw = window.localStorage.getItem(DB_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SchoolSystemBootstrap;
    if (parsed?.frontendConfig?.schoolName) {
      return parsed;
    }
  } catch {
    // Ignore malformed local snapshot
  }
  return null;
}

export function loadPendingDbWrites(): QueuedDbWrite[] {
  try {
    const raw = window.localStorage.getItem(PENDING_ENTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedDbWrite[]) : [];
  } catch {
    return [];
  }
}

export function enqueuePendingDbWrite(
  entry: Omit<QueuedDbWrite, 'id' | 'createdAt'>
): QueuedDbWrite[] {
  const existing = loadPendingDbWrites();
  const next: QueuedDbWrite[] = [
    ...existing,
    {
      ...entry,
      id: `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    },
  ];
  try {
    window.localStorage.setItem(PENDING_ENTRIES_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}

export function savePendingDbWrites(queue: QueuedDbWrite[]): void {
  try {
    if (queue.length === 0) {
      window.localStorage.removeItem(PENDING_ENTRIES_KEY);
    } else {
      window.localStorage.setItem(PENDING_ENTRIES_KEY, JSON.stringify(queue));
    }
  } catch {
    // Ignore storage errors
  }
}

export async function flushPendingDbWrites(): Promise<{
  synced: number;
  remaining: number;
}> {
  const queue = loadPendingDbWrites();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  const remaining: QueuedDbWrite[] = [];
  let synced = 0;

  for (let i = 0; i < queue.length; i += 1) {
    const item = queue[i];
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          ...item.headers,
        },
        body: JSON.stringify(item.body),
      });
      if (res.ok) {
        synced += 1;
      } else if (res.status === 401 || res.status >= 500) {
        remaining.push(...queue.slice(i));
        break;
      }
    } catch {
      remaining.push(...queue.slice(i));
      break;
    }
  }

  savePendingDbWrites(remaining);
  return { synced, remaining: remaining.length };
}
