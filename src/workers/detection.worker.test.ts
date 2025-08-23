import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleWorkerMessage } from './detection.worker.logic';
import * as detectionEngine from '../engines/detection';

vi.mock('@vladmandic/human', () => ({
    default: class Human {},
}));

vi.mock('face-api.js', () => ({
    env: {
        monkeyPatch: vi.fn(),
        isInitialized: false,
    },
}));

describe('Detection Worker Logic', () => {
    beforeEach(() => {
        vi.spyOn(detectionEngine, 'initEngine').mockResolvedValue(undefined);
        vi.spyOn(detectionEngine, 'detectOnce').mockResolvedValue([
            { x: 0, y: 0, width: 10, height: 10, confidence: 0.9, embedding: new Float32Array(128) }
        ]);
    });

    const mockImageBitmap = {
        width: 100,
        height: 100,
        close: vi.fn(),
    };

    it('should return a message with the correct schema', async () => {
        const data = {
            imageBitmap: mockImageBitmap,
            engine: 'faceapi',
            humanConfig: {},
        };

        const result = await handleWorkerMessage(data) as any;

        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('engine', 'faceapi');
        expect(result).toHaveProperty('faces');
        expect(Array.isArray(result.faces)).toBe(true);
        expect(result.faces[0]).toHaveProperty('id');
        expect(result.faces[0]).toHaveProperty('box');
        expect(result.faces[0]).toHaveProperty('score');
    });
});
