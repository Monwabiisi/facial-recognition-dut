import React, { useEffect, useState } from 'react';
import CyberButton from './CyberButton';

interface User {
  id: number;
  student_id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

interface FaceEmbedding {
  id: number;
  user_id: number;
  image_path: string;
  confidence: number;
  created_at: string;
}

interface AttendanceRecord {
  id: number;
  session_id: number;
  user_id: number;
  timestamp: string;
  status: string;
  confidence?: number;
  class_name?: string;
}

interface UserProfileModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ user, isOpen, onClose }: UserProfileModalProps) {
  const [faceEmbeddings, setFaceEmbeddings] = useState<FaceEmbedding[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isOpen) return;

    const fetchUserData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch user's face embeddings
        const facesResponse = await fetch(`/api/user/faces?userId=${user.id}`, { headers });
        if (facesResponse.ok) {
          const facesData = await facesResponse.json();
          setFaceEmbeddings(facesData.faces || []);
        }

        // Fetch user's attendance records
        const attendanceResponse = await fetch(`/api/user/attendance/${user.id}`, { headers });
        if (attendanceResponse.ok) {
          const attendanceData = await attendanceResponse.json();
          setAttendanceRecords(attendanceData.records || []);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, isOpen]);

  const calculateAttendanceStats = () => {
    const totalSessions = attendanceRecords.length;
    const presentSessions = attendanceRecords.filter(r => r.status === 'present').length;
    const attendanceRate = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0;
    
    let performanceGrade = 'F';
    if (attendanceRate >= 90) performanceGrade = 'A+';
    else if (attendanceRate >= 80) performanceGrade = 'A';
    else if (attendanceRate >= 70) performanceGrade = 'B';
    else if (attendanceRate >= 60) performanceGrade = 'C';
    else if (attendanceRate >= 50) performanceGrade = 'D';

    return {
      totalSessions,
      presentSessions,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      performanceGrade
    };
  };

  const deleteFaceEmbedding = async (embeddingId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/user/faces/${embeddingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setFaceEmbeddings(prev => prev.filter(f => f.id !== embeddingId));
      } else {
        setError('Failed to delete face embedding');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete face embedding');
    }
  };

  if (!isOpen || !user) return null;

  const stats = calculateAttendanceStats();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-[#0f172a] to-[#051025] rounded-xl border border-cyan-500/30 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">User Profile</h2>
              <p className="text-gray-400">Viewing profile for {user.name}</p>
            </div>
            <CyberButton onClick={onClose} variant="secondary">
              ✕ Close
            </CyberButton>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading user data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-400">❌ {error}</p>
            </div>
          )}

          {!loading && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold mb-4">User Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Name</label>
                    <p className="text-white font-mono">{user.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Student ID</label>
                    <p className="text-white font-mono">{user.student_id}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Email</label>
                    <p className="text-white font-mono">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Role</label>
                    <p className="text-white font-mono capitalize">{user.role}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Member Since</label>
                    <p className="text-white font-mono">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold mb-4">Attendance Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-cyan-400">{stats.attendanceRate}%</div>
                    <div className="text-sm text-gray-400">Attendance Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">{stats.presentSessions}</div>
                    <div className="text-sm text-gray-400">Present Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">{stats.totalSessions}</div>
                    <div className="text-sm text-gray-400">Total Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400">{stats.performanceGrade}</div>
                    <div className="text-sm text-gray-400">Performance Grade</div>
                  </div>
                </div>
              </div>

              {/* Face Embeddings */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Face Embeddings ({faceEmbeddings.length}/6)</h3>
                  <div className="text-sm text-gray-400">
                    {faceEmbeddings.length === 6 ? '✅ Complete' : `⚠️ ${6 - faceEmbeddings.length} remaining`}
                  </div>
                </div>
                
                {faceEmbeddings.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">📷</div>
                    <p>No face embeddings enrolled</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {faceEmbeddings.map((embedding) => (
                      <div key={embedding.id} className="relative group">
                        <div className="aspect-square bg-black/20 rounded-lg border border-cyan-500/30 overflow-hidden">
                          <img
                            src={`/uploads/${embedding.image_path.split('/').pop()}`}
                            alt={`Face ${embedding.id}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
                            }}
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <CyberButton
                            onClick={() => deleteFaceEmbedding(embedding.id)}
                            variant="secondary"
                            className="text-xs px-2 py-1"
                          >
                            🗑️ Delete
                          </CyberButton>
                        </div>
                        <div className="text-xs text-center mt-1 text-gray-400">
                          {(embedding.confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attendance Logs */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold mb-4">Attendance History</h3>
                
                {attendanceRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">📊</div>
                    <p>No attendance records found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 border-b border-white/10">
                          <th className="text-left py-2 px-3">Date/Time</th>
                          <th className="text-left py-2 px-3">Session</th>
                          <th className="text-left py-2 px-3">Status</th>
                          <th className="text-left py-2 px-3">Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceRecords.slice(0, 20).map((record) => (
                          <tr key={record.id} className="border-b border-white/5">
                            <td className="py-2 px-3 text-white font-mono">
                              {new Date(record.timestamp).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-gray-300">
                              {record.class_name || `Session ${record.session_id}`}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded text-xs font-mono ${
                                record.status === 'present' 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-300">
                              {record.confidence ? `${(record.confidence * 100).toFixed(1)}%` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {attendanceRecords.length > 20 && (
                      <div className="text-center mt-4 text-gray-400">
                        Showing 20 of {attendanceRecords.length} records
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
