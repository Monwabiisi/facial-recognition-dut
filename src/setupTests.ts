import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: () => ({}),
  onAuthStateChanged: vi.fn(),
  initializeAuth: () => ({}),
  indexedDBLocalPersistence: {},
  inMemoryPersistence: {},
  browserPopupRedirectResolver: {},
  connectAuthEmulator: vi.fn(),
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        getFirestore: () => ({}),
        connectFirestoreEmulator: vi.fn(),
    };
});

// Optional: mock Worker globally if most tests don’t need a real one
class MockWorker {
  onmessage = null as any;
  postMessage(_: any) {}
  terminate() {}
}
(globalThis as any).Worker = (globalThis as any).Worker ?? MockWorker;
