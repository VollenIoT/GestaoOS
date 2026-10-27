import React, { useState, useEffect } from 'react';
import {
  Network,
  Server,
  Monitor,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Wifi,
  WifiOff,
  HelpCircle,
  X,
  Radio,
  Sliders,
  Cloud,
  Layers,
  HardDrive,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  getLocalNetworkConfig,
  saveLocalNetworkConfig,
  testServerConnection,
  subscribeNetworkStatus,
  fetchMachineLocalIp,
  LocalNetworkConfig,
} from '../services/localNetworkService';
import { getCurrentFeatures } from '../config/appFeatures';
import { getSavedTenantInfo, checkLicenseValidity } from '../services/licenseService';
import { modalStack } from '../utils/modalStack';

interface LocalNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSerialLicenseModal?: () => void;
}

export const LocalNetworkModal: React.FC<LocalNetworkModalProps> = ({ isOpen, onClose, onOpenSerialLicenseModal }) => {
  const features = getCurrentFeatures();
  const [config, setConfig] = useState<LocalNetworkConfig>(getLocalNetworkConfig);
  const [initialStrategy, setInitialStrategy] = useState<'cloud' | 'local' | 'hybrid'>('cloud');
  const [detectedLocalIp, setDetectedLocalIp] = useState<string>('');
  const [status, setStatus] = useState<{
    connected: boolean;
    mode: 'standalone' | 'server' | 'client';
    serverIp: string;
    serverPort: number;
    lastSync?: string;
  }>({
    connected: false,
    mode: 'standalone',
    serverIp: '192.168.1.100',
    serverPort: 3333,
  });

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estados para o fluxo de sincronização em nuvem (perguntar ao salvar no Modo Nuvem)
  const [showSyncDecision, setShowSyncDecision] = useState(false);
  const [syncAction, setSyncAction] = useState<'DOWNLOAD_CLOUD' | 'UPLOAD_LOCAL' | null>(null);
  const [showConfirmOverwrite, setShowConfirmOverwrite] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = getLocalNetworkConfig();
      setConfig(current);
      setInitialStrategy(current.syncStrategy || 'cloud');
      setTestResult(null);
      setSaveSuccess(false);
      setShowSyncDecision(false);
      setSyncAction(null);
      setShowConfirmOverwrite(false);
      setIsSyncing(false);
      setSyncError(null);

      // Detecta automaticamente o IP local do computador
      fetchMachineLocalIp().then((ip) => {
        if (ip && ip !== '127.0.0.1') {
          setDetectedLocalIp(ip);
          if (current.mode === 'server') {
            setConfig((prev) => ({ ...prev, serverIp: ip }));
          }
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const unsub = subscribeNetworkStatus((s) => {
      setStatus(s);
    });
    return unsub;
  }, []);

  // Registro na pilha de modais para ESC fechar este modal corretamente
  useEffect(() => {
    if (isOpen) {
      modalStack.register('LocalNetworkModal', onClose);
      return () => modalStack.unregister('LocalNetworkModal');
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testServerConnection(config.serverIp, config.serverPort);
    setTestResult(res);
    setIsTesting(false);
  };

  const handleSave = () => {
    // Se o usuário selecionou o modo nuvem (e o sistema possui suporte a Cloud), pergunta o que fazer com os dados
    if (features.hasCloud && config.syncStrategy === 'cloud') {
      const tenantInfo = getSavedTenantInfo();
      if (tenantInfo && tenantInfo.firebaseConfig && tenantInfo.firebaseConfig.projectId) {
        setShowSyncDecision(true);
        return;
      }
    }

    // Caso contrário (modo local ou sem credenciais da nuvem salvas), salva diretamente
    saveLocalNetworkConfig(config);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
      // Recarrega para inicializar ou desligar listeners em tempo real da nuvem
      window.location.reload();
    }, 800);
  };

  const handleSelectSyncAction = (action: 'DOWNLOAD_CLOUD' | 'UPLOAD_LOCAL') => {
    setSyncAction(action);
    setShowSyncDecision(false);
    setShowConfirmOverwrite(true);
  };

  const handleExecuteCloudSync = async () => {
    if (!syncAction) return;

    setShowConfirmOverwrite(false);
    setIsSyncing(true);
    setSyncError(null);

    try {
      // 1. Salva a configuração de rede para nuvem
      saveLocalNetworkConfig({ ...config, syncStrategy: 'cloud', mode: 'standalone' });

      const tenantInfo = getSavedTenantInfo();
      if (tenantInfo && tenantInfo.firebaseConfig && tenantInfo.firebaseConfig.projectId) {
        const { initializeApp, getApps } = await import('firebase/app');
        const { getFirestore, doc, setDoc, deleteDoc, getDocs, getDoc, collection } = await import('firebase/firestore');

        const tenantApp = !getApps().some((a) => a.name === 'targetTenantSync')
          ? initializeApp(tenantInfo.firebaseConfig, 'targetTenantSync')
          : getApps().find((a) => a.name === 'targetTenantSync')!;

        const tenantDb = getFirestore(tenantApp);

        if (syncAction === 'DOWNLOAD_CLOUD') {
          // OPÇÃO 1: CARREGAR AS INFORMAÇÕES DA NUVEM (SOBRESCREVE E LIMPA 100% O LOCAL)
          // 0. Limpeza total prévia das tabelas operacionais locais para evitar duplicação de códigos / cadastros
          const localKeysToWipe = [
            'vollen_clients',
            'selected_client',
            'vollen_orders',
            'vollen_parts',
            'vollen_parts_stock',
            'vollen_services',
            'vollen_custom_services',
            'vollen_equipments',
            'system_equipments',
            'vollen_estimates',
            'vollen_visits',
            'vollen_cash_movements',
            'vollen_current_cash_session',
            'vollen_cash_register_columns',
            'cash_registers_history',
            'vollen_sales_history',
            'vollen_saved_carts',
            'custom_os_statuses_v3',
            'vollen_custom_next_os_number',
          ];
          for (const key of localKeysToWipe) {
            localStorage.removeItem(key);
          }

          // Limpa chaves dinâmicas locais de auditoria de OS antigas
          try {
            const auditKeys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && (k.startsWith('os_audit_') || k.startsWith('audit_'))) {
                auditKeys.push(k);
              }
            }
            auditKeys.forEach((k) => localStorage.removeItem(k));
          } catch (e) {}

          const snapClients = await getDocs(collection(tenantDb, 'clients'));
          const cloudClients = snapClients.docs.map((d) => ({ id: d.id, ...d.data() }));
          localStorage.setItem('vollen_clients', JSON.stringify(cloudClients));

          const snapOrders = await getDocs(collection(tenantDb, 'orders'));
          const cloudOrders = snapOrders.docs.map((d) => ({ id: d.id, ...d.data() }));
          localStorage.setItem('vollen_orders', JSON.stringify(cloudOrders));

          const snapParts = await getDocs(collection(tenantDb, 'parts'));
          const cloudParts = snapParts.docs.map((d) => ({ id: d.id, ...d.data() }));
          localStorage.setItem('vollen_parts_stock', JSON.stringify(cloudParts));
          localStorage.setItem('vollen_parts', JSON.stringify(cloudParts));

          const snapServices = await getDocs(collection(tenantDb, 'services'));
          const cloudServices = snapServices.docs.map((d) => ({ id: d.id, ...d.data() }));
          localStorage.setItem('vollen_services', JSON.stringify(cloudServices));

          const snapEquipments = await getDocs(collection(tenantDb, 'equipments'));
          const cloudEquipments = snapEquipments.docs.map((d) => ({ id: d.id, ...d.data() }));
          localStorage.setItem('vollen_equipments', JSON.stringify(cloudEquipments));
          localStorage.setItem('system_equipments', JSON.stringify(cloudEquipments));

          const snapEstimates = await getDocs(collection(tenantDb, 'estimates'));
          const cloudEstimates = snapEstimates.docs.map((d) => ({ id: d.id, ...d.data() }));
          localStorage.setItem('vollen_estimates', JSON.stringify(cloudEstimates));

          const snapVisits = await getDocs(collection(tenantDb, 'visits'));
          const cloudVisits = snapVisits.docs.map((d) => ({ id: d.id, ...d.data() }));
          localStorage.setItem('vollen_visits', JSON.stringify(cloudVisits));

          const snapCompany = await getDoc(doc(tenantDb, 'system_config', 'company_data'));
          let companyObj: any = snapCompany.exists() ? snapCompany.data() : {};
          if (tenantInfo.tradeName || tenantInfo.companyName) {
            companyObj.tradingName = tenantInfo.tradeName || tenantInfo.companyName;
            companyObj.name = tenantInfo.legalName || tenantInfo.companyName || companyObj.tradingName;
          }
          localStorage.setItem('vollen_company_data', JSON.stringify(companyObj));

          const snapWarranty = await getDoc(doc(tenantDb, 'system_config', 'warranty_config'));
          if (snapWarranty.exists()) {
            localStorage.setItem('vollen_os_config', JSON.stringify(snapWarranty.data()));
          }

          const snapOsPref = await getDoc(doc(tenantDb, 'system_config', 'os_preferences'));
          if (snapOsPref.exists()) {
            localStorage.setItem('vollen_os_preferences', JSON.stringify(snapOsPref.data()));
            localStorage.setItem('vollen_os_general_config', JSON.stringify(snapOsPref.data()));
          }

          const snapStatuses = await getDocs(collection(tenantDb, 'os_statuses'));
          if (!snapStatuses.empty) {
            const listStatuses = snapStatuses.docs.map((d) => ({ id: d.id, ...d.data() }));
            localStorage.setItem('custom_os_statuses_v3', JSON.stringify(listStatuses));
          }

          const snapUsers = await getDocs(collection(tenantDb, 'users'));
          if (!snapUsers.empty) {
            const listUsers = snapUsers.docs.map((d) => ({ id: d.id, ...d.data() }));
            localStorage.setItem('vollen_users', JSON.stringify(listUsers));
          }

          const snapTechs = await getDocs(collection(tenantDb, 'technicians'));
          if (!snapTechs.empty) {
            const listTechs = snapTechs.docs.map((d) => ({ id: d.id, ...d.data() }));
            localStorage.setItem('vollen_technicians', JSON.stringify(listTechs));
          }
        } else {
          // OPÇÃO 2: GRAVAR INFORMAÇÕES NA NUVEM (SOBRESCREVE A NUVEM)
          const wipeCloudCollection = async (collName: string, preserveIds: Set<string>) => {
            try {
              const snap = await getDocs(collection(tenantDb, collName));
              for (const docSnap of snap.docs) {
                if (!preserveIds.has(docSnap.id)) {
                  await deleteDoc(doc(tenantDb, collName, docSnap.id)).catch(() => {});
                }
              }
            } catch (err) {
              console.warn(`Aviso ao sincronizar coleção ${collName} na nuvem:`, err);
            }
          };

          // 1. Clientes
          const localClients = JSON.parse(localStorage.getItem('vollen_clients') || '[]');
          for (const c of localClients) {
            const docId = String(c.id || Date.now());
            await setDoc(doc(tenantDb, 'clients', docId), { ...c, id: docId }, { merge: true });
          }

          // 2. Ordens de Serviço
          const localOrders = JSON.parse(localStorage.getItem('vollen_orders') || '[]');
          let maxOsNum = 0;
          for (const o of localOrders) {
            const docId = String(o.id || Date.now());
            await setDoc(doc(tenantDb, 'orders', docId), { ...o, id: docId }, { merge: true });
            if (o.code) {
              const num = parseInt(String(o.code).replace(/\D/g, ''), 10);
              if (!isNaN(num) && num > maxOsNum) maxOsNum = num;
            }
          }

          // Atualiza contador de OS na nuvem
          if (maxOsNum > 0) {
            await setDoc(doc(tenantDb, 'system_config', 'order_counter'), {
              lastOrderNumber: maxOsNum,
              updatedAt: new Date().toISOString()
            }, { merge: true }).catch(() => {});
          }

          // 3. Peças do estoque
          const localParts = JSON.parse(localStorage.getItem('vollen_parts_stock') || '[]');
          for (const p of localParts) {
            const docId = String(p.id || Date.now());
            await setDoc(doc(tenantDb, 'parts', docId), { ...p, id: docId }, { merge: true });
          }

          // 4. Serviços
          const localServices = JSON.parse(localStorage.getItem('vollen_services') || '[]');
          for (const s of localServices) {
            const docId = String(s.id || Date.now());
            await setDoc(doc(tenantDb, 'services', docId), { ...s, id: docId }, { merge: true });
          }

          // 5. Equipamentos
          const localEquipments = JSON.parse(localStorage.getItem('vollen_equipments') || '[]');
          for (const e of localEquipments) {
            const docId = String(e.id || Date.now());
            await setDoc(doc(tenantDb, 'equipments', docId), { ...e, id: docId }, { merge: true });
          }

          // 6. Dados da Empresa
          const localCompany = JSON.parse(localStorage.getItem('vollen_company_data') || '{}');
          if (tenantInfo.tradeName || tenantInfo.companyName) {
            localCompany.tradingName = tenantInfo.tradeName || tenantInfo.companyName;
            localCompany.name = tenantInfo.legalName || tenantInfo.companyName || localCompany.tradingName;
          }
          localStorage.setItem('vollen_company_data', JSON.stringify(localCompany));
          await setDoc(doc(tenantDb, 'system_config', 'company_data'), localCompany, { merge: true });

          // 7. Configurações de Garantia
          const localWarranty = JSON.parse(localStorage.getItem('vollen_os_config') || 'null');
          if (localWarranty) {
            await setDoc(doc(tenantDb, 'system_config', 'warranty_config'), localWarranty, { merge: true });
          }

          // 8. Preferências de OS
          const localOsConfig = JSON.parse(localStorage.getItem('vollen_os_preferences') || localStorage.getItem('vollen_os_general_config') || 'null');
          if (localOsConfig) {
            await setDoc(doc(tenantDb, 'system_config', 'os_preferences'), localOsConfig, { merge: true });
          }

          // 9. Status personalizados
          const localStatuses = JSON.parse(localStorage.getItem('custom_os_statuses_v3') || '[]');
          for (const st of localStatuses) {
            const docId = String(st.id || Date.now());
            await setDoc(doc(tenantDb, 'os_statuses', docId), { ...st, id: docId }, { merge: true });
          }

          // 10. Orçamentos
          const localEstimates = JSON.parse(localStorage.getItem('vollen_estimates') || '[]');
          for (const est of localEstimates) {
            const docId = String(est.id || Date.now());
            await setDoc(doc(tenantDb, 'estimates', docId), { ...est, id: docId }, { merge: true });
          }

          // 11. Usuários
          const localUsers = JSON.parse(localStorage.getItem('vollen_users') || '[]');
          for (const u of localUsers) {
            const docId = String(u.id || Date.now());
            await setDoc(doc(tenantDb, 'users', docId), { ...u, id: docId }, { merge: true });
          }

          // 12. Técnicos
          const localTechs = JSON.parse(localStorage.getItem('vollen_technicians') || '[]');
          for (const t of localTechs) {
            const docId = String(t.id || Date.now());
            await setDoc(doc(tenantDb, 'technicians', docId), { ...t, id: docId }, { merge: true });
          }
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setSyncError(err?.message || 'Ocorreu um erro ao sincronizar os dados na nuvem.');
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-slate-50 border border-slate-300 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-5 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-400/30 text-indigo-300">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Rede Local Offline (IP Fixo)</h2>
              <p className="text-xs text-slate-300">
                Sincronização em tempo real entre computadores da loja sem internet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-5 space-y-5 text-sm text-slate-700 max-h-[75vh] overflow-y-auto">
          {/* Status Atual */}
          <div className="p-3.5 rounded-lg border bg-white shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              {config.mode === 'standalone' ? (
                <div className="p-2 bg-slate-100 rounded-md text-slate-600">
                  <Monitor className="w-5 h-5" />
                </div>
              ) : status.connected ? (
                <div className="p-2 bg-emerald-100 rounded-md text-emerald-600">
                  <Wifi className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 bg-amber-100 rounded-md text-amber-600">
                  <WifiOff className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Estado Atual da Rede
                </div>
                <div className="font-semibold text-slate-800 text-sm">
                  {config.mode === 'standalone' && 'Modo Computador Único (Autônomo)'}
                  {config.mode === 'server' && 'Servidor Principal Ativo'}
                  {config.mode === 'client' &&
                    (status.connected
                      ? `Conectado ao Servidor (${config.serverIp})`
                      : `Desconectado do Servidor (${config.serverIp})`)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  config.mode === 'standalone'
                    ? 'bg-slate-100 text-slate-700 border border-slate-300'
                    : status.connected
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {config.mode === 'standalone'
                  ? 'Local Único'
                  : status.connected
                  ? 'Online Local'
                  : 'Desconectado'}
              </span>
            </div>
          </div>

          {/* Seleção do Modo de Sincronização (Nuvem / Local) para versões com Cloud */}
          {features.hasCloud && (
            <div className="space-y-2 p-3.5 bg-indigo-50/50 rounded-lg border border-indigo-200">
              <label className="font-bold text-xs uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                Modo de Operação do Sistema:
              </label>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* 1. Nuvem Direta */}
                <button
                  type="button"
                  onClick={() => {
                    // Verifica se há serial ativo antes de permitir modo nuvem
                    const tenantInfo = getSavedTenantInfo();
                    const validity = checkLicenseValidity(tenantInfo);
                    const hasActiveSerial = tenantInfo && tenantInfo.firebaseConfig && tenantInfo.firebaseConfig.projectId && validity.isValid && !validity.isExpired && !validity.isBlocked;

                    if (!hasActiveSerial) {
                      if (onOpenSerialLicenseModal) {
                        onClose();
                        onOpenSerialLicenseModal();
                      } else {
                        alert('É necessário ter um serial ativo para usar o Modo Nuvem. Ative sua licença primeiro em Menu > Serial / Licença.');
                      }
                      return;
                    }
                    setConfig({ ...config, syncStrategy: 'cloud', mode: 'standalone' });
                  }}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    config.syncStrategy === 'cloud'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Cloud className="w-4 h-4" />
                    Modo Nuvem (Online)
                  </div>
                  <div className={`text-[11px] mt-1 ${config.syncStrategy === 'cloud' ? 'text-indigo-100' : 'text-slate-500'}`}>
                    Sincronização 100% em nuvem em tempo real para todos os computadores e aplicativo móvel.
                  </div>
                </button>

                {/* 2. Local Offline */}
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, syncStrategy: 'local' })}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    config.syncStrategy === 'local'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Monitor className="w-4 h-4" />
                    Modo Local (Offline)
                  </div>
                  <div className={`text-[11px] mt-1 ${config.syncStrategy === 'local' ? 'text-indigo-100' : 'text-slate-500'}`}>
                    Rede local autônoma via IP fixo entre computadores da oficina (sem internet).
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Seleção do Modo de Operação (Servidor / Terminal) - EXIBIDO APENAS NO MODO LOCAL */}
          {(!features.hasCloud || config.syncStrategy === 'local') && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <label className="font-bold text-xs uppercase tracking-wider text-slate-600 block">
                Papel deste Computador na Rede Local:
              </label>
            <div className="grid grid-cols-1 gap-2.5">
              {/* Opção 1: Standalone */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                  config.mode === 'standalone'
                    ? 'bg-indigo-50/70 border-indigo-400 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="network_mode"
                  checked={config.mode === 'standalone'}
                  onChange={() => setConfig({ ...config, mode: 'standalone' })}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-bold text-slate-800 text-xs">Computador Único (Isolado)</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Não compartilha nem busca dados na rede local de outros computadores da loja.
                  </div>
                </div>
              </label>

              {/* Opção 2: Servidor Principal */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                  config.mode === 'server'
                    ? 'bg-indigo-50/70 border-indigo-400 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="network_mode"
                  checked={config.mode === 'server'}
                  onChange={() => {
                    const targetIp = detectedLocalIp || config.serverIp || '192.168.1.100';
                    setConfig({ ...config, mode: 'server', serverIp: targetIp });
                  }}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-indigo-600" />
                      Registrar Este Computador como SERVIDOR PRINCIPAL (PC Central)
                    </span>
                    {detectedLocalIp && (
                      <span className="text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                        IP Detectado: {detectedLocalIp}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Centraliza os dados locais e distribui as atualizações para os outros computadores quando offline.
                  </div>
                </div>
              </label>

              {/* Opção 3: Terminal Cliente */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                  config.mode === 'client'
                    ? 'bg-indigo-50/70 border-indigo-400 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="network_mode"
                  checked={config.mode === 'client'}
                  onChange={() => setConfig({ ...config, mode: 'client' })}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                    Este Computador é um TERMINAL (Conectar ao IP do Servidor)
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Conecta-se ao PC Servidor Principal via IP na rede local da loja.
                  </div>
                </div>
              </label>
            </div>
          </div>
          )}

          {/* Configurações de IP Fixo (quando for Cliente ou Servidor) */}
          {(!features.hasCloud || config.syncStrategy === 'local') && (config.mode === 'client' || config.mode === 'server') && (
            <div className="p-4 bg-slate-100 rounded-lg border border-slate-300 space-y-3">
              <div className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-600" />
                {config.mode === 'server' ? 'Endereço IP deste Servidor Local' : 'Endereço IP do Servidor Principal'}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    {config.mode === 'server'
                      ? 'IP Deste Servidor (Detectado Automaticamente):'
                      : 'Digite o IP do Computador Servidor:'}
                  </label>
                  <input
                    type="text"
                    value={config.serverIp}
                    onChange={(e) => setConfig({ ...config, serverIp: e.target.value.trim() })}
                    placeholder={config.mode === 'server' ? (detectedLocalIp || "192.168.1.100") : "Ex: 192.168.1.100"}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md font-mono font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  {config.mode === 'server' ? (
                    <p className="text-[11px] text-slate-600 font-medium">
                      💡 <strong>Importante:</strong> Digite este IP (<span className="text-indigo-700 font-bold">{config.serverIp || detectedLocalIp}</span>) nos outros computadores (terminais) da oficina.
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-600 font-medium">
                      💡 Digite exatamente o IP mostrado na tela do computador registrado como Servidor Principal.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Porta:</label>
                  <input
                    type="number"
                    value={config.serverPort}
                    onChange={(e) => setConfig({ ...config, serverPort: Number(e.target.value) || 3333 })}
                    placeholder="3333"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {config.mode === 'client' && (
                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={isTesting || !config.serverIp}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isTesting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Radio className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                    Testar Comunicação com o Servidor
                  </button>

                  {testResult && (
                    <span
                      className={`text-xs font-semibold flex items-center gap-1 ${
                        testResult.success ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      {testResult.success ? 'Conexão OK!' : 'Falha ao conectar'}
                    </span>
                  )}
                </div>
              )}

              {testResult && !testResult.success && (
                <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
                  {testResult.message}
                </p>
              )}
            </div>
          )}

          {/* Dica Informativa */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Dica de Configuração:</span> Para usar múltiplos computadores na
              oficina sem internet, defina um IP fixo nas configurações de rede do Windows no computador servidor
              (ex: <code>192.168.1.100</code>) e informe este mesmo endereço nos terminais adicionais.
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`px-5 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
              saveSuccess ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saveSuccess ? 'Configurações Salvas!' : 'Salvar Configuração'}
          </button>
        </div>
      </div>

      {/* DIÁLOGO 1: ESCOLHA DE SINCRONIZAÇÃO NUVEM (CARREGAR OU GRAVAR) */}
      {showSyncDecision && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-60 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <Cloud className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Sincronização com a Nuvem</h3>
              </div>
              <button
                onClick={() => setShowSyncDecision(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <p className="text-slate-600 font-medium leading-relaxed">
                Você selecionou o <strong>Modo Nuvem (Online)</strong>. Como você deseja sincronizar as informações do sistema?
              </p>

              <div className="space-y-3">
                {/* Opção 1: Baixar/Carregar da Nuvem */}
                <button
                  type="button"
                  onClick={() => handleSelectSyncAction('DOWNLOAD_CLOUD')}
                  className="w-full text-left p-4 rounded-xl border-2 border-indigo-100 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 transition-all flex items-start gap-3.5 group cursor-pointer"
                >
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-950 text-sm">Carregar informações da Nuvem</h4>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Baixa todos os clientes, OS, peças, serviços e configurações salvas na nuvem para este computador.
                    </p>
                  </div>
                </button>

                {/* Opção 2: Gravar dados locais na Nuvem */}
                <button
                  type="button"
                  onClick={() => handleSelectSyncAction('UPLOAD_LOCAL')}
                  className="w-full text-left p-4 rounded-xl border-2 border-emerald-100 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 transition-all flex items-start gap-3.5 group cursor-pointer"
                >
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">Gravar informações na Nuvem</h4>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Envia todas as informações salvas atualmente neste computador para o banco na nuvem.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSyncDecision(false)}
                className="px-4 py-2 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIÁLOGO 2: ALERTA DE CONFIRMAÇÃO DA ESCOLHA */}
      {showConfirmOverwrite && syncAction && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-70 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-400 max-w-md w-full overflow-hidden flex flex-col">
            <div className="bg-amber-500 px-6 py-4 flex items-center gap-3 text-white">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-black text-sm uppercase tracking-wide">Atenção: Confirmação de Escolha</h3>
                <p className="text-[11px] text-amber-100">Confirmação de segurança necessária</p>
              </div>
            </div>

            <div className="p-6 space-y-3.5 text-xs text-slate-800">
              {syncAction === 'DOWNLOAD_CLOUD' ? (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 leading-relaxed font-medium">
                  ⚠️ <strong>ALERTA:</strong> Você escolheu <strong>CARREGAR AS INFORMAÇÕES DA NUVEM</strong>.
                  <br /><br />
                  Todas as informações e ordens de serviço salvas <strong>localmente neste computador serão substituídas</strong> pelos dados armazenados na nuvem.
                </div>
              ) : (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 leading-relaxed font-medium">
                  ⚠️ <strong>ALERTA:</strong> Você escolheu <strong>GRAVAR AS INFORMAÇÕES NA NUVEM</strong>.
                  <br /><br />
                  Os dados locais deste computador serão enviados e <strong>substituirão permanentemente as informações existentes no banco de dados na nuvem</strong>.
                </div>
              )}

              {syncError && (
                <p className="text-[11px] text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-semibold">
                  {syncError}
                </p>
              )}

              <p className="font-bold text-slate-700 text-center">
                Deseja confirmar e prosseguir com esta ação?
              </p>
            </div>

            <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmOverwrite(false);
                  setShowSyncDecision(true);
                }}
                disabled={isSyncing}
                className="px-4 py-2 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleExecuteCloudSync}
                disabled={isSyncing}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-2 text-xs"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sincronizando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar e Aplicar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
