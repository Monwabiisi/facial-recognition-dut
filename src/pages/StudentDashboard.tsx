import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AttendanceStats } from '../components/AttendanceStats';

interface AttendanceRecord {
  sessionId: string;
  timestamp: { toDate: () => Date };
  status: 'present' | 'absent';
}

interface StudentAttendance {
  id: string;
  name: string;
  totalSessions: number;
  presentCount: number;
  percentage: number;
  records: AttendanceRecord[];
}

// Mock service for now - replace with actual service implementation
const attendanceService = {
  async getStudentAttendance(userId: string, classId: string): Promise<StudentAttendance> {
    // This is temporary mock data - replace with actual API call
    return {
      id: userId,
      name: 'Student',
      totalSessions: 10,
      presentCount: 8,
      percentage: 80,
      records: Array.from({ length: 14 }, (_, i) => ({
        sessionId: i.toString(),
        timestamp: { toDate: () => new Date(Date.now() - i * 24 * 60 * 60 * 1000) },
        status: Math.random() > 0.2 ? 'present' as const : 'absent' as const
      }))
    };
  }
};

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>('');
  const [attendance, setAttendance] = React.useState<StudentAttendance | null>(null);

  React.useEffect(() => {
    async function fetchAttendance() {
      if (!currentUser?.uid) return;
      
      try {
        setLoading(true);
        const studentAttendance = await attendanceService.getStudentAttendance(
          currentUser.uid,
          'DEFAULT_CLASS_ID' // TODO: Add class selection
        );
        setAttendance(studentAttendance);
      } catch (err: any) {
        console.error('Error fetching attendance:', err);
        setError(err.message || 'Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    }

    fetchAttendance();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-pulse text-gray-600">Loading attendance data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-interface-error bg-opacity-10 text-interface-error rounded-lg">
        {error}
      </div>
    );
  }

  if (!attendance) {
    return (
      <div className="text-center py-8 text-gray-500">
        No attendance records found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            Welcome, {attendance.name}
          </h1>
          
          {/* Attendance visualization */}
          <AttendanceStats 
            records={attendance.records.map(record => ({
              date: record.timestamp.toDate(),
              present: record.status === 'present',
              sessionId: record.sessionId
            }))}
            title="Your Attendance Overview"
            type="line"
            period="week"
          />
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Attendance History</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {attendance.records.map((record) => (
            <div key={record.sessionId} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {record.timestamp.toDate().toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-500">
                  {record.timestamp.toDate().toLocaleTimeString()}
                </div>
              </div>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${record.status === 'present' 
                    ? 'bg-interface-success bg-opacity-10 text-interface-success' 
                    : 'bg-interface-error bg-opacity-10 text-interface-error'
                  }`}
                >
                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                </span>
              </div>
            </div>
          ))}
          {attendance.records.length === 0 && (
            <div className="px-6 py-4 text-center text-gray-500">
              No attendance records found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
