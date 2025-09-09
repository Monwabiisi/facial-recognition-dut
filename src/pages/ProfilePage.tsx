import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DUTLogo from '../components/DUTLogo';
import CyberButton from '../components/CyberButton';
import ParticleBackground from '../components/ParticleBackground';
import * as faceapi from 'face-api.js';

interface FaceEmbedding {
  id: number;
  embedding: string;
  image_path?: string;
  confidence: number;
  created_at: string;
}

interface UserFacesResponse {
  faces: FaceEmbedding[];
  maxFaces: number;
  remainingSlots: number;
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [userFaces, setUserFaces] = useState<UserFacesResponse>({ faces: [], maxFaces: 6, remainingSlots: 6 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Check if this is a first login
    const urlParams = new URLSearchParams(window.location.search);
    setIsFirstLogin(urlParams.get('firstLogin') === 'true');
    
    loadUserFaces();
    loadFaceApiModels();
  }, [user, navigate]);

  const loadFaceApiModels = async () => {
    try {
      console.log('🤖 Loading face-api models...');
      setError(''); // Clear any previous errors
      
      // Check server model status first
      try {
        const statusResponse = await fetch('/api/models/status');
        if (statusResponse.ok) {
          const modelStatus = await statusResponse.json();
          console.log('📊 Model status:', modelStatus);
          
          if (!modelStatus.allPresent) {
            console.log('⚠️ Some models missing, triggering download...');
            const downloadResponse = await fetch('/api/models/download', { method: 'POST' });
            if (downloadResponse.ok) {
              const downloadResult = await downloadResponse.json();
              console.log('📥 Download result:', downloadResult);
            }
          }
        }
      } catch (statusError) {
        console.warn('Could not check model status:', statusError);
      }
      
      // Try local models first, then fallback to CDN
      let MODEL_URL = '/models';
      let usingCDN = false;
      
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        console.log('✅ Loaded models from local path');
      } catch (localError) {
        console.warn('Local models failed, trying CDN:', localError);
        // Fallback to CDN
        MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        usingCDN = true;
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        console.log('✅ Loaded models from CDN');
      }
      
      setModelsLoaded(true);
      console.log(usingCDN ? '📡 Face-api models loaded from CDN' : '💾 Face-api models loaded locally');
      
    } catch (error) {
      console.error('❌ Failed to load face-api models:', error);
      setError('Failed to load face recognition models. Please check your internet connection and refresh the page.');
    }
  };

  const loadUserFaces = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/faces', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserFaces({
          faces: data.faces || [],
          maxFaces: 6,
          remainingSlots: Math.max(0, 6 - (data.faces?.length || 0))
        });
        console.log('Loaded faces:', data.faces?.length || 0, 'faces for user');
      } else {
        throw new Error('Failed to load faces');
      }
    } catch (error) {
      console.error('Error loading user faces:', error);
      setError('Failed to load your face data');
    }
  };

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureAndEnrollFace = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

    setIsCapturing(true);
    setError('');
    setSuccess('');

    try {
      // Detect face in video
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError('No face detected. Please ensure your face is clearly visible and try again.');
        setIsCapturing(false);
        return;
      }

      // Draw face detection on canvas
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        // Draw detection box
        const box = detection.detection.box;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      }

      // Prepare embedding for backend
      const embedding = Array.from(detection.descriptor);
      const confidence = detection.detection.score;

      // Send to backend
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/faces/enroll', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embedding: JSON.stringify(embedding),
          confidence: confidence
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`Face enrolled successfully! ${result.remaining_slots} slots remaining.`);
        loadUserFaces(); // Refresh the list
        
        // Auto-close camera after successful enrollment
        setTimeout(() => {
          stopCamera();
          setSuccess('');
        }, 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enroll face');
      }
    } catch (error: any) {
      console.error('Face enrollment error:', error);
      setError(error.message || 'Failed to enroll face');
    } finally {
      setIsCapturing(false);
    }
  };

  const deleteFace = async (faceId: number) => {
    if (!confirm('Are you sure you want to delete this face enrollment?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/user/faces/${faceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSuccess('Face deleted successfully');
        loadUserFaces(); // Refresh the list
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete face');
      }
    } catch (error: any) {
      console.error('Delete face error:', error);
      setError(error.message || 'Failed to delete face');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen animated-bg relative overflow-hidden">
      <ParticleBackground />
      
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-green-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen p-4">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-6 pt-8">
            <DUTLogo size="lg" animated />
            
            <div>
              <h1 className="text-4xl font-bold font-heading gradient-text mb-2">
                YOUR PROFILE
              </h1>
              <p className="text-lg text-gray-300 font-body">
                Manage your face enrollments and account settings
              </p>
            </div>
          </div>

          {/* User Info Card */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{user.name}</h2>
                <p className="text-gray-400 font-mono">{user.email}</p>
                <p className="text-gray-400 font-mono">Role: <span className="text-cyan-400">{user.role?.toUpperCase()}</span></p>
                {user.student_id && (
                  <p className="text-gray-400 font-mono">Student ID: <span className="text-purple-400">{user.student_id}</span></p>
                )}
              </div>
              <CyberButton
                variant="secondary"
                onClick={logout}
                className="border-red-500/30 hover:border-red-400/50 bg-red-600/20 hover:bg-red-600/30"
              >
                LOGOUT
              </CyberButton>
            </div>
          </div>

          {/* Face Enrollment Section */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Face Enrollments</h3>
                <p className="text-gray-400">
                  {userFaces.faces.length} of {userFaces.maxFaces} faces enrolled
                  {userFaces.remainingSlots > 0 && (
                    <span className="text-green-400 ml-2">({userFaces.remainingSlots} slots available)</span>
                  )}
                </p>
              </div>
              
              {userFaces.remainingSlots > 0 && !cameraActive && (
                <CyberButton
                  onClick={startCamera}
                  disabled={!modelsLoaded}
                  glowColor="#00ff00"
                >
                  📸 ADD NEW FACE
                </CyberButton>
              )}
            </div>

            {/* First Login Welcome Message */}
            {isFirstLogin && userFaces.faces.length === 0 && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🎉</div>
                  <div>
                    <p className="text-blue-400 font-mono font-bold">Welcome to DUT Face Recognition!</p>
                    <p className="text-blue-300 text-sm mt-1">To use the system, please enroll at least one face below. You can add up to 6 different face angles for better recognition accuracy.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                <p className="text-red-400 font-mono">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                <p className="text-green-400 font-mono">{success}</p>
              </div>
            )}

            {/* Success state for completed enrollment */}
            {userFaces.faces.length === 6 && !error && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">✅</div>
                  <div>
                    <p className="text-green-400 font-mono font-semibold">6/6 Faces Enrolled</p>
                    <p className="text-gray-300 text-sm">
                      Face embedding complete for: <span className="font-semibold text-green-300">{user?.name}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* High enrollment progress indicator */}
            {userFaces.faces.length >= 4 && userFaces.faces.length < 6 && !error && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🎯</div>
                  <div>
                    <p className="text-blue-400 font-mono font-semibold">
                      {userFaces.faces.length}/6 Faces Enrolled
                    </p>
                    <p className="text-gray-300 text-sm">
                      Almost done! Add {6 - userFaces.faces.length} more face{6 - userFaces.faces.length > 1 ? 's' : ''} for optimal recognition.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Camera Section */}
            {cameraActive && (
              <div className="mb-6 space-y-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-w-md mx-auto rounded-xl border-2 border-cyan-400/30"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{ display: 'none' }}
                  />
                </div>
                
                <div className="flex gap-4 justify-center">
                  <CyberButton
                    onClick={captureAndEnrollFace}
                    loading={isCapturing}
                    disabled={!modelsLoaded}
                    glowColor="#00ff00"
                  >
                    {isCapturing ? 'CAPTURING...' : '📷 CAPTURE FACE'}
                  </CyberButton>
                  
                  <CyberButton
                    variant="secondary"
                    onClick={stopCamera}
                    className="border-red-500/30 hover:border-red-400/50"
                  >
                    ❌ CANCEL
                  </CyberButton>
                </div>
              </div>
            )}

            {/* Face List */}
            <div className="space-y-4">
              {userFaces.faces.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">👤</div>
                  <p className="text-gray-400 font-mono">No faces enrolled yet</p>
                  <p className="text-gray-500 text-sm mt-2">Add your first face to enable recognition</p>
                </div>
              ) : (
                userFaces.faces.map((face, index) => (
                  <div key={face.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-white font-mono">Face ID: {face.id}</p>
                        <p className="text-gray-400 text-sm">
                          Confidence: {(face.confidence * 100).toFixed(1)}%
                        </p>
                        <p className="text-gray-500 text-xs">
                          Enrolled: {new Date(face.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <CyberButton
                      variant="secondary"
                      onClick={() => deleteFace(face.id)}
                      className="border-red-500/30 hover:border-red-400/50 bg-red-600/20 hover:bg-red-600/30"
                      size="sm"
                    >
                      🗑️ DELETE
                    </CyberButton>
                  </div>
                ))
              )}
            </div>

            {/* Face Limit Warning */}
            {userFaces.remainingSlots === 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mt-4">
                <p className="text-yellow-400 font-mono">
                  ⚠️ Face enrollment limit reached. Delete existing faces to add new ones.
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="text-center">
            <CyberButton
              variant="secondary"
              onClick={() => navigate('/dashboard')}
              className="mr-4"
            >
              📊 DASHBOARD
            </CyberButton>
            <CyberButton
              variant="secondary"
              onClick={() => navigate('/camera')}
            >
              📷 CAMERA
            </CyberButton>
          </div>
        </div>
      </div>

      {/* Corner UI Elements */}
      <div className="fixed top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-blue-400/50 pointer-events-none"></div>
      <div className="fixed top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-blue-400/50 pointer-events-none"></div>
      <div className="fixed bottom-4 left-4 w-12 h-12 border-l-2 border-b-2 border-blue-400/50 pointer-events-none"></div>
      <div className="fixed bottom-4 right-4 w-12 h-12 border-r-2 border-b-2 border-blue-400/50 pointer-events-none"></div>
    </div>
  );
}
