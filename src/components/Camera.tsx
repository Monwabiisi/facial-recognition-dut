import React, { useEffect, useRef, useState } from 'react';
import { Engine, detectOnce, initEngine } from '../engines/detection';
import Human from '@vladmandic/human';

interface Props {
  onFaceDetected?: (faces: any[]) => void;
  isActive?: boolean;
  engine?: Engine; // Allow engine selection
}

export const Camera: React.FC<Props> = ({ onFaceDetected, isActive = false, engine = 'mediapipe' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Initialize Human.js instance
  const [human] = useState(() => new Human());
  const humanRef = useRef<Human>();

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await initEngine(engine, humanRef.current);
          setIsInitialized(true);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize camera');
        console.error('Camera setup error:', err);
      }
    }

    setupCamera();

    return () => {
      // Cleanup: stop camera stream when component unmounts
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!isInitialized || !isActive || !videoRef.current) return;

    let animationFrame: number;
    
    async function detectFaces() {
      if (!videoRef.current) return;

      try {
        const faces = await detectOnce(engine, videoRef.current, humanRef.current);
        if (onFaceDetected) {
          onFaceDetected(faces);
        }
      } catch (err) {
        console.error('Face detection error:', err);
      }

      // Continue detection loop while active
      if (isActive) {
        animationFrame = requestAnimationFrame(detectFaces);
      }
    }

    detectFaces();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isInitialized, isActive, onFaceDetected]);

  if (error) {
    return (
      <div className="rounded-lg bg-interface-error bg-opacity-10 p-4 text-interface-error">
        {error}
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
          <div className="text-white animate-pulse">Initializing camera...</div>
        </div>
      )}
    </div>
  );
};
