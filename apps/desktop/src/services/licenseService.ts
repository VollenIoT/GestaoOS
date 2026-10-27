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

export type PlanType = 'TRIAL' | 'MENSAL' | 'SEMESTRAL' | 'ANUAL' | 'VITALICIO';

export interface LicenseTenantData {
  serial: string;
  companyName?: string;
  tradeName?: string;
  legalName?: string;
  active: boolean;
  createdAt?: string;
  planType?: PlanType;
  expiresAt?: string | null; // Data ISO (ex: 2026-10-01T00:00:00.000Z) ou null para Vitalício
  maxUsers?: number;
  status?: 'ACTIVE' | 'EXPIRED' | 'BLOCKED' | 'SUSPENDED';
  hasCloud?: boolean; // true se a licença inclui banco de dados em nuvem
  appMajorVersion?: number; // versão major que esta serial suporta (ex: 3 para v3.x.x). null/undefined = qualquer versão
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

function getAppMajorVersion(): number {
  try {
    const ver = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
    return parseInt(ver.split('.')[0], 10) || 1;
  } catch {
    return 1;
  }
}

/**
 * Retorna o prefixo de versão para armazenamento isolado por versão (ex: 'v1_', 'v2_', 'v3_')
 */
export function getVersionStoragePrefix(): string {
  const major = getAppMajorVersion();
  return `v${major}_`;
}

// Chaves de armazenamento específicas por versão para que v1, v2 e v3 não compartilhem a mesma serial no mesmo computador
const SERIAL_STORAGE_KEY = `${getVersionStoragePrefix()}system_serial_license_key`;
const TENANT_CONFIG_STORAGE_KEY = `${getVersionStoragePrefix()}system_tenant_firebase_config`;
const TENANT_INFO_STORAGE_KEY = `${getVersionStoragePrefix()}system_tenant_info`;

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

// Retorna a chave serial salva no sistema para a versão atual
export function getSavedSerial(): string | null {
  try {
    // 1. Busca pela chave isolada da versão atual (ex: v2_system_serial_license_key)
    const versionSerial = localStorage.getItem(SERIAL_STORAGE_KEY);
    if (versionSerial) return versionSerial;

    // 2. Se não existir, verifica chave legada global apenas se a versão da licença coincidir
    const legacyTenantRaw = localStorage.getItem('system_tenant_info');
    if (legacyTenantRaw) {
      try {
        const parsed = JSON.parse(legacyTenantRaw);
        const licMajor = extractMajorVersion(parsed);
        if (licMajor === getAppMajorVersion()) {
          return localStorage.getItem('system_serial_license_key') || null;
        }
      } catch {}
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extrai o número de versão major a partir dos campos do tenant (appMajorVersion ou appVersion como 'v1.0.0'/'1.0.0')
 */
export function extractMajorVersion(data: any): number | null {
  if (!data) return null;
  if (data.appMajorVersion !== undefined && data.appMajorVersion !== null && !isNaN(Number(data.appMajorVersion))) {
    return Number(data.appMajorVersion);
  }
  if (data.appVersion && typeof data.appVersion === 'string') {
    const clean = data.appVersion.replace(/^v/i, '').trim();
    const major = parseInt(clean.split('.')[0], 10);
    if (!isNaN(major)) return major;
  }
  return null;
}

// Retorna os dados da licença ativa para a versão atual
export function getSavedTenantInfo(): LicenseTenantData | null {
  try {
    const currentMajor = getAppMajorVersion();

    // 1. Verifica no armazenamento com escopo da versão atual
    const raw = localStorage.getItem(TENANT_INFO_STORAGE_KEY);
    if (raw) {
      const parsed: LicenseTenantData = JSON.parse(raw);
      const licMajor = extractMajorVersion(parsed);
      if (licMajor !== null && licMajor !== currentMajor) {
        // Licença gravada pertence a outra versão
        return null;
      }
      return parsed;
    }

    // 2. Fallback de migração para chave legada global, se compatível com esta versão
    const legacyRaw = localStorage.getItem('system_tenant_info');
    if (legacyRaw) {
      const parsed: LicenseTenantData = JSON.parse(legacyRaw);
      const licMajor = extractMajorVersion(parsed);
      if (licMajor === currentMajor) {
        // Migra para a chave versionada
        localStorage.setItem(TENANT_INFO_STORAGE_KEY, legacyRaw);
        const legacySerial = localStorage.getItem('system_serial_license_key');
        if (legacySerial) localStorage.setItem(SERIAL_STORAGE_KEY, legacySerial);
        const legacyConfig = localStorage.getItem('system_tenant_firebase_config');
        if (legacyConfig) localStorage.setItem(TENANT_CONFIG_STORAGE_KEY, legacyConfig);
        return parsed;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Retorna as configurações do Firebase salvas para o tenant na versão atual
export function getSavedTenantFirebaseConfig(): any | null {
  try {
    const raw = localStorage.getItem(TENANT_CONFIG_STORAGE_KEY);
    if (raw) return JSON.parse(raw);

    // Fallback legado se compatível
    const tenantInfo = getSavedTenantInfo();
    if (tenantInfo && extractMajorVersion(tenantInfo) === getAppMajorVersion()) {
      const legacy = localStorage.getItem('system_tenant_firebase_config');
      return legacy ? JSON.parse(legacy) : null;
    }
    return null;
  } catch {
    return null;
  }
}

// Verifica se o sistema está operando em Modo Nuvem (com Serial e com Modo Nuvem ativo na estratégia de rede)
export function isCloudModeActive(): boolean {
  try {
    const hasSerialAndConfig = !!getSavedSerial() && !!getSavedTenantFirebaseConfig();
    if (!hasSerialAndConfig) return false;

    const netConfigRaw = localStorage.getItem('vollen_local_network_config');
    if (netConfigRaw) {
      const parsed = JSON.parse(netConfigRaw);
      if (parsed && parsed.syncStrategy === 'local') {
        return false;
      }
    }
    return true;
  } catch {
    return !!getSavedSerial() && !!getSavedTenantFirebaseConfig();
  }
}

export interface LicenseValidityResult {
  isValid: boolean;
  isExpired: boolean;
  isBlocked: boolean;
  isVitalicio: boolean;
  isTrial: boolean;
  isVersionMismatch?: boolean;
  daysRemaining: number | null; // null se vitalício
  expiresAt: string | null;
  planType: PlanType;
  message: string;
}

/**
 * Avalia o status e a validade temporal de uma licença
 */
export function checkLicenseValidity(license: LicenseTenantData | null): LicenseValidityResult {
  const currentMajor = getAppMajorVersion();

  if (!license) {
    return {
      isValid: true, // Modo Local sem serial é válido localmente
      isExpired: false,
      isBlocked: false,
      isVitalicio: false,
      isTrial: false,
      daysRemaining: null,
      expiresAt: null,
      planType: 'VITALICIO',
      message: 'Modo Local Autônomo',
    };
  }

  // Validação estrita de compatibilidade de versão MAJOR
  const licenseMajor = extractMajorVersion(license);
  if (licenseMajor !== null && licenseMajor !== currentMajor) {
    return {
      isValid: false,
      isExpired: false,
      isBlocked: true,
      isVitalicio: false,
      isTrial: false,
      isVersionMismatch: true,
      daysRemaining: 0,
      expiresAt: license.expiresAt || null,
      planType: license.planType || 'MENSAL',
      message: `Esta chave serial é exclusiva da versão ${licenseMajor}.x.x do sistema. Você está utilizando a versão ${currentMajor}.x.x. Adquira uma licença compatível.`,
    };
  }

  if (license.active === false || license.status === 'BLOCKED' || license.status === 'SUSPENDED') {
    return {
      isValid: false,
      isExpired: false,
      isBlocked: true,
      isVitalicio: false,
      isTrial: license.planType === 'TRIAL',
      daysRemaining: 0,
      expiresAt: license.expiresAt || null,
      planType: license.planType || 'MENSAL',
      message: 'Esta licença foi suspensa ou desativada pela administração.',
    };
  }

  const plan = license.planType || (license.expiresAt ? 'MENSAL' : 'VITALICIO');
  const isVitalicio = plan === 'VITALICIO' || !license.expiresAt;
  const isTrial = plan === 'TRIAL';

  if (isVitalicio) {
    return {
      isValid: true,
      isExpired: false,
      isBlocked: false,
      isVitalicio: true,
      isTrial: false,
      daysRemaining: null,
      expiresAt: null,
      planType: 'VITALICIO',
      message: 'Licença Vitalícia Ativa',
    };
  }

  const expDate = new Date(license.expiresAt!);
  const now = new Date();
  const diffTime = expDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      isValid: false,
      isExpired: true,
      isBlocked: false,
      isVitalicio: false,
      isTrial,
      daysRemaining: 0,
      expiresAt: license.expiresAt || null,
      planType: plan,
      message: isTrial
        ? 'O período de testes (Trial) expirou. Adquira uma licença para continuar.'
        : `A sua assinatura expirou em ${expDate.toLocaleDateString('pt-BR')}. Renove para continuar utilizando.`,
    };
  }

  return {
    isValid: true,
    isExpired: false,
    isBlocked: false,
    isVitalicio: false,
    isTrial,
    daysRemaining,
    expiresAt: license.expiresAt || null,
    planType: plan,
    message: daysRemaining <= 5
      ? `Atenção: Sua licença vence em ${daysRemaining} dia(s)!`
      : `Licença ativa. Restam ${daysRemaining} dias.`,
  };
}

/**
 * Ativa o modo Trial local de 10 dias para novos usuários
 */
export function activateLocalTrial(companyName: string = 'Assistência Técnica'): LicenseTenantData {
  const trialDays = 10;
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + trialDays);

  const trialSerial = `TRIAL-${generateRandomSerial().slice(0, 11)}`;
  const currentMajor = getAppMajorVersion();
  const trialData: LicenseTenantData = {
    serial: trialSerial,
    companyName,
    tradeName: companyName,
    legalName: companyName,
    active: true,
    createdAt: new Date().toISOString(),
    planType: 'TRIAL',
    expiresAt: expDate.toISOString(),
    status: 'ACTIVE',
    appMajorVersion: currentMajor,
  };

  try {
    localStorage.setItem(SERIAL_STORAGE_KEY, trialSerial);
    localStorage.setItem(TENANT_INFO_STORAGE_KEY, JSON.stringify(trialData));
    localStorage.setItem(`${getVersionStoragePrefix()}system_onboarding_completed`, 'true');
  } catch (err) {
    console.error('Erro ao salvar Trial:', err);
  }

  return trialData;
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

    if (rawData.active === false || rawData.status === 'BLOCKED' || rawData.status === 'SUSPENDED') {
      return { success: false, message: 'Esta chave serial foi desativada ou suspensa pela administração.' };
    }

    // Valida compatibilidade de versão MAJOR estrita (checa appMajorVersion e appVersion)
    const requiredMajor = extractMajorVersion(rawData);
    const currentMajor = getAppMajorVersion();

    if (requiredMajor !== null && requiredMajor !== currentMajor) {
      return {
        success: false,
        message: `Esta chave serial é válida exclusivamente para a versão ${requiredMajor}.x.x do sistema. Você está utilizando o aplicativo na versão ${currentMajor}.x.x. Adquira ou utilize uma licença correspondente a esta versão.`
      };
    }

    // Valida expiração se houver
    if (rawData.expiresAt) {
      const expDate = new Date(rawData.expiresAt);
      if (expDate.getTime() < Date.now()) {
        return {
          success: false,
          message: `Esta chave serial expirou em ${expDate.toLocaleDateString('pt-BR')}. Renove sua assinatura.`
        };
      }
    }

    const resolvedMajor = requiredMajor ?? currentMajor;

    const data: LicenseTenantData = {
      ...rawData,
      serial: cleanSerial,
      tradeName: rawData.tradeName || rawData.companyName || 'Vollen Assistência Técnica',
      legalName: rawData.legalName || 'Vollen Assistência Técnica',
      companyName: rawData.tradeName || rawData.companyName || 'Vollen Assistência Técnica',
      planType: rawData.planType || (rawData.expiresAt ? 'MENSAL' : 'VITALICIO'),
      expiresAt: rawData.expiresAt || null,
      status: rawData.status || 'ACTIVE',
      appMajorVersion: resolvedMajor,
    };

    // Se não há firebaseConfig, a serial é para uso local (modo offline/autônomo)
    // Isso é válido para planos locais que não utilizam sincronização em nuvem.
    const hasCloud = !!(data.firebaseConfig && data.firebaseConfig.projectId && data.firebaseConfig.apiKey);

    return {
      success: true,
      data: {
        serial: cleanSerial,
        companyName: data.tradeName || data.companyName || 'Empresa Licenciada',
        tradeName: data.tradeName,
        legalName: data.legalName,
        active: true,
        createdAt: data.createdAt,
        planType: data.planType,
        expiresAt: data.expiresAt,
        status: data.status,
        hasCloud,
        appMajorVersion: resolvedMajor,
        firebaseConfig: hasCloud ? data.firebaseConfig : undefined,
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

export function activateLicense(licenseData: LicenseTenantData): void {
  try {
    localStorage.setItem(SERIAL_STORAGE_KEY, licenseData.serial);
    localStorage.setItem(TENANT_INFO_STORAGE_KEY, JSON.stringify(licenseData));
    localStorage.setItem('system_serial_license_key', licenseData.serial);
    localStorage.setItem('system_tenant_info', JSON.stringify(licenseData));

    if (licenseData.firebaseConfig) {
      localStorage.setItem(TENANT_CONFIG_STORAGE_KEY, JSON.stringify(licenseData.firebaseConfig));
      localStorage.setItem('system_tenant_firebase_config', JSON.stringify(licenseData.firebaseConfig));
    }

    // Aplica imediatamente os dados da empresa (Razão Social e Nome Fantasia) em vollen_company_data
    try {
      const rawComp = localStorage.getItem('vollen_company_data');
      let compObj = rawComp ? JSON.parse(rawComp) : {};
      const trade = licenseData.tradeName || licenseData.companyName || 'Vollen Assistência Técnica';
      const legal = licenseData.legalName || licenseData.companyName || trade;
      compObj.tradingName = trade;
      compObj.name = legal;
      localStorage.setItem('vollen_company_data', JSON.stringify(compObj));
    } catch (e) {}
  } catch (err) {
    console.error('Erro ao salvar licença no localStorage:', err);
  }
}

/**
 * Desvincula a licença e retorna ao Modo Local Autônomo.
 * ✅ SEGURO: Remove APENAS as credenciais de licença e a sessão do usuário.
 * ✅ Os dados operacionais (clientes, OS, peças, etc.) são PRESERVADOS INTACTOS.
 * Ao inserir uma nova serial, todos os dados continuarão presentes.
 */
export function deactivateLicense(): void {
  try {
    // 1. Remove SOMENTE as chaves de licença/nuvem (específicas da versão e legadas)
    localStorage.removeItem(SERIAL_STORAGE_KEY);
    localStorage.removeItem(TENANT_INFO_STORAGE_KEY);
    localStorage.removeItem(TENANT_CONFIG_STORAGE_KEY);
    localStorage.removeItem('system_serial_license_key');
    localStorage.removeItem('system_tenant_info');
    localStorage.removeItem('system_tenant_firebase_config');
    localStorage.removeItem('vollen_company_apikey');
    localStorage.removeItem('vollen_sys_trial_state_v1');

    // 2. Encerra a sessão do usuário logado (volta ao login)
    sessionStorage.removeItem('vollen_current_user');
    localStorage.removeItem('vollen_current_user');

    // ✅ DADOS OPERACIONAIS PRESERVADOS:
    // vollen_clients, vollen_orders, vollen_parts_stock, vollen_services,
    // vollen_equipments, vollen_estimates, vollen_technicians,
    // vollen_company_data, configurações de OS, etc.
    // Esses dados permanecem intactos para quando uma nova serial for inserida.

  } catch (err) {
    console.error('Erro ao remover licença do localStorage:', err);
  }
}

/**
 * Desvincula a licença E APAGA TODOS OS DADOS OPERACIONAIS.
 * ⚠️ USE APENAS quando o usuário está trocando de empresa intencionalmente
 * (ex: transferindo a licença para outra empresa, migração total de dados).
 * Este método deve ser chamado com confirmação explícita do usuário.
 */
export function deactivateLicenseWithDataWipe(): void {
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
    console.error('Erro ao remover licença e dados do localStorage:', err);
  }
}
