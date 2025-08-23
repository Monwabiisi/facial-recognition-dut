// Helper: convert normalized points to pixel coordinates
function normToPixels(pts: Array<{x:number; y:number}>, w:number, h:number) {
  return pts.map(p => [p.x * w, p.y * h] as [number, number]);
}
// src/engines/detection.ts
// Unified detection layer for: MediaPipe Face Detection, MediaPipe Face Mesh, Human, face-api.js.
// You can call detectOnce(...) for boxes, or detectMeshOnce(...) for landmarks.

import * as faceapi from 'face-api.js';
import Human from '@vladmandic/human';
import { FaceDetection } from '@mediapipe/face_detection';
import { TINY_FACE_DETECTOR_SCORE_THRESHOLD, MEDIAPIPE_MIN_DETECTION_CONFIDENCE } from '../config/thresholds';
import { FaceMesh } from '@mediapipe/face_mesh';
// No cross-imports for Box type; only use the one defined here.

// Engines we support in the UI
export type Engine = 'faceapi' | 'human' | 'mediapipe';
export type Box = { x: number; y: number; width: number; height: number };
type HumanInstance = InstanceType<typeof Human>;

/** Load models/resources for selected engine. */
export async function initEngine(engine: Engine, human?: HumanInstance, onProgress?: (progress: string) => void) {
  if (engine === 'faceapi') {
    const url = 'https://justadudewhohacks.github.io/face-api.js/models';
    if (onProgress) onProgress('Loading TinyFaceDetector model...');
    await faceapi.nets.tinyFaceDetector.loadFromUri(url);
    if (onProgress) onProgress('Loading FaceLandmark68Net model...');
    await faceapi.nets.faceLandmark68Net.loadFromUri(url);
    if (onProgress) onProgress('Loading FaceRecognitionNet model...');
    await faceapi.nets.faceRecognitionNet.loadFromUri(url);
  }
  if (engine === 'human' && human) {
    if (onProgress) onProgress('Loading Human models...');
    // human.load() fetches configured models; default config is enough for face boxes.
    await human.load();
  }
  if (onProgress) onProgress('Engine initialized.');
  // MediaPipe libs download models on demand via CDN, nothing to preload here.
}

/** One-shot face *box* detection across engines. */
export interface DetectionResult extends Box {
  confidence?: number;
  landmarks?: Array<[number, number]>;
  embedding?: Float32Array;
}

export async function detectOnce(
  engine: Engine,
  input: HTMLVideoElement | HTMLImageElement,
  human?: HumanInstance
): Promise<DetectionResult[]> {
  if (engine === 'mediapipe') {
    // Use MediaPipe Face Detection for fast bounding boxes
    const fd = new FaceDetection({
      locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${f}`
    });
    fd.setOptions({ model: 'short', minDetectionConfidence: MEDIAPIPE_MIN_DETECTION_CONFIDENCE });


    return new Promise<Box[]>((resolve) => {
      fd.onResults((res: any) => {
        const videoEl = input as HTMLVideoElement;
        const vidW = videoEl.videoWidth || (input as HTMLImageElement).width || 0;
        const vidH = videoEl.videoHeight || (input as HTMLImageElement).height || 0;

        const out: Box[] = (res.detections || []).map((d: any) => {
          const bb = d.boundingBox;
          return {
            x: bb.xCenter * vidW - (bb.width * vidW) / 2,
            y: bb.yCenter * vidH - (bb.height * vidH) / 2,
            width: bb.width * vidW,
            height: bb.height * vidH
          };
        });

        // NEW: stash mesh landmarks for drawMesh()
        if (res.multiFaceLandmarks?.length) {
          (window as any).__lastFaceMesh = res.multiFaceLandmarks.map((lm: any[]) =>
            normToPixels(lm, vidW, vidH)
          );
        } else {
          (window as any).__lastFaceMesh = [];
        }

        resolve(out);
      });
      // Send a single frame. For streaming, call in a loop.
      fd.send({ image: input });
    });
  }

  if (engine === 'human' && human) {
    // Human returns faces with .box = [x, y, w, h]
    const res = await human.detect(input as HTMLVideoElement);
    const faces = res.face || [];
    // Stash mesh landmarks for drawMesh()
    (window as any).__lastFaceMesh = faces.map((f: any) => {
      return (f.mesh ?? []) as Array<[number, number]>;
    });
    return faces.map((f: any) => {
      const [x, y, w, h] = f.box as [number, number, number, number];
      return { x, y, width: w, height: h };
    });
  }

  // face-api.js TinyFace detector
  const results = await faceapi
    .detectAllFaces(
      input as HTMLVideoElement,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: TINY_FACE_DETECTOR_SCORE_THRESHOLD })
    )
    .withFaceLandmarks()
    .withFaceDescriptors();

  return results.map((r) => {
    const { x, y, width, height } = r.detection.box;
    return { x, y, width, height, embedding: r.descriptor };
  });
}

// Mesh detection is currently disabled due to missing types. Uncomment and fix if needed.
