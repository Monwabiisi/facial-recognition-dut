import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CyberButton from '../components/CyberButton';
import CyberInput from '../components/CyberInput';
import DUTLogo from '../components/DUTLogo';

type User = {
  id: number;
  student_id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
};

type AttendanceRecord = {
  id: number;
  session_id: number;
  user_id: number;
  name?: string;
  class_name?: string;
  timestamp?: string;
  status?: string;
  confidence?: number;
};

const POLL_INTERVAL = 5000;

export default function AdminDashboard(): JSX.Element {
  const { user, isTeacher } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Record<number, boolean>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTeacher) return;
    let mounted = true;
    async function fetchAll() {
      setLoading(true);
      try {
        const [uRes, aRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/attendance/sessions')
        ]);

        if (!uRes.ok) throw new Error('Failed to load users');
        if (!aRes.ok) throw new Error('Failed to load sessions');

        const uData = await uRes.json();
        const sessions = await aRes.json();

        // Flatten session list into attendance placeholder rows (lightweight approach)
        const attendanceRows: AttendanceRecord[] = [];
        for (const s of sessions) {
          // Attempt to fetch records for each session but keep it light (first page)
          try {
            const recRes = await fetch(`/api/attendance/records/${s.id}`);
            if (recRes.ok) {
              const recs = await recRes.json();
              for (const r of recs) {
                attendanceRows.push({
                  id: r.id,
                  session_id: r.session_id,
                  user_id: r.user_id,
                  name: r.name || r.student_id,
                  class_name: s.class_name || s.name || 'Unknown',
                  timestamp: r.timestamp,
                  status: r.status,
                  confidence: r.confidence
                });
              }
            }
          } catch (e) {
            // ignore per-session failures
          }
        }

        if (mounted) {
          setUsers(uData);
          setAttendance(attendanceRows);
          setLastError(null);
        }
      } catch (err: any) {
        if (mounted) setLastError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchAll();
    const id = setInterval(fetchAll, POLL_INTERVAL);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [isTeacher]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => (u.name + ' ' + u.email + ' ' + u.student_id).toLowerCase().includes(q));
  }, [users, query]);

  if (!isTeacher) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass-card p-10 text-center max-w-xl">
          <DUTLogo size="lg" />
          <h2 className="text-2xl font-bold mt-4">Access denied</h2>
          <p className="mt-2 text-gray-300">You must be an administrator to view this page.</p>
        </div>
      </div>
    );
  }

  const toggleSelect = (id: number) => {
    setSelectedUsers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const bulkApprove = async () => {
    const ids = Object.entries(selectedUsers).filter(([_, v]) => v).map(([k]) => Number(k));
    if (!ids.length) return;
    setLoading(true);
    try {
      // Try a bulk endpoint first
      const res = await fetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'approve' })
      });
      if (!res.ok) {
        // Fallback to per-user approve
        for (const id of ids) {
          await fetch(`/api/users/${id}/approve`, { method: 'POST' });
        }
      }
      // refresh
      const ures = await fetch('/api/users');
      if (ures.ok) setUsers(await ures.json());
    } catch (err) {
      setLastError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = (rows: any[], filename = 'export.csv') => {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-[#0f172a] to-[#051025] text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <DUTLogo size="md" />
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-gray-400">Welcome back, {user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CyberInput value={query} onChange={(e:any) => setQuery(e.target.value)} placeholder="Search users..." />
            <CyberButton onClick={() => exportCSV(users, 'users.csv')}>Export Users</CyberButton>
            <CyberButton onClick={() => exportCSV(attendance, 'attendance.csv')}>Export Attendance</CyberButton>
          </div>
        </header>

        {/* Overview cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <h3 className="text-sm text-gray-300">Total Users</h3>
            <p className="text-3xl font-bold">{users.length}</p>
          </div>
          <div className="glass-card p-4">
            <h3 className="text-sm text-gray-300">Pending Approvals</h3>
            <p className="text-3xl font-bold">{users.filter(u => u.role === 'pending').length}</p>
          </div>
          <div className="glass-card p-4">
            <h3 className="text-sm text-gray-300">Attendance Records</h3>
            <p className="text-3xl font-bold">{attendance.length}</p>
          </div>
          <div className="glass-card p-4">
            <h3 className="text-sm text-gray-300">Last Updated</h3>
            <p className="text-3xl font-bold">{new Date().toLocaleTimeString()}</p>
          </div>
        </section>

        {/* Pending approvals + bulk actions */}
        <section className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">User Management</h2>
            <div className="flex items-center gap-2">
              <CyberButton onClick={bulkApprove} disabled={loading}>Bulk Approve</CyberButton>
              <CyberButton onClick={() => exportCSV(filteredUsers, 'users_filtered.csv')}>Export</CyberButton>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto text-left">
              <thead>
                <tr className="text-sm text-gray-400">
                  <th className="px-3 py-2">Select</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Student ID</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className="border-t border-white/5">
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={!!selectedUsers[u.id]} onChange={() => toggleSelect(u.id)} />
                    </td>
                    <td className="px-3 py-2">{u.name}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{u.student_id}</td>
                    <td className="px-3 py-2">{u.role}</td>
                    <td className="px-3 py-2">{u.created_at ?? '-'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <CyberButton onClick={async () => {
                          try {
                            await fetch(`/api/users/${u.id}/approve`, { method: 'POST' });
                            const res = await fetch('/api/users');
                            if (res.ok) setUsers(await res.json());
                          } catch (e) { setLastError((e as Error).message); }
                        }}>Approve</CyberButton>
                        <CyberButton onClick={async () => {
                          try {
                            await fetch(`/api/users/${u.id}/reject`, { method: 'POST' });
                            const res = await fetch('/api/users');
                            if (res.ok) setUsers(await res.json());
                          } catch (e) { setLastError((e as Error).message); }
                        }} variant="secondary">Reject</CyberButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Attendance review */}
        <section className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Attendance Review</h2>
            <div className="flex items-center gap-2">
              <CyberButton onClick={() => exportCSV(attendance, 'attendance_all.csv')}>Export All</CyberButton>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto text-left">
              <thead>
                <tr className="text-sm text-gray-400">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Confidence</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map(a => (
                  <tr key={a.id} className="border-t border-white/5">
                    <td className="px-3 py-2">{a.name}</td>
                    <td className="px-3 py-2">{a.class_name}</td>
                    <td className="px-3 py-2">{a.timestamp}</td>
                    <td className="px-3 py-2">{a.status}</td>
                    <td className="px-3 py-2">{(a.confidence ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <CyberButton onClick={async () => {
                          try {
                            await fetch('/api/attendance/record', { method: 'POST', body: JSON.stringify({ session_id: a.session_id, user_id: a.user_id, status: 'present' }), headers: { 'Content-Type': 'application/json' } });
                            setLastError(null);
                          } catch (e) { setLastError((e as Error).message); }
                        }}>Mark Present</CyberButton>
                        <CyberButton variant="secondary" onClick={async () => {
                          try {
                            await fetch('/api/attendance/record', { method: 'POST', body: JSON.stringify({ session_id: a.session_id, user_id: a.user_id, status: 'absent' }), headers: { 'Content-Type': 'application/json' } });
                          } catch (e) { setLastError((e as Error).message); }
                        }}>Mark Absent</CyberButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* System analytics placeholder */}
        <section className="glass-card p-4">
          <h2 className="text-lg font-bold mb-4">System Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-black/20 rounded">Usage chart placeholder</div>
            <div className="p-4 bg-black/20 rounded">Attendance trends placeholder</div>
            <div className="p-4 bg-black/20 rounded">Top flagged students placeholder</div>
          </div>
        </section>

        {/* Audit logs */}
        <section className="glass-card p-4">
          <h2 className="text-lg font-bold mb-4">Audit Logs</h2>
          <div className="text-sm text-gray-300">Audit logging is enabled in the server and will appear here when available.</div>
        </section>

        {lastError && (
          <div className="text-red-400">{lastError}</div>
        )}
      </div>
    </div>
  );
}
