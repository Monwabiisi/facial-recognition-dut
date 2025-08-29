// src/pages/EnrollPage.tsx
import React, { useState, useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useAuth } from '../contexts/AuthContext';

const EnrollPage: React.FC = () => {
  const { videoRef, ready } = useCamera();
  const { token, currentUser } = useAuth();
  const [sampleCount, setSampleCount] = useState(0);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for spacebar press to capture a sample
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the spacebar was pressed and if capturing is allowed
      if (event.code === 'Space' && ready && !enrolling && sampleCount < 5) {
        event.preventDefault(); // Prevent page from scrolling
        handleCaptureSample();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [ready, enrolling, sampleCount]); // Rerun effect if these dependencies change

  const handleCaptureSample = async () => {
    if (!videoRef.current || !token || sampleCount >= 5) return;

    setEnrolling(true);
    setError(null);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL('image/jpeg');

      const response = await fetch('http://localhost:8000/faces/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ image }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to register face');
      }

      setSampleCount((prev) => prev + 1);
      alert('Sample captured successfully!'); // Simple toast notification
    } catch (error: any) {
      setError(error.message);
      alert(`Error: ${error.message}`); // Simple toast notification
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Face Enrollment</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-4">
          <p className="text-lg">Welcome, <span className="font-semibold">{currentUser?.username}</span>!</p>
          <p className="text-sm text-gray-600">Press the capture button or hit the spacebar to save a face sample.</p>
        </div>

        <div className="mb-4">
          <video
            ref={videoRef}
            className="w-full aspect-video bg-black rounded-lg"
            autoPlay
            playsInline
            muted
          />
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Samples: {sampleCount}/5
            </span>
            <button
              onClick={() => setSampleCount(0)}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Reset
            </button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${(sampleCount / 5) * 100}%` }}
            />
          </div>
        </div>

        <button
          onClick={handleCaptureSample}
          disabled={!ready || !token || enrolling || sampleCount >= 5}
          className={`w-full py-2 px-4 rounded font-medium ${
            !ready || !token || enrolling || sampleCount >= 5
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {enrolling ? 'Capturing...' : 'Capture Sample'}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-800 rounded">
            {error}
          </div>
        )}

        {sampleCount >= 5 && (
          <div className="mt-4 p-3 bg-green-100 text-green-800 rounded">
            Enrollment complete! You can now use face verification.
          </div>
        )}
      </div>
    </div>
  );
};

export default EnrollPage;
