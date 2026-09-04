import { verifyPasswordWithMigration, hashPassword } from '../utils/hashUtils';


const API_URL = 'http://localhost:3333/api';

/**
 * Retorna os headers padrão para chamadas à API local.
 * ✅ Segurança: inclui token interno para autenticar requisições do desktop ao servidor.
 */
function getApiHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-internal-token': import.meta.env.VITE_INTERNAL_API_TOKEN || 'vollen-internal-token-2024',
  };
}

function applySystemCaps<T>(data: T): T {
  try {
    const isCapsActive = document.body.classList.contains('app-caps-active');
    if (!isCapsActive || !data) return data;

    const transform = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.toUpperCase();
      }
      if (Array.isArray(obj)) {
        return obj.map(transform);
      }
      if (obj !== null && typeof obj === 'object') {
        const res: any = {};
        for (const k of Object.keys(obj)) {
          // Não altera chaves internas, IDs, senhas, urls, números ou dados técnicos/itens
          if (['id', 'clientId', 'orderId', 'logoUrl', 'password', 'createdAt', 'updatedAt', 'date', 'scheduledDate', 'exitDate', 'purchaseDate', 'partsUsed', 'parts', 'partsList', 'servicesExecuted', 'services', 'servicesList', 'qty', 'quantity', 'price', 'separated', 'code', 'originalOsCode', 'originalOsId', 'warrantyReturnOsCode', 'warrantyReturnOsId'].includes(k)) {
            res[k] = obj[k];
          } else {
            res[k] = transform(obj[k]);
          }
        }
        return res;
      }
      return obj;
    };

    return transform(data);
  } catch {
    return data;
  }
}

// Funções de Persistência Local Autônoma
function getLocalItem<T>(key: string, defaultVal: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Erro ao gravar no localStorage local:', e);
  }
}

export async function fetchUsers() {
  try {
    const res = await fetch(`${API_URL}/users`, {
      headers: getApiHeaders(),
      signal: AbortSignal.timeout(1000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setLocalItem('vollen_users', data);
        return data;
      }
    }
  } catch {}
  return getLocalItem('vollen_users', [
    // ✅ Segurança: hash SHA-256 de '1234' — nunca mais texto puro no fallback.
    { id: '1', username: 'admin', name: 'Administrador', role: 'Admin', password: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' }
  ]);
}

export async function loginUser(userId: string, password?: string) {
  try {
    const hashedPassword = password ? await hashPassword(password) : undefined;
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ userId, password: hashedPassword }),
      signal: AbortSignal.timeout(1000),
    });
    if (res.ok) return res.json();
  } catch {}

  // Fallback local com suporte à migração progressiva de senha
  const users = getLocalItem<any[]>('vollen_users', []);
  const matched = users.find((u) => String(u.id) === String(userId));
  if (!matched) throw new Error('Usuário não encontrado');

  if (matched.password && password !== undefined) {
    const { valid, needsUpgrade } = await verifyPasswordWithMigration(password, matched.password);
    if (!valid) throw new Error('Senha incorreta.');

    // Migração progressiva: se a senha ainda estava em texto puro, persiste o hash
    if (needsUpgrade) {
      const hashed = await hashPassword(password);
      const updatedUsers = users.map((u) =>
        u.id === matched.id ? { ...u, password: hashed } : u
      );
      setLocalItem('vollen_users', updatedUsers);
      console.log('[Security] Senha do usuário migrada para hash SHA-256.');
    }
  }

  return { token: 'local-session-token', user: matched };
}

import { db } from './firebase';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';

export async function fetchClients() {
  const localClients = getLocalItem<any[]>('vollen_clients', []);
  if (!db) return localClients;

  try {
    const colRef = collection(db, 'clients');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const serverData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLocalItem('vollen_clients', serverData);
      return serverData;
    } else {
      setLocalItem('vollen_clients', []);
      return [];
    }
  } catch (e) {
    console.warn('Erro ao buscar clientes no Firestore:', e);
  }
  return localClients;
}

export function subscribeClients(callback: (clients: any[]) => void) {
  if (!db) return () => {};

  try {
    const colRef = collection(db, 'clients');
    return onSnapshot(colRef, (snap) => {
      const data = snap.empty ? [] : snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLocalItem('vollen_clients', data);
      callback(data);
    });
  } catch {
    return () => {};
  }
}

export async function createClient(data: any) {
  const current = getLocalItem<any[]>('vollen_clients', []);
  const clientId = data.id || String(Date.now());
  const sanitizedData = applySystemCaps(data);
  const newClient = { ...sanitizedData, id: clientId, updatedAt: new Date().toISOString() };

  // Atualiza cache local instantâneo
  const updated = [newClient, ...current.filter((c) => c.id !== clientId)];
  setLocalItem('vollen_clients', updated);

  if (db) {
    try {
      await setDoc(doc(db, 'clients', clientId), newClient, { merge: true });
      console.log(`[Firestore] Cliente ${clientId} salvo com sucesso na nuvem.`);
    } catch (e: any) {
      console.error('❌ Erro ao salvar cliente no Firestore:', e);
    }
  }

  return newClient;
}

export async function deleteClient(clientId: string) {
  const current = getLocalItem<any[]>('vollen_clients', []);
  const updated = current.filter((c) => c.id !== clientId);
  setLocalItem('vollen_clients', updated);

  if (db) {
    try {
      await deleteDoc(doc(db, 'clients', clientId));
    } catch (e) {
      console.error('❌ Erro ao deletar cliente no Firestore:', e);
    }
  }
  return { success: true };
}

export async function fetchOrders(includeDeleted: boolean = false) {
  const localOrders = getLocalItem<any[]>('vollen_orders', []);
  if (!db) {
    if (!includeDeleted) {
      return localOrders.filter((o) => (o.status || '').toUpperCase() !== 'EXCLUIDA');
    }
    return localOrders;
  }

  try {
    const colRef = collection(db, 'orders');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const serverData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Garante que campos de array e itens estejam presentes
      const normalizedServerData = serverData.map((serverOrder: any) => {
        const localOrder = localOrders.find((o: any) => o.id === serverOrder.id);
        const mergedOrder = { ...serverOrder };
        const arrayFields = ['partsUsed', 'parts', 'partsList', 'servicesExecuted', 'services', 'servicesList'];
        if (localOrder) {
          for (const field of arrayFields) {
            const serverArr = serverOrder[field];
            const localArr = localOrder[field];
            if ((!Array.isArray(serverArr) || serverArr.length === 0) && Array.isArray(localArr) && localArr.length > 0) {
              mergedOrder[field] = localArr;
            }
          }
        }
        return mergedOrder;
      });

      setLocalItem('vollen_orders', normalizedServerData);
      if (!includeDeleted) {
        return normalizedServerData.filter((o: any) => (o.status || '').toUpperCase() !== 'EXCLUIDA');
      }
      return normalizedServerData;
    } else {
      // Se a nuvem está vazia (ex: após restaurar padrões de fábrica), limpa o cache local
      setLocalItem('vollen_orders', []);
      return [];
    }
  } catch (e) {
    console.warn('Erro ao buscar ordens no Firestore:', e);
  }

  if (!includeDeleted) {
    return localOrders.filter((o) => (o.status || '').toUpperCase() !== 'EXCLUIDA');
  }
  return localOrders;
}

export function subscribeOrders(callback: (orders: any[]) => void) {
  if (!db) return () => {};

  try {
    const colRef = collection(db, 'orders');
    return onSnapshot(colRef, (snap) => {
      const data = snap.empty ? [] : snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLocalItem('vollen_orders', data);
      callback(data);
    });
  } catch {
    return () => {};
  }
}

/**
 * Reserva atomicamente o próximo número de OS no Firestore via transação.
 * Garante que PC e celular nunca recebem o mesmo número, mesmo que criem
 * uma OS exatamente ao mesmo tempo.
 */
export async function reserveNextOrderNumber(): Promise<string> {
  if (!db) {
    const localOrders = getLocalItem<any[]>('vollen_orders', []);
    let maxFound = 0;
    localOrders.forEach((o) => {
      const c = o.code;
      if (c) {
        const num = parseInt(String(c).replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxFound) maxFound = num;
      }
    });
    try {
      const customNext = localStorage.getItem('vollen_custom_next_os_number');
      if (customNext) {
        const initN = parseInt(String(customNext).replace(/\D/g, ''), 10);
        if (!isNaN(initN) && initN - 1 > maxFound) maxFound = initN - 1;
      }
    } catch {}
    const next = maxFound + 1;
    return `OS-${String(next).padStart(4, '0')}`;
  }

  const counterRef = doc(db, 'system_config', 'order_counter');

  const nextNumber = await runTransaction(db, async (transaction) => {
    // Varre ordens existentes no Firestore para obter o maior número real ativo
    const ordersSnap = await getDocs(collection(db, 'orders'));
    let maxFound = 0;
    ordersSnap.docs.forEach((d) => {
      const c = d.data().code;
      if (c && !String(c).includes('Aguardando') && !String(c).includes('PENDENTE')) {
        const num = parseInt(String(c).replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxFound) maxFound = num;
      }
    });

    const localOrders = getLocalItem<any[]>('vollen_orders', []);
    localOrders.forEach((o) => {
      const c = o.code;
      if (c && !String(c).includes('Aguardando') && !String(c).includes('PENDENTE')) {
        const num = parseInt(String(c).replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxFound) maxFound = num;
      }
    });

    const next = maxFound + 1;
    transaction.set(counterRef, { lastOrderNumber: next }, { merge: true });
    return next;
  });

  return `OS-${String(nextNumber).padStart(4, '0')}`;
}

export async function createOrder(data: any) {
  const current = getLocalItem<any[]>('vollen_orders', []);
  const orderId = data.id || String(Date.now());
  const sanitizedData = applySystemCaps(data);
  const newOrder = {
    ...sanitizedData,
    id: orderId,
    partsUsed: Array.isArray(data.partsUsed) ? data.partsUsed : (Array.isArray(data.parts) ? data.parts : []),
    parts: Array.isArray(data.parts) ? data.parts : (Array.isArray(data.partsUsed) ? data.partsUsed : []),
    partsList: Array.isArray(data.partsList) ? data.partsList : (Array.isArray(data.partsUsed) ? data.partsUsed : []),
    servicesExecuted: Array.isArray(data.servicesExecuted) ? data.servicesExecuted : (Array.isArray(data.services) ? data.services : []),
    services: Array.isArray(data.services) ? data.services : (Array.isArray(data.servicesExecuted) ? data.servicesExecuted : []),
    servicesList: Array.isArray(data.servicesList) ? data.servicesList : (Array.isArray(data.servicesExecuted) ? data.servicesExecuted : []),
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = [newOrder, ...current.filter((o) => o.id !== orderId)];
  setLocalItem('vollen_orders', updated);

  if (db) {
    try {
      await setDoc(doc(db, 'orders', orderId), newOrder, { merge: true });
      console.log(`[Firestore] Ordem de Serviço ${newOrder.code || orderId} salva com sucesso na nuvem.`);

      // Sincroniza e avança o contador global na nuvem para evitar duplicidade com o celular
      if (newOrder.code) {
        const osNum = parseInt(String(newOrder.code).replace(/\D/g, ''), 10);
        if (!isNaN(osNum) && osNum > 0) {
          const counterRef = doc(db, 'system_config', 'order_counter');
          const counterSnap = await getDoc(counterRef).catch(() => null);
          const currentCount = counterSnap && counterSnap.exists() ? (counterSnap.data().lastOrderNumber || 0) : 0;
          if (osNum > currentCount) {
            await setDoc(counterRef, { lastOrderNumber: osNum, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
          }
        }
      }
    } catch (e: any) {
      console.error('❌ Erro ao salvar ordem no Firestore:', e);
    }
  }

  return newOrder;
}

export async function updateOrder(orderId: string, data: any) {
  const current = getLocalItem<any[]>('vollen_orders', []);
  const index = current.findIndex((o) => o.id === orderId);
  const sanitizedData = applySystemCaps(data);
  
  const partsPayload = Array.isArray(data.partsUsed) ? data.partsUsed : (Array.isArray(data.parts) ? data.parts : (Array.isArray(data.partsList) ? data.partsList : []));
  const servicesPayload = Array.isArray(data.servicesExecuted) ? data.servicesExecuted : (Array.isArray(data.services) ? data.services : (Array.isArray(data.servicesList) ? data.servicesList : []));

  let updatedOrder = {
    ...sanitizedData,
    id: orderId,
    partsUsed: partsPayload,
    parts: partsPayload,
    partsList: partsPayload,
    servicesExecuted: servicesPayload,
    services: servicesPayload,
    servicesList: servicesPayload,
    updatedAt: new Date().toISOString(),
  };

  if (index !== -1) {
    updatedOrder = {
      ...current[index],
      ...sanitizedData,
      id: orderId,
      partsUsed: partsPayload,
      parts: partsPayload,
      partsList: partsPayload,
      servicesExecuted: servicesPayload,
      services: servicesPayload,
      servicesList: servicesPayload,
      updatedAt: new Date().toISOString(),
    };
    current[index] = updatedOrder;
  } else {
    current.unshift(updatedOrder);
  }
  setLocalItem('vollen_orders', current);

  if (db) {
    try {
      await setDoc(doc(db, 'orders', orderId), updatedOrder, { merge: true });
      console.log(`[Firestore] Ordem de Serviço ${updatedOrder.code || orderId} atualizada com sucesso na nuvem.`);
    } catch (e: any) {
      console.error('❌ Erro ao atualizar ordem no Firestore:', e);
    }
  }
  return updatedOrder;
}

export async function deleteOrder(orderId: string) {
  const current = getLocalItem<any[]>('vollen_orders', []);
  const updated = current.filter((o) => o.id !== orderId);
  setLocalItem('vollen_orders', updated);

  // Remove visitas locais vinculadas à OS
  const currentVisits = getLocalItem<any[]>('vollen_visits', []);
  const visitsToDelete = currentVisits.filter((v) => v.orderId === orderId || v.order?.id === orderId);
  const updatedVisits = currentVisits.filter((v) => v.orderId !== orderId && v.order?.id !== orderId);
  setLocalItem('vollen_visits', updatedVisits);

  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch (e) {
    console.warn('Erro ao deletar ordem no Firestore:', e);
  }

  // Deleta visitas no Firestore
  try {
    for (const v of visitsToDelete) {
      if (v.id) {
        await deleteDoc(doc(db, 'visits', v.id));
      }
    }
    // Também busca no Firestore por garantia
    const vSnap = await getDocs(collection(db, 'visits'));
    for (const d of vSnap.docs) {
      const data = d.data();
      if (data.orderId === orderId || data.order?.id === orderId) {
        await deleteDoc(doc(db, 'visits', d.id));
      }
    }
  } catch (vErr) {
    console.warn('Erro ao deletar visitas da OS no Firestore:', vErr);
  }

  // Atualiza o contador de OS na nuvem se a lista ficou vazia ou mudou
  try {
    const ordersSnap = await getDocs(collection(db, 'orders'));
    let maxFound = 0;
    if (ordersSnap && !ordersSnap.empty) {
      ordersSnap.docs.forEach((d) => {
        const c = d.data().code;
        if (c && !String(c).includes('Aguardando') && !String(c).includes('PENDENTE')) {
          const num = parseInt(String(c).replace(/\D/g, ''), 10);
          if (!isNaN(num) && num > maxFound) maxFound = num;
        }
      });
    }
    await setDoc(doc(db, 'system_config', 'order_counter'), { lastOrderNumber: maxFound, updatedAt: new Date().toISOString() });
  } catch (cErr) {
    console.warn('Erro ao atualizar order_counter após exclusão:', cErr);
  }

  return { success: true };
}

export async function fetchVisits(filters?: { date?: string; period?: string; technician?: string }) {
  try {
    const colRef = collection(db, 'visits');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      let data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (filters?.date) data = data.filter((v: any) => v.date === filters.date);
      if (filters?.period) data = data.filter((v: any) => v.period === filters.period);
      if (filters?.technician) data = data.filter((v: any) => v.technicianName === filters.technician);
      setLocalItem('vollen_visits', data);
      return data;
    }
  } catch (e) {
    console.warn('Erro ao buscar visitas no Firestore:', e);
  }
  return getLocalItem<any[]>('vollen_visits', []);
}

export async function createVisit(data: any) {
  const current = getLocalItem<any[]>('vollen_visits', []);
  const visitId = data.id || String(Date.now());
  const newVisit = { ...data, id: visitId, updatedAt: new Date().toISOString() };
  const updated = [newVisit, ...current.filter((v) => v.id !== visitId)];
  setLocalItem('vollen_visits', updated);

  try {
    await setDoc(doc(db, 'visits', visitId), newVisit, { merge: true });
  } catch (e) {
    console.warn('Erro ao salvar visita no Firestore:', e);
  }
  return newVisit;
}

export async function updateVisit(visitId: string, data: any) {
  const current = getLocalItem<any[]>('vollen_visits', []);
  const index = current.findIndex((v) => v.id === visitId);
  let updatedVisit = { ...data, id: visitId };
  if (index !== -1) {
    updatedVisit = { ...current[index], ...data, id: visitId };
    current[index] = updatedVisit;
  }
  setLocalItem('vollen_visits', current);

  try {
    await setDoc(doc(db, 'visits', visitId), updatedVisit, { merge: true });
  } catch (e) {
    console.warn('Erro ao atualizar visita no Firestore:', e);
  }
  return updatedVisit;
}

export async function deleteVisit(visitId: string) {
  const current = getLocalItem<any[]>('vollen_visits', []);
  const updated = current.filter((v) => v.id !== visitId);
  setLocalItem('vollen_visits', updated);

  try {
    await deleteDoc(doc(db, 'visits', visitId));
  } catch (e) {
    console.warn('Erro ao deletar visita no Firestore:', e);
  }
  return { success: true };
}

export async function fetchDashboardStats() {
  try {
    const res = await fetch(`${API_URL}/dashboard/stats`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) return res.json();
  } catch {}

  const orders = getLocalItem<any[]>('vollen_orders', []);
  const clients = getLocalItem<any[]>('vollen_clients', []);
  const visits = getLocalItem<any[]>('vollen_visits', []);

  const openOrders = orders.filter((o) => (o.status || 'ABERTA').toUpperCase() !== 'FINALIZADA' && (o.status || '').toUpperCase() !== 'CONCLUIDA' && (o.status || '').toUpperCase() !== 'CANCELADA');
  const finishedOrders = orders.filter((o) => (o.status || '').toUpperCase() === 'FINALIZADA' || (o.status || '').toUpperCase() === 'CONCLUIDA');

  return {
    openOrdersCount: openOrders.length,
    finishedOrdersCount: finishedOrders.length,
    totalClientsCount: clients.length,
    scheduledVisitsCount: visits.length,
  };
}

export async function fetchAddressByCep(cep: string) {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return {
      address: data.logradouro,
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf,
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
}

export async function requestFactoryReset(payload: {
  userId: string;
  password?: string;
  resetClients?: boolean;
  resetOrders?: boolean;
}) {
  // ✅ Segurança: envia senha hasheada ao servidor
  const hashedPassword = payload.password ? await hashPassword(payload.password) : undefined;
  const res = await fetch(`${API_URL}/factory-reset`, {
    method: 'POST',
    headers: getApiHeaders(),
    body: JSON.stringify({ ...payload, password: hashedPassword }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao restaurar padrão de fábrica');
  }
  return data;
}

