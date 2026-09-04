import React, { useState } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, getDocs, deleteDoc, collection } from 'firebase/firestore';
import {
  Folder,
  UserPlus,
  Users,
  FileText,
  Settings,
  Printer,
  SlidersHorizontal,
  ChevronDown,
  LogOut,
  PlusCircle,
  DatabaseBackup,
  RotateCcw,
  Package,
  Wrench,
  Cpu,
  FileCheck,
  Search,
  KeyRound,
  ShieldCheck,
  Image as ImageIcon,
  Calendar,
  Calculator,
  Hash,
  MessageSquare,
  Smartphone,
  ArrowUpCircle,
  Wallet,
  ShoppingCart,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface TopMenuBarProps {
  onNewOrder: () => void;
  onLogout: () => void;
  onOpenTab: (tab: 'dashboard' | 'schedule') => void;
  onOpenRegister: (type: 'CLIENT' | 'PART' | 'TECHNICIAN' | 'EQUIPMENT' | 'SERVICE') => void;
  onOpenMenuOSModal: () => void;
  onOpenUsersModal: () => void;
  onOpenBackupModal: () => void;
  onOpenClientsModal?: (initialSearch?: string) => void;
  onOpenPartsModal?: () => void;
  onOpenEquipmentsModal?: () => void;
  onOpenServicesModal?: () => void;
  onOpenOrderStatusModal?: () => void;
  onOpenCompanyModal?: () => void;
  onOpenLinkMobileModal?: () => void;
  onOpenWallpaperModal?: () => void;
  onOpenPeriodReportModal?: () => void;
  onOpenTechnicianOrdersReportModal?: () => void;
  onOpenTechniciansModal?: () => void;
  onOpenFactoryResetModal?: () => void;
  onOpenOSGeneralConfigModal?: () => void;
  onOpenOrderSequenceModal?: () => void;
  onOpenPrinterConfigModal?: () => void;
  onOpenEstimatesModal?: () => void;
  onOpenCreateEstimateModal?: () => void;
  onOpenUpdateSystemModal?: () => void;
  onOpenCashRegisterModal?: () => void;
  onOpenSalesModal?: () => void;
  onOpenSerialLicenseModal?: () => void;
  currentUser?: any;
}

export const TopMenuBar: React.FC<TopMenuBarProps> = ({
  onNewOrder,
  onLogout,
  onOpenTab,
  onOpenRegister,
  onOpenMenuOSModal,
  currentUser,
  onOpenUsersModal,
  onOpenBackupModal,
  onOpenClientsModal,
  onOpenPartsModal,
  onOpenOrderSequenceModal,
  onOpenEquipmentsModal,
  onOpenServicesModal,
  onOpenOrderStatusModal,
  onOpenCompanyModal,
  onOpenLinkMobileModal,
  onOpenWallpaperModal,
  onOpenPeriodReportModal,
  onOpenTechnicianOrdersReportModal,
  onOpenTechniciansModal,
  onOpenFactoryResetModal,
  onOpenOSGeneralConfigModal,
  onOpenPrinterConfigModal,
  onOpenEstimatesModal,
  onOpenCreateEstimateModal,
  onOpenUpdateSystemModal,
  onOpenCashRegisterModal,
  onOpenSalesModal,
  onOpenSerialLicenseModal,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<{
    isOpen: boolean;
    isRestoring: boolean;
    title: string;
    message: string;
    isSuccess: boolean;
    details?: string;
  }>({
    isOpen: false,
    isRestoring: false,
    title: '',
    message: '',
    isSuccess: false,
  });

  const isAdmin = Boolean(
    !currentUser ||
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'admin' ||
    currentUser?.isAdmin === true ||
    currentUser?.username?.toLowerCase() === 'admin' ||
    (currentUser?.name || '').toLowerCase().includes('admin')
  );

  // Helper geral de permissão (Admin sempre tem acesso liberado)
  const hasPerm = (permName: string, defaultValue: boolean = false): boolean => {
    if (isAdmin) return true;
    if (!currentUser || !currentUser.permissions) return defaultValue;
    const val = currentUser.permissions[permName];
    return val !== undefined ? Boolean(val) : defaultValue;
  };

  // Permissões específicas mapeadas
  const canManageUsers = hasPerm('manageUsers', false);
  const canAccessBackup = hasPerm('accessBackup', false);
  const canManagePrinterConfig = hasPerm('managePrinterConfig', true);
  const canManageClients = hasPerm('manageClients', true);
  const canManageParts = hasPerm('manageParts', true);
  const canManageEquipments = hasPerm('manageEquipments', true);
  const canManageServices = hasPerm('manageServices', true);
  const canManageTechnicians = hasPerm('manageTechnicians', false);
  const canManageOrderStatus = hasPerm('manageOrderStatus', false);
  const canManageEstimates = hasPerm('manageEstimates', true);
  const canManageSales = hasPerm('manageSales', true);
  const canManageCashRegister = hasPerm('manageCashRegister', false);
  const canManageOSGeneralConfig = hasPerm('manageOSGeneralConfig', false);
  const canManageOrderSequence = hasPerm('manageOrderSequence', false);
  const canManageWarrantyTerms = hasPerm('manageWarrantyTerms', false);
  const canViewGeneralReports = hasPerm('viewGeneralReports', false);
  const canViewTechnicianReports = hasPerm('viewTechnicianReports', false);
  const canManageWallpaper = hasPerm('manageWallpaper', true);
  const canManageMobileLink = hasPerm('manageMobileLink', false);
  const canManageCompanyData = hasPerm('manageCompanyData', false);
  const canAccessFactoryReset = hasPerm('accessFactoryReset', false);

  const toggleMenu = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const handleAction = (action: () => void) => {
    action();
    setOpenMenu(null);
  };

  const handleRestoreBackup = async () => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const { invoke } = await import('@tauri-apps/api/core');

        const selected = await open({
          multiple: false,
          directory: false,
          title: 'Selecione o arquivo de backup para restaurar',
          filters: [
            {
              name: 'Arquivos de Backup (*.json, *.sqlite, *.db)',
              extensions: ['json', 'sqlite', 'db'],
            },
          ],
        });

        if (!selected || typeof selected !== 'string') return;

        const content = await invoke<string>('read_backup_file', { path: selected });
        await processRestoreContent(content);
        return;
      }
    } catch (err) {
      console.warn('Falha ao abrir diálogo nativo para restauração, usando fallback web:', err);
    }

    // Fallback web tradicional
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.db,.sqlite';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        await processRestoreContent(content);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const processRestoreContent = async (rawContent: string) => {
    try {
      setRestoreStatus({
        isOpen: true,
        isRestoring: true,
        title: 'Restaurando Banco de Dados...',
        message: 'Lendo dados do arquivo de backup e restaurando todas as tabelas (OS, Clientes, Peças, Serviços, Equipamentos, Caixa e Configurações)...',
        isSuccess: false,
      });

      const data = JSON.parse(rawContent);

      // 1. Restaura snapshot completo do storage se disponível
      if (data.storage && typeof data.storage === 'object') {
        for (const [key, val] of Object.entries(data.storage)) {
          if (key && val !== undefined) {
            localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
          }
        }
      }

      // 2. Restaura chaves individuais para garantir integridade e compatibilidade
      if (data.clients) localStorage.setItem('vollen_clients', JSON.stringify(data.clients));
      if (data.orders) localStorage.setItem('vollen_orders', JSON.stringify(data.orders));
      if (data.visits) localStorage.setItem('vollen_visits', JSON.stringify(data.visits));
      if (data.users) localStorage.setItem('vollen_users', JSON.stringify(data.users));
      if (data.companyData) localStorage.setItem('vollen_company_data', JSON.stringify(data.companyData));
      if (data.estimates) localStorage.setItem('vollen_estimates', JSON.stringify(data.estimates));
      if (data.parts) {
        localStorage.setItem('vollen_parts', JSON.stringify(data.parts));
        localStorage.setItem('vollen_parts_stock', JSON.stringify(data.parts));
      }
      if (data.services) localStorage.setItem('vollen_services', JSON.stringify(data.services));
      if (data.customServices) localStorage.setItem('vollen_custom_services', JSON.stringify(data.customServices));
      if (data.equipments) {
        localStorage.setItem('system_equipments', JSON.stringify(data.equipments));
        localStorage.setItem('vollen_equipments', JSON.stringify(data.equipments));
      }
      if (data.technicians) localStorage.setItem('vollen_technicians', JSON.stringify(data.technicians));
      if (data.osStatuses) localStorage.setItem('custom_os_statuses_v3', JSON.stringify(data.osStatuses));
      if (data.cashMovements) localStorage.setItem('vollen_cash_movements', JSON.stringify(data.cashMovements));
      if (data.currentCashSession) localStorage.setItem('vollen_current_cash_session', JSON.stringify(data.currentCashSession));
      if (data.cashRegistersHistory) localStorage.setItem('cash_registers_history', JSON.stringify(data.cashRegistersHistory));
      if (data.cashRegisterColumns) localStorage.setItem('vollen_cash_register_columns', JSON.stringify(data.cashRegisterColumns));
      if (data.salesHistory) localStorage.setItem('vollen_sales_history', JSON.stringify(data.salesHistory));
      if (data.savedCarts) localStorage.setItem('vollen_saved_carts', JSON.stringify(data.savedCarts));
      if (data.activeCart) localStorage.setItem('vollen_active_cart', JSON.stringify(data.activeCart));
      if (data.customWallpaper) localStorage.setItem('system_wallpaper_url', data.customWallpaper);
      if (data.wallpaperOpacity) localStorage.setItem('system_wallpaper_opacity', data.wallpaperOpacity);
      if (data.wallpaperPosX) localStorage.setItem('system_wallpaper_pos_x', data.wallpaperPosX);
      if (data.wallpaperPosY) localStorage.setItem('system_wallpaper_pos_y', data.wallpaperPosY);
      if (data.wallpaperScale) localStorage.setItem('system_wallpaper_scale', data.wallpaperScale);
      if (data.osPreferences) {
        localStorage.setItem('vollen_os_preferences', JSON.stringify(data.osPreferences));
        localStorage.setItem('vollen_os_general_config', JSON.stringify(data.osPreferences));
        localStorage.setItem('vollen_os_config', JSON.stringify(data.osPreferences));
      }
      if (data.osGeneralConfig) {
        localStorage.setItem('vollen_os_general_config', JSON.stringify(data.osGeneralConfig));
        localStorage.setItem('vollen_os_config', JSON.stringify(data.osGeneralConfig));
      }
      if (data.customNextOSNumber) localStorage.setItem('vollen_custom_next_os_number', data.customNextOSNumber);
      if (data.printerConfig) localStorage.setItem('vollen_printer_config', JSON.stringify(data.printerConfig));
      if (data.warrantyTerms) {
        localStorage.setItem('warranty_config', JSON.stringify(data.warrantyTerms));
        localStorage.setItem('vollen_warranty_terms', JSON.stringify(data.warrantyTerms));
      }
      if (data.auditLogs) localStorage.setItem('audit_logs', JSON.stringify(data.auditLogs));

      // 3. Se o Firestore estiver ativo, sincroniza os dados restaurados para o banco em nuvem
      if (db) {
        try {
          // Limpa coleções existentes antes de gravar os registros do backup
          const [oldOrdersSnap, oldClientsSnap, oldPartsSnap, oldServicesSnap, oldEqSnap, oldEstSnap, oldCashMovSnap] = await Promise.all([
            getDocs(collection(db, 'orders')).catch(() => null),
            getDocs(collection(db, 'clients')).catch(() => null),
            getDocs(collection(db, 'parts')).catch(() => null),
            getDocs(collection(db, 'services')).catch(() => null),
            getDocs(collection(db, 'equipments')).catch(() => null),
            getDocs(collection(db, 'estimates')).catch(() => null),
            getDocs(collection(db, 'cash_movements')).catch(() => null),
          ]);

          if (oldOrdersSnap && !oldOrdersSnap.empty) {
            await Promise.all(oldOrdersSnap.docs.map((d) => deleteDoc(doc(db, 'orders', d.id)).catch(() => {})));
          }
          if (oldClientsSnap && !oldClientsSnap.empty) {
            await Promise.all(oldClientsSnap.docs.map((d) => deleteDoc(doc(db, 'clients', d.id)).catch(() => {})));
          }
          if (oldPartsSnap && !oldPartsSnap.empty) {
            await Promise.all(oldPartsSnap.docs.map((d) => deleteDoc(doc(db, 'parts', d.id)).catch(() => {})));
          }
          if (oldServicesSnap && !oldServicesSnap.empty) {
            await Promise.all(oldServicesSnap.docs.map((d) => deleteDoc(doc(db, 'services', d.id)).catch(() => {})));
          }
          if (oldEqSnap && !oldEqSnap.empty) {
            await Promise.all(oldEqSnap.docs.map((d) => deleteDoc(doc(db, 'equipments', d.id)).catch(() => {})));
          }
          if (oldEstSnap && !oldEstSnap.empty) {
            await Promise.all(oldEstSnap.docs.map((d) => deleteDoc(doc(db, 'estimates', d.id)).catch(() => {})));
          }
          if (oldCashMovSnap && !oldCashMovSnap.empty) {
            await Promise.all(oldCashMovSnap.docs.map((d) => deleteDoc(doc(db, 'cash_movements', d.id)).catch(() => {})));
          }

          // Grava dados restaurados
          const clientsList = data.clients || (data.storage && data.storage.vollen_clients) || [];
          if (Array.isArray(clientsList)) {
            for (const c of clientsList) {
              if (c && c.id) await setDoc(doc(db, 'clients', String(c.id)), c, { merge: true }).catch(() => {});
            }
          }

          const ordersList = data.orders || (data.storage && data.storage.vollen_orders) || [];
          if (Array.isArray(ordersList)) {
            for (const o of ordersList) {
              if (o && o.id) await setDoc(doc(db, 'orders', String(o.id)), o, { merge: true }).catch(() => {});
            }
          }

          const rawPartsList = data.parts || (data.storage && (data.storage.vollen_parts_stock || data.storage.vollen_parts)) || [];
          if (Array.isArray(rawPartsList)) {
            const partsList = rawPartsList.map((p: any) => ({
              ...p,
              stockQuantity: Number(p.stockQuantity !== undefined ? p.stockQuantity : 0),
              minStock: Number(p.minStock !== undefined ? p.minStock : 0),
            }));
            localStorage.setItem('vollen_parts', JSON.stringify(partsList));
            localStorage.setItem('vollen_parts_stock', JSON.stringify(partsList));
            for (const p of partsList) {
              if (p && p.id) await setDoc(doc(db, 'parts', String(p.id)), p, { merge: true }).catch(() => {});
            }
          }

          const servicesList = data.services || (data.storage && data.storage.vollen_services) || [];
          if (Array.isArray(servicesList)) {
            for (const s of servicesList) {
              if (s && s.id) await setDoc(doc(db, 'services', String(s.id)), s, { merge: true }).catch(() => {});
            }
          }

          // Restaura todos os equipamentos tanto da chave equipments quanto das chaves do storage
          const eqList = data.equipments || (data.storage && (data.storage.vollen_equipments || data.storage.system_equipments)) || [];
          if (Array.isArray(eqList)) {
            for (const e of eqList) {
              const eqId = e.id || e.code || String(Date.now());
              if (eqId) await setDoc(doc(db, 'equipments', String(eqId)), { ...e, id: String(eqId) }, { merge: true }).catch(() => {});
            }
          }

          // Restaura todas as movimentações e sessões de caixa
          const cashMovList = data.cashMovements || (data.storage && (data.storage.vollen_cash_movements || data.storage.cash_transactions)) || [];
          if (Array.isArray(cashMovList)) {
            for (const mov of cashMovList) {
              const movId = mov.id || String(Date.now());
              if (movId) await setDoc(doc(db, 'cash_movements', String(movId)), { ...mov, id: String(movId) }, { merge: true }).catch(() => {});
            }
          }

          const sessionToRestore = data.currentCashSession || (data.storage && (data.storage.vollen_current_cash_session || data.storage.daily_cash_register_status));
          if (sessionToRestore) {
            await setDoc(doc(db, 'cash_registers', 'current_session'), sessionToRestore, { merge: true }).catch(() => {});
          } else {
            await deleteDoc(doc(db, 'cash_registers', 'current_session')).catch(() => {});
          }

          const estimatesList = data.estimates || (data.storage && data.storage.vollen_estimates) || [];
          if (Array.isArray(estimatesList)) {
            for (const est of estimatesList) {
              if (est && est.id) await setDoc(doc(db, 'estimates', String(est.id)), est, { merge: true }).catch(() => {});
            }
          }

          // Restaura Status de OS personalizados
          const osStatusesList = data.osStatuses || (data.storage && (data.storage.custom_os_statuses_v3 || data.storage.system_os_statuses)) || [];
          if (Array.isArray(osStatusesList) && osStatusesList.length > 0) {
            for (const st of osStatusesList) {
              const stId = st.id || String(Date.now());
              if (stId) await setDoc(doc(db, 'os_statuses', String(stId)), { ...st, id: String(stId) }, { merge: true }).catch(() => {});
            }
          }

          // Restaura Técnicos
          const techniciansList = data.technicians || (data.storage && data.storage.vollen_technicians) || [];
          if (Array.isArray(techniciansList) && techniciansList.length > 0) {
            for (const tech of techniciansList) {
              const techId = tech.id || String(Date.now());
              if (techId) await setDoc(doc(db, 'technicians', String(techId)), { ...tech, id: String(techId) }, { merge: true }).catch(() => {});
            }
          }

          // Restaura Dados da Empresa, Preferências de OS e Termos de Garantia
          if (data.companyData) {
            await setDoc(doc(db, 'system_config', 'company_data'), data.companyData, { merge: true }).catch(() => {});
          }

          const osPrefs = data.osPreferences || data.osGeneralConfig || (data.storage && (data.storage.vollen_os_preferences || data.storage.vollen_os_general_config));
          if (osPrefs) {
            await setDoc(doc(db, 'system_config', 'os_preferences'), osPrefs, { merge: true }).catch(() => {});
          }

          const warrantyConfig = data.warrantyTerms || (data.storage && (data.storage.warranty_config || data.storage.vollen_warranty_terms));
          if (warrantyConfig) {
            await setDoc(doc(db, 'system_config', 'warranty_config'), warrantyConfig, { merge: true }).catch(() => {});
          }
        } catch (cloudErr) {
          console.warn('Aviso na sincronização de nuvem da restauração:', cloudErr);
        }
      }

      sessionStorage.setItem('backup_restored_success_msg', 'true');
      setRestoreStatus({
        isOpen: true,
        isRestoring: false,
        title: 'Backup Restaurado com Sucesso!',
        message: 'Todas as Ordens de Serviço, Clientes, Peças, Serviços, Equipamentos, Caixa, Vendas e Configurações foram carregadas com precisão.',
        details: 'Clique no botão abaixo para recarregar o sistema e exibir todos os registros.',
        isSuccess: true,
      });
    } catch (err: any) {
      console.error('Erro ao restaurar arquivo de backup:', err);
      setRestoreStatus({
        isOpen: true,
        isRestoring: false,
        title: 'Erro ao Restaurar Backup',
        message: err?.message || 'Não foi possível restaurar o backup. Certifique-se de selecionar um arquivo (.json) válido.',
        isSuccess: false,
      });
    }
  };

  const handlePrintSystem = () => {
    window.print();
  };

  return (
    <div
      className="bg-slate-200 border-b border-slate-300 text-xs font-bold text-slate-800 flex items-center flex-nowrap whitespace-nowrap px-1 select-none relative z-50 shadow-sm"
      onMouseLeave={() => setOpenMenu(null)}
    >
      {/* 1. Arquivos */}
      <div className="relative shrink-0">
        <button
          onClick={() => toggleMenu('arquivos')}
          className={`flex items-center gap-1 px-2.5 py-2 hover:bg-slate-300 hover:text-sky-700 transition-colors ${
            openMenu === 'arquivos' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <Folder className="w-3.5 h-3.5 text-sky-700" />
          Arquivos
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {openMenu === 'arquivos' && (
          <div className="absolute left-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-1.5 min-w-[210px] z-50 text-slate-800">
            <button
              onClick={() => handleAction(() => {
                if (!canManageUsers) {
                  alert('Acesso Negado: Seu usuário não tem permissão para acessar a Gestão de Usuários e Senhas.');
                  return;
                }
                onOpenUsersModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 font-semibold cursor-pointer ${
                canManageUsers ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <KeyRound className={`w-3.5 h-3.5 ${canManageUsers ? 'text-sky-700' : 'text-slate-400'}`} />
              <span>Usuários e Senhas</span>
            </button>

            <div className="my-1 border-t border-slate-200" />

            <button
              onClick={() => handleAction(() => {
                if (!canAccessBackup) {
                  alert('Acesso Negado: Seu usuário não tem permissão para Criar Backup.');
                  return;
                }
                onOpenBackupModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                canAccessBackup ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <DatabaseBackup className={`w-3.5 h-3.5 ${canAccessBackup ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Criar Backup</span>
            </button>

            <button
              onClick={() => handleAction(() => {
                if (!canAccessBackup) {
                  alert('Acesso Negado: Seu usuário não tem permissão para Restaurar Backup.');
                  return;
                }
                handleRestoreBackup();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                canAccessBackup ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${canAccessBackup ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Restaurar Backup</span>
            </button>

            <button
              onClick={() => handleAction(() => {
                if (!canManagePrinterConfig) {
                  alert('Acesso Negado: Seu usuário não tem permissão para Configurações de Impressora.');
                  return;
                }
                if (onOpenPrinterConfigModal) onOpenPrinterConfigModal();
                else handlePrintSystem();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer font-medium ${
                canManagePrinterConfig ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Printer className={`w-3.5 h-3.5 ${canManagePrinterConfig ? 'text-sky-700' : 'text-slate-400'}`} />
              <span>Configurações de Impressora</span>
            </button>

            <div className="my-1 border-t border-slate-200" />

            <button
              onClick={() => handleAction(onLogout)}
              className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-700 flex items-center gap-2 font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair do Sistema
            </button>
          </div>
        )}
      </div>

      {/* 2. Cadastro */}
      <div className="relative shrink-0">
        <button
          onClick={() => toggleMenu('cadastro')}
          className={`flex items-center gap-1 px-2 py-2 hover:bg-slate-300 hover:text-sky-700 transition-colors ${
            openMenu === 'cadastro' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <UserPlus className="w-3.5 h-3.5 text-sky-700" />
          Cadastro
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {openMenu === 'cadastro' && (
          <div className="absolute left-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-1.5 min-w-[240px] z-50 text-slate-800 text-xs">
            <button
              onClick={() => handleAction(() => {
                if (!canManageClients) {
                  alert('Acesso Negado: Seu usuário não possui permissão para cadastrar clientes.');
                  return;
                }
                if (onOpenClientsModal) onOpenClientsModal();
                else onOpenRegister('CLIENT');
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 font-bold cursor-pointer ${
                canManageClients ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <UserPlus className={`w-3.5 h-3.5 ${canManageClients ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Cadastrar Cliente</span>
            </button>

            <button
              onClick={() => handleAction(() => {
                if (!canManageParts) {
                  alert('Acesso Negado: Seu usuário não possui permissão para gerenciar peças.');
                  return;
                }
                if (onOpenPartsModal) onOpenPartsModal();
                else onOpenRegister('PART');
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 font-bold cursor-pointer ${
                canManageParts ? 'hover:bg-slate-200 hover:text-amber-700 text-amber-900' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Package className={`w-3.5 h-3.5 ${canManageParts ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Cadastrar Peças</span>
            </button>

            <button
              onClick={() => handleAction(() => {
                if (!canManageEquipments) {
                  alert('Acesso Negado: Seu usuário não possui permissão para gerenciar equipamentos.');
                  return;
                }
                if (onOpenEquipmentsModal) onOpenEquipmentsModal();
                else onOpenRegister('EQUIPMENT');
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 font-bold cursor-pointer ${
                canManageEquipments ? 'hover:bg-slate-200 hover:text-purple-700 text-purple-700' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Cpu className={`w-3.5 h-3.5 ${canManageEquipments ? 'text-purple-600' : 'text-slate-400'}`} />
              <span>Cadastrar Equipamento</span>
            </button>

            <button
              onClick={() => handleAction(() => {
                if (!canManageServices) {
                  alert('Acesso Negado: Seu usuário não possui permissão para gerenciar serviços.');
                  return;
                }
                if (onOpenServicesModal) onOpenServicesModal();
                else onOpenRegister('SERVICE');
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 font-bold cursor-pointer ${
                canManageServices ? 'hover:bg-slate-200 hover:text-sky-700 text-sky-700' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <FileCheck className={`w-3.5 h-3.5 ${canManageServices ? 'text-sky-700' : 'text-slate-400'}`} />
              <span>Cadastrar Serviço</span>
            </button>

            <div className="my-1 border-t border-slate-200" />

            <button
              onClick={() => handleAction(() => {
                if (!canManageUsers) {
                  alert('Acesso Negado: Seu usuário não tem permissão para a Gestão de Usuários e Senhas.');
                  return;
                }
                onOpenUsersModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 font-bold cursor-pointer ${
                canManageUsers ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <KeyRound className={`w-3.5 h-3.5 ${canManageUsers ? 'text-sky-700' : 'text-slate-400'}`} />
              <span>Gestão de Usuários e Senhas</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Clientes */}
      <div className="relative shrink-0">
        <button
          onClick={() => toggleMenu('clientes')}
          className={`flex items-center gap-1 px-2 py-2 hover:bg-slate-300 hover:text-sky-700 transition-colors cursor-pointer ${
            openMenu === 'clientes' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <Users className="w-3.5 h-3.5 text-sky-700" />
          Clientes
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {openMenu === 'clientes' && (
          <div className="absolute left-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-2 min-w-[280px] z-50 text-slate-800 text-xs font-medium animate-fadeIn">
            {/* 1. Acessar Clientes */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageClients) {
                  alert('Acesso Negado: Seu usuário não possui permissão para gerenciar clientes.');
                  return;
                }
                if (onOpenClientsModal) onOpenClientsModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 font-bold cursor-pointer ${
                canManageClients ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Users className={`w-4 h-4 shrink-0 ${canManageClients ? 'text-sky-700' : 'text-slate-400'}`} />
              <span>Acessar Clientes (Central)</span>
            </button>

            {/* 2. Cadastrar Novo Cliente */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageClients) {
                  alert('Acesso Negado: Seu usuário não possui permissão para cadastrar novos clientes.');
                  return;
                }
                onOpenRegister('CLIENT');
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 font-bold cursor-pointer ${
                canManageClients ? 'hover:bg-slate-200 hover:text-emerald-700 text-emerald-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <UserPlus className={`w-4 h-4 shrink-0 ${canManageClients ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Cadastrar Novo Cliente</span>
            </button>

            <div className="border-t border-slate-200 my-1.5"></div>

            {/* 3. Campo de Busca com Enter */}
            <div className="px-3 py-1">
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Search className="w-3 h-3 text-indigo-600" />
                Buscar Cliente:
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Nome, telefone ou endereço (Enter)..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = (e.currentTarget.value || '').trim();
                    if (!canManageClients) {
                      alert('Acesso Negado: Seu usuário não possui permissão para gerenciar clientes.');
                      return;
                    }
                    handleAction(() => onOpenClientsModal && onOpenClientsModal(value));
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-xs"
              />
              <span className="text-[10px] text-slate-500 italic mt-1 block">
                Pressione <strong className="text-slate-700">Enter</strong> para abrir e filtrar
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Peças */}
      <button
        onClick={() => {
          if (!canManageParts) {
            alert('Acesso Negado: Seu usuário não possui permissão para gerenciar peças.');
            return;
          }
          if (onOpenPartsModal) onOpenPartsModal();
        }}
        className={`flex items-center gap-1 px-2 py-2 transition-colors cursor-pointer font-bold shrink-0 ${
          canManageParts ? 'hover:bg-slate-300 hover:text-amber-700 text-amber-900' : 'text-slate-400 opacity-50 hover:bg-slate-300'
        }`}
        title={canManageParts ? 'Gestão de Peças' : 'Acesso a Peças Bloqueado'}
      >
        <Package className={`w-3.5 h-3.5 ${canManageParts ? 'text-amber-600' : 'text-slate-400'}`} />
        <span>Peças</span>
      </button>

      {/* Equipamentos */}
      <button
        onClick={() => {
          if (!canManageEquipments) {
            alert('Acesso Negado: Seu usuário não possui permissão para gerenciar equipamentos.');
            return;
          }
          if (onOpenEquipmentsModal) onOpenEquipmentsModal();
        }}
        className={`flex items-center gap-1 px-2 py-2 transition-colors cursor-pointer font-bold shrink-0 ${
          canManageEquipments ? 'hover:bg-slate-300 hover:text-purple-700 text-purple-700' : 'text-slate-400 opacity-50 hover:bg-slate-300'
        }`}
        title={canManageEquipments ? 'Gestão de Equipamentos' : 'Acesso a Equipamentos Bloqueado'}
      >
        <Cpu className={`w-3.5 h-3.5 ${canManageEquipments ? 'text-purple-600' : 'text-slate-400'}`} />
        <span>Equipamentos</span>
      </button>

      {/* Serviços */}
      <button
        onClick={() => {
          if (!canManageServices) {
            alert('Acesso Negado: Seu usuário não possui permissão para gerenciar serviços.');
            return;
          }
          if (onOpenServicesModal) onOpenServicesModal();
        }}
        className={`flex items-center gap-1 px-2 py-2 transition-colors cursor-pointer font-bold shrink-0 ${
          canManageServices ? 'hover:bg-slate-300 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-300'
        }`}
        title={canManageServices ? 'Gestão de Serviços' : 'Acesso a Serviços Bloqueado'}
      >
        <FileCheck className={`w-3.5 h-3.5 ${canManageServices ? 'text-sky-600' : 'text-slate-400'}`} />
        <span>Serviços</span>
      </button>

      {/* Menu OS */}
      <button
        onClick={() => handleAction(onOpenMenuOSModal)}
        className="flex items-center gap-1 px-2 py-2 hover:bg-slate-300 hover:text-sky-700 transition-colors cursor-pointer font-bold shrink-0"
      >
        <FileText className="w-3.5 h-3.5 text-sky-700" />
        Menu OS
      </button>

      {/* Orçamentos */}
      <button
        onClick={() => {
          if (!canManageEstimates) {
            alert('Acesso Negado: Seu usuário não possui permissão para acessar Orçamentos.');
            return;
          }
          if (onOpenEstimatesModal) onOpenEstimatesModal();
        }}
        className={`flex items-center gap-1 px-2 py-2 transition-colors cursor-pointer font-bold shrink-0 ${
          canManageEstimates ? 'hover:bg-slate-300 hover:text-amber-700 text-amber-900' : 'text-slate-400 opacity-50 hover:bg-slate-300'
        }`}
        title={canManageEstimates ? 'Central de Orçamentos' : 'Acesso a Orçamentos Bloqueado'}
      >
        <Calculator className={`w-3.5 h-3.5 ${canManageEstimates ? 'text-amber-600' : 'text-slate-400'}`} />
        <span>Orçamentos</span>
      </button>

      {/* Vendas de Peças (Balcão) */}
      <button
        onClick={() => {
          if (!canManageSales) {
            alert('Acesso Negado: Seu usuário não possui permissão para acessar o Módulo de Vendas.');
            return;
          }
          if (onOpenSalesModal) onOpenSalesModal();
        }}
        className={`flex items-center gap-1 px-2 py-2 transition-colors cursor-pointer font-bold shrink-0 ${
          canManageSales
            ? 'hover:bg-slate-300 hover:text-emerald-700 text-emerald-900'
            : 'text-slate-400 opacity-50 hover:bg-slate-300'
        }`}
        title={canManageSales ? 'Módulo de Vendas Balcão e PDV de Peças (Atalho F9)' : 'Acesso a Vendas Bloqueado para seu usuário'}
      >
        <ShoppingCart className={`w-3.5 h-3.5 ${canManageSales ? 'text-emerald-600' : 'text-slate-400'}`} />
        <span>Vendas</span>
      </button>

      {/* Caixa / Fluxo de Caixa */}
      <button
        onClick={() => {
          if (!canManageCashRegister) {
            alert('Acesso Negado: Seu usuário não possui permissão para acessar o Módulo de Caixa.');
            return;
          }
          if (onOpenCashRegisterModal) onOpenCashRegisterModal();
        }}
        className={`flex items-center gap-1 px-2 py-2 transition-colors cursor-pointer font-bold shrink-0 ${
          canManageCashRegister
            ? 'hover:bg-slate-300 hover:text-emerald-700 text-emerald-900'
            : 'text-slate-400 opacity-50 hover:bg-slate-300'
        }`}
        title={canManageCashRegister ? 'Acessar Controle de Caixa' : 'Acesso ao Caixa Bloqueado para seu usuário'}
      >
        <Wallet className={`w-3.5 h-3.5 ${canManageCashRegister ? 'text-emerald-600' : 'text-slate-400'}`} />
        <span>Caixa</span>
      </button>

      {/* 5. Configuração de OS */}
      <div className="relative shrink-0">
        <button
          onClick={() => toggleMenu('configos')}
          className={`flex items-center gap-1 px-2 py-2 hover:bg-slate-300 hover:text-sky-700 transition-colors cursor-pointer ${
            openMenu === 'configos' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-sky-700" />
          Configuração de OS
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {openMenu === 'configos' && (
          <div className="absolute left-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-1.5 min-w-[270px] z-50 text-slate-800 text-xs">
            {/* 1. Parâmetros e Preferências Gerais de OS */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageOSGeneralConfig) {
                  alert('Acesso Negado: Seu usuário não possui permissão para configurar os Parâmetros da OS.');
                  return;
                }
                if (onOpenOSGeneralConfigModal) onOpenOSGeneralConfigModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 font-bold cursor-pointer ${
                canManageOSGeneralConfig ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Settings className={`w-3.5 h-3.5 ${canManageOSGeneralConfig ? 'text-sky-600' : 'text-slate-400'} shrink-0`} />
              <span>Parâmetros e Regras da OS</span>
            </button>

            {/* 2. Definir Numeração Inicial de OS (Isolado) */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageOrderSequence) {
                  alert('Acesso Negado: Seu usuário não possui permissão para definir a Numeração Inicial da OS.');
                  return;
                }
                if (onOpenOrderSequenceModal) onOpenOrderSequenceModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 font-bold cursor-pointer ${
                canManageOrderSequence ? 'hover:bg-slate-200 hover:text-indigo-700 text-indigo-950' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Hash className={`w-3.5 h-3.5 ${canManageOrderSequence ? 'text-indigo-600' : 'text-slate-400'} shrink-0`} />
              <span>Definir Numeração Inicial da OS</span>
            </button>

            {/* 3. Status de Atendimento */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageOrderStatus) {
                  alert('Acesso Negado: Seu usuário não possui permissão para gerenciar Status de Atendimento.');
                  return;
                }
                if (onOpenOrderStatusModal) onOpenOrderStatusModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 font-bold cursor-pointer ${
                canManageOrderStatus ? 'hover:bg-slate-200 hover:text-amber-700 text-amber-900' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${canManageOrderStatus ? 'text-amber-600' : 'text-slate-400'} shrink-0`} />
              <span>Status de Atendimento</span>
            </button>

            <div className="border-t border-slate-200 my-1"></div>

            {/* 4. Termos dos Comprovantes (Entrada, Orçamento e Saída) */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageWarrantyTerms) {
                  alert('Acesso Negado: Seu usuário não possui permissão para editar os Termos dos Comprovantes.');
                  return;
                }
                if (onOpenRegister) onOpenRegister('WARRANTY_TERMS' as any);
              })}
              className={`w-full text-left px-4 py-2 font-bold flex items-center gap-2 cursor-pointer ${
                canManageWarrantyTerms ? 'hover:bg-slate-200 hover:text-sky-700 text-sky-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${canManageWarrantyTerms ? 'text-sky-600' : 'text-slate-400'} shrink-0`} />
              <span>Termos dos Comprovantes (Entrada / Orçamento / Saída)</span>
            </button>

            {/* 5. Mensagens Prontas do WhatsApp */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageOSGeneralConfig) {
                  alert('Acesso Negado: Seu usuário não possui permissão para configurar mensagens de WhatsApp.');
                  return;
                }
                if (onOpenOSGeneralConfigModal) onOpenOSGeneralConfigModal();
              })}
              className={`w-full text-left px-4 py-2 font-bold flex items-center gap-2 cursor-pointer ${
                canManageOSGeneralConfig ? 'hover:bg-slate-200 hover:text-emerald-700 text-emerald-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <MessageSquare className={`w-3.5 h-3.5 ${canManageOSGeneralConfig ? 'text-emerald-600' : 'text-slate-400'} shrink-0`} />
              <span>Mensagens Prontas do WhatsApp</span>
            </button>
          </div>
        )}
      </div>

      {/* 6. Impressão */}
      <div className="relative shrink-0">
        <button
          onClick={() => toggleMenu('impressao')}
          className={`flex items-center gap-1 px-2 py-2 hover:bg-slate-300 hover:text-sky-700 transition-colors ${
            openMenu === 'impressao' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <Printer className="w-3.5 h-3.5 text-sky-700" />
          Impressão
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {openMenu === 'impressao' && (
          <div className="absolute left-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-1.5 min-w-[250px] z-50 text-slate-800 text-xs">
            <button
              onClick={() => handleAction(() => {
                if (!canViewGeneralReports) {
                  alert('Acesso Negado: Seu usuário não tem permissão para visualizar ou imprimir o Relatório Geral.');
                  return;
                }
                if (onOpenPeriodReportModal) onOpenPeriodReportModal();
                else handlePrintSystem();
              })}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2 font-bold cursor-pointer transition-colors ${
                canViewGeneralReports ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <FileText className={`w-4 h-4 ${canViewGeneralReports ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>Relatório Geral Consolidado</span>
            </button>
          </div>
        )}
      </div>

      {/* 7. Opções */}
      <div className="relative shrink-0">
        <button
          onClick={() => toggleMenu('opcoes')}
          className={`flex items-center gap-1 px-2 py-2 hover:bg-slate-300 hover:text-sky-700 transition-colors ${
            openMenu === 'opcoes' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-sky-700" />
          Opções
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {openMenu === 'opcoes' && (
          <div className="absolute right-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-1.5 min-w-[280px] z-50 text-slate-800 text-xs">
            {/* 1. Alterar Plano de Fundo */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageWallpaper) {
                  alert('Acesso Negado: Seu usuário não tem permissão para alterar o Plano de Fundo.');
                  return;
                }
                if (onOpenWallpaperModal) onOpenWallpaperModal();
              })}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 font-bold cursor-pointer ${
                canManageWallpaper ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <ImageIcon className={`w-4 h-4 shrink-0 ${canManageWallpaper ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>Alterar Plano de Fundo</span>
            </button>

            {/* 2. Ver Lista de OS por Períodos */}
            <button
              onClick={() => handleAction(() => {
                if (!canViewGeneralReports) {
                  alert('Acesso Negado: Seu usuário não tem permissão para visualizar o Relatório de OS por Períodos.');
                  return;
                }
                if (onOpenPeriodReportModal) onOpenPeriodReportModal();
              })}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 font-bold cursor-pointer transition-colors ${
                canViewGeneralReports ? 'hover:bg-slate-200 hover:text-indigo-700 text-indigo-900' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Calendar className={`w-4 h-4 shrink-0 ${canViewGeneralReports ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>Lista de OS por Períodos (Relatório)</span>
            </button>

            {/* 3. Relatório de OS por Técnico */}
            <button
              onClick={() => handleAction(() => {
                if (!canViewTechnicianReports) {
                  alert('Acesso Negado: Seu usuário não tem permissão para visualizar o Relatório de OS por Técnico.');
                  return;
                }
                if (onOpenTechnicianOrdersReportModal) onOpenTechnicianOrdersReportModal();
              })}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 font-bold cursor-pointer transition-colors ${
                canViewTechnicianReports ? 'hover:bg-slate-200 hover:text-emerald-700 text-emerald-950' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Wrench className={`w-4 h-4 shrink-0 ${canViewTechnicianReports ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Relatório por Técnico</span>
            </button>

            {/* 4. Vincular Celular (ApiKey) */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageMobileLink) {
                  alert('Acesso Negado: Seu usuário não tem permissão para gerenciar a vinculação de celular (ApiKey).');
                  return;
                }
                if (onOpenLinkMobileModal) onOpenLinkMobileModal();
              })}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 font-bold cursor-pointer ${
                canManageMobileLink ? 'hover:bg-sky-100 hover:text-sky-800 text-sky-950' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Smartphone className={`w-4 h-4 shrink-0 ${canManageMobileLink ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>Vincular Celular (ApiKey)</span>
            </button>

            <div className="border-t border-slate-200 my-1"></div>

            {/* 5. Dados da Empresa */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageCompanyData) {
                  alert('Acesso Negado: Seu usuário não tem permissão para editar os Dados da Empresa.');
                  return;
                }
                if (onOpenCompanyModal) onOpenCompanyModal();
              })}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 font-bold cursor-pointer transition-colors ${
                canManageCompanyData ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <SlidersHorizontal className={`w-4 h-4 shrink-0 ${canManageCompanyData ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>Dados da Empresa</span>
            </button>

            {/* 6. Chave Serial & Conexão em Nuvem */}
            <button
              onClick={() => handleAction(() => {
                if (!isAdmin) {
                  return alert('Acesso Negado: Apenas Administradores podem acessar a Chave Serial & Conexão em Nuvem.');
                }
                if (onOpenSerialLicenseModal) onOpenSerialLicenseModal();
              })}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 font-bold cursor-pointer transition-colors ${
                isAdmin ? 'hover:bg-indigo-50 text-indigo-900' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
              title={isAdmin ? 'Chave Serial & Conexão em Nuvem' : 'Apenas Administradores podem acessar a Chave Serial'}
            >
              <KeyRound className={`w-4 h-4 shrink-0 ${isAdmin ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>Chave Serial & Conexão em Nuvem</span>
            </button>

            {/* 7. Verificar Atualizações do Sistema */}
            <button
              onClick={() => handleAction(() => {
                if (onOpenUpdateSystemModal) onOpenUpdateSystemModal();
              })}
              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-indigo-700 flex items-center gap-2.5 font-bold cursor-pointer transition-colors"
            >
              <ArrowUpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Verificar Atualizações do Sistema</span>
            </button>

            <div className="border-t border-red-200 my-1"></div>

            {/* 7. Restaurar Padrão de Fábrica */}
            <button
              onClick={() => handleAction(() => {
                if (!canAccessFactoryReset) {
                  alert('Acesso Negado: Seu usuário não possui autorização para Restaurar Padrão de Fábrica.');
                  return;
                }
                if (onOpenFactoryResetModal) onOpenFactoryResetModal();
              })}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 font-bold cursor-pointer transition-colors ${
                canAccessFactoryReset ? 'hover:bg-red-100 text-red-700' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <RotateCcw className={`w-4 h-4 shrink-0 ${canAccessFactoryReset ? 'text-red-600' : 'text-slate-400'}`} />
              <span>Restaurar Padrão de Fábrica</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL FIXO DE STATUS / CONFIRMAÇÃO DE RESTAURAÇÃO DE BACKUP */}
      {restoreStatus.isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans animate-fadeIn">
            {/* Header do Modal */}
            <div
              className={`p-4 border-b flex items-center gap-2.5 ${
                restoreStatus.isRestoring
                  ? 'bg-sky-100 border-sky-200 text-sky-950'
                  : restoreStatus.isSuccess
                  ? 'bg-emerald-100 border-emerald-200 text-emerald-950'
                  : 'bg-red-100 border-red-200 text-red-950'
              }`}
            >
              {restoreStatus.isRestoring ? (
                <Loader2 className="w-5 h-5 text-sky-600 animate-spin shrink-0" />
              ) : restoreStatus.isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <h3 className="font-bold text-sm">{restoreStatus.title}</h3>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6 space-y-3 text-slate-700 text-xs">
              <p className="leading-relaxed font-medium text-slate-800">{restoreStatus.message}</p>
              {restoreStatus.details && (
                <p className="text-slate-600 bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium">
                  {restoreStatus.details}
                </p>
              )}
            </div>

            {/* Rodapé com Ação Clara */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              {restoreStatus.isRestoring ? (
                <span className="text-xs font-bold text-sky-700 flex items-center gap-1.5 py-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gravando registros...
                </span>
              ) : restoreStatus.isSuccess ? (
                <button
                  onClick={() => {
                    setRestoreStatus((prev) => ({ ...prev, isOpen: false }));
                    window.location.reload();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  OK, Recarregar Sistema
                </button>
              ) : (
                <button
                  onClick={() => setRestoreStatus((prev) => ({ ...prev, isOpen: false }))}
                  className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold px-5 py-2 rounded-xl cursor-pointer text-xs"
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
