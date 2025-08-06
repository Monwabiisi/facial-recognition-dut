import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyABaGiknaVHKOcAJvsp4kTyiPeYbq72f18",
  authDomain: "facial-recognition-dut.firebaseapp.com",
  projectId: "facial-recognition-dut",
  storageBucket: "facial-recognition-dut.appspot.com",
  messagingSenderId: "901097273414",
  appId: "1:901097273414:web:fc93101a7dc108ffbdf247"
};

const app = initializeApp(firebaseConfig);
export default app; 