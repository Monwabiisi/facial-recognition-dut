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
  const [mode, setMode] = useState<'recognize' | 'enroll'>(
    isStudent ? 'enroll' : isTeacher ? 'recognize' : 'enroll'
  );
  const [isActive, setIsActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [faceCount, setFaceCount] = useState(0);

  // Only teachers can mark attendance
  const canMarkAttendance = isTeacher;
  const [recognitionResults, setRecognitionResults] = useState<RecognitionResult[]>([]);
  const [currentRecognition, setCurrentRecognition] = useState<RecognitionResult | null>(null);
  const [unknownFaceMessage, setUnknownFaceMessage] = useState<string>('');
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData>({
    name: user?.name || '',
    studentId: user?.student_id || '',
    email: user?.email || '',
    capturedPhotos: [],
    capturedEmbeddings: []
  });
  const [enrolledFacesCount, setEnrolledFacesCount] = useState(0);
  const [currentConfidence, setCurrentConfidence] = useState<number | null>(null);
  // Students skip the form step since their info is already available
  const [enrollmentStep, setEnrollmentStep] = useState<'form' | 'capture'>(
    isStudent ? 'capture' : 'form'
  );
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
  
  // Track recognized students for the current session/day
  const recognizedStudentsToday = useRef<Set<string>>(new Set());
  
  // Track distinct unknown faces using embeddings
  const unknownFaceEmbeddings = useRef<Array<{id: string, embedding: Float32Array, timestamp: number}>>([]); 
  const UNKNOWN_SIMILARITY_THRESHOLD = 0.6; // If similarity > 0.6, consider it the same unknown face

  const audioRef = useRef<HTMLAudioElement>(null);

  // Helper function to calculate cosine similarity between two embeddings
  const calculateCosineSimilarity = useCallback((a: Float32Array, b: Float32Array): number => {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }, []);

  // Check if an unknown face is already tracked
  const isUnknownFaceAlreadyTracked = useCallback((embedding: Float32Array): boolean => {
    return unknownFaceEmbeddings.current.some(unknownFace => {
      const similarity = calculateCosineSimilarity(embedding, unknownFace.embedding);
      return similarity > UNKNOWN_SIMILARITY_THRESHOLD;
    });
  }, [calculateCosineSimilarity, UNKNOWN_SIMILARITY_THRESHOLD]);

  // Reset session counters (useful for new day or manual reset)
  const resetSessionCounters = useCallback(() => {
    recognizedStudentsToday.current.clear();
    unknownFaceEmbeddings.current = [];
    setSessionStats({
      recognized: 0,
      unknown: 0,
      avgConfidence: 0
    });
    setRecognitionResults([]);
    console.log('Session counters reset');
  }, []);

  // Fetch enrolled faces count from database
  useEffect(() => {
    const fetchEnrolledFacesCount = async () => {
      if (!user?.id) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/user/faces', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setEnrolledFacesCount(data.faces?.length || 0);
        }
      } catch (error) {
        console.error('Error fetching enrolled faces count:', error);
      }
    };

    fetchEnrolledFacesCount();
  }, [user?.id]);

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
    
    // Update confidence for real-time display
    if (faces.length > 0) {
      const confidence = faces[0].detection?.score || 0;
      setCurrentConfidence(confidence);
    } else {
      setCurrentConfidence(null);
    }
    
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

            const token = localStorage.getItem('token');
            const resp = await fetch('/api/faces/recognize', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
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
            // 2. This student hasn't been counted today/session yet
            const studentKey = result.studentId || result.name; // Use studentId if available, fallback to name
            const shouldCountRecognition = 
              result.name && // Must have a name
              result.confidence > 60 && // Must have decent confidence
              studentKey && // Must have a unique identifier
              !recognizedStudentsToday.current.has(studentKey); // Haven't counted this student today

            console.debug('Recognition result:', { 
              name: result.name,
              studentId: result.studentId,
              confidence: result.confidence,
              shouldCount: shouldCountRecognition,
              studentKey: studentKey,
              alreadyRecognized: recognizedStudentsToday.current.has(studentKey),
              currentRecognized: sessionStats.recognized
            });

            setCurrentRecognition(result);
            setUnknownFaceMessage(''); // Clear any unknown face message
            if (shouldCountRecognition) {
              // Add this student to the recognized set
              recognizedStudentsToday.current.add(studentKey);
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
              // Still update the UI but don't increment counter since student already counted today
              console.debug('Recognition ignored for counting - student already counted today');
            }
          } else {
            // Unrecognized face -> clear current recognition and show unknown message
            setCurrentRecognition(null);
            setUnknownFaceMessage(data?.message || '❓ Unknown Face');
            
            // Clear the message after 3 seconds
            setTimeout(() => setUnknownFaceMessage(''), 3000);
            
            // Check if this unknown face is distinct from previously seen unknown faces
            const detection = faces[0];
            if (detection && detection.embedding) {
              const embedding = detection.embedding instanceof Float32Array ? 
                detection.embedding : new Float32Array(detection.embedding);
              
              // Only count if this is a new distinct unknown face
              if (!isUnknownFaceAlreadyTracked(embedding)) {
                const now = Date.now();
                const unknownFaceId = `unknown_${now}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Add this unknown face to our tracking
                unknownFaceEmbeddings.current.push({
                  id: unknownFaceId,
                  embedding: embedding,
                  timestamp: now
                });
                
                // Clean up old unknown faces (older than 10 minutes) to prevent memory issues
                const TEN_MINUTES = 10 * 60 * 1000;
                unknownFaceEmbeddings.current = unknownFaceEmbeddings.current.filter(
                  face => now - face.timestamp < TEN_MINUTES
                );
                
                setSessionStats(prev => ({
                  ...prev,
                  unknown: prev.unknown + 1
                }));
                playSound('error');
                
                console.debug('New distinct unknown face detected and counted:', {
                  id: unknownFaceId,
                  totalUnknown: unknownFaceEmbeddings.current.length
                });
              } else {
                console.debug('Unknown face detected but not counted - already seen this face');
              }
            } else {
              // Fallback: if no embedding available, use time-based cooldown as before
              const now = Date.now();
              const UNKNOWN_COOLDOWN_MS = 3000;
              if (now - lastUnknownAtRef.current > UNKNOWN_COOLDOWN_MS) {
                lastUnknownAtRef.current = now;
                setSessionStats(prev => ({
                  ...prev,
                  unknown: prev.unknown + 1
                }));
                playSound('error');
              }
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

    if (Math.max(enrollmentData.capturedPhotos.length, enrolledFacesCount) >= 6) {
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
    if (Math.max(enrollmentData.capturedPhotos.length, enrolledFacesCount) < 6) {
      alert("Please capture all 6 required photos before completing enrollment");
      return;
    }

    // Here you would normally send the data to your backend
    try {
      // TODO: Send enrollment data to backend
      
      // Reset the form and show success message
      // Students stay in capture mode, admins go back to form
      if (isStudent) {
        setEnrollmentData(prev => ({
          ...prev,
          capturedPhotos: [],
          capturedEmbeddings: []
        }));
      } else {
        setEnrollmentStep('form');
        setEnrollmentData({
          name: '',
          studentId: '',
          email: '',
          capturedPhotos: [],
          capturedEmbeddings: []
        });
      }
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
      // For students, use their actual user ID from auth context
      // For admin enrolling others, use the studentId from the form
      const userId = isStudent ? user?.id : Number(enrollmentData.studentId);
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
      // Reset - students stay in capture mode, admins go back to form
      if (isStudent) {
        setEnrollmentData(prev => ({ 
          ...prev, 
          capturedPhotos: [], 
          capturedEmbeddings: [] 
        }));
      } else {
        setEnrollmentStep('form');
        setEnrollmentData({ name: '', studentId: '', email: '', capturedPhotos: [], capturedEmbeddings: [] });
      }
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

  // Show completion banner if student has captured all 6 photos but hasn't completed enrollment
  if (isStudent && (enrollmentData.capturedPhotos.length === 6 || enrolledFacesCount === 6) && !isEnrolled) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="glass-card p-8 text-center">
          <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold font-heading gradient-text mb-4">
            {enrolledFacesCount === 6 ? 'Enrollment Complete! ✅' : 'Enrollment Ready! ✅'}
          </h1>
          <p className="text-gray-300 text-lg mb-6">
            {enrolledFacesCount === 6 
              ? 'You have successfully enrolled all 6 face photos! Your enrollment is complete.'
              : 'You\'ve captured all 6 required face photos! Complete your enrollment to finish the process.'
            }
          </p>
          <div className="flex justify-center gap-4">
            {enrolledFacesCount < 6 && (
              <CyberButton onClick={completeEnrollment} variant="primary">
                Complete Enrollment
              </CyberButton>
            )}
            <CyberButton onClick={() => window.location.href = '/profile'} variant="secondary">
              {enrolledFacesCount === 6 ? 'Manage Profile' : 'Review Photos'}
            </CyberButton>
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
              {isStudent ? "👤 FACE ENROLLMENT" : "📹 FACIAL RECOGNITION CAMERA"}
            </h1>
            <p className="text-gray-300 font-body">
              {isStudent 
                ? "Capture your face for automatic attendance recognition"
                : isTeacher 
                ? "Advanced AI-powered attendance tracking system" 
                : "Face Enrollment System"
              }
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

      {/* Session Stats - Only show for teachers/admins */}
      {!isStudent && (
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
      )}

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
              
              {/* Real-time Confidence Display */}
              {mode === 'enroll' && (
                <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-cyan-400/30">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      currentConfidence === null ? 'bg-gray-500' :
                      currentConfidence >= 0.9 ? 'bg-green-400 animate-pulse' :
                      currentConfidence >= 0.7 ? 'bg-yellow-400' :
                      currentConfidence >= 0.6 ? 'bg-orange-400' :
                      'bg-red-400'
                    }`}></div>
                    <div>
                      <p className="text-xs text-gray-300">Confidence</p>
                      <p className={`text-lg font-mono font-bold ${
                        currentConfidence === null ? 'text-gray-400' :
                        currentConfidence >= 0.9 ? 'text-green-400' :
                        currentConfidence >= 0.7 ? 'text-yellow-400' :
                        currentConfidence >= 0.6 ? 'text-orange-400' :
                        'text-red-400'
                      }`}>
                        {currentConfidence === null ? '--%' : `${(currentConfidence * 100).toFixed(1)}%`}
                      </p>
                    </div>
                  </div>
                  {currentConfidence !== null && (
                    <p className="text-xs text-gray-400 mt-1">
                      {currentConfidence >= 0.9 ? '🟢 Excellent' :
                       currentConfidence >= 0.7 ? '🟡 Good' :
                       currentConfidence >= 0.6 ? '🟠 Fair' :
                       '🔴 Poor'}
                    </p>
                  )}
                </div>
              )}
              
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
                        {Math.max(enrollmentData.capturedPhotos.length, enrolledFacesCount)}/6 photos captured
                      </p>
                      {Math.max(enrollmentData.capturedPhotos.length, enrolledFacesCount) < 6 && (
                        <p className="text-gray-300 text-sm mt-1">
                          Position your face in the center and look directly at the camera
                        </p>
                      )}
                      {Math.max(enrollmentData.capturedPhotos.length, enrolledFacesCount) === 6 && (
                        <div className="mt-2 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                          <p className="text-green-400 font-bold text-sm">
                            ✅ Enrollment Complete! All 6 faces captured successfully.
                          </p>
                          <p className="text-green-300 text-xs mt-1">
                            You can now manage your face data in the Profile tab.
                          </p>
                        </div>
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
                      {Math.max(enrollmentData.capturedPhotos.length, enrolledFacesCount) < 6 ? (
                        <div className="flex flex-col items-center gap-2">
                          <CyberButton
                            variant="primary"
                            onClick={handleEnrollmentCapture}
                            disabled={!isActive || faceCount === 0}
                            glowColor={currentConfidence && currentConfidence >= 0.7 ? "#00ff00" : "#ff6b6b"}
                          >
                            📸 Capture Face ({6 - Math.max(enrollmentData.capturedPhotos.length, enrolledFacesCount)} remaining)
                          </CyberButton>
                          
                          {/* Capture Quality Indicator */}
                          {currentConfidence !== null && (
                            <div className="text-center">
                              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono ${
                                currentConfidence >= 0.9 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                currentConfidence >= 0.7 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                currentConfidence >= 0.6 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}>
                                <span>Quality: {(currentConfidence * 100).toFixed(1)}%</span>
                                {currentConfidence < 0.6 && <span>⚠️ Consider repositioning</span>}
                              </div>
                            </div>
                          )}
                          
                          {currentConfidence === null && (
                            <p className="text-sm text-gray-500">Position your face in the camera view</p>
                          )}
                        </div>
                      ) : (
                        <CyberButton
                          variant="secondary"
                          disabled={true}
                          className="bg-green-500/20 border-green-500/30 text-green-400"
                        >
                          ✅ All 6 Faces Captured!
                        </CyberButton>
                      )}
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
                  {isActive 
                    ? 'STOP CAMERA' 
                    : isStudent 
                      ? 'CAPTURE FACE' 
                      : 'START CAMERA'
                  }
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
          {/* Student Face Capture Info */}
          {isStudent && mode === 'enroll' && (
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold font-heading text-purple-400 mb-4">
                📸 YOUR FACE CAPTURE
              </h3>
              <div className="space-y-4">
                {/* Show current user info (read-only) */}
                <div className="bg-white/5 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white font-mono">{user?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">Student ID:</span>
                    <span className="text-white font-mono">{user?.student_id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white font-mono">{user?.email}</span>
                  </div>
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">💡</div>
                    <div>
                      <p className="text-blue-400 font-semibold mb-1">How it works:</p>
                      <p className="text-gray-300 text-sm">
                        Capture up to 6 photos of your face from different angles. 
                        This helps the system recognize you accurately during attendance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admin/Teacher Enrollment Form - Only for new student enrollment */}
          {(isTeacher || user?.role === 'admin') && mode === 'enroll' && enrollmentStep === 'form' && (
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold font-heading text-purple-400 mb-4">
                👤 NEW STUDENT ENROLLMENT
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
              ) : unknownFaceMessage ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-bold">{unknownFaceMessage}</p>
                      <p className="text-yellow-400 text-sm">Face not recognized in your account</p>
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
              
              {isStudent && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Face Enrollment</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${Math.max(enrollmentData.capturedPhotos.length, enrolledFacesCount) === 6 ? 'bg-green-400 animate-cyber-pulse' : Math.max(enrollmentData.capturedPhotos.length, enrolledFacesCount) > 0 ? 'bg-yellow-400' : 'bg-gray-500'}`}></div>
                    <span className={`font-mono text-sm ${Math.max(enrollmentData.capturedPhotos.length, enrolledFacesCount) === 6 ? 'text-green-400' : Math.max(enrollmentData.capturedPhotos.length, enrolledFacesCount) > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {Math.max(enrollmentData.capturedPhotos.length, enrolledFacesCount) === 6 ? 'COMPLETE (6/6)' : `${Math.max(enrollmentData.capturedPhotos.length, enrolledFacesCount)}/6 FACES`}
                    </span>
                  </div>
                </div>
              )}
              
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