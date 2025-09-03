import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { useCamera } from '../hooks/useCamera';
import faceService from '../services/faceService';

interface FaceRecognitionCameraProps {
  onFaceRecognized?: (result: { name: string; student_id: string; confidence: number }) => void;
  onFaceEnrolled?: (success: boolean) => void;
  enrollMode?: boolean;
  enrollData?: { name: string; student_id: string };
  width?: number;
  height?: number;
  // Optional capture UI used by enrollment flow
  showCaptureButton?: boolean;
  onCapture?: (dataUrl: string) => void;
  // Capture multiple frames for stronger embeddings (e.g. 5)
  burstCount?: number;
  onMultiCapture?: (dataUrls: string[]) => void;
  enrollmentName?: string;
}

interface FaceData {
  id: string;
  name: string;
  student_id: string;
  descriptor: Float32Array;
}

const RealtimeCamera: React.FC<FaceRecognitionCameraProps> = ({
  onFaceRecognized,
  onFaceEnrolled,
  enrollMode = false,
  enrollData,
  width = 640,
  height = 480,
  showCaptureButton = false,
  burstCount = 1,
  onCapture,
  onMultiCapture,
  enrollmentName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // useCamera centralizes getUserMedia and handles autoplay quirks
  const { videoRef, ready: cameraReady, error: cameraError } = useCamera();
  const [isLoading, setIsLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDescriptors, setFaceDescriptors] = useState<FaceData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  const lastDetectionRef = useRef<any>(null);

  // Load face-api models with better error handling
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('Loading face-api models...');
        setStatus('Loading AI models...');
        
        // Use CDN as primary source since local models aren't available
        const modelUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
          faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
          faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
        ]);
        
        console.log('Models loaded successfully');
        setModelsLoaded(true);
        setStatus('Models loaded, starting camera...');
        
        // Load existing face data
        await loadFaceData();
        
      } catch (error) {
        console.error('Error loading models:', error);
        setError('Failed to load AI models. Please check your internet connection.');
        setStatus('Model loading failed');
      }
    };

    loadModels();
  }, []);

  // Load face data from server
  const API_BASE = (import.meta.env.VITE_API_URL as string || 'http://localhost:5000') + '/api';
  const loadFaceData = async () => {
    try {
      const response = await fetch(`${API_BASE}/faces`);
      if (response.ok) {
        const data = await response.json();
        const faceData = data.map((item: any) => ({
          id: item.id?.toString() || String(item.user_id || item.student_id),
          user_id: item.user_id,
          name: item.name,
          student_id: item.student_id,
          descriptor: new Float32Array(JSON.parse(item.embedding))
        }));
        setFaceDescriptors(faceData);
        console.log(`Loaded ${faceData.length} face descriptors`);
      }
    } catch (error) {
      console.error('Error loading face data:', error);
    }
  };

  // If the useCamera hook reports an error, reflect it here
  useEffect(() => {
    if (cameraError) {
      setError(cameraError as string);
      setStatus('Camera error');
      setIsLoading(false);
    }
  }, [cameraError]);

  // When useCamera reports ready, mark loading false so detection can start when models loaded
  useEffect(() => {
    if (cameraReady) {
      setStatus('Camera ready');
      setIsLoading(false);
    }
  }, [cameraReady]);

  // Face detection loop
  useEffect(() => {
    if (!modelsLoaded || !cameraReady || isLoading) return;

    const detectFaces = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Use the displayed (client) size so canvas overlays line up when CSS scales the video
      const displayWidth = video.clientWidth || width;
      const displayHeight = video.clientHeight || height;

      // We'll use the CSS display size when matching dimensions for face-api
      const displaySizeCss = { width: displayWidth, height: displayHeight };

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(displayWidth * dpr);
      canvas.height = Math.round(displayHeight * dpr);
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      // matchDimensions should receive the CSS pixel size (not scaled by DPR)
      faceapi.matchDimensions(canvas, displaySizeCss as any);
      
      const ctx = canvas.getContext('2d');
      if (ctx && dpr !== 1) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale drawing operations to compensate for DPR
      }

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.5
          }))
          .withFaceLandmarks()
          .withFaceDescriptors();

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (detections.length > 0) {
          const resizedDetections = faceapi.resizeResults(detections, displaySizeCss as any);
          
          // Draw face detection boxes and landmarks (use resized results so canvas coords match)
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

          // Process the best detection (highest confidence)
          const bestDetection = resizedDetections.reduce((best, current) =>
            current.detection.score > best.detection.score ? current : best
          );

          // keep reference for quick-enroll
          lastDetectionRef.current = bestDetection;

          if (enrollMode && enrollData) {
            // Enrollment mode
            handleEnrollment(bestDetection);
          } else {
            // Recognition mode — only call if we have a valid 2D context
            if (ctx) {
              await handleRecognition(bestDetection, ctx, displaySizeCss as any);
            }
          }
        } else {
          setStatus('No faces detected');
        }
      } catch (error) {
        console.error('Detection error:', error);
        setStatus('Detection error occurred');
      }
    };

  const interval = setInterval(detectFaces, 200); // 5 FPS
    return () => clearInterval(interval);
  }, [modelsLoaded, cameraReady, isLoading, faceDescriptors, enrollMode, enrollData]);

  const handleEnrollment = async (detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>>) => {
    if (!enrollData) return;

    try {
      const faceData = {
        id: enrollData.student_id,
        name: enrollData.name,
        student_id: enrollData.student_id,
        descriptor: detection.descriptor
      };
      
  // Save to server
  const response = await fetch(`${API_BASE}/faces/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 1, // You'll need to get the actual user ID
          embedding: JSON.stringify(Array.from(detection.descriptor)),
          confidence: detection.detection.score
        })
      });

      if (response.ok) {
        setFaceDescriptors(prev => [...prev.filter(f => f.id !== enrollData.student_id), faceData]);
        onFaceEnrolled?.(true);
        setStatus(`Successfully enrolled ${enrollData.name}`);
      } else {
        onFaceEnrolled?.(false);
        setStatus('Enrollment failed');
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      onFaceEnrolled?.(false);
      setStatus('Enrollment error');
    }
  };

  const handleRecognition = async (
    detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>>,
    ctx: CanvasRenderingContext2D,
    displaySize: { width: number; height: number }
  ) => {
    let bestMatch: { face: FaceData; distance: number } | null = null;
    
  // Find best matching face
    for (const face of faceDescriptors) {
      const distance = faceapi.euclideanDistance(detection.descriptor, face.descriptor);
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { face, distance };
      }
    }

  // distance threshold derived from desired confidence. For 60% confidence -> distance <= 0.4
  const threshold = 0.4;
  if (bestMatch && bestMatch.distance < threshold) {
      const confidence = Math.max(0, 1 - bestMatch.distance);
      
      // Draw recognition result using resized coordinates so the overlay lines up with the video
      // detection passed into this function may be in the model coordinate space; convert to canvas space
  const resized = faceapi.resizeResults(detection, displaySize) as any;
      const box = resized.detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: `${bestMatch.face.name} (${(confidence * 100).toFixed(1)}%)`,
        boxColor: 'green'
      });
      drawBox.draw(ctx);
      if (onFaceRecognized) {
        onFaceRecognized({
          name: bestMatch.face.name,
          student_id: bestMatch.face.student_id,
          confidence,
          user_id: (bestMatch.face as any).user_id || undefined,
        } as any);
      }

      setStatus(`Recognized: ${bestMatch.face.name}`);
    } else {
      // Draw unknown face (use resized coordinates)
  const resized = faceapi.resizeResults(detection, displaySize) as any;
      const box = resized.detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: 'Unknown Face',
        boxColor: 'red'
      });
      drawBox.draw(ctx);
      
      setStatus('Face not recognized');
    }
  };

  if (error) {
    return (
      <div 
        className="flex items-center justify-center bg-red-100 rounded-lg border-2 border-red-300"
        style={{ width, height }}
      >
        <div className="text-center text-red-800 p-4">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="font-semibold mb-2">Camera Error</div>
          <div className="text-sm">{error}</div>
          <div className="mt-3 space-x-2">
            <button
              onClick={() => {
                setError(null);
                setStatus('Retrying camera...');
                setIsLoading(true);
                // nudge state to let hooks retry (useCamera runs on mount only, refresh page if needed)
                setModelsLoaded((s) => s);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Hard Reload
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Always render the video + canvas so the camera preview can appear immediately.
  // Show a loading overlay while models are loading or camera is starting.

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden pointer-events-none" style={{ width, height }}>
      <video
        ref={videoRef}
        width={width}
        height={height}
        autoPlay
        muted
        playsInline
  className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Capture button for enrollment flows (does not block outside controls) */}
      {showCaptureButton && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto">
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full ring-4 ring-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg" />
              <button
                onClick={async () => {
                  const v = videoRef.current;
                  if (!v) return;
                  const MAX_PER_USER = 10;

                  const captureOne = () => {
                    const tmp = document.createElement('canvas');
                    const w = v.videoWidth || width;
                    const h = v.videoHeight || height;
                    tmp.width = w;
                    tmp.height = h;
                    const tctx = tmp.getContext('2d');
                    if (!tctx) return null;
                    tctx.drawImage(v, 0, 0, tmp.width, tmp.height);
                    return tmp.toDataURL('image/jpeg', 0.9);
                  };

                  const capped = Math.max(1, Math.min(burstCount || 1, MAX_PER_USER));
                  const already = faceDescriptors.length || 0;
                  const remaining = Math.max(0, MAX_PER_USER - already);

                  if (remaining <= 0) {
                    setStatus('Embedding limit reached for this user');
                    onFaceEnrolled?.(false);
                    return;
                  }

                  if (capped && capped > 1) {
                    const results: string[] = [];
                    // Only capture up to the remaining allowed count
                    const toCapture = Math.min(capped, remaining);
                    for (let i = 0; i < toCapture; i++) {
                      const dataUrl = captureOne();
                      if (dataUrl) results.push(dataUrl);
                      // small delay between captures to allow slight variation
                      // eslint-disable-next-line no-await-in-loop
                      await new Promise(r => setTimeout(r, 220));
                    }
                    if (onMultiCapture) onMultiCapture(results);
                    else if (onCapture && results.length) onCapture(results[0]);
                  } else {
                    const dataUrl = captureOne();
                    if (dataUrl && onCapture) onCapture(dataUrl);
                  }
                }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white text-lg shadow-2xl transform-gpu hover:scale-105 active:scale-95 transition"
                aria-label={enrollmentName ? `Capture ${enrollmentName}` : 'Capture'}
              >
                <span className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">📸</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Enroll (dev helper) */}
      <div className="absolute bottom-6 right-6 z-30 pointer-events-auto">
        <button
          onClick={async () => {
            if (!lastDetectionRef.current) {
              setStatus('No detection to enroll');
              return;
            }
            const idStr = prompt('Enter user id to enroll this face as (numeric user_id):');
            if (!idStr) return;
            const userId = Number(idStr);
            if (!userId) { alert('Invalid user id'); return; }

            try {
              const descriptor = lastDetectionRef.current.descriptor as Float32Array;
              if (!descriptor) { alert('No descriptor available'); return; }
              const blob = await (async () => {
                const v = videoRef.current;
                if (!v) return null;
                const tmp = document.createElement('canvas');
                tmp.width = v.videoWidth || width;
                tmp.height = v.videoHeight || height;
                const tctx = tmp.getContext('2d');
                if (!tctx) return null;
                tctx.drawImage(v, 0, 0, tmp.width, tmp.height);
                return await new Promise<Blob | null>((res) => tmp.toBlob(b => res(b), 'image/jpeg', 0.8));
              })();

              await faceService.enrollFace({ user_id: userId, embedding: descriptor, imageBlob: blob || undefined });
              setStatus('Quick-enroll successful');
              // reload descriptors
              await loadFaceData();
            } catch (e) {
              console.error('Quick enroll failed', e);
              setStatus('Quick-enroll failed');
            }
          }}
          className="px-3 py-2 bg-purple-600 text-white rounded-md shadow hover:bg-purple-700"
        >
          Quick Enroll
        </button>
      </div>

      {/* Debug: small indicators for troubleshooting */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-xs text-white px-2 py-1 rounded">
        <div>cameraReady: {String(cameraReady)}</div>
        <div>modelsLoaded: {String(modelsLoaded)}</div>
      </div>
      
      {/* Status overlay */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm">
          Status: {status}
        </div>
      </div>
      
      {/* Enrollment overlay */}
      {enrollMode && enrollData && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-56 h-56 rounded-full border-2 border-white/30 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <div className="text-4xl">�</div>
            <div className="mt-2 text-white font-semibold">Position your face</div>
            <div className="text-sm text-white/80 mt-1">Enrolling: {enrollData.name}</div>
          </div>
        </div>
      )}

      {/* Face count indicator */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-lg text-xs">
        Enrolled faces: {faceDescriptors.length}
      </div>
    </div>
  );
};

export default RealtimeCamera;