import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import StatsCard from '../components/StatsCard';
import AttendanceChart from '../components/AttendanceChart';
import { downloadCsv } from '../utils/csv';

interface AnalyticsData {
  totalStudents: number;
  presentToday: number;
  attendanceRate: number;
  weeklyTrend: number;
  monthlyData: {
    labels: string[];
    attendance: number[];
    total: number[];
  };
  topPerformers: Array<{
    name: string;
    studentId: string;
    rate: number;
  }>;
  recentActivity: Array<{
    id: string;
    student: string;
    action: string;
    timestamp: Date;
    confidence: number;
  }>;
}

export default function AnalyticsPage() {
  const { user, isTeacher } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'semester'>('month');

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual service
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: AnalyticsData = {
        totalStudents: 156,
        presentToday: 142,
        attendanceRate: 91.2,
        weeklyTrend: 5.3,
        monthlyData: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
          attendance: [134, 142, 138, 145],
          total: [156, 156, 156, 156]
        },
        topPerformers: [
          { name: 'Sarah Johnson', studentId: 'DUT001', rate: 98.5 },
          { name: 'Michael Chen', studentId: 'DUT002', rate: 96.8 },
          { name: 'Priya Patel', studentId: 'DUT003', rate: 95.2 }
        ],
        recentActivity: [
          {
            id: '1',
            student: 'John Doe',
            action: 'Marked Present',
            timestamp: new Date(),
            confidence: 94.5
          },
          {
            id: '2',
            student: 'Jane Smith',
            action: 'Marked Present',
            timestamp: new Date(Date.now() - 300000),
            confidence: 87.2
          }
        ]
      };
      
      setData(mockData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    if (!data) return;
    
    const exportData = data.recentActivity.map(activity => ({
      Student: activity.student,
      Action: activity.action,
      Timestamp: activity.timestamp.toISOString(),
      Confidence: `${activity.confidence}%`
    }));
    
    downloadCsv('dut-attendance-analytics.csv', exportData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-card p-8 text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-cyan-400 font-mono">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-red-400">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-heading gradient-text mb-2">
              📊 ANALYTICS DASHBOARD
            </h1>
            <p className="text-gray-300 font-body">
              Real-time insights and attendance analytics for DUT
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Period Selector */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="cyber-input px-4 py-2 text-sm"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="semester">This Semester</option>
            </select>
            
            {/* Export Button */}
            {isTeacher && (
              <button
                onClick={exportData}
                className="cyber-button px-4 py-2 text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Data
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          icon="👥"
          value={data.totalStudents}
          label="Total Students"
          color="blue"
          animated
        />
        
        <StatsCard
          icon="✅"
          value={data.presentToday}
          label="Present Today"
          color="green"
          trend="up"
          trendValue={`+${data.weeklyTrend}%`}
          animated
        />
        
        <StatsCard
          icon="📈"
          value={`${data.attendanceRate}%`}
          label="Attendance Rate"
          color="purple"
          trend="up"
          trendValue="+2.1%"
          animated
        />
        
        <StatsCard
          icon="🎯"
          value="A+"
          label="Performance Grade"
          color="pink"
          trend="neutral"
          animated
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="xl:col-span-2">
          <AttendanceChart 
            data={data.monthlyData}
            className="h-96"
          />
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Top Performers */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold font-heading text-cyan-400 mb-4 flex items-center gap-2">
              🏆 Top Performers
            </h3>
            <div className="space-y-3">
              {data.topPerformers.map((student, index) => (
                <div key={student.studentId} className="activity-item">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{student.name}</p>
                      <p className="text-gray-400 text-xs">{student.studentId}</p>
                    </div>
                    <div className="text-cyan-400 font-mono font-bold">
                      {student.rate}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold font-heading text-purple-400 mb-4 flex items-center gap-2">
              ⚡ Live Activity
            </h3>
            <div className="space-y-3">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-cyber-pulse"></div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">
                        {activity.student}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {activity.action} • {activity.confidence}% confidence
                      </p>
                      <p className="text-gray-500 text-xs">
                        {activity.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold font-heading text-green-400 mb-4 flex items-center gap-2">
              🔋 System Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Camera Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-cyber-pulse"></div>
                  <span className="text-green-400 font-mono text-sm">ONLINE</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">AI Model</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-cyber-pulse"></div>
                  <span className="text-green-400 font-mono text-sm">LOADED</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Database</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-cyber-pulse"></div>
                  <span className="text-green-400 font-mono text-sm">CONNECTED</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Recognition Speed</span>
                <span className="text-cyan-400 font-mono text-sm">1.2s avg</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}