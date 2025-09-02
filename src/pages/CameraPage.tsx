import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Camera from '../components/Camera';
import FaceDetectionOverlay from '../components/FaceDetectionOverlay';
import CyberButton from '../components/CyberButton';
import CyberInput from '../components/CyberInput';
import StatsCard from '../components/StatsCard';

interface RecognitionResult {
  name: string;
  studentId: string;
  confidence: number;
  timestamp: Date;
}

interface EnrollmentData {
  name: string;
  studentId: string;
  email: string;
  capturedPhotos: string[]; // base64 encoded photos
}

export default function CameraPage() {
  const { user, isTeacher, isStudent } = useAuth();
  const [mode, setMode] = useState<'recognize' | 'enroll'>('recognize');
  const [isActive, setIsActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [faceCount, setFaceCount] = useState(0);

  // Prevent students from manually marking attendance
  const canMarkAttendance = !isStudent;
  const [recognitionResults, setRecognitionResults] = useState<RecognitionResult[]>([]);
  const [currentRecognition, setCurrentRecognition] = useState<RecognitionResult | null>(null);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData>({
    name: '',
    studentId: '',
    email: '',
    capturedPhotos: []
  });
  const [enrollmentStep, setEnrollmentStep] = useState<'form' | 'capture'>('form');
  const [sessionStats, setSessionStats] = useState({
    recognized: 0,
    unknown: 0,
    avgConfidence: 0
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Play sound effects
  const playSound = useCallback((type: 'success' | 'error' | 'scan') => {
    if (!audioRef.current) return;
    
    // Create different tones for different actions
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    switch (type) {
      case 'success':
        oscillator.frequency.setValueAtTime(800, context.currentTime);
        oscillator.frequency.setValueAtTime(1000, context.currentTime + 0.1);
        break;
      case 'error':
        oscillator.frequency.setValueAtTime(300, context.currentTime);
        break;
      case 'scan':
        oscillator.frequency.setValueAtTime(600, context.currentTime);
        break;
    }
    
    gainNode.gain.setValueAtTime(0.1, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.3);
  }, []);

  const handleFaceDetected = useCallback((faces: any[]) => {
    setFaceCount(faces.length);
    setIsScanning(faces.length > 0);
    
    // Store faces data for enrollment
    if (faces.length === 1) {
      // For recognition mode
      if (mode === 'recognize') {
        try {
          const canvas = document.createElement('canvas');
          const video = document.querySelector('video');
          if (!video) return;
          
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          // Draw current frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to base64
          const base64Image = canvas.toDataURL('image/jpeg');
          
          // Send to backend for recognition
          fetch('/api/recognize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: base64Image
            })
          })
          .then(response => response.json())
          .then(data => {
            if (data.recognized) {
              const result: RecognitionResult = {
                name: data.name,
                studentId: data.studentId,
                confidence: data.confidence,
                timestamp: new Date()
              };

              setCurrentRecognition(result);
              setRecognitionResults(prev => [result, ...prev.slice(0, 9)]);
              setSessionStats(prev => ({
                recognized: prev.recognized + 1,
                unknown: prev.unknown,
                avgConfidence: (prev.avgConfidence + result.confidence) / 2
              }));
              
              playSound('success');
            } else {
              setCurrentRecognition(null);
              setSessionStats(prev => ({
                ...prev,
                unknown: prev.unknown + 1
              }));
              playSound('error');
            }
          })
          .catch(error => {
            console.error('Recognition error:', error);
            setCurrentRecognition(null);
            playSound('error');
          });
        } catch (error) {
          console.error('Recognition error:', error);
          setCurrentRecognition(null);
          playSound('error');
        }
      }
      // For enrollment mode
      else if (mode === 'enroll' && enrollmentStep === 'capture') {
        // The face is ready to be captured
        setIsScanning(true);
      }
    } else {
      setIsScanning(false);
    }
  }, [mode, playSound, enrollmentStep]);

  const startEnrollment = () => {
    if (!enrollmentData.name || !enrollmentData.studentId || !enrollmentData.email) {
      return;
    }
    setEnrollmentStep('capture');
  };

  const handleEnrollmentCapture = () => {
    if (!canvasRef.current || !isActive || !isScanning) {
      alert("Please ensure your face is properly detected before capturing");
      return;
    }

    if (enrollmentData.capturedPhotos.length >= 6) {
      alert("Maximum number of photos (6) has been reached");
      return;
    }

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    // Capture the current frame
    const video = document.querySelector('video');
    if (!video) return;

    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    // Convert to base64
    const photo = canvasRef.current.toDataURL('image/jpeg');
    
    setEnrollmentData(prev => ({
      ...prev,
      capturedPhotos: [...prev.capturedPhotos, photo]
    }));

    playSound('success');

    // If we have 6 photos, automatically trigger completion
    if (enrollmentData.capturedPhotos.length === 5) {
      setTimeout(() => {
        completeEnrollment();
      }, 500);
    }
  };

  const completeEnrollment = () => {
    // Validation
    if (enrollmentData.capturedPhotos.length < 6) {
      alert("Please capture all 6 required photos before completing enrollment");
      return;
    }

    // Here you would normally send the data to your backend
    try {
      // TODO: Send enrollment data to backend
      
      // Reset the form and show success message
      setEnrollmentStep('form');
      setEnrollmentData({
        name: '',
        studentId: '',
        email: '',
        capturedPhotos: []
      });
      alert(`✅ Successfully enrolled ${enrollmentData.name} with ${enrollmentData.capturedPhotos.length} photos!`);
    } catch (error) {
      alert("Failed to complete enrollment. Please try again.");
      console.error("Enrollment error:", error);
    }
  };

  const deletePhoto = (index: number) => {
    setEnrollmentData(prev => ({
      ...prev,
      capturedPhotos: prev.capturedPhotos.filter((_, i) => i !== index)
    }));
  };

  const toggleCamera = () => {
    setIsActive(!isActive);
    if (!isActive) {
      playSound('scan');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-heading gradient-text mb-2">
              📹 FACIAL RECOGNITION CAMERA
            </h1>
            <p className="text-gray-300 font-body">
              Advanced AI-powered attendance tracking system
            </p>
          </div>
          
          {/* Mode Toggle */}
          <div className="flex items-center gap-4">
            <div className="bg-white/5 rounded-xl p-1 flex">
              <button
                onClick={() => setMode('recognize')}
                className={`px-4 py-2 rounded-lg font-mono text-sm transition-all duration-300 ${
                  mode === 'recognize'
                    ? 'bg-cyan-400 text-black shadow-lg'
                    : 'text-cyan-400 hover:bg-white/10'
                }`}
              >
                🔍 RECOGNIZE
              </button>
              {isTeacher && (
                <button
                  onClick={() => setMode('enroll')}
                  className={`px-4 py-2 rounded-lg font-mono text-sm transition-all duration-300 ${
                    mode === 'enroll'
                      ? 'bg-purple-400 text-black shadow-lg'
                      : 'text-purple-400 hover:bg-white/10'
                  }`}
                >
                  👤 ENROLL
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          icon="✅"
          value={sessionStats.recognized}
          label="Recognized Today"
          color="green"
        />
        
        <StatsCard
          icon="❓"
          value={sessionStats.unknown}
          label="Unknown Faces"
          color="gold"
        />
        
        <StatsCard
          icon="🎯"
          value={`${sessionStats.avgConfidence.toFixed(1)}%`}
          color="blue"
        />
      </div>

      {/* Main Camera Interface */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Camera Feed */}
        <div className="xl:col-span-2">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold font-heading text-white">
                {mode === 'recognize' ? '🔍 LIVE RECOGNITION' : '👤 FACE ENROLLMENT'}
              </h2>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-400 animate-cyber-pulse' : 'bg-gray-500'}`}></div>
                <span className="text-sm font-mono text-gray-400">
                  {isActive ? 'ACTIVE' : 'STANDBY'}
                </span>
              </div>
            </div>

            {/* Camera Container */}
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border-2 border-white/10">
              <Camera
                onFaceDetected={handleFaceDetected}
                isActive={isActive}
              />
              
              {/* Face Detection Overlay */}
              <FaceDetectionOverlay
                isScanning={isScanning}
                confidence={currentRecognition?.confidence || 0}
                recognizedUser={currentRecognition ? {
                  name: currentRecognition.name,
                  studentId: currentRecognition.studentId
                } : null}
                faceCount={faceCount}
              />

              {/* Enrollment Overlay */}
              {mode === 'enroll' && enrollmentStep === 'capture' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="glass-card p-8 text-center max-w-md">
                    <div className="w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-cyber-pulse">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      Enrolling: {enrollmentData.name}
                    </h3>
                    <div className="mb-4">
                      <p className="text-cyan-400 font-mono">
                        {enrollmentData.capturedPhotos.length}/6 photos captured
                      </p>
                      {enrollmentData.capturedPhotos.length < 6 && (
                        <p className="text-gray-300 text-sm mt-1">
                          Position your face in the center and look directly at the camera
                        </p>
                      )}
                    </div>

                    {/* Captured Photos Grid */}
                    {enrollmentData.capturedPhotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {enrollmentData.capturedPhotos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo}
                              alt={`Capture ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg border border-white/10"
                            />
                            <button
                              onClick={() => deletePhoto(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <CyberButton
                        variant="primary"
                        onClick={handleEnrollmentCapture}
                        disabled={!isActive || faceCount === 0 || enrollmentData.capturedPhotos.length >= 6}
                      >
                        📸 Capture Face ({6 - enrollmentData.capturedPhotos.length} remaining)
                      </CyberButton>
                      {enrollmentData.capturedPhotos.length > 0 && (
                        <CyberButton
                          variant="success"
                          onClick={completeEnrollment}
                        >
                          ✅ Complete
                        </CyberButton>
                      )}
                      <CyberButton
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm('Are you sure? This will discard all captured photos.')) {
                            setEnrollmentStep('form');
                            setEnrollmentData(prev => ({ ...prev, capturedPhotos: [] }));
                          }
                        }}
                      >
                        Cancel
                      </CyberButton>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="mt-6 flex items-center justify-center gap-4">
              {canMarkAttendance ? (
                <CyberButton
                  variant={isActive ? 'danger' : 'primary'}
                  size="lg"
                  onClick={toggleCamera}
                  icon={
                    isActive ? (
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
                  glowColor={isActive ? '#ff0000' : '#00F5FF'}
                >
                  {isActive ? 'STOP CAMERA' : 'START CAMERA'}
                </CyberButton>
              ) : (
                <div className="text-gray-400 text-sm font-mono">
                  ⚠️ Students cannot manually mark attendance
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="space-y-6">
          {/* Enrollment Form */}
          {mode === 'enroll' && enrollmentStep === 'form' && isTeacher && (
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold font-heading text-purple-400 mb-4">
                👤 NEW ENROLLMENT
              </h3>
              <div className="space-y-4">
                <CyberInput
                  label="Student Name"
                  value={enrollmentData.name}
                  onChange={(e) => setEnrollmentData(prev => ({ ...prev, name: e.target.value }))}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />
                
                <CyberInput
                  label="Student ID"
                  value={enrollmentData.studentId}
                  onChange={(e) => setEnrollmentData(prev => ({ ...prev, studentId: e.target.value }))}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  }
                />
                
                <CyberInput
                  label="Email Address"
                  type="email"
                  value={enrollmentData.email}
                  onChange={(e) => setEnrollmentData(prev => ({ ...prev, email: e.target.value }))}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  }
                />
                
                <CyberButton
                  variant="primary"
                  fullWidth
                  onClick={startEnrollment}
                  disabled={!enrollmentData.name || !enrollmentData.studentId || !enrollmentData.email}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  }
                >
                  START ENROLLMENT
                </CyberButton>
              </div>
            </div>
          )}

          {/* Recognition Results */}
          {mode === 'recognize' && (
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold font-heading text-cyan-400 mb-4 flex items-center gap-2">
                🎯 RECOGNITION RESULTS
              </h3>
              
              {currentRecognition ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-bold">{currentRecognition.name}</p>
                      <p className="text-green-400 text-sm font-mono">{currentRecognition.studentId}</p>
                      <p className="text-gray-400 text-xs">
                        {currentRecognition.confidence.toFixed(1)}% confidence
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <p className="font-mono">Waiting for face detection...</p>
                </div>
              )}
              
              {/* Recent Results */}
              {recognitionResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-mono text-gray-400 uppercase tracking-wider">Recent Activity</h4>
                  {recognitionResults.slice(0, 5).map((result, index) => (
                    <div key={index} className="activity-item">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-cyber-pulse"></div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-semibold">{result.name}</p>
                          <p className="text-gray-400 text-xs">{result.studentId}</p>
                        </div>
                        <div className="text-green-400 font-mono text-xs">
                          {result.confidence.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* System Status */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold font-heading text-green-400 mb-4 flex items-center gap-2">
              🔋 SYSTEM STATUS
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Camera Feed</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-cyber-pulse' : 'bg-gray-500'}`}></div>
                  <span className={`font-mono text-sm ${isActive ? 'text-green-400' : 'text-gray-400'}`}>
                    {isActive ? 'ONLINE' : 'OFFLINE'}
                  </span>
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
                <span className="text-gray-300 text-sm">Face Detection</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${faceCount > 0 ? 'bg-green-400 animate-cyber-pulse' : 'bg-gray-500'}`}></div>
                  <span className={`font-mono text-sm ${faceCount > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                    {faceCount} FACES
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Processing Speed</span>
                <span className="text-cyan-400 font-mono text-sm">1.2s avg</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold font-heading text-orange-400 mb-4">
              ⚡ QUICK ACTIONS
            </h3>
            <div className="space-y-3">
              <CyberButton
                variant="secondary"
                fullWidth
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                }
              >
                Export Session Data
              </CyberButton>
              
              <CyberButton
                variant="ghost"
                fullWidth
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              >
                Camera Settings
              </CyberButton>
              
              <CyberButton
                variant="ghost"
                fullWidth
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                Help & Support
              </CyberButton>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden elements */}
      <audio ref={audioRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}