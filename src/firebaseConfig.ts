// 1️⃣ Import Firebase core and authentication services
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// 2️⃣ Firebase configuration object with your project credentials
const firebaseConfig = {
  apiKey: "AIzaSyABaGiknaVHKOcAJvsp4kTyiPeYbq72f18",
  authDomain: "facial-recognition-dut.firebaseapp.com",
  projectId: "facial-recognition-dut",
  storageBucket: "facial-recognition-dut.appspot.com",
  messagingSenderId: "901097273414",
  appId: "1:901097273414:web:fc93101a7dc108ffbdf247"
};

// 3️⃣ Initialize Firebase app with the configuration
const app = initializeApp(firebaseConfig);

// 4️⃣ Initialize Firebase Authentication and export for use in components
export const auth = getAuth(app);

// 5️⃣ Export the app instance as default
export default app; 