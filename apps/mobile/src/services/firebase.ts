import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyBYldSd19R4l8dVPj5akUNdjiBjckmO_lk",
  authDomain: "vollen---gestao-os.firebaseapp.com",
  projectId: "vollen---gestao-os",
  storageBucket: "vollen---gestao-os.firebasestorage.app",
  messagingSenderId: "436401191883",
  appId: "1:436401191883:web:cfa2281a25dca4f81f944e",
  measurementId: "G-YRPSCPSBVC"
};

// Inicializa o App do Firebase no Mobile
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inicializa o Firestore no React Native de forma segura contra fast-refresh
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
} catch {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

