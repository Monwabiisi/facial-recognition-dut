import React, { useEffect, useRef, useState } from 'react';
import { Engine, detectOnce, initEngine, DetectionResult } from '../engines/detection';
import Human from '@vladmandic/human';
import { useCamera } from '../hooks/useCamera';

interface Props {
  onFaceDetected?: (faces: DetectionResult[]) => void;
  isActive?: boolean;
  engine?: Engine; // Allow engine selection
  onVideoReady?: (video: HTMLVideoElement) => void;
  onCameraError?: (error: Error) => void;
}

export const Camera: React.FC<Props> = ({ onFaceDetected, isActive = false, engine = 'mediapipe', onVideoReady, onCameraError }) => {
  const { videoRef, ready: cameraReady, error } = useCamera();
  const [isEngineInitialized, setIsEngineInitialized] = useState(false);

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
  
  // Initialize Human.js instance
  const [human] = useState(() => new Human());
  const humanRef = useRef(human);

  const [progressMessage, setProgressMessage] = useState('Initializing camera...');

  useEffect(() => {
    if (cameraReady && !isEngineInitialized) {
      const onProgress = (message: string) => {
        setProgressMessage(message);
      };
      initEngine(engine, humanRef.current, onProgress).then(() => {
        setIsEngineInitialized(true);
      });
    }
    if (!cameraReady) {
      setProgressMessage('Initializing camera...');
    }
  }, [cameraReady, isEngineInitialized, engine]);

  const isInitialized = cameraReady && isEngineInitialized;
  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/detection.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (event) => {
      if (onFaceDetected) {
        const { faces } = event.data;
        const detectionResults: DetectionResult[] = faces.map((face: any) => ({
            x: face.box.x,
            y: face.box.y,
            width: face.box.width,
            height: face.box.height,
            confidence: face.score,
            landmarks: face.landmarks,
            embedding: face.embedding
        }));
        onFaceDetected(detectionResults);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [onFaceDetected]);

  useEffect(() => {
    if (!isInitialized || !isActive || !videoRef.current) return;

    let animationFrame: number;

    const detectionLoop = async () => {
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        const imageBitmap = await createImageBitmap(videoRef.current);
        workerRef.current?.postMessage({ imageBitmap, engine, humanConfig: humanRef.current.config }, [imageBitmap]);
      }
      if (isActive) {
        animationFrame = requestAnimationFrame(detectionLoop);
      }
    };

    detectionLoop();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isInitialized, isActive, engine, videoRef]);

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
