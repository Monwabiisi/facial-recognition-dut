// src/services/faceService.ts
import authService from './authService';

const API_BASE = (import.meta.env.VITE_API_URL as string || 'http://localhost:5000') + '/api';

export interface FaceEmbedding {
  id: number;
  user_id: number;
  embedding: string;
  image_path?: string;
  confidence: number;
  created_at: string;
  name?: string;
  student_id?: string;
}

export interface RecognitionResult {
  recognized: boolean;
  user_id?: number;
  name?: string;
  student_id?: string;
  email?: string;
  similarity: number;
  confidence: number;
}

export interface EnrollmentData {
  user_id: number;
  embedding: Float32Array;
  imageBlob?: Blob;
  confidence?: number;
}

class FaceService {
  // Convert Float32Array to string for storage
  private serializeEmbedding(embedding: Float32Array): string {
    return JSON.stringify(Array.from(embedding));
  }

  // Convert string back to Float32Array
  private deserializeEmbedding(embeddingString: string): Float32Array {
    return new Float32Array(JSON.parse(embeddingString));
  }

  // Calculate cosine similarity between two embeddings
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Embedding dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  // Enroll a new face
  async enrollFace(data: EnrollmentData): Promise<FaceEmbedding> {
    try {
      const formData = new FormData();
      formData.append('user_id', data.user_id.toString());
      formData.append('embedding', this.serializeEmbedding(data.embedding));
      formData.append('confidence', (data.confidence || 0.0).toString());

      if (data.imageBlob) {
        formData.append('image', data.imageBlob, `enrollment_${data.user_id}_${Date.now()}.jpg`);
      }

      const response = await fetch(`${API_BASE}/faces/enroll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Face enrollment failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Face enrollment error:', error);
      throw error;
    }
  }

  // Get all enrolled faces
  async getEnrolledFaces(): Promise<FaceEmbedding[]> {
    try {
      const response = await fetch(`${API_BASE}/faces`, {
        headers: authService.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch enrolled faces');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching enrolled faces:', error);
      throw error;
    }
  }

  // Recognize a face using local comparison
  async recognizeFace(
    embedding: Float32Array, 
    imageBlob?: Blob, 
    threshold: number = 0.6
  ): Promise<RecognitionResult> {
    try {
      // Get all enrolled faces for comparison
      const enrolledFaces = await this.getEnrolledFaces();

      if (enrolledFaces.length === 0) {
        return {
          recognized: false,
          similarity: 0,
          confidence: 0,
        };
      }

      let bestMatch: {
        face: FaceEmbedding;
        similarity: number;
      } | null = null;

      // Compare with each enrolled face
      for (const face of enrolledFaces) {
        const storedEmbedding = this.deserializeEmbedding(face.embedding);
        const similarity = this.cosineSimilarity(embedding, storedEmbedding);

        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = {
            face,
            similarity,
          };
        }
      }

      if (bestMatch && bestMatch.similarity >= threshold) {
        return {
          recognized: true,
          user_id: bestMatch.face.user_id,
          name: bestMatch.face.name,
          student_id: bestMatch.face.student_id,
          similarity: bestMatch.similarity,
          confidence: bestMatch.similarity,
        };
      } else {
        return {
          recognized: false,
          similarity: bestMatch?.similarity || 0,
          confidence: 0,
        };
      }
    } catch (error) {
      console.error('Face recognition error:', error);
      throw error;
    }
  }

  // Server-side recognition (fallback)
  async recognizeFaceServer(
    embedding: Float32Array, 
    imageBlob?: Blob, 
    threshold: number = 0.6
  ): Promise<RecognitionResult> {
    try {
      let response: Response;

      // If an image blob is provided, use multipart/form-data (keep existing behavior)
      if (imageBlob) {
        const formData = new FormData();
        formData.append('embedding', this.serializeEmbedding(embedding));
        formData.append('threshold', threshold.toString());
        formData.append('image', imageBlob, `recognition_${Date.now()}.jpg`);

        response = await fetch(`${API_BASE}/faces/recognize`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authService.getToken()}`,
          },
          body: formData,
        });
      } else {
        // If no image is sent, use application/json so express.json() will parse req.body.embedding
        const payload = {
          embedding: this.serializeEmbedding(embedding),
          threshold: threshold
        };

        response = await fetch(`${API_BASE}/faces/recognize`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authService.getToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Face recognition failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Server face recognition error:', error);
      throw error;
    }
  }

  // Convert canvas to blob
  async canvasToBlob(canvas: HTMLCanvasElement, quality: number = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        'image/jpeg',
        quality
      );
    });
  }

  // Extract face from canvas (crop to detection box)
  extractFaceFromCanvas(
    canvas: HTMLCanvasElement, 
    detection: { x: number; y: number; width: number; height: number }
  ): HTMLCanvasElement {
    const faceCanvas = document.createElement('canvas');
    const padding = 20; // Add some padding around the face
    
    faceCanvas.width = detection.width + (padding * 2);
    faceCanvas.height = detection.height + (padding * 2);
    
    const ctx = faceCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        canvas,
        detection.x - padding,
        detection.y - padding,
        detection.width + (padding * 2),
        detection.height + (padding * 2),
        0,
        0,
        faceCanvas.width,
        faceCanvas.height
      );
    }
    
    return faceCanvas;
  }

  // Validate embedding quality
  validateEmbedding(embedding: Float32Array): boolean {
    // Check if embedding is valid (not all zeros, reasonable values)
    if (!embedding || embedding.length === 0) {
      return false;
    }

    const sum = embedding.reduce((acc, val) => acc + Math.abs(val), 0);
    const average = sum / embedding.length;
    
    // Embedding should have some variation and reasonable magnitude
    return average > 0.001 && average < 100;
  }

  // Get embedding statistics
  getEmbeddingStats(embedding: Float32Array): {
    min: number;
    max: number;
    mean: number;
    std: number;
  } {
    const values = Array.from(embedding);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    return { min, max, mean, std };
  }
}

export const faceService = new FaceService();
export default faceService;