import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCamera } from '../hooks/useCamera';

type Engine = 'mediapipe' | 'human' | 'faceapi';
const ENGINE_ORDER: Engine[] = ['mediapipe', 'human', 'faceapi'];

type Box = { x: number; y: number; width: number; height: number };

export default function FaceLab() {
  const cam = useCamera() as any;
  const videoRef = cam.videoRef as React.RefObject<HTMLVideoElement>;
  const ready = cam.ready as boolean;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [engine, setEngine] = useState<Engine>('mediapipe');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const drawBoxes = useCallback((boxes: Box[]) => {
    const cvs = canvasRef.current;
    const vid = videoRef.current;
    if (!cvs || !vid) return;
    cvs.width = vid.videoWidth || 640;
    cvs.height = vid.videoHeight || 480;
    const ctx = cvs.getContext('2d')!;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00e676';
    boxes.forEach((b) => ctx.strokeRect(b.x, b.y, b.width, b.height));
  }, [videoRef]);

  useEffect(() => {
    if (!ready) return;
    const vid = videoRef.current;
    const cvs = canvasRef.current;
    if (!vid || !cvs) return;
    cvs.width = vid.videoWidth || 640;
    cvs.height = vid.videoHeight || 480;
  }, [ready, videoRef]);

  return (
    <div className="p-4 max-w-[1200px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          {errorMsg && (
            <div className="text-sm p-3 rounded-lg bg-red-100 text-red-800 border border-red-200">
              {errorMsg}
            </div>
          )}

          <div className="relative rounded-xl overflow-hidden bg-gray-900 shadow-lg">
            <video ref={videoRef} muted playsInline className="w-full aspect-[4/3] object-cover" />
            <canvas ref={canvasRef} className="absolute left-0 top-0" />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Detection Engine</h3>
            <div className="space-y-2">
              {ENGINE_ORDER.map((e) => (
                <button
                  key={e}
                  className={`w-full px-4 py-2.5 rounded-lg text-left font-medium transition-colors ${
                    engine === e ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setEngine(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
