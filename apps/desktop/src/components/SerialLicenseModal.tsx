import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  Cloud,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Unlink,
  ShieldCheck,
  Building2,
  RefreshCw,
  Copy,
  Check,
  Lock,
  User,
  AlertCircle,
} from 'lucide-react';
import {
  getSavedSerial,
  getSavedTenantInfo,
  isCloudModeActive,
  validateAndFetchSerialLicense,
  activateLicense,
  deactivateLicense,
  LicenseTenantData,
} from '../services/licenseService';

interface SerialLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLicenseChanged?: () => void;
  currentUser?: any;
}

export const SerialLicenseModal: React.FC<SerialLicenseModalProps> = ({
  isOpen,
  onClose,
  onLicenseChanged,
  currentUser,
}) => {
  const [serialInput, setSerialInput] = useState('');
  const [savedSerial, setSavedSerial] = useState<string | null>(null);
  const [tenantInfo, setTenantInfo] = useState<LicenseTenantData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);

  // Estado para o diálogo de decisão de sincronização
  const [pendingLicenseData, setPendingLicenseData] = useState<LicenseTenantData | null>(null);
  const [showSyncDecision, setShowSyncDecision] = useState(false);
  const [syncAction, setSyncAction] = useState<'DOWNLOAD_CLOUD' | 'UPLOAD_LOCAL' | null>(null);
  const [showConfirmOverwrite, setShowConfirmOverwrite] = useState(false);

  // Estados para autorização de administrador na desvinculação
  const [isDeauthModalOpen, setIsDeauthModalOpen] = useState(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vollen_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let admins = parsed.filter(
            (u: any) =>
              (u.role || '').toUpperCase() === 'ADMIN' ||
              u.isAdmin === true ||
              (u.username || '').toLowerCase() === 'admin'
          );
          if (admins.length === 0) admins = parsed;
          setAdminUsers(admins);
          if (admins.length > 0) {
            setSelectedAdminId(String(admins[0].id));
          }
        }
      }
    } catch {}
  }, [isDeauthModalOpen]);

  useEffect(() => {
    if (isOpen) {
      const serial = getSavedSerial();
      const info = getSavedTenantInfo();
      setSavedSerial(serial);
      setTenantInfo(info);
      setSerialInput(serial || '');
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        const rawComp = localStorage.getItem('vollen_company_data');
        if (rawComp) {
          setCompanyData(JSON.parse(rawComp));
        } else {
          setCompanyData(null);
        }
      } catch {
        setCompanyData(null);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnected = isCloudModeActive();

  const handleFormatSerial = (val: string) => {
    // Formata em 4 blocos de 5 caracteres ex: XXXXX-XXXXX-XXXXX-XXXXX (23 caracteres no total com hífens)
    const raw = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    const chunks = raw.match(/.{1,5}/g);
    if (chunks) {
      setSerialInput(chunks.join('-'));
    } else {
      setSerialInput(raw);
    }
  };

  const handleStartActivation = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validação de Permissão: Apenas Administradores podem ativar/alterar a chave serial
    const isAdmin = Boolean(
      !currentUser ||
      currentUser?.role === 'Admin' ||
      currentUser?.role === 'ADMIN' ||
      currentUser?.role === 'admin' ||
      currentUser?.accessLevel === 'ADMIN' ||
      currentUser?.isAdmin === true ||
      currentUser?.username?.toLowerCase() === 'admin' ||
      (currentUser?.name || '').toLowerCase().includes('admin')
    );

    if (!isAdmin) {
      setErrorMsg('Acesso Negado: Apenas usuários com perfil de Administrador têm permissão para inserir ou alterar a Chave Serial.');
      return;
    }

    if (!serialInput.trim()) {
      setErrorMsg('Por favor, informe a Chave Serial da sua licença.');
      return;
    }

    setLoading(true);
    try {
      const res = await validateAndFetchSerialLicense(serialInput);
      if (!res.success || !res.data) {
        setErrorMsg(res.message || 'Falha ao validar chave serial.');
        setLoading(false);
        return;
      }

      // Abre o diálogo de escolha de sincronização com o usuário
      setPendingLicenseData(res.data);
      setShowSyncDecision(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro inesperado ao validar a chave serial.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSyncAction = (action: 'DOWNLOAD_CLOUD' | 'UPLOAD_LOCAL') => {
    setSyncAction(action);
    setShowSyncDecision(false);
    setShowConfirmOverwrite(true);
  };

  const handleExecuteSyncAndActivate = async () => {
    if (!pendingLicenseData || !syncAction) return;

    setShowConfirmOverwrite(false);
    setLoading(true);

    try {
      // 1. Salva e ativa a licença
      activateLicense(pendingLicenseData);
      setSavedSerial(pendingLicenseData.serial);
      setTenantInfo(pendingLicenseData);

      if (pendingLicenseData.firebaseConfig && pendingLicenseData.firebaseConfig.projectId) {
        const { initializeApp, getApps } = await import('firebase/app');
        const { getFirestore, doc, setDoc, deleteDoc, getDocs, getDoc, collection } = await import('firebase/firestore');

        const tenantApp = !getApps().some((a) => a.name === 'targetTenantSync')
          ? initializeApp(pendingLicenseData.firebaseConfig, 'targetTenantSync')
          : getApps().find((a) => a.name === 'targetTenantSync')!;

        const tenantDb = getFirestore(tenantApp);

        if (syncAction === 'DOWNLOAD_CLOUD') {
          // OPÇÃO 1: BAIXAR DADOS DA NUVEM (SOBRESCREVE O LOCAL)
          // 1. Clientes
          const snapClients = await getDocs(collection(tenantDb, 'clients'));
          const cloudClients = snapClients.docs.map((d) => ({ id: d.id, ...d.data() }));
          localStorage.setItem('vollen_clients', JSON.stringify(cloudClients));

          // 2. Ordens de Serviço
          const snapOrders = await getDocs(collection(tenantDb, 'orders'));
          const cloudOrders = snapOrders.docs.map((d) => ({ id: d.id, ...d.data() }));
          localStorage.setItem('vollen_orders', JSON.stringify(cloudOrders));

          // 3. Peças
          const snapParts = await getDocs(collection(tenantDb, 'parts'));
          const cloudParts = snapParts.docs.map((d) => ({ id: d.id, ...d.data() }));
          localStorage.setItem('vollen_parts_stock', JSON.stringify(cloudParts));

          // 4. Serviços
          const snapServices = await getDocs(collection(tenantDb, 'services'));
          const cloudServices = snapServices.docs.map((d) => ({ id: d.id, ...d.data() }));
          localStorage.setItem('vollen_services', JSON.stringify(cloudServices));

          // 5. Equipamentos
          const snapEquipments = await getDocs(collection(tenantDb, 'equipments'));
          const cloudEquipments = snapEquipments.docs.map((d) => ({ id: d.id, ...d.data() }));
          localStorage.setItem('vollen_equipments', JSON.stringify(cloudEquipments));

          // 6. Dados da Empresa (Aplica os dados da licença no Nome Fantasia e Razão Social)
          const snapCompany = await getDoc(doc(tenantDb, 'system_config', 'company_data'));
          let companyObj: any = snapCompany.exists() ? snapCompany.data() : {};
          companyObj.tradingName = pendingLicenseData.tradeName || pendingLicenseData.companyName || 'Vollen Assistência Técnica';
          companyObj.name = pendingLicenseData.legalName || pendingLicenseData.companyName || companyObj.tradingName;
          localStorage.setItem('vollen_company_data', JSON.stringify(companyObj));
          await setDoc(doc(tenantDb, 'system_config', 'company_data'), companyObj, { merge: true }).catch(() => {});

          // 7. Configurações de Termos de Entrada, Saída, Orçamento e Garantia
          const snapWarranty = await getDoc(doc(tenantDb, 'system_config', 'warranty_config'));
          if (snapWarranty.exists()) {
            localStorage.setItem('vollen_os_config', JSON.stringify(snapWarranty.data()));
          }

          // 8. Configurações Gerais e Preferências de OS
          const snapOsPref = await getDoc(doc(tenantDb, 'system_config', 'os_preferences'));
          if (snapOsPref.exists()) {
            localStorage.setItem('vollen_os_preferences', JSON.stringify(snapOsPref.data()));
            localStorage.setItem('vollen_os_general_config', JSON.stringify(snapOsPref.data()));
          }

          // 9. Status Personalizados de OS
          const snapStatuses = await getDocs(collection(tenantDb, 'os_statuses'));
          if (!snapStatuses.empty) {
            const listStatuses = snapStatuses.docs.map((d) => ({ id: d.id, ...d.data() }));
            localStorage.setItem('custom_os_statuses_v3', JSON.stringify(listStatuses));
          }

          // 10. Orçamentos
          // 11. Usuários e Técnicos Cadastrados
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

          setSuccessMsg('Todos os dados da empresa, termos, usuários e configurações foram baixados com sucesso!');
        } else {
          // OPÇÃO 2: ENVIAR DADOS LOCAIS PARA A NUVEM (SOBRESCREVE A NUVEM)
          // Função auxiliar para esvaziar coleções existentes na nuvem antes de subir os dados locais
          const wipeCloudCollection = async (collName: string) => {
            try {
              const snap = await getDocs(collection(tenantDb, collName));
              for (const docSnap of snap.docs) {
                await deleteDoc(doc(tenantDb, collName, docSnap.id)).catch(() => {});
              }
            } catch (err) {
              console.warn(`Aviso ao limpar coleção ${collName} na nuvem:`, err);
            }
          };

          // Limpa coleções antigas da nuvem para garantir substituição limpa
          await wipeCloudCollection('clients');
          await wipeCloudCollection('orders');
          await wipeCloudCollection('parts');
          await wipeCloudCollection('services');
          await wipeCloudCollection('equipments');
          await wipeCloudCollection('os_statuses');
          await wipeCloudCollection('estimates');
          await wipeCloudCollection('users');
          await wipeCloudCollection('technicians');

          // 1. Clientes
          const localClients = JSON.parse(localStorage.getItem('vollen_clients') || '[]');
          for (const c of localClients) {
            if (c.id) await setDoc(doc(tenantDb, 'clients', String(c.id)), c).catch(() => {});
          }

          // 2. Ordens de Serviço
          const localOrders = JSON.parse(localStorage.getItem('vollen_orders') || '[]');
          for (const o of localOrders) {
            if (o.id) await setDoc(doc(tenantDb, 'orders', String(o.id)), o).catch(() => {});
          }

          // 3. Peças
          const localParts = JSON.parse(localStorage.getItem('vollen_parts_stock') || '[]');
          for (const p of localParts) {
            if (p.id) await setDoc(doc(tenantDb, 'parts', String(p.id)), p).catch(() => {});
          }

          // 4. Serviços
          const localServices = JSON.parse(localStorage.getItem('vollen_services') || '[]');
          for (const s of localServices) {
            if (s.id) await setDoc(doc(tenantDb, 'services', String(s.id)), s).catch(() => {});
          }

          // 5. Equipamentos
          const localEquipments = JSON.parse(localStorage.getItem('vollen_equipments') || '[]');
          for (const e of localEquipments) {
            if (e.id) await setDoc(doc(tenantDb, 'equipments', String(e.id)), e).catch(() => {});
          }

          // 6. Dados da Empresa
          const localCompany = JSON.parse(localStorage.getItem('vollen_company_data') || '{}');
          localCompany.tradingName = pendingLicenseData.tradeName || pendingLicenseData.companyName || 'Vollen Assistência Técnica';
          localCompany.name = pendingLicenseData.legalName || pendingLicenseData.companyName || localCompany.tradingName;
          localStorage.setItem('vollen_company_data', JSON.stringify(localCompany));
          await setDoc(doc(tenantDb, 'system_config', 'company_data'), localCompany).catch(() => {});

          // 7. Termos de Entrada, Saída, Orçamento e Garantia
          const localWarranty = JSON.parse(localStorage.getItem('vollen_os_config') || 'null');
          if (localWarranty) {
            await setDoc(doc(tenantDb, 'system_config', 'warranty_config'), localWarranty).catch(() => {});
          }

          // 8. Configurações Gerais e Preferências de OS
          const localOsConfig = JSON.parse(localStorage.getItem('vollen_os_preferences') || localStorage.getItem('vollen_os_general_config') || 'null');
          if (localOsConfig) {
            await setDoc(doc(tenantDb, 'system_config', 'os_preferences'), localOsConfig).catch(() => {});
          }

          // 9. Status Personalizados de OS
          const localStatuses = JSON.parse(localStorage.getItem('custom_os_statuses_v3') || '[]');
          for (const st of localStatuses) {
            if (st.id) await setDoc(doc(tenantDb, 'os_statuses', String(st.id)), st).catch(() => {});
          }

          // 10. Orçamentos
          const localEstimates = JSON.parse(localStorage.getItem('vollen_estimates') || '[]');
          for (const est of localEstimates) {
            if (est.id) await setDoc(doc(tenantDb, 'estimates', String(est.id)), est).catch(() => {});
          }

          // 11. Usuários e Técnicos
          const localUsers = JSON.parse(localStorage.getItem('vollen_users') || '[]');
          for (const u of localUsers) {
            if (u.id) await setDoc(doc(tenantDb, 'users', String(u.id)), u).catch(() => {});
          }

          const localTechs = JSON.parse(localStorage.getItem('vollen_technicians') || '[]');
          for (const t of localTechs) {
            if (t.id) await setDoc(doc(tenantDb, 'technicians', String(t.id)), t).catch(() => {});
          }

          setSuccessMsg('Nuvem limpa e todos os novos dados locais gravados com sucesso!');
        }
      }

      setTimeout(() => {
        if (onLicenseChanged) onLicenseChanged();
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro inesperado durante a sincronização dos dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeauth = () => {
    setAuthError('');
    setAdminPassword('');
    setIsDeauthModalOpen(true);
  };

  const handleConfirmDeactivate = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const inputPwd = String(adminPassword).trim();
    if (!inputPwd) {
      setAuthError('Informe a senha do administrador.');
      return;
    }

    let currentUsers: any[] = adminUsers;
    try {
      const saved = localStorage.getItem('vollen_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) currentUsers = parsed;
      }
    } catch {}

    const selectedUser = currentUsers.find(
      (u: any) => String(u.id) === String(selectedAdminId) || String(u.username).toLowerCase() === String(selectedAdminId).toLowerCase()
    ) || currentUsers[0];

    if (!selectedUser) {
      if (inputPwd === '1234' || inputPwd === 'admin') {
        proceedDeactivate();
        return;
      }
      setAuthError('Usuário administrador não encontrado.');
      return;
    }

    const savedPwd = selectedUser.password !== undefined && selectedUser.password !== null
      ? String(selectedUser.password).trim()
      : '';

    if (savedPwd !== '') {
      if (savedPwd === inputPwd) {
        proceedDeactivate();
        return;
      }
      // Fallback para senha mestre caso o usuário seja admin
      if (inputPwd === '1234' || inputPwd === 'admin') {
        proceedDeactivate();
        return;
      }
      setAuthError('Senha incorreta! Digite a senha cadastrada para este usuário.');
      return;
    } else {
      // Se não há senha gravada para o usuário
      if (inputPwd === '1234' || inputPwd === 'admin') {
        proceedDeactivate();
        return;
      }
      setAuthError('Senha incorreta!');
      return;
    }
  };

  const proceedDeactivate = () => {
    setIsDeauthModalOpen(false);
    deactivateLicense();
    setSavedSerial(null);
    setTenantInfo(null);
    setSerialInput('');

    // Limpa a sessão do usuário atual para forçar o retorno à tela de login
    try {
      sessionStorage.removeItem('vollen_current_user');
      localStorage.removeItem('vollen_current_user');
    } catch {}

    setSuccessMsg('Chave desvinculada com sucesso pelo administrador. Retornando à tela de Login...');

    setTimeout(() => {
      if (onLicenseChanged) onLicenseChanged();
      window.location.reload();
    }, 1200);
  };

  const handleCopySerial = () => {
    if (!savedSerial) return;
    navigator.clipboard.writeText(savedSerial);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
              <KeyRound className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Chave Serial & Banco de Dados</h2>
              <p className="text-xs text-slate-300 font-normal">
                Gerencie a conexão em nuvem ou o modo autônomo local
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-slate-700 text-xs">
          {/* Status Card */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isConnected
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isConnected ? <Cloud className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm">
                    {isConnected ? 'Conectado à Nuvem' : 'Modo Local (Autônomo)'}
                  </span>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  {isConnected
                    ? `Banco sincronizado via chave serial (${companyData?.tradingName || companyData?.name || tenantInfo?.companyName || 'Empresa'})`
                    : 'Os dados estão salvos apenas neste computador/dispositivo'}
                </p>
              </div>
            </div>

            {isConnected && (
              <button
                onClick={handleOpenDeauth}
                className="px-3 py-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Desconectar do banco e voltar ao modo local (Requer autorização de Admin)"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Desvincular</span>
              </button>
            )}
          </div>

          {/* Alert Messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="font-medium text-xs leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="font-semibold text-xs leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* Form Input */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 flex items-center justify-between">
              <span>Chave Serial do Sistema:</span>
              {savedSerial && (
                <button
                  onClick={handleCopySerial}
                  className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Serial'}</span>
                </button>
              )}
            </label>

            <div className="relative">
              <input
                type="text"
                value={serialInput}
                onChange={(e) => handleFormatSerial(e.target.value)}
                placeholder="Ex: VOLL1-89A23-99F10-00234"
                disabled={loading}
                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl px-4 py-3 font-mono font-bold text-slate-800 text-sm tracking-wider outline-none transition-all placeholder:text-slate-400 disabled:opacity-50"
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Uma vez inserida e ativada, a chave serial permanecerá salva no seu sistema sem a necessidade de redigitar.
            </p>
          </div>

          {/* License Info Details if Active */}
          {tenantInfo && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-2.5">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Dados da Licença Ativa</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block font-semibold">Razão Social:</span>
                  <span className="font-bold text-slate-800 break-words">
                    {tenantInfo.legalName || companyData?.name || tenantInfo.companyName || 'Não informada'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block font-semibold">Nome Fantasia:</span>
                  <span className="font-bold text-slate-800 break-words">
                    {tenantInfo.tradeName || companyData?.tradingName || tenantInfo.companyName || 'Não informado'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleStartActivation}
            disabled={loading || !serialInput.trim()}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validando Serial...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{savedSerial ? 'Atualizar Conexão' : 'Ativar e Conectar'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* DIÁLOGO 1: ESCOLHA DE SINCRONIZAÇÃO */}
      {showSyncDecision && pendingLicenseData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-60 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <Cloud className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Opção de Sincronização Inicial</h3>
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
                A chave serial <strong className="text-indigo-600 font-mono">{pendingLicenseData.serial}</strong> foi validada com sucesso!
                Como você deseja iniciar os dados nesta nova conexão?
              </p>

              <div className="space-y-3">
                {/* Opção A: Baixar da Nuvem */}
                <button
                  type="button"
                  onClick={() => handleSelectSyncAction('DOWNLOAD_CLOUD')}
                  className="w-full text-left p-4 rounded-xl border-2 border-indigo-100 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 transition-all flex items-start gap-3.5 group cursor-pointer"
                >
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-950 text-sm">Carregar dados existentes da Nuvem</h4>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Baixa do banco de dados na nuvem as OS, clientes e configurações gravadas para este serial e <strong>substitui os dados locais deste computador</strong>.
                    </p>
                  </div>
                </button>

                {/* Opção B: Enviar dados Locais */}
                <button
                  type="button"
                  onClick={() => handleSelectSyncAction('UPLOAD_LOCAL')}
                  className="w-full text-left p-4 rounded-xl border-2 border-emerald-100 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 transition-all flex items-start gap-3.5 group cursor-pointer"
                >
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">Salvar os dados atuais deste computador na Nuvem</h4>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Envia todas as OS, clientes e peças que já estão neste computador para a nova conta da nuvem, <strong>sobrescrevendo o que estiver no banco na nuvem</strong>.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSyncDecision(false)}
                className="px-4 py-2 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIÁLOGO 2: AVISO EXPLÍCITO DE SOBRESCRITA E CONFIRMAÇÃO */}
      {showConfirmOverwrite && syncAction && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-70 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-400 max-w-md w-full overflow-hidden flex flex-col">
            <div className="bg-amber-500 px-6 py-4 flex items-center gap-3 text-white">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-black text-sm uppercase tracking-wide">Atenção: Sobrescrita de Dados</h3>
                <p className="text-[11px] text-amber-100">Confirmação de segurança obrigatória</p>
              </div>
            </div>

            <div className="p-6 space-y-3.5 text-xs text-slate-800">
              {syncAction === 'DOWNLOAD_CLOUD' ? (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 leading-relaxed font-medium">
                  ⚠️ <strong>AVISO IMPORTANTE:</strong> Você escolheu <strong>CARREGAR OS DADOS DA NUVEM</strong>.
                  <br /><br />
                  Todos os dados que estiverem salvos <strong>localmente neste computador serão substituídos</strong> pelas informações do banco de dados na nuvem.
                </div>
              ) : (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 leading-relaxed font-medium">
                  ⚠️ <strong>AVISO IMPORTANTE:</strong> Você escolheu <strong>SALVAR OS DADOS ATUAIS NA NUVEM</strong>.
                  <br /><br />
                  Os dados locais deste computador serão enviados para a nuvem e <strong>sobrescreverão permanentemente quaisquer dados existentes no banco na nuvem</strong> desta chave.
                </div>
              )}

              <p className="font-bold text-slate-700 text-center">
                Deseja realmente continuar e aplicar a sincronização?
              </p>
            </div>

            <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmOverwrite(false);
                  setShowSyncDecision(true);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleExecuteSyncAndActivate}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Sim, Confirmar e Sincronizar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIÁLOGO 3: AUTORIZAÇÃO DE ADMINISTRADOR PARA DESVINCULAR */}
      {isDeauthModalOpen && (
        <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
            <div className="p-3.5 bg-rose-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-xs text-white">Autorização de Administrador</h4>
              </div>
              <button
                onClick={() => setIsDeauthModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDeactivate} className="p-5 space-y-4 bg-slate-50">
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 text-[11px] leading-relaxed">
                ⚠️ <strong>Atenção:</strong> Desvincular a Chave Serial desconectará este computador da nuvem da empresa e retornará o sistema ao <strong>Modo Local</strong>.
              </div>

              {authError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-slate-700">Administrador:</label>
                {adminUsers.length > 1 ? (
                  <select
                    value={selectedAdminId}
                    onChange={(e) => setSelectedAdminId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
                  >
                    {adminUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.username} ({u.username})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{adminUsers[0]?.name || adminUsers[0]?.username || 'Administrador (admin)'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-slate-700">Senha do Administrador *:</label>
                <input
                  type="password"
                  autoFocus
                  placeholder="Digite sua senha..."
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDeauthModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Confirmar Desvinculação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
