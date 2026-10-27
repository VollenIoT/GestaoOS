import React, { useState } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, getDocs, deleteDoc, collection } from 'firebase/firestore';
import {
  Folder,
  UserPlus,
  Users,
  UserCheck,
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
  Network,
  Building2,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  BarChart3,
  Tag,
  FileCheck2,
  Truck,
  Receipt,
  ShoppingBag,
  Sparkles,
  PackageCheck,
  ChevronRight,
  Percent,
  Keyboard,
} from 'lucide-react';

import { getCurrentFeatures } from '../config/appFeatures';
import { hasPermission } from '../services/rbacService';
import { useDialog } from './DialogContext';
import { formatCanonicalCode } from '../utils/searchUtils';
import { reconcileUsersWithEmployees } from './UsersModal';

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
  onOpenSuppliersModal?: () => void;
  onOpenAccountsModal?: (initialType?: 'PAGAR' | 'RECEBER') => void;
  onOpenOrderSequenceModal?: () => void;
  onOpenEquipmentsModal?: () => void;
  onOpenBrandsModal?: () => void;
  onOpenModelsModal?: () => void;
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
  onOpenPrinterConfigModal?: () => void;
  onOpenEstimatesModal?: () => void;
  onOpenCreateEstimateModal?: () => void;
  onOpenUpdateSystemModal?: () => void;
  onOpenCashRegisterModal?: () => void;
  onOpenSalesModal?: () => void;
  onOpenSalesCommissionsModal?: () => void;
  onOpenSerialLicenseModal?: () => void;
  onOpenLocalNetworkModal?: () => void;
  onOpenFinancialDREModal?: () => void;
  onOpenLabelsGeneratorModal?: () => void;
  onOpenFiscalInvoiceModal?: () => void;
  onOpenPurchaseOrdersModal?: (initialTab?: 'auto_generator' | 'custom_order' | 'orders_list' | 'receiving') => void;
  onOpenQuickStockModal?: () => void;
  onOpenQuickPartSearchModal?: () => void;
  onOpenShortcutsModal?: () => void;
  currentUser?: any;
}

export const TopMenuBar: React.FC<TopMenuBarProps> = React.memo(({
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
  onOpenSuppliersModal,
  onOpenAccountsModal,
  onOpenOrderSequenceModal,
  onOpenEquipmentsModal,
  onOpenBrandsModal,
  onOpenModelsModal,
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
  onOpenSalesCommissionsModal,
  onOpenSerialLicenseModal,
  onOpenLocalNetworkModal,
  onOpenFinancialDREModal,
  onOpenLabelsGeneratorModal,
  onOpenFiscalInvoiceModal,
  onOpenPurchaseOrdersModal,
  onOpenQuickStockModal,
  onOpenQuickPartSearchModal,
  onOpenShortcutsModal,
}) => {
  const features = getCurrentFeatures();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<{
    isOpen: boolean;
    isRestoring: boolean;
    title: string;
    message: string;
    isSuccess: boolean;
    details?: string;
    progress?: number;
    currentTask?: string;
  }>({
    isOpen: false,
    isRestoring: false,
    title: '',
    message: '',
    isSuccess: false,
    progress: 0,
    currentTask: '',
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

  // Helper geral de permissão (Admin sempre tem acesso liberado, e papéis consultam matriz RBAC dinâmica)
  const hasPerm = (permName: string, defaultValue: boolean = false): boolean => {
    if (isAdmin) return true;
    if (currentUser?.permissions && currentUser.permissions[permName] !== undefined) {
      return Boolean(currentUser.permissions[permName]);
    }
    const role = currentUser?.role;
    if (role) {
      // Mapeamento semântico do nome da permissão para o módulo RBAC
      if (['manageClients'].includes(permName)) return hasPermission(role, 'clients', 'canView');
      if (['manageParts', 'manageQuickStock', 'managePurchaseOrders', 'manageSuppliers', 'manageEquipments', 'manageServices'].includes(permName)) return hasPermission(role, 'stock', 'canView');
      if (['manageSales', 'manageCashRegister', 'manageAccountsPayable', 'manageAccountsReceivable', 'manageFinancialDRE', 'manageFiscalInvoices'].includes(permName)) return hasPermission(role, 'financial', 'canView');
      if (['viewGeneralReports', 'viewTechnicianReports', 'manageLabelsGenerator'].includes(permName)) return hasPermission(role, 'reports', 'canView');
      if (['manageUsers', 'manageCompanyData', 'accessFactoryReset', 'manageMobileLink', 'manageLocalNetwork', 'manageSerialLicense', 'manageOSGeneralConfig', 'manageWarrantyTerms', 'manageOrderStatus', 'accessBackup'].includes(permName)) {
        return hasPermission(role, 'settings', 'canEdit');
      }
    }
    return defaultValue;
  };

  // Permissões específicas mapeadas
  const canManageUsers = hasPerm('manageUsers', false);
  const canAccessBackup = hasPerm('accessBackup', false);
  const canManagePrinterConfig = hasPerm('managePrinterConfig', true);
  const canManageClients = hasPerm('manageClients', true);
  const canManageParts = hasPerm('manageParts', true);
  const canManageQuickStock = hasPerm('manageQuickStock', true);
  const canManagePurchaseOrders = hasPerm('managePurchaseOrders', true);
  const canManageSuppliers = hasPerm('manageSuppliers', true);
  const canManageEquipments = hasPerm('manageEquipments', true);
  const canManageServices = hasPerm('manageServices', true);
  const canManageTechnicians = hasPerm('manageTechnicians', false);
  const canManageOrderStatus = hasPerm('manageOrderStatus', false);
  const canManageEstimates = hasPerm('manageEstimates', true);
  const canManageSales = hasPerm('manageSales', true);
  const canManageCashRegister = hasPerm('manageCashRegister', false);
  const canManageAccountsPayable = hasPerm('manageAccountsPayable', true);
  const canManageAccountsReceivable = hasPerm('manageAccountsReceivable', true);
  const canManageFinancialDRE = hasPerm('manageFinancialDRE', false);
  const canManageFiscalInvoices = hasPerm('manageFiscalInvoices', false);
  const canManageOSGeneralConfig = hasPerm('manageOSGeneralConfig', false);
  const canManageOrderSequence = hasPerm('manageOrderSequence', false);
  const canManageWarrantyTerms = hasPerm('manageWarrantyTerms', false);
  const canViewGeneralReports = hasPerm('viewGeneralReports', false);
  const canViewTechnicianReports = hasPerm('viewTechnicianReports', false);
  const canManageLabelsGenerator = hasPerm('manageLabelsGenerator', true);
  const canManageShortcuts = hasPerm('manageShortcuts', true);
  const canManageWallpaper = hasPerm('manageWallpaper', true);
  const canManageMobileLink = hasPerm('manageMobileLink', false);
  const canManageLocalNetwork = hasPerm('manageLocalNetwork', true);
  const canManageSerialLicense = hasPerm('manageSerialLicense', false);
  const canManageCompanyData = hasPerm('manageCompanyData', false);
  const canAccessFactoryReset = hasPerm('accessFactoryReset', false);

  const toggleMenu = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const handleAction = (action: () => void) => {
    action();
    setOpenMenu(null);
  };

  const dlg = useDialog();

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
      let data: any;
      try {
        data = JSON.parse(rawContent);
      } catch {
        throw new Error('O arquivo selecionado não contém um formato de dados JSON válido.');
      }

      setRestoreStatus({
        isOpen: true,
        isRestoring: true,
        title: 'Restaurando Banco de Dados',
        message: 'Iniciando processo de limpeza geral e restauração do backup...',
        progress: 5,
        currentTask: 'Validando integridade do arquivo de backup...',
        isSuccess: false,
      });

      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      await delay(250);

      // ─── ETAPA 1: PRESERVAÇÃO DE CHAVES CRÍTICAS DE LICENÇA E SESSÃO ─────────────
      const PRESERVED_KEYS = [
        'vollen_device_fingerprint',
        'device_fingerprint',
        'device_identifier',
        'device_uuid',
        'machine_id',
        'hw_uuid',
        'vollen_offline_license',
        'vollen_active_serial',
        'tenant_firebase_config',
        'vollen_cloud_mode',
        'vollen_network_config',
        'vollen_local_server_config',
        'vollen_active_mode',
        'vollen_current_user_token',
        'vollen_current_user',
      ];

      const preservedData: Record<string, string | null> = {};
      for (const k of PRESERVED_KEYS) {
        preservedData[k] = localStorage.getItem(k);
      }

      // ─── ETAPA 2: LIMPEZA COMPLETA DE TODOS OS DADOS ATUAIS DO SISTEMA ──────────
      setRestoreStatus((prev) => ({
        ...prev,
        progress: 20,
        currentTask: 'Apagando todos os dados atuais do sistema para evitar duplicidades...',
      }));
      await delay(200);

      // Limpa todo o LocalStorage (zerando clientes, OSs, produtos, caixa, etc.)
      localStorage.clear();

      // Restaura as chaves de licença e hardware preservadas
      for (const [k, val] of Object.entries(preservedData)) {
        if (val !== null && val !== undefined) {
          localStorage.setItem(k, val);
        }
      }

      // Limpeza profunda das coleções da nuvem (se Firestore estiver ativo)
      if (db) {
        try {
          const [oldOrdersSnap, oldClientsSnap, oldPartsSnap, oldServicesSnap, oldEqSnap, oldEstSnap, oldCashMovSnap, oldTechSnap] = await Promise.all([
            getDocs(collection(db, 'orders')).catch(() => null),
            getDocs(collection(db, 'clients')).catch(() => null),
            getDocs(collection(db, 'parts')).catch(() => null),
            getDocs(collection(db, 'services')).catch(() => null),
            getDocs(collection(db, 'equipments')).catch(() => null),
            getDocs(collection(db, 'estimates')).catch(() => null),
            getDocs(collection(db, 'cash_movements')).catch(() => null),
            getDocs(collection(db, 'technicians')).catch(() => null),
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
          if (oldTechSnap && !oldTechSnap.empty) {
            await Promise.all(oldTechSnap.docs.map((d) => deleteDoc(doc(db, 'technicians', d.id)).catch(() => {})));
          }
        } catch (e) {
          console.warn('Aviso durante limpeza de nuvem:', e);
        }
      }

      // ─── ETAPA 3: RESTAURAÇÃO DO STORAGE E TABELAS LOCAIS ────────────────────────
      setRestoreStatus((prev) => ({
        ...prev,
        progress: 45,
        currentTask: 'Restaurando snapshot e tabelas do banco de dados local...',
      }));
      await delay(250);

      // Função segura de gravação no localStorage
      const safeSetItem = (key: string, val: any) => {
        try {
          if (val === undefined || val === null) return;
          const str = typeof val === 'string' ? val : JSON.stringify(val);
          localStorage.setItem(key, str);
        } catch (storageErr) {
          console.warn(`[LocalStorage] Aviso ao salvar chave ${key}:`, storageErr);
        }
      };

      // Restaura chaves individuais estruturadas com códigos canônicos (mínimo 4 dígitos: 0001, 0501)
      if (data.clients) {
        const formattedClients = Array.isArray(data.clients) ? data.clients.map((c: any) => ({ ...c, code: formatCanonicalCode(c.code) })) : data.clients;
        safeSetItem('vollen_clients', formattedClients);
      }
      if (data.orders) {
        const formattedOrders = Array.isArray(data.orders) ? data.orders.map((o: any) => ({ ...o, code: formatCanonicalCode(o.code) })) : data.orders;
        safeSetItem('vollen_orders', formattedOrders);
        safeSetItem('local_orders', formattedOrders);
      }
      if (data.visits) safeSetItem('vollen_visits', data.visits);
      if (data.companyData) safeSetItem('vollen_company_data', data.companyData);
      if (data.estimates) safeSetItem('vollen_estimates', data.estimates);
      if (data.parts) {
        const formattedParts = Array.isArray(data.parts) ? data.parts.map((p: any) => ({ ...p, code: formatCanonicalCode(p.code) })) : data.parts;
        safeSetItem('vollen_parts', formattedParts);
        safeSetItem('vollen_parts_stock', formattedParts);
      }
      if (data.services) safeSetItem('vollen_services', data.services);
      if (data.customServices) safeSetItem('vollen_custom_services', data.customServices);
      if (data.equipments) {
        const formattedEq = Array.isArray(data.equipments) ? data.equipments.map((e: any) => ({ ...e, code: formatCanonicalCode(e.code) })) : data.equipments;
        safeSetItem('system_equipments', formattedEq);
        safeSetItem('vollen_equipments', formattedEq);
      }
      if (data.suppliers) safeSetItem('vollen_suppliers', data.suppliers);

      // Reconciliação automática: cria cadastro de Admin com senha padrão para todos os técnicos e atendentes das notas
      const rawUsers = data.users || (data.storage && data.storage.vollen_users) || [];
      const rawTechs = data.technicians || (data.storage && (data.storage.vollen_technicians || data.storage.technicians)) || [];
      const rawOrders = data.orders || (data.storage && (data.storage.vollen_orders || data.storage.local_orders)) || [];

      const { users: restoredUsers, technicians: restoredTechs } = reconcileUsersWithEmployees(
        rawUsers,
        rawTechs,
        rawOrders
      );

      safeSetItem('vollen_users', restoredUsers);
      safeSetItem('vollen_technicians', restoredTechs);

      // Consolidação completa de Status de OS do Backup + Ordens de Serviço
      const STATUS_UNIFICATION_MAP: Record<string, string> = {
        'EM ORÇAMENTO': 'ABERTA',
        'EM ORCAMENTO': 'ABERTA',
        'ORÇAMENTO CONCLUIDO': 'ORCAMENTO_CONCLUIDO',
        'ORCAMENTO CONCLUIDO': 'ORCAMENTO_CONCLUIDO',
        'AUTORIZADO': 'APROVADO',
        'AG. PEÇA': 'AGUARDANDO_PECA',
        'AG. PECA': 'AGUARDANDO_PECA',
        'CANCELADO': 'CANCELADA',
        'SERVIÇO EXECUTADO': 'FINALIZADA',
        'SERVICO EXECUTADO': 'FINALIZADA',
        'GARANTIA DO SERVIÇO': 'RETORNO_GARANTIA',
        'GARANTIA DO SERVICO': 'RETORNO_GARANTIA',
      };

      const STATUS_COLOR_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b', '#14b8a6', '#f97316', '#a855f7', '#6366f1'];
      let osStatusesList: any[] = data.osStatuses || (data.storage && (data.storage.custom_os_statuses_v3 || data.storage.system_os_statuses)) || [];
      if (!Array.isArray(osStatusesList)) osStatusesList = [];

      const statusMapByName = new Map<string, any>();
      osStatusesList.forEach((st: any) => {
        if (st && st.name) {
          statusMapByName.set(String(st.name).trim().toUpperCase(), st);
        }
      });

      const allOrdersList = data.orders || (data.storage && (data.storage.vollen_orders || data.storage.local_orders)) || [];
      let paletteIdx = 0;
      if (Array.isArray(allOrdersList)) {
        allOrdersList.forEach((o: any) => {
          let rawStatus = (o?.status || '').trim();
          if (STATUS_UNIFICATION_MAP[rawStatus.toUpperCase()]) {
            rawStatus = STATUS_UNIFICATION_MAP[rawStatus.toUpperCase()];
            o.status = rawStatus;
          }
          if (rawStatus && !statusMapByName.has(rawStatus.toUpperCase())) {
            const isFin = /liberad|conclui|finaliz|execut|entregue|sem condi/i.test(rawStatus);
            const isCanc = /cancel/i.test(rawStatus);
            const newSt = {
              id: `status_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              code: String(osStatusesList.length + 1).padStart(4, '0'),
              name: rawStatus,
              color: STATUS_COLOR_PALETTE[paletteIdx % STATUS_COLOR_PALETTE.length],
              description: `Status do backup (${rawStatus})`,
              isSystemDefault: false,
              deductStock: isFin,
              returnStock: isCanc,
              isFinished: isFin,
              isCanceled: isCanc,
            };
            paletteIdx++;
            osStatusesList.push(newSt);
            statusMapByName.set(rawStatus.toUpperCase(), newSt);
          }
        });
      }

      safeSetItem('custom_os_statuses_v3', osStatusesList);
      safeSetItem('system_os_statuses', osStatusesList);

      if (data.cashMovements) safeSetItem('vollen_cash_movements', data.cashMovements);
      if (data.accountBills) safeSetItem('vollen_accounts_bills', data.accountBills);
      if (data.currentCashSession) safeSetItem('vollen_current_cash_session', data.currentCashSession);
      if (data.cashRegistersHistory) safeSetItem('cash_registers_history', data.cashRegistersHistory);
      if (data.cashRegisterColumns) safeSetItem('vollen_cash_register_columns', data.cashRegisterColumns);
      if (data.salesHistory) safeSetItem('vollen_sales_history', data.salesHistory);
      if (data.savedCarts) safeSetItem('vollen_saved_carts', data.savedCarts);
      if (data.activeCart) safeSetItem('vollen_active_cart', data.activeCart);
      if (data.customWallpaper) safeSetItem('system_wallpaper_url', data.customWallpaper);
      if (data.wallpaperOpacity) safeSetItem('system_wallpaper_opacity', data.wallpaperOpacity);
      if (data.wallpaperPosX) safeSetItem('system_wallpaper_pos_x', data.wallpaperPosX);
      if (data.wallpaperPosY) safeSetItem('system_wallpaper_pos_y', data.wallpaperPosY);
      if (data.wallpaperScale) safeSetItem('system_wallpaper_scale', data.wallpaperScale);
      if (data.osPreferences) {
        safeSetItem('vollen_os_preferences', data.osPreferences);
        safeSetItem('vollen_os_general_config', data.osPreferences);
        safeSetItem('vollen_os_config', data.osPreferences);
      }
      if (data.osGeneralConfig) {
        safeSetItem('vollen_os_general_config', data.osGeneralConfig);
        safeSetItem('vollen_os_config', data.osGeneralConfig);
      }
      if (data.customNextOSNumber) safeSetItem('vollen_custom_next_os_number', data.customNextOSNumber);
      if (data.printerConfig) safeSetItem('vollen_printer_config', data.printerConfig);
      if (data.warrantyTerms) {
        safeSetItem('warranty_config', data.warrantyTerms);
        safeSetItem('vollen_warranty_terms', data.warrantyTerms);
      }
      if (data.auditLogs) safeSetItem('audit_logs', data.auditLogs);

      // Se houver chaves adicionais no storage que não foram cobertas acima
      if (data.storage && typeof data.storage === 'object') {
        const covered = new Set([
          'vollen_clients', 'vollen_orders', 'local_orders', 'vollen_visits', 'vollen_users',
          'vollen_company_data', 'vollen_estimates', 'vollen_parts', 'vollen_parts_stock',
          'vollen_services', 'vollen_custom_services', 'system_equipments', 'vollen_equipments',
          'vollen_brands', 'vollen_models',
          'vollen_suppliers', 'vollen_technicians', 'custom_os_statuses_v3', 'system_os_statuses',
          'vollen_cash_movements', 'cash_transactions', 'vollen_accounts_bills', 'account_bills',
          'vollen_current_cash_session', 'cash_registers_history', 'vollen_cash_register_columns',
          'vollen_sales_history', 'vollen_saved_carts', 'vollen_active_cart'
        ]);
        for (const [key, val] of Object.entries(data.storage)) {
          if (!covered.has(key) && val !== undefined) {
            safeSetItem(key, val);
          }
        }
      }

      // ─── ETAPA 4: SINCRONIZAÇÃO EM NUVEM E FINALIZAÇÃO ───────────────────────────
      setRestoreStatus((prev) => ({
        ...prev,
        progress: 75,
        currentTask: 'Sincronizando registros e aplicando índices de busca...',
      }));

      if (db) {
        try {
          const syncCloudPromise = async () => {
            const clientsList = data.clients || (data.storage && data.storage.vollen_clients) || [];
            if (Array.isArray(clientsList)) {
              for (const c of clientsList) {
                if (c && c.id) {
                  const formattedC = { ...c, code: formatCanonicalCode(c.code) };
                  await setDoc(doc(db, 'clients', String(c.id)), formattedC, { merge: true }).catch(() => {});
                }
              }
            }

            const ordersList = data.orders || (data.storage && data.storage.vollen_orders) || [];
            if (Array.isArray(ordersList)) {
              for (const o of ordersList) {
                if (o && o.id) {
                  const formattedO = { ...o, code: formatCanonicalCode(o.code) };
                  await setDoc(doc(db, 'orders', String(o.id)), formattedO, { merge: true }).catch(() => {});
                }
              }
            }

            const rawPartsList = data.parts || (data.storage && (data.storage.vollen_parts_stock || data.storage.vollen_parts)) || [];
            if (Array.isArray(rawPartsList)) {
              const partsList = rawPartsList.map((p: any) => ({
                ...p,
                code: formatCanonicalCode(p.code),
                stockQuantity: Number(p.stockQuantity !== undefined ? p.stockQuantity : 0),
                minStock: Number(p.minStock !== undefined ? p.minStock : 0),
              }));
              for (const p of partsList) {
                if (p && p.id) await setDoc(doc(db, 'parts', String(p.id)), p, { merge: true }).catch(() => {});
              }
            }

            const servicesList = data.services || (data.storage && data.storage.vollen_services) || [];
            if (Array.isArray(servicesList)) {
              for (const s of servicesList) {
                if (s && s.id) {
                  const formattedS = { ...s, code: formatCanonicalCode(s.code) };
                  await setDoc(doc(db, 'services', String(s.id)), formattedS, { merge: true }).catch(() => {});
                }
              }
            }

            const eqList = data.equipments || (data.storage && (data.storage.vollen_equipments || data.storage.system_equipments)) || [];
            if (Array.isArray(eqList)) {
              for (const e of eqList) {
                const formattedCode = formatCanonicalCode(e.code);
                const eqId = e.id || formattedCode || String(Date.now());
                if (eqId) await setDoc(doc(db, 'equipments', String(eqId)), { ...e, id: String(eqId), code: formattedCode }, { merge: true }).catch(() => {});
              }
            }

            const brandsList = data.brands || (data.storage && data.storage.vollen_brands) || [];
            if (Array.isArray(brandsList)) {
              for (const b of brandsList) {
                const formattedCode = formatCanonicalCode(b.code);
                const bId = b.id || formattedCode || String(Date.now());
                if (bId) await setDoc(doc(db, 'brands', String(bId)), { ...b, id: String(bId), code: formattedCode }, { merge: true }).catch(() => {});
              }
            }

            const modelsList = data.models || (data.storage && data.storage.vollen_models) || [];
            if (Array.isArray(modelsList)) {
              for (const m of modelsList) {
                const formattedCode = formatCanonicalCode(m.code);
                const mId = m.id || formattedCode || String(Date.now());
                if (mId) await setDoc(doc(db, 'models', String(mId)), { ...m, id: String(mId), code: formattedCode }, { merge: true }).catch(() => {});
              }
            }

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

            const osStatusesList = data.osStatuses || (data.storage && (data.storage.custom_os_statuses_v3 || data.storage.system_os_statuses)) || [];
            if (Array.isArray(osStatusesList) && osStatusesList.length > 0) {
              for (const st of osStatusesList) {
                const stId = st.id || String(Date.now());
                if (stId) await setDoc(doc(db, 'os_statuses', String(stId)), { ...st, id: String(stId) }, { merge: true }).catch(() => {});
              }
            }

            // Sincroniza usuários reconciliados na nuvem
            if (Array.isArray(restoredUsers) && restoredUsers.length > 0) {
              for (const u of restoredUsers) {
                const uId = u.id || String(Date.now());
                if (uId) {
                  await setDoc(
                    doc(db, 'users', String(uId)),
                    {
                      id: String(uId),
                      username: u.username,
                      name: u.name,
                      role: u.role,
                      isAdmin: u.role === 'Admin',
                      isTechnician: Boolean(u.isTechnician ?? (u.role === 'Técnico' || u.role === 'Admin')),
                      isAttendant: Boolean(u.isAttendant ?? (u.role === 'Atendimento' || u.role === 'Admin')),
                      permissions: u.permissions,
                      password: u.password || '123456',
                      updatedAt: new Date().toISOString(),
                    },
                    { merge: true }
                  ).catch(() => {});
                }
              }
            }

            // Sincroniza técnicos reconciliados na nuvem
            if (Array.isArray(restoredTechs) && restoredTechs.length > 0) {
              for (const tech of restoredTechs) {
                const techId = tech.id || String(Date.now());
                if (techId) {
                  await setDoc(
                    doc(db, 'technicians', String(techId)),
                    {
                      ...tech,
                      id: String(techId),
                      password: tech.password || '123456',
                      updatedAt: new Date().toISOString(),
                    },
                    { merge: true }
                  ).catch(() => {});
                }
              }
            }

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
          };

          await Promise.race([
            syncCloudPromise(),
            new Promise((resolve) => setTimeout(resolve, 2000)),
          ]);
        } catch (cloudErr) {
          console.warn('Aviso na sincronização de nuvem da restauração:', cloudErr);
        }
      }

      setRestoreStatus((prev) => ({
        ...prev,
        progress: 100,
        currentTask: 'Restauração concluída com sucesso!',
      }));
      await delay(300);

      sessionStorage.setItem('backup_restored_success_msg', 'true');
      setRestoreStatus({
        isOpen: true,
        isRestoring: false,
        title: 'Backup Restaurado com Sucesso!',
        message: 'O sistema foi completamente limpo e todos os registros do arquivo de backup foram restaurados com 100% de precisão.',
        details: 'Clique no botão abaixo para recarregar a interface e exibir todos os registros.',
        progress: 100,
        currentTask: 'Concluído com sucesso.',
        isSuccess: true,
      });
    } catch (err: any) {
      console.error('Erro ao restaurar arquivo de backup:', err);
      setRestoreStatus({
        isOpen: true,
        isRestoring: false,
        title: 'Erro ao Restaurar Backup',
        message: err?.message || 'Não foi possível restaurar o backup. Certifique-se de selecionar um arquivo (.json) válido.',
        progress: 0,
        currentTask: '',
        isSuccess: false,
      });
    }
  };

  const handlePrintSystem = () => {
    window.print();
  };

  return (
    <div
      className="w-full bg-slate-200 border-b border-slate-300 text-[11px] 2xl:text-xs font-bold text-slate-800 flex items-stretch select-none relative z-50 shadow-sm"
      onMouseLeave={() => setOpenMenu(null)}
    >
      {/* 1. Arquivos */}
      <div className="relative flex-1 min-w-0 flex items-stretch">
        <button
          onClick={() => toggleMenu('arquivos')}
          className={`w-full flex items-center justify-center gap-1 px-1 py-1.5 hover:bg-slate-300 hover:text-sky-700 transition-colors cursor-pointer text-center truncate ${
            openMenu === 'arquivos' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <Folder className="w-3.5 h-3.5 text-sky-700 shrink-0" />
          <span className="truncate">Arquivos</span>
          <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
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
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
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
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                canManagePrinterConfig ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Printer className={`w-3.5 h-3.5 ${canManagePrinterConfig ? 'text-sky-700' : 'text-slate-400'}`} />
              <span>Configurações de Impressora</span>
            </button>

            <div className="my-1 border-t border-slate-200" />

            <button
              onClick={() => handleAction(onLogout)}
              className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-700 flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair do Sistema
            </button>
          </div>
        )}
      </div>

      {/* 2. Cadastro */}
      <div className="relative flex-1 min-w-0 flex items-stretch">
        <button
          onClick={() => toggleMenu('cadastro')}
          className={`w-full flex items-center justify-center gap-1 px-1 py-1.5 hover:bg-slate-300 hover:text-sky-700 transition-colors cursor-pointer text-center truncate ${
            openMenu === 'cadastro' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <UserPlus className="w-3.5 h-3.5 text-sky-700 shrink-0" />
          <span className="truncate">Cadastro</span>
          <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
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
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
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
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                canManageParts ? 'hover:bg-slate-200 hover:text-amber-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Package className={`w-3.5 h-3.5 ${canManageParts ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Cadastrar Peças</span>
            </button>

            <button
              onClick={() => handleAction(() => {
                if (!canManageParts) {
                  alert('Acesso Negado: Seu usuário não possui permissão para consultar peças.');
                  return;
                }
                if (onOpenQuickPartSearchModal) onOpenQuickPartSearchModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                canManageParts ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Search className={`w-3.5 h-3.5 ${canManageParts ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>Busca Rápida de Peças (F10)</span>
            </button>

            <button
              onClick={() => handleAction(() => {
                if (!canManageQuickStock) {
                  alert('Acesso Negado: Seu usuário não possui permissão para Atualização Rápida de Estoque.');
                  return;
                }
                if (onOpenQuickStockModal) onOpenQuickStockModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                canManageQuickStock ? 'hover:bg-slate-200 hover:text-amber-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Tag className={`w-3.5 h-3.5 ${canManageQuickStock ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Atualização Rápida (Estoque & Preço)</span>
            </button>

            <button
              onClick={() => handleAction(() => {
                if (!canManageSuppliers) {
                  alert('Acesso Negado: Seu usuário não possui permissão para gerenciar fornecedores.');
                  return;
                }
                if (onOpenSuppliersModal) onOpenSuppliersModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                canManageSuppliers ? 'hover:bg-slate-200 hover:text-amber-800 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${canManageSuppliers ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Cadastrar Fornecedor</span>
            </button>

            {features.hasEquipmentsMenu && (
              <>
                <button
                  onClick={() => handleAction(() => {
                    if (!canManageEquipments) {
                      alert('Acesso Negado: Seu usuário não possui permissão para gerenciar equipamentos.');
                      return;
                    }
                    if (onOpenEquipmentsModal) onOpenEquipmentsModal();
                    else onOpenRegister('EQUIPMENT');
                  })}
                  className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                    canManageEquipments ? 'hover:bg-slate-200 hover:text-purple-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
                  }`}
                >
                  <Cpu className={`w-3.5 h-3.5 ${canManageEquipments ? 'text-purple-600' : 'text-slate-400'}`} />
                  <span>Cadastrar Equipamento</span>
                </button>

                <button
                  onClick={() => handleAction(() => {
                    if (!canManageEquipments) {
                      alert('Acesso Negado: Seu usuário não possui permissão para gerenciar equipamentos.');
                      return;
                    }
                    if (onOpenBrandsModal) onOpenBrandsModal();
                  })}
                  className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                    canManageEquipments ? 'hover:bg-slate-200 hover:text-purple-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
                  }`}
                >
                  <Tag className={`w-3.5 h-3.5 ${canManageEquipments ? 'text-purple-600' : 'text-slate-400'}`} />
                  <span>Cadastrar Marcas</span>
                </button>

                <button
                  onClick={() => handleAction(() => {
                    if (!canManageEquipments) {
                      alert('Acesso Negado: Seu usuário não possui permissão para gerenciar equipamentos.');
                      return;
                    }
                    if (onOpenModelsModal) onOpenModelsModal();
                  })}
                  className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                    canManageEquipments ? 'hover:bg-slate-200 hover:text-purple-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
                  }`}
                >
                  <Wrench className={`w-3.5 h-3.5 ${canManageEquipments ? 'text-purple-600' : 'text-slate-400'}`} />
                  <span>Cadastrar Modelos</span>
                </button>
              </>
            )}

            <button
              onClick={() => handleAction(() => {
                if (!canManageServices) {
                  alert('Acesso Negado: Seu usuário não possui permissão para gerenciar serviços.');
                  return;
                }
                if (onOpenServicesModal) onOpenServicesModal();
                else onOpenRegister('SERVICE');
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                canManageServices ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
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
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
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
      <div className="relative flex-1 min-w-0 flex items-stretch">
        <button
          onClick={() => toggleMenu('clientes')}
          className={`w-full flex items-center justify-center gap-1 px-1 py-1.5 hover:bg-slate-300 hover:text-sky-700 transition-colors cursor-pointer text-center truncate ${
            openMenu === 'clientes' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <Users className="w-3.5 h-3.5 text-sky-700 shrink-0" />
          <span className="truncate">Clientes</span>
          <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
        </button>

        {openMenu === 'clientes' && (
          <div className="absolute left-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-2 min-w-[280px] z-50 text-slate-800 text-xs animate-fadeIn">
            {/* 1. Acessar Clientes */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageClients) {
                  alert('Acesso Negado: Seu usuário não possui permissão para gerenciar clientes.');
                  return;
                }
                if (onOpenClientsModal) onOpenClientsModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
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
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                canManageClients ? 'hover:bg-slate-200 hover:text-emerald-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <UserPlus className={`w-4 h-4 shrink-0 ${canManageClients ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Cadastrar Novo Cliente</span>
            </button>

            <div className="border-t border-slate-200 my-1.5"></div>

            {/* 3. Campo de Busca com Enter */}
            <div className="px-3 py-1">
              <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
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

      {/* 4. Peças */}
      <div className="relative flex-1 min-w-0 flex items-stretch">
        <button
          onClick={() => {
            if (!canManageParts) {
              alert('Acesso Negado: Seu usuário não possui permissão para gerenciar peças.');
              return;
            }
            if (features.hasPurchaseOrders) {
              toggleMenu('pecas');
            } else {
              if (onOpenPartsModal) onOpenPartsModal();
            }
          }}
          className={`w-full flex items-center justify-center gap-1 px-1 py-1.5 transition-colors cursor-pointer text-center truncate ${
            openMenu === 'pecas' ? 'bg-slate-300 text-amber-700' : ''
          } ${
            canManageParts ? 'hover:bg-slate-300 hover:text-amber-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-300'
          }`}
          title={canManageParts ? 'Gestão de Peças e Reposição' : 'Acesso a Peças Bloqueado'}
        >
          <Package className={`w-3.5 h-3.5 shrink-0 ${canManageParts ? 'text-amber-600' : 'text-slate-400'}`} />
          <span className="truncate">Peças</span>
          {features.hasPurchaseOrders && <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />}
        </button>

        {openMenu === 'pecas' && features.hasPurchaseOrders && (
          <div className="absolute left-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-1.5 min-w-[260px] z-50 text-slate-800 text-xs animate-fadeIn">
            <button
              onClick={() => handleAction(() => {
                if (!canManageParts) {
                  alert('Acesso Negado: Seu usuário não possui permissão para gerenciar peças.');
                  return;
                }
                if (onOpenPartsModal) onOpenPartsModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                canManageParts ? 'hover:bg-slate-200 hover:text-amber-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Package className={`w-4 h-4 shrink-0 ${canManageParts ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Estoque de Peças</span>
            </button>

            <button
              onClick={() => handleAction(() => {
                if (!canManageParts) {
                  alert('Acesso Negado: Seu usuário não possui permissão para consultar peças.');
                  return;
                }
                if (onOpenQuickPartSearchModal) onOpenQuickPartSearchModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                canManageParts ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Search className={`w-4 h-4 shrink-0 ${canManageParts ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>Busca Rápida de Peças (F10)</span>
            </button>

            <button
              onClick={() => handleAction(() => {
                if (!canManageQuickStock) {
                  alert('Acesso Negado: Seu usuário não possui permissão para Atualização Rápida de Estoque.');
                  return;
                }
                if (onOpenQuickStockModal) onOpenQuickStockModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                canManageQuickStock ? 'hover:bg-slate-200 hover:text-amber-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Tag className={`w-4 h-4 shrink-0 ${canManageQuickStock ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Atualização Rápida (Estoque & Preço)</span>
            </button>

            <button
              onClick={() => handleAction(() => {
                if (!canManagePurchaseOrders) {
                  alert('Acesso Negado: Seu usuário não possui permissão para Ordens de Compra.');
                  return;
                }
                if (onOpenPurchaseOrdersModal) onOpenPurchaseOrdersModal('orders_list');
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                canManagePurchaseOrders ? 'hover:bg-slate-200 hover:text-amber-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Truck className={`w-4 h-4 shrink-0 ${canManagePurchaseOrders ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Ordens de Compra (Reposição)</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Compras */}
      <div className="relative flex-1 min-w-0 flex items-stretch">
        <button
          onClick={() => {
            if (!canManagePurchaseOrders && !canManageSuppliers) {
              alert('Acesso Negado: Seu usuário não possui permissão para o Módulo de Compras.');
              return;
            }
            toggleMenu('compras');
          }}
          className={`w-full flex items-center justify-center gap-1 px-1 py-1.5 transition-colors cursor-pointer text-center truncate ${
            openMenu === 'compras' ? 'bg-slate-300 text-sky-800' : ''
          } ${
            canManagePurchaseOrders || canManageSuppliers
              ? 'hover:bg-slate-300 hover:text-sky-800 text-slate-800'
              : 'text-slate-400 opacity-50 hover:bg-slate-300'
          }`}
          title="Gestão de Compras, Ordens de Reposição e Fornecedores"
        >
          <ShoppingBag className={`w-3.5 h-3.5 shrink-0 ${canManagePurchaseOrders ? 'text-sky-700' : 'text-slate-400'}`} />
          <span className="truncate">Compras</span>
          <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
        </button>

        {openMenu === 'compras' && (
          <div className="absolute left-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-1.5 min-w-[280px] z-50 text-slate-800 text-xs animate-fadeIn">
            {/* 1. Central de Ordens de Compra */}
            <button
              onClick={() => handleAction(() => {
                if (!canManagePurchaseOrders) {
                  alert('Acesso Negado: Seu usuário não possui permissão para Ordens de Compra.');
                  return;
                }
                if (onOpenPurchaseOrdersModal) onOpenPurchaseOrdersModal('orders_list');
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                canManagePurchaseOrders ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <FileText className={`w-4 h-4 shrink-0 ${canManagePurchaseOrders ? 'text-sky-600' : 'text-slate-400'}`} />
              <div>
                <span className="block">Central de Ordens de Compra</span>
                <span className="text-[10px] text-slate-500">Histórico, status, WhatsApp e PDF</span>
              </div>
            </button>

            {/* 2. Nova Ordem de Compra */}
            <button
              onClick={() => handleAction(() => {
                if (!canManagePurchaseOrders) {
                  alert('Acesso Negado: Seu usuário não possui permissão para Ordens de Compra.');
                  return;
                }
                if (onOpenPurchaseOrdersModal) onOpenPurchaseOrdersModal('custom_order');
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                canManagePurchaseOrders ? 'hover:bg-slate-200 hover:text-emerald-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <PlusCircle className={`w-4 h-4 shrink-0 ${canManagePurchaseOrders ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div>
                <span className="block">Nova Ordem Personalizada</span>
                <span className="text-[10px] text-slate-500">Adicione peças avulsas e do estoque</span>
              </div>
            </button>

            {/* 3. Sugestão Inteligente de Reposição */}
            <button
              onClick={() => handleAction(() => {
                if (!canManagePurchaseOrders) {
                  alert('Acesso Negado: Seu usuário não possui permissão para Ordens de Compra.');
                  return;
                }
                if (onOpenPurchaseOrdersModal) onOpenPurchaseOrdersModal('auto_generator');
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                canManagePurchaseOrders ? 'hover:bg-slate-200 hover:text-amber-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Sparkles className={`w-4 h-4 shrink-0 ${canManagePurchaseOrders ? 'text-amber-500' : 'text-slate-400'}`} />
              <div>
                <span className="block">Sugestão de Reposição (Estoque Baixo)</span>
                <span className="text-[10px] text-slate-500">Varredura automática das peças em falta</span>
              </div>
            </button>

            {/* 4. Recebimento de Mercadorias */}
            <button
              onClick={() => handleAction(() => {
                if (!canManagePurchaseOrders) {
                  alert('Acesso Negado: Seu usuário não possui permissão para Recebimento de Ordens.');
                  return;
                }
                if (onOpenPurchaseOrdersModal) onOpenPurchaseOrdersModal('receiving');
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                canManagePurchaseOrders ? 'hover:bg-slate-200 hover:text-indigo-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <PackageCheck className={`w-4 h-4 shrink-0 ${canManagePurchaseOrders ? 'text-indigo-600' : 'text-slate-400'}`} />
              <div>
                <span className="block">Recebimento & Entrada de Estoque</span>
                <span className="text-[10px] text-slate-500">Conferir itens e lançar estoque em 1 clique</span>
              </div>
            </button>

            <div className="border-t border-slate-200 my-1.5"></div>

            {/* 5. Fornecedores */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageSuppliers) {
                  alert('Acesso Negado: Seu usuário não possui permissão para Fornecedores.');
                  return;
                }
                if (onOpenSuppliersModal) onOpenSuppliersModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                canManageSuppliers ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Building2 className={`w-4 h-4 shrink-0 ${canManageSuppliers ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>Gerenciar Fornecedores</span>
            </button>

            {/* 6. Contas a Pagar (Integração) */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageAccountsPayable) {
                  alert('Acesso Negado: Seu usuário não possui permissão para Contas a Pagar.');
                  return;
                }
                if (onOpenAccountsModal) onOpenAccountsModal('PAGAR');
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                canManageAccountsPayable ? 'hover:bg-slate-200 hover:text-red-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <ArrowDownLeft className={`w-4 h-4 shrink-0 ${canManageAccountsPayable ? 'text-red-600' : 'text-slate-400'}`} />
              <span>Contas a Pagar (Fornecedores)</span>
            </button>
          </div>
        )}
      </div>

      {/* 6. Equipamentos (Dropdown: Equipamentos, Marcas, Modelos) */}
      {features.hasEquipmentsMenu && (
        <div className="relative flex-1 min-w-0 flex items-stretch">
          <button
            onClick={() => {
              if (!canManageEquipments) {
                alert('Acesso Negado: Seu usuário não possui permissão para gerenciar equipamentos.');
                return;
              }
              toggleMenu('equipamentos');
            }}
            className={`w-full flex items-center justify-center gap-1 px-1 py-1.5 transition-colors cursor-pointer text-center truncate ${
              openMenu === 'equipamentos' ? 'bg-slate-300 text-purple-700' : ''
            } ${
              canManageEquipments ? 'hover:bg-slate-300 hover:text-purple-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-300'
            }`}
            title={canManageEquipments ? 'Gestão de Equipamentos, Marcas e Modelos' : 'Acesso a Equipamentos Bloqueado'}
          >
            <Cpu className={`w-3.5 h-3.5 shrink-0 ${canManageEquipments ? 'text-purple-600' : 'text-slate-400'}`} />
            <span className="truncate">Equipamentos</span>
            <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
          </button>

          {openMenu === 'equipamentos' && (
            <div className="absolute left-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-1.5 min-w-[240px] z-50 text-slate-800 text-xs animate-fadeIn">
              <button
                onClick={() => handleAction(() => {
                  if (!canManageEquipments) {
                    alert('Acesso Negado: Seu usuário não possui permissão para gerenciar equipamentos.');
                    return;
                  }
                  if (onOpenEquipmentsModal) onOpenEquipmentsModal();
                })}
                className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                  canManageEquipments ? 'hover:bg-slate-200 hover:text-purple-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
                }`}
              >
                <Cpu className={`w-4 h-4 shrink-0 ${canManageEquipments ? 'text-purple-600' : 'text-slate-400'}`} />
                <span>Equipamentos / Aparelhos</span>
              </button>

              <button
                onClick={() => handleAction(() => {
                  if (!canManageEquipments) {
                    alert('Acesso Negado: Seu usuário não possui permissão para gerenciar marcas.');
                    return;
                  }
                  if (onOpenBrandsModal) onOpenBrandsModal();
                })}
                className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                  canManageEquipments ? 'hover:bg-slate-200 hover:text-purple-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
                }`}
              >
                <Tag className={`w-4 h-4 shrink-0 ${canManageEquipments ? 'text-purple-600' : 'text-slate-400'}`} />
                <span>Marcas</span>
              </button>

              <button
                onClick={() => handleAction(() => {
                  if (!canManageEquipments) {
                    alert('Acesso Negado: Seu usuário não possui permissão para gerenciar modelos.');
                    return;
                  }
                  if (onOpenModelsModal) onOpenModelsModal();
                })}
                className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                  canManageEquipments ? 'hover:bg-slate-200 hover:text-purple-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
                }`}
              >
                <Wrench className={`w-4 h-4 shrink-0 ${canManageEquipments ? 'text-purple-600' : 'text-slate-400'}`} />
                <span>Modelos</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Menu OS */}
      <div className="relative flex-1 min-w-0 flex items-stretch">
        <button
          onClick={() => handleAction(onOpenMenuOSModal)}
          className="w-full flex items-center justify-center gap-1 px-1 py-1.5 hover:bg-slate-300 hover:text-sky-700 transition-colors cursor-pointer text-center truncate"
        >
          <FileText className="w-3.5 h-3.5 text-sky-700 shrink-0" />
          <span className="truncate">Menu OS</span>
        </button>
      </div>

      {/* 9. Orçamentos */}
      <div className="relative flex-1 min-w-0 flex items-stretch">
        <button
          onClick={() => {
            if (!canManageEstimates) {
              alert('Acesso Negado: Seu usuário não possui permissão para acessar Orçamentos.');
              return;
            }
            if (onOpenEstimatesModal) onOpenEstimatesModal();
          }}
          className={`w-full flex items-center justify-center gap-1 px-1 py-1.5 transition-colors cursor-pointer text-center truncate ${
            canManageEstimates ? 'hover:bg-slate-300 hover:text-amber-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-300'
          }`}
          title={canManageEstimates ? 'Central de Orçamentos' : 'Acesso a Orçamentos Bloqueado'}
        >
          <Calculator className={`w-3.5 h-3.5 shrink-0 ${canManageEstimates ? 'text-amber-600' : 'text-slate-400'}`} />
          <span className="truncate">Orçamentos</span>
        </button>
      </div>

      {/* 10. Vendas */}
      <div className="relative flex-1 min-w-0 flex items-stretch">
        <button
          onClick={() => {
            if (!canManageSales) {
              alert('Acesso Negado: Seu usuário não possui permissão para acessar o Módulo de Vendas.');
              return;
            }
            if (onOpenSalesModal) onOpenSalesModal();
          }}
          className={`w-full flex items-center justify-center gap-1 px-1 py-1.5 transition-colors cursor-pointer text-center truncate ${
            canManageSales
              ? 'hover:bg-slate-300 hover:text-emerald-700 text-slate-800'
              : 'text-slate-400 opacity-50 hover:bg-slate-300'
          }`}
          title={canManageSales ? 'Módulo de Vendas Balcão e PDV de Peças (Atalho F9)' : 'Acesso a Vendas Bloqueado para seu usuário'}
        >
          <ShoppingCart className={`w-3.5 h-3.5 shrink-0 ${canManageSales ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className="truncate">Vendas</span>
        </button>
      </div>

      {/* 11. Caixa */}
      {features.hasCashRegister && (
        <div className="relative flex-1 min-w-0 flex items-stretch">
          <button
            onClick={() => {
              if (!canManageCashRegister) {
                alert('Acesso Negado: Seu usuário não possui permissão para acessar o Módulo de Caixa.');
                return;
              }
              if (onOpenCashRegisterModal) onOpenCashRegisterModal();
            }}
            className={`w-full flex items-center justify-center gap-1 px-1 py-1.5 transition-colors cursor-pointer text-center truncate ${
              canManageCashRegister
                ? 'hover:bg-slate-300 hover:text-emerald-700 text-slate-800'
                : 'text-slate-400 opacity-50 hover:bg-slate-300'
            }`}
            title={canManageCashRegister ? 'Acessar Controle de Caixa' : 'Acesso ao Caixa Bloqueado para seu usuário'}
          >
            <Wallet className={`w-3.5 h-3.5 shrink-0 ${canManageCashRegister ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="truncate">Caixa</span>
          </button>
        </div>
      )}

      {/* 12. Contas */}
      <div className="relative flex-1 min-w-0 flex items-stretch">
        <button
          onClick={() => toggleMenu('contas')}
          className={`w-full flex items-center justify-center gap-1 px-1 py-1.5 hover:bg-slate-300 hover:text-sky-700 transition-colors cursor-pointer text-center truncate ${
            openMenu === 'contas' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 text-sky-700 shrink-0" />
          <span className="truncate">Contas</span>
          <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
        </button>

        {openMenu === 'contas' && (
          <div className="absolute left-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-1.5 min-w-[240px] z-50 text-slate-800 text-xs animate-fadeIn">
            {/* Contas a Pagar */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageAccountsPayable) {
                  alert('Acesso Negado: Seu usuário não possui permissão para Contas a Pagar.');
                  return;
                }
                if (onOpenAccountsModal) onOpenAccountsModal('PAGAR');
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                canManageAccountsPayable ? 'hover:bg-slate-200 hover:text-red-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <ArrowDownLeft className={`w-4 h-4 shrink-0 ${canManageAccountsPayable ? 'text-red-600' : 'text-slate-400'}`} />
              <span>Contas a Pagar</span>
            </button>

            {/* Contas a Receber */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageAccountsReceivable) {
                  alert('Acesso Negado: Seu usuário não possui permissão para Contas a Receber.');
                  return;
                }
                if (onOpenAccountsModal) onOpenAccountsModal('RECEBER');
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                canManageAccountsReceivable ? 'hover:bg-slate-200 hover:text-emerald-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <ArrowUpRight className={`w-4 h-4 shrink-0 ${canManageAccountsReceivable ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Contas a Receber</span>
            </button>

            {/* v4.0.0: DRE & Lucro Real (Visão do Dono) */}
            {features.hasFinancialDRE && (
              <>
                <div className="border-t border-slate-200 my-1" />
                <button
                  onClick={() => handleAction(() => {
                    if (!canManageFinancialDRE) {
                      alert('Acesso Negado: Seu usuário não possui permissão para DRE & Lucro Real.');
                      return;
                    }
                    if (onOpenFinancialDREModal) onOpenFinancialDREModal();
                  })}
                  className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                    canManageFinancialDRE ? 'hover:bg-slate-200 hover:text-emerald-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
                  }`}
                >
                  <TrendingUp className={`w-4 h-4 shrink-0 ${canManageFinancialDRE ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>DRE & Lucro Real</span>
                </button>
              </>
            )}

            {/* v4.0.0: Emissão de Notas Fiscais (NF-e / NFS-e) */}
            {features.hasFiscalInvoices && (
              <button
                onClick={() => handleAction(() => {
                  if (!canManageFiscalInvoices) {
                    alert('Acesso Negado: Seu usuário não possui permissão para Emissão Fiscal.');
                    return;
                  }
                  if (onOpenFiscalInvoiceModal) onOpenFiscalInvoiceModal();
                })}
                className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                  canManageFiscalInvoices ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
                }`}
              >
                <Receipt className={`w-4 h-4 shrink-0 ${canManageFiscalInvoices ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>Emissão Fiscal (NF-e / NFS-e)</span>
              </button>
            )}

            {/* Comissões de Vendedores & Taxas de Maquininha (Acesso Restrito / Dono) */}
            <div className="border-t border-slate-200 my-1" />
            <button
              onClick={() => handleAction(() => {
                if (!canManageFinancialDRE && !canManageCashRegister && !isAdmin) {
                  alert('Acesso Negado: Apenas administradores e usuários autorizados podem acessar o Módulo de Comissões e Taxas.');
                  return;
                }
                if (onOpenSalesCommissionsModal) onOpenSalesCommissionsModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                (canManageFinancialDRE || canManageCashRegister || isAdmin)
                  ? 'hover:bg-slate-200 hover:text-emerald-700 text-slate-800'
                  : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Percent className={`w-4 h-4 shrink-0 ${(canManageFinancialDRE || canManageCashRegister || isAdmin) ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Comissões & Taxas de Vendas</span>
            </button>
          </div>
        )}
      </div>

      {/* 13. Impressão */}
      <div className="relative flex-1 min-w-0 flex items-stretch">
        <button
          onClick={() => toggleMenu('impressao')}
          className={`w-full flex items-center justify-center gap-1 px-1 py-1.5 hover:bg-slate-300 hover:text-sky-700 transition-colors cursor-pointer text-center truncate ${
            openMenu === 'impressao' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <Printer className="w-3.5 h-3.5 text-sky-700 shrink-0" />
          <span className="truncate">Impressão</span>
          <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
        </button>

        {openMenu === 'impressao' && (
          <div className="absolute right-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-1.5 min-w-[260px] z-50 text-slate-800 text-xs animate-fadeIn">
            <button
              onClick={() => handleAction(() => {
                if (!canViewGeneralReports) {
                  alert('Acesso Negado: Seu usuário não tem permissão para visualizar ou imprimir o Relatório Geral.');
                  return;
                }
                if (onOpenPeriodReportModal) onOpenPeriodReportModal();
                else handlePrintSystem();
              })}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2 cursor-pointer transition-colors ${
                canViewGeneralReports ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <FileText className={`w-4 h-4 ${canViewGeneralReports ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>Relatório Geral Consolidado</span>
            </button>

            {/* v4.0.0: Central de Etiquetas */}
            {features.hasLabelPrinting && (
              <>
                <div className="border-t border-slate-200 my-1" />
                <button
                  onClick={() => handleAction(() => {
                    if (!canManageLabelsGenerator) {
                      alert('Acesso Negado: Seu usuário não tem permissão para Central de Etiquetas.');
                      return;
                    }
                    if (onOpenLabelsGeneratorModal) onOpenLabelsGeneratorModal();
                  })}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-2 cursor-pointer transition-colors ${
                    canManageLabelsGenerator ? 'hover:bg-slate-200 hover:text-amber-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
                  }`}
                >
                  <Tag className={`w-4 h-4 ${canManageLabelsGenerator ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>Central de Etiquetas (OS / Peças)</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 14. Opções (incluindo Configurações de OS) */}
      <div className="relative flex-1 min-w-0 flex items-stretch">
        <button
          onClick={() => toggleMenu('opcoes')}
          className={`w-full flex items-center justify-center gap-1 px-1 py-1.5 hover:bg-slate-300 hover:text-sky-700 transition-colors cursor-pointer text-center truncate ${
            openMenu === 'opcoes' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-sky-700 shrink-0" />
          <span className="truncate">Opções</span>
          <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
        </button>

        {openMenu === 'opcoes' && (
          <div className="absolute right-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-1.5 min-w-[280px] z-50 text-slate-800 text-xs">
            {/* 1. Submenu lateral: Configurações de OS (Abre ao parar o mouse em cima) */}
            <div className="relative group">
              <div className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-200 hover:text-sky-700 text-slate-800 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Configurações de OS</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-700 transition-transform group-hover:translate-x-0.5" />
              </div>

              {/* Submenu cascata que abre para o lado (lado esquerdo para não vazar a borda direita da tela) */}
              <div className="hidden group-hover:block absolute right-full top-0 mr-1 bg-slate-100 border border-slate-300 rounded-xl shadow-2xl py-1.5 min-w-[270px] z-50 text-slate-800 text-xs animate-fadeIn">
                <div className="px-3 py-1 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-200 mb-1">
                  Parâmetros e Status da OS
                </div>

                <button
                  onClick={() => handleAction(() => {
                    if (!canManageOSGeneralConfig) {
                      alert('Acesso Negado: Seu usuário não possui permissão para configurar os Parâmetros da OS.');
                      return;
                    }
                    if (onOpenOSGeneralConfigModal) onOpenOSGeneralConfigModal();
                  })}
                  className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                    canManageOSGeneralConfig ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
                  }`}
                >
                  <Settings className={`w-3.5 h-3.5 ${canManageOSGeneralConfig ? 'text-sky-600' : 'text-slate-400'} shrink-0`} />
                  <span>Parâmetros e Regras da OS</span>
                </button>

                <button
                  onClick={() => handleAction(() => {
                    if (!canManageOrderSequence) {
                      alert('Acesso Negado: Seu usuário não possui permissão para definir a Numeração Inicial da OS.');
                      return;
                    }
                    if (onOpenOrderSequenceModal) onOpenOrderSequenceModal();
                  })}
                  className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                    canManageOrderSequence ? 'hover:bg-slate-200 hover:text-indigo-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
                  }`}
                >
                  <Hash className={`w-3.5 h-3.5 ${canManageOrderSequence ? 'text-indigo-600' : 'text-slate-400'} shrink-0`} />
                  <span>Definir Numeração Inicial da OS</span>
                </button>

                <button
                  onClick={() => handleAction(() => {
                    if (!canManageOrderStatus) {
                      alert('Acesso Negado: Seu usuário não possui permissão para gerenciar Status de Atendimento.');
                      return;
                    }
                    if (onOpenOrderStatusModal) onOpenOrderStatusModal();
                  })}
                  className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                    canManageOrderStatus ? 'hover:bg-slate-200 hover:text-amber-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
                  }`}
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${canManageOrderStatus ? 'text-amber-600' : 'text-slate-400'} shrink-0`} />
                  <span>Status de Atendimento</span>
                </button>

                <button
                  onClick={() => handleAction(() => {
                    if (!canManageWarrantyTerms) {
                      alert('Acesso Negado: Seu usuário não possui permissão para editar os Termos dos Comprovantes.');
                      return;
                    }
                    if (onOpenRegister) onOpenRegister('WARRANTY_TERMS' as any);
                  })}
                  className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                    canManageWarrantyTerms ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 ${canManageWarrantyTerms ? 'text-sky-600' : 'text-slate-400'} shrink-0`} />
                  <span>Termos dos Comprovantes (Entrada / Saída)</span>
                </button>

                {features.hasWhatsApp && (
                  <button
                    onClick={() => handleAction(() => {
                      if (!canManageOSGeneralConfig) {
                        alert('Acesso Negado: Seu usuário não possui permissão para configurar mensagens de WhatsApp.');
                        return;
                      }
                      if (onOpenOSGeneralConfigModal) onOpenOSGeneralConfigModal();
                    })}
                    className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${
                      canManageOSGeneralConfig ? 'hover:bg-slate-200 hover:text-emerald-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
                    }`}
                  >
                    <MessageSquare className={`w-3.5 h-3.5 ${canManageOSGeneralConfig ? 'text-emerald-600' : 'text-slate-400'} shrink-0`} />
                    <span>Mensagens Prontas do WhatsApp</span>
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 my-1"></div>

            {/* 1. Alterar Plano de Fundo */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageWallpaper) {
                  alert('Acesso Negado: Seu usuário não tem permissão para alterar o Plano de Fundo.');
                  return;
                }
                if (onOpenWallpaperModal) onOpenWallpaperModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2.5 cursor-pointer ${
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
              className={`w-full text-left px-4 py-2 flex items-center gap-2.5 cursor-pointer transition-colors ${
                canViewGeneralReports ? 'hover:bg-slate-200 hover:text-indigo-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Calendar className={`w-4 h-4 shrink-0 ${canViewGeneralReports ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>Lista de OS por Períodos (Relatório)</span>
            </button>

            {/* 3. Relatório de OS e Vendas por Funcionário */}
            <button
              onClick={() => handleAction(() => {
                if (!canViewTechnicianReports) {
                  alert('Acesso Negado: Seu usuário não tem permissão para visualizar o Relatório por Funcionário.');
                  return;
                }
                if (onOpenTechnicianOrdersReportModal) onOpenTechnicianOrdersReportModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2.5 cursor-pointer transition-colors ${
                canViewTechnicianReports ? 'hover:bg-slate-200 hover:text-teal-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <UserCheck className={`w-4 h-4 shrink-0 ${canViewTechnicianReports ? 'text-teal-600' : 'text-slate-400'}`} />
              <span>Relatório por Funcionário</span>
            </button>

            {/* 4. Vincular Celular (ApiKey) - Oculto se a versão não tiver APK */}
            {features.hasApk && (
              <button
                onClick={() => handleAction(() => {
                  if (!canManageMobileLink) {
                    alert('Acesso Negado: Seu usuário não tem permissão para gerenciar a vinculação de celular (ApiKey).');
                    return;
                  }
                  if (onOpenLinkMobileModal) onOpenLinkMobileModal();
                })}
                className={`w-full text-left px-4 py-2 flex items-center gap-2.5 cursor-pointer ${
                  canManageMobileLink ? 'hover:bg-sky-100 hover:text-sky-800 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
                }`}
              >
                <Smartphone className={`w-4 h-4 shrink-0 ${canManageMobileLink ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>Vincular Celular (ApiKey)</span>
              </button>
            )}

            {/* Configuração de Rede Local Offline (v2) */}
            {features.isLocalServer && (
              <button
                onClick={() => handleAction(() => {
                  if (!canManageLocalNetwork) {
                    alert('Acesso Negado: Seu usuário não tem permissão para Rede Local Offline.');
                    return;
                  }
                  if (onOpenLocalNetworkModal) onOpenLocalNetworkModal();
                })}
                className={`w-full text-left px-4 py-2 flex items-center gap-2.5 cursor-pointer transition-colors ${
                  canManageLocalNetwork ? 'hover:bg-slate-200 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
                }`}
              >
                <Network className={`w-4 h-4 shrink-0 ${canManageLocalNetwork ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>Rede Local Offline (IP Fixo)</span>
              </button>
            )}

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
              className={`w-full text-left px-4 py-2 flex items-center gap-2.5 cursor-pointer transition-colors ${
                canManageCompanyData ? 'hover:bg-slate-200 hover:text-sky-700 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <SlidersHorizontal className={`w-4 h-4 shrink-0 ${canManageCompanyData ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>Dados da Empresa</span>
            </button>

            {/* 6. Chave Serial & Licença do Sistema */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageSerialLicense) {
                  alert('Acesso Negado: Seu usuário não tem permissão para Chave Serial / Licença.');
                  return;
                }
                if (onOpenSerialLicenseModal) onOpenSerialLicenseModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2.5 cursor-pointer transition-colors ${
                canManageSerialLicense ? 'hover:bg-slate-200 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
              title={features.hasCloud ? 'Chave Serial & Conexão em Nuvem' : 'Chave Serial / Licença do Sistema'}
            >
              <KeyRound className={`w-4 h-4 shrink-0 ${canManageSerialLicense ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{features.hasCloud ? 'Chave Serial & Conexão em Nuvem' : 'Chave Serial / Licença'}</span>
            </button>

            {/* 7. Atalhos de Teclado */}
            <button
              onClick={() => handleAction(() => {
                if (!canManageShortcuts) {
                  alert('Acesso Negado: Seu usuário não possui permissão para configurar Teclas de Atalho.');
                  return;
                }
                if (onOpenShortcutsModal) onOpenShortcutsModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2.5 cursor-pointer transition-colors ${
                canManageShortcuts ? 'hover:bg-slate-200 text-slate-800' : 'text-slate-400 opacity-50 hover:bg-slate-200'
              }`}
            >
              <Keyboard className={`w-4 h-4 shrink-0 ${canManageShortcuts ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>Teclas de Atalho</span>
            </button>

            {/* 8. Verificar Atualizações do Sistema */}
            <button
              onClick={() => handleAction(() => {
                if (onOpenUpdateSystemModal) onOpenUpdateSystemModal();
              })}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 text-slate-800 flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <ArrowUpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Verificar Atualizações do Sistema</span>
            </button>

            <div className="border-t border-red-200 my-1"></div>

            {/* 8. Restaurar Padrão de Fábrica */}
            <button
              onClick={() => handleAction(() => {
                if (!canAccessFactoryReset) {
                  alert('Acesso Negado: Seu usuário não possui autorização para Restaurar Padrão de Fábrica.');
                  return;
                }
                if (onOpenFactoryResetModal) onOpenFactoryResetModal();
              })}
              className={`w-full text-left px-4 py-2 flex items-center gap-2.5 cursor-pointer transition-colors ${
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
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans whitespace-normal animate-fadeIn">
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
              <h3 className="font-bold text-sm leading-snug break-words">{restoreStatus.title}</h3>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6 space-y-4 text-slate-700 text-xs whitespace-normal break-words">
              <p className="leading-relaxed font-medium text-slate-800">{restoreStatus.message}</p>

              {/* BARRA DE PROGRESSO DINÂMICA */}
              {restoreStatus.isRestoring && (
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span className="truncate max-w-[280px]">{restoreStatus.currentTask || 'Processando...'}</span>
                    <span className="text-sky-700 font-mono font-extrabold">{restoreStatus.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5 border border-slate-300">
                    <div
                      className="bg-gradient-to-r from-sky-500 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out shadow-sm"
                      style={{ width: `${restoreStatus.progress || 0}%` }}
                    />
                  </div>
                </div>
              )}

              {restoreStatus.details && (
                <p className="text-slate-600 bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium leading-relaxed">
                  {restoreStatus.details}
                </p>
              )}
            </div>

            {/* Rodapé com Ação Clara */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              {restoreStatus.isRestoring ? (
                <span className="text-xs font-bold text-sky-700 flex items-center gap-1.5 py-1">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  {restoreStatus.currentTask || 'Restaurando...'}
                </span>
              ) : restoreStatus.isSuccess ? (
                <button
                  onClick={() => {
                    setRestoreStatus((prev) => ({ ...prev, isOpen: false }));
                    window.location.reload();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all text-xs"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
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
});
