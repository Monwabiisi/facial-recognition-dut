import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Camera } from "./Camera";
import { recognize, enroll, listEnrollments, clearAllEnrollments } from "../engines/recognition";
import { DetectionResult } from "../engines/detection";

interface RecognitionResult {
  label: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
}

interface EnrollmentData {
  label: string;
  samples: number;
}

export default function AttendanceRecognition() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [latestDetections, setLatestDetections] = useState<DetectionResult[]>([]);

  const [isEnrollMode, setIsEnrollMode] = useState(false);
  const [enrollName, setEnrollName] = useState("");
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [recognitionResults, setRecognitionResults] = useState<RecognitionResult[]>([]);
  const [unknownClusters, setUnknownClusters] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(false);

  // Load enrollments on mount
  useEffect(() => {
    setEnrollments(listEnrollments());
  }, []);

  const handleDetections = useCallback(async (detections: DetectionResult[]) => {
    setLatestDetections(detections);
    if (isEnrollMode || !videoRef.current) return;

    const results: RecognitionResult[] = [];
    for (const detection of detections) {
      if (detection.embedding) {
        const result = await recognize(detection.embedding, videoRef.current, detection);
        results.push({
          label: result.label,
          confidence: result.confidence,
          box: detection
        });

        if (result.label === "unknown") {
          const clusterId = Date.now().toString();
          setUnknownClusters(prev => ({
            ...prev,
            [clusterId]: (prev[clusterId] || 0) + 1
          }));
        }
      }
    }
    setRecognitionResults(results);
  }, [isEnrollMode, videoRef]);

  // Draw results on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !recognitionResults.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas size to video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw for each detected face
    recognitionResults.forEach(({ box, label, confidence }) => {
      // Box style based on confidence
      const hue = confidence * 120; // 0 = red, 120 = green
      ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Background for text
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(box.x, box.y - 30, box.width, 30);

      // Text
      ctx.fillStyle = "white";
      ctx.font = "14px Inter";
      ctx.fillText(
        `${label} (${Math.round(confidence * 100)}%)`,
        box.x + 5,
        box.y - 10
      );
    });
  }, [recognitionResults, videoRef]);

  // Handle enrollment
  const handleEnroll = async () => {
    if (!videoRef.current || !enrollName.trim()) return;

    const detection = latestDetections[0];
    if (!detection || !detection.embedding) {
      alert("No face detected. Please position your face in the center of the camera.");
      return;
    }
    
    setLoading(true);
    try {
      await enroll(enrollName.trim(), detection.embedding, videoRef.current, detection);
      setEnrollments(listEnrollments());
      setEnrollName("");
      setIsEnrollMode(false);
    } catch (error) {
      console.error("Enrollment error:", error);
      alert(`Enrollment failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 max-w-[1200px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Video Section */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-gray-900 shadow-lg">
            <Camera
              onFaceDetected={handleDetections}
              isActive={!isEnrollMode}
              engine="faceapi"
              onVideoReady={(videoEl) => (videoRef.current = videoEl)}
            />
            <canvas ref={canvasRef} className="absolute left-0 top-0" />

            {/* Video Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-center gap-3 text-white">
                <button
                  className={`px-3 py-1.5 rounded-full transition-colors ${
                    isEnrollMode 
                      ? "bg-red-500/80 hover:bg-red-500" 
                      : "bg-emerald-500/80 hover:bg-emerald-500"
                  }`}
                  onClick={() => setIsEnrollMode(!isEnrollMode)}
                >
                  {isEnrollMode ? "Cancel Enrollment" : "Start Enrollment"}
                </button>
              </div>
            </div>

            {/* Enrollment Overlay */}
            {isEnrollMode && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4">Enroll New Student</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Student Name"
                      className="w-full px-4 py-2 rounded-lg border"
                      value={enrollName}
                      onChange={(e) => setEnrollName(e.target.value)}
                    />
                    <button
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      onClick={handleEnroll}
                      disabled={loading || !enrollName.trim()}
                    >
                      {loading ? "Enrolling..." : "Enroll"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* Enrolled Students */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Enrolled Students</h3>
              <button
                onClick={() => {
                  if (window.confirm("Clear all enrollments?")) {
                    clearAllEnrollments();
                    setEnrollments([]);
                  }
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-2">
              {enrollments.map((e) => (
                <div
                  key={e.label}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <span className="font-medium">{e.label}</span>
                  <span className="text-sm text-gray-500">
                    {e.samples} samples
                  </span>
                </div>
              ))}
              {!enrollments.length && (
                <p className="text-sm text-gray-500 text-center py-2">
                  No students enrolled
                </p>
              )}
            </div>
          </div>

          {/* Recognition Results */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Current Recognition</h3>
            <div className="space-y-2">
              {recognitionResults.map((r, i) => (
                <div
                  key={i}
                  className="p-2 rounded-lg"
                  style={{
                    backgroundColor: `hsla(${r.confidence * 120}, 100%, 97%, 1)`,
                    borderLeft: `4px solid hsla(${r.confidence * 120}, 100%, 50%, 1)`
                  }}
                >
                  <div className="font-medium">{r.label}</div>
                  <div className="text-sm text-gray-600">
                    Confidence: {Math.round(r.confidence * 100)}%
                  </div>
                </div>
              ))}
              {!recognitionResults.length && (
                <p className="text-sm text-gray-500 text-center py-2">
                  No faces detected
                </p>
              )}
            </div>
          </div>

          {/* Unknown Faces Clusters */}
          {Object.keys(unknownClusters).length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold mb-3">Unknown Faces</h3>
              <div className="space-y-2">
                {Object.entries(unknownClusters).map(([id, count]) => (
                  <div
                    key={id}
                    className="p-2 bg-gray-50 rounded-lg flex justify-between items-center"
                  >
                    <span className="text-sm">Unknown Group #{id.slice(-4)}</span>
                    <span className="text-xs text-gray-500">
                      {count} occurrences
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
