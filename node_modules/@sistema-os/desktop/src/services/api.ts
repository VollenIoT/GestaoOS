const API_URL = 'http://localhost:3333/api';

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

export async function fetchClients() {
  const localClients = getLocalItem<any[]>('vollen_clients', []);
  try {
    const res = await fetch(`${API_URL}/clients`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      const serverData = await res.json();
      if (Array.isArray(serverData) && serverData.length > 0) {
        // Mesclagem segura por ID preservando os dados locais mais recentes
        const mergedMap = new Map();
        localClients.forEach((c) => mergedMap.set(c.id, c));
        serverData.forEach((c) => mergedMap.set(c.id, { ...mergedMap.get(c.id), ...c }));
        const merged = Array.from(mergedMap.values());
        setLocalItem('vollen_clients', merged);
        return merged;
      }
    }
  } catch {}
  return localClients;
}

export async function createClient(data: any) {
  const current = getLocalItem<any[]>('vollen_clients', []);
  const clientId = data.id || String(Date.now());
  const newClient = { ...data, id: clientId, updatedAt: new Date().toISOString() };

  try {
    const res = await fetch(`${API_URL}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClient),
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const serverClient = await res.json();
      if (serverClient && serverClient.id) {
        const updated = [serverClient, ...current.filter((c) => c.id !== serverClient.id && c.id !== clientId)];
        setLocalItem('vollen_clients', updated);
        return serverClient;
      }
    }
  } catch {}

  const updated = [newClient, ...current.filter((c) => c.id !== clientId)];
  setLocalItem('vollen_clients', updated);
  return newClient;
}

export async function deleteClient(clientId: string) {
  const current = getLocalItem<any[]>('vollen_clients', []);
  const updated = current.filter((c) => c.id !== clientId);
  setLocalItem('vollen_clients', updated);

  try {
    const res = await fetch(`${API_URL}/clients/${clientId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) return res.json();
  } catch {}
  return { success: true };
}

export async function fetchOrders(includeDeleted: boolean = false) {
  const localOrders = getLocalItem<any[]>('vollen_orders', []);
  try {
    const res = await fetch(`${API_URL}/orders${includeDeleted ? '?includeDeleted=true' : ''}`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      const serverData = await res.json();
      if (Array.isArray(serverData) && serverData.length > 0) {
        // Mesclagem segura por ID preservando os dados mais recentes
        const mergedMap = new Map();
        localOrders.forEach((o) => mergedMap.set(o.id, o));
        serverData.forEach((o) => mergedMap.set(o.id, { ...mergedMap.get(o.id), ...o }));
        const merged = Array.from(mergedMap.values());
        setLocalItem('vollen_orders', merged);
        if (!includeDeleted) {
          return merged.filter((o) => (o.status || '').toUpperCase() !== 'EXCLUIDA');
        }
        return merged;
      }
    }
  } catch {}

  if (!includeDeleted) {
    return localOrders.filter((o) => (o.status || '').toUpperCase() !== 'EXCLUIDA');
  }
  return localOrders;
}

export async function createOrder(data: any) {
  const current = getLocalItem<any[]>('vollen_orders', []);
  const orderId = data.id || String(Date.now());
  const newOrder = {
    ...data,
    id: orderId,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder),
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const serverOrder = await res.json();
      if (serverOrder && serverOrder.id) {
        const updated = [serverOrder, ...current.filter((o) => o.id !== serverOrder.id && o.id !== orderId)];
        setLocalItem('vollen_orders', updated);
        return serverOrder;
      }
    }
  } catch {}

  const updated = [newOrder, ...current.filter((o) => o.id !== orderId)];
  setLocalItem('vollen_orders', updated);
  return newOrder;
}

export async function updateOrder(orderId: string, data: any) {
  const current = getLocalItem<any[]>('vollen_orders', []);
  const index = current.findIndex((o) => o.id === orderId);
  let updatedOrder = { ...data, id: orderId, updatedAt: new Date().toISOString() };
  if (index !== -1) {
    updatedOrder = { ...current[index], ...data, id: orderId, updatedAt: new Date().toISOString() };
    current[index] = updatedOrder;
  } else {
    current.unshift(updatedOrder);
  }
  setLocalItem('vollen_orders', current);

  try {
    const res = await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedOrder),
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) return res.json();
  } catch {}
  return updatedOrder;
}

export async function deleteOrder(orderId: string) {
  const current = getLocalItem<any[]>('vollen_orders', []);
  const updated = current.filter((o) => o.id !== orderId);
  setLocalItem('vollen_orders', updated);

  try {
    const res = await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) return res.json();
  } catch {}
  return { success: true };
}

export async function fetchVisits(filters?: { date?: string; period?: string; technician?: string }) {
  try {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.period) params.append('period', filters.period);
    if (filters?.technician) params.append('technician', filters.technician);

    const res = await fetch(`${API_URL}/visits?${params.toString()}`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        setLocalItem('vollen_visits', data);
        return data;
      }
    }
  } catch {}
  return getLocalItem<any[]>('vollen_visits', []);
}

export async function createVisit(data: any) {
  const current = getLocalItem<any[]>('vollen_visits', []);
  const visitId = data.id || String(Date.now());
  const newVisit = { ...data, id: visitId, updatedAt: new Date().toISOString() };
  const updated = [newVisit, ...current.filter((v) => v.id !== visitId)];
  setLocalItem('vollen_visits', updated);

  try {
    const res = await fetch(`${API_URL}/visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newVisit),
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) return res.json();
  } catch {}
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
    const res = await fetch(`${API_URL}/visits/${visitId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedVisit),
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) return res.json();
  } catch {}
  return updatedVisit;
}

export async function deleteVisit(visitId: string) {
  const current = getLocalItem<any[]>('vollen_visits', []);
  const updated = current.filter((v) => v.id !== visitId);
  setLocalItem('vollen_visits', updated);

  try {
    const res = await fetch(`${API_URL}/visits/${visitId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) return res.json();
  } catch {}
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

