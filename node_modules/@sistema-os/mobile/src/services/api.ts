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

// 1. ORDENS DE SERVIÇO (OS)
export async function fetchOrdersMobile(): Promise<any[]> {
  const local = await getLocalData<any[]>('mobile_orders', []);
  try {
    const serverUrl = await getServerUrl();
    const res = await fetch(`${serverUrl}/orders`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const serverOrders = await res.json();
      if (Array.isArray(serverOrders) && serverOrders.length > 0) {
        const mergedMap = new Map();
        local.forEach((o) => mergedMap.set(o.id, o));
        serverOrders.forEach((o) => mergedMap.set(o.id, { ...mergedMap.get(o.id), ...o }));
        const merged = Array.from(mergedMap.values());
        await setLocalData('mobile_orders', merged);
        return merged;
      }
    }
  } catch {}
  return local;
}

export async function saveOrderMobile(orderData: any): Promise<any> {
  const local = await getLocalData<any[]>('mobile_orders', []);
  const orderId = orderData.id || `MOB-OS-${Date.now()}`;
  
  // Calcula código de OS sequencial se não tiver
  let orderCode = orderData.code;
  if (!orderCode) {
    const maxNum = local.reduce((max, o) => {
      const n = parseInt(String(o.code || '').replace(/\D/g, ''), 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    orderCode = `OS-${String(maxNum + 1).padStart(4, '0')}`;
  }

  const finalOrder = {
    ...orderData,
    id: orderId,
    code: orderCode,
    updatedAt: new Date().toISOString(),
    createdAt: orderData.createdAt || new Date().toISOString(),
  };

  const updatedList = [finalOrder, ...local.filter((o) => o.id !== orderId)];
  await setLocalData('mobile_orders', updatedList);

  // Tenta sincronizar com o backend
  try {
    const serverUrl = await getServerUrl();
    const res = await fetch(`${serverUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalOrder),
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const serverResult = await res.json();
      if (serverResult && serverResult.id) {
        const syncd = [serverResult, ...local.filter((o) => o.id !== orderId && o.id !== serverResult.id)];
        await setLocalData('mobile_orders', syncd);
        return serverResult;
      }
    }
  } catch {}

  return finalOrder;
}

// 2. CLIENTES
export async function fetchClientsMobile(): Promise<any[]> {
  const local = await getLocalData<any[]>('mobile_clients', []);
  try {
    const serverUrl = await getServerUrl();
    const res = await fetch(`${serverUrl}/clients`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const serverClients = await res.json();
      if (Array.isArray(serverClients) && serverClients.length > 0) {
        const mergedMap = new Map();
        local.forEach((c) => mergedMap.set(c.id, c));
        serverClients.forEach((c) => mergedMap.set(c.id, { ...mergedMap.get(c.id), ...c }));
        const merged = Array.from(mergedMap.values());
        await setLocalData('mobile_clients', merged);
        return merged;
      }
    }
  } catch {}
  return local;
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

  try {
    const serverUrl = await getServerUrl();
    const res = await fetch(`${serverUrl}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalClient),
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const serverRes = await res.json();
      if (serverRes && serverRes.id) {
        const syncd = [serverRes, ...local.filter((c) => c.id !== clientId && c.id !== serverRes.id)];
        await setLocalData('mobile_clients', syncd);
        return serverRes;
      }
    }
  } catch {}

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
  return finalEst;
}

// 4. PEÇAS E SERVIÇOS
export async function fetchPartsMobile(): Promise<any[]> {
  return getLocalData<any[]>('mobile_parts', [
    { id: '1', code: '0001', name: 'Bomba de Drenagem', finalPrice: '120,00', stockQuantity: 10 },
    { id: '2', code: '0002', name: 'Placa Principal', finalPrice: '280,00', stockQuantity: 5 },
    { id: '3', code: '0003', name: 'Válvula de Entrada', finalPrice: '85,00', stockQuantity: 8 },
  ]);
}

export async function fetchServicesMobile(): Promise<any[]> {
  return getLocalData<any[]>('mobile_services', [
    { id: '1', code: '0001', name: 'Mão de Obra Geral', price: '150,00' },
    { id: '2', code: '0002', name: 'Higienização e Limpeza', price: '180,00' },
    { id: '3', code: '0003', name: 'Troca de Rolamentos / Mecânica', price: '250,00' },
  ]);
}
