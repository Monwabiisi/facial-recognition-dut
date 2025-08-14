// src/ml/facenet.ts
import * as tf from '@tensorflow/tfjs';

const MODEL_URL = '/models/facenet/model.json';

export class FaceNetModel {
  private model: tf.GraphModel | null = null;

  async load() {
    if (this.model) return;
    this.model = await tf.loadGraphModel(MODEL_URL);
  }

  async computeEmbedding(input: tf.Tensor3D): Promise<Float32Array> {
    if (!this.model) throw new Error('Model not loaded');
    
    // Preprocess: normalize to [-1, 1]
    const normalized = tf.div(tf.sub(input, 127.5), 127.5);
    
    // Add batch dimension and get embedding
    const batched = normalized.expandDims(0);
    const embedding = this.model.predict(batched) as tf.Tensor;
    
    // Get the data and cleanup
    const data = await embedding.data();
    tf.dispose([normalized, batched, embedding]);
    
    return data as Float32Array;
  }

  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}
