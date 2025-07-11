import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAiKs49vZFci50RES_Dmr7UkmLcNOwYXG0",
  authDomain: "pwa-todo-cc568.firebaseapp.com",
  projectId: "pwa-todo-cc568",
  storageBucket: "pwa-todo-cc568.firebasestorage.app",
  messagingSenderId: "704232604358",
  appId: "1:704232604358:web:a529875c4dac4a3bc70dc7",
  measurementId: "G-Z87SQTTZNV"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
