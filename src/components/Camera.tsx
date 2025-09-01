import React, { useEffect, useRef, useState } from 'react';
import { DetectionResult } from '../engines/detection';
import Human from '@vladmandic/human';
import { useCamera } from '../hooks/useCamera';

interface Props {
  onFaceDetected?: (faces: DetectionResult[]) => void;
  isActive?: boolean;
  onVideoReady?: (video: HTMLVideoElement) => void;
  onCameraError?: (error: Error) => void;
  onEngineStatus?: (status: { initialized: boolean; backend: string; message?: string }) => void;
}

export const Camera: React.FC<Props> = ({ onFaceDetected, isActive = false, onVideoReady, onCameraError, onEngineStatus }) => {
  const { videoRef, ready: cameraReady, error: cameraError } = useCamera();
  const [isEngineInitialized, setIsEngineInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progressMessage, setProgressMessage] = useState('Initializing camera...');

  // Handle camera errors
  useEffect(() => {
    if (cameraError) {
      const err = new Error(cameraError);
      setError(err);
      if (onCameraError) onCameraError(err);
    }
  }, [cameraError, onCameraError]);
  
  // Initialize Human.js instance with optimal configuration for face detection
  const humanRef = useRef(new Human({
    backend: 'webgl',
    warmup: 'none',
    filter: { enabled: false },
    face: {
      enabled: true,
      detector: { 
        rotation: false,
        return: true,
        minConfidence: 0.2
      },
      mesh: { enabled: false },
      iris: { enabled: false },
      description: { enabled: false },
      emotion: { enabled: false }
    }
  }));
  // Track whether we've already attempted a fallback backend to avoid loops
  const fallbackAttemptedRef = useRef(false);

  useEffect(() => {
    if (error && onCameraError) {
      onCameraError(error);
    }
  }, [error, onCameraError]);

  useEffect(() => {
    if (videoRef.current && onVideoReady) {
      onVideoReady(videoRef.current);
    }
  }, [videoRef, onVideoReady]);

  // Initialize Human.js
  useEffect(() => {
    if (!cameraReady || isEngineInitialized) return;

    let mounted = true;

    (async () => {
      setProgressMessage('Loading face detection model...');
      try {
        await humanRef.current.load();
        if (!mounted) return;
        setIsEngineInitialized(true);
        setProgressMessage('Ready');
        fallbackAttemptedRef.current = false;
        try {
          const backend = (humanRef.current as any)?.config?.backend || 'unknown';
          onEngineStatus?.({ initialized: true, backend, message: 'Ready' });
        } catch (e) {
          onEngineStatus?.({ initialized: true, backend: 'unknown', message: 'Ready' });
        }
      } catch (err) {
        console.error('Human.js model load error:', err);
        onEngineStatus?.({ initialized: false, backend: 'unknown', message: 'Load failed' });
        // Try a safe fallback to CPU backend once
        if (!fallbackAttemptedRef.current) {
          fallbackAttemptedRef.current = true;
          try {
            setProgressMessage('Model load failed, retrying with CPU backend...');
            // mutate config then reload
            // @ts-ignore - human config is dynamic
            humanRef.current.config.backend = 'cpu';
            await humanRef.current.load();
            if (!mounted) return;
            setIsEngineInitialized(true);
            setProgressMessage('Ready (CPU)');
            try {
              const backend = (humanRef.current as any)?.config?.backend || 'cpu';
              onEngineStatus?.({ initialized: true, backend, message: 'Ready (CPU)' });
            } catch (e) {
              onEngineStatus?.({ initialized: true, backend: 'cpu', message: 'Ready (CPU)' });
            }
            return;
          } catch (err2) {
            console.error('Human.js cpu fallback failed:', err2);
            if (!mounted) return;
            setError(err2 instanceof Error ? err2 : new Error(String(err2)));
            setProgressMessage('Failed to load models');
            onEngineStatus?.({ initialized: false, backend: 'unknown', message: 'CPU fallback failed' });
            return;
          }
        }

        setError(err instanceof Error ? err : new Error(String(err)));
        setProgressMessage('Failed to load models');
      }
    })();

    return () => {
      mounted = false;
    };
  }, [cameraReady, isEngineInitialized]);

  // Detection loop
  useEffect(() => {
    if (!isEngineInitialized || !isActive || !videoRef.current) return;

    let animationFrame: number;
    let mounted = true;

    const detectionLoop = async () => {
      if (!mounted) return;
      try {
        if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
          const result = await humanRef.current.detect(videoRef.current);

          // Normalize to an array of DetectionResult (may be empty)
          const detectionResults: DetectionResult[] = (result && result.face && result.face.length > 0)
            ? result.face.map(face => ({
                x: face.box[0],
                y: face.box[1],
                width: face.box[2],
                height: face.box[3],
                confidence: face.score || 0,
                landmarks: (face.mesh as [number, number][]) || [],
                embedding: face.embedding ? new Float32Array(face.embedding) : undefined
              }))
            : [];

          if (onFaceDetected) onFaceDetected(detectionResults);
        }
      } catch (err) {
        console.error('Human.js detect error:', err);
        // If the error looks like a model/inputNodes issue, attempt a CPU fallback once
        if (!fallbackAttemptedRef.current) {
          fallbackAttemptedRef.current = true;
          try {
            // @ts-ignore
            humanRef.current.config.backend = 'cpu';
            await humanRef.current.load();
            setProgressMessage('Recovered using CPU backend');
            setIsEngineInitialized(true);
          } catch (loadErr) {
            console.error('Fallback reload failed:', loadErr);
            setError(loadErr instanceof Error ? loadErr : new Error(String(loadErr)));
          }
        } else {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
        // Notify parent that detection failed (no faces)
        if (onFaceDetected) onFaceDetected([]);
      }

      if (isActive && mounted) {
        animationFrame = requestAnimationFrame(detectionLoop);
      }
    };

    detectionLoop();

    return () => {
      mounted = false;
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isEngineInitialized, isActive, onFaceDetected]);

  const isInitialized = cameraReady && isEngineInitialized;

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
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      {/* Loading indicator */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
          <div className="text-white animate-pulse">{progressMessage}</div>
        </div>
      )}
    </div>
  );
};
