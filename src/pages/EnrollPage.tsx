// src/pages/EnrollPage.tsx
import React, { useState } from 'react';
import { useCamera } from '../hooks/useCamera';

const EnrollPage: React.FC = () => {
  const { videoRef, ready } = useCamera();
  const [userId, setUserId] = useState('');
  const [sampleCount, setSampleCount] = useState(0);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCaptureSample = async () => {
    if (!userId || sampleCount >= 5) return;
    
    setEnrolling(true);
    try {
      // Call your enrollment service here
      // const descriptor = await detectDescriptorFromVideo(videoRef.current!);
      // await enrollFacade.addSample(userId, descriptor);
      setSampleCount((prev) => prev + 1);
      setError(null);
    } catch (error: any) {
      setError(error.message || 'Failed to capture sample');
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Face Enrollment</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Student ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter student ID"
          />
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
          disabled={!ready || !userId || enrolling || sampleCount >= 5}
          className={`w-full py-2 px-4 rounded font-medium ${
            !ready || !userId || enrolling || sampleCount >= 5
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
