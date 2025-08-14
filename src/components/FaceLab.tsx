import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useCamera } from "../hooks/useCamera";
import { RecognitionResult, EnrollmentData } from "../types/recognition";
import { recognize, enroll, listEnrollments, clearAllEnrollments } from "../engines/recognition";

import Human from "human";
import * as faceapi from "face-api.js";
import { FaceDetection } from "@mediapipe/face_detection";
// We avoid @mediapipe/camera_utils to prevent play() conflicts

type HumanFaceBox = { box: [number, number, number, number] };
type Engine = "mediapipe" | "human" | "faceapi";
const ENGINE_ORDER: Engine[] = ["mediapipe", "human", "faceapi"];

type Box = { x: number; y: number; width: number; height: number };

export default function FaceLab() {
  const cam = useCamera() as any;
  const videoRef = cam.videoRef as React.RefObject<HTMLVideoElement>;
  const ready = cam.ready as boolean;
  const flipCamera = cam.flipCamera as (() => void) | undefined;
  const facing = (cam.facing as "user" | "environment" | undefined) ?? "user";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [engine, setEngine] = useState<Engine>("mediapipe");
  const [autoFallback, setAutoFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  
  // New states for recognition features
  const [isEnrollMode, setIsEnrollMode] = useState(false);
  const [enrollName, setEnrollName] = useState("");
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [recognitionResults, setRecognitionResults] = useState<RecognitionResult[]>([]);
  const [unknownClusters, setUnknownClusters] = useState<{[key: string]: number}>({})mo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useCamera } from "../hooks/useCamera";

import Human from "human";
import * as faceapi from "face-api.js";
import { FaceDetection } from "@mediapipe/face_detection";
// We avoid @mediapipe/camera_utils to prevent play() conflicts

type HumanFaceBox = { box: [number, number, number, number] };
type Engine = "mediapipe" | "human" | "faceapi";
const ENGINE_ORDER: Engine[] = ["mediapipe", "human", "faceapi"];

type Box = { x: number; y: number; width: number; height: number };

export default function FaceLab() {
  // 👇 If your hook exposes flipCamera & facing, they’ll be used (phones).
  // If your current hook returns only { videoRef, ready }, this still compiles—
  // just comment the flip button in the JSX until you paste the new hook.
  const cam = useCamera() as any;
  const videoRef = cam.videoRef as React.RefObject<HTMLVideoElement>;
  const ready = cam.ready as boolean;
  const flipCamera = cam.flipCamera as (() => void) | undefined;
  const facing = (cam.facing as "user" | "environment" | undefined) ?? "user";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [engine, setEngine] = useState<Engine>("mediapipe");
  const [autoFallback, setAutoFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Keep last boxes for screenshot
  const boxesRef = useRef<Box[]>([]);

  // FPS tracking
  const [fps, setFps] = useState<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(performance.now());
  const tickFps = useCallback(() => {
    const now = performance.now();
    frameCountRef.current += 1;
    if (now - lastFpsUpdateRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = now;
    }
  }, []);

  // Human instance (stable)
  const human = useMemo(
    () =>
      new Human({
        modelBasePath: "https://vladmandic.github.io/human/models",
        cacheSensitivity: 0,
        debug: false,
        face: {
          enabled: true,
          detector: { rotation: true },
          mesh: false,
          iris: true,
          description: true,
        },
        hand: { enabled: false },
        body: { enabled: false },
        gesture: { enabled: false },
        object: { enabled: false },
        segmentation: { enabled: false },
      }),
    []
  );

  // Draw bounding boxes over the video
  const drawBoxes = useCallback(
    (boxes: Box[]) => {
      const cvs = canvasRef.current;
      const vid = videoRef.current;
      if (!cvs || !vid) return;

      boxesRef.current = boxes; // store for screenshots

      // match canvas to video size
      cvs.width = vid.videoWidth;
      cvs.height = vid.videoHeight;

      const ctx = cvs.getContext("2d")!;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#00e676";

      boxes.forEach((b) => ctx.strokeRect(b.x, b.y, b.width, b.height));
      tickFps();
    },
    [videoRef, canvasRef, tickFps]
  );

  // Safe play (don’t explode if interrupted)
  const safePlay = useCallback(async () => {
    try {
      await videoRef.current?.play();
    } catch (err) {
      console.warn("Video play() interrupted:", err);
    }
  }, [videoRef]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let raf = 0;

    const stopLoop = () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      drawBoxes([]);
    };

    const startMediaPipe = async () => {
      const fd = new FaceDetection({
        locateFile: (f: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${f}`,
      });
      fd.setOptions({ model: "short", minDetectionConfidence: 0.6 });

      fd.onResults((res: any) => {
        if (cancelled) return;
        const vid = videoRef.current!;
        const b: Box[] = (res.detections || []).map((d: any) => {
          const bb = d.boundingBox;
          return {
            x: bb.xCenter * vid.videoWidth - (bb.width * vid.videoWidth) / 2,
            y:
              bb.yCenter * vid.videoHeight -
              (bb.height * vid.videoHeight) / 2,
            width: bb.width * vid.videoWidth,
            height: bb.height * vid.videoHeight,
          };
        });
        drawBoxes(b);
      });

      const loop = async () => {
        if (cancelled) return;
        await fd.send({ image: videoRef.current! });
        raf = requestAnimationFrame(loop);
      };
      loop();
    };

    const startHuman = async () => {
      await human.load();
      const loop = async () => {
        if (cancelled) return;
        const res = await human.detect(videoRef.current!);
        const faces: Box[] = (res.face || []).map((f: HumanFaceBox) => {
          const [x, y, w, h] = f.box;
          return { x, y, width: w, height: h };
        });
        drawBoxes(faces);
        raf = requestAnimationFrame(loop);
      };
      loop();
    };

    const startFaceAPI = async () => {
      const url = "https://justadudewhohacks.github.io/face-api.js/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(url),
        faceapi.nets.faceLandmark68Net.loadFromUri(url),
        faceapi.nets.faceRecognitionNet.loadFromUri(url),
      ]);
      const loop = async () => {
        if (cancelled) return;
        const results = await faceapi
          .detectAllFaces(
            videoRef.current!,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 256,
              scoreThreshold: 0.5,
            })
          )
          .withFaceLandmarks()
          .withFaceDescriptors();
        const boxes: Box[] = results.map((r) => r.detection.box);
        drawBoxes(boxes);
        raf = requestAnimationFrame(loop);
      };
      loop();
    };

    const startByEngine = async (e: Engine) => {
      setErrorMsg("");
      setLoading(true);
      await safePlay();

      try {
        if (e === "mediapipe") await startMediaPipe();
        if (e === "human") await startHuman();
        if (e === "faceapi") await startFaceAPI();
        setLoading(false);
        return true;
      } catch (err: any) {
        console.error(`Engine ${e} failed:`, err);
        setLoading(false);
        setErrorMsg(`Engine "${e}" failed: ${err?.message || "Unknown error"}`);
        return false;
      }
    };

    const tryStart = async () => {
      const ok = await startByEngine(engine);
      if (ok || !autoFallback) return;

      // fallback if enabled
      for (const next of ENGINE_ORDER) {
        if (next === engine) continue;
        const okNext = await startByEngine(next);
        if (okNext) {
          setErrorMsg(
            `Switched to "${next}" after "${engine}" failed (auto‑fallback on).`
          );
          setEngine(next);
          return;
        }
      }
      setErrorMsg(
        "All engines failed. Check camera permissions and reload the page."
      );
    };

    tryStart();

    return () => {
      stopLoop();
    };
  }, [engine, ready, drawBoxes, human, videoRef, safePlay, autoFallback]);

  // Take a PNG screenshot (video frame + boxes)
  const takeScreenshot = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const w = vid.videoWidth || 640;
    const h = vid.videoHeight || 480;

    const temp = document.createElement("canvas");
    temp.width = w;
    temp.height = h;
    const tctx = temp.getContext("2d")!;
    tctx.drawImage(vid, 0, 0, w, h);

    tctx.lineWidth = 2;
    tctx.strokeStyle = "#00e676";
    (boxesRef.current || []).forEach((b) =>
      tctx.strokeRect(b.x, b.y, b.width, b.height)
    );

    const url = temp.toDataURL("image/png");
    const link = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    link.download = `facelab-${engine}-${ts}.png`;
    link.href = url;
    link.click();
  }, [videoRef, engine]);

  return (
    <div className="p-4 max-w-[1200px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Video Section - Takes 8 columns on large screens */}
        <div className="lg:col-span-8 space-y-4">
          {/* Error banner */}
          {errorMsg && (
            <div className="text-sm p-3 rounded-lg bg-red-100 text-red-800 border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Video Container */}
          <div className="relative rounded-xl overflow-hidden bg-gray-900 shadow-lg">
            <video
              ref={videoRef}
              muted
              playsInline
              className="w-full aspect-[4/3] object-cover"
            />
            <canvas ref={canvasRef} className="absolute left-0 top-0" />
            
            {/* Video Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-center gap-3 text-white">
                <span className="text-sm font-medium">
                  {fps} FPS
                </span>
                {typeof flipCamera === "function" && (
                  <button
                    className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    onClick={flipCamera}
                    title="Flip camera (phones)"
                  >
                    Flip Camera
                  </button>
                )}
                <button
                  className="px-3 py-1.5 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors ml-auto"
                  onClick={takeScreenshot}
                >
                  Take Screenshot
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Panel - Takes 4 columns on large screens */}
        <div className="lg:col-span-4 space-y-6">
          {/* Engine Selection */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Detection Engine</h3>
            <div className="space-y-2">
              {ENGINE_ORDER.map((e) => (
                <button
                  key={e}
                  className={`w-full px-4 py-2.5 rounded-lg text-left font-medium transition-colors ${
                    engine === e 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => setEngine(e)}
                >
                  {e === "mediapipe" && "MediaPipe (Fast)"}
                  {e === "human" && "Human (Accurate)"}
                  {e === "faceapi" && "face-api.js (Recognition)"}
                </button>
              ))}
              
              {/* Options */}
              <label className="flex items-center gap-2 mt-4 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={autoFallback}
                  onChange={(e) => setAutoFallback(e.target.checked)}
                  className="rounded"
                />
                <span>Enable Auto-fallback</span>
              </label>
            </div>
          </div>

          {/* Engine Features Panel */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Engine Features</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="flex items-center gap-2">
                <span className={engine === "mediapipe" ? "text-blue-600 font-medium" : ""}>
                  MediaPipe: Fast detection, low resource usage
                </span>
              </p>
              <p className="flex items-center gap-2">
                <span className={engine === "human" ? "text-blue-600 font-medium" : ""}>
                  Human: High accuracy, advanced facial landmarks
                </span>
              </p>
              <p className="flex items-center gap-2">
                <span className={engine === "faceapi" ? "text-blue-600 font-medium" : ""}>
                  face-api.js: Face recognition & emotion detection
                </span>
              </p>
            </div>
          </div>

          {loading && (
            <div className="text-center py-3 text-sm text-gray-500">
              Loading engine...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
