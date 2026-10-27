import React, { useEffect, useState } from 'react';
import { Wrench, Lock, User, LogIn, Power, AlertCircle, Loader2, KeyRound, Play, HelpCircle } from 'lucide-react';
import { fetchUsers, loginUser } from '../services/api';
import { WelcomeFirstAccessModal } from './WelcomeFirstAccessModal';
import { TerminalOfflineModal } from './TerminalOfflineModal';
import { getLocalNetworkConfig, subscribeNetworkStatus, testServerConnection, fetchAndApplyServerData } from '../services/localNetworkService';
import { getCurrentFeatures } from '../config/appFeatures';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
  onOpenSerialModal?: () => void;
  onStartTrial?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onOpenSerialModal,
  onStartTrial,
}) => {
  const [isFirstAccessModalOpen, setIsFirstAccessModalOpen] = useState<boolean>(() => {
    try {
      const dismissed = localStorage.getItem('system_first_access_dismissed');
      return !dismissed;
    } catch {
      return false;
    }
  });
  const [users, setUsers] = useState<Array<{ id: string; username: string; name: string; role: string }>>(() => {
    try {
      const saved = localStorage.getItem('vollen_users');
      if (saved) {
        const parsedUsers = JSON.parse(saved);
        if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
          return parsedUsers.map((u: any) => ({
            id: String(u.id),
            username: u.username || u.name || 'ADMIN',
            name: u.name || u.username || 'ADMINISTRADOR',
            role: u.role || 'Admin',
          }));
        }
      }
    } catch (err) {}
    // Padrão inicial caso não haja usuários salvos ainda
    const defaultInit = [
      { id: '1', username: 'admin', name: 'Administrador', role: 'Admin' },
    ];
    try {
      localStorage.setItem('vollen_users', JSON.stringify([
        { id: '1', username: 'admin', name: 'Administrador', role: 'Admin', password: '1234' }
      ]));
    } catch (e) {}
    return defaultInit;
  });

  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('vollen_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const admin = parsed.find((u: any) => (u.username || '').toLowerCase() === 'admin' || (u.name && u.name.includes('Administrador'))) || parsed[0];
          return String(admin.id);
        }
      }
    } catch (err) {}
    return '1';
  });

  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [closed, setClosed] = useState<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Contador regressivo do Lockout de 10 segundos
  useEffect(() => {
    let timer: any;
    if (lockoutRemaining > 0) {
      timer = setInterval(() => {
        setLockoutRemaining((prev) => {
          if (prev <= 1) {
            setErrorMsg('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  // Monitoramento do estado da conexão com o Servidor Local
  const [isTerminalOffline, setIsTerminalOffline] = useState<boolean>(() => {
    const cfg = getLocalNetworkConfig();
    return cfg.mode === 'client'; // Inicia checando se for modo cliente
  });
  const [networkConfig, setNetworkConfig] = useState(getLocalNetworkConfig);

  useEffect(() => {
    const unsub = subscribeNetworkStatus((netStatus) => {
      setNetworkConfig({
        mode: netStatus.mode,
        syncStrategy: 'hybrid',
        serverIp: netStatus.serverIp,
        serverPort: netStatus.serverPort,
      });

      if (netStatus.mode === 'client') {
        setIsTerminalOffline(!netStatus.connected);
      } else {
        setIsTerminalOffline(false);
      }
    });

    // Teste inicial rápido se for modo cliente
    const cfg = getLocalNetworkConfig();
    if (cfg.mode === 'client') {
      testServerConnection(cfg.serverIp, cfg.serverPort).then((res) => {
        setIsTerminalOffline(!res.success);
        if (res.success) {
          fetchAndApplyServerData();
        }
      });
    }

    return () => unsub();
  }, []);

  useEffect(() => {
    // Sincroniza usuários do localStorage ou Firestore
    let localUsers: any[] = [];
    try {
      const saved = localStorage.getItem('vollen_users');
      if (saved) {
        const parsedUsers = JSON.parse(saved);
        if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
          localUsers = parsedUsers.map((u: any) => ({
            id: String(u.id),
            username: u.username || u.name || 'ADMIN',
            name: u.name || u.username || 'ADMINISTRADOR',
            role: u.role || 'Admin',
          }));
        }
      }
    } catch (err) { }

    if (localUsers.length === 0) {
      localUsers = [{ id: '1', username: 'admin', name: 'Administrador', role: 'Admin' }];
      try {
        localStorage.setItem('vollen_users', JSON.stringify([
          { id: '1', username: 'admin', name: 'Administrador', role: 'Admin', password: '1234' }
        ]));
      } catch (e) {}
    }

    setUsers(localUsers);
    const adminUser = localUsers.find((u: any) => (u.username || '').toLowerCase() === 'admin' || (u.name && u.name.includes('Administrador'))) || localUsers[0];
    if (adminUser) {
      setSelectedUserId(String(adminUser.id));
    }

    // Busca usuários atualizados na nuvem Firestore
    import('../services/firebase').then(({ db }) => {
      import('firebase/firestore').then(({ collection, getDocs }) => {
        getDocs(collection(db, 'users'))
          .then((snap) => {
            if (!snap.empty) {
              const cloudUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
              try {
                localStorage.setItem('vollen_users', JSON.stringify(cloudUsers));
              } catch (e) {}
              const formatted = cloudUsers.map((u: any) => ({
                id: String(u.id),
                username: u.username || u.name || 'ADMIN',
                name: u.name || u.username || 'ADMINISTRADOR',
                role: u.role || 'Admin',
              }));
              setUsers(formatted);
              const adminUserCloud = formatted.find((u: any) => (u.username || '').toLowerCase() === 'admin' || (u.name && u.name.includes('Administrador'))) || formatted[0];
              if (adminUserCloud) setSelectedUserId(String(adminUserCloud.id));
            }
          })
          .catch(() => {});
      });
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutRemaining > 0) {
      setErrorMsg(`Sistema bloqueado por excesso de tentativas. Aguarde ${lockoutRemaining}s para tentar novamente.`);
      return;
    }

    if (!selectedUserId) {
      setErrorMsg('Selecione um usuário.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Informe a senha de acesso.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    // Pequeno delay proposital (300ms) para mitigar scripts automatizados de força bruta
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Busca o usuário exclusivamente na lista cadastrada em Gestão de Usuários (vollen_users)
    let savedUsers: any[] = [];
    try {
      const saved = localStorage.getItem('vollen_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) savedUsers = parsed;
      }
    } catch (err) {}

    const matchedUser = savedUsers.find((u: any) => String(u.id) === String(selectedUserId));

    if (!matchedUser) {
      setLoading(false);
      setErrorMsg('Usuário não encontrado na Gestão de Usuários.');
      return;
    }

    // Validação de senha case-insensitive (sem distinção entre maiúsculas e minúsculas)
    const registeredPassword = matchedUser.password !== undefined && matchedUser.password !== null
      ? String(matchedUser.password).trim().toLowerCase()
      : '';
    const inputPassword = String(password).trim().toLowerCase();

    let isPasswordCorrect = false;

    if (registeredPassword !== '') {
      isPasswordCorrect = (registeredPassword === inputPassword);
    } else {
      // Se não há senha gravada ainda (ex: usuário padrão inicial), aceita '1234' ou 'admin'
      isPasswordCorrect = (inputPassword === '1234' || inputPassword === 'admin');
    }

    if (!isPasswordCorrect) {
      setLoading(false);
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);

      if (newFails >= 5) {
        setLockoutRemaining(10); // Bloqueio temporário de 10 segundos
        setFailedAttempts(0);
        setErrorMsg('Muitas tentativas incorretas! Tela de login bloqueada por 10 segundos.');
      } else {
        const remaining = 5 - newFails;
        setErrorMsg(`Senha incorreta! (${remaining} tentativa${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''} antes do bloqueio).`);
      }
      return;
    }

    // Sucesso: zera contador de falhas e lockout
    setFailedAttempts(0);
    setLockoutRemaining(0);

    const isRoleAdmin = (matchedUser.role || 'Admin').toUpperCase() === 'ADMIN' || (matchedUser.username || '').toLowerCase() === 'admin';
    const userRole = isRoleAdmin ? 'Admin' : matchedUser.role;

    // Permissões totais irrestritas se for administrador
    const adminPermissions = {
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
    };

    setLoading(false);
    onLoginSuccess({
      id: String(matchedUser.id),
      username: (matchedUser.username || matchedUser.name || 'ADMIN').toUpperCase(),
      name: matchedUser.name || matchedUser.username || 'ADMINISTRADOR',
      role: userRole,
      permissions: isRoleAdmin ? adminPermissions : (matchedUser.permissions || adminPermissions),
    });
  };

  useEffect(() => {
    // Garante que o aplicativo inicie maximizado
    (async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();
        if (appWindow) {
          await appWindow.maximize();
        }
      } catch {}
    })();
  }, []);

  const handleClose = async () => {
    // 1. Encerramento oficial do aplicativo no Tauri v2 via @tauri-apps/plugin-process
    try {
      const { exit } = await import('@tauri-apps/plugin-process');
      await exit(0);
      return;
    } catch (e) {
      console.warn('Erro ao chamar plugin-process exit:', e);
    }

    // 2. Tenta fechar ou destruir a janela atual do Tauri
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      if (appWindow) {
        try {
          await appWindow.destroy();
          return;
        } catch {
          await appWindow.close();
          return;
        }
      }
    } catch (err) {
      console.warn('Não foi possível fechar via Tauri window API:', err);
    }

    // 3. Fallback invocando IPC direto do Tauri
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        try {
          await invoke('plugin:process|exit', { code: 0 });
          return;
        } catch {
          await invoke('plugin:window|close');
          return;
        }
      }
    } catch (e) {}

    // 4. Fallback caso esteja rodando diretamente no navegador web
    setClosed(true);
    try {
      window.close();
    } catch {}
  };

  if (closed) {
    return (
      <div className="fixed inset-0 z-[99999] bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center bg-white border border-slate-200 p-8 rounded-3xl max-w-sm shadow-2xl">
          <Power className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Aplicação Encerrada</h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Você encerrou a sessão do sistema. A janela do aplicativo foi fechada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-slate-200 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl relative">
        {/* Header do Modal de Login */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-600/20">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            {getCurrentFeatures().edition === 'v4.0.0' ? 'Vollen - Gestão de OS e Vendas V4' : `Vollen - Gestão de OS ${getCurrentFeatures().edition === 'v1.0.0' ? '' : getCurrentFeatures().edition === 'v2.0.0' ? 'V2' : 'V3'}`}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Identifique-se para acessar o sistema</p>
        </div>

        {lockoutRemaining > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-xl text-xs flex items-center gap-2.5 font-bold shadow-xs animate-pulse">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-950">Acesso temporariamente suspenso</p>
              <p className="text-[11px] text-amber-800 font-medium">Aguarde <strong>{lockoutRemaining} segundo{lockoutRemaining > 1 ? 's' : ''}</strong> para nova tentativa.</p>
            </div>
          </div>
        )}

        {errorMsg && lockoutRemaining === 0 ? (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Dropdown Usuários Cadastrados */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-sky-700" />
              Usuário
            </label>
            <div className="relative">
              <select
                disabled={lockoutRemaining > 0}
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white transition-all appearance-none cursor-pointer uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="uppercase font-bold">
                    {(u.username || u.name).toUpperCase()}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-3.5 pointer-events-none text-slate-500 text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* Campo Senha */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-sky-700" />
              Senha de Acesso
            </label>
            <input
              type="password"
              required
              disabled={lockoutRemaining > 0}
              maxLength={16}
              value={password}
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                setPassword(val);
              }}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Botões Entrar e Fechar */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-slate-300 transition-all cursor-pointer"
            >
              <Power className="w-4 h-4 text-red-600" />
              Fechar
            </button>

            <button
              type="submit"
              disabled={loading || lockoutRemaining > 0}
              className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all cursor-pointer active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {lockoutRemaining > 0 ? `Bloqueado (${lockoutRemaining}s)` : 'Entrar'}
            </button>
          </div>
        </form>

        {/* Links Rápidos: Ajuda de Primeiro Acesso e Registro de Licença */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setIsFirstAccessModalOpen(true)}
            className="text-slate-500 hover:text-sky-600 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
            <span>Primeiro Acesso / Ajuda</span>
          </button>

          {onOpenSerialModal && (
            <button
              type="button"
              onClick={onOpenSerialModal}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Inserir Serial</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal de Primeiro Acesso Automático */}
      <WelcomeFirstAccessModal
        isOpen={isFirstAccessModalOpen}
        onClose={() => setIsFirstAccessModalOpen(false)}
        onOpenSerialModal={() => {
          if (onOpenSerialModal) onOpenSerialModal();
        }}
        onStartTrial={() => {
          if (onStartTrial) onStartTrial();
        }}
      />

      {/* Modal Bloqueador Inegociável quando o Servidor Principal estiver Offline no Terminal */}
      <TerminalOfflineModal
        isOffline={isTerminalOffline}
        serverIp={networkConfig.serverIp}
        serverPort={networkConfig.serverPort}
        onRetryConnection={async () => {
          const currentConfig = getLocalNetworkConfig();
          if (currentConfig.mode !== 'client') {
            setIsTerminalOffline(false);
            return;
          }
          const res = await testServerConnection(currentConfig.serverIp, currentConfig.serverPort);
          if (res.success) {
            setIsTerminalOffline(false);
            fetchAndApplyServerData();
          }
        }}
      />
    </div>
  );
};
