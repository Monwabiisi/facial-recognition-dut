// src/engines/recognition.ts
import * as faceapi from "face-api.js";

export type LabeledDescriptor = {
  label: string;
  descriptors: number[][];
};

const STORAGE_KEY = "facelab_enrolled_v1";

function loadStore(): LabeledDescriptor[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LabeledDescriptor[]) : [];
  } catch {
    return [];
  }
}
function saveStore(data: LabeledDescriptor[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function loadFaceApiModels() {
  const url = "https://justadudewhohacks.github.io/face-api.js/models";
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(url),
    faceapi.nets.faceLandmark68Net.loadFromUri(url),
    faceapi.nets.faceRecognitionNet.loadFromUri(url),
  ]);
}

export async function detectDescriptorFromVideo(
  video: HTMLVideoElement
): Promise<Float32Array | null> {
  const det = await faceapi
    .detectSingleFace(
      video,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.5 })
    )
    .withFaceLandmarks()
    .withFaceDescriptor();
  return det?.descriptor ?? null;
}

export async function enroll(label: string, video: HTMLVideoElement) {
  const desc = await detectDescriptorFromVideo(video);
  if (!desc) throw new Error("No face found for enrollment");

  const store = loadStore();
  const existing = store.find((s) => s.label.toLowerCase() === label.toLowerCase());
  if (existing) {
    existing.descriptors.push(Array.from(desc));
  } else {
    store.push({ label, descriptors: [Array.from(desc)] });
  }
  saveStore(store);
}

function euclidean(a: Float32Array, b: Float32Array) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export async function recognize(
  video: HTMLVideoElement,
  threshold = 0.6,
  maxAttempts = 3
) {
  const store = loadStore();
  if (!store.length) return { label: "unknown", distance: 1, confidence: 0 };

  // Try multiple times to get a good descriptor
  let bestDescriptor: Float32Array | null = null;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const descriptor = await detectDescriptorFromVideo(video);
    if (descriptor) {
      bestDescriptor = descriptor;
      break;
    }
    attempts++;
    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (!bestDescriptor) return { label: "no-face", distance: 1, confidence: 0 };

  let bestLabel = "unknown";
  let bestDist = 1;
  let confidence = 0;

  // Enhanced matching algorithm
  for (const entry of store) {
    // Calculate distances to all descriptors for this label
    const distances = entry.descriptors.map(d => 
      euclidean(bestDescriptor!, new Float32Array(d))
    );

    // Sort distances and take average of best matches
    distances.sort((a, b) => a - b);
    const topN = Math.max(1, Math.min(3, Math.floor(distances.length / 2)));
    const avgDist = distances.slice(0, topN).reduce((a, b) => a + b, 0) / topN;

    if (avgDist < bestDist) {
      bestDist = avgDist;
      bestLabel = entry.label;
      // Calculate confidence score (0-1)
      confidence = Math.max(0, Math.min(1, 1 - (bestDist / threshold)));
    }
  }

  if (bestDist > threshold) {
    return { 
      label: "unknown", 
      distance: bestDist,
      confidence: 0
    };
  }

  return { 
    label: bestLabel, 
    distance: bestDist,
    confidence: confidence
  };
}

export function clearAllEnrollments() {
  saveStore([]);
}

export function listEnrollments() {
  return loadStore().map((e) => ({ label: e.label, samples: e.descriptors.length }));
}
