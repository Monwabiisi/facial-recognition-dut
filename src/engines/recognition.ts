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

export async function recognize(video: HTMLVideoElement, threshold = 0.6) {
  const store = loadStore();
  if (!store.length) return { label: "unknown", distance: 1 };

  const query = await detectDescriptorFromVideo(video);
  if (!query) return { label: "no-face", distance: 1 };

  let bestLabel = "unknown";
  let bestDist = 1;

  const q = query as Float32Array;
  for (const entry of store) {
    // average distance against all enrolled samples for this label
    let total = 0;
    for (const d of entry.descriptors) {
      total += euclidean(q, new Float32Array(d));
    }
    const avg = total / entry.descriptors.length;
    if (avg < bestDist) {
      bestDist = avg;
      bestLabel = entry.label;
    }
  }

  if (bestDist > threshold) return { label: "unknown", distance: bestDist };
  return { label: bestLabel, distance: bestDist };
}

export function clearAllEnrollments() {
  saveStore([]);
}

export function listEnrollments() {
  return loadStore().map((e) => ({ label: e.label, samples: e.descriptors.length }));
}
