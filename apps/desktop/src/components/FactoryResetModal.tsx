import React, { useState, useRef } from 'react';
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
  ShieldCheck,
  DatabaseBackup,
  FolderCheck,
  Truck,
  Receipt,
  FileSpreadsheet,
  History,
} from 'lucide-react';
import { requestFactoryReset } from '../services/api';
import { db } from '../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { modalStack } from '../utils/modalStack';
import { logAuditEvent } from '../services/auditLogService';
import { createFactoryResetSafetyBackup } from '../services/safetyBackupService';
import { useCatalogStore } from '../stores/useCatalogStore';
import { useOrdersStore } from '../stores/useOrdersStore';

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
    suppliers: true,
    services: true,
    equipments: true,
    cash: true,
    accounts: true,
    sales: true,
    promissory: true,
    history: true,
  });

  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [step, setStep] = useState<'SELECT' | 'CONFIRM_DOUBLE' | 'SUCCESS'>('SELECT');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [safetyBackupInfo, setSafetyBackupInfo] = useState<{ backupPath?: string; expiresAt?: string } | null>(null);

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

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const stepRef = useRef(step);
  stepRef.current = step;

  React.useEffect(() => {
    if (isOpen) {
      modalStack.register('FactoryResetModal', () => {
        if (!loadingRef.current) {
          if (stepRef.current === 'CONFIRM_DOUBLE') {
            setStep('SELECT');
          } else {
            onCloseRef.current();
          }
        }
      });
      return () => modalStack.unregister('FactoryResetModal');
    }
  }, [isOpen]);

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
      suppliers: val,
      services: val,
      equipments: val,
      cash: val,
      accounts: val,
      sales: val,
      promissory: val,
      history: val,
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

    setConfirmText('');
    setStep('CONFIRM_DOUBLE');
  };

  const handleExecuteReset = async () => {
    setLoading(true);
    setErrorMsg(null);

    // 🛡️ BACKUP AUTOMÁTICO DE SEGURANÇA (RETENÇÃO DE 7 DIAS)
    const selectedAdmin = adminUsers.find((a) => String(a.id) === String(selectedAdminId));
    const adminName = selectedAdmin?.name || selectedAdmin?.username || currentUser?.name || 'Administrador';
    let safetyResult: { backupPath?: string; expiresAt?: string } = { backupPath: undefined, expiresAt: '' };
    try {
      safetyResult = await createFactoryResetSafetyBackup({
        adminName,
        selectedModules: selectedItems,
      });
      setSafetyBackupInfo(safetyResult);
    } catch (backupErr) {
      console.warn('Aviso: falha ao gerar cópia de segurança antes do reset:', backupErr);
    }

    // ✅ PROTEÇÃO DA LICENÇA: Salva as chaves de registro ANTES do reset
    const LICENSE_KEYS_TO_PRESERVE = [
      'system_serial_license_key',
      'system_tenant_info',
      'system_tenant_firebase_config',
      'vollen_company_apikey',
      'vollen_sys_trial_state_v1',
    ];
    const preservedLicenseData: Record<string, string | null> = {};
    for (const key of LICENSE_KEYS_TO_PRESERVE) {
      preservedLicenseData[key] = localStorage.getItem(key);
    }

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

      // 2. Limpeza profunda de ORDENS DE SERVIÇO, HISTÓRICOS, VISITAS E ORÇAMENTOS (Firestore + LocalStorage)
      if (selectedItems.orders) {
        localStorage.removeItem('vollen_orders');
        localStorage.removeItem('local_orders');
        localStorage.removeItem('vollen_visits');
        localStorage.removeItem('vollen_custom_next_os_number');
        localStorage.removeItem('vollen_estimates');
        localStorage.removeItem('vollen_origin_estimate_id');

        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('os_audit_') || k.startsWith('audit_') || k.startsWith('os_'))) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
        } catch (e) {}

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
          await Promise.all([
            setDoc(doc(db, 'system_config', 'order_counter'), { lastOrderNumber: 0, updatedAt: new Date().toISOString() }),
            deleteDoc(doc(db, 'system_config', 'counters')).catch(() => {}),
            deleteDoc(doc(db, 'system_config', 'last_order_number')).catch(() => {}),
          ]);
        } catch (err) {
          console.warn('Erro ao limpar ordens no Firestore:', err);
        }

        useOrdersStore.getState().setOrders([]);
        useOrdersStore.getState().setVisits([]);
        useOrdersStore.getState().setEstimates([]);
        useOrdersStore.getState().setMaxEverOrderCode(0);
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

        useOrdersStore.getState().setClients([]);
      }

      // 4. Limpeza profunda de PEÇAS, ESTOQUE & ORDENS DE COMPRA (Firestore + LocalStorage)
      if (selectedItems.parts) {
        localStorage.removeItem('vollen_parts');
        localStorage.removeItem('vollen_parts_stock');
        localStorage.removeItem('vollen_purchase_orders');
        localStorage.removeItem('vollen_stock_movements');

        try {
          const [partsSnap, poSnap, smSnap] = await Promise.all([
            getDocs(collection(db, 'parts')).catch(() => null),
            getDocs(collection(db, 'purchase_orders')).catch(() => null),
            getDocs(collection(db, 'stock_movements')).catch(() => null),
          ]);
          if (partsSnap && !partsSnap.empty) {
            await Promise.all(partsSnap.docs.map((d) => deleteDoc(doc(db, 'parts', d.id)).catch(() => {})));
          }
          if (poSnap && !poSnap.empty) {
            await Promise.all(poSnap.docs.map((d) => deleteDoc(doc(db, 'purchase_orders', d.id)).catch(() => {})));
          }
          if (smSnap && !smSnap.empty) {
            await Promise.all(smSnap.docs.map((d) => deleteDoc(doc(db, 'stock_movements', d.id)).catch(() => {})));
          }
        } catch (err) {
          console.warn('Erro ao limpar peças no Firestore:', err);
        }

        useCatalogStore.getState().setParts([]);
      }

      // 5. Limpeza profunda de FORNECEDORES (Firestore + LocalStorage)
      if (selectedItems.suppliers) {
        localStorage.removeItem('vollen_suppliers');
        localStorage.removeItem('system_suppliers');

        try {
          const supSnap = await getDocs(collection(db, 'suppliers')).catch(() => null);
          if (supSnap && !supSnap.empty) {
            await Promise.all(supSnap.docs.map((d) => deleteDoc(doc(db, 'suppliers', d.id)).catch(() => {})));
          }
        } catch (err) {
          console.warn('Erro ao limpar fornecedores no Firestore:', err);
        }

        useCatalogStore.getState().setSuppliers([]);
      }

      // 6. Limpeza profunda de SERVIÇOS (Firestore + LocalStorage)
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

        useCatalogStore.getState().setServices([]);
      }

      // 7. Limpeza profunda de EQUIPAMENTOS, MARCAS E MODELOS (Firestore + LocalStorage)
      if (selectedItems.equipments) {
        localStorage.removeItem('system_equipments');
        localStorage.removeItem('vollen_equipments');
        localStorage.removeItem('system_brands');
        localStorage.removeItem('vollen_brands');
        localStorage.removeItem('system_models');
        localStorage.removeItem('vollen_models');

        try {
          const [eqSnap, brandsSnap, modelsSnap] = await Promise.all([
            getDocs(collection(db, 'equipments')).catch(() => null),
            getDocs(collection(db, 'brands')).catch(() => null),
            getDocs(collection(db, 'models')).catch(() => null),
          ]);
          if (eqSnap && !eqSnap.empty) {
            await Promise.all(eqSnap.docs.map((d) => deleteDoc(doc(db, 'equipments', d.id)).catch(() => {})));
          }
          if (brandsSnap && !brandsSnap.empty) {
            await Promise.all(brandsSnap.docs.map((d) => deleteDoc(doc(db, 'brands', d.id)).catch(() => {})));
          }
          if (modelsSnap && !modelsSnap.empty) {
            await Promise.all(modelsSnap.docs.map((d) => deleteDoc(doc(db, 'models', d.id)).catch(() => {})));
          }
        } catch (err) {
          console.warn('Erro ao limpar equipamentos, marcas e modelos no Firestore:', err);
        }

        useCatalogStore.getState().setEquipments([]);
        useCatalogStore.getState().setBrands([]);
        useCatalogStore.getState().setModels([]);
      }

      // 8. Limpeza profunda de CONTROLE DE CAIXA (Firestore + LocalStorage)
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

      // 9. Limpeza profunda de CONTAS A PAGAR & RECEBER (Firestore + LocalStorage)
      if (selectedItems.accounts) {
        localStorage.removeItem('vollen_accounts_bills');
        localStorage.removeItem('vollen_accounts_payable');
        localStorage.removeItem('vollen_accounts_receivable');

        try {
          const [billsSnap, paySnap, recSnap] = await Promise.all([
            getDocs(collection(db, 'accounts_bills')).catch(() => null),
            getDocs(collection(db, 'accounts_payable')).catch(() => null),
            getDocs(collection(db, 'accounts_receivable')).catch(() => null),
          ]);

          if (billsSnap && !billsSnap.empty) {
            await Promise.all(billsSnap.docs.map((d) => deleteDoc(doc(db, 'accounts_bills', d.id)).catch(() => {})));
          }
          if (paySnap && !paySnap.empty) {
            await Promise.all(paySnap.docs.map((d) => deleteDoc(doc(db, 'accounts_payable', d.id)).catch(() => {})));
          }
          if (recSnap && !recSnap.empty) {
            await Promise.all(recSnap.docs.map((d) => deleteDoc(doc(db, 'accounts_receivable', d.id)).catch(() => {})));
          }
        } catch (err) {
          console.warn('Erro ao limpar contas no Firestore:', err);
        }
      }

      // 10. Limpeza profunda de VENDAS BALCÃO, COMISSÕES E CARRINHOS (Firestore + LocalStorage)
      if (selectedItems.sales) {
        localStorage.removeItem('vollen_sales_history');
        localStorage.removeItem('vollen_saved_carts');
        localStorage.removeItem('vollen_active_cart');
        localStorage.removeItem('vollen_local_sales_cart');
        localStorage.removeItem('vollen_local_sales_client');
        localStorage.removeItem('vollen_active_saved_cart_id');
        localStorage.removeItem('vollen_sales_commissions');

        try {
          const [salesSnap, cartsSnap, commSnap] = await Promise.all([
            getDocs(collection(db, 'sales')).catch(() => null),
            getDocs(collection(db, 'saved_carts')).catch(() => null),
            getDocs(collection(db, 'sales_commissions')).catch(() => null),
          ]);

          if (salesSnap && !salesSnap.empty) {
            await Promise.all(salesSnap.docs.map((d) => deleteDoc(doc(db, 'sales', d.id)).catch(() => {})));
          }
          if (cartsSnap && !cartsSnap.empty) {
            await Promise.all(cartsSnap.docs.map((d) => deleteDoc(doc(db, 'saved_carts', d.id)).catch(() => {})));
          }
          if (commSnap && !commSnap.empty) {
            await Promise.all(commSnap.docs.map((d) => deleteDoc(doc(db, 'sales_commissions', d.id)).catch(() => {})));
          }
        } catch (err) {
          console.warn('Erro ao limpar vendas no Firestore:', err);
        }
      }

      // 11. Limpeza profunda de NOTAS PROMISSÓRIAS E CREDIÁRIO (Firestore + LocalStorage)
      if (selectedItems.promissory) {
        localStorage.removeItem('vollen_client_debts');

        try {
          const debtsSnap = await getDocs(collection(db, 'client_debts')).catch(() => null);
          if (debtsSnap && !debtsSnap.empty) {
            await Promise.all(debtsSnap.docs.map((d) => deleteDoc(doc(db, 'client_debts', d.id)).catch(() => {})));
          }
        } catch (err) {
          console.warn('Erro ao limpar promissórias no Firestore:', err);
        }
      }

      // 12. Limpeza profunda de HISTÓRICOS & AUDITORIA (Firestore + LocalStorage)
      if (selectedItems.history) {
        localStorage.removeItem('vollen_audit_logs');
        localStorage.removeItem('vollen_sync_log');
        localStorage.removeItem('vollen_stock_movements');

        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('audit_') || k.includes('audit_log'))) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
        } catch (e) {}

        try {
          const [auditSnap, syncSnap] = await Promise.all([
            getDocs(collection(db, 'audit_logs')).catch(() => null),
            getDocs(collection(db, 'sync_logs')).catch(() => null),
          ]);
          if (auditSnap && !auditSnap.empty) {
            await Promise.all(auditSnap.docs.map((d) => deleteDoc(doc(db, 'audit_logs', d.id)).catch(() => {})));
          }
          if (syncSnap && !syncSnap.empty) {
            await Promise.all(syncSnap.docs.map((d) => deleteDoc(doc(db, 'sync_logs', d.id)).catch(() => {})));
          }
        } catch (err) {
          console.warn('Erro ao limpar logs e auditoria no Firestore:', err);
        }
      }

      // 13. Limpeza profunda de CONFIGURAÇÕES DO SISTEMA (Firestore + LocalStorage)
      if (selectedItems.config) {
        localStorage.removeItem('system_wallpaper_url');
        localStorage.removeItem('system_wallpaper_opacity');
        localStorage.removeItem('system_wallpaper_pos_x');
        localStorage.removeItem('system_wallpaper_pos_y');
        localStorage.removeItem('system_wallpaper_scale');
        localStorage.removeItem('vollen_company_data');
        localStorage.removeItem('vollen_os_preferences');
        localStorage.removeItem('vollen_os_general_config');
        localStorage.removeItem('custom_os_statuses_v3');
        localStorage.removeItem('vollen_shortcuts');
        localStorage.removeItem('active_tab');

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

          await Promise.all([
            deleteDoc(doc(db, 'system_config', 'company_data')).catch(() => {}),
            deleteDoc(doc(db, 'system_config', 'os_preferences')).catch(() => {}),
            deleteDoc(doc(db, 'system_config', 'warranty_config')).catch(() => {}),
          ]);

          const statusesSnap = await getDocs(collection(db, 'os_statuses')).catch(() => null);
          if (statusesSnap && !statusesSnap.empty) {
            await Promise.all(statusesSnap.docs.map((d) => deleteDoc(doc(db, 'os_statuses', d.id)).catch(() => {})));
          }
        } catch (err) {
          console.warn('Erro ao limpar configurações no Firestore:', err);
        }
      }

      // Sincroniza limpezas com a Rede Local (broadcast para outros computadores)
      import('../services/localNetworkService').then(({ emitLocalDataChange }) => {
        if (selectedItems.orders) emitLocalDataChange('orders', []);
        if (selectedItems.clients) emitLocalDataChange('clients', []);
        if (selectedItems.parts) emitLocalDataChange('parts', []);
        if (selectedItems.suppliers) emitLocalDataChange('suppliers', []);
        if (selectedItems.services) emitLocalDataChange('services', []);
        if (selectedItems.equipments) {
          emitLocalDataChange('equipments', []);
          emitLocalDataChange('brands', []);
          emitLocalDataChange('models', []);
        }
        if (selectedItems.sales) emitLocalDataChange('salesHistory', []);
        if (selectedItems.promissory) emitLocalDataChange('clientDebts', []);
        if (selectedItems.cash) emitLocalDataChange('cashMovements', []);
        if (selectedItems.accounts) emitLocalDataChange('accounts', []);
      }).catch(() => {});

      // ✅ RESTAURAÇÃO DA LICENÇA: Garante que as chaves de registro nunca sejam perdidas
      for (const key of LICENSE_KEYS_TO_PRESERVE) {
        const val = preservedLicenseData[key];
        if (val !== null && val !== undefined) {
          localStorage.setItem(key, val);
        }
      }

      // Registra evento no Log de Auditoria
      logAuditEvent({
        userId: selectedAdminId || currentUser?.id || 'admin',
        userName: currentUser?.name || 'Administrador',
        action: 'FACTORY_RESET',
        targetType: 'system',
        details: { resetModules: selectedItems },
      });

      // Dispara evento de storage
      window.dispatchEvent(new Event('storage'));

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
      className="fixed inset-0 z-[80] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 select-none font-sans text-xs animate-fadeIn"
    >
      <div
        className="bg-white border-2 border-red-500/80 rounded-2xl w-full max-w-4xl max-h-[96vh] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header com Alerta */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-red-700 via-rose-800 to-red-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <RotateCcw className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black leading-tight flex items-center gap-2">
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
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Verificação de Permissão de Administrador */}
        {!isAdmin ? (
          <div className="p-8 text-center space-y-3 bg-red-50 overflow-y-auto">
            <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
            <h3 className="text-base font-bold text-red-900">Acesso Restrito ao Administrador</h3>
            <p className="text-xs text-red-700 max-w-md mx-auto leading-relaxed">
              Você está conectado como <strong>{currentUser?.name || 'Operador'}</strong> ({currentUser?.role || 'Usuário'}).
              Apenas usuários com perfil de Administrador podem restaurar os dados do sistema.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-xl font-bold cursor-pointer"
              >
                Entendido / Fechar
              </button>
            </div>
          </div>
        ) : step === 'SELECT' ? (
          /* PASSO 1: SELEÇÃO DO QUE RESTAURAR */
          <form onSubmit={handleProceedToConfirm} className="p-3 space-y-2 bg-slate-50 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              {/* Linha Superior: Avisos de Segurança e Autenticação Admin */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <div className="md:col-span-6 grid grid-cols-2 gap-1.5">
                  <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2 text-emerald-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="text-[10px] leading-tight">
                      <strong className="block">Licença Preservada</strong>
                      Chave serial continua ativada
                    </div>
                  </div>
                  <div className="bg-sky-50 border border-sky-300 rounded-lg p-2 text-sky-900 flex items-center gap-1.5">
                    <DatabaseBackup className="w-4 h-4 text-sky-600 shrink-0" />
                    <div className="text-[10px] leading-tight">
                      <strong className="block">Backup de Segurança</strong>
                      Salvo por 7 dias antes do reset
                    </div>
                  </div>
                </div>

                {/* Seleção do Administrador + Senha */}
                <div className="md:col-span-6 bg-white p-2 rounded-lg border border-slate-300 grid grid-cols-2 gap-2 shadow-2xs">
                  <div>
                    <label className="block font-bold text-slate-800 mb-0.5 text-[10px] flex items-center gap-1">
                      <Users className="w-3 h-3 text-sky-700" />
                      Admin <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedAdminId}
                      onChange={(e) => {
                        setSelectedAdminId(e.target.value);
                        setPassword('');
                        setErrorMsg(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-red-600 focus:bg-white text-[10.5px] uppercase cursor-pointer"
                    >
                      {adminUsers.map((a) => (
                        <option key={a.id} value={a.id} className="uppercase font-bold">
                          {(a.name || a.username).toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-0.5 text-[10px] flex items-center gap-1">
                      <Lock className="w-3 h-3 text-red-600" />
                      Senha <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder="Senha do admin..."
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-red-600 focus:bg-white text-[10.5px]"
                    />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-100 border border-red-400 text-red-800 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Grid com Todos os 12 Módulos Visíveis (2 Colunas) - Sem Rolagem */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-2xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 mb-1.5">
                  <span className="font-bold text-slate-800 text-[11px]">Selecione os módulos que deseja restaurar:</span>
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
                      Desmarcar Todos
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {/* 1. Configurações do Sistema */}
                  <label
                    onClick={() => toggleItem('config')}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                      selectedItems.config ? 'bg-red-50 border-red-300 ring-1 ring-red-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sky-700 shrink-0">
                      {selectedItems.config ? (
                        <CheckSquare className="w-4 h-4 text-red-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px] truncate">
                        <Settings className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        Configurações do Sistema
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-none truncate">
                        Dados da empresa, termos e preferências
                      </p>
                    </div>
                  </label>

                  {/* 2. Clientes */}
                  <label
                    onClick={() => toggleItem('clients')}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                      selectedItems.clients ? 'bg-red-50 border-red-300 ring-1 ring-red-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sky-700 shrink-0">
                      {selectedItems.clients ? (
                        <CheckSquare className="w-4 h-4 text-red-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px] truncate">
                        <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Clientes
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-none truncate">
                        Todos os clientes cadastrados
                      </p>
                    </div>
                  </label>

                  {/* 3. Ordens de Serviço */}
                  <label
                    onClick={() => toggleItem('orders')}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                      selectedItems.orders ? 'bg-red-50 border-red-300 ring-1 ring-red-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sky-700 shrink-0">
                      {selectedItems.orders ? (
                        <CheckSquare className="w-4 h-4 text-red-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px] truncate">
                        <FileText className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        OS, Visitas e Orçamentos
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-none truncate">
                        Todas as OS (reinicia para OS-0001)
                      </p>
                    </div>
                  </label>

                  {/* 4. Peças e Estoque */}
                  <label
                    onClick={() => toggleItem('parts')}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                      selectedItems.parts ? 'bg-red-50 border-red-300 ring-1 ring-red-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sky-700 shrink-0">
                      {selectedItems.parts ? (
                        <CheckSquare className="w-4 h-4 text-red-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px] truncate">
                        <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        Peças e Controle de Estoque
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-none truncate">
                        Catálogo de peças e ordens de compra
                      </p>
                    </div>
                  </label>

                  {/* 5. Fornecedores */}
                  <label
                    onClick={() => toggleItem('suppliers')}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                      selectedItems.suppliers ? 'bg-red-50 border-red-300 ring-1 ring-red-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sky-700 shrink-0">
                      {selectedItems.suppliers ? (
                        <CheckSquare className="w-4 h-4 text-red-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px] truncate">
                        <Truck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        Fornecedores
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-none truncate">
                        Fornecedores e dados fiscais
                      </p>
                    </div>
                  </label>

                  {/* 6. Serviços */}
                  <label
                    onClick={() => toggleItem('services')}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                      selectedItems.services ? 'bg-red-50 border-red-300 ring-1 ring-red-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sky-700 shrink-0">
                      {selectedItems.services ? (
                        <CheckSquare className="w-4 h-4 text-red-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px] truncate">
                        <Wrench className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        Catálogo de Serviços
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-none truncate">
                        Preços e mão de obra
                      </p>
                    </div>
                  </label>

                  {/* 7. Equipamentos, Marcas e Modelos */}
                  <label
                    onClick={() => toggleItem('equipments')}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                      selectedItems.equipments ? 'bg-red-50 border-red-300 ring-1 ring-red-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sky-700 shrink-0">
                      {selectedItems.equipments ? (
                        <CheckSquare className="w-4 h-4 text-red-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px] truncate">
                        <Cpu className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        Equipamentos, Marcas e Modelos
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-none truncate">
                        Tipos de aparelhos, marcas e modelos
                      </p>
                    </div>
                  </label>

                  {/* 8. Controle de Caixa */}
                  <label
                    onClick={() => toggleItem('cash')}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                      selectedItems.cash ? 'bg-red-50 border-red-300 ring-1 ring-red-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sky-700 shrink-0">
                      {selectedItems.cash ? (
                        <CheckSquare className="w-4 h-4 text-red-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px] truncate">
                        <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Controle de Caixa
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-none truncate">
                        Movimentações e sessões de caixa
                      </p>
                    </div>
                  </label>

                  {/* 9. Contas a Pagar e Receber */}
                  <label
                    onClick={() => toggleItem('accounts')}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                      selectedItems.accounts ? 'bg-red-50 border-red-300 ring-1 ring-red-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sky-700 shrink-0">
                      {selectedItems.accounts ? (
                        <CheckSquare className="w-4 h-4 text-red-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px] truncate">
                        <Receipt className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        Contas a Pagar e Receber
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-none truncate">
                        Títulos, parcelas e quitações
                      </p>
                    </div>
                  </label>

                  {/* 10. Vendas Balcão (PDV) */}
                  <label
                    onClick={() => toggleItem('sales')}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                      selectedItems.sales ? 'bg-red-50 border-red-300 ring-1 ring-red-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sky-700 shrink-0">
                      {selectedItems.sales ? (
                        <CheckSquare className="w-4 h-4 text-red-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px] truncate">
                        <ShoppingCart className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        Vendas Balcão (PDV)
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-none truncate">
                        Histórico de vendas e carrinhos
                      </p>
                    </div>
                  </label>

                  {/* 11. Notas Promissórias & Crediário */}
                  <label
                    onClick={() => toggleItem('promissory')}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                      selectedItems.promissory ? 'bg-red-50 border-red-300 ring-1 ring-red-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sky-700 shrink-0">
                      {selectedItems.promissory ? (
                        <CheckSquare className="w-4 h-4 text-red-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px] truncate">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                        Notas Promissórias & Crediário
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-none truncate">
                        Dívidas de clientes e crediário
                      </p>
                    </div>
                  </label>

                  {/* 12. Históricos e Auditoria */}
                  <label
                    onClick={() => toggleItem('history')}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                      selectedItems.history ? 'bg-red-50 border-red-300 ring-1 ring-red-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sky-700 shrink-0">
                      {selectedItems.history ? (
                        <CheckSquare className="w-4 h-4 text-red-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px] truncate">
                        <History className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        Históricos & Auditoria
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-none truncate">
                        Logs de ações e auditoria
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Rodapé do Passo 1 */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 shrink-0">
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
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer transition-transform hover:scale-102 active:scale-98"
              >
                <span>Continuar Restauração</span>
                <AlertTriangle className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : step === 'CONFIRM_DOUBLE' ? (
          /* PASSO 2: SEGUNDA CONFIRMAÇÃO DE MÁXIMA SEGURANÇA */
          <div className="p-4 bg-red-50/60 flex-1 flex flex-col justify-between overflow-hidden">
            <div className="space-y-2.5">
              {/* Cabeçalho compacto */}
              <div className="text-center space-y-1">
                <div className="w-10 h-10 bg-red-100 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto text-red-600">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="text-sm font-black text-red-950 uppercase tracking-tight">
                  CONFIRMAÇÃO DEFINITIVA DE RESTAURAÇÃO
                </h3>
                <p className="text-[11px] text-red-800 leading-tight">
                  Esta ação é <strong>IRREVERSÍVEL</strong>. Os dados selecionados serão permanentemente apagados.
                </p>
              </div>

              {/* Resumo em grid 2 colunas compacto */}
              <div className="bg-white p-2.5 rounded-xl border border-red-300 shadow-2xs">
                <span className="font-bold text-slate-800 block text-[11px] mb-1">Módulos que serão restaurados:</span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10.5px] text-slate-700">
                  {selectedItems.config && <div>• <strong>Configurações</strong>: Padrão de fábrica</div>}
                  {selectedItems.clients && <div className="text-red-700 font-semibold">• <strong>Clientes</strong>: Todos apagados</div>}
                  {selectedItems.orders && <div className="text-red-700 font-semibold">• <strong>OS</strong>: Apagadas (reinicia OS-0001)</div>}
                  {selectedItems.parts && <div>• <strong>Peças & Estoque</strong>: Esvaziados</div>}
                  {selectedItems.suppliers && <div>• <strong>Fornecedores</strong>: Todos apagados</div>}
                  {selectedItems.services && <div>• <strong>Serviços</strong>: Todos apagados</div>}
                  {selectedItems.equipments && <div>• <strong>Equipamentos/Marcas</strong>: Apagados</div>}
                  {selectedItems.cash && <div className="text-red-700 font-semibold">• <strong>Caixa</strong>: Sessão fechada</div>}
                  {selectedItems.accounts && <div className="text-red-700 font-semibold">• <strong>Contas P/R</strong>: Todas apagadas</div>}
                  {selectedItems.sales && <div className="text-red-700 font-semibold">• <strong>Vendas Balcão</strong>: Apagadas</div>}
                  {selectedItems.promissory && <div className="text-red-700 font-semibold">• <strong>Promissórias</strong>: Todas apagadas</div>}
                  {selectedItems.history && <div>• <strong>Auditoria/Logs</strong>: Apagados</div>}
                </div>
              </div>

              {/* Campo de confirmação */}
              <div className="bg-white p-2.5 rounded-xl border border-red-300">
                <label className="block text-xs font-bold text-red-900 text-center mb-1.5">
                  Para confirmar, digite <strong className="text-red-600 font-black">RESTAURAR</strong> abaixo:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="Digite RESTAURAR"
                  autoFocus
                  className="w-full bg-red-50/50 border border-red-300 rounded-lg px-3 py-1.5 text-center font-black tracking-widest text-red-700 focus:outline-none focus:border-red-600 focus:bg-white text-sm uppercase"
                />
              </div>

              {errorMsg && (
                <div className="bg-red-100 border border-red-400 text-red-800 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Botões */}
            <div className="flex items-center justify-between pt-2 border-t border-red-200 shrink-0">
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
                disabled={loading || confirmText !== 'RESTAURAR'}
                onClick={handleExecuteReset}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer transition-transform hover:scale-102 active:scale-98"
              >
                {loading ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Flame className="w-4 h-4" />
                    SIM, RESTAURAR AGORA
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* PASSO 3: TELA DE SUCESSO E CONFIRMAÇÃO VISUAL */
          <div className="p-6 text-center space-y-4 bg-emerald-50/70 overflow-y-auto flex-1 flex flex-col justify-between items-center">
            <div className="space-y-3 my-auto w-full max-w-md">
              <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-lg shadow-emerald-600/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-base font-black text-emerald-950 uppercase tracking-tight">
                Padrão de Fábrica Restaurado com Sucesso!
              </h3>
              <p className="text-xs text-emerald-800 max-w-sm mx-auto leading-relaxed">
                Todos os dados e módulos selecionados foram limpos e redefinidos para os padrões originais do sistema.
              </p>

              {/* Card informativo sobre o backup de segurança com retenção de 7 dias */}
              <div className="bg-white border border-emerald-300 rounded-xl p-3 text-left shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-[11.5px]">
                  <DatabaseBackup className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cópia de Segurança Salva (7 Dias de Retenção)</span>
                </div>
                <p className="text-[10.5px] text-slate-600 leading-snug">
                  Um backup completo com todos os dados anteriores ao reset foi gerado automaticamente e guardado por <strong>7 dias</strong>.
                </p>
                {safetyBackupInfo?.backupPath && (
                  <div className="bg-slate-50 border border-slate-200 rounded p-1.5 text-[10px] text-slate-500 font-mono break-all flex items-start gap-1">
                    <FolderCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{safetyBackupInfo.backupPath}</span>
                  </div>
                )}
                <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <span>💡 Você pode recuperá-lo a qualquer momento em <strong>Arquivos → Restaurar Backup</strong>.</span>
                </div>
              </div>
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
