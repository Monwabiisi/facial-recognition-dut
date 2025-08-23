// src/config/thresholds.ts

// Detection thresholds
export const TINY_FACE_DETECTOR_SCORE_THRESHOLD = 0.7;
export const MEDIAPIPE_MIN_DETECTION_CONFIDENCE = 0.8;

// Recognition thresholds
export const FACE_RECOGNITION_THRESHOLD = 0.6; // Euclidean distance for face-api.js
export const FACENET_SIMILARITY_THRESHOLD = 0.5; // Cosine similarity for FaceNet
