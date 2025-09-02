// src/ml/preprocess.ts
import * as tf from '@tensorflow/tfjs';
import { Box } from '../engines/detection';

export async function extractFace(
  video: HTMLVideoElement,
  box: Box,
  size = 160
): Promise<tf.Tensor3D> {
  return tf.tidy(() => {
    // Capture the current frame and ensure 3 channels
    const frame = tf.browser.fromPixels(video);
    
    // Ensure we have 3 channels (RGB)
    const rgb = frame.slice([0, 0, 0], [-1, -1, 3]) as tf.Tensor3D;
    
    // Create normalized box coordinates
    const boxes = tf.tensor2d([[
      box.y / video.videoHeight,
      box.x / video.videoWidth,
      (box.y + box.height) / video.videoHeight,
      (box.x + box.width) / video.videoWidth
    ]]);

    // Add batch dimension and crop face
    const batched = rgb.expandDims() as tf.Tensor4D;
    const face = tf.image.cropAndResize(
      batched,
      boxes,
      [0],
      [size, size]
    );
    
    // Return the single face image as [160, 160, 3]
    return face.squeeze() as tf.Tensor3D;
  });
}
