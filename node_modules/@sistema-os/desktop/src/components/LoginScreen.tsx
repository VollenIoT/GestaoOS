import React, { useEffect, useState } from 'react';
import { Wrench, Lock, User, LogIn, Power, AlertCircle, Loader2 } from 'lucide-react';
import { fetchUsers, loginUser } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [users, setUsers] = useState<Array<{ id: string; username: string; name: string; role: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [closed, setClosed] = useState<boolean>(false);

  useEffect(() => {
    let localUsers: any[] = [];
    try {
      const saved = localStorage.getItem('vollen_users');
      if (saved) {
        const parsedUsers = JSON.parse(saved);
        if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
          localUsers = parsedUsers.map((u: any) => ({
            id: String(u.id),
            username: u.username || u.name,
            name: u.name || u.username,
            role: u.role,
          }));
        }
      }
    } catch (err) { }

    if (localUsers.length > 0) {
      setUsers(localUsers);
      const adminUser = localUsers.find((u: any) => u.username === 'admin' || (u.name && u.name.includes('Administrador'))) || localUsers[0];
      setSelectedUserId(String(adminUser.id));
    } else {
      const initialUsers = [
        { id: '1', username: 'admin', name: 'Administrador', role: 'Admin', password: '1234' },
      ];
      try {
        localStorage.setItem('vollen_users', JSON.stringify(initialUsers));
      } catch (err) {}
      setUsers(initialUsers);
      setSelectedUserId('1');
    }
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
    const registeredPassword = matchedUser.password;
    if (registeredPassword !== undefined && registeredPassword !== null && registeredPassword !== '') {
      if (registeredPassword !== password) {
        setLoading(false);
        setErrorMsg('Senha incorreta! Digite a senha cadastrada para este usuário.');
        return;
      }
    } else {
      // Se não há senha gravada ainda (ex: usuário padrão inicial), aceita '1234' ou 'admin'
      if (password !== '1234' && password !== 'admin') {
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

  const handleClose = async () => {
    try {
      // Se estiver rodando dentro do aplicativo nativo Tauri Desktop
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch {
      // Fallback para navegador web
      setClosed(true);
      window.close();
    }
  };

  if (closed) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center bg-white border border-slate-200 p-8 rounded-2xl max-w-sm shadow-xl">
          <Power className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Aplicação Encerrada</h2>
          <p className="text-sm text-slate-500">
            Você encerrou a sessão. Pode fechar esta aba ou janela com segurança.
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
