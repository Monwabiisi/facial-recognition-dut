import React, { useEffect, useState } from 'react';

interface AnalyticsData {
  attendanceRate: number;
  presentToday: number;
  totalStudents: number;
  performanceGrade: string;
  topPerformers: Array<{
    name: string;
    student_id: string;
    attendanceRate: number;
  }>;
  recentActivity: Array<{
    name: string;
    student_id: string;
    timestamp: string;
    status: string;
  }>;
  dailyAttendance: Array<{
    date: string;
    present: number;
    total: number;
  }>;
}

interface AnalyticsDashboardProps {
  refreshTrigger?: number;
}

export default function AnalyticsDashboard({ refreshTrigger }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    attendanceRate: 0,
    presentToday: 0,
    totalStudents: 0,
    performanceGrade: 'F',
    topPerformers: [],
    recentActivity: [],
    dailyAttendance: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/analytics/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        } else {
          throw new Error('Failed to fetch analytics data');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics');
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [refreshTrigger]);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'text-green-400';
      case 'A': return 'text-green-400';
      case 'B': return 'text-blue-400';
      case 'C': return 'text-yellow-400';
      case 'D': return 'text-orange-400';
      default: return 'text-red-400';
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4">Analytics Dashboard</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-gray-400 mt-2">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4">Analytics Dashboard</h2>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">❌ {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4">Analytics Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-cyan-400">{analytics.attendanceRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-400">Attendance Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">{analytics.presentToday}</div>
            <div className="text-sm text-gray-400">Present Today</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">{analytics.totalStudents}</div>
            <div className="text-sm text-gray-400">Total Students</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${getGradeColor(analytics.performanceGrade)}`}>
              {analytics.performanceGrade}
            </div>
            <div className="text-sm text-gray-400">Performance Grade</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4">Top Performers</h3>
          {analytics.topPerformers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">🏆</div>
              <p>No performance data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.topPerformers.map((performer, index) => (
                <div key={performer.student_id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-black font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-mono text-white">{performer.name}</div>
                      <div className="text-sm text-gray-400">{performer.student_id}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-cyan-400">{performer.attendanceRate.toFixed(1)}%</div>
                    <div className="text-xs text-gray-400">attendance</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4">Live Activity</h3>
          {analytics.recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📊</div>
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                  <div>
                    <div className="font-mono text-white">{activity.name}</div>
                    <div className="text-sm text-gray-400">{activity.student_id}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-mono ${
                      activity.status === 'present' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily Attendance Chart */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold mb-4">Daily Attendance Trend</h3>
        {analytics.dailyAttendance.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">📈</div>
            <p>No attendance data available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {analytics.dailyAttendance.slice(-7).map((day, index) => {
              const percentage = day.total > 0 ? (day.present / day.total) * 100 : 0;
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-20 text-sm text-gray-400 font-mono">
                    {new Date(day.date).toLocaleDateString()}
                  </div>
                  <div className="flex-1 bg-black/20 rounded-full h-4 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm text-right font-mono">
                    {day.present}/{day.total} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
