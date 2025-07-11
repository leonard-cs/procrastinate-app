import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// const firebaseConfig = {
//   apiKey: "AIzaSyAiKs49vZFci50RES_Dmr7UkmLcNOwYXG0",
//   authDomain: "pwa-todo-cc568.firebaseapp.com",
//   projectId: "pwa-todo-cc568",
//   storageBucket: "pwa-todo-cc568.firebasestorage.app",
//   messagingSenderId: "704232604358",
//   appId: "1:704232604358:web:bc34273c5731c605c70dc7",
//   measurementId: "G-ZPBXYHH3HG"
// };

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

console.log(firebaseConfig.apiKey)
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
