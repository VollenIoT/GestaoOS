import { create } from 'zustand';
import { AccountType } from '../components/AccountsModal';
import { Estimate } from '../components/CreateEstimateModal';

interface ModalState {
  // ── Modais de OS ──────────────────────────────────────────────
  isModalOpen: boolean;
  isMenuOSOpen: boolean;
  isOpenOrdersModalOpen: boolean;
  isFinishedOrdersModalOpen: boolean;

  // ── Modais de Cadastro ────────────────────────────────────────
  isClientsModalOpen: boolean;
  isPartsModalOpen: boolean;
  isServicesModalOpen: boolean;
  isEquipmentsModalOpen: boolean;
  isBrandsModalOpen: boolean;
  isModelsModalOpen: boolean;
  isTechniciansModalOpen: boolean;
  isSuppliersModalOpen: boolean;
  isUsersModalOpen: boolean;
  registerModalType: 'CLIENT' | 'PART' | 'TECHNICIAN' | 'EQUIPMENT' | 'SERVICE' | null;

  // ── Modais de OS secundários ──────────────────────────────────
  isOrderStatusModalOpen: boolean;
  isWarrantyConfigOpen: boolean;
  isOrderSequenceModalOpen: boolean;
  isOSGeneralConfigModalOpen: boolean;
  isSearchOSModalOpen: boolean;
  isClientOrdersHistoryOpen: boolean;

  // ── Modais de Relatórios ──────────────────────────────────────
  isPeriodReportModalOpen: boolean;
  isTechnicianReportModalOpen: boolean;

  // ── Modais de Sistema ─────────────────────────────────────────
  isBackupModalOpen: boolean;
  isFactoryResetModalOpen: boolean;
  isPrinterConfigModalOpen: boolean;
  isUpdateSystemModalOpen: boolean;
  isCompanyModalOpen: boolean;
  isLinkMobileModalOpen: boolean;
  isSerialLicenseModalOpen: boolean;
  isLocalNetworkModalOpen: boolean;
  isScheduleModalOpen: boolean;
  isWallpaperModalOpen: boolean;

  // ── Modais de Financeiro ──────────────────────────────────────
  isCashRegisterModalOpen: boolean;
  isSalesModalOpen: boolean;
  isSalesCommissionsModalOpen: boolean;
  isAccountsModalOpen: boolean;
  accountsModalType: AccountType;

  // ── Modais de Orçamentos ──────────────────────────────────────
  isEstimatesModalOpen: boolean;
  isCreateEstimateModalOpen: boolean;

  // ── Modais Exclusivos v4.0.0 (Enterprise) ─────────────────────
  isNfeImportModalOpen: boolean;
  isFinancialDREModalOpen: boolean;
  isLabelsGeneratorModalOpen: boolean;
  isFiscalInvoiceModalOpen: boolean;
  isPurchaseOrdersModalOpen: boolean;
  purchaseOrdersInitialTab: 'auto_generator' | 'custom_order' | 'orders_list' | 'receiving';
  isQuickStockModalOpen: boolean;
  isQuickPartSearchModalOpen: boolean;
  isShortcutsModalOpen: boolean;
  labelTargetItem: any | null;
  fiscalTargetOrder: any | null;

  // ── Objetos ativos (itens sendo visualizados/editados) ────────
  orderToEdit: any | null;
  editingOrder: any | null;
  viewingClient: any | null;
  viewingPart: any | null;
  partTechnicalSheet: any | null;
  viewingEquipment: any | null;
  viewingService: any | null;
  selectedClientForNewOS: any | null;
  selectedPartForOS: any | null;
  selectedServiceForOS: any | null;
  selectedPartForSales: any | null;
  estimateToEdit: Estimate | null;
  estimateToConvertToOS: string | null;
  pendingEstimateForReturn: Estimate | null;

  // ── Controle de navegação (de onde viemos) ────────────────────
  cameFromOpenOrders: boolean;
  cameFromFinishedOrders: boolean;
  cameFromOSForClientEdit: boolean;
  createOSOpenedFromMenuOS: boolean;
  openOrdersOpenedFromMenuOS: boolean;
  finishedOrdersOpenedFromMenuOS: boolean;
  viewingClientEditMode: boolean;

  // ── Busca e callbacks ─────────────────────────────────────────
  clientSearchTerm: string;
  clientSelectCallback: ((client: any) => void) | null;
  partSelectCallback: ((part: any) => void) | null;
  serviceSelectCallback: ((service: any) => void) | null;

  // ── Setters simples ───────────────────────────────────────────
  setIsModalOpen: (v: boolean) => void;
  setIsMenuOSOpen: (v: boolean) => void;
  setIsOpenOrdersModalOpen: (v: boolean) => void;
  setIsFinishedOrdersModalOpen: (v: boolean) => void;
  setIsClientsModalOpen: (v: boolean) => void;
  setIsPartsModalOpen: (v: boolean) => void;
  setIsServicesModalOpen: (v: boolean) => void;
  setIsEquipmentsModalOpen: (v: boolean) => void;
  setIsBrandsModalOpen: (v: boolean) => void;
  setIsModelsModalOpen: (v: boolean) => void;
  setIsTechniciansModalOpen: (v: boolean) => void;
  setIsSuppliersModalOpen: (v: boolean) => void;
  setIsUsersModalOpen: (v: boolean) => void;
  setRegisterModalType: (v: 'CLIENT' | 'PART' | 'TECHNICIAN' | 'EQUIPMENT' | 'SERVICE' | null) => void;
  setIsOrderStatusModalOpen: (v: boolean) => void;
  setIsWarrantyConfigOpen: (v: boolean) => void;
  setIsOrderSequenceModalOpen: (v: boolean) => void;
  setIsOSGeneralConfigModalOpen: (v: boolean) => void;
  setIsSearchOSModalOpen: (v: boolean) => void;
  setIsClientOrdersHistoryOpen: (v: boolean) => void;
  setIsPeriodReportModalOpen: (v: boolean) => void;
  setIsTechnicianReportModalOpen: (v: boolean) => void;
  setIsBackupModalOpen: (v: boolean) => void;
  setIsFactoryResetModalOpen: (v: boolean) => void;
  setIsPrinterConfigModalOpen: (v: boolean) => void;
  setIsUpdateSystemModalOpen: (v: boolean) => void;
  setIsCompanyModalOpen: (v: boolean) => void;
  setIsLinkMobileModalOpen: (v: boolean) => void;
  setIsSerialLicenseModalOpen: (v: boolean) => void;
  setIsLocalNetworkModalOpen: (v: boolean) => void;
  setIsScheduleModalOpen: (v: boolean) => void;
  setIsWallpaperModalOpen: (v: boolean) => void;
  setIsCashRegisterModalOpen: (v: boolean) => void;
  setIsSalesModalOpen: (v: boolean) => void;
  setIsSalesCommissionsModalOpen: (v: boolean) => void;
  setIsAccountsModalOpen: (v: boolean) => void;
  setAccountsModalType: (v: AccountType) => void;
  setIsEstimatesModalOpen: (v: boolean) => void;
  setIsCreateEstimateModalOpen: (v: boolean) => void;
  setIsNfeImportModalOpen: (v: boolean) => void;
  setIsFinancialDREModalOpen: (v: boolean) => void;
  setIsLabelsGeneratorModalOpen: (v: boolean) => void;
  setIsFiscalInvoiceModalOpen: (v: boolean) => void;
  setIsPurchaseOrdersModalOpen: (v: boolean) => void;
  setPurchaseOrdersInitialTab: (tab: 'auto_generator' | 'custom_order' | 'orders_list' | 'receiving') => void;
  setIsQuickStockModalOpen: (v: boolean) => void;
  setIsQuickPartSearchModalOpen: (v: boolean) => void;
  setIsShortcutsModalOpen: (v: boolean) => void;
  setLabelTargetItem: (v: any | null) => void;
  setFiscalTargetOrder: (v: any | null) => void;
  setOrderToEdit: (v: any | null | ((prev: any) => any)) => void;
  setEditingOrder: (v: any | null | ((prev: any) => any)) => void;
  setViewingClient: (v: any | null) => void;
  setViewingPart: (v: any | null) => void;
  setPartTechnicalSheet: (v: any | null) => void;
  setViewingEquipment: (v: any | null) => void;
  setViewingService: (v: any | null) => void;
  setSelectedClientForNewOS: (v: any | null) => void;
  setSelectedPartForOS: (v: any | null) => void;
  setSelectedServiceForOS: (v: any | null) => void;
  setSelectedPartForSales: (v: any | null) => void;
  setEstimateToEdit: (v: Estimate | null) => void;
  setEstimateToConvertToOS: (v: string | null) => void;
  setPendingEstimateForReturn: (v: Estimate | null) => void;
  setCameFromOpenOrders: (v: boolean) => void;
  setCameFromFinishedOrders: (v: boolean) => void;
  setCameFromOSForClientEdit: (v: boolean) => void;
  setCreateOSOpenedFromMenuOS: (v: boolean) => void;
  setOpenOrdersOpenedFromMenuOS: (v: boolean) => void;
  setFinishedOrdersOpenedFromMenuOS: (v: boolean) => void;
  setViewingClientEditMode: (v: boolean) => void;
  setClientSearchTerm: (v: string) => void;
  setClientSelectCallback: (v: ((client: any) => void) | null) => void;
  setPartSelectCallback: (v: ((part: any) => void) | null) => void;
  setServiceSelectCallback: (v: ((service: any) => void) | null) => void;
}

export const useModalStore = create<ModalState>((set) => ({
  // ── Modais de OS ──────────────────────────────────────────────
  isModalOpen: false,
  isMenuOSOpen: false,
  isOpenOrdersModalOpen: false,
  isFinishedOrdersModalOpen: false,

  // ── Modais de Cadastro ────────────────────────────────────────
  isClientsModalOpen: false,
  isPartsModalOpen: false,
  isServicesModalOpen: false,
  isEquipmentsModalOpen: false,
  isBrandsModalOpen: false,
  isModelsModalOpen: false,
  isTechniciansModalOpen: false,
  isSuppliersModalOpen: false,
  isUsersModalOpen: false,
  registerModalType: null,

  // ── Modais de OS secundários ──────────────────────────────────
  isOrderStatusModalOpen: false,
  isWarrantyConfigOpen: false,
  isOrderSequenceModalOpen: false,
  isOSGeneralConfigModalOpen: false,
  isSearchOSModalOpen: false,
  isClientOrdersHistoryOpen: false,

  // ── Modais de Relatórios ──────────────────────────────────────
  isPeriodReportModalOpen: false,
  isTechnicianReportModalOpen: false,

  // ── Modais de Sistema ─────────────────────────────────────────
  isBackupModalOpen: false,
  isFactoryResetModalOpen: false,
  isPrinterConfigModalOpen: false,
  isUpdateSystemModalOpen: false,
  isCompanyModalOpen: false,
  isLinkMobileModalOpen: false,
  isSerialLicenseModalOpen: false,
  isLocalNetworkModalOpen: false,
  isScheduleModalOpen: false,
  isWallpaperModalOpen: false,

  // ── Modais de Financeiro ──────────────────────────────────────
  isCashRegisterModalOpen: false,
  isSalesModalOpen: false,
  isSalesCommissionsModalOpen: false,
  isAccountsModalOpen: false,
  accountsModalType: 'PAGAR',

  // ── Modais de Orçamentos ──────────────────────────────────────
  isEstimatesModalOpen: false,
  isCreateEstimateModalOpen: false,

  // ── Modais Exclusivos v4.0.0 (Enterprise) ─────────────────────
  isNfeImportModalOpen: false,
  isFinancialDREModalOpen: false,
  isLabelsGeneratorModalOpen: false,
  isFiscalInvoiceModalOpen: false,
  isPurchaseOrdersModalOpen: false,
  purchaseOrdersInitialTab: 'orders_list',
  isQuickStockModalOpen: false,
  isQuickPartSearchModalOpen: false,
  isShortcutsModalOpen: false,
  labelTargetItem: null,
  fiscalTargetOrder: null,

  // ── Objetos ativos ────────────────────────────────────────────
  orderToEdit: null,
  editingOrder: null,
  viewingClient: null,
  viewingPart: null,
  partTechnicalSheet: null,
  viewingEquipment: null,
  viewingService: null,
  selectedClientForNewOS: null,
  selectedPartForOS: null,
  selectedServiceForOS: null,
  selectedPartForSales: null,
  estimateToEdit: null,
  estimateToConvertToOS: null,
  pendingEstimateForReturn: null,

  // ── Controle de navegação ─────────────────────────────────────
  cameFromOpenOrders: false,
  cameFromFinishedOrders: false,
  cameFromOSForClientEdit: false,
  createOSOpenedFromMenuOS: false,
  openOrdersOpenedFromMenuOS: false,
  finishedOrdersOpenedFromMenuOS: false,
  viewingClientEditMode: false,

  // ── Busca e callbacks ─────────────────────────────────────────
  clientSearchTerm: '',
  clientSelectCallback: null,
  partSelectCallback: null,
  serviceSelectCallback: null,

  // ── Setters ───────────────────────────────────────────────────
  setIsModalOpen: (v) => set({ isModalOpen: v }),
  setIsMenuOSOpen: (v) => set({ isMenuOSOpen: v }),
  setIsOpenOrdersModalOpen: (v) => set({ isOpenOrdersModalOpen: v }),
  setIsFinishedOrdersModalOpen: (v) => set({ isFinishedOrdersModalOpen: v }),
  setIsClientsModalOpen: (v) => set({ isClientsModalOpen: v }),
  setIsPartsModalOpen: (v) => set({ isPartsModalOpen: v }),
  setIsServicesModalOpen: (v) => set({ isServicesModalOpen: v }),
  setIsEquipmentsModalOpen: (v) => set({ isEquipmentsModalOpen: v }),
  setIsBrandsModalOpen: (v) => set({ isBrandsModalOpen: v }),
  setIsModelsModalOpen: (v) => set({ isModelsModalOpen: v }),
  setIsTechniciansModalOpen: (v) => set({ isTechniciansModalOpen: v }),
  setIsSuppliersModalOpen: (v) => set({ isSuppliersModalOpen: v }),
  setIsUsersModalOpen: (v) => set({ isUsersModalOpen: v }),
  setIsBackupModalOpen: (v) => set({ isBackupModalOpen: v }),
  setIsFactoryResetModalOpen: (v) => set({ isFactoryResetModalOpen: v }),
  setRegisterModalType: (v) => set({ registerModalType: v }),
  setIsOrderStatusModalOpen: (v) => set({ isOrderStatusModalOpen: v }),
  setIsWarrantyConfigOpen: (v) => set({ isWarrantyConfigOpen: v }),
  setIsOrderSequenceModalOpen: (v) => set({ isOrderSequenceModalOpen: v }),
  setIsOSGeneralConfigModalOpen: (v) => set({ isOSGeneralConfigModalOpen: v }),
  setIsSearchOSModalOpen: (v) => set({ isSearchOSModalOpen: v }),
  setIsClientOrdersHistoryOpen: (v) => set({ isClientOrdersHistoryOpen: v }),
  setIsPeriodReportModalOpen: (v) => set({ isPeriodReportModalOpen: v }),
  setIsTechnicianReportModalOpen: (v) => set({ isTechnicianReportModalOpen: v }),
  setIsPrinterConfigModalOpen: (v) => set({ isPrinterConfigModalOpen: v }),
  setIsUpdateSystemModalOpen: (v) => set({ isUpdateSystemModalOpen: v }),
  setIsCompanyModalOpen: (v) => set({ isCompanyModalOpen: v }),
  setIsLinkMobileModalOpen: (v) => set({ isLinkMobileModalOpen: v }),
  setIsSerialLicenseModalOpen: (v) => set({ isSerialLicenseModalOpen: v }),
  setIsLocalNetworkModalOpen: (v) => set({ isLocalNetworkModalOpen: v }),
  setIsScheduleModalOpen: (v) => set({ isScheduleModalOpen: v }),
  setIsWallpaperModalOpen: (v) => set({ isWallpaperModalOpen: v }),
  setIsCashRegisterModalOpen: (v) => set({ isCashRegisterModalOpen: v }),
  setIsSalesModalOpen: (v) => set({ isSalesModalOpen: v }),
  setIsSalesCommissionsModalOpen: (v: boolean) => set({ isSalesCommissionsModalOpen: v }),
  setIsAccountsModalOpen: (v) => set({ isAccountsModalOpen: v }),
  setAccountsModalType: (v) => set({ accountsModalType: v }),
  setIsEstimatesModalOpen: (v) => set({ isEstimatesModalOpen: v }),
  setIsCreateEstimateModalOpen: (v) => set({ isCreateEstimateModalOpen: v }),
  setIsNfeImportModalOpen: (v) => set({ isNfeImportModalOpen: v }),
  setIsFinancialDREModalOpen: (v) => set({ isFinancialDREModalOpen: v }),
  setIsLabelsGeneratorModalOpen: (v) => set({ isLabelsGeneratorModalOpen: v }),
  setIsFiscalInvoiceModalOpen: (v) => set({ isFiscalInvoiceModalOpen: v }),
  setIsPurchaseOrdersModalOpen: (v) => set({ isPurchaseOrdersModalOpen: v }),
  setPurchaseOrdersInitialTab: (tab) => set({ purchaseOrdersInitialTab: tab }),
  setIsQuickStockModalOpen: (v) => set({ isQuickStockModalOpen: v }),
  setIsQuickPartSearchModalOpen: (v) => set({ isQuickPartSearchModalOpen: v }),
  setIsShortcutsModalOpen: (v) => set({ isShortcutsModalOpen: v }),
  setLabelTargetItem: (v) => set({ labelTargetItem: v }),
  setFiscalTargetOrder: (v) => set({ fiscalTargetOrder: v }),
  setOrderToEdit: (updater) =>
    set((state) => ({
      orderToEdit: typeof updater === 'function' ? updater(state.orderToEdit) : updater,
    })),
  setEditingOrder: (updater) =>
    set((state) => ({
      editingOrder: typeof updater === 'function' ? updater(state.editingOrder) : updater,
    })),
  setViewingClient: (v) => set({ viewingClient: v }),
  setViewingPart: (v) => set({ viewingPart: v }),
  setPartTechnicalSheet: (v) => set({ partTechnicalSheet: v }),
  setViewingEquipment: (v) => set({ viewingEquipment: v }),
  setViewingService: (v) => set({ viewingService: v }),
  setSelectedClientForNewOS: (v) => set({ selectedClientForNewOS: v }),
  setSelectedPartForOS: (v) => set({ selectedPartForOS: v }),
  setSelectedServiceForOS: (v) => set({ selectedServiceForOS: v }),
  setSelectedPartForSales: (v) => set({ selectedPartForSales: v }),
  setEstimateToEdit: (v) => set({ estimateToEdit: v }),
  setEstimateToConvertToOS: (v) => set({ estimateToConvertToOS: v }),
  setPendingEstimateForReturn: (v) => set({ pendingEstimateForReturn: v }),
  setCameFromOpenOrders: (v) => set({ cameFromOpenOrders: v }),
  setCameFromFinishedOrders: (v) => set({ cameFromFinishedOrders: v }),
  setCameFromOSForClientEdit: (v) => set({ cameFromOSForClientEdit: v }),
  setCreateOSOpenedFromMenuOS: (v) => set({ createOSOpenedFromMenuOS: v }),
  setOpenOrdersOpenedFromMenuOS: (v) => set({ openOrdersOpenedFromMenuOS: v }),
  setFinishedOrdersOpenedFromMenuOS: (v) => set({ finishedOrdersOpenedFromMenuOS: v }),
  setViewingClientEditMode: (v) => set({ viewingClientEditMode: v }),
  setClientSearchTerm: (v) => set({ clientSearchTerm: v }),
  setClientSelectCallback: (v) =>
    set({
      clientSelectCallback:
        typeof v === 'function' && v.length === 0 ? (v as any)() : v,
    }),
  setPartSelectCallback: (v) =>
    set({
      partSelectCallback:
        typeof v === 'function' && v.length === 0 ? (v as any)() : v,
    }),
  setServiceSelectCallback: (v) =>
    set({
      serviceSelectCallback:
        typeof v === 'function' && v.length === 0 ? (v as any)() : v,
    }),
}));

export const checkIsAnyModalOpen = (state: ModalState): boolean => {
  return Boolean(
    state.isModalOpen || state.registerModalType || state.isMenuOSOpen || state.isOpenOrdersModalOpen ||
    state.isFinishedOrdersModalOpen || state.isClientsModalOpen || state.isPartsModalOpen ||
    state.isServicesModalOpen || state.isEquipmentsModalOpen || state.isBrandsModalOpen ||
    state.isModelsModalOpen || state.isTechniciansModalOpen || state.isSuppliersModalOpen ||
    state.isUsersModalOpen || state.isOrderStatusModalOpen || state.isWarrantyConfigOpen ||
    state.isOrderSequenceModalOpen || state.isOSGeneralConfigModalOpen || state.isSearchOSModalOpen ||
    state.isClientOrdersHistoryOpen || state.isPeriodReportModalOpen || state.isTechnicianReportModalOpen ||
    state.isBackupModalOpen || state.isFactoryResetModalOpen || state.isPrinterConfigModalOpen ||
    state.isUpdateSystemModalOpen || state.isCompanyModalOpen || state.isLinkMobileModalOpen ||
    state.isSerialLicenseModalOpen || state.isLocalNetworkModalOpen || state.isScheduleModalOpen ||
    state.isWallpaperModalOpen || state.isCashRegisterModalOpen || state.isSalesModalOpen ||
    state.isSalesCommissionsModalOpen || state.isAccountsModalOpen || state.isEstimatesModalOpen ||
    state.isCreateEstimateModalOpen || state.isNfeImportModalOpen || state.isFinancialDREModalOpen ||
    state.isLabelsGeneratorModalOpen || state.isFiscalInvoiceModalOpen || state.isPurchaseOrdersModalOpen ||
    state.isQuickStockModalOpen || state.isQuickPartSearchModalOpen || state.isShortcutsModalOpen ||
    state.editingOrder || state.viewingClient || state.viewingPart || state.partTechnicalSheet ||
    state.viewingEquipment || state.viewingService
  );
};

