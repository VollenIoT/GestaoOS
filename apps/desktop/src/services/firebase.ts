import { initializeApp, getApps, getApp, deleteApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import {
  getSavedTenantFirebaseConfig,
  isCloudModeActive,
  MASTER_CATALOG_FIREBASE_CONFIG,
} from './licenseService';

// Determina se há configuração ativa do tenant (ou usa a base padrão MASTER_CATALOG_FIREBASE_CONFIG)
export function getActiveFirebaseConfig() {
  const tenantConfig = getSavedTenantFirebaseConfig();
  if (tenantConfig && tenantConfig.projectId && tenantConfig.apiKey) {
    return tenantConfig;
  }
  return MASTER_CATALOG_FIREBASE_CONFIG;
}

const activeConfig = getActiveFirebaseConfig();

// Inicializa o App do Firebase somente se houver uma configuração de tenant ativa
let appInstance: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

if (activeConfig) {
  const existingApp = getApps().find((a) => a.name === '[DEFAULT]');
  if (existingApp) {
    appInstance = existingApp;
  } else {
    appInstance = initializeApp(activeConfig);
  }

  try {
    firestoreDb = initializeFirestore(appInstance, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    firestoreDb = getFirestore(appInstance);
  }
}

export const app = appInstance;
// Se estiver em modo local, db é null (operações em nuvem são ignoradas com segurança)
export const db = firestoreDb as Firestore;



