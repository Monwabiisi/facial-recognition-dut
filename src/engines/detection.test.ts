import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as faceapi from 'face-api.js';
import { FaceDetection } from '@mediapipe/face_detection';
import { initEngine, detectOnce } from './detection';
import { MEDIAPIPE_MIN_DETECTION_CONFIDENCE } from '../config/thresholds';

// --- Mocks ---

// Mock face-api.js with a stable chained mock
const faceApiChainedMock = {
  withFaceLandmarks: vi.fn().mockReturnThis(),
  withFaceDescriptors: vi.fn().mockResolvedValue([]),
};
vi.mock('face-api.js', () => ({
  nets: {
    tinyFaceDetector: { loadFromUri: vi.fn().mockResolvedValue(undefined) },
    faceLandmark68Net: { loadFromUri: vi.fn().mockResolvedValue(undefined) },
    faceRecognitionNet: { loadFromUri: vi.fn().mockResolvedValue(undefined) },
  },
  TinyFaceDetectorOptions: vi.fn(),
  detectAllFaces: vi.fn(() => faceApiChainedMock),
}));

// Mock @mediapipe/face_detection to avoid timeouts
let onResultsCallback: (results: any) => void = () => {};
const mockSetOptions = vi.fn();
const mockSend = vi.fn().mockImplementation(() => {
  // When send() is called, immediately trigger the onResults callback
  // This simulates MediaPipe processing a frame and returning a result.
  onResultsCallback({ detections: [] });
});

vi.mock('@mediapipe/face_detection', () => ({
  FaceDetection: vi.fn(() => ({
    setOptions: mockSetOptions,
    onResults: vi.fn((callback) => {
      // Capture the callback function provided by the application
      onResultsCallback = callback;
    }),
    send: mockSend,
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));


// --- Tests ---

describe('Detection Engines', () => {
  const mockVideo = document.createElement('video');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initEngine', () => {
    it('should load models for faceapi engine', async () => {
      await initEngine('faceapi');
      expect(faceapi.nets.tinyFaceDetector.loadFromUri).toHaveBeenCalled();
      expect(faceapi.nets.faceLandmark68Net.loadFromUri).toHaveBeenCalled();
      expect(faceapi.nets.faceRecognitionNet.loadFromUri).toHaveBeenCalled();
    });
  });

  describe('detectOnce', () => {
    it('should call faceapi.detectAllFaces with the correct options', async () => {
      await detectOnce('faceapi', mockVideo);
      // Check that detectAllFaces was called
      expect(faceapi.detectAllFaces).toHaveBeenCalledWith(mockVideo, expect.any(Object));
      // Check that the chain was called
      expect(faceApiChainedMock.withFaceLandmarks).toHaveBeenCalled();
      expect(faceApiChainedMock.withFaceDescriptors).toHaveBeenCalled();
    });

    it('should configure and run mediapipe detection', async () => {
      await detectOnce('mediapipe', mockVideo);
      // Check that a new FaceDetection instance was created
      expect(FaceDetection).toHaveBeenCalled();
      // Check that it was configured with the correct confidence threshold
      expect(mockSetOptions).toHaveBeenCalledWith({
        model: 'short',
        minDetectionConfidence: MEDIAPIPE_MIN_DETECTION_CONFIDENCE,
      });
      // Check that it was asked to process the video frame
      expect(mockSend).toHaveBeenCalledWith({ image: mockVideo });
    });
  });
});
