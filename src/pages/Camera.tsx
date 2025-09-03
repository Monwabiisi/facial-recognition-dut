// src/pages/Camera.tsx
import React, { useState, useCallback } from 'react';
import { RealtimeCamera } from '../components/RealtimeCamera';
import { useAuth } from '../contexts/AuthContext';
import faceService, { RecognitionResult } from '../services/faceService';
import { markPresent } from '../services/attendanceService';

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

  // Called when RealtimeCamera reports a recognized face
  const handleFaceRecognized = useCallback(async (result: { name: string; student_id: string; confidence: number; user_id?: number } | null) => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      setError(null);

      if (!result) {
        setStatus('No face recognized');
        return;
      }

      const recogn: RecognitionResult = {
        recognized: true,
        user_id: undefined,
        name: result.name,
        student_id: result.student_id,
        similarity: result.confidence,
        confidence: result.confidence,
      } as RecognitionResult;

      setLastResult(recogn);
      setStatus(`✅ Recognized: ${result.name} (${result.student_id})`);

      const record: AttendanceRecord = {
        id: Date.now().toString(),
        timestamp: new Date(),
        result: recogn,
        confidence: recogn.confidence,
      };

      setAttendanceRecords(prev => [record, ...prev.slice(0, 9)]);

      // Mark present locally (deduplicates by day)
      try {
        markPresent(result.student_id, 'face-api');
      } catch (e) {
        console.warn('Failed to mark present locally', e);
      }

      // Also attempt to post attendance to server if we have a numeric user_id
      if (result.user_id) {
        try {
          // Fetch active sessions and pick the first active one
          const sres = await fetch('/api/attendance/sessions');
          if (sres.ok) {
            const sessions = await sres.json();
            const active = sessions.find((s: any) => s.is_active === 1 || s.is_active === true) || sessions[0];
            if (active) {
              const body = { session_id: active.id, user_id: result.user_id, status: 'present', confidence: result.confidence };
              const rec = await fetch('/api/attendance/record', {
                method: 'POST',
                body: JSON.stringify(body),
                headers: { 'Content-Type': 'application/json' }
              });
              if (rec.ok) {
                console.log('Attendance recorded on server for user', result.user_id);
              } else {
                console.warn('Failed to record attendance on server', await rec.text());
              }
            } else {
              console.warn('No active attendance session found; skipping server attendance');
            }
          }
        } catch (e) {
          console.warn('Error posting attendance to server', e);
        }
      }
    } catch (error) {
      console.error('Face recognition handler error:', error);
      setError(error instanceof Error ? error.message : 'Recognition handler failed');
      setStatus('Error processing recognition');
    } finally {
      setIsProcessing(false);
      setTimeout(() => { if (!isProcessing) setStatus('Ready'); }, 3000);
    }
  }, [isProcessing]);

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
              onFaceRecognized={handleFaceRecognized}
              onFaceEnrolled={() => { /* no-op */ }}
              enrollMode={mode === 'enroll'}
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