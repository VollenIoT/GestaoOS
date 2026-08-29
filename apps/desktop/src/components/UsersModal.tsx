import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Trash2, KeyRound, UserCheck, Shield, User, Lock, Edit3, CheckSquare, Square } from 'lucide-react';
import { useDialog } from './DialogContext';

export interface UserPermissions {
  // Ordens de Serviço
  createOS: boolean;
  editOS: boolean;
  cancelOS: boolean;
  finalizeOS: boolean;
  reopenOS: boolean;
  deleteOS: boolean;
  viewOpenOrders: boolean;
  viewFinishedOrders: boolean;
  viewAuditHistory: boolean;
  printOS: boolean;

  // Orçamentos
  manageEstimates: boolean;

  // Cadastros e Centrais
  manageClients: boolean;
  manageParts: boolean;
  manageServices: boolean;
  manageEquipments: boolean;
  manageTechnicians: boolean;
  manageOrderStatus: boolean;

  // Configurações e Parâmetros
  manageOSGeneralConfig: boolean;
  manageOrderSequence: boolean;
  manageWarrantyTerms: boolean;
  managePrinterConfig: boolean;

  // Relatórios
  viewGeneralReports: boolean;
  viewTechnicianReports: boolean;

  // Sistema e Administração
  manageCompanyData: boolean;
  manageMobileLink: boolean;
  manageWallpaper: boolean;
  manageUsers: boolean;
  accessBackup: boolean;
  accessFactoryReset: boolean;
}

export interface UserItem {
  id: string;
  username: string;
  name: string;
  role: 'Admin' | 'Técnico' | 'Atendimento' | 'Personalizado';
  isAdmin?: boolean;
  isTechnician?: boolean;
  isAttendant?: boolean;
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
  reopenOS: true,
  deleteOS: true,
  viewOpenOrders: true,
  viewFinishedOrders: true,
  viewAuditHistory: true,
  printOS: true,
  manageEstimates: true,
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

const DEFAULT_TECNICO_PERMISSIONS: UserPermissions = {
  createOS: true,
  editOS: true,
  cancelOS: false,
  finalizeOS: true,
  reopenOS: true,
  deleteOS: false,
  viewOpenOrders: true,
  viewFinishedOrders: true,
  viewAuditHistory: true,
  printOS: true,
  manageEstimates: true,
  manageClients: true,
  manageParts: true,
  manageServices: true,
  manageEquipments: true,
  manageTechnicians: false,
  manageOrderStatus: false,
  manageOSGeneralConfig: false,
  manageOrderSequence: false,
  manageWarrantyTerms: false,
  managePrinterConfig: true,
  viewGeneralReports: false,
  viewTechnicianReports: true,
  manageCompanyData: false,
  manageMobileLink: false,
  manageWallpaper: true,
  manageUsers: false,
  accessBackup: false,
  accessFactoryReset: false,
};

const DEFAULT_ATENDIMENTO_PERMISSIONS: UserPermissions = {
  createOS: true,
  editOS: true,
  cancelOS: false,
  finalizeOS: true,
  reopenOS: true,
  deleteOS: false,
  viewOpenOrders: true,
  viewFinishedOrders: true,
  viewAuditHistory: true,
  printOS: true,
  manageEstimates: true,
  manageClients: true,
  manageParts: false,
  manageServices: false,
  manageEquipments: true,
  manageTechnicians: false,
  manageOrderStatus: false,
  manageOSGeneralConfig: false,
  manageOrderSequence: false,
  manageWarrantyTerms: false,
  managePrinterConfig: true,
  viewGeneralReports: false,
  viewTechnicianReports: false,
  manageCompanyData: false,
  manageMobileLink: false,
  manageWallpaper: true,
  manageUsers: false,
  accessBackup: false,
  accessFactoryReset: false,
};

export const UsersModal: React.FC<UsersModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<UserItem[]>(() => {
    const defaultList: UserItem[] = [
      {
        id: '1',
        username: 'admin',
        name: 'Administrador',
        role: 'Admin',
        isAdmin: true,
        isTechnician: true,
        isAttendant: true,
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

  const saveUsersToStorage = (newUsers: UserItem[], deletedUserId?: string) => {
    setUsers(newUsers);
    try {
      localStorage.setItem('vollen_users', JSON.stringify(newUsers));
      window.dispatchEvent(new Event('storage'));

      // Se for exclusão, remove também de vollen_technicians caso exista vínculo
      if (deletedUserId) {
        try {
          const rawTechs = localStorage.getItem('vollen_technicians');
          if (rawTechs) {
            const techs = JSON.parse(rawTechs);
            if (Array.isArray(techs)) {
              const filteredTechs = techs.filter((t: any) => t.id !== deletedUserId && t.username !== deletedUserId);
              localStorage.setItem('vollen_technicians', JSON.stringify(filteredTechs));
            }
          }
        } catch (e) {}
      }

      // Sincroniza com o Firestore
      import('../services/firebase').then(({ db }) => {
        import('firebase/firestore').then(({ doc, setDoc, deleteDoc }) => {
          if (deletedUserId) {
            deleteDoc(doc(db, 'users', deletedUserId)).catch(() => {});
            deleteDoc(doc(db, 'technicians', deletedUserId)).catch(() => {});
          }
          newUsers.forEach((u) => {
            setDoc(
              doc(db, 'users', u.id),
              {
                id: u.id,
                username: u.username,
                name: u.name,
                role: u.role,
                isAdmin: u.role === 'Admin',
                isTechnician: Boolean(u.isTechnician ?? (u.role === 'Técnico' || u.role === 'Admin')),
                isAttendant: Boolean(u.isAttendant ?? (u.role === 'Atendimento' || u.role === 'Admin')),
                permissions: u.permissions,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            ).catch(() => {});
          });
        });
      });
    } catch (err) {
      console.error('Erro ao gravar vollen_users:', err);
    }
  };

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'Atendimento' as 'Admin' | 'Técnico' | 'Atendimento' | 'Personalizado',
    isTechnician: false,
    isAttendant: true,
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
    let isTech = formData.isTechnician;
    let isAtt = formData.isAttendant;

    if (role === 'Admin') {
      perms = { ...DEFAULT_ADMIN_PERMISSIONS };
      isTech = true;
      isAtt = true;
    } else if (role === 'Técnico') {
      perms = { ...DEFAULT_TECNICO_PERMISSIONS };
      isTech = true;
    } else if (role === 'Atendimento') {
      perms = { ...DEFAULT_ATENDIMENTO_PERMISSIONS };
      isAtt = true;
    }

    setFormData((prev) => ({
      ...prev,
      role,
      isTechnician: isTech,
      isAttendant: isAtt,
      permissions: perms,
    }));
  };

  const togglePermission = (key: keyof UserPermissions) => {
    if (formData.role === 'Admin') return; 
    setFormData((prev) => ({
      ...prev,
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
      isTechnician: false,
      isAttendant: true,
      permissions: DEFAULT_ATENDIMENTO_PERMISSIONS,
    });
    setIsFormOpen(true);
  };

  const handleOpenEditUser = (user: UserItem) => {
    const isAdmin = (user.role === 'Admin') || (user.username || '').toLowerCase() === 'admin';
    const isTech = user.isTechnician ?? (user.role === 'Técnico' || isAdmin);
    const isAtt = user.isAttendant ?? (user.role === 'Atendimento' || isAdmin);

    setFormData({
      id: user.id,
      name: user.name,
      username: user.username,
      password: '',
      confirmPassword: '',
      role: isAdmin ? 'Admin' : user.role,
      isTechnician: isTech,
      isAttendant: isAtt,
      permissions: isAdmin ? DEFAULT_ADMIN_PERMISSIONS : (user.permissions || DEFAULT_ATENDIMENTO_PERMISSIONS),
    });
    setIsFormOpen(true);
  };

  const { alert, confirm } = useDialog();

  const handleDeleteUser = async (userId: string, username: string) => {
    if (username.toLowerCase() === 'admin') {
      await alert({ title: 'Ação Bloqueada', message: 'O usuário Administrador principal não pode ser excluído.', variant: 'warning' });
      return;
    }
    const ok = await confirm({ title: 'Excluir Usuário', message: `Deseja realmente excluir o usuário "${username}"?`, variant: 'danger', confirmText: 'Excluir' });
    if (ok) {
      const updated = users.filter((u) => u.id !== userId);
      saveUsersToStorage(updated, userId);
      setSelectedUserId(null);
    }
  };

  const handleSaveUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanName = formData.name.trim();
    const cleanUsername = formData.username.trim();

    if (!cleanName) {
      await alert({ title: 'Campo Obrigatório', message: 'Por favor, informe o Nome Completo do usuário.', variant: 'warning' });
      return;
    }

    if (!cleanUsername) {
      await alert({ title: 'Campo Obrigatório', message: 'Por favor, informe o Nome de Usuário (Login).', variant: 'warning' });
      return;
    }

    if (!formData.id && !formData.password.trim()) {
      await alert({ title: 'Senha Obrigatória', message: 'Por favor, defina uma Senha para o novo usuário.', variant: 'warning' });
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      await alert({ title: 'Senhas Diferentes', message: 'As senhas digitadas não conferem! Por favor, verifique.', variant: 'danger' });
      return;
    }

    if (formData.id) {
      const updated = users.map((u) =>
        u.id === formData.id
          ? {
            ...u,
            name: formData.name.trim(),
            username: formData.username.trim(),
            role: formData.role,
            isTechnician: formData.isTechnician,
            isAttendant: formData.isAttendant,
            password: formData.password || (u as any).password,
            permissions: formData.role === 'Admin' ? DEFAULT_ADMIN_PERMISSIONS : formData.permissions,
          }
          : u
      );
      saveUsersToStorage(updated);
      await alert({ title: 'Usuário Atualizado', message: `Usuário "${formData.username}" atualizado com sucesso!`, variant: 'success' });
    } else {
      const newUser: UserItem & { password?: string } = {
        id: String(Date.now()),
        name: formData.name.trim(),
        username: formData.username.trim(),
        role: formData.role,
        isTechnician: formData.isTechnician,
        isAttendant: formData.isAttendant,
        password: formData.password,
        permissions: formData.role === 'Admin' ? DEFAULT_ADMIN_PERMISSIONS : formData.permissions,
      };
      const updated = [...users, newUser];
      saveUsersToStorage(updated);
      await alert({ title: 'Usuário Cadastrado', message: `Usuário "${formData.username}" cadastrado com sucesso!`, variant: 'success' });
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
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-sky-700" />
            Gestão de Usuários e Permissões de Acesso
          </h2>
          <button onClick={handleCloseModal} className="text-slate-600 hover:text-slate-900 p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4 bg-slate-50 text-xs">
          {!isFormOpen ? (
            <>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">
                  Usuários cadastrados e níveis de permissão ({users.length}):
                </span>
                <button
                  type="button"
                  onClick={handleOpenNewUser}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  Novo Usuário
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-200 text-slate-800 font-bold uppercase">
                    <tr>
                      <th className="p-3 border-b border-slate-300">Usuário (Login)</th>
                      <th className="p-3 border-b border-slate-300">Nome Completo</th>
                      <th className="p-3 border-b border-slate-300">Funções Ativas</th>
                      <th className="p-3 border-b border-slate-300">Perfil Base</th>
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
                        <td className="p-3 font-mono font-bold text-sky-900 flex items-center gap-2">
                          <User className="w-4 h-4 text-sky-600" />
                          {u.username}
                        </td>
                        <td className="p-3 font-bold text-slate-800">{u.name}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {(u.isTechnician ?? (u.role === 'Técnico' || u.role === 'Admin')) && (
                              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                🛠️ Técnico
                              </span>
                            )}
                            {(u.isAttendant ?? (u.role === 'Atendimento' || u.role === 'Admin')) && (
                              <span className="bg-sky-100 text-sky-900 border border-sky-300 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                🎧 Atendente
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${u.role === 'Admin'
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : u.role === 'Técnico'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-200 text-slate-700'
                              }`}
                          >
                            {u.role === 'Admin' ? '👑 Administrador' : u.role}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditUser(u);
                              }}
                              className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Editar Permissões
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteUser(u.id, u.username);
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg font-bold flex items-center gap-1 shadow-sm cursor-pointer"
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
            <div className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-600" />
                {formData.id ? 'Editar Usuário e Definição de Permissões' : 'Cadastrar Novo Usuário com Permissões Personalizadas'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Usuário (Login)</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Perfil Base de Acesso</label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleRoleChange(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-sky-600 cursor-pointer"
                  >
                    <option value="Admin">👑 Admin (Acesso Total e Irrestrito)</option>
                    <option value="Técnico">🛠️ Técnico (OS + Clientes)</option>
                    <option value="Atendimento">📞 Atendimento (Apenas Criar OS)</option>
                    <option value="Personalizado">⚙️ Personalizado (Permissões Escolhidas)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Funções Permitidas</label>
                  <div className="flex items-center gap-4 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2">
                    <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.isTechnician}
                        onChange={(e) => setFormData({ ...formData, isTechnician: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span>🛠️ Técnico</span>
                    </label>
                    <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.isAttendant}
                        onChange={(e) => setFormData({ ...formData, isAttendant: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                      <span>🎧 Atendente</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{formData.id ? 'Nova Senha' : 'Senha de Acesso'}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Confirmar Senha</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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

                <div className="space-y-4 max-h-[42vh] overflow-y-auto pr-1">
                  {/* GRUPO 1: ORDENS DE SERVIÇO */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-extrabold text-sky-900 uppercase tracking-wide block border-b border-slate-200 pb-0.5">
                      1. Ordens de Serviço (OS)
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                      <div onClick={() => togglePermission('createOS')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.createOS ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Criar Nova OS</span>
                        {formData.permissions?.createOS ? <CheckSquare className="w-4 h-4 text-sky-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('editOS')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.editOS ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Editar OS Existente</span>
                        {formData.permissions?.editOS ? <CheckSquare className="w-4 h-4 text-sky-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('cancelOS')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.cancelOS ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Cancelar OS</span>
                        {formData.permissions?.cancelOS ? <CheckSquare className="w-4 h-4 text-sky-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('finalizeOS')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.finalizeOS ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Finalizar OS e Pagamentos</span>
                        {formData.permissions?.finalizeOS ? <CheckSquare className="w-4 h-4 text-sky-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('reopenOS')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.reopenOS ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Reabrir OS Finalizada</span>
                        {formData.permissions?.reopenOS ? <CheckSquare className="w-4 h-4 text-sky-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('deleteOS')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.deleteOS ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Excluir OS Permanentemente</span>
                        {formData.permissions?.deleteOS ? <CheckSquare className="w-4 h-4 text-sky-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('viewOpenOrders')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.viewOpenOrders ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Visualizar OS em Aberto</span>
                        {formData.permissions?.viewOpenOrders ? <CheckSquare className="w-4 h-4 text-sky-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('viewFinishedOrders')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.viewFinishedOrders ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Visualizar OS Finalizadas</span>
                        {formData.permissions?.viewFinishedOrders ? <CheckSquare className="w-4 h-4 text-sky-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('viewAuditHistory')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.viewAuditHistory ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Ver Histórico de Auditoria</span>
                        {formData.permissions?.viewAuditHistory ? <CheckSquare className="w-4 h-4 text-sky-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('printOS')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.printOS ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Imprimir Comprovantes de OS</span>
                        {formData.permissions?.printOS ? <CheckSquare className="w-4 h-4 text-sky-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {/* GRUPO 2: ORÇAMENTOS */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wide block border-b border-slate-200 pb-0.5">
                      2. Orçamentos
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                      <div onClick={() => togglePermission('manageEstimates')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.manageEstimates ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Gerenciar Orçamentos</span>
                        {formData.permissions?.manageEstimates ? <CheckSquare className="w-4 h-4 text-amber-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {/* GRUPO 3: CADASTROS E CENTRAIS */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-extrabold text-indigo-900 uppercase tracking-wide block border-b border-slate-200 pb-0.5">
                      3. Cadastros Principais
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                      <div onClick={() => togglePermission('manageClients')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.manageClients ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Gerenciar Clientes</span>
                        {formData.permissions?.manageClients ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('manageParts')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.manageParts ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Gerenciar Peças e Estoque</span>
                        {formData.permissions?.manageParts ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('manageServices')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.manageServices ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Gerenciar Serviços</span>
                        {formData.permissions?.manageServices ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('manageEquipments')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.manageEquipments ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Gerenciar Equipamentos</span>
                        {formData.permissions?.manageEquipments ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('manageTechnicians')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.manageTechnicians ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Gerenciar Técnicos</span>
                        {formData.permissions?.manageTechnicians ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('manageOrderStatus')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.manageOrderStatus ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Gerenciar Status de OS</span>
                        {formData.permissions?.manageOrderStatus ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {/* GRUPO 4: CONFIGURAÇÕES E PARÂMETROS */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-extrabold text-purple-900 uppercase tracking-wide block border-b border-slate-200 pb-0.5">
                      4. Parâmetros e Configurações
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                      <div onClick={() => togglePermission('manageOSGeneralConfig')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.manageOSGeneralConfig ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Parâmetros e Regras da OS</span>
                        {formData.permissions?.manageOSGeneralConfig ? <CheckSquare className="w-4 h-4 text-purple-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('manageOrderSequence')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.manageOrderSequence ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Definir Numeração Inicial</span>
                        {formData.permissions?.manageOrderSequence ? <CheckSquare className="w-4 h-4 text-purple-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('manageWarrantyTerms')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.manageWarrantyTerms ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Termos dos Comprovantes</span>
                        {formData.permissions?.manageWarrantyTerms ? <CheckSquare className="w-4 h-4 text-purple-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('managePrinterConfig')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.managePrinterConfig ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Configurações de Impressora</span>
                        {formData.permissions?.managePrinterConfig ? <CheckSquare className="w-4 h-4 text-purple-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {/* GRUPO 5: RELATÓRIOS */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-extrabold text-emerald-900 uppercase tracking-wide block border-b border-slate-200 pb-0.5">
                      5. Relatórios & Estatísticas
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                      <div onClick={() => togglePermission('viewGeneralReports')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.viewGeneralReports ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Relatório Geral por Período</span>
                        {formData.permissions?.viewGeneralReports ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('viewTechnicianReports')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.viewTechnicianReports ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Relatório por Técnico</span>
                        {formData.permissions?.viewTechnicianReports ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {/* GRUPO 6: SISTEMA & ADMINISTRAÇÃO */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wide block border-b border-slate-200 pb-0.5">
                      6. Sistema & Administração
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                      <div onClick={() => togglePermission('manageCompanyData')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.manageCompanyData ? 'bg-slate-100 border-slate-300 text-slate-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Dados da Empresa & Logo</span>
                        {formData.permissions?.manageCompanyData ? <CheckSquare className="w-4 h-4 text-slate-800" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('manageMobileLink')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.manageMobileLink ? 'bg-slate-100 border-slate-300 text-slate-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Vincular Celular (ApiKey)</span>
                        {formData.permissions?.manageMobileLink ? <CheckSquare className="w-4 h-4 text-slate-800" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('manageWallpaper')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.manageWallpaper ? 'bg-slate-100 border-slate-300 text-slate-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Alterar Plano de Fundo</span>
                        {formData.permissions?.manageWallpaper ? <CheckSquare className="w-4 h-4 text-slate-800" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('manageUsers')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.manageUsers ? 'bg-slate-100 border-slate-300 text-slate-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Gestão de Usuários</span>
                        {formData.permissions?.manageUsers ? <CheckSquare className="w-4 h-4 text-slate-800" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('accessBackup')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.accessBackup ? 'bg-slate-100 border-slate-300 text-slate-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Backup e Restauração</span>
                        {formData.permissions?.accessBackup ? <CheckSquare className="w-4 h-4 text-slate-800" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div onClick={() => togglePermission('accessFactoryReset')} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${formData.permissions?.accessFactoryReset ? 'bg-red-50 border-red-300 text-red-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <span>Restaurar Padrão de Fábrica</span>
                        {formData.permissions?.accessFactoryReset ? <CheckSquare className="w-4 h-4 text-red-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-200 border-t border-slate-300 flex items-center justify-end gap-2.5">
          {isFormOpen && (
            <>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Voltar à Lista
              </button>
              <button
                type="button"
                onClick={() => handleSaveUser()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm text-xs transition-colors cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                Salvar Usuário e Permissões
              </button>
            </>
          )}

          <button
            onClick={handleCloseModal}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};
