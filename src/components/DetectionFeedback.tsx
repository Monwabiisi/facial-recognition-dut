import React from 'react';

interface DetectionFeedbackProps {
  faces: number;
  matchConfidence?: number;
  matchedStudent?: {
    name: string;
    studentId: string;
  } | null;
  error?: string;
}

export default function DetectionFeedback({
  faces,
  matchConfidence,
  matchedStudent,
  error
}: DetectionFeedbackProps) {
  if (error) {
    return (
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-interface-error bg-opacity-90 text-white rounded-lg shadow-lg">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (faces === 0) {
    return (
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-background-dark bg-opacity-90 text-white rounded-lg shadow-lg">
        <p className="text-sm">No faces detected. Please position yourself in the frame.</p>
      </div>
    );
  }

  if (faces > 1) {
    return (
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-interface-warning bg-opacity-90 text-white rounded-lg shadow-lg">
        <p className="text-sm">Multiple faces detected. Please ensure only one person is in frame.</p>
      </div>
    );
  }

  if (matchedStudent) {
    return (
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-interface-success bg-opacity-90 text-white rounded-lg shadow-lg">
        <p className="text-sm">
          ✓ Matched: {matchedStudent.name}
          {matchConfidence && ` (${(matchConfidence * 100).toFixed(1)}% confidence)`}
        </p>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-interface-info bg-opacity-90 text-white rounded-lg shadow-lg animate-pulse">
      <p className="text-sm">Face detected... analyzing</p>
    </div>
  );
}
