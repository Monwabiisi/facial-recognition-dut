export interface RecognitionResult {
  label: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
}

export interface EnrollmentData {
  label: string;
  samples: number;
}
