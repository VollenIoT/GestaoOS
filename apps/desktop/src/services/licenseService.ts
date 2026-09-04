import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
  doc,
  getDoc,
} from 'firebase/firestore';

export interface LicenseTenantData {
  serial: string;
  companyName?: string;
  tradeName?: string;
  legalName?: string;
  active: boolean;
  createdAt?: string;
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId: string;
    measurementId?: string;
  };
}

/**
 * Gera uma chave serial criptograficamente segura no padrão XXXXX-XXXXX-XXXXX-XXXXX
 * (4 blocos de 5 caracteres alfanuméricos maiúsculos = 20 caracteres úteis)
 * Usa crypto.getRandomValues() — seguro criptograficamente, sem Math.random().
 */
export function generateRandomSerial(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem I, O, 0, 1 para evitar confusão visual
  const getBlock = () => {
    let block = '';
    const randomBytes = new Uint8Array(5);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < 5; i++) {
      block += chars.charAt(randomBytes[i] % chars.length);
    }
    return block;
  };
  return `${getBlock()}-${getBlock()}-${getBlock()}-${getBlock()}`;
}

// Configuração padrão da Base Mestra / Catálogo de Licenças
// ✅ Segurança: credenciais lidas de variáveis de ambiente (.env), nunca hardcoded.
export const MASTER_CATALOG_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string,
};

const SERIAL_STORAGE_KEY = 'system_serial_license_key';
const TENANT_CONFIG_STORAGE_KEY = 'system_tenant_firebase_config';
const TENANT_INFO_STORAGE_KEY = 'system_tenant_info';

// Instância Master (para consulta e validação de seriais)
let masterApp: FirebaseApp | null = null;
let masterDb: Firestore | null = null;

export function getMasterFirestore(): Firestore {
  if (!masterApp) {
    const existing = getApps().find(a => a.name === 'masterCatalog');
    masterApp = existing || initializeApp(MASTER_CATALOG_FIREBASE_CONFIG, 'masterCatalog');
  }
  if (!masterDb && masterApp) {
    try {
      masterDb = initializeFirestore(masterApp, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch {
      masterDb = getFirestore(masterApp);
    }
  }
  return masterDb!;
}

// Retorna a chave serial salva no sistema
export function getSavedSerial(): string | null {
  try {
    return localStorage.getItem(SERIAL_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

// Retorna os dados da licença ativa
export function getSavedTenantInfo(): LicenseTenantData | null {
  try {
    const raw = localStorage.getItem(TENANT_INFO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Retorna as configurações do Firebase salvas para o tenant
export function getSavedTenantFirebaseConfig(): any | null {
  try {
    const raw = localStorage.getItem(TENANT_CONFIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Verifica se o sistema está operando em Modo Nuvem (com Serial) ou Modo Local
export function isCloudModeActive(): boolean {
  return !!getSavedSerial() && !!getSavedTenantFirebaseConfig();
}

/**
 * Valida a chave serial no Catálogo Central do Firebase.
 * O catálogo fica na coleção 'licenses' com o ID do documento sendo a chave serial.
 */
export async function validateAndFetchSerialLicense(serialKey: string): Promise<{ success: boolean; data?: LicenseTenantData; message?: string }> {
  const cleanSerial = serialKey.trim().toUpperCase().replace(/[\s-]/g, '');

  if (!cleanSerial || cleanSerial.length < 4) {
    return { success: false, message: 'Chave serial inválida. Verifique os caracteres digitados.' };
  }

  try {
    const masterFirestore = getMasterFirestore();
    const licenseDocRef = doc(masterFirestore, 'licenses', cleanSerial);
    const snap = await getDoc(licenseDocRef);

    if (!snap.exists()) {
      return { success: false, message: 'Chave serial não encontrada no servidor de licenças.' };
    }

    const rawData = snap.data() as any;

    if (rawData.active === false) {
      return { success: false, message: 'Esta chave serial foi desativada ou suspensa.' };
    }

    const data: LicenseTenantData = {
      ...rawData,
      serial: cleanSerial,
      tradeName: rawData.tradeName || rawData.companyName || 'Vollen Assistência Técnica',
      legalName: rawData.legalName || 'Vollen Assistência Técnica',
      companyName: rawData.tradeName || rawData.companyName || 'Vollen Assistência Técnica',
    };

    if (!data.firebaseConfig || !data.firebaseConfig.projectId || !data.firebaseConfig.apiKey) {
      return { success: false, message: 'A chave serial é válida, mas não possui credenciais de banco configuradas.' };
    }

    return {
      success: true,
      data: {
        serial: cleanSerial,
        companyName: data.tradeName || data.companyName || 'Empresa Licenciada',
        tradeName: data.tradeName,
        legalName: data.legalName,
        active: true,
        createdAt: data.createdAt,
        firebaseConfig: data.firebaseConfig,
      }
    };
  } catch (error: any) {
    console.error('Erro ao consultar catálogo central de serial:', error);
    return {
      success: false,
      message: error?.message || 'Falha ao conectar ao servidor para validar a chave serial. Verifique sua conexão com a internet.'
    };
  }
}

/**
 * Ativa a chave serial no sistema e persiste as credenciais
 */
export function activateLicense(licenseData: LicenseTenantData): void {
  try {
    localStorage.setItem(SERIAL_STORAGE_KEY, licenseData.serial);
    localStorage.setItem(TENANT_INFO_STORAGE_KEY, JSON.stringify(licenseData));
    if (licenseData.firebaseConfig) {
      localStorage.setItem(TENANT_CONFIG_STORAGE_KEY, JSON.stringify(licenseData.firebaseConfig));
    }
  } catch (err) {
    console.error('Erro ao salvar licença no localStorage:', err);
  }
}

/**
 * Desvincula a licença e retorna o sistema ao Modo Local Autônomo,
 * limpando todos os dados em cache do tenant anterior para isolamento total.
 */
export function deactivateLicense(): void {
  try {
    // 1. Chaves de Licença e Nuvem
    localStorage.removeItem(SERIAL_STORAGE_KEY);
    localStorage.removeItem(TENANT_INFO_STORAGE_KEY);
    localStorage.removeItem(TENANT_CONFIG_STORAGE_KEY);
    localStorage.removeItem('vollen_company_apikey');

    // 2. Sessão do Usuário Logado
    sessionStorage.removeItem('vollen_current_user');
    localStorage.removeItem('vollen_current_user');

    // 3. Dados Operacionais da Empresa Anterior
    localStorage.removeItem('vollen_clients');
    localStorage.removeItem('vollen_orders');
    localStorage.removeItem('orders');
    localStorage.removeItem('completed_orders');
    localStorage.removeItem('canceled_orders');
    localStorage.removeItem('service_orders');
    localStorage.removeItem('vollen_parts_stock');
    localStorage.removeItem('vollen_parts');
    localStorage.removeItem('vollen_services');
    localStorage.removeItem('vollen_custom_services');
    localStorage.removeItem('vollen_equipments');
    localStorage.removeItem('vollen_estimates');
    localStorage.removeItem('cash_transactions');
    localStorage.removeItem('cash_registers_history');
    localStorage.removeItem('daily_cash_register_status');
    localStorage.removeItem('audit_logs');
    localStorage.removeItem('vollen_sales_history');
    localStorage.removeItem('vollen_local_sales_cart');
    localStorage.removeItem('vollen_local_sales_client');
    localStorage.removeItem('vollen_saved_carts');
    localStorage.removeItem('vollen_active_saved_cart_id');
    localStorage.removeItem('vollen_cash_movements');
    localStorage.removeItem('vollen_custom_next_os_number');

    // 4. Configurações de Empresa, Termos e Preferências
    localStorage.removeItem('vollen_company_data');
    localStorage.removeItem('vollen_os_config');
    localStorage.removeItem('vollen_os_preferences');
    localStorage.removeItem('vollen_os_general_config');
    localStorage.removeItem('custom_os_statuses_v3');
    localStorage.removeItem('vollen_technicians');

    // 5. Restaura o usuário inicial padrão do Modo Local
    // ✅ Segurança: sem campo 'password' — o hash SHA-256 de '1234' é usado.
    // Hash de '1234': 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
    const defaultLocalUsers = [
      {
        id: '1',
        username: 'admin',
        name: 'Administrador',
        role: 'Admin',
        password: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
        isAdmin: true,
        isTechnician: true,
        isAttendant: true,
        permissions: {
          createOS: true,
          editOS: true,
          cancelOS: true,
          finalizeOS: true,
          reopenOS: true,
          deleteOS: true,
          viewOpenOrders: true,
          viewFinishedOrders: true,
          viewAuditHistory: true,
          printOS: true,
          manageEstimates: true,
          manageSales: true,
          manageCashRegister: true,
          openCloseCashRegister: true,
          manageManualCashMovement: true,
          manageClients: true,
          manageParts: true,
          manageServices: true,
          manageEquipments: true,
          manageTechnicians: true,
          manageOrderStatus: true,
          manageOSGeneralConfig: true,
          manageOrderSequence: true,
          manageWarrantyTerms: true,
          managePrinterConfig: true,
          viewGeneralReports: true,
          viewTechnicianReports: true,
          manageCompanyData: true,
          manageMobileLink: true,
          manageWallpaper: true,
          manageUsers: true,
          accessBackup: true,
          accessFactoryReset: true,
        },
      },
    ];
    localStorage.setItem('vollen_users', JSON.stringify(defaultLocalUsers));
  } catch (err) {
    console.error('Erro ao remover licença do localStorage:', err);
  }
}
