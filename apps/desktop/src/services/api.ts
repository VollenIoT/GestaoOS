const API_URL = 'http://localhost:3333/api';

// Função utilitária para converter todos os textos para CAIXA ALTA se o CAPS estiver ativo
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
    const res = await fetch(`${API_URL}/users`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setLocalItem('vollen_users', data);
        return data;
      }
    }
  } catch {}
  return getLocalItem('vollen_users', [
    { id: '1', username: 'admin', name: 'Administrador', role: 'Admin', password: '1234' }
  ]);
}

export async function loginUser(userId: string, password?: string) {
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
      signal: AbortSignal.timeout(1000),
    });
    if (res.ok) return res.json();
  } catch {}

  const users = getLocalItem<any[]>('vollen_users', []);
  const matched = users.find((u) => String(u.id) === String(userId));
  if (!matched) throw new Error('Usuário não encontrado');
  if (matched.password && matched.password !== password) {
    throw new Error('Senha incorreta.');
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
  try {
    const colRef = collection(db, 'clients');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const serverData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLocalItem('vollen_clients', serverData);
      return serverData;
    }
  } catch (e) {
    console.warn('Erro ao buscar clientes no Firestore:', e);
  }
  return localClients;
}

export function subscribeClients(callback: (clients: any[]) => void) {
  try {
    const colRef = collection(db, 'clients');
    return onSnapshot(colRef, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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

  try {
    await setDoc(doc(db, 'clients', clientId), newClient, { merge: true });
  } catch (e) {
    console.warn('Erro ao salvar cliente no Firestore:', e);
  }

  return newClient;
}

export async function deleteClient(clientId: string) {
  const current = getLocalItem<any[]>('vollen_clients', []);
  const updated = current.filter((c) => c.id !== clientId);
  setLocalItem('vollen_clients', updated);

  try {
    await deleteDoc(doc(db, 'clients', clientId));
  } catch (e) {
    console.warn('Erro ao deletar cliente no Firestore:', e);
  }
  return { success: true };
}

export async function fetchOrders(includeDeleted: boolean = false) {
  const localOrders = getLocalItem<any[]>('vollen_orders', []);
  try {
    const colRef = collection(db, 'orders');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const serverData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // MERGE INTELIGENTE: preserva a versão local se ela for mais recente que a do servidor.
      // Isso evita que writes recentes do usuário sejam sobrescritos por dados antigos do Firestore.
      const localMap = new Map(localOrders.map((o: any) => [o.id, o]));
      const merged = serverData.map((serverOrder: any) => {
        const localOrder = localMap.get(serverOrder.id);
        if (localOrder && localOrder.updatedAt && serverOrder.updatedAt) {
          // Se a versão local é mais recente, mantém a local
          if (localOrder.updatedAt > serverOrder.updatedAt) return localOrder;
        }
        // Garante que campos de arrays não sejam perdidos (fallback para local se servidor veio vazio)
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

      // Inclui OS que existem só no local (criadas recentemente e ainda não sincronizadas)
      const serverIds = new Set(serverData.map((o: any) => o.id));
      const localOnly = localOrders.filter((lo: any) => !serverIds.has(lo.id));
      const finalData = [...localOnly, ...merged];

      setLocalItem('vollen_orders', finalData);
      if (!includeDeleted) {
        return finalData.filter((o: any) => (o.status || '').toUpperCase() !== 'EXCLUIDA');
      }
      return finalData;
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
  try {
    const colRef = collection(db, 'orders');
    return onSnapshot(colRef, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  const counterRef = doc(db, 'system_config', 'order_counter');

  const nextNumber = await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);

    let next: number;
    if (counterSnap.exists()) {
      next = (counterSnap.data().lastOrderNumber || 0) + 1;
    } else {
      // Primeira vez: varre ordens existentes para não sobrescrever números já usados
      const ordersSnap = await getDocs(collection(db, 'orders'));
      let maxFound = 0;
      ordersSnap.docs.forEach((d) => {
        const c = d.data().code;
        if (c) {
          const num = parseInt(String(c).replace(/\D/g, ''), 10);
          if (!isNaN(num) && num > maxFound) maxFound = num;
        }
      });
      // Também considera preferência de número inicial do localStorage
      try {
        const customNext = localStorage.getItem('vollen_custom_next_os_number');
        if (customNext) {
          const initN = parseInt(String(customNext).replace(/\D/g, ''), 10);
          if (!isNaN(initN) && initN - 1 > maxFound) maxFound = initN - 1;
        }
      } catch {}
      next = maxFound + 1;
    }

    // Reserva atomicamente — outra transação simultânea falhará e será repetida
    // com o próximo valor, eliminando completamente a chance de duplicidade
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

  try {
    await setDoc(doc(db, 'orders', orderId), newOrder, { merge: true });
  } catch (e) {
    console.warn('Erro ao salvar ordem no Firestore:', e);
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

  try {
    await setDoc(doc(db, 'orders', orderId), updatedOrder, { merge: true });
  } catch (e) {
    console.warn('Erro ao atualizar ordem no Firestore:', e);
  }
  return updatedOrder;
}

export async function deleteOrder(orderId: string) {
  const current = getLocalItem<any[]>('vollen_orders', []);
  const updated = current.filter((o) => o.id !== orderId);
  setLocalItem('vollen_orders', updated);

  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch (e) {
    console.warn('Erro ao deletar ordem no Firestore:', e);
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
  const res = await fetch(`${API_URL}/factory-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao restaurar padrão de fábrica');
  }
  return data;
}

