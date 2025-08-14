import * as tf from '@tensorflow/tfjs';

// Load model singleton
let model: FaceNetModel | null = null;

export async function loadFaceNetModel() {
  if (!model) {
    model = new FaceNetModel();
    await model.load();
  }
  return model;
}

export async function generateEmbedding(imageData: string): Promise<Float32Array | null> {
  try {
    // Load model if not loaded
    const faceNet = await loadFaceNetModel();
    
    // Convert image data to tensor
    const img = await loadImage(imageData);
    const tensor = await imageToTensor(img);
    
    // Generate embedding
    const embedding = await faceNet.computeEmbedding(tensor);
    
    // Cleanup
    tf.dispose(tensor);
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function imageToTensor(img: HTMLImageElement): Promise<tf.Tensor3D> {
  // Convert image to tensor and resize to model input size (160x160)
  return tf.tidy(() => {
    const tensor = tf.browser.fromPixels(img)
      .resizeBilinear([160, 160])
      .toFloat();
    return tensor;
  });
}

export function calculateSimilarity(embedding1: Float32Array, embedding2: Float32Array): number {
  // Calculate cosine similarity between embeddings
  const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
  const norm1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
  const norm2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (norm1 * norm2);
}

// Re-export FaceNetModel class
export { FaceNetModel } from './facenet';
