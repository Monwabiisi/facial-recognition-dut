// 1️⃣ Import React hooks, auth context, and our custom components
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../layout/Layout';
import Button, { ButtonGroup } from '../components/Button';

// 2️⃣ Dashboard component with modern SaaS design
export default function Dashboard() {
  // 3️⃣ Get current user from auth context
  const { currentUser } = useAuth();
  
  // 4️⃣ State for dashboard functionality
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recentActivity, setRecentActivity] = useState([
    { id: 1, action: 'System initialized', time: new Date(), status: 'success' },
    { id: 2, action: 'Camera ready', time: new Date(Date.now() - 60000), status: 'success' },
    { id: 3, action: 'User logged in', time: new Date(Date.now() - 120000), status: 'info' },
  ]);

  // 5️⃣ Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 6️⃣ Handle face detection toggle
  const handleStartDetection = () => {
    setIsRecording(!isRecording);
    
    // Add activity log
    const newActivity = {
      id: Date.now(),
      action: isRecording ? 'Face detection stopped' : 'Face detection started',
      time: new Date(),
      status: isRecording ? 'warning' : 'success'
    };
    
    setRecentActivity(prev => [newActivity, ...prev.slice(0, 4)]);
    
    // TODO: This will integrate with MediaPipe for face detection
    console.log('Face detection toggled:', !isRecording);
  };

  // 7️⃣ Handle attendance marking
  const handleMarkAttendance = () => {
    const newCount = attendanceCount + 1;
    setAttendanceCount(newCount);
    
    // Add activity log
    const newActivity = {
      id: Date.now(),
      action: `Attendance marked (#${newCount})`,
      time: new Date(),
      status: 'success'
    };
    
    setRecentActivity(prev => [newActivity, ...prev.slice(0, 4)]);
    
    // TODO: This will save attendance to Firebase database
    console.log('Attendance marked:', newCount);
  };

  // 8️⃣ Get status color based on recording state
  const getStatusColor = () => {
    return isRecording ? 'text-neon-green' : 'text-gray-400';
  };

  // 9️⃣ Get activity status icon and color
  const getActivityStatus = (status: string) => {
    switch (status) {
      case 'success':
        return { icon: '✅', color: 'text-neon-green' };
      case 'warning':
        return { icon: '⚠️', color: 'text-yellow-400' };
      case 'error':
        return { icon: '❌', color: 'text-red-400' };
      default:
        return { icon: 'ℹ️', color: 'text-neon-blue' };
    }
  };

  return (
    <Layout>
      {/* 🔟 Dashboard container */}
      <div className="space-y-8 animate-fade-in">
        
        {/* Welcome header */}
        <div className="glass-card p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold font-heading gradient-text mb-2">
                Welcome Back! 👋
              </h1>
              <p className="text-gray-300 font-body text-lg">
                Hello, <span className="text-neon-blue font-semibold">{currentUser?.email}</span>
              </p>
              <p className="text-gray-400 font-body mt-1">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} • {currentTime.toLocaleTimeString()}
              </p>
            </div>
            
            {/* Quick actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                size="sm"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              >
                Settings
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                Help
              </Button>
            </div>
          </div>
        </div>

        {/* 1️⃣1️⃣ Stats cards row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Attendance count card */}
          <div className="stats-card group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-neon-blue/20 rounded-xl">
                <svg className="w-6 h-6 text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <span className="text-xs font-body text-gray-400 group-hover:text-gray-300 transition-colors">
                Total
              </span>
            </div>
            <div className="text-3xl font-bold text-neon-blue mb-1">
              {attendanceCount}
            </div>
            <p className="text-gray-300 font-body text-sm">Attendance Records</p>
          </div>

          {/* Status card */}
          <div className="stats-card group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${isRecording ? 'bg-neon-green/20' : 'bg-gray-600/20'}`}>
                <svg className={`w-6 h-6 ${getStatusColor()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-neon-green animate-pulse' : 'bg-gray-500'}`}></div>
            </div>
            <div className={`text-3xl font-bold mb-1 ${getStatusColor()}`}>
              {isRecording ? 'LIVE' : 'OFF'}
            </div>
            <p className="text-gray-300 font-body text-sm">Detection Status</p>
          </div>

          {/* Session time card */}
          <div className="stats-card group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-neon-purple/20 rounded-xl">
                <svg className="w-6 h-6 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-body text-gray-400 group-hover:text-gray-300 transition-colors">
                Today
              </span>
            </div>
            <div className="text-3xl font-bold text-neon-purple mb-1">
              2.5h
            </div>
            <p className="text-gray-300 font-body text-sm">Session Time</p>
          </div>

          {/* User type card */}
          <div className="stats-card group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-neon-pink/20 rounded-xl">
                <svg className="w-6 h-6 text-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-xs font-body text-gray-400 group-hover:text-gray-300 transition-colors">
                Role
              </span>
            </div>
            <div className="text-3xl font-bold text-neon-pink mb-1">
              USER
            </div>
            <p className="text-gray-300 font-body text-sm">Account Type</p>
          </div>
        </div>

        {/* 1️⃣2️⃣ Main content area */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Face detection area */}
          <div className="xl:col-span-2 space-y-6">
            <div className="glass-card p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold font-heading text-white">
                  Face Detection Camera
                </h2>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-neon-green animate-pulse' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-body text-gray-400">
                    {isRecording ? 'Recording' : 'Standby'}
                  </span>
                </div>
              </div>
              
              {/* Camera viewport */}
              <div className="relative aspect-video bg-gray-900 rounded-2xl border-2 border-dashed border-gray-600 overflow-hidden group">
                {isRecording ? (
                  // Active state with animated elements
                  <div className="w-full h-full bg-gradient-to-br from-neon-blue/10 to-neon-purple/10 flex items-center justify-center relative">
                    {/* Scanning animation */}
                    <div className="absolute inset-0">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-blue to-transparent animate-pulse"></div>
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-blue to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
                      <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-neon-blue to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                      <div className="absolute right-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-neon-blue to-transparent animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                    </div>
                    
                    {/* Center content */}
                    <div className="text-center z-10">
                      <div className="w-20 h-20 bg-neon-blue/30 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
                        <div className="w-12 h-12 bg-neon-blue rounded-full animate-ping"></div>
                      </div>
                      <p className="text-white font-semibold font-heading text-lg mb-2">Camera Active</p>
                      <p className="text-gray-300 font-body">Scanning for faces...</p>
                    </div>
                    
                    {/* Corner indicators */}
                    <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-neon-blue"></div>
                    <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-neon-blue"></div>
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-neon-blue"></div>
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-neon-blue"></div>
                  </div>
                ) : (
                  // Inactive state
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:bg-gray-600 transition-colors">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-400 font-semibold font-heading text-lg mb-2">Camera Inactive</p>
                      <p className="text-gray-500 font-body">Click "Start Detection" to begin</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Control buttons */}
              <div className="mt-6">
                <ButtonGroup className="flex-col sm:flex-row">
                  <Button
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
                  >
                    {isRecording ? 'Stop Detection' : 'Start Detection'}
                  </Button>
                  
                  <Button
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
                    Mark Attendance
                  </Button>
                </ButtonGroup>
              </div>
            </div>
          </div>

          {/* 1️⃣3️⃣ Activity sidebar */}
          <div className="space-y-6">
            {/* Recent activity */}
            <div className="glass-card p-6">
              <h3 className="text-xl font-semibold font-heading text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent Activity
              </h3>
              
              <div className="space-y-3">
                {recentActivity.map((activity) => {
                  const statusInfo = getActivityStatus(activity.status);
                  return (
                    <div key={activity.id} className="activity-item">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-lg">{statusInfo.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-body text-sm font-medium">
                            {activity.action}
                          </p>
                          <p className="text-gray-400 font-body text-xs mt-1">
                            {activity.time.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coming soon features */}
            <div className="glass-card p-6">
              <h3 className="text-xl font-semibold font-heading text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Coming Soon
              </h3>
              
              <div className="space-y-4">
                {[
                  { icon: '🤖', title: 'AI Face Recognition', desc: 'Advanced ML models' },
                  { icon: '📊', title: 'Analytics Dashboard', desc: 'Detailed reports' },
                  { icon: '🔔', title: 'Real-time Alerts', desc: 'Instant notifications' },
                  { icon: '📱', title: 'Mobile App', desc: 'iOS & Android support' }
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-2xl">{feature.icon}</span>
                    <div>
                      <p className="text-white font-body font-medium text-sm">{feature.title}</p>
                      <p className="text-gray-400 font-body text-xs">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
