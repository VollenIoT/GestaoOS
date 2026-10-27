import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
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
} from './licenseService';

// Determina se há configuração ativa do tenant e se o sistema está em modo Nuvem. Se não houver, opera em MODO LOCAL PURO (sem nuvem).
export function getActiveFirebaseConfig() {
  if (!isCloudModeActive()) {
    return null;
  }
  const tenantConfig = getSavedTenantFirebaseConfig();
  if (tenantConfig && tenantConfig.projectId && tenantConfig.apiKey) {
    return tenantConfig;
  }
  return null;
}

const activeConfig = getActiveFirebaseConfig();

// Inicializa o App do Firebase somente se houver uma configuração de tenant ativa e o modo nuvem estiver ativo
let appInstance: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

if (activeConfig && isCloudModeActive()) {
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
// Se estiver em modo local, db é null (operações em nuvem e listeners são ignorados com segurança)
export const db = (isCloudModeActive() ? firestoreDb : null) as Firestore;



