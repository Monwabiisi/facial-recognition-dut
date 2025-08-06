// 1️⃣ Import React hooks and auth context
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// 2️⃣ Dashboard component for authenticated users
export default function Dashboard() {
  // 3️⃣ Get current user from auth context
  const { currentUser } = useAuth();
  
  // 4️⃣ State for attendance tracking (placeholder for future features)
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  // 5️⃣ Placeholder function for starting face detection
  function handleStartDetection() {
    setIsRecording(!isRecording);
    // TODO: This will integrate with MediaPipe for face detection
    console.log('Face detection toggled:', !isRecording);
  }

  // 6️⃣ Placeholder function for marking attendance
  function handleMarkAttendance() {
    setAttendanceCount(prev => prev + 1);
    // TODO: This will save attendance to Firebase database
    console.log('Attendance marked:', attendanceCount + 1);
  }

  return (
    // 7️⃣ Main dashboard container
    <div className="min-h-screen p-6 space-y-6">
      {/* 8️⃣ Welcome header */}
      <div className="glass-card p-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
          Welcome to Your Dashboard
        </h1>
        <p className="text-gray-300 mt-2">
          Hello, {currentUser?.email} - Ready for facial recognition attendance?
        </p>
      </div>

      {/* 9️⃣ Stats cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Attendance count card */}
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-neon-blue mb-2">
            {attendanceCount}
          </div>
          <p className="text-gray-300">Attendance Records</p>
        </div>

        {/* Status card */}
        <div className="glass-card p-6 text-center">
          <div className={`text-3xl font-bold mb-2 ${isRecording ? 'text-green-400' : 'text-gray-400'}`}>
            {isRecording ? 'ACTIVE' : 'INACTIVE'}
          </div>
          <p className="text-gray-300">Detection Status</p>
        </div>

        {/* User info card */}
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-neon-purple mb-2">
            USER
          </div>
          <p className="text-gray-300">Account Type</p>
        </div>
      </div>

      {/* 🔟 Main content area with webcam placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webcam/Detection area */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Face Detection Camera
          </h2>
          
          {/* 1️⃣1️⃣ Webcam placeholder - this will be replaced with MediaPipe */}
          <div className="relative aspect-video bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden">
            {isRecording ? (
              // Active state with animated border
              <div className="w-full h-full bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 flex items-center justify-center border-2 border-neon-blue animate-pulse">
                <div className="text-center">
                  <div className="w-16 h-16 bg-neon-blue rounded-full mx-auto mb-4 animate-ping"></div>
                  <p className="text-white font-semibold">Camera Active</p>
                  <p className="text-gray-300 text-sm">Scanning for faces...</p>
                </div>
              </div>
            ) : (
              // Inactive state
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-400 font-semibold">Camera Inactive</p>
                <p className="text-gray-500 text-sm">Click "Start Detection" to begin</p>
              </div>
            )}
          </div>

          {/* 1️⃣2️⃣ Control buttons */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={handleStartDetection}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'neon-button'
              }`}
            >
              {isRecording ? 'Stop Detection' : 'Start Detection'}
            </button>
            
            <button
              onClick={handleMarkAttendance}
              disabled={!isRecording}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                isRecording 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Mark Attendance
            </button>
          </div>
        </div>

        {/* 1️⃣3️⃣ Activity log/Recent activity */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Recent Activity
          </h2>
          
          <div className="space-y-3">
            {/* Placeholder activity items */}
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white bg-opacity-5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-neon-blue rounded-full"></div>
                  <div>
                    <p className="text-white text-sm">System Ready</p>
                    <p className="text-gray-400 text-xs">
                      {new Date().toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <span className="text-green-400 text-xs">✓</span>
              </div>
            ))}
          </div>
          
          {/* 1️⃣4️⃣ Future features note */}
          <div className="mt-6 p-4 bg-neon-blue bg-opacity-10 rounded-lg border border-neon-blue border-opacity-30">
            <h3 className="text-neon-blue font-semibold mb-2">Coming Soon:</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Real-time face detection with MediaPipe</li>
              <li>• Automatic attendance logging</li>
              <li>• Face recognition database</li>
              <li>• Attendance reports and analytics</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 