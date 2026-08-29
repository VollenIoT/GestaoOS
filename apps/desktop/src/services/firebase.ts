import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyBYldSd19R4l8dVPj5akUNdjiBjckmO_lk",
  authDomain: "vollen---gestao-os.firebaseapp.com",
  projectId: "vollen---gestao-os",
  storageBucket: "vollen---gestao-os.firebasestorage.app",
  messagingSenderId: "436401191883",
  appId: "1:436401191883:web:cfa2281a25dca4f81f944e",
  measurementId: "G-YRPSCPSBVC"
};

// Inicializa o App do Firebase
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inicializa o Firestore com suporte a cache offline e múltiplas abas no Desktop
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
