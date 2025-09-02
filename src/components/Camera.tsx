import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { useCamera } from '../hooks/useCamera';
import { DetectionResult } from '../engines/detection';

interface Props {
  onFaceDetected?: (faces: DetectionResult[]) => void;
  isActive?: boolean;
  onVideoReady?: (v: HTMLVideoElement) => void;
  onCameraError?: (e: Error) => void;
  onEngineStatus?: (s: { initialized: boolean; backend: string; message?: string }) => void;
}

const LOCAL_MODEL_BASE = '/models';
const CDN_MODEL_BASE = 'https://justadudewhohacks.github.io/face-api.js/models';

const Camera: React.FC<Props> = ({ onFaceDetected, isActive = false, onVideoReady, onCameraError, onEngineStatus }) => {
  const { videoRef, ready: cameraReady, error: cameraError } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const modelLoadAttemptRef = useRef(false);

  // Handle camera startup errors
  useEffect(() => {
    if (cameraError) {
      console.error('Camera initialization error:', cameraError);
      const err = new Error(`Camera Error: ${cameraError}`);
      setError(err);
      onCameraError?.(err);
      onEngineStatus?.({ initialized: false, backend: 'camera', message: cameraError });
    }
  }, [cameraError, onCameraError, onEngineStatus]);

  useEffect(() => {
    let mounted = true;

    const loadModels = async () => {
      if (modelLoadAttemptRef.current) return;
      modelLoadAttemptRef.current = true;

      try {
        onEngineStatus?.({ initialized: false, backend: 'faceapi', message: 'Loading models (local)' });
        
        // Try loading from local models first
        try {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(LOCAL_MODEL_BASE),
            faceapi.nets.faceLandmark68Net.loadFromUri(LOCAL_MODEL_BASE),
            faceapi.nets.faceRecognitionNet.loadFromUri(LOCAL_MODEL_BASE)
          ]);
          console.log('✅ Loaded face-api.js models from local path');
        } catch (localErr) {
          // If local fails, try CDN
          console.warn('Local model load failed, trying CDN:', localErr);
          onEngineStatus?.({ initialized: false, backend: 'faceapi', message: 'Loading models (CDN)' });
          
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(CDN_MODEL_BASE),
            faceapi.nets.faceLandmark68Net.loadFromUri(CDN_MODEL_BASE),
            faceapi.nets.faceRecognitionNet.loadFromUri(CDN_MODEL_BASE)
          ]);
          console.log('✅ Loaded face-api.js models from CDN');
        }

        if (!mounted) return;
        setModelsLoaded(true);
        onEngineStatus?.({ initialized: true, backend: 'faceapi', message: 'Models loaded' });
      } catch (err) {
        console.error('Model loading failed:', err);
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        onCameraError?.(e);
        onEngineStatus?.({ initialized: false, backend: 'faceapi', message: `Model load error: ${e.message}` });
      }
    };

    loadModels();

    // Detection loop
    let raf = 0;
    const runDetection = async () => {
      if (!mounted) return;
      try {
        if (isActive && modelsLoaded && videoRef.current && !videoRef.current.paused) {
          const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 256 });
          const results = await faceapi
            .detectAllFaces(videoRef.current as HTMLVideoElement, opts)
            .withFaceLandmarks()
            .withFaceDescriptors();

          const out: DetectionResult[] = (results || []).map((r) => ({
            x: r.detection.box.x,
            y: r.detection.box.y,
            width: r.detection.box.width,
            height: r.detection.box.height,
            confidence: r.detection.score,
            landmarks: r.landmarks ? r.landmarks.positions.map((p) => [p.x, p.y]) : undefined,
            embedding: r.descriptor ? new Float32Array(r.descriptor) : undefined
          }));

          onFaceDetected?.(out);
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        console.error('face-api detect error', e);
        setError(e);
        onCameraError?.(e);
        onFaceDetected?.([]);
      } finally {
        raf = requestAnimationFrame(runDetection);
      }
    };

    raf = requestAnimationFrame(runDetection);

    return () => {
      mounted = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [modelsLoaded, isActive, videoRef, onFaceDetected, onEngineStatus, onCameraError]);

    useEffect(() => {
      if (videoRef.current && onVideoReady) onVideoReady(videoRef.current);
    }, [videoRef, onVideoReady]);

    if (error) {
      return (
        <div className="rounded-lg bg-red-100 p-4 text-red-700">
          <p className="font-bold">Camera Error</p>
          <p>{error.message}</p>
        </div>
      );
    }

    return (
      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {/* Hidden canvas kept for future drawing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {!modelsLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
            <div className="text-white animate-pulse">Loading face model...</div>
          </div>
        )}
      </div>
    );
};

export default Camera;
