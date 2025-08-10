// src/services/attendance.ts

export type AttendanceRecord = {
  id: string;           // student id or label
  when: string;         // ISO timestamp
  engine?: string;      // which detection engine used
  device?: string;      // browser/device hint
  session?: string;     // e.g. "CS101-2025-08-08"
};

const KEY = "facelab_attendance_v1";

// load/save helpers
function load(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AttendanceRecord[]) : [];
  } catch {
    return [];
  }
}
function save(data: AttendanceRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

/**
 * Mark student present once per day (prevents easy dup spamming).
 * If you want per-session uniqueness, pass a session string and we’ll dedupe on (id+session) instead of (id+date).
 */
export function markPresent(id: string, engine?: string, session?: string) {
  const all = load();
  const now = new Date();
  const day = now.toISOString().slice(0, 10); // YYYY-MM-DD

  const device = `${navigator.platform || ""} • ${navigator.userAgent || ""}`;

  const already = all.find((r) => {
    const rDay = (r.when || "").slice(0, 10);
    if (session) return r.id === id && r.session === session;
    return r.id === id && rDay === day;
  });

  if (!already) {
    all.push({
      id,
      when: now.toISOString(),
      engine,
      device,
      session,
    });
    save(all);
    return { ok: true, new: true };
  }
  return { ok: true, new: false };
}

export function listAttendance() {
  return load().sort((a, b) => (a.when < b.when ? 1 : -1));
}

export function clearAttendance() {
  save([]);
}
