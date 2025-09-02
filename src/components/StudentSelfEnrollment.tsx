import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CyberButton from './CyberButton';
import DetectionFeedback from './DetectionFeedback';

export default function StudentSelfEnrollment() {
  const { user } = useAuth();
  const [enrolling, setEnrolling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detections, setDetections] = useState<faceapi.FaceDetection[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [processingFrame, setProcessingFrame] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setMediaStream(stream);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Failed to access camera. Please make sure you have granted camera permissions.');
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startEnrollment = async () => {
    setEnrolling(true);
    setProgress(0);
    await startCamera();
  };

  const processFrame = async () => {
    if (processingFrame || !videoRef.current || !enrolling) return;
    setProcessingFrame(true);

    try {
      // Detect face
      const detectionResult = await window.faceapi.detectSingleFace(
        videoRef.current,
        new window.faceapi.TinyFaceDetectorOptions()
      );

      if (detectionResult) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0);
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob(blob => {
              if (blob) resolve(blob);
            }, 'image/jpeg', 0.95);
          });

          // Create form data
          const formData = new FormData();
          formData.append('photo', blob);
          formData.append('userId', user?.id.toString() || '');
          formData.append('confidence', detectionResult.score.toString());

          // Upload photo
          const response = await fetch('/api/photos/upload', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            setProgress(prev => Math.min(prev + 20, 100));
            setDetections(prev => [...prev, detectionResult]);
          }
        }
      }
    } catch (error) {
      console.error('Error processing frame:', error);
    }

    setProcessingFrame(false);
    
    // Continue capturing if not done
    if (progress < 100) {
      setTimeout(processFrame, 1000); // Process a frame every second
    } else {
      completeEnrollment();
    }
  };

  const completeEnrollment = async () => {
    stopCamera();
    setEnrolling(false);
    alert('Enrollment completed successfully!');
  };

  // Start processing frames when enrolling begins
  useEffect(() => {
    if (enrolling && videoRef.current?.readyState === 4) {
      processFrame();
    }
  }, [enrolling, videoRef.current?.readyState]);

  return (
    <div className="glass-card p-6 max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Self Enrollment</h2>
        <p className="text-gray-300">
          We'll take 5 photos of your face from different angles to improve recognition accuracy.
          Please move your head slightly between captures.
        </p>
      </div>

      {!enrolling ? (
        <div className="flex justify-center">
          <CyberButton onClick={startEnrollment} variant="primary">
            Start Enrollment
          </CyberButton>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Camera Preview */}
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <DetectionFeedback detections={detections} />
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-cyan-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-300">
            Enrollment Progress: {progress}%
          </p>

          <div className="flex justify-center">
            <CyberButton
              onClick={() => {
                stopCamera();
                setEnrolling(false);
                setProgress(0);
                setDetections([]);
              }}
              variant="danger"
            >
              Cancel
            </CyberButton>
          </div>
        </div>
      )}
    </div>
  );
}
