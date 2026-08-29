import AsyncStorage from '@react-native-async-storage/async-storage';

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
  await setLocalData('mobile_linked_company', payload);
  if (payload.companyName) {
    await setLocalData('mobile_company_data', {
      name: payload.companyName,
      tradingName: payload.companyName,
      cnpj: payload.cnpj || '',
      phone: payload.phone || '',
      logoUrl: payload.logoUrl || '',
    });
  }
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
  await setLocalData('mobile_auth_user', testUser);
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

import { db } from './firebase';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';

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
    const [usersSnap, techsSnap] = await Promise.all([
      getDocs(collection(db, 'users')).catch(() => null),
      getDocs(collection(db, 'technicians')).catch(() => null),
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
  // Em modo de teste, retorna dados neutros sem consultar o Firestore
  const isTest = await isTestModeMobile();
  if (isTest) {
    return TEST_MODE_COMPANY;
  }

  const local = await getLocalData<any>('mobile_company_data', DEFAULT_COMPANY_MOBILE);
  try {
    const compRef = doc(db, 'system_config', 'company_data');
    const snap = await getDoc(compRef);
    if (snap.exists()) {
      const data = snap.data();
      await setLocalData('mobile_company_data', data);
      return data;
    }
  } catch (err) {
    console.warn('Erro ao buscar dados da empresa no Firestore mobile:', err);
  }
  return local;
}

export function subscribeCompanyDataMobile(callback: (company: any) => void) {
  // Em modo de teste, não se inscreve no Firestore da empresa
  isTestModeMobile().then((isTest) => {
    if (isTest) return;
    try {
      const compRef = doc(db, 'system_config', 'company_data');
      onSnapshot(compRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setLocalData('mobile_company_data', data);
          callback(data);
        }
      });
    } catch {
      // silencioso
    }
  });
  return () => {};
}

// 1. ORDENS DE SERVIÇO (OS)
export async function fetchOrdersMobile(): Promise<any[]> {
  const local = await getLocalData<any[]>('mobile_orders', []);
  const testMode = await isTestModeMobile();
  if (testMode) {
    return local;
  }

  try {
    const colRef = collection(db, 'orders');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const serverOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await setLocalData('mobile_orders', serverOrders);
      return serverOrders;
    }
  } catch (err) {
    console.warn('Erro ao buscar ordens no Firestore mobile:', err);
  }
  return local;
}

export function subscribeOrdersMobile(callback: (orders: any[]) => void) {
  getLocalData<any | null>('mobile_linked_company', null).then((linked) => {
    if (linked?.isTestMode) {
      // Modo de teste não escuta o Firestore da empresa
      return () => {};
    }
    try {
      const colRef = collection(db, 'orders');
      return onSnapshot(colRef, (snap) => {
        const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLocalData('mobile_orders', orders);
        callback(orders);
      });
    } catch {
      return () => {};
    }
  });
  return () => {};
}

export async function saveOrderMobile(orderData: any): Promise<any> {
  const local = await getLocalData<any[]>('mobile_orders', []);
  const orderId = orderData.id || `MOB-OS-${Date.now()}`;
  
  let orderCode = orderData.code;

  // Se já tem código definitivo (ex: OS-0005), mantém
  const isPendingCode = !orderCode || orderCode === 'Aguardando Rede...' || orderCode.startsWith('PENDENTE');
  const isTestMode = await isTestModeMobile();
  if (isTestMode) {
    if (isPendingCode) {
      orderCode = `OS-TEST-${String(local.length + 1).padStart(4, '0')}`;
    }
  } else if (isPendingCode) {
    try {
      // Obtenção sequencial e reserva do número de OS sincronizada com o PC
      const counterRef = doc(db, 'system_config', 'order_counter');
      const counterSnap = await getDoc(counterRef);
      let nextNumber = 1;

      if (counterSnap.exists()) {
        const currentCount = counterSnap.data().lastOrderNumber || 0;
        nextNumber = currentCount + 1;
      } else {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        let maxFound = 0;
        ordersSnap.docs.forEach((d) => {
          const c = d.data().code;
          if (c) {
            const num = parseInt(String(c).replace(/\D/g, ''), 10);
            if (!isNaN(num) && num > maxFound) maxFound = num;
          }
        });
        nextNumber = maxFound + 1;
      }

      await setDoc(counterRef, { lastOrderNumber: nextNumber }, { merge: true });
      orderCode = `OS-${String(nextNumber).padStart(4, '0')}`;
    } catch (netErr) {
      console.warn('Dispositivo sem rede ou falha de conexão. OS salva localmente aguardando conexão:', netErr);
      orderCode = 'Aguardando Rede...';
    }
  }

  const finalOrder = {
    ...orderData,
    id: orderId,
    code: orderCode,
    isPendingSync: !isTestMode && orderCode === 'Aguardando Rede...',
    updatedAt: new Date().toISOString(),
    createdAt: orderData.createdAt || new Date().toISOString(),
  };

  const updatedList = [finalOrder, ...local.filter((o) => o.id !== orderId)];
  await setLocalData('mobile_orders', updatedList);

  // Se tiver conexão e NÃO for modo de teste, salva e sincroniza na nuvem
  if (!isTestMode && !finalOrder.isPendingSync) {
    try {
      // Sanitiza campos undefined para evitar erros de serialização do Firestore
      const sanitizedOrder = JSON.parse(JSON.stringify(finalOrder));
      await setDoc(doc(db, 'orders', orderId), sanitizedOrder, { merge: true });
    } catch (err) {
      console.warn('Erro ao sincronizar OS no Firestore mobile:', err);
    }
  }

  return finalOrder;
}

// Sincronizador automático de OS pendentes quando a rede voltar
export async function syncPendingOrdersMobile(): Promise<void> {
  const local = await getLocalData<any[]>('mobile_orders', []);
  const pending = local.filter((o) => o.isPendingSync || o.code === 'Aguardando Rede...' || !o.code);

  if (pending.length === 0) return;

  for (const pOrder of pending) {
    try {
      await saveOrderMobile({ ...pOrder, code: undefined });
    } catch (err) {
      console.warn('Tentativa de sincronizar OS pendente falhou (ainda sem rede):', err);
    }
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
    const colRef = collection(db, 'clients');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const serverClients = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await setLocalData('mobile_clients', serverClients);
      return serverClients;
    }
  } catch (err) {
    console.warn('Erro ao buscar clientes no Firestore mobile:', err);
  }
  return local;
}

export function subscribeClientsMobile(callback: (clients: any[]) => void) {
  getLocalData<any | null>('mobile_linked_company', null).then((linked) => {
    if (linked?.isTestMode) {
      return () => {};
    }
    try {
      const colRef = collection(db, 'clients');
      return onSnapshot(colRef, (snap) => {
        const clients = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLocalData('mobile_clients', clients);
        callback(clients);
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
      // Se não for teste, atualiza também as OS modificadas no Firestore
      const isTest = await isTestModeMobile();
      if (!isTest) {
        for (const ord of updatedOrders) {
          if (ord.clientId === clientId || ord.client?.id === clientId) {
            setDoc(doc(db, 'orders', ord.id), ord, { merge: true }).catch(() => {});
          }
        }
      }
    }
  } catch (syncErr) {
    console.warn('Erro ao propagar dados do cliente para as OS vinculadas:', syncErr);
  }

  const isTest = await isTestModeMobile();
  if (!isTest) {
    try {
      await setDoc(doc(db, 'clients', clientId), finalClient, { merge: true });
    } catch (err) {
      console.warn('Erro ao salvar cliente no Firestore mobile:', err);
    }
  }

  return finalClient;
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
    await setDoc(doc(db, 'estimates', id), finalEst, { merge: true });
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

  try {
    const colRef = collection(db, 'equipments');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const serverEquips = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await setLocalData('mobile_equipments', serverEquips);
      return serverEquips;
    }
  } catch (err) {
    console.warn('Erro ao buscar equipamentos do Firestore:', err);
  }
  return getLocalData<any[]>('mobile_equipments', DEFAULT_EQUIPMENTS_PC);
}

export async function fetchPartsMobile(): Promise<any[]> {
  const isTest = await isTestModeMobile();
  if (isTest) {
    return getLocalData<any[]>('mobile_parts', DEFAULT_PARTS_PC);
  }

  try {
    const colRef = collection(db, 'parts');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const serverParts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await setLocalData('mobile_parts', serverParts);
      return serverParts;
    }
  } catch (err) {
    console.warn('Erro ao buscar peças do Firestore:', err);
  }
  return getLocalData<any[]>('mobile_parts', DEFAULT_PARTS_PC);
}

export async function fetchServicesMobile(): Promise<any[]> {
  const isTest = await isTestModeMobile();
  if (isTest) {
    return getLocalData<any[]>('mobile_services', DEFAULT_SERVICES_PC);
  }

  try {
    const colRef = collection(db, 'services');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const serverServices = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await setLocalData('mobile_services', serverServices);
      return serverServices;
    }
  } catch (err) {
    console.warn('Erro ao buscar serviços do Firestore:', err);
  }
  return getLocalData<any[]>('mobile_services', DEFAULT_SERVICES_PC);
}

export async function fetchTechniciansMobile(): Promise<any[]> {
  const isTest = await isTestModeMobile();
  if (isTest) {
    return [
      { id: 'tech-test-demo', name: 'TÉCNICO DE DEMONSTRAÇÃO', username: 'tecnico_demo', role: 'Admin' }
    ];
  }

  try {
    const colRef = collection(db, 'users');
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
    const colRef = collection(db, 'os_statuses');
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
        await setDoc(doc(db, 'parts', String(matched.id)), { stockQuantity: newStock }, { merge: true });
      }
    }
    await setLocalData('mobile_parts', currentParts);
  } catch (err) {
    console.warn('Erro ao dar baixa no estoque:', err);
  }
  return insufficient;
}

/** Devolve peças ao estoque (soma qty de volta). Usado ao cancelar OS ou remover peças. */
export async function restoreStockForOrder(parts: any[]): Promise<void> {
  if (!parts || parts.length === 0) return;
  try {
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
        await setDoc(doc(db, 'parts', String(matched.id)), { stockQuantity: matched.stockQuantity }, { merge: true });
      }
    }
    await setLocalData('mobile_parts', currentParts);
  } catch (err) {
    console.warn('Erro ao restaurar estoque:', err);
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
    const colRef = collection(db, 'visits');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      serverVisits = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  } catch (err) {
    console.warn('Erro ao buscar visitas diretas no Firestore:', err);
  }

  // Agrupa ordens com tipo AGENDAMENTO ou status VISITA_TECNICA
  const scheduleOrders = orders.filter((o) => {
    const isScheduleType = (o.type || '').toUpperCase() === 'AGENDAMENTO' || (o.status || '').toUpperCase() === 'VISITA_TECNICA';
    return isScheduleType;
  });

  // Mapeia todas as visitas sincronizadas
  const allVisitsMap = new Map<string, any>();

  // 1. Prioriza visitas da coleção 'visits'
  serverVisits.forEach((v) => {
    const matchingOrder = orders.find((o) => o.id === v.orderId || o.code === v.orderId || o.code === v.orderCode);
    const key = v.id || v.orderId || matchingOrder?.id;
    if (!key) return;

    const assignedTech = (v.technicianName || v.technician || matchingOrder?.technician || matchingOrder?.technicianName || '').trim();
    const effectiveDate = v.date || v.scheduledDate || matchingOrder?.scheduledDate || (matchingOrder?.createdAt ? matchingOrder.createdAt.split('T')[0] : '');

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
      servicePerformed: matchingOrder?.servicePerformed || matchingOrder?.executedService || v.servicePerformed || '',
      services: matchingOrder?.services || matchingOrder?.servicesExecuted || v.services || [],
      parts: matchingOrder?.parts || matchingOrder?.partsUsed || v.parts || [],
      status: v.status || matchingOrder?.status || 'AGENDADA',
      period: v.period || matchingOrder?.period || 'MANHA',
      date: effectiveDate,
      scheduledDate: effectiveDate,
      technicianName: assignedTech,
      notes: v.notes || matchingOrder?.technicalReport || '',
    });
  });

  // 2. Adiciona ordens do tipo AGENDAMENTO que ainda não tenham documento na coleção visits
  scheduleOrders.forEach((o) => {
    // Verifica se a ordem já está no mapa (tanto pela chave = o.id quanto por orderId dentro dos valores)
    const alreadyInMap = allVisitsMap.has(o.id) || Array.from(allVisitsMap.values()).some((v) => v.orderId === o.id);
    if (!alreadyInMap) {
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
        servicePerformed: o.servicePerformed || o.executedService || '',
        services: o.services || o.servicesExecuted || [],
        parts: o.parts || o.partsUsed || [],
        status: o.status || 'AGENDADA',
        period: o.period || 'MANHA',
        date: effectiveDate,
        scheduledDate: effectiveDate,
        technicianName: assignedTech,
        notes: o.technicalReport || '',
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
    await setDoc(doc(db, 'parts', partId), finalPart, { merge: true });
  } catch (e) {}
  return finalPart;
}

export async function deletePartMobile(partId: string): Promise<void> {
  const parts = await fetchPartsMobile();
  const updated = parts.filter((p) => p.id !== partId);
  await setLocalData('mobile_parts', updated);
  try {
    await setDoc(doc(db, 'parts', partId), { isDeleted: true }, { merge: true });
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
    await setDoc(doc(db, 'equipments', eqId), finalEq, { merge: true });
  } catch (e) {}
  return finalEq;
}

export async function deleteEquipmentMobile(eqId: string): Promise<void> {
  const equips = await fetchEquipmentsMobile();
  const updated = equips.filter((e) => e.id !== eqId);
  await setLocalData('mobile_equipments', updated);
  try {
    await setDoc(doc(db, 'equipments', eqId), { isDeleted: true }, { merge: true });
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
    await setDoc(doc(db, 'services', srvId), finalSrv, { merge: true });
  } catch (e) {}
  return finalSrv;
}

export async function deleteServiceMobile(srvId: string): Promise<void> {
  const srvs = await fetchServicesMobile();
  const updated = srvs.filter((s) => s.id !== srvId);
  await setLocalData('mobile_services', updated);
  try {
    await setDoc(doc(db, 'services', srvId), { isDeleted: true }, { merge: true });
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
  try {
    const docRef = doc(db, 'system_config', 'os_preferences');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      await setLocalData('mobile_os_preferences', data);
      return data;
    }
  } catch (err) {
    console.warn('Erro ao carregar preferências de OS no mobile:', err);
  }
  return getLocalData<any>('mobile_os_preferences', {
    entryReceiptTemplate: 'DEFAULT_2VIAS',
    exitReceiptTemplate: 'MODERN_DETAILED',
  });
}

export function subscribeOSPreferencesMobile(callback: (data: any) => void) {
  try {
    const docRef = doc(db, 'system_config', 'os_preferences');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLocalData('mobile_os_preferences', data);
        callback(data);
      }
    });
  } catch (err) {
    return () => {};
  }
}
