import { recognize } from './recognition';
import * as ml from '../ml/ml';
import { FirestoreEmbeddingsStore } from '../services/embeddingsStore.firestore';

import { vi } from 'vitest';

vi.mock('../ml/ml', () => ({
    generateEmbedding: vi.fn(),
    calculateSimilarity: vi.fn(),
}));

vi.mock('../services/embeddingsStore.firestore');
vi.mock('../services/firebase', () => ({
  db: {},
}));


// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });


describe('recognize', () => {
  const mockVideoEl = document.createElement('canvas') as unknown as HTMLVideoElement;
  const mockDetectionBox = { x: 0, y: 0, width: 100, height: 100 };
  const mockDescriptor = new Float32Array(128).fill(0.1);
  const storedDescriptor = new Float32Array(128).fill(0.1); // perfect match
  const storedEmbedding = new Float32Array(128).fill(0.5);

  beforeEach(() => {
    vi.clearAllMocks();

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([
        { label: 'test-user', descriptors: [Array.from(storedDescriptor)] }
    ]));

    (ml.generateEmbedding as any).mockResolvedValue(new Float32Array(128).fill(0.5));
    (FirestoreEmbeddingsStore.prototype.getEmbeddings as any).mockResolvedValue([Array.from(storedEmbedding)]);
  });

  it('should recognize a user when similarity is high', async () => {
    (ml.calculateSimilarity as any).mockReturnValue(0.9); // high similarity
    const result = await recognize(mockDescriptor, mockVideoEl, mockDetectionBox);
    expect(result.label).toBe('test-user');
  });

  it('should return "unknown" when similarity is low', async () => {
    (ml.calculateSimilarity as any).mockReturnValue(0.2); // low similarity
    const result = await recognize(mockDescriptor, mockVideoEl, mockDetectionBox);
    expect(result.label).toBe('unknown');
  });

  it('should return "unknown" if no face is in the store', async () => {
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]));
    const result = await recognize(mockDescriptor, mockVideoEl, mockDetectionBox);
    expect(result.label).toBe('unknown');
  });

  it('should return original label if FaceNet check fails', async () => {
    (ml.generateEmbedding as any).mockResolvedValue(null); // embedding generation fails
    const result = await recognize(mockDescriptor, mockVideoEl, mockDetectionBox);
    expect(result.label).toBe('test-user');
  });

  it('should use the provided threshold for face-api.js recognition', async () => {
    const highDistanceDescriptor = new Float32Array(128).fill(0.8);
    // Euclidean distance will be > 0.4, but less than the default of 0.6
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([
        { label: 'test-user', descriptors: [Array.from(highDistanceDescriptor)] }
    ]));
    const result = await recognize(mockDescriptor, mockVideoEl, mockDetectionBox, 0.4);
    expect(result.label).toBe('unknown');
  });
});
