import React, { useEffect } from 'react';
import { TopMenuBar } from './components/TopMenuBar';
import { Dashboard } from './components/Dashboard';
import { LoginScreen } from './components/LoginScreen';
import { CreateOrderModal } from './components/CreateOrderModal';
import { RegisterModal } from './components/RegisterModal';
import { MenuOSModal } from './components/MenuOSModal';
import { OpenOrdersModal } from './components/OpenOrdersModal';
import { FinishedOrdersModal } from './components/FinishedOrdersModal';
import { EditOrderModal } from './components/EditOrderModal';
import { ClientsModal } from './components/ClientsModal';
import { ClientOrdersHistoryModal } from './components/ClientOrdersHistoryModal';
import { UsersModal } from './components/UsersModal';
import { BackupModal } from './components/BackupModal';
import { PartsModal } from './components/PartsModal';
import { PartViewModal } from './components/PartViewModal';
import { StatusBar } from './components/StatusBar';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { EquipmentsModal } from './components/EquipmentsModal';
import { ServicesModal } from './components/ServicesModal';
import { WarrantyConfigModal } from './components/WarrantyConfigModal';
import { OrderStatusModal } from './components/OrderStatusModal';
import { CompanyModal, defaultCompanyData } from './components/CompanyModal';
import { LinkMobileModal } from './components/LinkMobileModal';
import { SearchOSModal } from './components/SearchOSModal';
import { WallpaperModal } from './components/WallpaperModal';
import { PeriodOrdersReportModal } from './components/PeriodOrdersReportModal';
import { TechnicianOrdersReportModal } from './components/TechnicianOrdersReportModal';
import { TechniciansModal } from './components/TechniciansModal';
import { FactoryResetModal } from './components/FactoryResetModal';
import { OSGeneralConfigModal } from './components/OSGeneralConfigModal';
import { PrinterConfigModal } from './components/PrinterConfigModal';
import { EstimatesModal } from './components/EstimatesModal';
import { CreateEstimateModal, Estimate } from './components/CreateEstimateModal';
import { OrderSequenceModal } from './components/OrderSequenceModal';
import { UpdateSystemModal } from './components/UpdateSystemModal';
import { checkSystemUpdate } from './services/updateService';
import { CashRegisterModal } from './components/CashRegisterModal';
import { SalesModal } from './components/SalesModal';
import { SalesCommissionsModal } from './components/SalesCommissionsModal';
import { SerialLicenseModal } from './components/SerialLicenseModal';
import { SuppliersModal } from './components/SuppliersModal';
import { AccountsModal } from './components/AccountsModal';
import { LocalNetworkModal } from './components/LocalNetworkModal';
import { NfeImportModal } from './components/NfeImportModal';
import { FinancialDREModal } from './components/FinancialDREModal';
import { LabelsGeneratorModal } from './components/LabelsGeneratorModal';
import { FiscalInvoiceModal } from './components/FiscalInvoiceModal';
import { PurchaseOrdersModal } from './components/PurchaseOrdersModal';
import { QuickStockUpdateModal } from './components/QuickStockUpdateModal';
import { QuickPartSearchModal } from './components/QuickPartSearchModal';
import { ShortcutsConfigModal } from './components/ShortcutsConfigModal';
import { TrialExpirationBanner } from './components/TrialExpirationBanner';
import { TrialExpiredModal } from './components/TrialExpiredModal';
import { BrandsModal } from './components/BrandsModal';
import { ModelsModal } from './components/ModelsModal';
import { db } from './services/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  updateOrder,
  createOrder,
  createClient,
  deleteClient,
  fetchOrders,
  updateVisit,
  deleteVisit,
} from './services/api';
import { fetchSystemTrialStatus } from './services/trialProtectionService';
import { useDialog } from './components/DialogContext';

// Stores
import { useOrdersStore } from './stores/useOrdersStore';
import { useCatalogStore } from './stores/useCatalogStore';
import { useUIStore } from './stores/useUIStore';
import { useModalStore, checkIsAnyModalOpen } from './stores/useModalStore';

// Hooks
import { useAppEffects } from './hooks/useAppEffects';
import { useDataSync } from './hooks/useDataSync';
import { useState } from 'react';

export default function App() {
  const { confirm: dlgConfirm } = useDialog();

  // Sincronização em tempo real e carga de dados
  const { loadData } = useDataSync();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    try {
      const saved = sessionStorage.getItem('vollen_current_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  // ── Dados (stores) ────────────────────────────────────────────────────────
  const orders = useOrdersStore((s) => s.orders);
  const setOrders = useOrdersStore((s) => s.setOrders);
  const clients = useOrdersStore((s) => s.clients);
  const setClients = useOrdersStore((s) => s.setClients);
  const estimates = useOrdersStore((s) => s.estimates);
  const setEstimates = useOrdersStore((s) => s.setEstimates);
  const maxEverOrderCode = useOrdersStore((s) => s.maxEverOrderCode);
  const setMaxEverOrderCode = useOrdersStore((s) => s.setMaxEverOrderCode);
  const visits = useOrdersStore((s) => s.visits);
  const setVisits = useOrdersStore((s) => s.setVisits);

  const parts = useCatalogStore((s) => s.parts);
  const setParts = useCatalogStore((s) => s.setParts);
  const services = useCatalogStore((s) => s.services);
  const setServices = useCatalogStore((s) => s.setServices);
  const equipments = useCatalogStore((s) => s.equipments);
  const setEquipments = useCatalogStore((s) => s.setEquipments);
  const brands = useCatalogStore((s) => s.brands);
  const setBrands = useCatalogStore((s) => s.setBrands);
  const models = useCatalogStore((s) => s.models);
  const setModels = useCatalogStore((s) => s.setModels);
  const suppliers = useCatalogStore((s) => s.suppliers);
  const setSuppliers = useCatalogStore((s) => s.setSuppliers);

  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const statusMessage = useUIStore((s) => s.statusMessage);
  const setStatusMessage = useUIStore((s) => s.setStatusMessage);
  const isCapsLockActive = useUIStore((s) => s.isCapsLockActive);
  const setIsCapsLockActive = useUIStore((s) => s.setIsCapsLockActive);
  const customWallpaper = useUIStore((s) => s.customWallpaper);
  const setCustomWallpaper = useUIStore((s) => s.setCustomWallpaper);
  const wallpaperOpacity = useUIStore((s) => s.wallpaperOpacity);
  const setWallpaperOpacity = useUIStore((s) => s.setWallpaperOpacity);
  const wallpaperPosX = useUIStore((s) => s.wallpaperPosX);
  const setWallpaperPosX = useUIStore((s) => s.setWallpaperPosX);
  const wallpaperPosY = useUIStore((s) => s.wallpaperPosY);
  const setWallpaperPosY = useUIStore((s) => s.setWallpaperPosY);
  const wallpaperScale = useUIStore((s) => s.wallpaperScale);
  const setWallpaperScale = useUIStore((s) => s.setWallpaperScale);
  const companyInfoState = useUIStore((s) => s.companyInfoState);
  const setCompanyInfoState = useUIStore((s) => s.setCompanyInfoState);
  const defaultWarrantyConfig = useUIStore((s) => s.defaultWarrantyConfig);
  const setDefaultWarrantyConfig = useUIStore((s) => s.setDefaultWarrantyConfig);
  const trialStatus = useUIStore((s) => s.trialStatus);
  const selectedDate = useUIStore((s) => s.selectedDate);
  const setSelectedDate = useUIStore((s) => s.setSelectedDate);

  // ── Modal store ───────────────────────────────────────────────────────────
  const m = useModalStore();

  // ── Estado auxiliar local (não vale a pena colocar em store) ──────────────
  const [allOrdersWithDeleted, setAllOrdersWithDeleted] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  // Controla se a ficha da peça foi aberta de dentro do modal de vendas
  const [partSheetFromSales, setPartSheetFromSales] = useState(false);

  // ── Computed: verifica se há algum modal aberto ───────────────────────────
  const isAnyModalOpen = checkIsAnyModalOpen(m);

  // ── Efeitos globais de SO e atalhos ──────────────────────────────────────
  useAppEffects({ dlgConfirm: dlgConfirm as any, isAnyModalOpen });

  // ── Checagem silenciosa automática de atualizações ao inicializar ───────
  useEffect(() => {
    // Aguarda 3 segundos após abrir para não concorrer com o carregamento inicial
    const timer = setTimeout(() => {
      checkSystemUpdate()
        .then((res) => {
          if (res.hasUpdate) {
            console.log('[AutoUpdater] Nova versão encontrada silenciosamente:', res.latestVersionInfo?.version);
            m.setIsUpdateSystemModalOpen(true);
          }
        })
        .catch(() => {});
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // ── Helpers de persistência ───────────────────────────────────────────────
  const saveParts = async (newParts: any[]) => {
    setParts(newParts);
    try {
      if (db) {
        for (const p of newParts) {
          await setDoc(doc(db, 'parts', String(p.id)), p, { merge: true });
        }
      }
    } catch (err) { console.warn('Erro ao salvar peças no Firestore:', err); }
  };

  const saveServices = async (newServices: any[]) => {
    setServices(newServices);
    try {
      if (db) {
        for (const s of newServices) {
          await setDoc(doc(db, 'services', String(s.id)), s, { merge: true });
        }
      }
    } catch (err) { console.warn('Erro ao salvar serviços no Firestore:', err); }
  };

  const saveEquipments = async (newEquipments: any[]) => {
    setEquipments(newEquipments);
    try {
      if (db) {
        for (const eq of newEquipments) {
          await setDoc(doc(db, 'equipments', String(eq.id)), eq, { merge: true });
        }
      }
    } catch (err) { console.warn('Erro ao salvar equipamentos no Firestore:', err); }
  };

  const saveSuppliers = async (newSuppliers: any[]) => {
    setSuppliers(newSuppliers);
    try {
      if (db) {
        for (const s of newSuppliers) {
          await setDoc(doc(db, 'suppliers', String(s.id)), s, { merge: true });
        }
      }
    } catch (err) { console.warn('Erro ao salvar fornecedores no Firestore:', err); }
  };

  // ── Handlers de Orçamentos ────────────────────────────────────────────────
  const handleSaveEstimate = (estimate: Estimate) => {
    setEstimates((prev) => {
      const idx = prev.findIndex((e) => e.id === estimate.id);
      const updated = idx >= 0
        ? prev.map((e, i) => i === idx ? estimate : e)
        : [estimate, ...prev];
      try { localStorage.setItem('vollen_estimates', JSON.stringify(updated)); } catch {}
      return updated;
    });
    try { setDoc(doc(db, 'estimates', estimate.id), estimate, { merge: true }).catch(() => {}); } catch {}
    setStatusMessage(`Orçamento #${estimate.code} salvo com sucesso.`);
  };

  const handleDeleteEstimate = (estimateId: string) => {
    setEstimates((prev) => {
      const updated = prev.filter((e) => e.id !== estimateId);
      try { localStorage.setItem('vollen_estimates', JSON.stringify(updated)); } catch {}
      return updated;
    });
    try { deleteDoc(doc(db, 'estimates', estimateId)).catch(() => {}); } catch {}
    setStatusMessage('Orçamento excluído com sucesso.');
  };

  const handleGenerateOSFromEstimate = (estimate: Estimate) => {
    const prefilledOrder = {
      isNewFromEstimate: true,
      client: { id: estimate.client?.id || '', name: estimate.client?.name || '', phone: estimate.client?.phone || '', whatsapp: estimate.client?.whatsapp || '', address: estimate.client?.address || '', number: estimate.client?.number || '', neighborhood: estimate.client?.neighborhood || '', city: estimate.client?.city || '', state: estimate.client?.state || '' },
      equipment: { type: estimate.equipment?.type || '', brand: estimate.equipment?.brand || '', model: estimate.equipment?.model || '', serialNumber: estimate.equipment?.serialNumber || '', accessories: estimate.equipment?.accessories || '' },
      problemDescription: estimate.problemDescription || '',
      technicalReport: estimate.technicalReport || '',
      type: 'ORCAMENTO', status: 'ABERTA',
      travelCost: estimate.travelCost || '0,00',
      discountCost: estimate.discountCost || '0,00',
      totalAmount: estimate.totalAmount || 0,
      partsUsed: (estimate.partsList || []).map((p) => ({ code: p.code || '0001', name: p.name, qty: p.qty || 1, price: p.price })),
      servicesExecuted: (estimate.servicesList || []).map((s) => ({ name: s.name, price: s.price })),
    };
    m.setEstimateToConvertToOS(estimate.id);
    m.setPendingEstimateForReturn(estimate);
    m.setSelectedClientForNewOS(null);
    m.setOrderToEdit(prefilledOrder as any);
    m.setIsCreateEstimateModalOpen(false);
    m.setIsEstimatesModalOpen(false);
    m.setIsModalOpen(true);
    setStatusMessage(`Gerando Ordem de Serviço a partir do Orçamento #${estimate.code}...`);
  };

  // ── Handler: OS de retorno em garantia ───────────────────────────────────
  const handleCreateWarrantyReturn = async (originalOrder: any) => {
    try {
      let maxNum = maxEverOrderCode;
      try {
        const parsed = JSON.parse(localStorage.getItem('vollen_os_config') || '{}');
        if (parsed.initialOrderNumber) {
          const initN = parseInt(String(parsed.initialOrderNumber).replace(/\D/g, ''), 10);
          if (!isNaN(initN) && initN > 0 && initN - 1 > maxNum) maxNum = initN - 1;
        }
      } catch {}
      (orders || []).forEach((o: any) => {
        const n = parseInt((o.code || '').replace(/\D/g, ''), 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      });
      const newCode = `OS-${String(maxNum + 1).padStart(4, '0')}`;
      const newId = String(Date.now());
      const newOrderData = {
        id: newId, code: newCode,
        client: originalOrder.client, clientId: originalOrder.clientId || originalOrder.client?.id || '',
        equipment: originalOrder.equipment, status: 'RETORNO_GARANTIA',
        warrantyType: originalOrder.warrantyType || 'GARANTIA_LOJA',
        warrantyTermsData: { ...originalOrder.warrantyTermsData, startDate: originalOrder.exitDate || originalOrder.warrantyTermsData?.startDate || new Date().toISOString().split('T')[0] },
        originalOsCode: originalOrder.code, originalOsId: originalOrder.id,
        originalExecutedService: originalOrder.originalExecutedService || originalOrder.executedService || '',
        problemDescription: '', technicalReport: '', executedService: '', returnExecutedService: '',
        entryDate: new Date().toISOString().split('T')[0], exitDate: '',
        partsUsed: [], parts: [], partsList: [], servicesExecuted: [], services: [], servicesList: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      const createdOrder = await createOrder(newOrderData);
      await updateOrder(originalOrder.id, { warrantyReturnOsCode: newCode, warrantyReturnOsId: newId });
      setOrders((prev: any[]) => [createdOrder, ...prev.map((o: any) => o.id === originalOrder.id ? { ...o, warrantyReturnOsCode: newCode, warrantyReturnOsId: newId } : o)]);
      setMaxEverOrderCode(maxNum + 1);
      m.setIsFinishedOrdersModalOpen(false);
      m.setOrderToEdit(createdOrder);
      m.setCameFromFinishedOrders(false);
      m.setIsModalOpen(true);
      setStatusMessage(`OS de Retorno em Garantia ${newCode} criada com sucesso!`);
    } catch (err) {
      console.error('Erro ao criar OS de retorno em garantia:', err);
      setStatusMessage('Erro ao criar OS de retorno em garantia.');
    }
  };

  const handleLogout = () => {
    try { sessionStorage.removeItem('vollen_current_user'); } catch {}
    setCurrentUser(null);
  };

  // ── Guard de autenticação ─────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <>
        <LoginScreen
          onLoginSuccess={(user) => {
            try { sessionStorage.setItem('vollen_current_user', JSON.stringify(user)); } catch {}
            setCurrentUser(user);
          }}
          onOpenSerialModal={() => m.setIsSerialLicenseModalOpen(true)}
          onStartTrial={async () => {
            await fetchSystemTrialStatus().then((s) => useUIStore.getState().setTrialStatus(s)).catch(console.error);
            loadData();
          }}
        />

        {/* Modal de Serial / Licença na tela de Login */}
        <SerialLicenseModal
          isOpen={m.isSerialLicenseModalOpen}
          onClose={() => m.setIsSerialLicenseModalOpen(false)}
          onLicenseChanged={() => {
            loadData();
            fetchSystemTrialStatus().then((s) => useUIStore.getState().setTrialStatus(s)).catch(console.error);
          }}
          currentUser={currentUser}
        />
      </>
    );
  }

  // ── JSX Principal ─────────────────────────────────────────────────────────
  return (
    <div className={`h-screen w-screen bg-slate-100 text-slate-900 flex flex-col font-sans overflow-hidden relative ${isCapsLockActive ? 'caps-active' : ''}`}>

      {/* Barra de Menus Superior */}
      <TopMenuBar
        onNewOrder={() => { m.setOrderToEdit(null); m.setSelectedClientForNewOS(null); m.setEstimateToConvertToOS(null); m.setIsModalOpen(true); }}
        onLogout={handleLogout}
        onOpenTab={(tab) => setActiveTab(tab)}
        onOpenRegister={(type) => {
          if ((type as string) === 'WARRANTY_TERMS') { m.setIsWarrantyConfigOpen(true); }
          else { m.setRegisterModalType(type); }
        }}
        onOpenMenuOSModal={() => m.setIsMenuOSOpen(true)}
        onOpenUsersModal={() => m.setIsUsersModalOpen(true)}
        onOpenBackupModal={() => m.setIsBackupModalOpen(true)}
        onOpenClientsModal={(initialSearch) => { m.setClientSearchTerm(initialSearch || ''); m.setIsClientsModalOpen(true); }}
        onOpenPartsModal={() => m.setIsPartsModalOpen(true)}
        onOpenEquipmentsModal={() => m.setIsEquipmentsModalOpen(true)}
        onOpenBrandsModal={() => m.setIsBrandsModalOpen(true)}
        onOpenModelsModal={() => m.setIsModelsModalOpen(true)}
        onOpenServicesModal={() => m.setIsServicesModalOpen(true)}
        onOpenOrderStatusModal={() => m.setIsOrderStatusModalOpen(true)}
        onOpenCompanyModal={() => m.setIsCompanyModalOpen(true)}
        onOpenLinkMobileModal={() => m.setIsLinkMobileModalOpen(true)}
        onOpenEstimatesModal={() => m.setIsEstimatesModalOpen(true)}
        onOpenCreateEstimateModal={() => { m.setEstimateToEdit(null); m.setIsCreateEstimateModalOpen(true); }}
        onOpenWallpaperModal={() => m.setIsWallpaperModalOpen(true)}
        onOpenTechniciansModal={() => m.setIsTechniciansModalOpen(true)}
        onOpenFactoryResetModal={() => m.setIsFactoryResetModalOpen(true)}
        onOpenOSGeneralConfigModal={() => m.setIsOSGeneralConfigModalOpen(true)}
        onOpenOrderSequenceModal={() => m.setIsOrderSequenceModalOpen(true)}
        onOpenPrinterConfigModal={() => m.setIsPrinterConfigModalOpen(true)}
        onOpenPeriodReportModal={() => {
          m.setIsPeriodReportModalOpen(true);
          fetchOrders(true).then((allWithDel) => { if (Array.isArray(allWithDel)) setAllOrdersWithDeleted(allWithDel); }).catch(console.error);
        }}
        onOpenTechnicianOrdersReportModal={() => m.setIsTechnicianReportModalOpen(true)}
        onOpenUpdateSystemModal={() => m.setIsUpdateSystemModalOpen(true)}
        onOpenCashRegisterModal={() => m.setIsCashRegisterModalOpen(true)}
        onOpenSalesModal={() => m.setIsSalesModalOpen(true)}
        onOpenSalesCommissionsModal={() => m.setIsSalesCommissionsModalOpen(true)}
        onOpenSerialLicenseModal={() => m.setIsSerialLicenseModalOpen(true)}
        onOpenSuppliersModal={() => m.setIsSuppliersModalOpen(true)}
        onOpenAccountsModal={(type) => { m.setAccountsModalType(type || 'PAGAR'); m.setIsAccountsModalOpen(true); }}
        onOpenLocalNetworkModal={() => m.setIsLocalNetworkModalOpen(true)}
        onOpenFinancialDREModal={() => m.setIsFinancialDREModalOpen(true)}
        onOpenLabelsGeneratorModal={() => { m.setLabelTargetItem(null); m.setIsLabelsGeneratorModalOpen(true); }}
        onOpenFiscalInvoiceModal={() => { m.setFiscalTargetOrder(null); m.setIsFiscalInvoiceModalOpen(true); }}
        onOpenPurchaseOrdersModal={(initialTab) => {
          if (initialTab) m.setPurchaseOrdersInitialTab(initialTab);
          m.setIsPurchaseOrdersModalOpen(true);
        }}
        onOpenQuickStockModal={() => m.setIsQuickStockModalOpen(true)}
        onOpenQuickPartSearchModal={() => m.setIsQuickPartSearchModalOpen(true)}
        onOpenShortcutsModal={() => m.setIsShortcutsModalOpen(true)}
        currentUser={currentUser}
      />

      {/* Banner de Demonstração */}
      <TrialExpirationBanner trialStatus={trialStatus} onOpenSerialModal={() => m.setIsSerialLicenseModalOpen(true)} />

      {/* Papel de Parede Personalizado */}
      {customWallpaper && (
        <div className="absolute inset-0 pointer-events-none z-0 transition-all duration-300"
          style={{ backgroundImage: `url(${customWallpaper})`, backgroundSize: wallpaperScale === 100 ? 'cover' : `${wallpaperScale}%`, backgroundPosition: `${wallpaperPosX}% ${wallpaperPosY}%`, backgroundRepeat: 'no-repeat', opacity: (wallpaperOpacity || 25) / 100 }}
        />
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full h-full p-0 overflow-hidden flex flex-col justify-between">
        {activeTab === 'dashboard' && (
          <Dashboard
            hasCustomWallpaper={Boolean(customWallpaper)}
            onNewOrder={() => { m.setOrderToEdit(null); m.setSelectedClientForNewOS(null); m.setEstimateToConvertToOS(null); m.setIsModalOpen(true); }}
            onOpenMenuOS={() => m.setIsMenuOSOpen(true)}
            onSearchOS={() => m.setIsSearchOSModalOpen(true)}
            onOpenSchedule={() => m.setIsScheduleModalOpen(true)}
            onOpenClients={() => m.setIsClientsModalOpen(true)}
            onOpenEstimates={() => m.setIsEstimatesModalOpen(true)}
            onOpenSales={() => m.setIsSalesModalOpen(true)}
          />
        )}
        {activeTab === 'schedule' && (
          <ScheduleCalendar visits={visits} selectedDate={selectedDate} onDateChange={setSelectedDate} />
        )}
      </main>

      {/* ── MODAIS ──────────────────────────────────────────────────────────── */}

      {/* NÍVEL 1: Criar / Editar OS */}
      <CreateOrderModal
        isOpen={m.isModalOpen}
        clients={clients}
        allOrders={orders}
        availableParts={parts}
        availableServices={services}
        availableEquipments={equipments}
        visits={visits}
        selectedClient={m.selectedClientForNewOS}
        selectedPartForOS={m.selectedPartForOS}
        selectedServiceForOS={m.selectedServiceForOS}
        orderToEdit={m.orderToEdit}
        currentUser={currentUser}
        totalOrders={maxEverOrderCode}
        defaultWarrantyConfig={defaultWarrantyConfig}
        onClose={() => {
          m.setIsModalOpen(false);
          m.setSelectedClientForNewOS(null);
          m.setOrderToEdit(null);
          m.setEstimateToConvertToOS(null);
          if (m.pendingEstimateForReturn) {
            m.setEstimateToEdit(m.pendingEstimateForReturn);
            m.setIsCreateEstimateModalOpen(true);
            m.setPendingEstimateForReturn(null);
          } else if (m.cameFromFinishedOrders) {
            m.setCameFromFinishedOrders(false);
            m.setIsFinishedOrdersModalOpen(true);
          } else if (m.cameFromOpenOrders) {
            m.setCameFromOpenOrders(false);
            m.setIsOpenOrdersModalOpen(true);
          } else if (m.createOSOpenedFromMenuOS) {
            m.setCreateOSOpenedFromMenuOS(false);
            m.setIsMenuOSOpen(true);
          }
        }}
        onOpenClientsModal={() => {
          m.setClientSelectCallback((client: any) => {
            m.setSelectedClientForNewOS(client);
            if (m.orderToEdit) m.setOrderToEdit((prev: any) => ({ ...prev, clientId: client?.id, client }));
          });
          m.setIsClientsModalOpen(true);
        }}
        onOpenPartsModal={() => {
          m.setPartSelectCallback((part: any) => { m.setSelectedPartForOS(part); setTimeout(() => m.setSelectedPartForOS(null), 300); });
          m.setIsPartsModalOpen(true);
        }}
        onOpenServicesModal={() => {
          m.setServiceSelectCallback((service: any) => { m.setSelectedServiceForOS(service); setTimeout(() => m.setSelectedServiceForOS(null), 300); });
          m.setIsServicesModalOpen(true);
        }}
        onOpenClientHistory={(clientName, clientId) => {
          const clientMatch = clients.find((c: any) => c.id === clientId || c.name.toLowerCase() === clientName.toLowerCase());
          m.setViewingClient(clientMatch || { id: clientId, name: clientName });
          m.setIsClientOrdersHistoryOpen(true);
        }}
        onEditClient={(clientData) => {
          const clientMatch = clients.find((c: any) => c.id === clientData.id || c.name.toLowerCase() === clientData.name.toLowerCase());
          m.setViewingClient(clientMatch || clientData);
          m.setViewingClientEditMode(true);
          m.setCameFromOSForClientEdit(true);
        }}
        onDeleteOrder={(deletedId) => {
          setOrders((prev: any[]) => prev.filter((o: any) => o.id !== deletedId));
          setVisits((prev: any[]) => prev.filter((v: any) => v.orderId !== deletedId && v.order?.id !== deletedId));
          setStatusMessage('Ordem de Serviço excluída definitivamente.');
        }}
        onUpdatePartsStock={saveParts}
        onSaveEquipment={(newEq) => {
          const typeFormatted = (newEq.type || newEq.name || '').trim();
          if (!typeFormatted) return;
          const normalizedNew = typeFormatted.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
          const exists = equipments.some((e: any) => (e.type || e.name || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() === normalizedNew);
          if (exists) return;
          saveEquipments([newEq, ...equipments]);
        }}
        onCreateWarrantyReturn={handleCreateWarrantyReturn}
        onOpenWarrantyOrder={(targetOS) => { m.setOrderToEdit(targetOS); loadData(); }}
        onOpenLabelsGenerator={(order) => { m.setLabelTargetItem(order); m.setIsLabelsGeneratorModalOpen(true); }}
        onOpenFiscalInvoice={(order) => { m.setFiscalTargetOrder(order); m.setIsFiscalInvoiceModalOpen(true); }}
        onSuccess={async (savedOrder?: any) => {
          if (m.estimateToConvertToOS) {
            const osId = savedOrder?.id || 'simulated-os';
            setEstimates((prev) => { const upd = prev.map((e) => e.id === m.estimateToConvertToOS ? { ...e, status: 'APROVADO' as const, convertedToOSId: osId } : e); try { localStorage.setItem('vollen_estimates', JSON.stringify(upd)); } catch {} return upd; });
            try { setDoc(doc(db, 'estimates', m.estimateToConvertToOS!), { status: 'APROVADO', convertedToOSId: osId }, { merge: true }).catch(() => {}); } catch {}
            m.setEstimateToConvertToOS(null);
          }
          m.setPendingEstimateForReturn(null);
          if (savedOrder) m.setOrderToEdit(savedOrder);
          await loadData();
          setStatusMessage('Ordem de Serviço salva com sucesso!');
        }}
        onFinalizeSuccess={async () => {
          if (m.estimateToConvertToOS) {
            setEstimates((prev) => { const upd = prev.map((e) => e.id === m.estimateToConvertToOS ? { ...e, status: 'APROVADO' as const, convertedToOSId: 'finalized-os' } : e); try { localStorage.setItem('vollen_estimates', JSON.stringify(upd)); } catch {} return upd; });
            try { setDoc(doc(db, 'estimates', m.estimateToConvertToOS!), { status: 'APROVADO', convertedToOSId: 'finalized-os' }, { merge: true }).catch(() => {}); } catch {}
            m.setEstimateToConvertToOS(null);
          }
          m.setPendingEstimateForReturn(null);
          setStatusMessage('Ordem de Serviço finalizada com sucesso!');
          await loadData();
          m.setIsModalOpen(false);
          m.setSelectedClientForNewOS(null);
          m.setOrderToEdit(null);
          if (m.cameFromFinishedOrders) { m.setCameFromFinishedOrders(false); m.setIsFinishedOrdersModalOpen(true); }
          else if (m.cameFromOpenOrders) { m.setCameFromOpenOrders(false); m.setIsOpenOrdersModalOpen(true); }
          else if (m.createOSOpenedFromMenuOS) { m.setCreateOSOpenedFromMenuOS(false); m.setIsMenuOSOpen(true); }
        }}
      />

      {/* NÍVEL 1: Menu OS */}
      <MenuOSModal
        isOpen={m.isMenuOSOpen}
        orders={orders}
        onClose={() => m.setIsMenuOSOpen(false)}
        onOpenCreateOS={() => { m.setOrderToEdit(null); m.setSelectedClientForNewOS(null); m.setCameFromOpenOrders(false); m.setCameFromFinishedOrders(false); m.setCreateOSOpenedFromMenuOS(true); m.setIsModalOpen(true); }}
        onOpenOpenOrdersModal={() => { m.setIsMenuOSOpen(false); m.setOpenOrdersOpenedFromMenuOS(true); m.setIsOpenOrdersModalOpen(true); }}
        onOpenFinishedOrdersModal={() => { m.setIsMenuOSOpen(false); m.setFinishedOrdersOpenedFromMenuOS(true); m.setIsFinishedOrdersModalOpen(true); }}
        onOpenSearchOS={() => { m.setIsMenuOSOpen(false); m.setIsSearchOSModalOpen(true); }}
      />

      {/* NÍVEL 2: OS Abertas */}
      <OpenOrdersModal
        isOpen={m.isOpenOrdersModalOpen}
        orders={orders}
        onClose={() => { m.setIsOpenOrdersModalOpen(false); if (m.openOrdersOpenedFromMenuOS) { m.setOpenOrdersOpenedFromMenuOS(false); m.setIsMenuOSOpen(true); } }}
        onOpenCreateOS={() => { m.setOrderToEdit(null); m.setSelectedClientForNewOS(null); m.setCameFromOpenOrders(true); m.setCameFromFinishedOrders(false); m.setCreateOSOpenedFromMenuOS(false); m.setIsOpenOrdersModalOpen(false); m.setIsMenuOSOpen(false); m.setIsModalOpen(true); }}
        onUpdateOrderStatus={async (orderId, newStatus) => {
          setOrders((prev: any[]) => prev.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o));
          setStatusMessage(`Status da Ordem de Serviço atualizado para: ${newStatus}`);
          try { await updateOrder(orderId, { status: newStatus }); await loadData(); } catch (err) { console.error(err); }
        }}
        onOpenEditOS={(order) => { m.setOrderToEdit(order); m.setCameFromOpenOrders(true); m.setCameFromFinishedOrders(false); m.setCreateOSOpenedFromMenuOS(false); m.setIsOpenOrdersModalOpen(false); m.setIsModalOpen(true); }}
      />

      {/* NIVEL 2b: OS Finalizadas */}
      <FinishedOrdersModal
        isOpen={m.isFinishedOrdersModalOpen}
        orders={orders}
        onClose={() => { m.setIsFinishedOrdersModalOpen(false); if (m.finishedOrdersOpenedFromMenuOS) { m.setFinishedOrdersOpenedFromMenuOS(false); m.setIsMenuOSOpen(true); } }}
        onCreateWarrantyReturn={handleCreateWarrantyReturn}
        onUpdateOrderStatus={async (orderId, newStatus) => {
          setOrders((prev: any[]) => prev.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o));
          setStatusMessage(`Status da Ordem de Servico atualizado para: ${newStatus}`);
          try { await updateOrder(orderId, { status: newStatus }); await loadData(); } catch (err) { console.error(err); }
        }}
        onOpenEditOS={(order) => { m.setOrderToEdit(order); m.setCameFromFinishedOrders(true); m.setCameFromOpenOrders(false); m.setCreateOSOpenedFromMenuOS(false); m.setIsFinishedOrdersModalOpen(false); m.setIsModalOpen(true); }}
      />

      {/* NÍVEL 3: Edição da OS */}
      <EditOrderModal
        isOpen={!!m.editingOrder}
        order={m.editingOrder}
        clients={clients}
        onClose={() => m.setEditingOrder(null)}
        onOpenCreateClient={() => m.setRegisterModalType('CLIENT')}
        onViewClientProfile={(client) => m.setViewingClient(client)}
        onOpenClientsModal={() => m.setIsClientsModalOpen(true)}
        onSave={(updatedOrder) => {
          setOrders((prev: any[]) => prev.map((os: any) => os.id === updatedOrder.id ? updatedOrder : os));
          setStatusMessage(`Ordem de Serviço ${updatedOrder.code} atualizada e salva com sucesso!`);
        }}
      />

      {/* NÍVEL 4: Clientes */}
      <ClientsModal
        isOpen={m.isClientsModalOpen}
        clients={clients}
        currentUser={currentUser}
        initialSearchTerm={m.clientSearchTerm}
        onClose={() => { m.setIsClientsModalOpen(false); m.setClientSearchTerm(''); }}
        onOpenCreateClient={() => m.setRegisterModalType('CLIENT')}
        onOpenViewClient={(client, startInEditMode) => { m.setViewingClient(client); m.setViewingClientEditMode(!!startInEditMode); }}
        onDeleteClient={async (clientId) => {
          const clientToDel = clients.find((c: any) => c.id === clientId);
          const hasOrders = orders.some((os: any) => os.clientId === clientId || (os.client && os.client.id === clientId) || (clientToDel && os.client?.name?.toLowerCase() === clientToDel.name?.toLowerCase()));
          if (hasOrders) { alert(`Não é possível excluir o cliente "${clientToDel?.name || ''}" pois existem Ordens de Serviço vinculadas a ele.`); return; }
          setClients((prev: any[]) => prev.filter((c: any) => c.id !== clientId));
          setStatusMessage('Cliente excluído com sucesso.');
          try { await deleteClient(clientId); } catch (err) { console.error(err); }
          await loadData();
        }}
        onSelectClient={
          m.clientSelectCallback
            ? (client) => {
                const cb = m.clientSelectCallback as any;
                if (typeof cb === 'function') {
                  const res = cb(client);
                  if (typeof res === 'function') res(client);
                }
                m.setClientSelectCallback(null);
                m.setIsClientsModalOpen(false);
              }
            : (m.isModalOpen || m.editingOrder)
              ? (client) => { if (m.editingOrder) { m.setEditingOrder((prev: any) => ({ ...prev, clientId: client.id, client })); } else if (m.isModalOpen) { m.setSelectedClientForNewOS(client); } m.setIsClientsModalOpen(false); }
              : undefined
        }
      />

      {/* Equipamentos */}
      <EquipmentsModal
        isOpen={m.isEquipmentsModalOpen}
        equipments={equipments}
        currentUser={currentUser}
        onClose={() => m.setIsEquipmentsModalOpen(false)}
        onOpenCreateEquipment={() => m.setRegisterModalType('EQUIPMENT')}
        onOpenEditEquipment={(equipment) => { m.setViewingEquipment(equipment); m.setIsEquipmentsModalOpen(false); }}
        onDeleteEquipment={(eqId) => { saveEquipments(equipments.filter((e: any) => e.id !== eqId)); setStatusMessage('Equipamento excluído com sucesso.'); }}
      />

      {/* Marcas de Equipamentos */}
      <BrandsModal
        isOpen={m.isBrandsModalOpen}
        brands={brands}
        onClose={() => m.setIsBrandsModalOpen(false)}
        currentUser={currentUser}
      />

      {/* Modelos de Equipamentos */}
      <ModelsModal
        isOpen={m.isModelsModalOpen}
        models={models}
        brands={brands}
        onClose={() => m.setIsModelsModalOpen(false)}
        currentUser={currentUser}
      />

      {/* Histórico de OS do Cliente */}
      <ClientOrdersHistoryModal
        isOpen={m.isClientOrdersHistoryOpen}
        clientName={m.viewingClient?.name || ''}
        orders={orders.filter((os: any) => {
          if (!m.viewingClient) return false;
          return os.clientId === m.viewingClient.id || (os.client && os.client.id === m.viewingClient.id) || (m.viewingClient.name && os.client?.name?.toLowerCase() === m.viewingClient.name.toLowerCase());
        })}
        onClose={() => m.setIsClientOrdersHistoryOpen(false)}
        onSelectOrder={(order) => { m.setIsClientOrdersHistoryOpen(false); m.setViewingClient(null); m.setOrderToEdit(order); m.setIsModalOpen(true); }}
      />

      {/* NÍVEL 6: Cadastros (clientes, peças, equipamentos, serviços) */}
      <RegisterModal
        isOpen={Boolean(m.registerModalType || m.viewingClient || m.viewingPart || m.viewingEquipment || m.viewingService)}
        initialType={m.registerModalType || (m.viewingPart ? 'PART' : m.viewingEquipment ? 'EQUIPMENT' : m.viewingService ? 'SERVICE' : 'CLIENT')}
        isExclusiveClientMode={m.registerModalType === 'CLIENT'}
        clientDataToView={m.viewingClient}
        partDataToView={m.viewingPart}
        equipmentDataToView={m.viewingEquipment}
        serviceDataToView={m.viewingService}
        availableEquipments={equipments}
        availableSuppliers={suppliers}
        startInEditMode={m.viewingClientEditMode || Boolean(m.viewingPart) || Boolean(m.viewingEquipment) || Boolean(m.viewingService)}
        clientOrders={orders}
        existingParts={parts}
        nextClientCode={String(clients.reduce((max: number, c: any) => { const n = parseInt(String(c.code || '').replace(/\D/g, ''), 10); return isNaN(n) ? max : Math.max(max, n); }, 0) + 1).padStart(4, '0')}
        nextPartCode={(() => {
          const usedCodes = new Set<number>();
          parts.forEach((p: any) => {
            const n = parseInt(String(p.code || '').replace(/\D/g, ''), 10);
            if (!isNaN(n) && n > 0) {
              usedCodes.add(n);
            }
          });
          let candidate = 1;
          while (usedCodes.has(candidate)) {
            candidate++;
          }
          return String(candidate).padStart(4, '0');
        })()}
        onOpenClientOrdersHistoryModal={() => m.setIsClientOrdersHistoryOpen(true)}
        onOpenSelectedOSFromClient={(order) => { m.setViewingClient(null); m.setRegisterModalType(null); m.setIsClientsModalOpen(false); m.setOrderToEdit(order); m.setIsModalOpen(true); }}
        onClose={() => {
          const wasClientForm = m.registerModalType === 'CLIENT' || Boolean(m.viewingClient);
          const wasPartForm = m.registerModalType === 'PART' || Boolean(m.viewingPart);
          const wasEquipmentForm = m.registerModalType === 'EQUIPMENT' || Boolean(m.viewingEquipment);
          const wasServiceForm = m.registerModalType === 'SERVICE' || Boolean(m.viewingService);
          const backToOS = m.cameFromOSForClientEdit;
          m.setRegisterModalType(null); m.setViewingClient(null); m.setViewingPart(null); m.setViewingEquipment(null); m.setViewingService(null); m.setViewingClientEditMode(false); m.setCameFromOSForClientEdit(false);
          if (backToOS) { m.setIsModalOpen(true); }
          else if (m.isSalesModalOpen && wasClientForm) { m.setIsClientsModalOpen(false); }
          else if (wasClientForm) { m.setIsClientsModalOpen(true); }
          else if (wasPartForm) { m.setIsPartsModalOpen(true); }
          else if (wasEquipmentForm) { m.setIsEquipmentsModalOpen(true); }
          else if (wasServiceForm) { m.setIsServicesModalOpen(true); }
          loadData();
        }}
        onSaveEquipment={(eqForm) => {
          const typeFormatted = (eqForm.type || '').trim();
          if (!typeFormatted) { alert('Por favor, informe o nome do equipamento.'); return; }
          const normalizedNew = typeFormatted.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
          const duplicate = equipments.find((e: any) => { if (eqForm.id && e.id === eqForm.id) return false; return (e.type || e.name || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() === normalizedNew; });
          if (duplicate) { alert(`Já existe um equipamento cadastrado com o nome "${duplicate.type || duplicate.name}" (Código: ${duplicate.code || 'N/D'}). Não é permitido cadastrar duplicados.`); return; }
          const maxNum = equipments.reduce((max: number, e: any) => { const n = parseInt(String(e.code || '').replace(/\D/g, ''), 10); return isNaN(n) ? max : Math.max(max, n); }, 0);
          const newEq = { id: eqForm.id || String(Date.now()), code: eqForm.code ? String(eqForm.code).padStart(4, '0') : String(maxNum + 1).padStart(4, '0'), type: isCapsLockActive ? typeFormatted.toUpperCase() : typeFormatted, brand: isCapsLockActive ? (eqForm.brand || '').toUpperCase() : (eqForm.brand || ''), model: isCapsLockActive ? (eqForm.model || '').toUpperCase() : (eqForm.model || ''), serialNumber: isCapsLockActive ? (eqForm.serialNumber || '').toUpperCase() : (eqForm.serialNumber || '') };
          const exists = equipments.some((e: any) => e.id === newEq.id);
          saveEquipments(exists ? equipments.map((e: any) => e.id === newEq.id ? newEq : e) : [newEq, ...equipments]);
          setStatusMessage(`Equipamento "${newEq.type}" salvo com sucesso!`);
          m.setViewingEquipment(null); m.setIsEquipmentsModalOpen(true);
        }}
        onSavePart={(partForm) => {
          const rawCode = String(partForm.code || '').trim();
          const numOnly = parseInt(rawCode.replace(/\D/g, ''), 10);
          const codeFormatted = isNaN(numOnly) ? rawCode : String(numOnly).padStart(4, '0');

          const duplicate = parts.find((p: any) => {
            if (partForm.id && p.id === partForm.id) return false;
            const pNum = parseInt(String(p.code || '').replace(/\D/g, ''), 10);
            const fNum = parseInt(codeFormatted.replace(/\D/g, ''), 10);
            if (!isNaN(pNum) && !isNaN(fNum)) {
              return pNum === fNum;
            }
            return String(p.code || '').trim().toLowerCase() === codeFormatted.toLowerCase();
          });

          if (duplicate) {
            alert(`Já existe uma peça cadastrada com o código "${codeFormatted}" (${duplicate.name || 'Sem nome'}). Não é permitido duplicar códigos.`);
            return;
          }

          const newPart = {
            id: partForm.id || String(Date.now()),
            code: codeFormatted,
            barcode: partForm.barcode || '',
            manufacturerCode: partForm.manufacturerCode || '',
            name: isCapsLockActive ? (partForm.name || '').toUpperCase() : (partForm.name || 'PEÇA SEM NOME'),
            brand: isCapsLockActive ? (partForm.brand || '').toUpperCase() : (partForm.brand || ''),
            group: isCapsLockActive ? (partForm.group || '').toUpperCase() : (partForm.group || ''),
            location: isCapsLockActive ? (partForm.location || '').toUpperCase() : (partForm.location || ''),
            costPrice: partForm.costPrice || '',
            profitMarginPercent: partForm.profitMarginPercent || '',
            techPrice: partForm.techPrice || '',
            finalPrice: partForm.finalPrice || '0,00',
            application: isCapsLockActive ? (partForm.application || '').toUpperCase() : (partForm.application || ''),
            unit: partForm.unit || 'UN',
            stockQuantity: Number(partForm.stockQuantity) || 0,
            minStock: Number(partForm.minStock) || 0,
            supplierId: partForm.supplierId || '',
            supplierName: partForm.supplierName || '',
            imageUrl: partForm.imageUrl || '',

            // Medidas & Dimensões
            length: partForm.length || '',
            width: partForm.width || '',
            height: partForm.height || '',
            innerDiameter: partForm.innerDiameter || '',
            outerDiameter: partForm.outerDiameter || '',
            threadFitting: partForm.threadFitting || '',
            weight: partForm.weight || '',

            // Elétrica & Técnica
            voltage: partForm.voltage || '',
            power: partForm.power || '',
            current: partForm.current || '',
            capacitance: partForm.capacitance || '',
            frequency: partForm.frequency || '',
            resistance: partForm.resistance || '',
            material: partForm.material || '',
            colorFinish: partForm.colorFinish || '',

            // Compatibilidade & OEM
            compatibleModels: partForm.compatibleModels || '',
            oemCrossReference: partForm.oemCrossReference || '',

            // Atributos Extras
            customAttributes: Array.isArray(partForm.customAttributes) ? partForm.customAttributes : [],

            updatedAt: new Date().toISOString(),
          };
          const exists = parts.some((p: any) => p.id === newPart.id);
          saveParts(exists ? parts.map((p: any) => p.id === newPart.id ? newPart : p) : [newPart, ...parts]);
          setStatusMessage(`Peça "${newPart.name}" salva com sucesso!`);
          m.setViewingPart(null); m.setIsPartsModalOpen(true);
        }}
        onSaveService={(serviceForm) => {
          const maxNum = services.reduce((max: number, s: any) => { const n = parseInt(String(s.code || '').replace(/\D/g, ''), 10); return isNaN(n) ? max : Math.max(max, n); }, 0);
          const newService = { id: serviceForm.id || String(Date.now()), code: serviceForm.code || String(maxNum + 1).padStart(4, '0'), name: isCapsLockActive ? (serviceForm.name || '').toUpperCase() : (serviceForm.name || 'SERVIÇO SEM NOME'), price: serviceForm.price || '0,00' };
          const exists = services.some((s: any) => s.id === newService.id);
          saveServices(exists ? services.map((s: any) => s.id === newService.id ? newService : s) : [newService, ...services]);
          setStatusMessage(`Serviço "${newService.name}" salvo com sucesso!`);
          m.setViewingService(null); m.setIsServicesModalOpen(true);
        }}
        onSaveClient={async (clientForm) => {
          const maxNum = clients.reduce((max: number, c: any) => { const n = parseInt(String(c.code || '').replace(/\D/g, ''), 10); return isNaN(n) ? max : Math.max(max, n); }, 0);
          const clientPayload = { ...clientForm, code: clientForm.code || String(maxNum + 1).padStart(4, '0') };
          let savedClient = null;
          try { savedClient = await createClient(clientPayload); } catch (err) { console.error(err); }
          const finalClient = savedClient || { ...clientPayload, id: clientPayload.id || String(Date.now()), name: clientPayload.name || 'Novo Cliente' };
          setClients((prev: any[]) => [finalClient, ...prev.filter((c: any) => c.id !== finalClient.id)]);
          setStatusMessage(`Cliente ${finalClient.name} salvo com sucesso!`);
          m.setRegisterModalType(null);
          m.setViewingClient(null);
          if (m.cameFromOSForClientEdit) {
            m.setSelectedClientForNewOS(finalClient);
            m.setIsModalOpen(true);
            m.setCameFromOSForClientEdit(false);
          } else if (m.isSalesModalOpen) {
            m.setIsClientsModalOpen(false);
          } else {
            m.setIsClientsModalOpen(true);
          }
          await loadData();
        }}
      />

      {/* Usuários */}
      <UsersModal isOpen={m.isUsersModalOpen} onClose={() => m.setIsUsersModalOpen(false)} />

      {/* Peças */}
      <PartsModal
        isOpen={m.isPartsModalOpen}
        parts={parts}
        availableEquipments={equipments}
        currentUser={currentUser}
        onClose={() => { m.setIsPartsModalOpen(false); m.setPartSelectCallback(null); }}
        onSelectPart={
          m.partSelectCallback
            ? (part) => {
                const cb = m.partSelectCallback as any;
                if (typeof cb === 'function') {
                  const res = cb(part);
                  if (typeof res === 'function') res(part);
                }
                m.setPartSelectCallback(null);
                m.setIsPartsModalOpen(false);
              }
            : (m.isModalOpen || m.editingOrder)
              ? (part) => { m.setSelectedPartForOS(part); m.setIsPartsModalOpen(false); setTimeout(() => m.setSelectedPartForOS(null), 300); }
              : m.isSalesModalOpen
                ? (part) => { m.setSelectedPartForSales(part); m.setIsPartsModalOpen(false); setTimeout(() => m.setSelectedPartForSales(null), 300); }
                : undefined
        }
        onOpenCreatePart={() => m.setRegisterModalType('PART')}
        onOpenEditPart={(part) => { m.setViewingPart(part); m.setIsPartsModalOpen(false); }}
        onDeletePart={async (partId) => {
          saveParts(parts.filter((p: any) => p.id !== partId));
          try { await deleteDoc(doc(db, 'parts', String(partId))); } catch (e) { console.warn(e); }
          setStatusMessage('Peça excluída com sucesso.');
        }}
        onAddToSales={(part) => { m.setIsPartsModalOpen(false); m.setSelectedPartForSales(part); m.setIsSalesModalOpen(true); setTimeout(() => m.setSelectedPartForSales(null), 300); }}
        onOpenNfeImport={() => m.setIsNfeImportModalOpen(true)}
        onOpenLabelsGenerator={(part) => { m.setIsPartsModalOpen(false); m.setLabelTargetItem(part); m.setIsLabelsGeneratorModalOpen(true); }}
        onOpenQuickStock={() => { m.setIsPartsModalOpen(false); m.setIsQuickStockModalOpen(true); }}
      />

      {/* Serviços */}
      <ServicesModal
        isOpen={m.isServicesModalOpen}
        services={services}
        currentUser={currentUser}
        onClose={() => { m.setIsServicesModalOpen(false); m.setServiceSelectCallback(null); }}
        onSelectService={
          m.serviceSelectCallback
            ? (service) => {
                const cb = m.serviceSelectCallback as any;
                if (typeof cb === 'function') {
                  const res = cb(service);
                  if (typeof res === 'function') res(service);
                }
                m.setServiceSelectCallback(null);
                m.setIsServicesModalOpen(false);
              }
            : (m.isModalOpen || m.editingOrder)
              ? (service) => { m.setSelectedServiceForOS(service); m.setIsServicesModalOpen(false); }
              : undefined
        }
        onOpenCreateService={() => m.setRegisterModalType('SERVICE')}
        onOpenEditService={(service) => { m.setViewingService(service); m.setIsServicesModalOpen(false); }}
        onDeleteService={async (serviceId) => {
          saveServices(services.filter((s: any) => s.id !== serviceId));
          try { await deleteDoc(doc(db, 'services', String(serviceId))); } catch (e) { console.warn(e); }
          setStatusMessage('Serviço excluído com sucesso.');
        }}
      />

      {/* Backup */}
      <BackupModal isOpen={m.isBackupModalOpen} onClose={() => m.setIsBackupModalOpen(false)} parts={parts} services={services} equipments={equipments} clients={clients} orders={orders} estimates={estimates} />

      {/* Termos de OS */}
      <WarrantyConfigModal
        isOpen={m.isWarrantyConfigOpen}
        defaultDays={defaultWarrantyConfig.defaultDays}
        defaultTerms={defaultWarrantyConfig.defaultTerms}
        defaultCoverage={defaultWarrantyConfig.defaultCoverage}
        defaultEntryTerms={defaultWarrantyConfig.defaultEntryTerms}
        defaultEstimateTerms={defaultWarrantyConfig.defaultEstimateTerms}
        defaultExitTerms={defaultWarrantyConfig.defaultExitTerms}
        onClose={() => m.setIsWarrantyConfigOpen(false)}
        onSave={(newCfg) => { setDefaultWarrantyConfig(newCfg); localStorage.setItem('vollen_os_config', JSON.stringify(newCfg)); setStatusMessage('Configurações padrão dos Termos de OS salvas com sucesso.'); }}
      />

      {/* Status de OS */}
      <OrderStatusModal isOpen={m.isOrderStatusModalOpen} currentUser={currentUser} onClose={() => m.setIsOrderStatusModalOpen(false)} />

      {/* Técnicos */}
      <TechniciansModal isOpen={m.isTechniciansModalOpen} currentUser={currentUser} onClose={() => m.setIsTechniciansModalOpen(false)} />

      {/* Dados da Empresa */}
      <CompanyModal isOpen={m.isCompanyModalOpen} onClose={() => m.setIsCompanyModalOpen(false)} onSave={(updatedCompanyData) => { setCompanyInfoState(updatedCompanyData); setStatusMessage('Dados da Empresa e Logotipo salvos com sucesso.'); }} />

      {/* Busca de OS */}
      <SearchOSModal
        isOpen={m.isSearchOSModalOpen}
        orders={orders}
        onClose={() => m.setIsSearchOSModalOpen(false)}
        onSelectOrder={(selectedOS) => {
          m.setOrderToEdit(selectedOS); m.setSelectedClientForNewOS(null);
          if (['FINALIZADA', 'CONCLUIDA', 'GARANTIA_FINALIZADA', 'GARANTIA/FINALIZADA'].includes(selectedOS.status)) { m.setCameFromFinishedOrders(true); m.setCameFromOpenOrders(false); } else { m.setCameFromOpenOrders(true); m.setCameFromFinishedOrders(false); }
          m.setIsModalOpen(true);
        }}
      />

      {/* Agenda */}
      <ScheduleCalendar
        isOpen={m.isScheduleModalOpen}
        onClose={() => m.setIsScheduleModalOpen(false)}
        visits={visits}
        orders={orders}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onEditVisit={async (visitDataToUpdate) => { try { await updateVisit(visitDataToUpdate.id, visitDataToUpdate); setStatusMessage('Agendamento atualizado com sucesso!'); await loadData(); } catch (err) { console.error(err); } }}
        onDeleteVisit={async (visitId) => { try { await deleteVisit(visitId); setStatusMessage('Agendamento excluído com sucesso.'); await loadData(); } catch (err) { console.error(err); } }}
        onOpenOS={(order) => {
          m.setIsScheduleModalOpen(false); m.setOrderToEdit(order); m.setSelectedClientForNewOS(null);
          if (['FINALIZADA', 'CONCLUIDA'].includes(order.status)) { m.setCameFromFinishedOrders(true); m.setCameFromOpenOrders(false); } else { m.setCameFromOpenOrders(true); m.setCameFromFinishedOrders(false); }
          m.setIsModalOpen(true);
        }}
      />

      {/* Wallpaper */}
      <WallpaperModal
        isOpen={m.isWallpaperModalOpen}
        onClose={() => m.setIsWallpaperModalOpen(false)}
        currentWallpaper={customWallpaper}
        wallpaperOpacity={wallpaperOpacity}
        wallpaperPosX={wallpaperPosX}
        wallpaperPosY={wallpaperPosY}
        wallpaperScale={wallpaperScale}
        onSaveWallpaper={(newUrl, newOpacity, newPosX, newPosY, newScale) => {
          if (newUrl) {
            localStorage.setItem('system_wallpaper_url', newUrl); localStorage.setItem('system_wallpaper_opacity', String(newOpacity)); localStorage.setItem('system_wallpaper_pos_x', String(newPosX)); localStorage.setItem('system_wallpaper_pos_y', String(newPosY)); localStorage.setItem('system_wallpaper_scale', String(newScale));
            setCustomWallpaper(newUrl); setWallpaperOpacity(newOpacity); setWallpaperPosX(newPosX); setWallpaperPosY(newPosY); setWallpaperScale(newScale);
            setStatusMessage('Papel de parede e enquadramento salvos com sucesso.');
          } else {
            localStorage.removeItem('system_wallpaper_url'); localStorage.removeItem('system_wallpaper_opacity'); localStorage.removeItem('system_wallpaper_pos_x'); localStorage.removeItem('system_wallpaper_pos_y'); localStorage.removeItem('system_wallpaper_scale');
            setCustomWallpaper(null); setWallpaperPosX(50); setWallpaperPosY(50); setWallpaperScale(100);
            setStatusMessage('Plano de fundo padrão restaurado.');
          }
        }}
      />

      {/* Relatório por Período */}
      <PeriodOrdersReportModal
        isOpen={m.isPeriodReportModalOpen}
        orders={allOrdersWithDeleted.length > 0 ? allOrdersWithDeleted : orders}
        companyInfo={companyInfoState}
        onClose={() => m.setIsPeriodReportModalOpen(false)}
        onOpenOrderDetails={(order) => {
          m.setIsPeriodReportModalOpen(false); m.setOrderToEdit(order); m.setSelectedClientForNewOS(null);
          if (['FINALIZADA', 'CONCLUIDA', 'GARANTIA_FINALIZADA', 'GARANTIA/FINALIZADA'].includes(order.status)) { m.setCameFromFinishedOrders(true); m.setCameFromOpenOrders(false); } else { m.setCameFromOpenOrders(true); m.setCameFromFinishedOrders(false); }
          m.setIsModalOpen(true);
        }}
      />

      {/* Relatório por Técnico */}
      <TechnicianOrdersReportModal
        isOpen={m.isTechnicianReportModalOpen}
        orders={allOrdersWithDeleted.length > 0 ? allOrdersWithDeleted : orders}
        companyInfo={companyInfoState}
        onClose={() => m.setIsTechnicianReportModalOpen(false)}
        onOpenOrderDetails={(order) => {
          m.setIsTechnicianReportModalOpen(false); m.setOrderToEdit(order); m.setSelectedClientForNewOS(null);
          if (['FINALIZADA', 'CONCLUIDA', 'GARANTIA_FINALIZADA', 'GARANTIA/FINALIZADA'].includes(order.status)) { m.setCameFromFinishedOrders(true); m.setCameFromOpenOrders(false); } else { m.setCameFromOpenOrders(true); m.setCameFromFinishedOrders(false); }
          m.setIsModalOpen(true);
        }}
      />

      {/* Vincular Celular */}
      <LinkMobileModal isOpen={m.isLinkMobileModalOpen} companyInfo={companyInfoState} onClose={() => m.setIsLinkMobileModalOpen(false)} onOpenSerialModal={() => m.setIsSerialLicenseModalOpen(true)} />

      {/* Padrão de Fábrica */}
      <FactoryResetModal
        isOpen={m.isFactoryResetModalOpen}
        currentUser={currentUser}
        onClose={() => m.setIsFactoryResetModalOpen(false)}
        onResetSuccess={async () => {
          setCustomWallpaper(null); setWallpaperPosX(50); setWallpaperPosY(50); setWallpaperScale(100);
          setCompanyInfoState(defaultCompanyData);
          setOrders([]); setAllOrdersWithDeleted([]); setClients([]);
          setServices([]); setParts([]); setEquipments([]); setBrands([]); setModels([]); setSuppliers([]);
          setVisits([]); setEstimates([]); setMaxEverOrderCode(0);
          try {
            localStorage.removeItem('vollen_client_debts');
            localStorage.removeItem('vollen_sales_history');
            localStorage.removeItem('vollen_saved_carts');
            localStorage.removeItem('vollen_accounts_bills');
            localStorage.removeItem('vollen_accounts_payable');
            localStorage.removeItem('vollen_accounts_receivable');
          } catch {}
          window.dispatchEvent(new Event('storage'));
          await loadData();
          setStatusMessage('Padrão de fábrica restaurado com sucesso. Todos os dados foram limpos.');
        }}
      />

      {/* Configurações Gerais de OS */}
      <OSGeneralConfigModal isOpen={m.isOSGeneralConfigModalOpen} onClose={() => m.setIsOSGeneralConfigModalOpen(false)} onSave={() => setStatusMessage('Configurações e regras de OS salvas com sucesso.')} />

      {/* Impressora */}
      <PrinterConfigModal isOpen={m.isPrinterConfigModalOpen} onClose={() => m.setIsPrinterConfigModalOpen(false)} onSave={() => setStatusMessage('Configurações de impressora salvas com sucesso.')} />

      {/* Atualização do Sistema */}
      <UpdateSystemModal isOpen={m.isUpdateSystemModalOpen} currentUser={currentUser} onClose={() => m.setIsUpdateSystemModalOpen(false)} />

      {/* Caixa */}
      <CashRegisterModal isOpen={m.isCashRegisterModalOpen} currentUser={currentUser} companyInfo={companyInfoState} onClose={() => m.setIsCashRegisterModalOpen(false)} />

      {/* Orçamentos */}
      <EstimatesModal
        isOpen={m.isEstimatesModalOpen}
        estimates={estimates}
        clientsList={clients}
        onClose={() => m.setIsEstimatesModalOpen(false)}
        onOpenCreateEstimate={() => { m.setEstimateToEdit(null); m.setIsCreateEstimateModalOpen(true); }}
        onOpenEditEstimate={(estimate) => { m.setEstimateToEdit(estimate); m.setIsCreateEstimateModalOpen(true); }}
        onDeleteEstimate={handleDeleteEstimate}
        onGenerateOSFromEstimate={handleGenerateOSFromEstimate}
        onPrintEstimate={(estimate) => { m.setEstimateToEdit(estimate); m.setIsCreateEstimateModalOpen(true); }}
        onOpenClientsModal={() => { m.setClientSelectCallback(() => (client: any) => { m.setSelectedClientForNewOS(client); }); m.setIsClientsModalOpen(true); }}
      />

      {/* Criar / Editar Orçamento */}
      <CreateEstimateModal
        isOpen={m.isCreateEstimateModalOpen}
        estimateToEdit={m.estimateToEdit}
        allEstimates={estimates}
        clientsList={clients}
        availableParts={parts}
        availableServices={services}
        availableEquipments={equipments}
        allOrders={orders}
        selectedClient={m.selectedClientForNewOS}
        selectedPart={m.selectedPartForOS}
        selectedService={m.selectedServiceForOS}
        currentUser={currentUser}
        onClose={() => { m.setIsCreateEstimateModalOpen(false); m.setEstimateToEdit(null); m.setSelectedClientForNewOS(null); m.setPendingEstimateForReturn(null); }}
        onSaveEstimate={handleSaveEstimate}
        onDeleteEstimate={handleDeleteEstimate}
        onGenerateOSFromEstimate={handleGenerateOSFromEstimate}
        onOpenSalesModal={(estimateDraft) => {
          if (estimateDraft) { m.setPendingEstimateForReturn(estimateDraft); } else if (m.estimateToEdit) { m.setPendingEstimateForReturn(m.estimateToEdit); }
          m.setIsCreateEstimateModalOpen(false); m.setIsEstimatesModalOpen(false); m.setIsSalesModalOpen(true);
        }}
        onOpenClientsModal={() => { m.setClientSelectCallback((client: any) => { m.setSelectedClientForNewOS(client); }); m.setIsClientsModalOpen(true); }}
        onOpenPartsModal={() => { m.setPartSelectCallback((part: any) => { m.setSelectedPartForOS(part); setTimeout(() => m.setSelectedPartForOS(null), 300); }); m.setIsPartsModalOpen(true); }}
        onOpenServicesModal={() => { m.setServiceSelectCallback((service: any) => { m.setSelectedServiceForOS(service); setTimeout(() => m.setSelectedServiceForOS(null), 300); }); m.setIsServicesModalOpen(true); }}
      />

      {/* Numeração de OS */}
      <OrderSequenceModal isOpen={m.isOrderSequenceModalOpen} onClose={() => m.setIsOrderSequenceModalOpen(false)} onSaved={() => loadData()} />

      {/* Vendas (Balcão) */}
      <SalesModal
        isOpen={m.isSalesModalOpen}
        onClose={() => { m.setIsSalesModalOpen(false); if (m.pendingEstimateForReturn) { m.setEstimateToEdit(m.pendingEstimateForReturn); m.setIsCreateEstimateModalOpen(true); m.setPendingEstimateForReturn(null); } }}
        onSaleCompleted={() => { m.setPendingEstimateForReturn(null); try { const saved = localStorage.getItem('vollen_estimates'); if (saved) setEstimates(JSON.parse(saved)); } catch {} }}
        parts={parts}
        clients={clients}
        currentUser={currentUser}
        companyInfo={companyInfoState}
        onUpdatePartsStock={saveParts}
        onOpenPartsModal={() => {
          m.setPartSelectCallback((part: any) => {
            m.setSelectedPartForSales(part);
            setTimeout(() => m.setSelectedPartForSales(null), 300);
          });
          m.setIsPartsModalOpen(true);
        }}
        selectedPartToAdd={m.selectedPartForSales}
        onOpenCreateClient={() => m.setRegisterModalType('CLIENT')}
        onViewPartDetails={(part) => {
          m.setPartTechnicalSheet(part);
          setPartSheetFromSales(true);
        }}
      />

      {/* Comissões & Taxas de Vendas (Acesso Restrito / Menu Contas) */}
      <SalesCommissionsModal
        isOpen={m.isSalesCommissionsModalOpen}
        onClose={() => m.setIsSalesCommissionsModalOpen(false)}
        currentUser={currentUser}
        companyInfo={companyInfoState}
      />

      {/* Fornecedores */}
      <SuppliersModal
        isOpen={m.isSuppliersModalOpen}
        suppliers={suppliers}
        currentUser={currentUser}
        onClose={() => m.setIsSuppliersModalOpen(false)}
        onSaveSupplier={(supplier) => {
          const exists = suppliers.some((s: any) => s.id === supplier.id);
          saveSuppliers(exists ? suppliers.map((s: any) => s.id === supplier.id ? supplier : s) : [supplier, ...suppliers]);
          setStatusMessage(`Fornecedor "${supplier.name}" salvo com sucesso!`);
        }}
        onDeleteSupplier={async (supplierId) => {
          saveSuppliers(suppliers.filter((s: any) => s.id !== supplierId));
          try { await deleteDoc(doc(db, 'suppliers', String(supplierId))); } catch (e) { console.warn(e); }
          setStatusMessage('Fornecedor excluído com sucesso.');
        }}
      />

      {/* Contas (Pagar/Receber) */}
      <AccountsModal isOpen={m.isAccountsModalOpen} initialType={m.accountsModalType} currentUser={currentUser} suppliers={suppliers} clients={clients} onClose={() => m.setIsAccountsModalOpen(false)} />

      {/* Entrada de Estoque via XML de NF-e (v4.0.0) */}
      <NfeImportModal
        isOpen={m.isNfeImportModalOpen}
        parts={parts}
        suppliers={suppliers}
        onClose={() => m.setIsNfeImportModalOpen(false)}
        onSaveParts={saveParts}
        onSaveSuppliers={saveSuppliers}
      />

      {/* DRE & Lucro Real por OS (v4.0.0) */}
      <FinancialDREModal
        isOpen={m.isFinancialDREModalOpen}
        orders={orders}
        parts={parts}
        onClose={() => m.setIsFinancialDREModalOpen(false)}
      />

      {/* Central de Etiquetas de OS, Peças e Lacre (v4.0.0) */}
      <LabelsGeneratorModal
        isOpen={m.isLabelsGeneratorModalOpen}
        allOrders={orders}
        allParts={parts}
        companyInfo={companyInfoState}
        targetItem={m.labelTargetItem}
        onClose={() => { m.setIsLabelsGeneratorModalOpen(false); m.setLabelTargetItem(null); }}
      />

      {/* Emissão de Notas Fiscais NF-e / NFS-e / NFC-e (v4.0.0) */}
      <FiscalInvoiceModal
        isOpen={m.isFiscalInvoiceModalOpen}
        companyInfo={companyInfoState}
        targetOrder={m.fiscalTargetOrder}
        onClose={() => { m.setIsFiscalInvoiceModalOpen(false); m.setFiscalTargetOrder(null); }}
      />

      {/* Ordens de Compra Automáticas & Reposição (v4.0.0) */}
      <PurchaseOrdersModal
        isOpen={m.isPurchaseOrdersModalOpen}
        parts={parts}
        suppliers={suppliers}
        companyInfo={companyInfoState}
        initialTab={m.purchaseOrdersInitialTab}
        onClose={() => m.setIsPurchaseOrdersModalOpen(false)}
        onSaveParts={saveParts}
      />

      {/* Atualização Rápida de Estoque e Preços */}
      <QuickStockUpdateModal
        isOpen={m.isQuickStockModalOpen}
        parts={parts}
        onClose={() => m.setIsQuickStockModalOpen(false)}
        onSavePart={(updatedPart) => {
          const exists = parts.some((p: any) => p.id === updatedPart.id);
          const newParts = exists
            ? parts.map((p: any) => (p.id === updatedPart.id ? updatedPart : p))
            : [updatedPart, ...parts];
          saveParts(newParts);
          setStatusMessage(`Peça "${updatedPart.name}" atualizada com sucesso!`);
        }}
      />

      {/* Busca Rápida de Peças (F10) -> Abre diretamente a Ficha Técnica da Peça */}
      <QuickPartSearchModal
        isOpen={m.isQuickPartSearchModalOpen}
        parts={parts}
        currentUser={currentUser}
        onClose={() => m.setIsQuickPartSearchModalOpen(false)}
        onViewPart={(part) => {
          m.setPartTechnicalSheet(part);
        }}
      />

      {/* Ficha Técnica Completa da Peça (PartViewModal) */}
      <PartViewModal
        isOpen={m.partTechnicalSheet !== null}
        part={m.partTechnicalSheet}
        currentUser={currentUser}
        onClose={() => {
          m.setPartTechnicalSheet(null);
          if (partSheetFromSales) {
            setPartSheetFromSales(false);
            // SalesModal continua aberto — não reabre o QuickPartSearch
          } else {
            m.setIsQuickPartSearchModalOpen(true);
          }
        }}
        onEdit={(p) => {
          m.setPartTechnicalSheet(null);
          m.setViewingPart(p);
        }}
        onAddToSales={(p) => {
          m.setPartTechnicalSheet(null);
          m.setSelectedPartForSales(p);
          m.setIsSalesModalOpen(true);
          setTimeout(() => m.setSelectedPartForSales(null), 300);
        }}
        onOpenLabelsGenerator={(p) => {
          m.setPartTechnicalSheet(null);
          m.setLabelTargetItem(p);
          m.setIsLabelsGeneratorModalOpen(true);
        }}
      />

      {/* Configuração de Teclas de Atalho (Opções -> Atalhos) */}
      <ShortcutsConfigModal
        isOpen={m.isShortcutsModalOpen}
        onClose={() => m.setIsShortcutsModalOpen(false)}
        onSaveSuccess={() => setStatusMessage('Teclas de atalho salvas e aplicadas com sucesso.')}
      />

      {/* Rede Local */}
      <LocalNetworkModal
        isOpen={m.isLocalNetworkModalOpen}
        onClose={() => m.setIsLocalNetworkModalOpen(false)}
        onOpenSerialLicenseModal={() => { m.setIsLocalNetworkModalOpen(false); m.setIsSerialLicenseModalOpen(true); }}
      />

      {/* Licença / Serial */}
      <SerialLicenseModal
        isOpen={m.isSerialLicenseModalOpen}
        onClose={() => m.setIsSerialLicenseModalOpen(false)}
        onLicenseChanged={() => { loadData(); fetchSystemTrialStatus().then((s) => useUIStore.getState().setTrialStatus(s)).catch(console.error); }}
        currentUser={currentUser}
      />

      {/* Modal de bloqueio por expiração */}
      <TrialExpiredModal
        trialStatus={trialStatus}
        onActivated={() => { fetchSystemTrialStatus().then((s) => useUIStore.getState().setTrialStatus(s)).catch(console.error); loadData(); }}
        onOpenUpdateModal={() => m.setIsUpdateSystemModalOpen(true)}
      />

      {/* Barra de Status inferior */}

      <StatusBar
        statusMessage={statusMessage}
        isCapsLockActive={isCapsLockActive}
        onToggleCapsLock={() => setIsCapsLockActive(!isCapsLockActive)}
        onOpenBackupModal={() => m.setIsBackupModalOpen(true)}
        onOpenSerialLicenseModal={() => m.setIsSerialLicenseModalOpen(true)}
        onOpenLocalNetworkModal={() => m.setIsLocalNetworkModalOpen(true)}
        currentUser={currentUser}
      />
    </div>
  );
}
