import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { initEngine, detectOnce, type Engine, type Box } from '../engines/detection';
import Human from '@vladmandic/human';
import { drawBoxes, drawMesh, clearCanvas } from '../vision';
import DetectionFeedback from '../components/DetectionFeedback';

const Wrap = styled.div`
  padding: 1.25rem;
  display: grid;
  gap: 12px;
`;
const Row = styled.div`
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
`;
const Video = styled.video`
  width: 640px; height: 480px; background: #000; border-radius: 10px;
`;
const Canvas = styled.canvas`
  width: 640px; height: 480px; position: absolute; left: 0; top: 0; pointer-events: none;
`;
const Stage = styled.div`
  position: relative; width: 640px; height: 480px;
`;
const Button = styled.button`
  padding: 10px 14px; border: 0; border-radius: 8px; color: #fff;
  background: ${({theme}) => theme.buttonBg};
`;

const DEFAULT_ENGINE: Engine = 'mediapipe';

export default function Camera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Engine>(DEFAULT_ENGINE);
  const humanRef = useRef<typeof Human | null>(null);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string>('');
  const [detectedFaces, setDetectedFaces] = useState(0);
  const [matchConfidence, setMatchConfidence] = useState<number | undefined>();
  const [matchedStudent, setMatchedStudent] = useState<{ name: string; studentId: string } | null>(null);
  const [detectionError, setDetectionError] = useState<string | undefined>();
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const targetFps = 30; // Increased for smoother detection
  
  // Initialize Human instance once
  useEffect(() => {
    humanRef.current = new Human({
      cacheSensitivity: 0,
      warmup: 'none',
      modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models',
      face: { 
        enabled: true, 
        detector: { 
          rotation: true,
          maxDetected: 10, // Increase max faces
          minConfidence: 0.2
        },
        mesh: { enabled: true },
        iris: { enabled: true },
        description: { enabled: true }
      },
      hand: { enabled: false },
      body: { enabled: false },
      filter: { enabled: true }
    });
    
    return () => {
      if (humanRef.current) {
        humanRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          // Set canvas size to match video
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
        }
      } catch (e: any) {
        if (mounted) {
          setMsg(`Camera error: ${e?.message ?? 'Failed to initialize camera'}`);
          console.error('Camera initialization error:', e);
        }
      }
    };

    initializeCamera();

    return () => {
      mounted = false;
      const s = videoRef.current?.srcObject as MediaStream | undefined;
      if (s) {
        s.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadModels = async () => {
      try {
        setMsg('Loading detection models...');
        await initEngine(engine, humanRef.current);
        if (mounted) {
          setMsg('Models loaded successfully.');
        }
      } catch (e: any) {
        if (mounted) {
          setMsg(`Model initialization error: ${e?.message ?? 'Failed to load models'}`);
          console.error('Model initialization error:', e);
        }
      }
    };

    loadModels();

    return () => {
      mounted = false;
    };
  }, [engine]);

  const loop = async (t: number) => {
    if (!running) return;

    const minDelta = 1000 / targetFps;
    if (t - lastTimeRef.current < minDelta) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    lastTimeRef.current = t;

    try {
      const v = videoRef.current;
      const c = canvasRef.current;
      
      if (!v || !c || v.readyState !== v.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // Ensure canvas dimensions match video
      if (c.width !== v.videoWidth || c.height !== v.videoHeight) {
        c.width = v.videoWidth;
        c.height = v.videoHeight;
      }

      const ctx = c.getContext('2d');
      if (!ctx) {
        console.error('Failed to get canvas context');
        return;
      }

      // Clear previous frame
      ctx.clearRect(0, 0, c.width, c.height);

      // Perform detection
      const boxes: Box[] = await detectOnce(engine, v, humanRef.current);
      
      // Draw results
      ctx.save();
      drawBoxes(ctx, boxes);
      
      if (engine === 'mediapipe' || engine === 'human') {
        const meshPoints = (window as any).__lastFaceMesh;
        if (meshPoints?.length) {
          drawMesh(ctx, meshPoints[0]); // Draw first face mesh
        }
      }
      ctx.restore();

      // Performance monitoring
      if (boxes.length > 0 && msg === 'Models loaded successfully.') {
        setMsg(`Detected ${boxes.length} face${boxes.length > 1 ? 's' : ''}`);
      }

    } catch (e: any) {
      console.error('Detection error:', e);
      setMsg(`Detection error: ${e?.message ?? 'Unknown error'}`);
    }

    // Continue loop if still running
    if (running) {
      rafRef.current = requestAnimationFrame(loop);
    }
  };

  const start = async () => {
    if (running) return;
    
    // Check if video is ready
    if (!videoRef.current?.readyState || videoRef.current.readyState < 2) {
      setMsg('Please wait for camera to initialize...');
      return;
    }

    try {
      setRunning(true);
      setMsg('Starting detection...');
      rafRef.current = requestAnimationFrame(loop);
    } catch (e: any) {
      console.error('Failed to start detection:', e);
      setMsg(`Start error: ${e?.message ?? 'Failed to start detection'}`);
      setRunning(false);
    }
  };

  const stop = () => {
    setRunning(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const c = canvasRef.current;
    if (c) {
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, c.width, c.height);
      }
    }
    setMsg('Detection stopped');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  return (
    <Wrap>
      <h2>Camera & Detection</h2>
      <Row>
        <label>Detection Engine: </label>
        <select 
          value={engine} 
          onChange={e => {
            setEngine(e.target.value as Engine);
            if (running) {
              stop();
            }
          }}
          disabled={running}
        >
          <option value="mediapipe">MediaPipe Face Mesh</option>
          <option value="human">Human</option>
          <option value="faceapi">face-api.js</option>
        </select>
        <Button 
          onClick={running ? stop : start}
          disabled={!videoRef.current?.readyState || videoRef.current.readyState < 2}
        >
          {running ? 'Stop' : 'Start'} Detection
        </Button>
        {msg && (
          <small className={msg.includes('error') ? 'text-red-500' : 'text-green-500'}>
            {msg}
          </small>
        )}
      </Row>

      <Stage>
        <Video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          onLoadedData={() => setMsg('Camera ready')}
          onError={(e) => {
            console.error('Video error:', e);
            setMsg('Camera error: Failed to initialize video');
          }}
        />
        <Canvas ref={canvasRef} />
        <DetectionFeedback 
          faces={detectedFaces}
          matchConfidence={matchConfidence}
          matchedStudent={matchedStudent}
          error={detectionError}
        />
      </Stage>

      <div className="mt-4 text-sm text-gray-600">
        <h3 className="font-medium mb-2">Tips for Best Results:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Ensure good lighting on your face</li>
          <li>Keep your face centered and still</li>
          <li>Maintain a distance of 1-2 feet from the camera</li>
          <li>Use Chrome or Safari for best performance</li>
          <li>Each engine has different strengths:
            <ul className="ml-4 mt-1">
              <li>MediaPipe: Best for detailed facial landmarks</li>
              <li>Human: Great all-around performance</li>
              <li>face-api.js: Most stable for face recognition</li>
            </ul>
          </li>
        </ul>
      </div>
    </Wrap>
  );
}
