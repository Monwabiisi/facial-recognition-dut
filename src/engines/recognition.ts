// src/engines/recognition.ts
import * as faceapi from "face-api.js";
import { generateEmbedding, calculateSimilarity } from "../ml/ml";
import { FirestoreEmbeddingsStore } from "../services/embeddingsStore.firestore";
import { FACE_RECOGNITION_THRESHOLD, FACENET_SIMILARITY_THRESHOLD } from "../config/thresholds";

const embeddingsStore = new FirestoreEmbeddingsStore();

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

export async function enroll(label: string, desc: Float32Array, video: HTMLVideoElement, detectionBox: { x: number; y: number; width: number; height: number; }) {
  const store = loadStore();
  const existing = store.find((s) => s.label.toLowerCase() === label.toLowerCase());
  if (existing) {
    existing.descriptors.push(Array.from(desc));
  } else {
    store.push({ label, descriptors: [Array.from(desc)] });
  }
  saveStore(store);

  // Generate and save FaceNet embedding
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    console.error("Could not get canvas context for embedding");
    return;
  }

  const { x, y, width, height } = detectionBox;
  canvas.width = width;
  canvas.height = height;
  context.drawImage(video, x, y, width, height, 0, 0, width, height);
  const imageDataUrl = canvas.toDataURL('image/jpeg');

  const embedding = await generateEmbedding(imageDataUrl);
  if (embedding) {
    await embeddingsStore.addEmbedding(label, Array.from(embedding));
  }
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
  bestDescriptor: Float32Array,
  video: HTMLVideoElement,
  detectionBox: { x: number; y: number; width: number; height: number; },
  threshold = FACE_RECOGNITION_THRESHOLD
) {
  const store = loadStore();
  if (!store.length) return { label: "unknown", distance: 1, confidence: 0 };

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

  // FaceNet cross-validation
  if (bestLabel !== 'unknown') {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      console.error("Could not get canvas context for embedding");
      return { label: bestLabel, distance: bestDist, confidence }; // return original result
    }

    const { x, y, width, height } = detectionBox;
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, x, y, width, height, 0, 0, width, height);
    const imageDataUrl = canvas.toDataURL('image/jpeg');

    const currentEmbedding = await generateEmbedding(imageDataUrl);
    if (currentEmbedding) {
      const storedEmbeddings = await embeddingsStore.getEmbeddings(bestLabel);
      if (storedEmbeddings && storedEmbeddings.length > 0) {
        const similarities = storedEmbeddings.map(stored =>
          calculateSimilarity(currentEmbedding, new Float32Array(stored))
        );
        const maxSimilarity = Math.max(...similarities);

        if (maxSimilarity < FACENET_SIMILARITY_THRESHOLD) {
          return { label: "unknown", distance: bestDist, confidence: 0 };
        }
      }
    }
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
