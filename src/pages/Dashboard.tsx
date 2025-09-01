import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import StatsCard from '../components/StatsCard';
import CyberButton from '../components/CyberButton';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recentActivity, setRecentActivity] = useState([
    { id: 1, action: 'System initialized', time: new Date(), status: 'success', student: 'System' },
    { id: 2, action: 'Camera ready', time: new Date(Date.now() - 60000), status: 'success', student: 'System' },
    { id: 3, action: 'User logged in', time: new Date(Date.now() - 120000), status: 'info', student: user?.name || 'User' },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStartDetection = () => {
    setIsRecording(!isRecording);
    
    const newActivity = {
      id: Date.now(),
      action: isRecording ? 'Face detection stopped' : 'Face detection started',
      time: new Date(),
      status: isRecording ? 'warning' : 'success',
      student: user?.name || 'User'
    };
    
    setRecentActivity(prev => [newActivity, ...prev.slice(0, 4)]);
  };

  const handleMarkAttendance = () => {
    const newCount = attendanceCount + 1;
    setAttendanceCount(newCount);
    
    const newActivity = {
      id: Date.now(),
      action: `Attendance marked (#${newCount})`,
      time: new Date(),
      status: 'success',
      student: 'John Doe' // Mock student name
    };
    
    setRecentActivity(prev => [newActivity, ...prev.slice(0, 4)]);
  };

  const getActivityStatus = (status: string) => {
    switch (status) {
      case 'success':
        return { icon: '✅', color: 'text-green-400' };
      case 'warning':
        return { icon: '⚠️', color: 'text-yellow-400' };
      case 'error':
        return { icon: '❌', color: 'text-red-400' };
      default:
        return { icon: 'ℹ️', color: 'text-cyan-400' };
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Welcome Header */}
      <div className="glass-card p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold font-heading gradient-text mb-2">
              WELCOME TO DUT SYSTEM! 🚀
            </h1>
            <p className="text-xl text-gray-300 font-body">
              Hello, <span className="text-cyan-400 font-bold">{user?.name || user?.email}</span>
            </p>
            <p className="text-gray-400 font-mono mt-2">
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} • {currentTime.toLocaleTimeString()}
            </p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/camera">
              <CyberButton
                variant="primary"
                size="lg"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                }
                glowColor="#00F5FF"
              >
                OPEN CAMERA
              </CyberButton>
            </Link>
            
            <Link to="/analytics">
              <CyberButton
                variant="secondary"
                size="lg"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              >
                VIEW ANALYTICS
              </CyberButton>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          icon="📊"
          value={attendanceCount}
          label="Attendance Records"
          color="blue"
          animated
        />

        <StatsCard
          icon={isRecording ? "🔴" : "⚫"}
          value={isRecording ? 'LIVE' : 'OFF'}
          label="Detection Status"
          color={isRecording ? 'green' : 'orange'}
          animated
        />

        <StatsCard
          icon="⏱️"
          value="2.5h"
          label="Session Time"
          color="purple"
          trend="up"
          trendValue="+15min"
          animated
        />

        <StatsCard
          icon={isAdmin ? "👑" : "👤"}
          value={isAdmin ? 'ADMIN' : 'USER'}
          label="Access Level"
          color={isAdmin ? 'orange' : 'pink'}
          animated
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Face Detection Area */}
        <div className="xl:col-span-2 space-y-6">
          <div className="glass-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold font-heading text-white">
                🎯 FACE DETECTION CONTROL CENTER
              </h2>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-green-400 animate-cyber-pulse' : 'bg-gray-500'}`}></div>
                <span className="text-sm font-mono text-gray-400">
                  {isRecording ? 'RECORDING' : 'STANDBY'}
                </span>
              </div>
            </div>
            
            {/* Camera Viewport */}
            <div className="relative aspect-video bg-black rounded-2xl border-2 border-white/10 overflow-hidden group">
              {isRecording ? (
                <div className="w-full h-full bg-gradient-to-br from-cyan-400/10 to-purple-500/10 flex items-center justify-center relative">
                  {/* Scanning Animation */}
                  <div className="absolute inset-0">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan"></div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent animate-scan" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute right-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent animate-scan" style={{ animationDelay: '1.5s' }}></div>
                  </div>
                  
                  {/* Center Content */}
                  <div className="text-center z-10">
                    <div className="w-24 h-24 bg-cyan-400/30 rounded-full mx-auto mb-4 flex items-center justify-center animate-cyber-pulse">
                      <div className="w-16 h-16 bg-cyan-400 rounded-full animate-glow"></div>
                    </div>
                    <p className="text-white font-bold font-heading text-xl mb-2">CAMERA ACTIVE</p>
                    <p className="text-gray-300 font-mono">SCANNING FOR FACES...</p>
                  </div>
                  
                  {/* Corner Indicators */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-cyan-400"></div>
                  <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-cyan-400"></div>
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-cyan-400"></div>
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-cyan-400"></div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:bg-gray-600 transition-colors">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 font-bold font-heading text-xl mb-2">CAMERA INACTIVE</p>
                    <p className="text-gray-500 font-mono">CLICK START TO BEGIN</p>
                  </div>
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <CyberButton
                onClick={handleStartDetection}
                variant={isRecording ? 'danger' : 'primary'}
                size="lg"
                fullWidth
                icon={
                  isRecording ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l.414.414c.187.187.293.442.293.707V13M15 10h-1.586a1 1 0 00-.707.293l-.414.414A1 1 0 0012 11.414V13" />
                    </svg>
                  )
                }
                glowColor={isRecording ? '#ff0000' : '#00F5FF'}
              >
                {isRecording ? 'STOP DETECTION' : 'START DETECTION'}
              </CyberButton>
              
              <CyberButton
                onClick={handleMarkAttendance}
                disabled={!isRecording}
                variant="secondary"
                size="lg"
                fullWidth
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                MARK ATTENDANCE
              </CyberButton>
            </div>
          </div>
        </div>

        {/* Activity Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold font-heading text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              RECENT ACTIVITY
            </h3>
            
            <div className="space-y-3">
              {recentActivity.map((activity) => {
                const statusInfo = getActivityStatus(activity.status);
                return (
                  <div key={activity.id} className="activity-item">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-lg">{statusInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-mono text-sm font-medium">
                          {activity.action}
                        </p>
                        <p className="text-gray-400 font-mono text-xs mt-1">
                          {activity.student} • {activity.time.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* System Status */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold font-heading text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              SYSTEM STATUS
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm font-mono">AI MODEL</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-cyber-pulse"></div>
                  <span className="text-green-400 font-mono text-sm">LOADED</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm font-mono">DATABASE</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-cyber-pulse"></div>
                  <span className="text-green-400 font-mono text-sm">CONNECTED</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm font-mono">CAMERA</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-green-400 animate-cyber-pulse' : 'bg-gray-500'}`}></div>
                  <span className={`font-mono text-sm ${isRecording ? 'text-green-400' : 'text-gray-400'}`}>
                    {isRecording ? 'ACTIVE' : 'STANDBY'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm font-mono">RESPONSE TIME</span>
                <span className="text-cyan-400 font-mono text-sm">1.2s avg</span>
              </div>
            </div>
          </div>

          {/* Coming Soon Features */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold font-heading text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              FUTURE FEATURES
            </h3>
            
            <div className="space-y-4">
              {[
                { icon: '🤖', title: 'Advanced AI Recognition', desc: 'Next-gen ML models' },
                { icon: '📱', title: 'Mobile App Integration', desc: 'iOS & Android support' },
                { icon: '🔔', title: 'Smart Notifications', desc: 'Real-time alerts' },
                { icon: '🌐', title: 'Cloud Sync', desc: 'Multi-campus support' }
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
                  <span className="text-2xl">{feature.icon}</span>
                  <div>
                    <p className="text-white font-mono font-medium text-sm">{feature.title}</p>
                    <p className="text-gray-400 font-mono text-xs">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}