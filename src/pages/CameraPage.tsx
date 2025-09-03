import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEnrollmentStatus } from '../hooks/useEnrollmentStatus';
import Camera from '../components/Camera';
import FaceDetectionOverlay from '../components/FaceDetectionOverlay';
import CyberButton from '../components/CyberButton';
import CyberInput from '../components/CyberInput';
import StatsCard from '../components/StatsCard';
import { faceService } from '../services/faceService';

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
  capturedEmbeddings?: number[][];
}

export default function CameraPage() {
  const { user, isTeacher, isStudent } = useAuth();
  const { isEnrolled, loading: enrollmentLoading } = useEnrollmentStatus();
  const [mode, setMode] = useState<'recognize' | 'enroll'>(isTeacher ? 'recognize' : 'enroll');
  const [isActive, setIsActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [faceCount, setFaceCount] = useState(0);

  // Only teachers can mark attendance
  const canMarkAttendance = isTeacher;
  const [recognitionResults, setRecognitionResults] = useState<RecognitionResult[]>([]);
  const [currentRecognition, setCurrentRecognition] = useState<RecognitionResult | null>(null);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData>({
    name: '',
    studentId: '',
    email: '',
  capturedPhotos: [],
  capturedEmbeddings: []
  });
  const [enrollmentStep, setEnrollmentStep] = useState<'form' | 'capture'>('form');
  const [sessionStats, setSessionStats] = useState({
    recognized: 0,
    unknown: 0,
    avgConfidence: 0
  });
  // Refs to prevent counting the same face every frame
  const lastUnknownAtRef = useRef<number>(0);
  const lastRecognizedAtRef = useRef<number>(0);
  const lastRecognizedNameRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastDetectionRef = useRef<any>(null);

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

  const handleFaceDetected = useCallback(async (faces: any[]) => {
    setFaceCount(faces.length);
    setIsScanning(faces.length > 0);
    
    // Store faces data for enrollment
    if (faces.length > 0) {
      // mark scanning active when we have at least one face
      setIsScanning(true);
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

          // If the detection contains an embedding, use server-side embedding recognition helper
          const detection = faces[0];
          let data: any = null;

          if (detection && detection.embedding) {
            // Ensure embedding is a Float32Array
            const emb = detection.embedding;
            const embedding = emb instanceof Float32Array ? emb : new Float32Array(emb);
            data = await faceService.recognizeFaceServer(embedding);
          } else {
            // Fallback: send captured image to server endpoint
            const blob = await faceService.canvasToBlob(canvas);
            const form = new FormData();
            form.append('image', blob, `capture_${Date.now()}.jpg`);

            const resp = await fetch('/api/faces/recognize', {
              method: 'POST',
              body: form
            });

            data = await resp.json();
          }

          if (data && data.recognized) {
            // Normalize confidence: backend may return 0..1 (fraction) or 0..100 (percent)
            let rawConf = data.confidence ?? data.similarity ?? 0;
            let conf = Number(rawConf) || 0;
            if (conf > 0 && conf <= 1) conf = conf * 100; // fraction -> percent
            if (conf > 100) conf = 100; // clamp

            const result: RecognitionResult = {
              name: data.name || data.full_name || data.user_name || '',
              studentId: (data.studentId || data.student_id || data.student || ''),
              confidence: conf,
              timestamp: new Date()
            };

            const now = Date.now();
            // Only count a recognition if:
            // 1. It's a valid recognition (has name, decent confidence)
            // 2. Either it's a different person or enough time has passed
            const shouldCountRecognition = 
              result.name && // Must have a name
              result.confidence > 60 && // Must have decent confidence
              ((lastRecognizedNameRef.current !== result.name) || // Either different person
               (now - lastRecognizedAtRef.current > 2000)); // Or same person after cooldown

            console.debug('Recognition result:', { 
              name: result.name,
              confidence: result.confidence,
              shouldCount: shouldCountRecognition,
              lastRecognized: lastRecognizedNameRef.current,
              timeSinceLastCount: now - lastRecognizedAtRef.current,
              currentRecognized: sessionStats.recognized
            });

            setCurrentRecognition(result);
            if (shouldCountRecognition) {
              lastRecognizedAtRef.current = now;
              lastRecognizedNameRef.current = result.name;
              setRecognitionResults(prev => [result, ...prev.slice(0, 9)]);
              setSessionStats(prev => {
                const newRecognized = prev.recognized + 1;
                return {
                  recognized: newRecognized,
                  unknown: prev.unknown,
                  // Rolling average: ((old_avg * old_count) + new_value) / new_count
                  avgConfidence: ((prev.avgConfidence * prev.recognized) + result.confidence) / newRecognized
                };
              });
              playSound('success');
            } else {
              // Still update the UI but don't increment counter due to cooldown
              console.debug('Recognition ignored for counting due to cooldown');
            }
          } else {
            // Unrecognized face -> clear current recognition so overlay shows Unknown
            setCurrentRecognition(null);
            // Debounce unknown counting so it doesn't increment every frame
            const now = Date.now();
            const UNKNOWN_COOLDOWN_MS = 3000;
            if (now - lastUnknownAtRef.current > UNKNOWN_COOLDOWN_MS) {
              lastUnknownAtRef.current = now;
              setSessionStats(prev => ({
                ...prev,
                unknown: prev.unknown + 1
              }));
              playSound('error');
            } else {
              // For debugging, show when an uncounted unknown occurs
              console.debug('Unknown face detected but not counted (cooldown)');
            }
          }
        } catch (error) {
          console.error('Recognition error:', error);
          setCurrentRecognition(null);
          playSound('error');
        }
  }
      // For enrollment mode
      else if (mode === 'enroll' && enrollmentStep === 'capture') {
        // The face is ready to be captured
        // keep latest detection so capture button can use its embedding
        lastDetectionRef.current = faces[0];
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
    if (!canvasRef.current) {
      console.error("Canvas ref is not available");
      alert("Internal error: Canvas not available");
      return;
    }

    if (!isActive) {
      alert("Please start the camera first");
      return;
    }

    if (!isScanning) {
      alert("Please position your face in front of the camera");
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
      capturedPhotos: [...prev.capturedPhotos, photo],
      // if an embedding is available from the last detection, save it too
      capturedEmbeddings: (() => {
        try {
          const det = lastDetectionRef.current;
            if (det && det.embedding) {
            const raw = det.embedding instanceof Float32Array ? Array.from(det.embedding) : Array.from(new Float32Array(det.embedding));
            const emb = raw.map(v => Number(v)) as number[];
            const cur = prev.capturedEmbeddings || [];
            return [...cur, emb];
          }
        } catch (e) {}
        return prev.capturedEmbeddings || [];
      })()
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
  capturedPhotos: [],
  capturedEmbeddings: []
      });
      alert(`✅ Successfully enrolled ${enrollmentData.name} with ${enrollmentData.capturedPhotos.length} photos!`);
    } catch (error) {
      alert("Failed to complete enrollment. Please try again.");
      console.error("Enrollment error:", error);
    }
  };

  const saveEnrollment = async () => {
    if (!enrollmentData.capturedEmbeddings || enrollmentData.capturedEmbeddings.length === 0) {
      alert('No embeddings captured to enroll. Please capture faces first.');
      return;
    }

    try {
      const userId = Number(enrollmentData.studentId);
      // We'll send each embedding + the first photo as a representative image
      for (let i = 0; i < enrollmentData.capturedEmbeddings.length; i++) {
        const emb = enrollmentData.capturedEmbeddings[i];
        const photo = enrollmentData.capturedPhotos[i] || enrollmentData.capturedPhotos[0];

        // Convert base64 data URL to Blob
        const res = await fetch(photo);
        const blob = await res.blob();

        const floatEmb = new Float32Array(emb);

        await faceService.enrollFace({
          user_id: userId,
          embedding: floatEmb,
          imageBlob: blob,
        });
      }

      alert('Enrollment saved to server successfully');
      // reset
      setEnrollmentStep('form');
      setEnrollmentData({ name: '', studentId: '', email: '', capturedPhotos: [], capturedEmbeddings: [] });
    } catch (e) {
      console.error('Save enrollment failed', e);
      alert('Failed to save enrollment to server');
    }
  };

  const deletePhoto = (index: number) => {
    setEnrollmentData(prev => ({
      ...prev,
      capturedPhotos: prev.capturedPhotos.filter((_, i) => i !== index)
    }));
  };

  const toggleCamera = () => {
    const newActive = !isActive;
    setIsActive(newActive);
    if (newActive) {
      playSound('scan');
    } else {
      // Reset stats when camera turned off
      setSessionStats({
        recognized: 0,
        unknown: 0,
        avgConfidence: 0
      });
      setRecognitionResults([]);
      setCurrentRecognition(null);
      lastRecognizedAtRef.current = 0;
      lastRecognizedNameRef.current = null;
      lastUnknownAtRef.current = 0;
    }
  };

  if (enrollmentLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-300 font-mono">Loading enrollment status...</p>
        </div>
      </div>
    );
  }

  if (isStudent && isEnrolled) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="glass-card p-8 text-center">
          <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold font-heading gradient-text mb-4">
            You're Already Enrolled! 🎉
          </h1>
          <p className="text-gray-300 text-lg mb-6">
            Your face has been registered in the system. You don't need to do anything else - just show up to class and our cameras will automatically mark your attendance!
          </p>
          <div className="bg-white/5 p-4 rounded-xl text-sm text-gray-400 font-mono inline-block">
            Student ID: {user?.studentId}
          </div>
        </div>
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
              📹 FACIAL RECOGNITION CAMERA
            </h1>
            <p className="text-gray-300 font-body">
              {isTeacher ? "Advanced AI-powered attendance tracking system" : "Face Enrollment System"}
            </p>
          </div>
          
          {/* Mode Toggle - Only show for teachers */}
          {isTeacher && (
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
              </div>
            </div>
          )}
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
                      {enrollmentData.capturedEmbeddings && enrollmentData.capturedEmbeddings.length > 0 && (
                        <CyberButton
                          variant="primary"
                          onClick={saveEnrollment}
                        >
                          💾 Save Enrollment
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
              {(isTeacher || (!isTeacher && mode === 'enroll')) ? (
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
          {mode === 'enroll' && enrollmentStep === 'form' && (
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