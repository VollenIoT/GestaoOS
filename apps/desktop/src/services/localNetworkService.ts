import { isCloudModeActive } from './licenseService';

export interface LocalNetworkConfig {
  mode: 'standalone' | 'server' | 'client';
  syncStrategy: 'cloud' | 'local' | 'hybrid'; // Modo de Sincronização: Nuvem, Local Offline ou Híbrido
  serverIp: string;
  serverPort: number;
}

const STORAGE_KEY = 'vollen_local_network_config';

export function getLocalNetworkConfig(): LocalNetworkConfig {
  const hasActiveCloud = isCloudModeActive();

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Se possui serial ativa com nuvem e a estratégia não estiver explicitamente configurada como local/servidor/cliente, prioriza cloud
      let currentStrategy = parsed.syncStrategy;
      if (!currentStrategy) {
        currentStrategy = hasActiveCloud ? 'cloud' : 'local';
      }

      return {
        mode: parsed.mode || 'standalone',
        syncStrategy: currentStrategy,
        serverIp: parsed.serverIp || '192.168.1.100',
        serverPort: Number(parsed.serverPort) || 3333,
      };
    }
  } catch (e) {
    console.error('Erro ao ler configuração de rede local:', e);
  }

  // Por padrão: se tem serial de nuvem ativa, inicia em nuvem; caso contrário (modo teste/sem licença), inicia no modo local autônomo
  return {
    mode: 'standalone',
    syncStrategy: hasActiveCloud ? 'cloud' : 'local',
    serverIp: '192.168.1.100',
    serverPort: 3333,
  };
}

export async function createSilentLocalBackup(origin = 'migracao_modo_terminal'): Promise<string | null> {
  try {
    const fullState = collectFullSystemLocalDatabase();
    
    // Coleta 100% de todo o localStorage para garantir restauração perfeita
    const allStorage: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const raw = localStorage.getItem(key);
        try {
          allStorage[key] = raw ? JSON.parse(raw) : raw;
        } catch {
          allStorage[key] = raw;
        }
      }
    }

    const payload = {
      system: 'Vollen - Gestão de OS',
      origin,
      createdAt: new Date().toISOString(),
      storage: allStorage,
      database: fullState,
    };

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `backup_automatico_servidor_${dateStr}.json`;
    const jsonString = JSON.stringify(payload, null, 2);

    // Gravação nativa no Windows (Documents\Backups Sistema OS ou d:\SistemaOS\Backups)
    if ((window as any).__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const pathApi = await import('@tauri-apps/api/path');
        
        let backupDir = 'd:\\SistemaOS\\Backups';
        const docs = await pathApi.documentDir().catch(() => null);
        if (docs) {
          backupDir = `${docs}\\Backups Sistema OS`;
        }

        const fullPath = `${backupDir}\\${fileName}`;
        await invoke('save_backup_file', {
          path: fullPath,
          content: jsonString,
        });

        console.log(`[Backup Automático] Backup de segurança salvo silenciosamente em: ${fullPath}`);
        return fullPath;
      } catch (err) {
        console.warn('[Backup Automático] Erro ao gravar arquivo nativo de backup:', err);
      }
    }

    // Salva também uma cópia no localStorage como contingência de restauração rápida
    try {
      localStorage.setItem('vollen_last_auto_server_backup', jsonString);
      localStorage.setItem('vollen_last_auto_server_backup_date', new Date().toISOString());
    } catch {}

    return fileName;
  } catch (err) {
    console.error('[Backup Automático] Falha ao gerar backup automático silencioso:', err);
    return null;
  }
}

export function saveLocalNetworkConfig(config: LocalNetworkConfig): void {
  try {
    const previousConfig = getLocalNetworkConfig();
    
    // Se o computador estava configurado como Servidor (ou tinha dados próprios no modo local) e está sendo alterado para Terminal (client),
    // gera um backup silencioso de todos os dados antes de sobrescrever com os dados da rede
    if ((previousConfig.mode === 'server' || previousConfig.mode === 'standalone') && config.mode === 'client') {
      createSilentLocalBackup('mudanca_de_servidor_para_terminal');
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    // Notifica listeners e reinicializa sincronização
    notifyConfigChanged(config);
  } catch (e) {
    console.error('Erro ao salvar configuração de rede local:', e);
  }
}

type NetworkListener = (status: {
  connected: boolean;
  mode: 'standalone' | 'server' | 'client';
  serverIp: string;
  serverPort: number;
  lastSync?: string;
}) => void;

type DataEventListener = (eventType: string, payload: any) => void;

const statusListeners: Set<NetworkListener> = new Set();
const dataListeners: Set<DataEventListener> = new Set();
let isConnected = false;
let pollingIntervalId: any = null;
let lastSyncedHash: string = '';

export function isLocalNetworkConnected(): boolean {
  const cfg = getLocalNetworkConfig();
  if (cfg.mode === 'standalone' || cfg.mode === 'server') {
    return true;
  }
  return isConnected;
}

export function subscribeNetworkStatus(listener: NetworkListener): () => void {
  statusListeners.add(listener);
  const cfg = getLocalNetworkConfig();
  listener({
    connected: isConnected,
    mode: cfg.mode,
    serverIp: cfg.serverIp,
    serverPort: cfg.serverPort,
  });
  return () => {
    statusListeners.delete(listener);
  };
}

export function subscribeDataEvents(listener: DataEventListener): () => void {
  dataListeners.add(listener);
  return () => {
    dataListeners.delete(listener);
  };
}

function broadcastStatus(forceConnected?: boolean): void {
  if (typeof forceConnected === 'boolean') {
    isConnected = forceConnected;
  }
  const cfg = getLocalNetworkConfig();
  statusListeners.forEach((l) =>
    l({
      connected: isConnected,
      mode: cfg.mode,
      serverIp: cfg.serverIp,
      serverPort: cfg.serverPort,
      lastSync: new Date().toLocaleTimeString('pt-BR'),
    })
  );
}

function notifyDataChange(eventType: string, payload: any): void {
  dataListeners.forEach((l) => l(eventType, payload));
}

/**
 * 🔒 Validação de Integridade do Terminal Local (Multi-estação)
 *
 * Em arquiteturas onde o GestãoOS opera em modo Terminal (Cliente) conectado
 * a um Computador Servidor na mesma rede local:
 *
 * - Esta função realiza um healthcheck ativo contra `http://[serverIp]:[serverPort]/health`.
 * - Se o Servidor Principal estiver desligado, fechado ou inacessível, uma exceção
 *   descritiva é lançada para impedir gravações locais desconectadas, evitando divergência
 *   de numeração de OS, duplicidade de registros e perda de sincronismo.
 *
 * @param actionName Nome amigável da ação em tentativa (ex: "salvar ordem de serviço", "cadastrar peça")
 * @throws Error Se o terminal estiver em modo 'client' e o servidor principal não responder.
 */
export async function assertTerminalCanSave(actionName = 'salvar dados'): Promise<void> {
  const cfg = getLocalNetworkConfig();
  if (cfg.mode !== 'client') {
    return; // Servidor Principal ou Modo Autônomo (Standalone) salvam diretamente
  }

  // Ping rápido de confirmação direta com o Servidor
  const targetIp = (cfg.serverIp || '').trim();
  const targetPort = cfg.serverPort || 3333;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`http://${targetIp}:${targetPort}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Servidor respondeu com status HTTP ${res.status}`);
    }
    if (!isConnected) {
      isConnected = true;
      broadcastStatus(true);
    }
  } catch (e: any) {
    isConnected = false;
    broadcastStatus(false);
    const reason = e?.name === 'AbortError' ? 'tempo limite esgotado (timeout)' : (e?.message || 'rede inacessível');
    console.warn(`[Terminal Lock] Falha de comunicação com servidor (${targetIp}:${targetPort}): ${reason}`);
    throw new Error(
      `O Computador Servidor Principal (${targetIp}:${targetPort}) está DESLIGADO, FECHADO ou INACESSÍVEL na rede local.\n\n` +
      `Para evitar duplicidades e perda de dados, este terminal está bloqueado para ${actionName}.\n\n` +
      `Por favor, ligue ou abra o GestãoOS no Computador Servidor para continuar.`
    );
  }
}

// Inicia o servidor local nativo (Rust/Tauri) se o computador estiver em modo Servidor
export async function startEmbeddedServerIfNeeded(): Promise<void> {
  const cfg = getLocalNetworkConfig();
  if (cfg.mode === 'server') {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('start_embedded_local_server', { port: cfg.serverPort || 3333 });
      console.log(`[Rede Local] Servidor nativo embutido iniciado na porta ${cfg.serverPort || 3333}`);
      
      // Sincroniza estado inicial do localStorage para a memória do servidor Rust
      syncCurrentLocalStorageToServerState();
    } catch (err) {
      console.warn('[Rede Local] Não foi possível iniciar servidor embutido via Tauri (pode já estar ativo):', err);
    }
  } else {
    // Se mudou para standalone ou client, desativa o servidor embutido
    stopEmbeddedServerIfRunning();
  }
}

// Desativa o servidor local nativo
export async function stopEmbeddedServerIfRunning(): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('stop_embedded_local_server');
    console.log('[Rede Local] Servidor nativo embutido desativado.');
  } catch {}
}

/**
 * Atualiza o estado na memória do servidor nativo com os dados atuais do localStorage
 */
/**
 * Coleta todo o estado atual do banco de dados local do GestãoOS
 */
export function collectFullSystemLocalDatabase() {
  const parse = (key: string, fallback: any) => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  };

  return {
    orders: parse('vollen_orders', []),
    clients: parse('vollen_clients', []),
    parts: parse('vollen_parts_stock', parse('vollen_parts', [])),
    services: parse('vollen_services', []),
    equipments: parse('vollen_equipments', parse('system_equipments', [])),
    users: parse('vollen_users', parse('system_users', [])),
    technicians: parse('vollen_technicians', []),
    statuses: parse('custom_os_statuses_v3', []),
    estimates: parse('vollen_estimates', []),
    cashMovements: parse('vollen_cash_movements', []),
    currentCashSession: parse('vollen_current_cash_session', null),
    cashRegistersHistory: parse('cash_registers_history', []),
    salesHistory: parse('vollen_sales_history', []),
    savedCarts: parse('vollen_saved_carts', []),
    osGeneralConfig: parse('vollen_os_general_config', parse('vollen_os_config', null)),
    warrantyTerms: parse('warranty_config', parse('vollen_warranty_terms', null)),
    companyData: parse('vollen_company_data', null),
  };
}

/**
 * Atualiza o estado na memória do servidor nativo com os dados atuais do localStorage
 */
export async function syncCurrentLocalStorageToServerState(): Promise<void> {
  try {
    const fullPayload = collectFullSystemLocalDatabase();
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('update_server_local_state', { data: fullPayload });
  } catch (e) {
    // Ignora se não estiver em ambiente Tauri
  }
}

/**
 * Executa uma rodada de sincronização via HTTP REST (Terminal -> Servidor ou Servidor Local)
 */
export async function fetchAndApplyServerData(): Promise<boolean> {
  const cfg = getLocalNetworkConfig();
  if (cfg.mode === 'standalone') return false;

  const targetIp = cfg.mode === 'server' ? '127.0.0.1' : cfg.serverIp.trim();
  const targetPort = cfg.serverPort || 3333;
  const endpoint = `http://${targetIp}:${targetPort}/api/sync/all`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const currentHash = JSON.stringify(data);

      if (currentHash !== lastSyncedHash) {
        lastSyncedHash = currentHash;

        // Sincroniza cada entidade com o localStorage e notifica a interface
        const entities: { key: string; val: any }[] = [
          { key: 'orders', val: data.orders },
          { key: 'clients', val: data.clients },
          { key: 'parts', val: data.parts },
          { key: 'services', val: data.services },
          { key: 'equipments', val: data.equipments },
          { key: 'users', val: data.users },
          { key: 'technicians', val: data.technicians },
          { key: 'statuses', val: data.statuses },
          { key: 'estimates', val: data.estimates },
          { key: 'cashMovements', val: data.cashMovements },
          { key: 'currentCashSession', val: data.currentCashSession },
          { key: 'cashRegistersHistory', val: data.cashRegistersHistory },
          { key: 'salesHistory', val: data.salesHistory },
          { key: 'savedCarts', val: data.savedCarts },
          { key: 'osGeneralConfig', val: data.osGeneralConfig },
          { key: 'warrantyTerms', val: data.warrantyTerms },
          { key: 'companyData', val: data.companyData },
        ];

        entities.forEach(({ key, val }) => {
          if (val !== undefined && val !== null) {
            handleRemoteDataSync(key, val);
            notifyDataChange(key, val);
          }
        });
      }

      if (!isConnected) {
        isConnected = true;
        broadcastStatus(true);
      }
      return true;
    } else {
      if (isConnected) {
        isConnected = false;
        broadcastStatus(false);
      }
      return false;
    }
  } catch (err) {
    if (isConnected) {
      isConnected = false;
      broadcastStatus(false);
    }
    return false;
  }
}

// Inicia a sincronização de rede local (modo Servidor ou Terminal/Cliente)
export function initLocalNetworkSync(): void {
  const cfg = getLocalNetworkConfig();

  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }

  if (cfg.mode === 'standalone') {
    isConnected = false;
    broadcastStatus(false);
    return;
  }

  if (cfg.mode === 'server') {
    startEmbeddedServerIfNeeded();
    isConnected = true;
    broadcastStatus(true);

    // Servidor: a cada 3 segundos, sincroniza seu localStorage com a memória Rust e aplica novidades vindas dos terminais
    pollingIntervalId = setInterval(async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const state = await invoke<any>('get_server_local_state');
        if (state && typeof state === 'object') {
          const currentHash = JSON.stringify(state);
          if (currentHash !== lastSyncedHash) {
            lastSyncedHash = currentHash;
            // Atualiza localStorage do servidor com dados que terminais possam ter enviado via push
            const entities: { key: string; val: any }[] = [
              { key: 'orders', val: state.orders },
              { key: 'clients', val: state.clients },
              { key: 'parts', val: state.parts },
              { key: 'services', val: state.services },
              { key: 'equipments', val: state.equipments },
              { key: 'users', val: state.users },
              { key: 'technicians', val: state.technicians },
              { key: 'statuses', val: state.statuses },
              { key: 'estimates', val: state.estimates },
              { key: 'cashMovements', val: state.cashMovements },
              { key: 'currentCashSession', val: state.currentCashSession },
              { key: 'cashRegistersHistory', val: state.cashRegistersHistory },
              { key: 'salesHistory', val: state.salesHistory },
              { key: 'savedCarts', val: state.savedCarts },
              { key: 'osGeneralConfig', val: state.osGeneralConfig },
              { key: 'warrantyTerms', val: state.warrantyTerms },
              { key: 'companyData', val: state.companyData },
            ];
            entities.forEach(({ key, val }) => {
              if (val !== undefined && val !== null) {
                handleRemoteDataSync(key, val);
                notifyDataChange(key, val);
              }
            });
          }
        }
      } catch (e) {}
    }, 3000);
    return;
  }

  if (cfg.mode === 'client') {
    // Busca inicial imediata
    fetchAndApplyServerData();

    // Polling contínuo e ultraleve a cada 2 segundos
    pollingIntervalId = setInterval(() => {
      fetchAndApplyServerData();
    }, 2000);
  }
}

function notifyConfigChanged(newConfig: LocalNetworkConfig): void {
  startEmbeddedServerIfNeeded();
  initLocalNetworkSync();
}

/**
 * Emite uma alteração de dados para o Servidor Principal na rede local
 */
export async function emitLocalDataChange(entityType: string, payload: any): Promise<void> {
  const cfg = getLocalNetworkConfig();
  if (cfg.mode === 'standalone') return;

  // 1. Atualiza imediatamente no armazenamento local deste computador
  handleRemoteDataSync(entityType, payload);

  // 2. Se este computador for o SERVIDOR: sincroniza direto para a memória do servidor Rust
  if (cfg.mode === 'server') {
    await syncCurrentLocalStorageToServerState();
    return;
  }

  // 3. Se este computador for um TERMINAL (CLIENTE): envia Push HTTP com retry/timeout
  if (cfg.mode === 'client') {
    try {
      const fullState = collectFullSystemLocalDatabase();
      (fullState as any)[entityType] = payload;

      const targetIp = cfg.serverIp.trim();
      const targetPort = cfg.serverPort || 3333;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`http://${targetIp}:${targetPort}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullState),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        console.log(`[Rede Local] Push de ${entityType} entregue com sucesso ao Servidor.`);
        // Atualiza lastSyncedHash para evitar que o próximo ciclo de polling sobrescreva os dados locais
        try {
          const checkRes = await fetch(`http://${targetIp}:${targetPort}/api/sync/all`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          });
          if (checkRes.ok) {
            const data = await checkRes.json();
            lastSyncedHash = JSON.stringify(data);
          }
        } catch {}
      } else {
        console.warn(`[Rede Local] Servidor respondeu com status ${res.status} ao push de ${entityType}.`);
      }
    } catch (e) {
      console.warn('[Rede Local] Falha ao enviar push de dados para o Servidor:', e);
    }
  }
}

/**
 * Aplica atualizações recebidas da rede local no armazenamento local do terminal
 */
function handleRemoteDataSync(type: string, payload: any): void {
  try {
    switch (type) {
      case 'orders':
        if (Array.isArray(payload)) {
          localStorage.setItem('vollen_orders', JSON.stringify(payload));
          localStorage.setItem('local_orders', JSON.stringify(payload));
          localStorage.setItem('orders', JSON.stringify(payload));
        }
        break;
      case 'clients':
        if (Array.isArray(payload)) {
          localStorage.setItem('vollen_clients', JSON.stringify(payload));
        }
        break;
      case 'parts':
        if (Array.isArray(payload)) {
          localStorage.setItem('vollen_parts_stock', JSON.stringify(payload));
          localStorage.setItem('vollen_parts', JSON.stringify(payload));
          localStorage.setItem('parts', JSON.stringify(payload));
        }
        break;
      case 'services':
        if (Array.isArray(payload)) {
          localStorage.setItem('vollen_services', JSON.stringify(payload));
        }
        break;
      case 'equipments':
        if (Array.isArray(payload)) {
          localStorage.setItem('vollen_equipments', JSON.stringify(payload));
          localStorage.setItem('system_equipments', JSON.stringify(payload));
        }
        break;
      case 'users':
        if (Array.isArray(payload)) {
          localStorage.setItem('vollen_users', JSON.stringify(payload));
          localStorage.setItem('system_users', JSON.stringify(payload));
        }
        break;
      case 'technicians':
        if (Array.isArray(payload)) {
          localStorage.setItem('vollen_technicians', JSON.stringify(payload));
        }
        break;
      case 'statuses':
        if (Array.isArray(payload)) {
          localStorage.setItem('custom_os_statuses_v3', JSON.stringify(payload));
        }
        break;
      case 'estimates':
        if (Array.isArray(payload)) {
          localStorage.setItem('vollen_estimates', JSON.stringify(payload));
        }
        break;
      case 'cashMovements':
        if (Array.isArray(payload)) {
          localStorage.setItem('vollen_cash_movements', JSON.stringify(payload));
        }
        break;
      case 'currentCashSession':
        if (payload) {
          localStorage.setItem('vollen_current_cash_session', JSON.stringify(payload));
        }
        break;
      case 'cashRegistersHistory':
        if (Array.isArray(payload)) {
          localStorage.setItem('cash_registers_history', JSON.stringify(payload));
        }
        break;
      case 'salesHistory':
        if (Array.isArray(payload)) {
          localStorage.setItem('vollen_sales_history', JSON.stringify(payload));
        }
        break;
      case 'savedCarts':
        if (Array.isArray(payload)) {
          localStorage.setItem('vollen_saved_carts', JSON.stringify(payload));
        }
        break;
      case 'osGeneralConfig':
        if (payload) {
          localStorage.setItem('vollen_os_general_config', JSON.stringify(payload));
          localStorage.setItem('vollen_os_config', JSON.stringify(payload));
        }
        break;
      case 'warrantyTerms':
        if (payload) {
          localStorage.setItem('warranty_config', JSON.stringify(payload));
          localStorage.setItem('vollen_warranty_terms', JSON.stringify(payload));
        }
        break;
      case 'companyData':
        if (payload) {
          localStorage.setItem('vollen_company_data', JSON.stringify(payload));
        }
        break;
      default:
        break;
    }
  } catch (e) {
    console.error('[Rede Local] Erro ao aplicar sincronização remota:', e);
  }
}

// Detecta automaticamente o endereço IP da máquina local (PC Servidor)
export async function fetchMachineLocalIp(): Promise<string> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const ips = await invoke<string[]>('get_local_machine_ip');
    if (Array.isArray(ips) && ips.length > 0 && ips[0] !== '127.0.0.1') {
      return ips[0];
    }
  } catch (e) {
    console.warn('Tauri get_local_machine_ip não disponível:', e);
  }

  // Fallback via WebRTC se disponível no navegador
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer().then((offer) => pc.setLocalDescription(offer)).catch(() => resolve('192.168.1.100'));
      
      const timeout = setTimeout(() => {
        pc.close();
        resolve('192.168.1.100');
      }, 1500);

      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) return;
        const match = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate);
        if (match && match[1] && match[1] !== '127.0.0.1') {
          clearTimeout(timeout);
          pc.close();
          resolve(match[1]);
        }
      };
    } catch {
      resolve('192.168.1.100');
    }
  });
}

// Testa a conectividade com o IP informado (usando HTTP /health e validação de serviço ativo)
export async function testServerConnection(ip: string, port: number): Promise<{ success: boolean; message: string }> {
  const targetIp = (ip || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  if (!targetIp) {
    return { success: false, message: 'Endereço IP não informado.' };
  }

  // 1. Testa requisição HTTP /health (confirma que o servidor de banco de dados está ativo e respondendo 200 OK)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://${targetIp}:${port}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeoutId);

    if (res && res.ok && res.status === 200) {
      const data = await res.json().catch(() => null);
      if (data && data.status === 'ok') {
        return { success: true, message: `Conexão estabelecida com sucesso com o Servidor Principal (${targetIp}:${port})!` };
      }
    }
  } catch {}

  // 2. Se falhar ou receber 503/404, o servidor está inativo ou indisponível
  return {
    success: false,
    message: `Não foi possível conectar ao servidor em ${targetIp}:${port}. O computador servidor está offline, desligado ou migrou de modo.`,
  };
}
