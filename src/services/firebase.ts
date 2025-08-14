import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator, 
  inMemoryPersistence, 
  indexedDBLocalPersistence, 
  initializeAuth,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  enableMultiTabIndexedDbPersistence,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED 
} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getPerformance } from 'firebase/performance';

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
] as const;

for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase with optimal settings
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Initialize Auth with optimal persistence and indexedDB support
const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, inMemoryPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

// Initialize Firestore with optimal settings
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  experimentalForceLongPolling: false,
  experimentalAutoDetectLongPolling: true,
});

// Enable offline persistence if not in an iframe
if (window.self === window.top) {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support persistence.');
    }
  });
}

// Initialize Analytics if supported
let analytics = null;
isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

// Initialize Performance Monitoring
const performance = getPerformance(app);

// Use emulators in development
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export { 
  app, 
  auth, 
  db, 
  analytics, 
  performance 
};
