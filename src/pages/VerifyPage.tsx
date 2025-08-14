// src/pages/VerifyPage.tsx
import React, { useState } from 'react';
import { useCamera } from '../hooks/useCamera';

const VerifyPage: React.FC = () => {
  const { videoRef, ready } = useCamera();
  const [userId, setUserId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<'MATCH' | 'NO_MATCH' | null>(null);

  const handleVerify = async () => {
    if (!userId) return;
    
    setVerifying(true);
    try {
      // Call your verification service here
      // const result = await verifyFacade.verify(userId, videoRef.current!);
      // if (result.match) {
      //   await recordPresent(userId, 'CLASS_ID', 'SESSION_ID');
      //   setResult('MATCH');
      // } else {
      //   setResult('NO_MATCH');
      // }
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Face Verification</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
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

        <button
          onClick={handleVerify}
          disabled={!ready || !userId || verifying}
          className={`w-full py-2 px-4 rounded font-medium ${
            !ready || !userId || verifying
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {verifying ? 'Verifying...' : 'Verify Face'}
        </button>
      </div>

      {result && (
        <div
          className={`p-4 rounded-lg ${
            result === 'MATCH'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {result === 'MATCH' ? 'Face verified!' : 'Face does not match records'}
        </div>
      )}
    </div>
  );
};

export default VerifyPage;
