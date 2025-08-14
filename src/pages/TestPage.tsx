import React, { useState } from 'react';
import { Camera } from '../components/Camera';
import { Engine } from '../engines/detection';

export default function TestPage() {
  const [detectedFaces, setDetectedFaces] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<Engine>('mediapipe');

  const handleFaceDetected = (faces: any[]) => {
    setDetectedFaces(faces.length);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-semibold mb-4">Face Recognition Test</h1>
          
          {/* Controls */}
          <div className="mb-4 flex gap-4 items-center">
            <button
              onClick={() => setIsActive(!isActive)}
              className={`px-4 py-2 rounded-md font-medium ${
                isActive 
                  ? 'bg-interface-error text-white' 
                  : 'bg-primary text-white'
              }`}
            >
              {isActive ? 'Stop Detection' : 'Start Detection'}
            </button>

            <select
              value={selectedEngine}
              onChange={(e) => setSelectedEngine(e.target.value as Engine)}
              className="form-select rounded-md border-gray-300"
            >
              <option value="mediapipe">MediaPipe (Fast)</option>
              <option value="human">Human.js (Accurate)</option>
              <option value="faceapi">face-api.js (Balanced)</option>
            </select>
          </div>

          {/* Camera view */}
          <div className="mb-4">
            <Camera
              isActive={isActive}
              onFaceDetected={handleFaceDetected}
              engine={selectedEngine}
            />
          </div>

          {/* Detection status */}
          <div className="text-center">
            <p className="text-lg">
              Detected Faces: <span className="font-semibold">{detectedFaces}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
