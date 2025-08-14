// src/ml/preprocess.ts
import * as tf from '@tensorflow/tfjs';
import { Box } from '../engines/detection';

export async function extractFace(
  video: HTMLVideoElement,
  box: Box,
  size = 160
): Promise<tf.Tensor3D> {
  // Capture the current frame
  const frame = tf.browser.fromPixels(video);
  
  // Crop to the face bounding box
  const face = tf.image.cropAndResize(
    frame.expandDims(0),
    [[
      box.y / video.videoHeight,
      box.x / video.videoWidth,
      (box.y + box.height) / video.videoHeight,
      (box.x + box.width) / video.videoWidth
    ]],
    [0],
    [size, size]
  );
  
  // Clean up the frame tensor
  tf.dispose(frame);
  
  // Return the single face image
  return face.squeeze() as tf.Tensor3D;
}
