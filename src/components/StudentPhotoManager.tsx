import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CyberButton from './CyberButton';

interface Photo {
  id: string;
  url: string;
  timestamp: Date;
  confidence: number;
}

export default function StudentPhotoManager() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCapturing(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Failed to access camera. Please make sure you have granted camera permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCapturing(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0);

    try {
      // Detect face and get confidence score
      const detectionResult = await window.faceapi.detectSingleFace(video, new window.faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detectionResult) {
        alert('No face detected. Please ensure your face is clearly visible.');
        return;
      }

      // Get detection confidence (normalized between 0-1)
      const confidence = detectionResult.detection.score;

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.95);
      });

      // Create FormData for upload
      const formData = new FormData();
      formData.append('photo', blob);
      formData.append('userId', user?.id.toString() || '');
      formData.append('confidence', confidence.toString());

      // Upload to server
      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload photo');

      const newPhoto = await response.json();
      setPhotos(prev => [...prev, newPhoto]);
      alert('Photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete photo');

      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo. Please try again.');
    }
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Manage Your Photos</h2>
        <CyberButton
          onClick={capturing ? stopCamera : startCamera}
          variant={capturing ? 'danger' : 'primary'}
        >
          {capturing ? 'Stop Camera' : 'Start Camera'}
        </CyberButton>
      </div>

      {/* Camera Preview */}
      {capturing && (
        <div className="space-y-4">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex justify-center">
            <CyberButton onClick={capturePhoto} variant="primary">
              Capture Photo
            </CyberButton>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map(photo => (
          <div key={photo.id} className="relative">
            <img
              src={photo.url}
              alt="Your photo"
              className="w-full h-40 object-cover rounded-lg"
            />
            <button
              onClick={() => deletePhoto(photo.id)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
              title="Remove photo"
            >
              ×
            </button>
            <div 
              className={`absolute bottom-2 left-2 px-2 py-1 rounded-md text-xs font-medium ${
                photo.confidence >= 90 ? 'bg-green-500' :
                photo.confidence >= 70 ? 'bg-yellow-500' :
                'bg-red-500'
              } text-white shadow-md`}
            >
              {photo.confidence}% Match
            </div>
          </div>
        ))}
      </div>

      {/* Hidden canvas for capturing photos */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
