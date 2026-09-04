import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore, setLogLevel } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Suprime logs internos normais de reconexão do Firebase quando o celular está offline
try {
  setLogLevel('silent');
} catch {}

// ✅ Segurança: credenciais lidas de variáveis de ambiente Expo (.env), nunca hardcoded.
// Prefixo EXPO_PUBLIC_ é obrigatório para que o Expo exponha as variáveis no bundle.
export const MASTER_FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Instância Master (para consulta e resolução de ApiKeys/Seriais)
let masterApp: FirebaseApp | null = null;
let masterDb: Firestore | null = null;

export function getMasterFirestore(): Firestore {
  if (!masterApp) {
    const existing = getApps().find(a => a.name === 'masterCatalogMobile');
    masterApp = existing || initializeApp(MASTER_FIREBASE_CONFIG, 'masterCatalogMobile');
  }
  if (!masterDb && masterApp) {
    try {
      masterDb = initializeFirestore(masterApp, {
        experimentalAutoDetectLongPolling: true,
      });
    } catch {
      masterDb = getFirestore(masterApp);
    }
  }
  return masterDb!;
}

// Inicializa o App do Firebase no Mobile
let defaultApp: FirebaseApp;
const existingDefault = getApps().find(a => a.name === '[DEFAULT]');
if (existingDefault) {
  defaultApp = existingDefault;
} else {
  defaultApp = initializeApp(MASTER_FIREBASE_CONFIG);
}

export const app = defaultApp;

// Retorna a instância Firestore ativa (do Tenant vinculado ou do Master)
let currentTenantFirestore: Firestore | null = null;
let currentTenantProjectId: string | null = null;

export async function getActiveMobileFirestore(): Promise<Firestore> {
  try {
    const raw = await AsyncStorage.getItem('mobile_tenant_firebase_config');
    if (raw) {
      const config = JSON.parse(raw);
      if (config && config.projectId && config.apiKey) {
        if (currentTenantFirestore && currentTenantProjectId === config.projectId) {
          return currentTenantFirestore;
        }

        const appName = `tenant_${config.projectId}`;
        const existing = getApps().find(a => a.name === appName);
        const tenantApp = existing || initializeApp(config, appName);
        
        try {
          currentTenantFirestore = initializeFirestore(tenantApp, {
            experimentalAutoDetectLongPolling: true,
          });
        } catch {
          currentTenantFirestore = getFirestore(tenantApp);
        }
        currentTenantProjectId = config.projectId;
        return currentTenantFirestore;
      }
    }
  } catch (err) {
    console.warn('Erro ao resolver Firestore dinâmico no mobile:', err);
  }
  return defaultDb;
}

// Instância Firestore padrão
let defaultDb: Firestore;
try {
  defaultDb = initializeFirestore(defaultApp, {
    experimentalAutoDetectLongPolling: true,
  });
} catch {
  defaultDb = getFirestore(defaultApp);
}

export const firestoreDb = defaultDb;
export const db = defaultDb;
