// Node-only sanity checks (run via ts-node or tsx)
// Ensures models exist and prints basic environment info.
import { existsSync } from 'fs';
import { join } from 'path';

const must = [
  'public/models/tiny_face_detector_model-weights_manifest.json',
  'public/models/face_landmark_68_model-weights_manifest.json',
  'public/models/face_recognition_model-weights_manifest.json',
];

const missing = must.filter((p) => !existsSync(join(process.cwd(), p)));
if (missing.length) {
  console.error('❌ Missing model files:', missing);
  process.exit(1);
}

console.log('✅ Models present.');
console.log('ℹ️  Start the app with: npm run dev');
