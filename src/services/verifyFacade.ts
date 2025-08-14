// src/services/verifyFacade.ts
import { EmbeddingsStore } from './embeddingsStore';
import { FirestoreEmbeddingsStore } from './embeddingsStore.firestore';
import { getMatchThreshold } from '../config/verify';
import { euclideanDistance } from '../ml/math';

class VerifyFacade {
  private store: EmbeddingsStore;

  constructor() {
    if (import.meta.env.VITE_STORE === 'firestore') {
      this.store = new FirestoreEmbeddingsStore();
    } else {
      throw new Error('No embeddings store configured');
    }
  }

  async verify(userId: string, embedding: Float32Array): Promise<{ match: boolean; distance: number }> {
    const threshold = getMatchThreshold();
    const storedEmbeddings = await this.store.getEmbeddings(userId);
    
    if (!storedEmbeddings || !storedEmbeddings.length) {
      return { match: false, distance: 1 };
    }

    let bestDistance = 1;
    for (const stored of storedEmbeddings) {
      const distance = euclideanDistance(embedding, new Float32Array(stored));
      if (distance < bestDistance) {
        bestDistance = distance;
      }
    }

    return {
      match: bestDistance <= threshold,
      distance: bestDistance
    };
  }

  async enroll(userId: string, embedding: Float32Array): Promise<void> {
    await this.store.addEmbedding(userId, Array.from(embedding));
  }

  async clearEnrollment(userId: string): Promise<void> {
    await this.store.clearEmbeddings(userId);
  }
}

export const verifyFacade = new VerifyFacade();
