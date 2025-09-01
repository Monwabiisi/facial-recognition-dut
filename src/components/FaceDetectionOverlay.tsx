import React, { useEffect, useState } from 'react';

interface FaceDetectionOverlayProps {
  isScanning: boolean;
  confidence?: number;
  recognizedUser?: {
    name: string;
    studentId: string;
  } | null;
  faceCount: number;
  className?: string;
}

export default function FaceDetectionOverlay({
  isScanning,
  confidence = 0,
  recognizedUser,
  faceCount,
  className = ''
}: FaceDetectionOverlayProps) {
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(() => {
        setScanProgress(prev => (prev + 1) % 100);
      }, 50);
      return () => clearInterval(interval);
    } else {
      setScanProgress(0);
    }
  }, [isScanning]);

  const getStatusColor = () => {
    if (recognizedUser) return 'text-green-400';
    if (faceCount === 0) return 'text-gray-400';
    if (faceCount > 1) return 'text-yellow-400';
    return 'text-cyan-400';
  };

  const getStatusMessage = () => {
    if (recognizedUser) {
      return `✅ ${recognizedUser.name} (${recognizedUser.studentId})`;
    }
    if (faceCount === 0) {
      return '👤 Position your face in the frame';
    }
    if (faceCount > 1) {
      return '⚠️ Multiple faces detected';
    }
    return '🔍 Analyzing face...';
  };

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Scanning Grid */}
      {isScanning && (
        <div className="absolute inset-0">
          {/* Horizontal Scan Lines */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30"
              style={{
                top: `${i * 10}%`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
          
          {/* Vertical Scan Lines */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute h-full w-0.5 bg-gradient-to-b from-transparent via-purple-400 to-transparent opacity-20"
              style={{
                left: `${i * 10}%`,
                animationDelay: `${i * 0.15}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Face Detection Box */}
      {faceCount > 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative w-64 h-64">
            {/* Main Detection Box */}
            <div className={`absolute inset-0 border-2 rounded-lg transition-all duration-300 ${
              recognizedUser 
                ? 'border-green-400 shadow-green-400/50' 
                : 'border-cyan-400 shadow-cyan-400/50'
            }`}>
              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-white"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-white"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-white"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-white"></div>
              
              {/* Scanning Animation */}
              {isScanning && (
                <div className="absolute inset-0 overflow-hidden rounded-lg">
                  <div 
                    className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                    style={{
                      transform: `translateY(${scanProgress * 2.5}px)`,
                      transition: 'transform 0.05s linear'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Confidence Circle */}
            {confidence > 0 && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="url(#confidence-gradient)"
                      strokeWidth="2"
                      strokeDasharray={`${confidence}, 100`}
                      className="transition-all duration-500"
                    />
                    <defs>
                      <linearGradient id="confidence-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#00F5FF" />
                        <stop offset="100%" stopColor="#BF00FF" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {Math.round(confidence)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Display */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <div className="glass-card px-6 py-3 hover-glow">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isScanning ? 'animate-cyber-pulse' : ''}`}
              style={{ 
                backgroundColor: recognizedUser ? '#39FF14' : isScanning ? '#00F5FF' : '#666'
              }}
            />
            <span className={`font-mono text-sm ${getStatusColor()}`}>
              {getStatusMessage()}
            </span>
            {confidence > 0 && (
              <span className="text-xs text-gray-400 font-mono">
                ({Math.round(confidence)}% confidence)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Recognition Success Animation */}
      {recognizedUser && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="animate-cyber-pulse">
            <div className="w-32 h-32 rounded-full border-4 border-green-400 flex items-center justify-center">
              <div className="text-6xl">✅</div>
            </div>
          </div>
        </div>
      )}

      {/* Data Stream Effect */}
      {isScanning && (
        <div className="absolute top-0 left-0 w-full h-full data-stream opacity-30"></div>
      )}
    </div>
  );
}