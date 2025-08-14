// 1️⃣ Import Firebase core and authentication services
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// 2️⃣ Firebase configuration object from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 3️⃣ Initialize Firebase app with the configuration
const app = initializeApp(firebaseConfig);

// 4️⃣ Initialize Firebase Authentication and export for use in components
export const auth = getAuth(app);

// 5️⃣ Export the app instance as default
export default app; 