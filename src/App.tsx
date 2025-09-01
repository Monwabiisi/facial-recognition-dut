// V4
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import RealtimeCamera from './components/RealtimeCamera'; // 👈 Make sure this path is correct
import Button, { ButtonGroup } from './components/Button'; // 👈 Import your custom Button components

// Types
interface User {
  id: number;
  student_id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher';
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  name: string;
  timestamp: string;
  confidence: number;
}

interface FaceData {
  id: string;
  name: string;
  student_id: string;
  descriptor: Float32Array;
}

// SQLite API Service
class SQLiteService {
  private baseURL = 'http://localhost:5000/api';

  async getUsers(): Promise<User[]> {
    const response = await fetch(`${this.baseURL}/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  }

  async addUser(user: Omit<User, 'id'>): Promise<User> {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: user.student_id,
        name: user.name,
        email: user.email,
        role: user.role
      })
    });
    if (!response.ok) throw new Error('Failed to add user');
    const data = await response.json();
    return {
      id: data.id,
      student_id: data.studentId,
      name: data.name,
      email: data.email,
      role: data.role
    };
  }

  async saveFaceData(data: FaceData): Promise<void> {
    // Find user by student_id to get user_id. If not found, create the user automatically.
    let users = await this.getUsers();
    let user = users.find(u => u.student_id === data.student_id);

    if (!user) {
      // Create a minimal user record so enrollment can proceed.
      const fallbackEmail = `${data.student_id}@local.invalid`;
      const newUserPayload = {
        student_id: data.student_id,
        name: data.name || `Student ${data.student_id}`,
        email: fallbackEmail,
        role: 'student' as const,
      };

      // Try using addUser API if available, otherwise hit /users endpoint as fallback
      try {
        const created = await this.addUser({
          student_id: newUserPayload.student_id,
          name: newUserPayload.name,
          email: newUserPayload.email,
          role: 'student',
        } as any);
        user = created;
      } catch (err) {
        // If creating via API fails, attempt to refresh users and find again
        users = await this.getUsers();
        user = users.find(u => u.student_id === data.student_id);
      }

      if (!user) {
        throw new Error('User not found and could not be created');
      }
    }

    const formData = new FormData();
    formData.append('user_id', user.id.toString());
    formData.append('embedding', JSON.stringify(Array.from(data.descriptor)));
    formData.append('confidence', '1.0');

    const response = await fetch(`${this.baseURL}/faces/enroll`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Failed to save face data');
  }

  async getFaceData(): Promise<FaceData[]> {
    const response = await fetch(`${this.baseURL}/faces`);
    if (!response.ok) throw new Error('Failed to fetch face data');
    const data = await response.json();
    
    return data.map((item: any) => ({
      id: item.student_id,
      name: item.name,
      student_id: item.student_id,
      descriptor: new Float32Array(JSON.parse(item.embedding))
    }));
  }

  async recordAttendance(record: AttendanceRecord): Promise<void> {
    // Post attendance to backend API. Expect backend to enforce constraints as well.
    try {
      const payload = {
        student_id: record.student_id,
        name: record.name,
        timestamp: record.timestamp,
        confidence: record.confidence,
        // allow optional class_id if supplied by caller
        // @ts-ignore
        class_id: (record as any).class_id ?? null
      };

      const res = await fetch(`${this.baseURL}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text();
        console.warn('Failed to post attendance:', res.status, txt);
        throw new Error('Failed to post attendance');
      }
    } catch (err) {
      console.error('recordAttendance error:', err);
      // fallback: push to console only; don't crash the UI
    }
  }

  async getAttendance(): Promise<AttendanceRecord[]> {
    // Return mock data for now - implement proper attendance retrieval
    return [];
  }
}

const db = new SQLiteService();

// Face Recognition Camera Component — now uses RealtimeCamera to avoid duplicate camera logic
const FaceRecognitionCamera: React.FC<{
  onFaceRecognized: (result: { name: string; student_id: string; confidence: number }) => void;
  onFaceEnrolled: (success: boolean) => void;
  enrollMode: boolean;
  enrollData?: { name: string; student_id: string };
}> = ({ onFaceRecognized, onFaceEnrolled, enrollMode, enrollData }) => {
  return (
    <RealtimeCamera
      onFaceRecognized={onFaceRecognized}
      onFaceEnrolled={onFaceEnrolled}
      enrollMode={enrollMode}
      enrollData={enrollData}
    />
  );
};

// Main App Component
export default function App() {
  const [currentView, setCurrentView] = useState<'login' | 'camera' | 'enroll' | 'attendance' | 'classes'>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  // Current class context (assumption: class ids exist in backend). Default to 1 for legacy compatibility.
  const [currentClassId, setCurrentClassId] = useState<number>(1);
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [enrollStep, setEnrollStep] = useState<'form' | 'capture'>('form'); // Control enrollment flow
  const [capturedImage, setCapturedImage] = useState<string | null>(null); // Store the captured image
  const [isEnrolling, setIsEnrolling] = useState(false); // For loading state on the button
  
  
  // Enrollment state
  const [enrollMode, setEnrollMode] = useState(false);
  const [enrollName, setEnrollName] = useState('');
  const [enrollStudentId, setEnrollStudentId] = useState('');
  
  // Recognition state
  const [lastRecognition, setLastRecognition] = useState<{
    name: string;
    student_id: string;
    confidence: number;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    loadUsers();
    loadAttendance();
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
        if (data.length) setCurrentClassId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch classes', err);
    }
  };

  const loadUsers = async () => {
    const userList = await db.getUsers();
    setUsers(userList);
  };

  const loadAttendance = async () => {
    const records = await db.getAttendance();
    setAttendanceRecords(records);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentView('camera');
  };

  const handleFaceRecognized = async (result: { name: string; student_id: string; confidence: number }) => {
    const timestamp = new Date().toISOString();
    
  // Only record attendance if confidence >= 0.6 (60%)
  if (result.confidence < 0.6) return;

    // Uniqueness: one attendance per user per class per day.
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const existing = attendanceRecords.find(r => r.student_id === result.student_id && r.timestamp.slice(0,10) === today && (r as any).class_id === currentClassId);

    if (existing) return; // already recorded for this student today in this class

    const record: AttendanceRecord = {
      id: Date.now().toString(),
      student_id: result.student_id,
      name: result.name,
      timestamp,
      confidence: result.confidence
    };

    // Attach class_id metadata when sending to backend (backend should store class association)
    await db.recordAttendance({ ...record, //@ts-ignore - backend supports class_id
      // @ts-ignore
      class_id: currentClassId
    } as any);
    setAttendanceRecords(prev => [{ ...record, // keep local record
      // @ts-ignore
      class_id: currentClassId
    }, ...prev]);
    
    setLastRecognition({
      name: result.name,
      student_id: result.student_id,
      confidence: result.confidence,
      timestamp
    });
  };

  const handleFaceEnrolled = async (success: boolean) => {
    if (success) {
      alert(`Successfully enrolled ${enrollName}!`);
      setEnrollMode(false);
      setEnrollName('');
      setEnrollStudentId('');
    } else {
      alert('Enrollment failed. Please try again.');
    }
  };

  const startEnrollment = () => {
    if (!enrollName.trim() || !enrollStudentId.trim()) {
      alert('Please enter both name and student ID');
      return;
    }
    setEnrollStep('capture'); // Move to the camera capture view
  };
  
  const cancelEnrollment = () => {
    setEnrollStep('form');
    setCapturedImage(null);
    setIsEnrolling(false);
  };
  
  // This new function handles the final enrollment after an image is captured
  const handleEnroll = async (imageDataUrl: string) => {
    setIsEnrolling(true);
    try {
      // Support single image or multiple images (burst). If array, compute average descriptor.
      const images = Array.isArray(imageDataUrl) ? imageDataUrl : [imageDataUrl];
      const descriptors: Float32Array[] = [];
      for (const dataUrl of images) {
        const img = await faceapi.fetchImage(dataUrl);
        const detection = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (detection && detection.descriptor) descriptors.push(detection.descriptor);
      }

      if (descriptors.length === 0) {
        alert('No face detected in the captured images. Please try again.');
        setIsEnrolling(false);
        return;
      }

      // Average descriptors
      const len = descriptors[0].length;
      const avg = new Float32Array(len);
      for (const d of descriptors) {
        for (let i = 0; i < len; i++) avg[i] += d[i];
      }
      for (let i = 0; i < len; i++) avg[i] = avg[i] / descriptors.length;

      const faceData: FaceData = {
        id: enrollStudentId,
        name: enrollName,
        student_id: enrollStudentId,
        descriptor: avg,
      };

      await db.saveFaceData(faceData);
      alert(`Successfully enrolled ${enrollName}!`);

      // Reset state and go back to the form
      cancelEnrollment();
      loadUsers(); // Refresh the list of users

    } catch (error) {
      console.error('Enrollment error:', error);
      alert('Enrollment failed. Please try again.');
      setIsEnrolling(false);
    }
  };

  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">Face Recognition Attendance</h1>
          
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Select User:</h2>
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => handleLogin(user)}
                className="w-full p-3 text-left border rounded-lg hover:bg-blue-50 transition-colors"
              >
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-gray-600">{user.student_id} - {user.role}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Face Recognition Attendance</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Welcome, {currentUser?.name}</span>
            <nav className="flex space-x-2">
              <button
                onClick={() => setCurrentView('camera')}
                className={`px-3 py-2 rounded ${currentView === 'camera' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Camera
              </button>
              <button
                onClick={() => setCurrentView('classes')}
                className={`px-3 py-2 rounded ${currentView === 'classes' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Classes
              </button>
              {currentUser?.role === 'teacher' && (
                <button
                  onClick={() => setCurrentView('enroll')}
                  className={`px-3 py-2 rounded ${currentView === 'enroll' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                >
                  Enroll
                </button>
              )}
              <button
                onClick={() => setCurrentView('attendance')}
                className={`px-3 py-2 rounded ${currentView === 'attendance' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Attendance
              </button>
            </nav>
            <button
              onClick={() => {
                setCurrentUser(null);
                setCurrentView('login');
              }}
              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {currentView === 'camera' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Live Face Recognition</h2>
                <FaceRecognitionCamera
                  onFaceRecognized={handleFaceRecognized}
                  onFaceEnrolled={handleFaceEnrolled}
                  enrollMode={false}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              {lastRecognition && (
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <h3 className="font-semibold mb-2">Latest Recognition</h3>
                  <div className="text-green-600">
                    <div className="font-medium">{lastRecognition.name}</div>
                    <div className="text-sm">{lastRecognition.student_id}</div>
                    <div className="text-xs">
                      Confidence: {(lastRecognition.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="font-semibold mb-2">Recent Attendance</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {attendanceRecords.slice(0, 5).map(record => (
                    <div key={record.id} className="text-sm p-2 bg-gray-50 rounded">
                      <div className="font-medium">{record.name}</div>
                      <div className="text-gray-600">
                        {new Date(record.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'enroll' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Enroll New Face</h2>
                
                {enrollStep === 'form' && (
                <div className="space-y-4 max-w-md" >
                    <div>
                      <label className="block text-sm font-medium mb-2">Student Name</label>
                      <input
                        type="text"
                        value={enrollName}
                        onChange={(e) => setEnrollName(e.target.value)}
                        className="w-full p-3 border rounded-lg"
                        placeholder="Enter student name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Student ID</label>
                      <input
                        type="text"
                        value={enrollStudentId}
                        onChange={(e) => setEnrollStudentId(e.target.value)}
                        className="w-full p-3 border rounded-lg"
                        placeholder="Enter student ID"
                      />
                    </div>
                  <Button onClick={startEnrollment} fullWidth size="lg" >
                    Start Enrollment
                  </Button>
                </div>
                )}
                {enrollStep === 'capture' && (
                <div>
                  {!capturedImage ? (
                    // Show the live camera to capture multiple frames for a stronger embedding
                    <RealtimeCamera
                      showCaptureButton={true}
                      burstCount={5}
                      onMultiCapture={(images) => {
                        // images is an array of dataURLs — pass to enrollment processor
                        handleEnroll(images as any);
                        // also set preview to first frame for confirmation
                        if (images && images.length) setCapturedImage(images[0]);
                      }}
                      enrollmentName={enrollName}
                    />
                  ) : (
                    // Show the captured image for confirmation — enhanced UI
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 shadow-lg">
                      <div className="flex flex-col lg:flex-row items-center gap-4">
                        <div className="w-full lg:w-1/3">
                          <img src={capturedImage} alt="Captured face" className="rounded-lg w-full object-cover shadow-inner" />
                        </div>
                        <div className="flex-1 w-full lg:w-2/3">
                          <h3 className="text-lg font-semibold">Confirm Enrollment</h3>
                          <p className="text-sm text-gray-600 mt-2">Name: <span className="font-medium">{enrollName}</span></p>
                          <p className="text-sm text-gray-600">Student ID: <span className="font-medium">{enrollStudentId}</span></p>
                          <div className="mt-4 flex space-x-3">
                            <Button
                              variant="primary"
                              size="lg"
                              onClick={() => handleEnroll(capturedImage!)}
                              disabled={!capturedImage || isEnrolling}
                              loading={isEnrolling}
                            >
                              Confirm & Save
                            </Button>
                            <Button variant="ghost" onClick={() => setCapturedImage(null)}>
                              Retake
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <ButtonGroup className="mt-4">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => handleEnroll(capturedImage!)}
                      disabled={!capturedImage || isEnrolling}
                      loading={isEnrolling}
                    >
                      Confirm and Save
                    </Button>
                    <Button variant="ghost" onClick={cancelEnrollment} disabled={isEnrolling}>
                      Cancel
                    </Button>
                  </ButtonGroup>
                </div>
                )}
        </div>
      </div>
            
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="font-semibold mb-4">Enrolled Students</h3>
              <div className="space-y-2">
                {users.filter(u => u.role === 'student').map(user => (
                  <div key={user.id} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-gray-600">{user.student_id}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentView === 'classes' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Classes</h2>
            <div className="space-y-3">
              {classes.map(c => (
                <div key={c.id} className={`p-3 rounded-lg cursor-pointer ${currentClassId === c.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`} onClick={() => setCurrentClassId(c.id)}>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-gray-600">ID: {c.id}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'attendance' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Attendance Records</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-3 text-left">Name</th>
                    <th className="border border-gray-300 p-3 text-left">Student ID</th>
                    <th className="border border-gray-300 p-3 text-left">Timestamp</th>
                    <th className="border border-gray-300 p-3 text-left">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map(record => (
                    <tr key={record.id}>
                      <td className="border border-gray-300 p-3">{record.name}</td>
                      <td className="border border-gray-300 p-3">{record.student_id}</td>
                      <td className="border border-gray-300 p-3">
                        {new Date(record.timestamp).toLocaleString()}
                      </td>
                      <td className="border border-gray-300 p-3">
                        {(record.confidence * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
