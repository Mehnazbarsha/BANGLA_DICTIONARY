import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCQk-ES0ewYh5oYY-IdVB_HV6X3-NA0bBU",
  authDomain: "bangla-dict.firebaseapp.com",
  projectId: "bangla-dict",
  storageBucket: "bangla-dict.firebasestorage.app",
  messagingSenderId: "460256862718",
  appId: "1:460256862718:web:78e119e4318e2744e860af",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);