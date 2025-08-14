// src/config/verify.ts
export const DEFAULT_MATCH_THRESHOLD = 0.95;

export function getMatchThreshold() {
  const envThreshold = process.env.VITE_MATCH_THRESHOLD;
  if (!envThreshold) return DEFAULT_MATCH_THRESHOLD;
  
  const parsed = parseFloat(envThreshold);
  if (isNaN(parsed)) return DEFAULT_MATCH_THRESHOLD;
  
  return parsed;
}

export const REQUIRED_SAMPLES = 3;
export const MAX_SAMPLES = 5;

export const VERIFICATION_SETTINGS = {
  minFaceSize: 160,  // minimum size of face for detection
  maxAttempts: 3,    // max verification attempts before timeout
  timeoutMs: 30000,  // timeout for verification session
  throttleMs: 1000,  // minimum time between verification attempts
} as const;
