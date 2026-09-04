import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  RotateCcw,
  Lock,
  CheckSquare,
  Square,
  ShieldAlert,
  Flame,
  Settings,
  Users,
  FileText,
  Package,
  Cpu,
  CheckCircle2,
  Wallet,
  ShoppingCart,
  Wrench,
} from 'lucide-react';
import { requestFactoryReset } from '../services/api';
import { db } from '../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

interface FactoryResetModalProps {
  isOpen: boolean;
  currentUser?: any;
  onClose: () => void;
  onResetSuccess: () => void;
}

export const FactoryResetModal: React.FC<FactoryResetModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onResetSuccess,
}) => {
  const [selectedItems, setSelectedItems] = useState({
    config: true,
    clients: true,
    orders: true,
    parts: true,
    services: true,
    equipments: true,
    cash: true,
    sales: true,
  });

  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'SELECT' | 'CONFIRM_DOUBLE' | 'SUCCESS'>('SELECT');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Carrega todos os usuários com papel de Administrador cadastrados
  React.useEffect(() => {
    if (isOpen) {
      let loadedAdmins: any[] = [];
      try {
        const saved = localStorage.getItem('vollen_users');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            loadedAdmins = parsed.filter((u: any) =>
              (u.role || '').toUpperCase() === 'ADMIN' || (u.username || '').toLowerCase() === 'admin'
            );
          }
        }
      } catch {}

      if (loadedAdmins.length === 0) {
        loadedAdmins = [{ id: '1', name: 'Administrador', username: 'admin', role: 'Admin', password: '1234' }];
      }

      setAdminUsers(loadedAdmins);
      if (currentUser?.id && loadedAdmins.some((a) => String(a.id) === String(currentUser.id))) {
        setSelectedAdminId(String(currentUser.id));
      } else {
        setSelectedAdminId(String(loadedAdmins[0].id));
      }
      setPassword('');
      setErrorMsg(null);
      setStep('SELECT');
    }
  }, [isOpen, currentUser]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        e.preventDefault();
        if (step === 'CONFIRM_DOUBLE') {
          setStep('SELECT');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, step, onClose]);

  if (!isOpen) return null;

  const isAdmin = Boolean(
    currentUser &&
    ((currentUser.role || '').toUpperCase() === 'ADMIN' ||
      (currentUser.name || '').includes('Administrador'))
  );

  const toggleItem = (key: keyof typeof selectedItems) => {
    setSelectedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = (val: boolean) => {
    setSelectedItems({
      config: val,
      clients: val,
      orders: val,
      parts: val,
      services: val,
      equipments: val,
      cash: val,
      sales: val,
    });
  };

  const hasAnySelected = Object.values(selectedItems).some(Boolean);

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const selectedAdmin = adminUsers.find((a) => String(a.id) === String(selectedAdminId));
    if (!selectedAdmin) {
      return setErrorMsg('Por favor, selecione um Administrador válido.');
    }

    if (!hasAnySelected) {
      return setErrorMsg('Por favor, selecione ao menos um item para restaurar.');
    }

    if (!password.trim()) {
      return setErrorMsg('Digite a senha do administrador selecionado para continuar.');
    }

    // Validação de senha do administrador selecionado
    const expectedPassword = selectedAdmin.password;
    if (expectedPassword !== undefined && expectedPassword !== null && expectedPassword !== '') {
      if (expectedPassword !== password.trim()) {
        return setErrorMsg('Senha incorreta para o administrador selecionado!');
      }
    } else {
      if (password.trim() !== '1234' && password.trim() !== 'admin') {
        return setErrorMsg('Senha incorreta para o administrador selecionado!');
      }
    }

    setStep('CONFIRM_DOUBLE');
  };

  const handleExecuteReset = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Limpeza no Backend SQLite local (caso servidor esteja online)
      if (selectedItems.clients || selectedItems.orders) {
        try {
          await requestFactoryReset({
            userId: selectedAdminId || currentUser?.id || '1',
            password: password.trim(),
            resetClients: selectedItems.clients,
            resetOrders: selectedItems.orders,
          });
        } catch (serverErr) {
          console.warn('Servidor backend offline ou dispensado, limpando Firestore e armazenamento local:', serverErr);
        }
      }

      // 2. Limpeza profunda de ORDENS DE SERVIÇO, HISTÓRICOS e VISITAS (Firestore + LocalStorage)
      if (selectedItems.orders) {
        localStorage.removeItem('vollen_orders');
        localStorage.removeItem('vollen_visits');
        localStorage.removeItem('vollen_custom_next_os_number');
        localStorage.removeItem('vollen_estimates');

        // Limpa todas as chaves de auditoria e histórico de OS locais (os_audit_*, audit_*, etc)
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('os_audit_') || k.startsWith('audit_') || k.startsWith('os_') || k.includes('audit'))) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
        } catch (e) { }

        try {
          const [ordersSnap, visitsSnap, estSnap] = await Promise.all([
            getDocs(collection(db, 'orders')).catch(() => null),
            getDocs(collection(db, 'visits')).catch(() => null),
            getDocs(collection(db, 'estimates')).catch(() => null),
          ]);

          if (ordersSnap && !ordersSnap.empty) {
            await Promise.all(ordersSnap.docs.map((d) => deleteDoc(doc(db, 'orders', d.id)).catch(() => {})));
          }
          if (visitsSnap && !visitsSnap.empty) {
            await Promise.all(visitsSnap.docs.map((d) => deleteDoc(doc(db, 'visits', d.id)).catch(() => {})));
          }
          if (estSnap && !estSnap.empty) {
            await Promise.all(estSnap.docs.map((d) => deleteDoc(doc(db, 'estimates', d.id)).catch(() => {})));
          }
          // Reseta contador atômico de numeração de OS para 0 e remove qualquer documento legado
          await Promise.all([
            setDoc(doc(db, 'system_config', 'order_counter'), { lastOrderNumber: 0, updatedAt: new Date().toISOString() }),
            deleteDoc(doc(db, 'system_config', 'counters')).catch(() => {}),
            deleteDoc(doc(db, 'system_config', 'last_order_number')).catch(() => {}),
          ]);
        } catch (err) {
          console.warn('Erro ao limpar ordens no Firestore:', err);
        }
      }

      // 3. Limpeza profunda de CLIENTES (Firestore + LocalStorage)
      if (selectedItems.clients) {
        localStorage.removeItem('vollen_clients');
        localStorage.removeItem('selected_client');

        try {
          const clientsSnap = await getDocs(collection(db, 'clients')).catch(() => null);
          if (clientsSnap && !clientsSnap.empty) {
            await Promise.all(clientsSnap.docs.map((d) => deleteDoc(doc(db, 'clients', d.id)).catch(() => {})));
          }
        } catch (err) {
          console.warn('Erro ao limpar clientes no Firestore:', err);
        }
      }

      // 4. Limpeza profunda de PEÇAS (Firestore + LocalStorage)
      if (selectedItems.parts) {
        localStorage.removeItem('vollen_parts');
        localStorage.removeItem('vollen_parts_stock');

        try {
          const partsSnap = await getDocs(collection(db, 'parts')).catch(() => null);
          if (partsSnap && !partsSnap.empty) {
            await Promise.all(partsSnap.docs.map((d) => deleteDoc(doc(db, 'parts', d.id)).catch(() => {})));
          }
        } catch (err) {
          console.warn('Erro ao limpar peças no Firestore:', err);
        }
      }

      // 4.1 Limpeza profunda de SERVIÇOS (Firestore + LocalStorage)
      if (selectedItems.services) {
        localStorage.removeItem('vollen_services');
        localStorage.removeItem('vollen_custom_services');

        try {
          const srvSnap = await getDocs(collection(db, 'services')).catch(() => null);
          if (srvSnap && !srvSnap.empty) {
            await Promise.all(srvSnap.docs.map((d) => deleteDoc(doc(db, 'services', d.id)).catch(() => {})));
          }
        } catch (err) {
          console.warn('Erro ao limpar serviços no Firestore:', err);
        }
      }

      // 5. Limpeza profunda de EQUIPAMENTOS (Firestore + LocalStorage)
      if (selectedItems.equipments) {
        localStorage.removeItem('system_equipments');
        localStorage.removeItem('vollen_equipments');

        try {
          const eqSnap = await getDocs(collection(db, 'equipments')).catch(() => null);
          if (eqSnap && !eqSnap.empty) {
            await Promise.all(eqSnap.docs.map((d) => deleteDoc(doc(db, 'equipments', d.id)).catch(() => {})));
          }
        } catch (err) {
          console.warn('Erro ao limpar equipamentos no Firestore:', err);
        }
      }

      // 6. Limpeza profunda de CONTROLE DE CAIXA (Firestore + LocalStorage)
      if (selectedItems.cash) {
        localStorage.removeItem('vollen_cash_movements');
        localStorage.removeItem('vollen_current_cash_session');
        localStorage.removeItem('vollen_cash_register_columns');

        try {
          const [movSnap, sessionDoc] = await Promise.all([
            getDocs(collection(db, 'cash_movements')).catch(() => null),
            deleteDoc(doc(db, 'cash_registers', 'current_session')).catch(() => {}),
          ]);

          if (movSnap && !movSnap.empty) {
            await Promise.all(movSnap.docs.map((d) => deleteDoc(doc(db, 'cash_movements', d.id)).catch(() => {})));
          }
        } catch (err) {
          console.warn('Erro ao limpar caixa no Firestore:', err);
        }
      }

      // 7. Limpeza profunda de VENDAS BALCÃO E CARRINHOS (Firestore + LocalStorage)
      if (selectedItems.sales) {
        localStorage.removeItem('vollen_sales_history');
        localStorage.removeItem('vollen_saved_carts');
        localStorage.removeItem('vollen_active_cart');

        try {
          const [salesSnap, cartsSnap] = await Promise.all([
            getDocs(collection(db, 'sales')).catch(() => null),
            getDocs(collection(db, 'saved_carts')).catch(() => null),
          ]);

          if (salesSnap && !salesSnap.empty) {
            await Promise.all(salesSnap.docs.map((d) => deleteDoc(doc(db, 'sales', d.id)).catch(() => {})));
          }
          if (cartsSnap && !cartsSnap.empty) {
            await Promise.all(cartsSnap.docs.map((d) => deleteDoc(doc(db, 'saved_carts', d.id)).catch(() => {})));
          }
        } catch (err) {
          console.warn('Erro ao limpar vendas no Firestore:', err);
        }
      }

      // 6. Limpeza profunda de CONFIGURAÇÕES DO SISTEMA (Firestore + LocalStorage)
      if (selectedItems.config) {
        localStorage.removeItem('system_wallpaper_url');
        localStorage.removeItem('system_wallpaper_opacity');
        localStorage.removeItem('system_wallpaper_pos_x');
        localStorage.removeItem('system_wallpaper_pos_y');
        localStorage.removeItem('system_wallpaper_scale');
        localStorage.removeItem('vollen_company_data');
        localStorage.removeItem('vollen_os_preferences');
        localStorage.removeItem('active_tab');
        localStorage.removeItem('vollen_services');

        // Recria APENAS o usuário Administrador padrão do sistema (sem técnicos de exemplo)
        const defaultUsers = [
          {
            id: '1',
            username: 'admin',
            name: 'Administrador',
            role: 'Admin',
            isAdmin: true,
            isTechnician: true,
            isAttendant: true,
            password: '1234',
          },
        ];

        localStorage.setItem('vollen_users', JSON.stringify(defaultUsers));
        localStorage.removeItem('vollen_technicians');

        try {
          const srvSnap = await getDocs(collection(db, 'services')).catch(() => null);
          if (srvSnap && !srvSnap.empty) {
            await Promise.all(srvSnap.docs.map((d) => deleteDoc(doc(db, 'services', d.id)).catch(() => {})));
          }

          // Limpa técnicos antigos no Firestore
          const techSnap = await getDocs(collection(db, 'technicians')).catch(() => null);
          if (techSnap && !techSnap.empty) {
            await Promise.all(techSnap.docs.map((d) => deleteDoc(doc(db, 'technicians', d.id)).catch(() => {})));
          }

          // Limpa usuários antigos no Firestore e recria APENAS o Administrador
          const usersSnap = await getDocs(collection(db, 'users')).catch(() => null);
          if (usersSnap && !usersSnap.empty) {
            await Promise.all(usersSnap.docs.map((d) => deleteDoc(doc(db, 'users', d.id)).catch(() => {})));
          }
          for (const usr of defaultUsers) {
            await setDoc(doc(db, 'users', usr.id), usr, { merge: true }).catch(() => {});
          }

          await deleteDoc(doc(db, 'system_config', 'company_data')).catch(() => {});
          await deleteDoc(doc(db, 'system_config', 'os_preferences')).catch(() => {});
        } catch (err) {
          console.warn('Erro ao limpar configurações no Firestore:', err);
        }
      }

      // 7. Transição para Tela de Sucesso
      setLoading(false);
      onResetSuccess();
      setStep('SUCCESS');
    } catch (err: any) {
      console.error('Erro na restauração de fábrica:', err);
      setLoading(false);
      setErrorMsg(err.message || 'Erro ao processar a restauração. Verifique a senha e tente novamente.');
      setStep('SELECT');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 select-none font-sans text-xs"
    >
      <div
        className="bg-white border-2 border-red-500/80 rounded-2xl w-full max-w-lg max-h-[94vh] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header com Alerta */}
        <div className="p-3 bg-gradient-to-r from-red-700 via-rose-800 to-red-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <RotateCcw className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight flex items-center gap-2">
                Restaurar Padrão de Fábrica
              </h2>
              <p className="text-[10px] text-red-200">
                Limpeza e redefinição seletiva dos dados do sistema
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Verificação de Permissão de Administrador */}
        {!isAdmin ? (
          <div className="p-5 text-center space-y-3 bg-red-50 overflow-y-auto">
            <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
            <h3 className="text-sm font-bold text-red-900">Acesso Restrito ao Administrador</h3>
            <p className="text-xs text-red-700 max-w-sm mx-auto">
              Você está conectado como <strong>{currentUser?.name || 'Operador'}</strong> ({currentUser?.role || 'Usuário'}).
              Apenas usuários com perfil de Administrador podem restaurar os dados do sistema.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl font-bold cursor-pointer"
              >
                Entendido / Fechar
              </button>
            </div>
          </div>
        ) : step === 'SELECT' ? (
          /* PASSO 1: SELEÇÃO DO QUE RESTAURAR */
          <form onSubmit={handleProceedToConfirm} className="p-4 space-y-3 bg-slate-50 overflow-y-auto flex-1 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="text-[11px] leading-tight font-medium">
                  Selecione os módulos que deseja apagar ou resetar para as configurações de fábrica.
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-100 border border-red-400 text-red-800 px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Lista de Módulos para Restaurar */}
              <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-300 shadow-2xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 mb-1">
                  <span className="font-bold text-slate-800 text-[11px]">Selecione o que deseja restaurar:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => selectAll(true)}
                      className="text-[10.5px] font-bold text-sky-700 hover:underline cursor-pointer"
                    >
                      Marcar Todos
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => selectAll(false)}
                      className="text-[10.5px] font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>

                {/* 1. Configurações do Sistema */}
                <label
                  onClick={() => toggleItem('config')}
                  className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <div className="mt-0.5 text-sky-700">
                    {selectedItems.config ? (
                      <CheckSquare className="w-4 h-4 text-red-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1 text-[11.5px]">
                      <Settings className="w-3.5 h-3.5 text-sky-600" />
                      Configurações do Sistema
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Restaura dados da empresa, plano de fundo, termos de garantia e preferências ao padrão.
                    </p>
                  </div>
                </label>

                {/* 2. Clientes */}
                <label
                  onClick={() => toggleItem('clients')}
                  className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <div className="mt-0.5 text-sky-700">
                    {selectedItems.clients ? (
                      <CheckSquare className="w-4 h-4 text-red-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1 text-[11.5px]">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      Clientes
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Apaga todos os clientes cadastrados e deixa o banco de clientes vazio.
                    </p>
                  </div>
                </label>

                {/* 3. Gestão de OS */}
                <label
                  onClick={() => toggleItem('orders')}
                  className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <div className="mt-0.5 text-sky-700">
                    {selectedItems.orders ? (
                      <CheckSquare className="w-4 h-4 text-red-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1 text-[11.5px]">
                      <FileText className="w-3.5 h-3.5 text-sky-600" />
                      Gestão de OS
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Apaga todas as Ordens de Serviço (abertas, finalizadas, canceladas, excluídas) e zera para <strong>OS-0001</strong>.
                    </p>
                  </div>
                </label>

                {/* 4. Peças */}
                <label
                  onClick={() => toggleItem('parts')}
                  className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <div className="mt-0.5 text-sky-700">
                    {selectedItems.parts ? (
                      <CheckSquare className="w-4 h-4 text-red-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1 text-[11.5px]">
                      <Package className="w-3.5 h-3.5 text-amber-600" />
                      Peças do Estoque
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Apaga todas as peças e itens cadastrados no estoque, voltando a zero.
                    </p>
                  </div>
                </label>

                {/* 4.1 Serviços */}
                <label
                  onClick={() => toggleItem('services')}
                  className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <div className="mt-0.5 text-sky-700">
                    {selectedItems.services ? (
                      <CheckSquare className="w-4 h-4 text-red-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1 text-[11.5px]">
                      <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                      Catálogo de Serviços
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Apaga todos os serviços de mão de obra cadastrados, voltando a zero.
                    </p>
                  </div>
                </label>

                {/* 5. Equipamentos */}
                <label
                  onClick={() => toggleItem('equipments')}
                  className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <div className="mt-0.5 text-sky-700">
                    {selectedItems.equipments ? (
                      <CheckSquare className="w-4 h-4 text-red-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1 text-[11.5px]">
                      <Cpu className="w-3.5 h-3.5 text-purple-600" />
                      Equipamentos
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Apaga equipamentos adicionados e mantém apenas os tipos padrões do sistema.
                    </p>
                  </div>
                </label>

                {/* 6. Controle de Caixa */}
                <label
                  onClick={() => toggleItem('cash')}
                  className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <div className="mt-0.5 text-sky-700">
                    {selectedItems.cash ? (
                      <CheckSquare className="w-4 h-4 text-red-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1 text-[11.5px]">
                      <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                      Controle de Caixa
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Apaga todas as movimentações, sangrias, suprimentos e fecha a sessão do caixa.
                    </p>
                  </div>
                </label>

                {/* 7. Vendas e Balcão */}
                <label
                  onClick={() => toggleItem('sales')}
                  className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <div className="mt-0.5 text-sky-700">
                    {selectedItems.sales ? (
                      <CheckSquare className="w-4 h-4 text-red-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1 text-[11.5px]">
                      <ShoppingCart className="w-3.5 h-3.5 text-emerald-700" />
                      Histórico de Vendas Balcão
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Apaga o histórico de vendas de balcão (PDV) e carrinhos salvos.
                    </p>
                  </div>
                </label>
              </div>

              {/* Seleção do Administrador e Senha */}
              <div className="bg-white p-3 rounded-xl border border-slate-300 space-y-2">
                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1 text-[11px]">
                    <Users className="w-3.5 h-3.5 text-sky-700" />
                    Selecionar Administrador Autorizador <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedAdminId}
                    onChange={(e) => {
                      setSelectedAdminId(e.target.value);
                      setPassword('');
                      setErrorMsg(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-red-600 focus:bg-white text-xs uppercase cursor-pointer"
                  >
                    {adminUsers.map((a) => (
                      <option key={a.id} value={a.id} className="uppercase font-bold">
                        {(a.name || a.username).toUpperCase()} (ADMIN)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1 text-[11px]">
                    <Lock className="w-3.5 h-3.5 text-red-600" />
                    Senha do Administrador Selecionado <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Digite a senha..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-red-600 focus:bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Rodapé do Passo 1 */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 mt-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!hasAnySelected || !password.trim()}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer transition-transform hover:scale-102 active:scale-98"
              >
                <span>Avançar para Confirmação</span>
                <ShieldAlert className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : step === 'CONFIRM_DOUBLE' ? (
          /* PASSO 2: SEGUNDA CONFIRMAÇÃO DE MÁXIMA SEGURANÇA */
          <div className="p-4 space-y-3 bg-red-50/60 overflow-y-auto flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-center space-y-1">
                <div className="w-11 h-11 bg-red-100 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto text-red-600 shadow-inner">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="text-sm font-black text-red-950 uppercase tracking-tight">
                  CONFIRMAÇÃO DEFINITIVA DE RESTAURAÇÃO
                </h3>
                <p className="text-[11px] text-red-800 max-w-sm mx-auto leading-tight">
                  Esta ação é <strong>IRREVERSÍVEL</strong>. Os dados dos módulos selecionados serão permanentemente apagados e redefinidos.
                </p>
              </div>

              {/* Resumo do que será apagado */}
              <div className="bg-white p-3 rounded-xl border border-red-300 shadow-2xs space-y-1">
                <span className="font-bold text-slate-800 block text-[11px]">Resumo do que será restaurado:</span>
                <ul className="list-disc list-inside text-slate-700 space-y-0.5 text-[10.5px]">
                  {selectedItems.config && (
                    <li><strong>Configurações do Sistema</strong>: Volta ao padrão original.</li>
                  )}
                  {selectedItems.clients && (
                    <li className="text-red-700 font-semibold"><strong>Clientes</strong>: Todos os cadastros serão apagados.</li>
                  )}
                  {selectedItems.orders && (
                    <li className="text-red-700 font-semibold"><strong>Gestão de OS</strong>: Todas as OS apagadas e contador zerado.</li>
                  )}
                  {selectedItems.parts && (
                    <li><strong>Peças</strong>: Estoque será esvaziado.</li>
                  )}
                  {selectedItems.equipments && (
                    <li><strong>Equipamentos</strong>: Personalizados serão removidos.</li>
                  )}
                  {selectedItems.cash && (
                    <li className="text-red-700 font-semibold"><strong>Controle de Caixa</strong>: Todas as movimentações apagadas e sessão encerrada.</li>
                  )}
                  {selectedItems.sales && (
                    <li className="text-red-700 font-semibold"><strong>Vendas de Balcão</strong>: Histórico de vendas PDV apagado.</li>
                  )}
                </ul>
              </div>

              {errorMsg && (
                <div className="bg-red-100 border border-red-400 text-red-800 px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Botões Finais de Execução */}
            <div className="flex items-center justify-between pt-2 border-t border-red-200 mt-2 shrink-0">
              <button
                type="button"
                disabled={loading}
                onClick={() => setStep('SELECT')}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl cursor-pointer text-xs"
              >
                Voltar
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleExecuteReset}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer transition-all hover:scale-102 active:scale-98"
              >
                {loading ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Flame className="w-3.5 h-3.5" />
                    SIM, RESTAURAR AGORA
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* PASSO 3: TELA DE SUCESSO E CONFIRMAÇÃO VISUAL */
          <div className="p-6 text-center space-y-4 bg-emerald-50/70 overflow-y-auto flex-1 flex flex-col justify-between items-center">
            <div className="space-y-3 my-auto">
              <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-lg shadow-emerald-600/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-base font-black text-emerald-950 uppercase tracking-tight">
                Padrão de Fábrica Restaurado com Sucesso!
              </h3>
              <p className="text-xs text-emerald-800 max-w-sm mx-auto leading-relaxed">
                Todos os dados e módulos selecionados foram limpos e redefinidos para os padrões originais do sistema.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full max-w-xs py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 cursor-pointer transition-all hover:scale-102 active:scale-98"
            >
              Concluir e Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
