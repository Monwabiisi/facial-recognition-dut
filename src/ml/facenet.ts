// src/ml/facenet.ts
import * as tf from '@tensorflow/tfjs';

const MODEL_URL = '/models/face_recognition_model-weights_manifest.json';

export class FaceNetModel {
  private model: tf.GraphModel | null = null;

  async load() {
    if (this.model) return;
    try {
      this.model = await tf.loadGraphModel(MODEL_URL);
    } catch (err) {
      console.error('Failed to load face recognition model:', err);
      throw err;
    }
  }

  async computeEmbedding(input: tf.Tensor3D): Promise<Float32Array> {
    if (!this.model) throw new Error('Model not loaded');
    
    // Preprocess: normalize to [-1, 1]
    const normalized = tf.tidy(() => {
      // Input should be [160, 160, 3]
      const resized = tf.image.resizeBilinear(input, [160, 160]);
      // Normalize to [-1, 1]
      const normalized = tf.div(tf.sub(resized, 127.5), 127.5);
      // Add batch dimension: [1, 160, 160, 3]
      return normalized.expandDims(0);
    });

    let embedding;
    try {
      // Model should output [1, 512] embedding
      embedding = this.model.predict(normalized) as tf.Tensor;
      if (embedding.shape[1] !== 512) {
        throw new Error(`Invalid embedding shape: expected [1, 512], got [${embedding.shape}]`);
      }
    } catch (err) {
      tf.dispose([normalized, embedding]);
      throw err;
    }
    
    // Get the data and cleanup
    const data = await embedding.data();
    tf.dispose([normalized, embedding]);
    
    return data as Float32Array;
  }

  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}
