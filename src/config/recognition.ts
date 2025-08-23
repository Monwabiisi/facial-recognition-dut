export const DETECTION = {
  tinyFaceScore: Number(import.meta.env.VITE_TINY_FACE_SCORE ?? 0.65),
  mediapipeMinConf: Number(import.meta.env.VITE_MEDIAPIPE_MIN_CONF ?? 0.70),
  similarityGate: Number(import.meta.env.VITE_SIMILARITY_GATE ?? 0.55),
}
