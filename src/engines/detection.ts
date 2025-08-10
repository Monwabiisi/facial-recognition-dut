// src/engines/detection.ts
// Face detection engine wrapper with MediaPipe, Human, and face-api.js.
// Fixes TS error: "Human refers to a value, but is being used as a type".

import * as faceapi from 'face-api.js';
import Human from '@vladmandic/human';
import { FaceDetection } from '@mediapipe/face_detection';

export type Engine = 'mediapipe' | 'human' | 'faceapi';
export type Box = { x: number; y: number; width: number; height: number };

// Create a proper *type* for an instance of the Human class
type HumanInstance = InstanceType<typeof Human>;

/**
 * Load model assets for the selected engine.
 * - faceapi: loads TinyFace + Landmarks + Recognition from public URL
 * - human: loads configured models via human.load()
 */
export async function initEngine(engine: Engine, human?: HumanInstance) {
  if (engine === 'faceapi') {
    const url = 'https://justadudewhohacks.github.io/face-api.js/models';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(url),
      faceapi.nets.faceLandmark68Net.loadFromUri(url),
      faceapi.nets.faceRecognitionNet.loadFromUri(url),
    ]);
  }

  if (engine === 'human' && human) {
    // Human is a class (value). Call load() on the instance.
    await human.load();
  }
}

/**
 * One-shot detection helper (useful for screenshots/enroll flows)
 * Accepts a HTMLVideoElement or HTMLImageElement as input.
 */
export async function detectOnce(
  engine: Engine,
  input: HTMLVideoElement | HTMLImageElement,
  human?: HumanInstance
): Promise<Box[]> {
  if (engine === 'mediapipe') {
    const fd = new FaceDetection({
      locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${f}`,
    });
    fd.setOptions({ model: 'short', minDetectionConfidence: 0.6 });

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
            height: bb.height * vidH,
          };
        });
        resolve(out);
      });

      // For one-shot, send a single frame/image
      fd.send({ image: input });
    });
  }

  if (engine === 'human' && human) {
    // Human returns face.box as [x, y, width, height]
    const res = await human.detect(input as HTMLVideoElement);
    return (res.face || []).map((f: any) => {
      const [x, y, w, h] = f.box as [number, number, number, number];
      return { x, y, width: w, height: h };
    });
  }

  // face-api.js flow: detect → landmarks → descriptors (descriptors not used here yet)
  const results = await faceapi
    .detectAllFaces(
      input as HTMLVideoElement,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.5 })
    )
    .withFaceLandmarks()
    .withFaceDescriptors();

  // Normalize to our Box type
  return results.map((r) => {
    const { x, y, width, height } = r.detection.box;
    return { x, y, width, height };
  });
}
