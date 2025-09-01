// src/pages/Camera.tsx
import React, { useState, useCallback } from 'react';
import { RealtimeCamera } from '../components/RealtimeCamera';
import { useAuth } from '../contexts/AuthContext';
import faceService, { RecognitionResult } from '../services/faceService';

interface AttendanceRecord {
  id: string;
  timestamp: Date;
  result: RecognitionResult;
  confidence: number;
}

const Camera: React.FC = () => {
  const { user, isTeacher } = useAuth();
  const [mode, setMode] = useState<'recognize' | 'enroll'>('recognize');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<RecognitionResult | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Ready');

  // Handle face detection from camera
  const handleFaceDetected = useCallback(async (canvas: HTMLCanvasElement, descriptors: Float32Array[]) => {
    if (isProcessing || descriptors.length === 0) return;

    try {
      setIsProcessing(true);
      setError(null);
      setStatus('Processing face...');

      // Use the first (best) face descriptor
      const descriptor = descriptors[0];

      if (!faceService.validateEmbedding(descriptor)) {
        setError('Face detection quality too low. Please look directly at the camera.');
        return;
      }

      if (mode === 'recognize') {
        // Recognition mode
        const result = await faceService.recognizeFace(descriptor);
        setLastResult(result);

        if (result.recognized) {
          setStatus(`✅ Recognized: ${result.name} (${result.student_id})`);
          
          // Add to attendance records
          const record: AttendanceRecord = {
            id: Date.now().toString(),
            timestamp: new Date(),
            result,
            confidence: result.confidence,
          };
          
          setAttendanceRecords(prev => [record, ...prev.slice(0, 9)]); // Keep last 10 records
        } else {
          setStatus(`❌ Face not recognized (${(result.similarity * 100).toFixed(1)}% similarity)`);
        }
      } else if (mode === 'enroll' && user) {
        // Enrollment mode (teachers only)
        const imageBlob = await faceService.canvasToBlob(canvas);
        
        const enrollmentResult = await faceService.enrollFace({
          user_id: user.id,
          embedding: descriptor,
          imageBlob,
          confidence: 1.0,
        });

        setStatus(`✅ Face enrolled successfully for ${user.name}`);
        console.log('Enrollment result:', enrollmentResult);
      }
    } catch (error) {
      console.error('Face processing error:', error);
      setError(error instanceof Error ? error.message : 'Face processing failed');
      setStatus('Error processing face');
    } finally {
      setIsProcessing(false);
      // Auto-reset status after 3 seconds
      setTimeout(() => {
        if (!isProcessing) setStatus('Ready');
      }, 3000);
    }
  }, [mode, user, isProcessing]);

  const handleCameraError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setStatus('Camera error');
  }, []);

  const clearRecords = () => {
    setAttendanceRecords([]);
    setLastResult(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {mode === 'recognize' ? '📹 Face Recognition' : '👤 Face Enrollment'}
        </h1>
        <p className="text-gray-600">
          {mode === 'recognize' 
            ? 'Position your face in front of the camera for recognition'
            : 'Enroll your face for future recognition'
          }
        </p>
      </div>

      {/* Mode Toggle (Teachers only for enrollment) */}
      {isTeacher && (
        <div className="mb-6 flex justify-center">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => setMode('recognize')}
              className={`px-4 py-2 rounded-md transition-colors ${
                mode === 'recognize'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🔍 Recognize
            </button>
            <button
              onClick={() => setMode('enroll')}
              className={`px-4 py-2 rounded-md transition-colors ${
                mode === 'enroll'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📝 Enroll
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <RealtimeCamera
              onFaceDetected={handleFaceDetected}
              onError={handleCameraError}
              isRecognitionMode={mode === 'recognize'}
              width={640}
              height={480}
            />
            
            {/* Status Bar */}
            <div className="mt-4 flex items-center justify-between">
              <div className={`px-3 py-2 rounded-full text-sm font-medium ${
                error 
                  ? 'bg-red-100 text-red-800'
                  : isProcessing
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
              }`}>
                {error || status}
              </div>
              
              {error && (
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {/* Current Result */}
          {lastResult && (
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Latest Recognition</h3>
              {lastResult.recognized ? (
                <div className="text-green-600">
                  <div className="font-medium">{lastResult.name}</div>
                  <div className="text-sm">{lastResult.student_id}</div>
                  <div className="text-xs mt-1">
                    Confidence: {(lastResult.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              ) : (
                <div className="text-red-600">
                  <div className="font-medium">Not Recognized</div>
                  <div className="text-xs mt-1">
                    Best Match: {(lastResult.similarity * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attendance Records */}
          {mode === 'recognize' && attendanceRecords.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                <button
                  onClick={clearRecords}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {attendanceRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                  >
                    <div>
                      {record.result.recognized ? (
                        <div className="text-green-600">
                          ✅ {record.result.name}
                        </div>
                      ) : (
                        <div className="text-red-600">❌ Unknown</div>
                      )}
                    </div>
                    <div className="text-gray-500">
                      {formatTime(record.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Look directly at the camera</li>
              <li>• Ensure good lighting</li>
              <li>• Keep your face centered</li>
              <li>• Remove glasses if recognition fails</li>
              <li>• Stay still for best results</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Camera;