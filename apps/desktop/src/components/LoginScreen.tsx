import React, { useEffect, useState } from 'react';
import { Wrench, Lock, User, LogIn, Power, AlertCircle, Loader2 } from 'lucide-react';
import { fetchUsers, loginUser } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
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

    // Se o usuário tem senha cadastrada, valida a correspondência exata
    const registeredPassword = matchedUser.password !== undefined && matchedUser.password !== null
      ? String(matchedUser.password).trim()
      : '';
    const inputPassword = String(password).trim();

    if (registeredPassword !== '') {
      if (registeredPassword !== inputPassword) {
        setLoading(false);
        setErrorMsg('Senha incorreta! Digite a senha cadastrada para este usuário.');
        return;
      }
    } else {
      // Se não há senha gravada ainda (ex: usuário padrão inicial), aceita '1234' ou 'admin'
      if (inputPassword !== '1234' && inputPassword !== 'admin') {
        setLoading(false);
        setErrorMsg('Senha incorreta! Digite a senha cadastrada.');
        return;
      }
    }

    const isRoleAdmin = (matchedUser.role || 'Admin').toUpperCase() === 'ADMIN' || (matchedUser.username || '').toLowerCase() === 'admin';
    const userRole = isRoleAdmin ? 'Admin' : matchedUser.role;

    // Permissões totais irrestritas se for administrador
    const adminPermissions = {
      createOS: true,
      editOS: true,
      cancelOS: true,
      finalizeOS: true,
      viewOpenOrders: true,
      viewFinishedOrders: true,
      manageClients: true,
      manageParts: true,
      manageServices: true,
      manageEquipments: true,
      manageTechnicians: true,
      manageOrderStatus: true,
      manageUsers: true,
      accessBackup: true,
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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Vollen - Gestão de OS</h1>
          <p className="text-sm text-slate-500 mt-1">Identifique-se para acessar o sistema</p>
        </div>

        {errorMsg ? (
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
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white transition-all appearance-none cursor-pointer uppercase"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white transition-all"
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
              disabled={loading}
              className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all cursor-pointer active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
