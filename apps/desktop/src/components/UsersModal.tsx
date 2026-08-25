import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Trash2, KeyRound, UserCheck, Shield, User, Lock, Edit3, CheckSquare, Square } from 'lucide-react';

export interface UserPermissions {
  createOS: boolean;
  editOS: boolean;
  cancelOS: boolean;
  finalizeOS: boolean;
  viewOpenOrders: boolean;
  viewFinishedOrders: boolean;
  manageClients: boolean;
  manageParts: boolean;
  manageServices: boolean;
  manageEquipments: boolean;
  manageTechnicians: boolean;
  manageOrderStatus: boolean;
  manageUsers: boolean;
  accessBackup: boolean;
}

export interface UserItem {
  id: string;
  username: string;
  name: string;
  role: 'Admin' | 'Técnico' | 'Atendimento' | 'Personalizado';
  permissions: UserPermissions;
}

interface UsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
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

const DEFAULT_TECNICO_PERMISSIONS: UserPermissions = {
  createOS: true,
  editOS: true,
  cancelOS: false,
  finalizeOS: true,
  viewOpenOrders: true,
  viewFinishedOrders: true,
  manageClients: true,
  manageParts: true,
  manageServices: true,
  manageEquipments: true,
  manageTechnicians: false,
  manageOrderStatus: false,
  manageUsers: false,
  accessBackup: false,
};

const DEFAULT_ATENDIMENTO_PERMISSIONS: UserPermissions = {
  createOS: true,
  editOS: false,
  cancelOS: false,
  finalizeOS: false,
  viewOpenOrders: true,
  viewFinishedOrders: true,
  manageClients: true,
  manageParts: false,
  manageServices: false,
  manageEquipments: true,
  manageTechnicians: false,
  manageOrderStatus: false,
  manageUsers: false,
  accessBackup: false,
};

export const UsersModal: React.FC<UsersModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<UserItem[]>(() => {
    const defaultList: UserItem[] = [
      {
        id: '1',
        username: 'admin',
        name: 'Administrador',
        role: 'Admin',
        permissions: DEFAULT_ADMIN_PERMISSIONS,
      },
    ];
    try {
      const saved = localStorage.getItem('vollen_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {}
    return defaultList;
  });

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('vollen_users');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const normalized = parsed.map((u: any) => ({
              ...u,
              permissions: (u.role === 'Admin' || (u.username || '').toLowerCase() === 'admin')
                ? DEFAULT_ADMIN_PERMISSIONS
                : (u.permissions || DEFAULT_ATENDIMENTO_PERMISSIONS),
            }));
            setUsers(normalized);
          }
        }
      } catch (err) {}
    }
  }, [isOpen]);

  const saveUsersToStorage = (newUsers: UserItem[]) => {
    setUsers(newUsers);
    try {
      localStorage.setItem('vollen_users', JSON.stringify(newUsers));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Erro ao gravar vollen_users:', err);
    }
  };

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'Atendimento' as 'Admin' | 'Técnico' | 'Atendimento' | 'Personalizado',
    permissions: DEFAULT_ATENDIMENTO_PERMISSIONS,
  });

  useEffect(() => {
    if (!isOpen) {
      setIsFormOpen(false);
      setSelectedUserId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRoleChange = (role: 'Admin' | 'Técnico' | 'Atendimento' | 'Personalizado') => {
    let perms = { ...formData.permissions };
    if (role === 'Admin') perms = { ...DEFAULT_ADMIN_PERMISSIONS };
    else if (role === 'Técnico') perms = { ...DEFAULT_TECNICO_PERMISSIONS };
    else if (role === 'Atendimento') perms = { ...DEFAULT_ATENDIMENTO_PERMISSIONS };

    setFormData((prev) => ({
      ...prev,
      role,
      permissions: perms,
    }));
  };

  const togglePermission = (key: keyof UserPermissions) => {
    if (formData.role === 'Admin') return; // Admin sempre possui acesso total
    setFormData((prev) => ({
      ...prev,
      role: 'Personalizado',
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const handleOpenNewUser = () => {
    setFormData({
      id: '',
      name: '',
      username: '',
      password: '',
      confirmPassword: '',
      role: 'Atendimento',
      permissions: DEFAULT_ATENDIMENTO_PERMISSIONS,
    });
    setIsFormOpen(true);
  };

  const handleOpenEditUser = (user: UserItem) => {
    const isAdmin = (user.role === 'Admin') || (user.username || '').toLowerCase() === 'admin';
    setFormData({
      id: user.id,
      name: user.name,
      username: user.username,
      password: '',
      confirmPassword: '',
      role: isAdmin ? 'Admin' : user.role,
      permissions: isAdmin ? DEFAULT_ADMIN_PERMISSIONS : (user.permissions || DEFAULT_ATENDIMENTO_PERMISSIONS),
    });
    setIsFormOpen(true);
  };

  const handleDeleteUser = (userId: string, username: string) => {
    if (username.toLowerCase() === 'admin') {
      alert('O usuário Administrador principal não pode ser excluído.');
      return;
    }
    if (confirm(`Deseja realmente excluir o usuário "${username}"?`)) {
      const updated = users.filter((u) => u.id !== userId);
      saveUsersToStorage(updated);
      setSelectedUserId(null);
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.username.trim()) {
      alert('Por favor, preencha o Nome e o Usuário.');
      return;
    }

    if (!formData.id && !formData.password) {
      alert('Por favor, defina uma senha para o novo usuário.');
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      alert('As senhas digitadas não conferem!');
      return;
    }

    if (formData.id) {
      // Editar existente
      const updated = users.map((u) =>
        u.id === formData.id
          ? {
            ...u,
            name: formData.name,
            username: formData.username,
            role: formData.role,
            password: formData.password || (u as any).password,
            permissions: formData.role === 'Admin' ? DEFAULT_ADMIN_PERMISSIONS : formData.permissions,
          }
          : u
      );
      saveUsersToStorage(updated);
      alert(`Usuário "${formData.username}" atualizado com sucesso!`);
    } else {
      // Criar novo
      const newUser: UserItem & { password?: string } = {
        id: String(Date.now()),
        name: formData.name,
        username: formData.username,
        role: formData.role,
        password: formData.password,
        permissions: formData.role === 'Admin' ? DEFAULT_ADMIN_PERMISSIONS : formData.permissions,
      };
      const updated = [...users, newUser];
      saveUsersToStorage(updated);
      alert(`Usuário "${formData.username}" cadastrado com sucesso!`);
    }

    setIsFormOpen(false);
  };

  const handleCloseModal = () => {
    setIsFormOpen(false);
    setSelectedUserId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header do Modal */}
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-sky-700" />
            Gestão de Usuários e Permissões de Acesso
          </h2>
          <button onClick={handleCloseModal} className="text-slate-600 hover:text-slate-900 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 bg-slate-50 text-xs">
          {!isFormOpen ? (
            <>
              {/* Topo com Ações */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">
                  Usuários cadastrados e níveis de permissão ({users.length}):
                </span>
                <button
                  onClick={handleOpenNewUser}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  Cadastrar Novo Usuário
                </button>
              </div>

              {/* Tabela de Usuários */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-200 text-slate-800 font-bold uppercase">
                    <tr>
                      <th className="p-3 border-b border-slate-300">Nome Completo</th>
                      <th className="p-3 border-b border-slate-300">Usuário (Login)</th>
                      <th className="p-3 border-b border-slate-300">Nível / Perfil</th>
                      <th className="p-3 border-b border-slate-300 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedUserId(u.id)}
                        className={`transition-colors cursor-pointer ${selectedUserId === u.id ? 'bg-sky-100/80 font-semibold' : 'hover:bg-slate-50'
                          }`}
                      >
                        <td className="p-3 font-bold text-slate-800 flex items-center gap-2">
                          <User className="w-4 h-4 text-sky-600" />
                          {u.name}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700">{u.username}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${u.role === 'Admin'
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : u.role === 'Técnico'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-200 text-slate-700'
                              }`}
                          >
                            {u.role === 'Admin' ? '👑 Administrador (Acesso Total)' : u.role}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditUser(u);
                              }}
                              className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 shadow-sm"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Editar Permissões
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteUser(u.id, u.username);
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg font-bold flex items-center gap-1 shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* Form de Cadastro e Edição de Usuário com Seleção de Permissões */
            <form onSubmit={handleSaveUser} className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-600" />
                {formData.id ? 'Editar Usuário e Definição de Permissões' : 'Cadastrar Novo Usuário com Permissões Personalizadas'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: João da Silva"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome de Usuário (Login)</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Ex: joao.silva"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Perfil Base de Acesso</label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleRoleChange(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-sky-600"
                  >
                    <option value="Admin">👑 Admin (Acesso Total e Irrestrito)</option>
                    <option value="Técnico">🛠️ Técnico (OS + Clientes)</option>
                    <option value="Atendimento">📞 Atendimento (Apenas Criar OS)</option>
                    <option value="Personalizado">⚙️ Personalizado (Permissões Escolhidas)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {formData.id ? 'Nova Senha (deixe em branco para manter)' : 'Senha de Acesso'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Confirmar Senha</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              {/* SEÇÃO DE ESCOLHA DE PERMISSÕES INDIVIDUAIS DO USUÁRIO */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">
                    Permissões de Acesso do Sistema:
                  </span>
                  {formData.role === 'Admin' && (
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      O usuário Admin possui todas as permissões ativas por padrão.
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-slate-100 p-3.5 rounded-xl border border-slate-200">
                  {/* OPERAÇÕES DE ORDEM DE SERVIÇO */}
                  <div
                    onClick={() => togglePermission('createOS')}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${formData.permissions?.createOS
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                      }`}
                  >
                    <span>Criar Novas Ordens de Serviço</span>
                    {formData.permissions?.createOS ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div
                    onClick={() => togglePermission('editOS')}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${formData.permissions?.editOS
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                      }`}
                  >
                    <span>Editar Ordens de Serviço Existentest</span>
                    {formData.permissions?.editOS ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div
                    onClick={() => togglePermission('cancelOS')}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${formData.permissions?.cancelOS
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                      }`}
                  >
                    <span>Cancelar Ordens de Serviço</span>
                    {formData.permissions?.cancelOS ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div
                    onClick={() => togglePermission('finalizeOS')}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${formData.permissions?.finalizeOS
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                      }`}
                  >
                    <span>Finalizar Ordens de Serviço</span>
                    {formData.permissions?.finalizeOS ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div
                    onClick={() => togglePermission('viewOpenOrders')}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${formData.permissions?.viewOpenOrders
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                      }`}
                  >
                    <span>Visualizar OS em Aberto</span>
                    {formData.permissions?.viewOpenOrders ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div
                    onClick={() => togglePermission('viewFinishedOrders')}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${formData.permissions?.viewFinishedOrders
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                      }`}
                  >
                    <span>Visualizar OS Finalizadas</span>
                    {formData.permissions?.viewFinishedOrders ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  {/* CADASTROS E CENTRAIS */}
                  <div
                    onClick={() => togglePermission('manageClients')}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${formData.permissions?.manageClients
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                      }`}
                  >
                    <span>Central de Clientes Cadastrados</span>
                    {formData.permissions?.manageClients ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div
                    onClick={() => togglePermission('manageParts')}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${formData.permissions?.manageParts
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                      }`}
                  >
                    <span>Central de Peças Cadastradas</span>
                    {formData.permissions?.manageParts ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div
                    onClick={() => togglePermission('manageServices')}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${formData.permissions?.manageServices
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                      }`}
                  >
                    <span>Central de Serviços Cadastrados</span>
                    {formData.permissions?.manageServices ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div
                    onClick={() => togglePermission('manageEquipments')}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${formData.permissions?.manageEquipments
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                      }`}
                  >
                    <span>Central de Equipamentos Cadastrados</span>
                    {formData.permissions?.manageEquipments ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div
                    onClick={() => togglePermission('manageTechnicians')}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${formData.permissions?.manageTechnicians
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                      }`}
                  >
                    <span>Central de Técnicos Cadastrados</span>
                    {formData.permissions?.manageTechnicians ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div
                    onClick={() => togglePermission('manageOrderStatus')}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${formData.permissions?.manageOrderStatus
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                      }`}
                  >
                    <span>Central de Status de OS</span>
                    {formData.permissions?.manageOrderStatus ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  {/* SISTEMA E ADMINISTRAÇÃO */}
                  <div
                    onClick={() => togglePermission('manageUsers')}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${formData.permissions?.manageUsers
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                      }`}
                  >
                    <span>Gestão de Usuários e Permissões</span>
                    {formData.permissions?.manageUsers ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div
                    onClick={() => togglePermission('accessBackup')}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${formData.permissions?.accessBackup
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                      }`}
                  >
                    <span>Backup e Restauração de Dados</span>
                    {formData.permissions?.accessBackup ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  Salvar Usuário e Permissões
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3 bg-slate-200 border-t border-slate-300 flex justify-end">
          <button
            onClick={handleCloseModal}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};
