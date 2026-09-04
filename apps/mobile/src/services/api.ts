import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { getMasterFirestore, getActiveMobileFirestore } from './firebase';

// Utilitário para evitar que promises do Firestore fiquem travadas indefinidamente quando o celular estiver sem conexão
export async function withTimeout<T>(promise: Promise<T>, timeoutMs = 2500): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('TIMEOUT_OFFLINE')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

const DEFAULT_SERVER_URL = 'http://192.168.1.100:3333/api';

export async function getServerUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem('custom_server_url');
    return saved || DEFAULT_SERVER_URL;
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

export async function setServerUrl(url: string): Promise<void> {
  try {
    await AsyncStorage.setItem('custom_server_url', url);
  } catch (err) {
    console.error('Erro ao salvar URL do servidor:', err);
  }
}

export async function getLinkedCompanyMobile(): Promise<any | null> {
  return getLocalData<any | null>('mobile_linked_company', null);
}

export async function linkCompanyMobile(payload: any): Promise<void> {
  // 1. Se não for modo de teste, valida a ApiKey no Catálogo Central (Master) e busca o Firebase da empresa
  if (!payload.isTestMode && payload.apiKey) {
    const cleanApiKey = payload.apiKey.replace(/[\s-]/g, '').toUpperCase();
    const { getMasterFirestore, getActiveMobileFirestore } = await import('./firebase');

    const masterFirestore = getMasterFirestore();
    const apiKeyDocRef = doc(masterFirestore, 'mobile_apikeys', cleanApiKey);
    const snap = await getDoc(apiKeyDocRef);

    if (!snap.exists()) {
      throw new Error(`ApiKey "${payload.apiKey}" não foi encontrada no servidor.\n\nVerifique se o código foi digitado corretamente e se o computador gerou a chave.`);
    }

    const cloudData = snap.data();
    if (!cloudData.firebaseConfig || !cloudData.firebaseConfig.projectId) {
      throw new Error('Esta ApiKey existe mas não possui credenciais de banco válidas associadas.');
    }

    payload.companyName = cloudData.companyName || payload.companyName || 'Empresa Vinculada';
    payload.firebaseConfig = cloudData.firebaseConfig;
    payload.serial = cloudData.serial;
    await setLocalData('mobile_tenant_firebase_config', cloudData.firebaseConfig);

    // Conecta imediatamente ao banco do cliente e baixa os dados da empresa e usuários
    try {
      const tenantFirestore = await getActiveMobileFirestore();
      const [compSnap, usersSnap, techsSnap, ordersSnap, clientsSnap, partsSnap, servicesSnap, equipsSnap, statusesSnap] = await Promise.all([
        getDoc(doc(tenantFirestore, 'system_config', 'company_data')).catch(() => null),
        getDocs(collection(tenantFirestore, 'users')).catch(() => null),
        getDocs(collection(tenantFirestore, 'technicians')).catch(() => null),
        getDocs(collection(tenantFirestore, 'orders')).catch(() => null),
        getDocs(collection(tenantFirestore, 'clients')).catch(() => null),
        getDocs(collection(tenantFirestore, 'parts')).catch(() => null),
        getDocs(collection(tenantFirestore, 'services')).catch(() => null),
        getDocs(collection(tenantFirestore, 'equipments')).catch(() => null),
        getDocs(collection(tenantFirestore, 'os_statuses')).catch(() => null),
      ]);

      if (compSnap && compSnap.exists()) {
        const compData = compSnap.data();
        await setLocalData('mobile_company_data', compData);
        if (compData.tradingName || compData.name) {
          payload.companyName = compData.tradingName || compData.name;
        }
      }

      const combinedUsers: any[] = [];
      const seen = new Set<string>();

      if (usersSnap && !usersSnap.empty) {
        usersSnap.docs.forEach((d) => {
          const data = d.data();
          const role = (data.role || '').toUpperCase();
          const isAdmin = Boolean(data.isAdmin || role === 'ADMIN' || (data.username || '').toLowerCase() === 'admin');
          const isTech = Boolean(data.isTechnician || role === 'TECNICO' || role === 'TÉCNICO');
          if (isAdmin || isTech) {
            const key = (data.username || data.name || d.id).toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              combinedUsers.push({ id: d.id, ...data });
            }
          }
        });
      }

      if (techsSnap && !techsSnap.empty) {
        techsSnap.docs.forEach((d) => {
          const data = d.data();
          const key = (data.username || data.name || d.id).toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            combinedUsers.push({ id: d.id, ...data, role: data.role || 'Técnico' });
          }
        });
      }

      if (combinedUsers.length > 0) {
        await setLocalData('mobile_users', combinedUsers);
      }

      // Baixa todas as Ordens de Serviço
      if (ordersSnap && !ordersSnap.empty) {
        const cloudOrders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        await setLocalData('mobile_orders', cloudOrders);
      }

      // Baixa todos os Clientes
      if (clientsSnap && !clientsSnap.empty) {
        const cloudClients = clientsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        await setLocalData('mobile_clients', cloudClients);
      }

      // Baixa Peças, Serviços, Equipamentos e Status
      if (partsSnap && !partsSnap.empty) {
        const cloudParts = partsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        await setLocalData('mobile_parts', cloudParts);
      }

      if (servicesSnap && !servicesSnap.empty) {
        const cloudServices = servicesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        await setLocalData('mobile_services', cloudServices);
      }

      if (equipsSnap && !equipsSnap.empty) {
        const cloudEquips = equipsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        await setLocalData('mobile_equipments', cloudEquips);
      }

      if (statusesSnap && !statusesSnap.empty) {
        const cloudStatuses = statusesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        await setLocalData('mobile_os_statuses', cloudStatuses);
      }
    } catch (dbErr) {
      console.warn('Aviso ao sincronizar dados iniciais do tenant:', dbErr);
    }
  }

  await setLocalData('mobile_linked_company', payload);
  if (payload.companyName) {
    const existingComp = await getLocalData<any>('mobile_company_data', {});
    await setLocalData('mobile_company_data', {
      ...existingComp,
      name: payload.companyName,
      tradingName: payload.companyName,
      cnpj: payload.cnpj || existingComp.cnpj || '',
      phone: payload.phone || existingComp.phone || '',
      logoUrl: payload.logoUrl || existingComp.logoUrl || '',
    });
  }
}

// Verifica silenciosamente se a ApiKey vinculada ainda é válida no Firestore
export async function verifyAndSyncApiKeyMobile(): Promise<{ valid: boolean; reason?: 'KEY_CHANGED' | 'KEY_NOT_FOUND' }> {
  const linked = await getLinkedCompanyMobile();
  if (!linked) return { valid: false, reason: 'KEY_NOT_FOUND' };
  if (linked.isTestMode) return { valid: true };

  try {
    const { getActiveMobileFirestore } = await import('./firebase');
    const activeDb = await getActiveMobileFirestore();
    const docRef = doc(activeDb, 'system_config', 'company_apikey');
    const snap = await getDoc(docRef).catch(() => null);
    
    // Se o snap veio do servidor e existe, valida se a chave bate
    if (snap && snap.exists()) {
      const serverApiKey = (snap.data()?.apiKey || '').trim();
      const localApiKey = (linked.apiKey || '').trim();
      if (serverApiKey && localApiKey && serverApiKey !== localApiKey) {
        await unlinkCompanyMobile();
        return { valid: false, reason: 'KEY_CHANGED' };
      }
      return { valid: true };
    }

    // Se snap for nulo (sem rede) ou se está em cache/iniciando, NÃO desvincula no modo offline!
    if (!snap) {
      return { valid: true };
    }

    // Se o documento no tenant ainda não existe, verifica no Master apenas se houver resposta válida
    const masterDb = getMasterFirestore();
    const cleanApiKey = (linked.apiKey || '').replace(/[\s-]/g, '').toUpperCase();
    if (!cleanApiKey) return { valid: false, reason: 'KEY_NOT_FOUND' };
    
    const masterSnap = await getDoc(doc(masterDb, 'mobile_apikeys', cleanApiKey)).catch(() => null);
    // Só desvincula se o master respondeu explicitamente que o documento NÃO existe (snap recebido com sucesso e exists === false)
    if (masterSnap && !masterSnap.exists() && !masterSnap.metadata.fromCache) {
      await unlinkCompanyMobile();
      return { valid: false, reason: 'KEY_NOT_FOUND' };
    }

    return { valid: true };
  } catch (err) {
    // Em caso de falha de conexão de rede ou timeout, mantém a sessão se tiver chave
    return { valid: true };
  }
}

export function subscribeSecurityValidationMobile(callbacks: {
  onApiKeyInvalidated: () => void;
  onUserInvalidated: () => void;
}) {
  let unsubKey = () => {};
  let unsubUsers = () => {};
  let unsubTechs = () => {};

  getLinkedCompanyMobile().then(async (linked) => {
    // Se não há empresa vinculada ainda ou se está em modo de teste, não escuta invalidação
    if (!linked || linked.isTestMode || !linked.apiKey) return;

    try {
      const { getActiveMobileFirestore } = await import('./firebase');
      const activeDb = await getActiveMobileFirestore();

      // 1. Escuta em tempo real se a ApiKey do sistema foi alterada no computador
      const apiKeyDocRef = doc(activeDb, 'system_config', 'company_apikey');
      unsubKey = onSnapshot(apiKeyDocRef, (snap) => {
        // Ignora eventos que não vieram do servidor com dados concretos (ex: perda de rede / snapshot vazio offline)
        if (snap.metadata.fromCache && !snap.exists()) return;

        getLinkedCompanyMobile().then((currentLinked) => {
          if (!currentLinked || currentLinked.isTestMode || !currentLinked.apiKey) return;

          // Só invalida se o servidor confirmou que o documento realmente não existe mais
          if (!snap.exists() && !snap.metadata.fromCache) {
            unlinkCompanyMobile().then(() => callbacks.onApiKeyInvalidated());
            return;
          }

          if (snap.exists()) {
            const serverKey = (snap.data()?.apiKey || '').trim();
            const localKey = (currentLinked.apiKey || '').trim();
            if (serverKey && localKey && serverKey !== localKey) {
              unlinkCompanyMobile().then(() => callbacks.onApiKeyInvalidated());
            }
          }
        });
      }, (err) => {
        // Em caso de erro de rede, apenas ignora
        console.warn('Listener de segurança de ApiKey offline:', err);
      });

      // 2. Escuta em tempo real se o usuário logado atualmente foi excluído do sistema
      const usersColRef = collection(activeDb, 'users');
      const techsColRef = collection(activeDb, 'technicians');

      const validateCurrentUser = (usersDocs: any[], techsDocs: any[]) => {
        // Se as listas estiverem vazias por falta de conexão, NÃO desloga o usuário!
        if (usersDocs.length === 0 && techsDocs.length === 0) return;

        getCurrentUserMobile().then((currentUser) => {
          if (!currentUser) return;
          const currentId = String(currentUser.id || '').trim();
          const currentUsername = String(currentUser.username || '').toLowerCase().trim();

          const existsInUsers = usersDocs.some((d) => {
            const data = d.data ? d.data() : d;
            return d.id === currentId || (data.username && String(data.username).toLowerCase().trim() === currentUsername);
          });

          const existsInTechs = techsDocs.some((d) => {
            const data = d.data ? d.data() : d;
            return d.id === currentId || (data.name && String(data.name).toLowerCase().trim() === currentUsername);
          });

          // Se o usuário não existir mais nem na coleção de usuários nem na de técnicos (e temos docs válidos)
          if (!existsInUsers && !existsInTechs && currentUsername !== 'admin-demo' && currentUsername !== 'admin') {
            logoutUserMobile().then(() => {
              callbacks.onUserInvalidated();
            });
          }
        });
      };

      let latestUsersSnap: any[] = [];
      let latestTechsSnap: any[] = [];
      let initialCheckDone = false;

      unsubUsers = onSnapshot(usersColRef, (snap) => {
        if (!snap.empty) {
          latestUsersSnap = snap.docs;
          if (initialCheckDone) validateCurrentUser(latestUsersSnap, latestTechsSnap);
        }
      }, (err) => {
        console.warn('Listener de usuários offline:', err);
      });

      unsubTechs = onSnapshot(techsColRef, (snap) => {
        if (!snap.empty) {
          latestTechsSnap = snap.docs;
        }
        initialCheckDone = true;
        if (latestUsersSnap.length > 0 || latestTechsSnap.length > 0) {
          validateCurrentUser(latestUsersSnap, latestTechsSnap);
        }
      }, (err) => {
        console.warn('Listener de técnicos offline:', err);
      });
    } catch {}
  });

  return () => {
    unsubKey();
    unsubUsers();
    unsubTechs();
  };
}

export async function isTestModeMobile(): Promise<boolean> {
  const linked = await getLinkedCompanyMobile();
  return Boolean(linked?.isTestMode);
}

export async function setTestModeMobile(): Promise<any> {
  const testPayload = {
    app: 'VOLLEN_OS',
    apiKey: 'TEST-MODE-OFFLINE',
    companyName: 'Vollen OS',
    cnpj: '',
    phone: '',
    isTestMode: true,
    timestamp: new Date().toISOString(),
  };

  const testUser = {
    id: 'tech-test-demo',
    username: 'tecnico_demo',
    name: 'Técnico de Demonstração',
    role: 'Admin',
    isAdmin: true,
  };

  await setLocalData('mobile_linked_company', testPayload);
  await AsyncStorage.removeItem('mobile_auth_user');
  await setLocalData('mobile_orders', []);      // OS limpa
  await setLocalData('mobile_clients', []);     // Clientes limpos
  await setLocalData('mobile_parts', []);       // Peças limpas — usa DEFAULT_PARTS_PC da memória
  await setLocalData('mobile_services', []);    // Serviços limpos — usa DEFAULT_SERVICES_PC da memória
  await setLocalData('mobile_equipments', []);  // Equipamentos limpos — usa DEFAULT_EQUIPMENTS_PC da memória
  await setLocalData('mobile_technicians', []); // Técnicos limpos — retorna só o técnico demo
  await setLocalData('mobile_company_data', {
    name: 'Vollen - Gestão de OS',
    tradingName: 'Vollen - Gestão de OS',
    cnpj: '',
    phone: '',
    logoUrl: '',
    slogan: 'Versão de Demonstração (Modo de Teste)',
  });
  return { testPayload, testUser };
}

export async function unlinkCompanyMobile(): Promise<void> {
  await AsyncStorage.removeItem('mobile_linked_company');
  await AsyncStorage.removeItem('mobile_auth_user');
}

// Helpers Locais Offline-First
export async function getLocalData<T>(key: string, defaultVal: T): Promise<T> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : defaultVal;
  } catch {
    return defaultVal;
  }
}

export async function setLocalData<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Erro ao gravar no AsyncStorage:', err);
  }
}

// Helper de requisição com Timeout compatível com React Native / Hermes
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// 0. AUTENTICAÇÃO E USUÁRIOS
export const TEST_MODE_USERS = [
  { id: 'admin-demo', username: 'admin', name: 'Administrador (Demo)', role: 'Admin', isAdmin: true, password: '1234' },
];

export async function fetchUsersMobile(): Promise<any[]> {
  const isTest = await isTestModeMobile();
  if (isTest) {
    return TEST_MODE_USERS;
  }

  try {
    const { getActiveMobileFirestore } = await import('./firebase');
    const activeDb = await getActiveMobileFirestore();
    const [usersSnap, techsSnap] = await Promise.all([
      getDocs(collection(activeDb, 'users')).catch(() => null),
      getDocs(collection(activeDb, 'technicians')).catch(() => null),
    ]);

    const combined: any[] = [];
    const seen = new Set<string>();

    if (usersSnap && !usersSnap.empty) {
      usersSnap.docs.forEach((d) => {
        const data = d.data();
        const role = (data.role || '').toUpperCase();
        const isAdmin = Boolean(data.isAdmin || role === 'ADMIN' || (data.username || '').toLowerCase() === 'admin');
        const isTech = Boolean(data.isTechnician || role === 'TECNICO' || role === 'TÉCNICO');

        // No APK apenas Técnicos e Administradores podem logar
        if (isAdmin || isTech) {
          const key = (data.username || data.name || d.id).toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            combined.push({ id: d.id, ...data });
          }
        }
      });
    }

    if (techsSnap && !techsSnap.empty) {
      techsSnap.docs.forEach((d) => {
        const data = d.data();
        const key = (data.username || data.name || d.id).toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push({ id: d.id, ...data, role: data.role || 'Técnico' });
        }
      });
    }

    if (combined.length > 0) {
      await setLocalData('mobile_users', combined);
      return combined;
    }
  } catch (err) {
    console.warn('Usando base local de usuários para login offline:', err);
  }

  const localSaved = await getLocalData<any[]>('mobile_users', []);
  if (localSaved && localSaved.length > 0) {
    return localSaved.filter((u: any) => {
      const role = (u.role || '').toUpperCase();
      return role === 'ADMIN' || role === 'TECNICO' || role === 'TÉCNICO' || u.isAdmin || u.isTechnician;
    });
  }

  return [
    { id: '1', username: 'admin', name: 'Administrador', role: 'Admin', isAdmin: true, isTechnician: true, password: '1234' },
  ];
}

export async function loginUserMobile(username: string, password?: string): Promise<any> {
  const isTest = await isTestModeMobile();
  const users = await fetchUsersMobile();
  const lower = username.toLowerCase().trim();
  const matched = users.find(
    (u) =>
      (u.username && u.username.toLowerCase().trim() === lower) ||
      (u.name && u.name.toLowerCase().trim() === lower) ||
      (u.id && String(u.id).toLowerCase().trim() === lower)
  );

  if (!matched) {
    throw new Error('Usuário/Técnico não encontrado no sistema.');
  }

  // No modo de teste, aceita tanto 1234 quanto 123 ou a senha do próprio matched
  if (isTest) {
    const validTestPasswords = ['1234', '123', matched.password];
    if (password && !validTestPasswords.includes(password)) {
      throw new Error('Senha incorreta. No modo teste use 1234.');
    }
  } else if (matched.password && matched.password !== password) {
    throw new Error('Senha incorreta. Tente novamente.');
  }

  // Garante que o objeto tenha o nome legível
  const finalUser = {
    ...matched,
    name: matched.name || matched.username || 'Técnico',
  };

  await setLocalData('mobile_auth_user', finalUser);
  return finalUser;
}

export async function getCurrentUserMobile(): Promise<any | null> {
  return getLocalData<any | null>('mobile_auth_user', null);
}

export async function logoutUserMobile(): Promise<void> {
  await AsyncStorage.removeItem('mobile_auth_user');
}

// 0.1 DADOS DA EMPRESA (Sincronizado com o PC)
export const DEFAULT_COMPANY_MOBILE = {
  name: 'Vollen Assistência Técnica',
  tradingName: 'Vollen Assistência Técnica',
  slogan: 'Assistência Técnica Especializada',
  logoUrl: '',
  phone: '',
  whatsapp: '',
  email: '',
  cnpj: '',
};

// Dados neutros usados no modo de teste (sem nenhum vínculo com empresa cadastrada)
export const TEST_MODE_COMPANY = {
  name: 'Vollen - Gestão de OS',
  tradingName: 'Vollen - Gestão de OS',
  slogan: 'Modo de Demonstração',
  logoUrl: '',  // Logo vazio: exibe ícone padrão do sistema
  phone: '',
  whatsapp: '',
  email: '',
  cnpj: '',
};

export async function fetchCompanyDataMobile(): Promise<any> {
  const isTest = await isTestModeMobile();
  if (isTest) {
    return TEST_MODE_COMPANY;
  }

  const local = await getLocalData<any>('mobile_company_data', DEFAULT_COMPANY_MOBILE);
  try {
    const activeDb = await getActiveMobileFirestore();
    const compRef = doc(activeDb, 'system_config', 'company_data');
    const snap = await withTimeout(getDoc(compRef), 1500).catch(() => null);
    if (snap && snap.exists()) {
      const data = snap.data();
      await setLocalData('mobile_company_data', data);
      return data;
    }
  } catch {}
  return local;
}

export function subscribeCompanyDataMobile(callback: (company: any) => void) {
  isTestModeMobile().then(async (isTest) => {
    if (isTest) return;
    try {
      const activeDb = await getActiveMobileFirestore();
      const compRef = doc(activeDb, 'system_config', 'company_data');
      onSnapshot(compRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setLocalData('mobile_company_data', data);
          callback(data);
        }
      });
    } catch {}
  });
  return () => {};
}

// 1. ORDENS DE SERVIÇO (OS)
export async function fetchOrdersMobile(): Promise<any[]> {
  const local = await getLocalData<any[]>('mobile_orders', []);
  const pendingQueue = await getLocalData<any[]>('mobile_pending_orders_queue', []);
  const testMode = await isTestModeMobile();
  if (testMode) {
    return local;
  }

  try {
    const { getActiveMobileFirestore } = await import('./firebase');
    const activeDb = await getActiveMobileFirestore();
    const colRef = collection(activeDb, 'orders');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const serverOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const mergedMap = new Map<string, any>();
      serverOrders.forEach((o) => mergedMap.set(o.id, o));
      // Sempre mantém as ordens da fila de espera local
      pendingQueue.forEach((o) => mergedMap.set(o.id, o));
      local.filter((o) => o.isPendingSync || String(o.code).includes('Aguardando')).forEach((o) => mergedMap.set(o.id, o));
      
      const finalOrders = Array.from(mergedMap.values());
      await setLocalData('mobile_orders', finalOrders);
      return finalOrders;
    } else if (!snap.metadata.fromCache) {
      const mergedMap = new Map<string, any>();
      pendingQueue.forEach((o) => mergedMap.set(o.id, o));
      const finalOrders = Array.from(mergedMap.values());
      await setLocalData('mobile_orders', finalOrders);
      return finalOrders;
    }
  } catch (err) {
    console.warn('Erro ao buscar ordens no Firestore mobile (usando cache):', err);
  }
  return local;
}

export function subscribeOrdersMobile(callback: (orders: any[]) => void) {
  getLocalData<any | null>('mobile_linked_company', null).then(async (linked) => {
    if (linked?.isTestMode) {
      // Modo de teste não escuta o Firestore da empresa
      return () => {};
    }
    try {
      const { getActiveMobileFirestore } = await import('./firebase');
      const activeDb = await getActiveMobileFirestore();
      const colRef = collection(activeDb, 'orders');
      return onSnapshot(colRef, async (snap) => {
        if (snap.metadata.fromCache && snap.empty) return;

        const serverOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const pendingQueue = await getLocalData<any[]>('mobile_pending_orders_queue', []);
        const local = await getLocalData<any[]>('mobile_orders', []);

        const mergedMap = new Map<string, any>();
        serverOrders.forEach((o) => mergedMap.set(o.id, o));
        pendingQueue.forEach((o) => mergedMap.set(o.id, o));
        local.filter((o) => o.isPendingSync || String(o.code).includes('Aguardando')).forEach((o) => mergedMap.set(o.id, o));

        const finalOrders = Array.from(mergedMap.values());
        await setLocalData('mobile_orders', finalOrders);
        callback(finalOrders);
      });
    } catch {
      return () => {};
    }
  });
  return () => {};
}

export async function saveOrderMobile(orderData: any): Promise<any> {
  const local = await getLocalData<any[]>('mobile_orders', []);
  const pendingQueue = await getLocalData<any[]>('mobile_pending_orders_queue', []);
  const orderId = orderData.id || `MOB-OS-${Date.now()}`;
  
  let orderCode = orderData.code;

  // Se já tem código definitivo oficial (ex: OS-0005), mantém
  const isPendingCode = !orderCode || orderCode === 'Aguardando Rede...' || orderCode.includes('Aguardando') || orderCode.startsWith('PENDENTE');
  const isTestMode = await isTestModeMobile();
  
  let hasObtainedOfficialCode = false;

  if (isTestMode) {
    if (isPendingCode) {
      orderCode = `OS-TEST-${String(local.length + 1).padStart(4, '0')}`;
      hasObtainedOfficialCode = true;
    }
  } else if (isPendingCode) {
    try {
      // Tenta obter o próximo número oficial no Firestore (apenas com conexão real do servidor)
      const { getActiveMobileFirestore } = await import('./firebase');
      const activeDb = await getActiveMobileFirestore();
      const counterRef = doc(activeDb, 'system_config', 'order_counter');
      
      const [counterSnap, ordersSnap] = await withTimeout(
        Promise.all([
          getDoc(counterRef),
          getDocs(collection(activeDb, 'orders')),
        ]),
        1500
      );

      // Se veio do cache local por estar sem internet, NÃO atribui número agora para evitar conflito!
      const isFromCache = Boolean(counterSnap?.metadata?.fromCache || ordersSnap?.metadata?.fromCache);
      if (isFromCache) {
        throw new Error('OFFLINE_CACHE_RESPONSE');
      }

      let maxFound = 0;

      // 1. Números em todas as ordens reais na nuvem
      if (ordersSnap && !ordersSnap.empty) {
        ordersSnap.docs.forEach((d: any) => {
          const c = d.data()?.code;
          if (c && !String(c).includes('Aguardando') && !String(c).includes('PENDENTE')) {
            const num = parseInt(String(c).replace(/\D/g, ''), 10);
            if (!isNaN(num) && num > maxFound) maxFound = num;
          }
        });
      }

      // 2. Números nas ordens locais do celular
      local.forEach((o) => {
        if (o?.code && !String(o.code).includes('Aguardando') && !String(o.code).includes('PENDENTE')) {
          const num = parseInt(String(o.code).replace(/\D/g, ''), 10);
          if (!isNaN(num) && num > maxFound) maxFound = num;
        }
      });

      const nextNumber = maxFound + 1;
      setDoc(counterRef, { lastOrderNumber: nextNumber, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      orderCode = `OS-${String(nextNumber).padStart(4, '0')}`;
      hasObtainedOfficialCode = true;
    } catch (netErr) {
      // Sem internet: a OS é salva localmente com código 'Aguardando Rede...' (sem inventar número local)
      console.log('Dispositivo sem rede/internet. OS salva em modo de espera aguardando conexão.');
      orderCode = 'Aguardando Rede...';
      hasObtainedOfficialCode = false;
    }
  }

  const finalOrder = {
    ...orderData,
    id: orderId,
    code: orderCode,
    isPendingSync: !hasObtainedOfficialCode && !isTestMode,
    updatedAt: new Date().toISOString(),
    createdAt: orderData.createdAt || new Date().toISOString(),
  };

  // 1. SALVAMENTO LOCAL IMEDIATO
  const updatedList = [finalOrder, ...local.filter((o) => o.id !== orderId)];
  await setLocalData('mobile_orders', updatedList);

  // 2. SE FOR PENDENTE DE SINCRONIZAÇÃO OFFLINE, GUARDA NA FILA DEDICADA
  if (!hasObtainedOfficialCode && !isTestMode) {
    const updatedQueue = [finalOrder, ...pendingQueue.filter((o) => o.id !== orderId)];
    await setLocalData('mobile_pending_orders_queue', updatedQueue);
  }

  // 3. SE CONSEGUIU O CÓDIGO OFICIAL, SOBE PARA A NUVEM EM BACKGROUND
  if (hasObtainedOfficialCode && !isTestMode) {
    (async () => {
      try {
        const activeDb = await getActiveMobileFirestore();
        const sanitizedOrder = JSON.parse(JSON.stringify(finalOrder));
        await withTimeout(setDoc(doc(activeDb, 'orders', orderId), sanitizedOrder, { merge: true }), 3000);
      } catch (err) {
        console.warn('OS salva localmente, sincronização remota será feita em segundo plano:', err);
      }
    })();
  }

  return finalOrder;
}

let isSyncingPendingOrders = false;

// Sincronizador automático de OS pendentes quando a rede/internet voltar
export async function syncPendingOrdersMobile(): Promise<void> {
  const isTest = await isTestModeMobile();
  if (isTest) return;

  if (isSyncingPendingOrders) return;
  isSyncingPendingOrders = true;

  try {
    const pendingQueue = await getLocalData<any[]>('mobile_pending_orders_queue', []);
    const local = await getLocalData<any[]>('mobile_orders', []);

    // Pega todas as ordens marcadas como pendentes ou na fila
    const map = new Map<string, any>();
    pendingQueue.forEach((o) => map.set(o.id, o));
    local.filter((o) => o.isPendingSync || !o.code || String(o.code).includes('Aguardando')).forEach((o) => map.set(o.id, o));
    const pending = Array.from(map.values());

    if (pending.length === 0) return;

    const activeDb = await getActiveMobileFirestore();
    const counterRef = doc(activeDb, 'system_config', 'order_counter');

    // 1. Processa cada OS pendente garantindo atomicidade estrita
    while (true) {
      const currentQueue = await getLocalData<any[]>('mobile_pending_orders_queue', []);
      const currentLocal = await getLocalData<any[]>('mobile_orders', []);

      const pendingMap = new Map<string, any>();
      currentQueue.forEach((o) => pendingMap.set(o.id, o));
      currentLocal
        .filter((o) => o.isPendingSync || !o.code || String(o.code).includes('Aguardando'))
        .forEach((o) => pendingMap.set(o.id, o));

      const pendingList = Array.from(pendingMap.values());
      if (pendingList.length === 0) break;

      const pOrder = pendingList[0];

      try {
        // Consulta o Firestore para buscar todas as ordens existentes
        const ordersSnap = await withTimeout(getDocs(collection(activeDb, 'orders')), 5000);
        if (!ordersSnap || ordersSnap.metadata?.fromCache) {
          // Sem resposta real do servidor, interrompe o loop e aguarda conexão estável
          break;
        }

        let maxFound = 0;

        // Maior número entre todas as ordens existentes na nuvem (Firestore)
        if (!ordersSnap.empty) {
          ordersSnap.docs.forEach((d: any) => {
            const c = d.data()?.code;
            if (c && !String(c).includes('Aguardando') && !String(c).includes('PENDENTE')) {
              const num = parseInt(String(c).replace(/\D/g, ''), 10);
              if (!isNaN(num) && num > maxFound) maxFound = num;
            }
          });
        }

        // Maior número entre as ordens no celular (exceto a ordem sendo sincronizada)
        const localNow = await getLocalData<any[]>('mobile_orders', []);
        localNow.forEach((o) => {
          if (o?.id !== pOrder.id && o?.code && !String(o.code).includes('Aguardando') && !String(o.code).includes('PENDENTE')) {
            const num = parseInt(String(o.code).replace(/\D/g, ''), 10);
            if (!isNaN(num) && num > maxFound) maxFound = num;
          }
        });

        const nextNumber = maxFound + 1;
        const officialCode = `OS-${String(nextNumber).padStart(4, '0')}`;

        // 1. Atualiza contador atômico na nuvem
        await setDoc(counterRef, { lastOrderNumber: nextNumber, updatedAt: new Date().toISOString() }, { merge: true });

        const syncedOrder = {
          ...pOrder,
          code: officialCode,
          isPendingSync: false,
          updatedAt: new Date().toISOString(),
        };

        // 2. Salva a OS sincronizada no Firestore
        const sanitized = JSON.parse(JSON.stringify(syncedOrder));
        await setDoc(doc(activeDb, 'orders', pOrder.id), sanitized, { merge: true });

        // 3. Remove imediatamente da fila de pendentes isolada
        const qAfter = await getLocalData<any[]>('mobile_pending_orders_queue', []);
        await setLocalData(
          'mobile_pending_orders_queue',
          qAfter.filter((o) => o.id !== pOrder.id)
        );

        // 4. Atualiza a lista local do celular
        const lAfter = await getLocalData<any[]>('mobile_orders', []);
        const updatedLocal = lAfter.map((o) => (o.id === pOrder.id ? syncedOrder : o));
        if (!updatedLocal.find((o) => o.id === pOrder.id)) {
          updatedLocal.unshift(syncedOrder);
        }
        await setLocalData('mobile_orders', updatedLocal);
        console.log(`[Sync] OS em espera sincronizada com sucesso com o número oficial: ${officialCode}`);
      } catch (loopErr) {
        console.warn('Erro ao processar OS pendente no loop:', loopErr);
        break;
      }
    }
  } catch (err) {
    console.warn('Sync pending orders falhou:', err);
  } finally {
    isSyncingPendingOrders = false;
  }
}

// 2. CLIENTES
export async function fetchClientsMobile(): Promise<any[]> {
  const local = await getLocalData<any[]>('mobile_clients', []);
  const testMode = await isTestModeMobile();
  if (testMode) {
    return local;
  }

  try {
    const { getActiveMobileFirestore } = await import('./firebase');
    const activeDb = await getActiveMobileFirestore();
    const colRef = collection(activeDb, 'clients');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const serverClients = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await setLocalData('mobile_clients', serverClients);
      return serverClients;
    } else if (!snap.metadata.fromCache) {
      // Se o servidor online respondeu e está realmente vazio (ex: padrão de fábrica)
      await setLocalData('mobile_clients', []);
      return [];
    }
  } catch (err) {
    console.warn('Erro ao buscar clientes no Firestore mobile (usando cache):', err);
  }
  return local;
}

export function subscribeClientsMobile(callback: (clients: any[]) => void) {
  getLocalData<any | null>('mobile_linked_company', null).then(async (linked) => {
    if (linked?.isTestMode) {
      return () => {};
    }
    try {
      const { getActiveMobileFirestore } = await import('./firebase');
      const activeDb = await getActiveMobileFirestore();
      const colRef = collection(activeDb, 'clients');
      return onSnapshot(colRef, async (snap) => {
        // Se veio do cache offline vazio, não limpa
        if (snap.metadata.fromCache && snap.empty) return;

        if (snap.empty && !snap.metadata.fromCache) {
          // Servidor online confirmou que a lista de clientes foi resetada
          await setLocalData('mobile_clients', []);
          callback([]);
          return;
        }

        const serverClients = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        await setLocalData('mobile_clients', serverClients);
        callback(serverClients);
      });
    } catch {
      return () => {};
    }
  });
  return () => {};
}

export async function saveClientMobile(clientData: any): Promise<any> {
  const local = await getLocalData<any[]>('mobile_clients', []);
  const clientId = clientData.id || `MOB-CLI-${Date.now()}`;
  
  let clientCode = clientData.code;
  if (!clientCode) {
    const maxNum = local.reduce((max, c) => {
      const n = parseInt(String(c.code || '').replace(/\D/g, ''), 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    clientCode = String(maxNum + 1).padStart(4, '0');
  }

  const finalClient = {
    ...clientData,
    id: clientId,
    code: clientCode,
    updatedAt: new Date().toISOString(),
  };

  const updatedList = [finalClient, ...local.filter((c) => c.id !== clientId)];
  await setLocalData('mobile_clients', updatedList);

  // Propaga a atualização do cliente (endereço, telefone, etc.) para todas as OS vinculadas a este cliente
  try {
    const localOrders = await getLocalData<any[]>('mobile_orders', []);
    let hasOrderUpdated = false;
    const updatedOrders = localOrders.map((o) => {
      const matchById = o.clientId === clientId || o.client?.id === clientId;
      const matchByCode = finalClient.code && o.client?.code === finalClient.code;
      const matchByName = !o.clientId && !o.client?.id && o.client?.name && o.client.name.trim().toLowerCase() === finalClient.name.trim().toLowerCase();

      if (matchById || matchByCode || matchByName) {
        hasOrderUpdated = true;
        return {
          ...o,
          client: {
            ...(o.client || {}),
            ...finalClient,
          },
          updatedAt: new Date().toISOString(),
        };
      }
      return o;
    });

    if (hasOrderUpdated) {
      await setLocalData('mobile_orders', updatedOrders);
      // Se não for teste, atualiza também as OS modificadas no Firestore em background
      const isTest = await isTestModeMobile();
      if (!isTest) {
        (async () => {
          try {
            const activeDb = await getActiveMobileFirestore();
            for (const ord of updatedOrders) {
              if (ord.clientId === clientId || ord.client?.id === clientId) {
                setDoc(doc(activeDb, 'orders', ord.id), ord, { merge: true }).catch(() => {});
              }
            }
          } catch {}
        })();
      }
    }
  } catch (syncErr) {
    console.warn('Erro ao propagar dados do cliente para as OS vinculadas:', syncErr);
  }

  const isTest = await isTestModeMobile();
  if (!isTest) {
    // Sincroniza com a nuvem em background sem travar caso o dispositivo esteja offline
    (async () => {
      try {
        const activeDb = await getActiveMobileFirestore();
        await withTimeout(setDoc(doc(activeDb, 'clients', clientId), finalClient, { merge: true }), 3000);
      } catch (err) {
        // Silencioso se offline: o dado já está persistido no storage local do aparelho
      }
    })();
  }

  return finalClient;
}

export async function deleteClientMobile(clientId: string): Promise<boolean> {
  const local = await getLocalData<any[]>('mobile_clients', []);
  const updatedList = local.filter((c) => c.id !== clientId);
  await setLocalData('mobile_clients', updatedList);

  const isTest = await isTestModeMobile();
  if (!isTest) {
    (async () => {
      try {
        const activeDb = await getActiveMobileFirestore();
        await withTimeout(deleteDoc(doc(activeDb, 'clients', clientId)), 3000);
      } catch (err) {
        // Silencioso se offline
      }
    })();
  }

  return true;
}

// 3. ORÇAMENTOS
export async function fetchEstimatesMobile(): Promise<any[]> {
  return getLocalData<any[]>('mobile_estimates', []);
}

export async function saveEstimateMobile(estimate: any): Promise<any> {
  const local = await getLocalData<any[]>('mobile_estimates', []);
  const id = estimate.id || `EST-${Date.now()}`;
  const code = estimate.code || String(local.length + 1).padStart(4, '0');
  const finalEst = { ...estimate, id, code, updatedAt: new Date().toISOString() };
  const updated = [finalEst, ...local.filter((e) => e.id !== id)];
  await setLocalData('mobile_estimates', updated);
  try {
    const { getActiveMobileFirestore } = await import('./firebase');
    const activeDb = await getActiveMobileFirestore();
    await setDoc(doc(activeDb, 'estimates', id), finalEst, { merge: true });
  } catch {}
  return finalEst;
}

// 4. PEÇAS, SERVIÇOS E EQUIPAMENTOS (100% SINCRONIZADOS COM A CENTRAL DO PC)
export const DEFAULT_EQUIPMENTS_PC: any[] = [];

export const DEFAULT_PARTS_PC: any[] = [];

export const DEFAULT_SERVICES_PC: any[] = [];

export async function fetchEquipmentsMobile(): Promise<any[]> {
  const isTest = await isTestModeMobile();
  if (isTest) {
    return getLocalData<any[]>('mobile_equipments', DEFAULT_EQUIPMENTS_PC);
  }

  const local = await getLocalData<any[]>('mobile_equipments', DEFAULT_EQUIPMENTS_PC);
  try {
    const activeDb = await getActiveMobileFirestore();
    const colRef = collection(activeDb, 'equipments');
    const snap = await withTimeout(getDocs(colRef), 2000).catch(() => null);
    if (snap && !snap.empty) {
      const serverEquips = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await setLocalData('mobile_equipments', serverEquips);
      return serverEquips;
    } else if (snap && !snap.metadata.fromCache) {
      // Se a nuvem está vazia (ex: após restaurar padrões de fábrica), limpa o cache local
      await setLocalData('mobile_equipments', []);
      return [];
    }
  } catch {}
  return local;
}

export async function fetchPartsMobile(): Promise<any[]> {
  const isTest = await isTestModeMobile();
  if (isTest) {
    return getLocalData<any[]>('mobile_parts', DEFAULT_PARTS_PC);
  }

  const local = await getLocalData<any[]>('mobile_parts', DEFAULT_PARTS_PC);
  try {
    const activeDb = await getActiveMobileFirestore();
    const colRef = collection(activeDb, 'parts');
    const snap = await withTimeout(getDocs(colRef), 2000).catch(() => null);
    if (snap && !snap.empty) {
      const serverParts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await setLocalData('mobile_parts', serverParts);
      return serverParts;
    } else if (snap && !snap.metadata.fromCache) {
      // Se a nuvem está vazia (ex: após restaurar padrões de fábrica), limpa o cache local
      await setLocalData('mobile_parts', []);
      return [];
    }
  } catch {}
  return local;
}

export async function fetchServicesMobile(): Promise<any[]> {
  const isTest = await isTestModeMobile();
  if (isTest) {
    return getLocalData<any[]>('mobile_services', DEFAULT_SERVICES_PC);
  }

  const local = await getLocalData<any[]>('mobile_services', DEFAULT_SERVICES_PC);
  try {
    const activeDb = await getActiveMobileFirestore();
    const colRef = collection(activeDb, 'services');
    const snap = await withTimeout(getDocs(colRef), 2000).catch(() => null);
    if (snap && !snap.empty) {
      const serverServices = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await setLocalData('mobile_services', serverServices);
      return serverServices;
    } else if (snap && !snap.metadata.fromCache) {
      // Se a nuvem está vazia (ex: após restaurar padrões de fábrica), limpa o cache local
      await setLocalData('mobile_services', []);
      return [];
    }
  } catch {}
  return local;
}

export async function fetchTechniciansMobile(): Promise<any[]> {
  const isTest = await isTestModeMobile();
  if (isTest) {
    return [
      { id: 'tech-test-demo', name: 'TÉCNICO DE DEMONSTRAÇÃO', username: 'tecnico_demo', role: 'Admin' }
    ];
  }

  try {
    const { getActiveMobileFirestore } = await import('./firebase');
    const activeDb = await getActiveMobileFirestore();
    const colRef = collection(activeDb, 'users');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const serverUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await setLocalData('mobile_technicians', serverUsers);
      return serverUsers;
    }
  } catch (err) {
    console.warn('Erro ao buscar técnicos no Firestore mobile:', err);
  }
  return getLocalData<any[]>('mobile_technicians', []);
}

export const DEFAULT_STATUSES_MOBILE = [
  { id: '1', code: '0001', name: 'ABERTA', color: '#eab308', description: 'Ordem de serviço aberta aguardando avaliação', isSystemDefault: true },
  { id: '7', code: '0002', name: 'ORCAMENTO_APROVADO', color: '#8b5cf6', description: 'Orçamento aprovado pelo cliente com reserva de peças', isSystemDefault: true },
  { id: '2', code: '0003', name: 'EM_ATENDIMENTO', color: '#0284c7', description: 'Técnico trabalhando no equipamento / Visita Técnica', isSystemDefault: true },
  { id: '8', code: '0004', name: 'APROVADO', color: '#059669', description: 'Serviço e orçamento aprovados pelo cliente', isSystemDefault: true },
  { id: '3', code: '0005', name: 'AGUARDANDO_PECA', color: '#f97316', description: 'Aguardando chegada de peças para conclusão', isSystemDefault: true },
  { id: '4', code: '0006', name: 'APARELHO_LIBERADO', color: '#10b981', description: 'Aparelho pronto e liberado para retirada pelo cliente', isSystemDefault: true },
  { id: '5', code: '0007', name: 'FINALIZADA', color: '#047857', description: 'Serviço concluído e entregue ao cliente', isSystemDefault: true },
  { id: '6', code: '0008', name: 'CANCELADA', color: '#dc2626', description: 'Ordem de serviço cancelada', isSystemDefault: true },
];

export async function fetchStatusesMobile(): Promise<any[]> {
  const isTest = await isTestModeMobile();
  if (isTest) {
    return DEFAULT_STATUSES_MOBILE;
  }

  try {
    const { getActiveMobileFirestore } = await import('./firebase');
    const activeDb = await getActiveMobileFirestore();
    const colRef = collection(activeDb, 'os_statuses');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const serverStatuses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await setLocalData('mobile_os_statuses', serverStatuses);
      return serverStatuses;
    }
  } catch (err) {
    console.warn('Erro ao buscar status de OS no Firestore mobile:', err);
  }
  return getLocalData<any[]>('mobile_os_statuses', DEFAULT_STATUSES_MOBILE);
}

// 5. BAIXA/DEVOLUÇÃO DE ESTOQUE BASEADA NO STATUS DA OS

/** Dá baixa nas peças — permite estoque negativo. Retorna lista de peças com estoque insuficiente. */
export async function deductStockForApprovedOrder(parts: any[]): Promise<string[]> {
  const insufficient: string[] = [];
  if (!parts || parts.length === 0) return insufficient;
  try {
    const { getActiveMobileFirestore } = await import('./firebase');
    const activeDb = await getActiveMobileFirestore();
    const currentParts = await fetchPartsMobile();
    for (const item of parts) {
      const matched = currentParts.find(
        (p) =>
          (p.id && item.id && String(p.id) === String(item.id)) ||
          (p.code && item.code && p.code === item.code) ||
          (p.name && item.name && p.name.toLowerCase() === item.name.toLowerCase())
      );
      if (matched) {
        const qtyToDeduct = Number(item.quantity || item.qty || 1);
        const currentStock = Number(matched.stockQuantity) || 0;
        const newStock = currentStock - qtyToDeduct; // Permite negativo (débito)
        if (currentStock <= 0) {
          insufficient.push(`${item.name || item.code} (estoque: ${currentStock}, reservado: ${qtyToDeduct})`);
        }
        matched.stockQuantity = newStock;
        setDoc(doc(activeDb, 'parts', String(matched.id)), { stockQuantity: newStock }, { merge: true }).catch(() => {});
      }
    }
    await setLocalData('mobile_parts', currentParts);
  } catch (err) {
    console.warn('Erro ao dar baixa no estoque local:', err);
  }
  return insufficient;
}

/** Devolve peças ao estoque (soma qty de volta). Usado ao cancelar OS ou remover peças. */
export async function restoreStockForOrder(parts: any[]): Promise<void> {
  if (!parts || parts.length === 0) return;
  try {
    const { getActiveMobileFirestore } = await import('./firebase');
    const activeDb = await getActiveMobileFirestore();
    const currentParts = await fetchPartsMobile();
    for (const item of parts) {
      const matched = currentParts.find(
        (p) =>
          (p.id && item.id && String(p.id) === String(item.id)) ||
          (p.code && item.code && p.code === item.code) ||
          (p.name && item.name && p.name.toLowerCase() === item.name.toLowerCase())
      );
      if (matched) {
        const qtyToRestore = Number(item.quantity || item.qty || 1);
        matched.stockQuantity = (Number(matched.stockQuantity) || 0) + qtyToRestore;
        setDoc(doc(activeDb, 'parts', String(matched.id)), { stockQuantity: matched.stockQuantity }, { merge: true }).catch(() => {});
      }
    }
    await setLocalData('mobile_parts', currentParts);
  } catch (err) {
    console.warn('Erro ao restaurar estoque local:', err);
  }
}

/**
 * Gerencia diff de estoque ao salvar uma OS:
 * - Restaura peças removidas (que estavam no snapshot anterior)
 * - Dá baixa nas peças adicionadas (que não estavam no snapshot)
 * - Só age se o status exige baixa automática
 * Retorna o novo partsReservedSnapshot e lista de peças com estoque insuficiente.
 */
const STATUS_QUE_BAIXAM_ESTOQUE = ['ORCAMENTO_APROVADO', 'APROVADO', 'APROVADA', 'AGUARDANDO_PECA', 'FINALIZADA', 'FINALIZADO'];

export async function adjustStockForStatusChange(
  newParts: any[],
  previousSnapshot: any[],
  newStatus: string,
  previousStatus: string,
): Promise<{ newSnapshot: any[]; insufficient: string[] }> {
  const newStatusUpper = (newStatus || '').toUpperCase();
  const prevStatusUpper = (previousStatus || '').toUpperCase();
  const wasActive = STATUS_QUE_BAIXAM_ESTOQUE.includes(prevStatusUpper);
  const isActive = STATUS_QUE_BAIXAM_ESTOQUE.includes(newStatusUpper);
  const isCancelled = newStatusUpper === 'CANCELADA';
  const insufficient: string[] = [];

  if (isCancelled) {
    // Cancelou: devolve TUDO que estava reservado
    if (previousSnapshot.length > 0) {
      await restoreStockForOrder(previousSnapshot);
    }
    return { newSnapshot: [], insufficient };
  }

  if (!isActive) {
    // Status que não exige baixa (ex: ABERTA, ORÇAMENTO): não mexe no estoque
    return { newSnapshot: previousSnapshot, insufficient };
  }

  // Status ativo — calcula diff
  // 1. Peças removidas em relação ao snapshot: devolver ao estoque
  const partsRemoved = previousSnapshot.filter((prev) =>
    !newParts.some(
      (np) =>
        (np.id && prev.id && String(np.id) === String(prev.id)) ||
        (np.code && prev.code && np.code === prev.code) ||
        (np.name && prev.name && np.name.toLowerCase() === prev.name.toLowerCase())
    )
  );
  if (partsRemoved.length > 0) {
    await restoreStockForOrder(partsRemoved);
  }

  // 2. Peças adicionadas em relação ao snapshot: dar baixa
  const partsAdded = newParts.filter((np) =>
    !previousSnapshot.some(
      (prev) =>
        (np.id && prev.id && String(np.id) === String(prev.id)) ||
        (np.code && prev.code && np.code === prev.code) ||
        (np.name && prev.name && np.name.toLowerCase() === prev.name.toLowerCase())
    )
  );
  if (partsAdded.length > 0) {
    const ins = await deductStockForApprovedOrder(partsAdded);
    insufficient.push(...ins);
  }

  // 3. Se o status MUDOU de inativo para ativo, dá baixa em TODAS as peças atuais
  if (!wasActive && isActive && partsAdded.length === 0 && newParts.length > 0 && previousSnapshot.length === 0) {
    const ins = await deductStockForApprovedOrder(newParts);
    insufficient.push(...ins);
  }

  return { newSnapshot: [...newParts], insufficient };
}

// 6. VISITAS (Sincronizado com os agendamentos cadastrados no PC e Mobile)
export async function fetchVisitsByTechnician(technicianName: string, dateStr?: string): Promise<any[]> {
  const orders = await fetchOrdersMobile();
  const currentUser = await getCurrentUserMobile();
  const isRoleAdmin = currentUser?.role === 'Admin' || currentUser?.username === 'admin';

  let serverVisits: any[] = [];
  try {
    const { getActiveMobileFirestore } = await import('./firebase');
    const activeDb = await getActiveMobileFirestore();
    const colRef = collection(activeDb, 'visits');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      serverVisits = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  } catch (err) {
    console.warn('Erro ao buscar visitas diretas no Firestore:', err);
  }

  // Agrupa ordens com tipo AGENDAMENTO ou status VISITA_TECNICA (ignora OS excluídas)
  const scheduleOrders = orders.filter((o) => {
    if (o.status === 'EXCLUIDA' || o.isDeleted) return false;
    const isScheduleType = (o.type || '').toUpperCase() === 'AGENDAMENTO' || (o.status || '').toUpperCase() === 'VISITA_TECNICA';
    return isScheduleType;
  });

  // Mapeia todas as visitas sincronizadas
  const allVisitsMap = new Map<string, any>();

  // 1. Prioriza visitas da coleção 'visits' (apenas se a OS correspondente existir e não estiver excluída)
  serverVisits.forEach((v) => {
    // Se a visita tem vínculo com orderId/orderCode, verifica se a ordem ainda existe
    const hasOrderLink = Boolean(v.orderId || v.orderCode);
    const matchingOrder = orders.find((o) => o.id === v.orderId || o.code === v.orderId || o.code === v.orderCode);
    
    // Se a visita foi criada vinculada a uma OS e essa OS foi excluída (não existe mais em orders), ignora a visita
    if (hasOrderLink && !matchingOrder) {
      return;
    }
    if (matchingOrder && (matchingOrder.status === 'EXCLUIDA' || matchingOrder.isDeleted)) {
      return;
    }

    const key = v.id || v.orderId || matchingOrder?.id;
    if (!key) return;

    const orderObs = matchingOrder?.orderObservations || matchingOrder?.observations || matchingOrder?.generalNotes || '';
    const assignedTech = (v.technicianName || v.technician || matchingOrder?.technician || matchingOrder?.technicianName || '').trim();
    const effectiveDate = v.date || v.scheduledDate || matchingOrder?.scheduledDate || (matchingOrder?.entryDate ? matchingOrder.entryDate.split('T')[0] : '') || (matchingOrder?.createdAt ? matchingOrder.createdAt.split('T')[0] : '');

    allVisitsMap.set(key, {
      id: v.id || matchingOrder?.id,
      orderId: matchingOrder?.id || v.orderId,
      orderCode: matchingOrder?.code || v.orderCode || 'OS',
      order: matchingOrder || v.order || null,
      client: matchingOrder?.client || v.client,
      clientName: matchingOrder?.client?.name || v.clientName || 'Cliente',
      clientPhone: matchingOrder?.client?.phone || matchingOrder?.client?.whatsapp || v.clientPhone || '',
      clientAddress: matchingOrder?.client?.address
        ? `${matchingOrder.client.address}, ${matchingOrder.client.number || 'S/N'}`
        : v.clientAddress || 'Endereço não informado',
      equipment: matchingOrder?.equipment || v.equipment,
      deviceType: matchingOrder?.equipment?.type || v.deviceType || 'Equipamento',
      deviceBrand: matchingOrder?.equipment?.brand || v.deviceBrand || '',
      problemReported: matchingOrder?.problemDescription || v.problemReported || '',
      technicalReport: matchingOrder?.technicalReport || v.technicalReport || '',
      orderObservations: orderObs || v.orderObservations || '',
      servicePerformed: matchingOrder?.servicePerformed || matchingOrder?.executedService || v.servicePerformed || '',
      services: matchingOrder?.services || matchingOrder?.servicesExecuted || v.services || [],
      parts: matchingOrder?.parts || matchingOrder?.partsUsed || v.parts || [],
      status: v.status || matchingOrder?.status || 'AGENDADA',
      period: v.period !== undefined ? v.period : (matchingOrder?.period || ''),
      date: effectiveDate,
      scheduledDate: effectiveDate,
      technicianName: assignedTech,
      notes: v.notes || orderObs || matchingOrder?.technicalReport || '',
    });
  });

  // 2. Adiciona ordens do tipo AGENDAMENTO que ainda não tenham documento na coleção visits
  scheduleOrders.forEach((o) => {
    // Verifica se a ordem já está no mapa (tanto pela chave = o.id quanto por orderId dentro dos valores)
    const alreadyInMap = allVisitsMap.has(o.id) || Array.from(allVisitsMap.values()).some((v) => v.orderId === o.id);
    if (!alreadyInMap) {
      const orderObs = o.orderObservations || o.observations || o.generalNotes || '';
      const assignedTech = (o.technician || o.technicianName || '').trim();
      const effectiveDate = o.scheduledDate || o.entryDate || (o.createdAt ? o.createdAt.split('T')[0] : '');
      allVisitsMap.set(o.id, {
        id: o.id,
        orderId: o.id,
        orderCode: o.code || 'OS',
        order: o,
        client: o.client,
        clientName: o.client?.name || 'Cliente',
        clientPhone: o.client?.phone || o.client?.whatsapp || '',
        clientAddress: o.client?.address ? `${o.client.address}, ${o.client.number || 'S/N'}` : 'Endereço não informado',
        equipment: o.equipment,
        deviceType: o.equipment?.type || 'Equipamento',
        deviceBrand: o.equipment?.brand || '',
        problemReported: o.problemDescription || '',
        technicalReport: o.technicalReport || '',
        orderObservations: orderObs,
        servicePerformed: o.servicePerformed || o.executedService || '',
        services: o.services || o.servicesExecuted || [],
        parts: o.parts || o.partsUsed || [],
        status: o.status || 'AGENDADA',
        period: o.period || '',
        date: effectiveDate,
        scheduledDate: effectiveDate,
        technicianName: assignedTech,
        notes: o.technicalReport || orderObs || '',
      });
    }
  });

  let list = Array.from(allVisitsMap.values());

  // Filtra pelo técnico logado se não for administrador
  if (!isRoleAdmin) {
    const currentTechName = (technicianName || currentUser?.name || currentUser?.username || '').toLowerCase().trim();
    const currentUserName = (currentUser?.username || '').toLowerCase().trim();
    list = list.filter((v) => {
      const tech = (v.technicianName || '').toLowerCase().trim();
      return (
        !tech ||
        tech === currentTechName ||
        tech === currentUserName ||
        tech.includes(currentTechName) ||
        currentTechName.includes(tech)
      );
    });
  }

  // Ordena por data e período
  return list.sort((a, b) => {
    const dateA = a.scheduledDate || a.date || '';
    const dateB = b.scheduledDate || b.date || '';
    return dateA.localeCompare(dateB);
  });
}

export async function savePartMobile(partData: any): Promise<any> {
  const parts = await fetchPartsMobile();
  const partId = partData.id || `part-${Date.now()}`;
  const finalPart = {
    ...partData,
    id: partId,
    code: partData.code || String(parts.length + 1).padStart(4, '0'),
    updatedAt: new Date().toISOString(),
  };

  const updated = [finalPart, ...parts.filter((p) => p.id !== partId)];
  await setLocalData('mobile_parts', updated);
  try {
    const { getActiveMobileFirestore } = await import('./firebase');
    const activeDb = await getActiveMobileFirestore();
    await setDoc(doc(activeDb, 'parts', partId), finalPart, { merge: true });
  } catch (e) {}
  return finalPart;
}

export async function deletePartMobile(partId: string): Promise<void> {
  const parts = await fetchPartsMobile();
  const updated = parts.filter((p) => p.id !== partId);
  await setLocalData('mobile_parts', updated);
  try {
    const { getActiveMobileFirestore } = await import('./firebase');
    const activeDb = await getActiveMobileFirestore();
    await setDoc(doc(activeDb, 'parts', partId), { isDeleted: true }, { merge: true });
  } catch (e) {}
}

export async function saveEquipmentMobile(equipmentData: any): Promise<any> {
  const equips = await fetchEquipmentsMobile();
  const eqId = equipmentData.id || `eqp-${Date.now()}`;
  const finalEq = {
    ...equipmentData,
    id: eqId,
    code: equipmentData.code || String(equips.length + 1).padStart(4, '0'),
    updatedAt: new Date().toISOString(),
  };

  const updated = [finalEq, ...equips.filter((e) => e.id !== eqId)];
  await setLocalData('mobile_equipments', updated);
  try {
    const { getActiveMobileFirestore } = await import('./firebase');
    const activeDb = await getActiveMobileFirestore();
    await setDoc(doc(activeDb, 'equipments', eqId), finalEq, { merge: true });
  } catch (e) {}
  return finalEq;
}

export async function deleteEquipmentMobile(eqId: string): Promise<void> {
  const equips = await fetchEquipmentsMobile();
  const updated = equips.filter((e) => e.id !== eqId);
  await setLocalData('mobile_equipments', updated);
  try {
    const { getActiveMobileFirestore } = await import('./firebase');
    const activeDb = await getActiveMobileFirestore();
    await setDoc(doc(activeDb, 'equipments', eqId), { isDeleted: true }, { merge: true });
  } catch (e) {}
}

export async function saveServiceMobile(serviceData: any): Promise<any> {
  const srvs = await fetchServicesMobile();
  const srvId = serviceData.id || `srv-${Date.now()}`;
  const finalSrv = {
    ...serviceData,
    id: srvId,
    code: serviceData.code || String(srvs.length + 1).padStart(4, '0'),
    updatedAt: new Date().toISOString(),
  };

  const updated = [finalSrv, ...srvs.filter((s) => s.id !== srvId)];
  await setLocalData('mobile_services', updated);
  try {
    const { getActiveMobileFirestore } = await import('./firebase');
    const activeDb = await getActiveMobileFirestore();
    await setDoc(doc(activeDb, 'services', srvId), finalSrv, { merge: true });
  } catch (e) {}
  return finalSrv;
}

export async function deleteServiceMobile(srvId: string): Promise<void> {
  const srvs = await fetchServicesMobile();
  const updated = srvs.filter((s) => s.id !== srvId);
  await setLocalData('mobile_services', updated);
  try {
    const { getActiveMobileFirestore } = await import('./firebase');
    const activeDb = await getActiveMobileFirestore();
    await setDoc(doc(activeDb, 'services', srvId), { isDeleted: true }, { merge: true });
  } catch (e) {}
}

export async function updateVisitStatus(orderId: string, payload: any): Promise<any> {
  const orders = await fetchOrdersMobile();
  const existingOrder = orders.find((o) => o.id === orderId);
  if (!existingOrder) return null;

  const newStatus = payload.status || existingOrder.status;
  const currentParts = payload.partsUsed || existingOrder.parts || [];
  const previousSnapshot = existingOrder.partsReservedSnapshot || [];

  // Ajusta estoque com base na mudança de status
  const { newSnapshot } = await adjustStockForStatusChange(
    currentParts,
    previousSnapshot,
    newStatus,
    existingOrder.status || '',
  );

  const updatedOrder = {
    ...existingOrder,
    status: newStatus,
    technicalReport: payload.notes || existingOrder.technicalReport,
    signatureUrl: payload.signatureUrl || existingOrder.signatureUrl,
    parts: currentParts,
    partsUsed: currentParts,
    partsReservedSnapshot: newSnapshot,
    updatedAt: new Date().toISOString(),
  };

  await saveOrderMobile(updatedOrder);
  return updatedOrder;
}

// 6. MODELOS E PREFERÊNCIAS GERAIS DE OS (SINCRONIZADOS EM TEMPO REAL)
export async function fetchOSPreferencesMobile(): Promise<any> {
  const local = await getLocalData<any>('mobile_os_preferences', {
    entryReceiptTemplate: 'DEFAULT_2VIAS',
    exitReceiptTemplate: 'MODERN_DETAILED',
  });
  try {
    const activeDb = await getActiveMobileFirestore();
    const docRef = doc(activeDb, 'system_config', 'os_preferences');
    const snap = await withTimeout(getDoc(docRef), 1500).catch(() => null);
    if (snap && snap.exists()) {
      const data = snap.data();
      await setLocalData('mobile_os_preferences', data);
      return data;
    }
  } catch {}
  return local;
}

export function subscribeOSPreferencesMobile(callback: (data: any) => void) {
  isTestModeMobile().then(async (isTest) => {
    if (isTest) return;
    try {
      const activeDb = await getActiveMobileFirestore();
      const docRef = doc(activeDb, 'system_config', 'os_preferences');
      return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setLocalData('mobile_os_preferences', data);
          callback(data);
        }
      });
    } catch {
      return () => {};
    }
  });
  return () => {};
}

// 7. TERMOS DOS COMPROVANTES (ENTRADA, ORÇAMENTO, SAÍDA & GARANTIA)
export const DEFAULT_WARRANTY_CONFIG_MOBILE = {
  defaultDays: '90',
  defaultTerms: 'A garantia cobre exclusivamente os serviços executados e as peças substituídas identificadas neste documento pelo período estabelecido. Não cobre danos causados por mau uso, quedas, oscilações elétricas, umidade ou intervenção de terceiros.',
  defaultCoverage: 'PECAS_E_MAO_DE_OBRA',
  defaultEntryTerms: 'O cliente autoriza a realização da avaliação e diagnóstico técnico no equipamento descrito neste comprovante. Equipamentos não retirados em até 90 dias após notificação de conclusão/orçamento estarão sujeitos a taxas de guarda/armazenamento ou descarte conforme a legislação vigente.',
  defaultEstimateTerms: 'O orçamento possui validade de 10 dias úteis a contar da data de emissão. Os serviços e peças discriminados estão sujeitos à aprovação prévia do cliente.',
  defaultExitTerms: 'A garantia cobre exclusivamente os serviços executados e as peças substituídas identificadas neste documento pelo período estabelecido. Não cobre danos causados por mau uso, quedas, oscilações elétricas, umidade ou intervenção de terceiros.',
};

export async function fetchWarrantyConfigMobile(): Promise<any> {
  const isTest = await isTestModeMobile();
  if (isTest) {
    return DEFAULT_WARRANTY_CONFIG_MOBILE;
  }

  const local = await getLocalData<any>('mobile_warranty_config', DEFAULT_WARRANTY_CONFIG_MOBILE);
  try {
    const activeDb = await getActiveMobileFirestore();
    const docRef = doc(activeDb, 'system_config', 'warranty_config');
    const snap = await withTimeout(getDoc(docRef), 1500).catch(() => null);
    if (snap && snap.exists()) {
      const data = snap.data();
      await setLocalData('mobile_warranty_config', data);
      return data;
    }
  } catch {}
  return local;
}

export function subscribeWarrantyConfigMobile(callback: (data: any) => void) {
  isTestModeMobile().then(async (isTest) => {
    if (isTest) return;
    try {
      const { getActiveMobileFirestore } = await import('./firebase');
      const activeDb = await getActiveMobileFirestore();
      const docRef = doc(activeDb, 'system_config', 'warranty_config');
      return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setLocalData('mobile_warranty_config', data);
          callback(data);
        }
      });
    } catch {
      return () => {};
    }
  });
  return () => {};
}

