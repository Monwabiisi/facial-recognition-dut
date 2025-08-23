import { initEngine, detectOnce, Engine } from '../engines/detection';
import Human from '@vladmandic/human';
import * as faceapi from 'face-api.js';

let human: Human | null = null;
const initializedEngines: Set<Engine> = new Set();

export async function handleWorkerMessage(data: any) {
  const { imageBitmap, engine, humanConfig } = data;

  // The following is a hack to make face-api.js work in a worker
  // It replaces the default canvas and image creation with OffscreenCanvas
  if (engine === 'faceapi' && !faceapi.env.isInitialized) {
    faceapi.env.monkeyPatch({
        createCanvas: (width, height) => new OffscreenCanvas(width, height) as any,
        createImage: async () => imageBitmap as any,
        fetch: self.fetch,
    });
    faceapi.env.isInitialized = true;
  }

  if (engine === 'human' && !human) {
      human = new Human(humanConfig);
  }

  try {
    // Initialize engine if not already initialized
    if (!initializedEngines.has(engine)) {
      await initEngine(engine, human || undefined);
      initializedEngines.add(engine);
    }

    // Perform detection
    if (initializedEngines.has(engine)) {
      const detectionResults = await detectOnce(engine, imageBitmap as any, human || undefined);

      const faces = detectionResults.map((r, i) => ({
          id: i,
          box: { x: r.x, y: r.y, width: r.width, height: r.height },
          score: r.confidence || 0,
          landmarks: r.landmarks,
          embedding: r.embedding
      }));

      return {
          timestamp: Date.now(),
          engine,
          faces
      };
    }
  } catch (error) {
    console.error('Worker detection error:', error);
    return {
        timestamp: Date.now(),
        engine,
        faces: []
    };
  }
}
