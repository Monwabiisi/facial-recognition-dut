import React, {
  useEffect,
  useMemo,
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
    <div className="p-4 space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <button
            className={`px-3 py-2 rounded ${
              engine === "mediapipe" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setEngine("mediapipe")}
          >
            MediaPipe
          </button>
          <button
            className={`px-3 py-2 rounded ${
              engine === "human" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setEngine("human")}
          >
            Human
          </button>
          <button
            className={`px-3 py-2 rounded ${
              engine === "faceapi" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setEngine("faceapi")}
          >
            face‑api.js
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoFallback}
            onChange={(e) => setAutoFallback(e.target.checked)}
          />
          <span>Auto‑fallback</span>
        </label>

        {/* Flip works on phones / multi‑cam devices; harmless elsewhere */}
        {typeof flipCamera === "function" && (
          <button
            className="px-3 py-2 rounded bg-gray-200"
            onClick={flipCamera}
            title="Flip camera (phones)"
          >
            Flip ({facing})
          </button>
        )}

        <button
          className="px-3 py-2 rounded bg-emerald-600 text-white"
          onClick={takeScreenshot}
        >
          Screenshot
        </button>

        <span className="ml-auto text-xs rounded bg-black/80 text-white px-2 py-1">
          {engine} • {fps} FPS
        </span>

        {loading && <span className="text-sm text-gray-500">Loading…</span>}
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="text-sm p-2 rounded bg-red-100 text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Video + overlay */}
      <div className="relative inline-block">
        <video
          ref={videoRef}
          muted
          playsInline
          className="rounded-md shadow w-[640px] h-[480px] bg-black"
        />
        <canvas ref={canvasRef} className="absolute left-0 top-0" />
      </div>
    </div>
  );
}
