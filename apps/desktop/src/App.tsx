import React, { useState, useEffect } from 'react';
import { TopMenuBar } from './components/TopMenuBar';
import { Dashboard } from './components/Dashboard';
import { LoginScreen } from './components/LoginScreen';
import { CreateOrderModal } from './components/CreateOrderModal';
import { RegisterModal } from './components/RegisterModal';
import { MenuOSModal } from './components/MenuOSModal';
import { OpenOrdersModal } from './components/OpenOrdersModal';
import { FinishedOrdersModal } from './components/FinishedOrdersModal';
import { EditOrderModal } from './components/EditOrderModal';
import { ClientViewModal } from './components/ClientViewModal';
import { ClientsModal } from './components/ClientsModal';
import { ClientOrdersHistoryModal } from './components/ClientOrdersHistoryModal';
import { UsersModal } from './components/UsersModal';
import { BackupModal } from './components/BackupModal';
import { PartsModal } from './components/PartsModal';
import { StatusBar } from './components/StatusBar';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import {
  fetchDashboardStats,
  fetchVisits,
  fetchOrders,
  fetchClients,
  createClient,
  updateOrder,
  createOrder,
  deleteClient,
  updateVisit,
  deleteVisit,
  subscribeOrders,
  subscribeClients,
} from './services/api';

import { EquipmentsModal } from './components/EquipmentsModal';
import { ServicesModal } from './components/ServicesModal';
import { WarrantyConfigModal } from './components/WarrantyConfigModal';
import { OrderStatusModal } from './components/OrderStatusModal';
import { CompanyModal, CompanyData, defaultCompanyData } from './components/CompanyModal';
import { LinkMobileModal } from './components/LinkMobileModal';
import { SearchOSModal } from './components/SearchOSModal';
import { WallpaperModal } from './components/WallpaperModal';
import { PeriodOrdersReportModal } from './components/PeriodOrdersReportModal';
import { TechnicianOrdersReportModal } from './components/TechnicianOrdersReportModal';
import { TechniciansModal } from './components/TechniciansModal';
import { FactoryResetModal } from './components/FactoryResetModal';
import { OSGeneralConfigModal } from './components/OSGeneralConfigModal';
import { PrinterConfigModal } from './components/PrinterConfigModal';
import { db } from './services/firebase';
import { collection, onSnapshot, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { EstimatesModal } from './components/EstimatesModal';
import { CreateEstimateModal, Estimate } from './components/CreateEstimateModal';
import { OrderSequenceModal } from './components/OrderSequenceModal';
import { UpdateSystemModal } from './components/UpdateSystemModal';
import { CashRegisterModal } from './components/CashRegisterModal';
import { SalesModal } from './components/SalesModal';
import { SerialLicenseModal } from './components/SerialLicenseModal';

import { useDialog } from './components/DialogContext';

export default function App() {
  const { confirm: dlgConfirm } = useDialog();
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    try {
      const saved = sessionStorage.getItem('vollen_current_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule'>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);

  // ESTADO DO CAPS LOCK (Ativo por padrão: transforma toda digitação em maiúscula)
  const [isCapsLockActive, setIsCapsLockActive] = useState<boolean>(true);

  // Garante que o aplicativo inicie maximizado no desktop
  useEffect(() => {
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

  // ESTADO DA BARRA DE STATUS DO RODAPÉ
  const [statusMessage, setStatusMessage] = useState<string>(() => {
    if (sessionStorage.getItem('backup_restored_success_msg')) {
      sessionStorage.removeItem('backup_restored_success_msg');
      return 'Backup restaurado com sucesso! Todos os dados e cadastros foram recarregados no sistema.';
    }
    return 'Vollen - Gestão de OS pronto e operando normalmente.';
  });

  // ESTADO DA LISTA DE PEÇAS COM ESTOQUE PERSISTIDO
  const [allParts, setAllParts] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_parts_stock');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {}
    return [];
  });

  const saveParts = async (newParts: any[]) => {
    setAllParts(newParts);
    try {
      localStorage.setItem('vollen_parts_stock', JSON.stringify(newParts));
      if (db) {
        for (const p of newParts) {
          await setDoc(doc(db, 'parts', String(p.id)), p, { merge: true });
        }
      }
    } catch (err) {
      console.warn('Erro ao salvar peças no Firestore:', err);
    }
  };

  // ESTADO DA LISTA DE SERVIÇOS CADASTRADOS
  const [allServices, setAllServices] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_services');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const saveServices = async (newServices: any[]) => {
    setAllServices(newServices);
    try {
      localStorage.setItem('vollen_services', JSON.stringify(newServices));
      if (db) {
        for (const s of newServices) {
          await setDoc(doc(db, 'services', String(s.id)), s, { merge: true });
        }
      }
    } catch (err) {
      console.warn('Erro ao salvar serviços no Firestore:', err);
    }
  };

  // ESTADO DA LISTA DE EQUIPAMENTOS CADASTRADOS
  const [allEquipments, setAllEquipments] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_equipments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {}
    return [];
  });

  const saveEquipments = async (newEquipments: any[]) => {
    setAllEquipments(newEquipments);
    try {
      localStorage.setItem('vollen_equipments', JSON.stringify(newEquipments));
      if (db) {
        for (const eq of newEquipments) {
          await setDoc(doc(db, 'equipments', String(eq.id)), eq, { merge: true });
        }
      }
    } catch (err) {
      console.warn('Erro ao salvar equipamentos no Firestore:', err);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false); // Nível 1: Criar Nova OS
  const [registerModalType, setRegisterModalType] = useState<
    'CLIENT' | 'PART' | 'TECHNICIAN' | 'EQUIPMENT' | 'SERVICE' | null
  >(null); // Nível 5: Cadastros
  const [isMenuOSOpen, setIsMenuOSOpen] = useState(false); // Nível 1: Menu OS
  const [isOpenOrdersModalOpen, setIsOpenOrdersModalOpen] = useState(false); // Nivel 2: Tabela OS Abertas
  const [isFinishedOrdersModalOpen, setIsFinishedOrdersModalOpen] = useState(false); // Nivel 2b: Tabela OS Finalizadas
  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false); // Nível 4: Central de Clientes
  const [clientSearchTerm, setClientSearchTerm] = useState(''); // Termo de busca rápida para Central de Clientes
  const [clientSelectCallback, setClientSelectCallback] = useState<((client: any) => void) | null>(null); // Callback genérico de seleção de cliente
  const [isPartsModalOpen, setIsPartsModalOpen] = useState(false); // Central de Peças
  const [partSelectCallback, setPartSelectCallback] = useState<((part: any) => void) | null>(null);
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false); // Central de Serviços
  const [serviceSelectCallback, setServiceSelectCallback] = useState<((service: any) => void) | null>(null);
  const [isEquipmentsModalOpen, setIsEquipmentsModalOpen] = useState(false); // Central de Equipamentos
  const [isTechniciansModalOpen, setIsTechniciansModalOpen] = useState(false); // Central de Técnicos
  const [isOrderStatusModalOpen, setIsOrderStatusModalOpen] = useState(false); // Central de Status de OS
  const [selectedPartForOS, setSelectedPartForOS] = useState<any | null>(null);
  const [selectedServiceForOS, setSelectedServiceForOS] = useState<any | null>(null);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null); // Nível 3: Edição da OS
  const [viewingClient, setViewingClient] = useState<any | null>(null); // Nível 4: Ficha do Cliente
  const [selectedClientForNewOS, setSelectedClientForNewOS] = useState<any | null>(null); // Cliente Selecionado para Nova OS
  const [viewingPart, setViewingPart] = useState<any | null>(null); // Ficha da Peça
  const [viewingEquipment, setViewingEquipment] = useState<any | null>(null); // Ficha do Equipamento
  const [viewingService, setViewingService] = useState<any | null>(null); // Ficha do Serviço
  const [viewingClientEditMode, setViewingClientEditMode] = useState<boolean>(false);
  const [cameFromOSForClientEdit, setCameFromOSForClientEdit] = useState<boolean>(false);
  const [isClientOrdersHistoryOpen, setIsClientOrdersHistoryOpen] = useState<boolean>(false);
  const [isWarrantyConfigOpen, setIsWarrantyConfigOpen] = useState<boolean>(false);
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState<boolean>(false);
  const [isPeriodReportModalOpen, setIsPeriodReportModalOpen] = useState<boolean>(false);
  const [isTechnicianReportModalOpen, setIsTechnicianReportModalOpen] = useState<boolean>(false);
  const [isFactoryResetModalOpen, setIsFactoryResetModalOpen] = useState<boolean>(false);
  const [isOSGeneralConfigModalOpen, setIsOSGeneralConfigModalOpen] = useState<boolean>(false);
  const [isPrinterConfigModalOpen, setIsPrinterConfigModalOpen] = useState<boolean>(false);
  const [isUpdateSystemModalOpen, setIsUpdateSystemModalOpen] = useState<boolean>(false);
  const [isCashRegisterModalOpen, setIsCashRegisterModalOpen] = useState<boolean>(false);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState<boolean>(false);
  const [isSerialLicenseModalOpen, setIsSerialLicenseModalOpen] = useState<boolean>(false);
  const [selectedPartForSales, setSelectedPartForSales] = useState<any | null>(null);

  // Estados de Orçamentos
  const [estimates, setEstimates] = useState<Estimate[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_estimates');
      if (saved) return JSON.parse(saved);
    } catch { }
    return [];
  });
  const [isEstimatesModalOpen, setIsEstimatesModalOpen] = useState<boolean>(false);
  const [isCreateEstimateModalOpen, setIsCreateEstimateModalOpen] = useState<boolean>(false);
  const [estimateToEdit, setEstimateToEdit] = useState<Estimate | null>(null);
  const [pendingEstimateForReturn, setPendingEstimateForReturn] = useState<Estimate | null>(null);
  const [estimateToConvertToOS, setEstimateToConvertToOS] = useState<string | null>(null);

  const [allOrdersWithDeleted, setAllOrdersWithDeleted] = useState<any[]>([]);

  // Papel de Parede Personalizado do Sistema
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(() => {
    return localStorage.getItem('system_wallpaper_url') || null;
  });
  const [wallpaperOpacity, setWallpaperOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('system_wallpaper_opacity');
    return saved ? Number(saved) : 25;
  });
  const [wallpaperPosX, setWallpaperPosX] = useState<number>(() => {
    const saved = localStorage.getItem('system_wallpaper_pos_x');
    return saved ? Number(saved) : 50;
  });
  const [wallpaperPosY, setWallpaperPosY] = useState<number>(() => {
    const saved = localStorage.getItem('system_wallpaper_pos_y');
    return saved ? Number(saved) : 50;
  });
  const [wallpaperScale, setWallpaperScale] = useState<number>(() => {
    const saved = localStorage.getItem('system_wallpaper_scale');
    return saved ? Number(saved) : 100;
  });

  const [companyInfoState, setCompanyInfoState] = useState<CompanyData>(() => {
    let baseData = defaultCompanyData;
    try {
      const saved = localStorage.getItem('vollen_company_data');
      if (saved) baseData = { ...defaultCompanyData, ...JSON.parse(saved) };
    } catch (err) { }

    // Aplica o nome protegido da licença ativa, se houver
    try {
      const savedTenantInfo = localStorage.getItem('system_tenant_info');
      if (savedTenantInfo) {
        const parsed = JSON.parse(savedTenantInfo);
        if (parsed.tradeName || parsed.companyName) {
          baseData.tradingName = parsed.tradeName || parsed.companyName;
        }
        if (parsed.legalName || parsed.companyName) {
          baseData.name = parsed.legalName || parsed.companyName;
        }
      } else {
        // Modo Local sem serial: fixa no nome padrão do app
        baseData.tradingName = 'Vollen Assistência Técnica';
        baseData.name = 'Vollen Assistência Técnica';
      }
    } catch {}

    return baseData;
  });
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState<boolean>(false);
  const [isLinkMobileModalOpen, setIsLinkMobileModalOpen] = useState<boolean>(false);
  const [isSearchOSModalOpen, setIsSearchOSModalOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [isOrderSequenceModalOpen, setIsOrderSequenceModalOpen] = useState<boolean>(false);

  // ESTADO GLOBAL DA CONFIGURAÇÃO PADRÃO DE TERMOS DOS COMPROVANTES DA OS
  const [defaultWarrantyConfig, setDefaultWarrantyConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('vollen_os_config');
      if (saved) return JSON.parse(saved);
    } catch (err) { }
    return {
      defaultDays: '90',
      defaultTerms: 'A garantia cobre exclusivamente os serviços executados e as peças substituídas identificadas neste documento pelo período estabelecido. Não cobre danos causados por mau uso, quedas, oscilações elétricas, umidade ou intervenção de terceiros.',
      defaultCoverage: 'PECAS_E_MAO_DE_OBRA',
      defaultEntryTerms: 'O cliente autoriza a realização da avaliação e diagnóstico técnico no equipamento descrito neste comprovante. Equipamentos não retirados em até 90 dias após notificação de conclusão/orçamento estarão sujeitos a taxas de guarda/armazenamento ou descarte conforme a legislação vigente.',
      defaultEstimateTerms: 'O orçamento possui validade de 10 dias úteis a contar da data de emissão. Os serviços e peças discriminados estão sujeitos à aprovação prévia do cliente.',
      defaultExitTerms: 'A garantia cobre exclusivamente os serviços executados e as peças substituídas identificadas neste documento pelo período estabelecido. Não cobre danos causados por mau uso, quedas, oscilações elétricas, umidade ou intervenção de terceiros.',
    };
  });

  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [maxEverOrderCode, setMaxEverOrderCode] = useState<number>(0);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [orderToEdit, setOrderToEdit] = useState<any | null>(null);

  const [cameFromOpenOrders, setCameFromOpenOrders] = useState<boolean>(false);
  const [cameFromFinishedOrders, setCameFromFinishedOrders] = useState<boolean>(false);
  const [openOrdersOpenedFromMenuOS, setOpenOrdersOpenedFromMenuOS] = useState<boolean>(false);
  const [finishedOrdersOpenedFromMenuOS, setFinishedOrdersOpenedFromMenuOS] = useState<boolean>(false);
  const [createOSOpenedFromMenuOS, setCreateOSOpenedFromMenuOS] = useState<boolean>(false);

  // HANDLER: Criar nova OS de Retorno em Garantia a partir de uma OS finalizada
  const handleCreateWarrantyReturn = async (originalOrder: any) => {
    try {
      // Calcula próximo código de OS
      let maxNum = maxEverOrderCode;
      try {
        const parsed = JSON.parse(localStorage.getItem('vollen_os_config') || '{}');
        if (parsed.initialOrderNumber) {
          const initN = parseInt(String(parsed.initialOrderNumber).replace(/\D/g, ''), 10);
          if (!isNaN(initN) && initN > 0 && initN - 1 > maxNum) maxNum = initN - 1;
        }
      } catch {}
      (allOrders || []).forEach((o: any) => {
        const n = parseInt((o.code || '').replace(/\D/g, ''), 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      });
      const newCode = `OS-${String(maxNum + 1).padStart(4, '0')}`;
      const newId = String(Date.now());

      // Pega a data de saída da OS original como início da garantia
      const originalExitDate = originalOrder.exitDate || '';
      const originalWarrantyTerms = originalOrder.warrantyTermsData || {};

      const newOrderData = {
        id: newId,
        code: newCode,
        client: originalOrder.client,
        clientId: originalOrder.clientId || originalOrder.client?.id || '',
        equipment: originalOrder.equipment,
        status: 'RETORNO_GARANTIA',
        warrantyType: originalOrder.warrantyType || 'GARANTIA_LOJA',
        warrantyTermsData: {
          ...originalWarrantyTerms,
          // Garantia começa a contar da data de saída da OS original
          startDate: originalExitDate || originalWarrantyTerms.startDate || new Date().toISOString().split('T')[0],
        },
        originalOsCode: originalOrder.code,
        originalOsId: originalOrder.id,
        originalExecutedService: originalOrder.originalExecutedService || originalOrder.executedService || '',
        problemDescription: '',
        technicalReport: '',
        executedService: '',
        returnExecutedService: '',
        entryDate: new Date().toISOString().split('T')[0],
        exitDate: '',
        partsUsed: [],
        parts: [],
        partsList: [],
        servicesExecuted: [],
        services: [],
        servicesList: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Cria a nova OS
      const createdOrder = await createOrder(newOrderData);

      // Registra na OS original que ela gerou um retorno em garantia
      await updateOrder(originalOrder.id, {
        warrantyReturnOsCode: newCode,
        warrantyReturnOsId: newId,
      });

      // Atualiza estado local imediatamente
      setAllOrders((prev: any[]) => [
        createdOrder,
        ...prev.map((o: any) =>
          o.id === originalOrder.id
            ? { ...o, warrantyReturnOsCode: newCode, warrantyReturnOsId: newId }
            : o
        ),
      ]);
      setMaxEverOrderCode(maxNum + 1);

      // Fecha a lista de OS finalizadas e abre a nova OS no modal de criação
      setIsFinishedOrdersModalOpen(false);
      setOrderToEdit(createdOrder);
      setCameFromFinishedOrders(false);
      setIsModalOpen(true);
      setStatusMessage(`OS de Retorno em Garantia ${newCode} criada com sucesso!`);
    } catch (err) {
      console.error('Erro ao criar OS de retorno em garantia:', err);
      setStatusMessage('Erro ao criar OS de retorno em garantia.');
    }
  };

  const loadData = async () => {
    try {
      const statsData = await fetchDashboardStats().catch(() => null);
      if (statsData) setStats(statsData);

      const visitsData = await fetchVisits().catch(() => []);
      if (Array.isArray(visitsData)) setVisits(visitsData);

      const ordersData = await fetchOrders().catch(() => []);
      if (Array.isArray(ordersData)) {
        setAllOrders(ordersData);
        const fetchedMax = ordersData.reduce((max, o) => {
          const num = parseInt((o.code || '').replace(/\D/g, ''), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        setMaxEverOrderCode(fetchedMax);
      }

      const clientsData = await fetchClients().catch(() => []);
      if (Array.isArray(clientsData)) {
        setAllClients(clientsData);
      }

      // Sincroniza cadastros locais de peças, serviços e equipamentos
      try {
        const localParts = JSON.parse(localStorage.getItem('vollen_parts_stock') || '[]');
        const localServices = JSON.parse(localStorage.getItem('vollen_services') || '[]');
        const localEquipments = JSON.parse(localStorage.getItem('vollen_equipments') || '[]');

        if (Array.isArray(localParts) && localParts.length > 0) {
          setAllParts(localParts);
        } else {
          setAllParts((prev) => {
            if (prev.length > 0) {
              try { localStorage.setItem('vollen_parts_stock', JSON.stringify(prev)); } catch (e) {}
            }
            return prev;
          });
        }

        if (Array.isArray(localServices) && localServices.length > 0) {
          setAllServices(localServices);
        } else {
          setAllServices((prev) => {
            if (prev.length > 0) {
              try { localStorage.setItem('vollen_services', JSON.stringify(prev)); } catch (e) {}
            }
            return prev;
          });
        }

        if (Array.isArray(localEquipments) && localEquipments.length > 0) {
          setAllEquipments(localEquipments);
        } else {
          setAllEquipments((prev) => {
            if (prev.length > 0) {
              try { localStorage.setItem('vollen_equipments', JSON.stringify(prev)); } catch (e) {}
            }
            return prev;
          });
        }

        // Busca coleções do Firestore de forma assíncrona sem travar a interface
        Promise.all([
          getDocs(collection(db, 'parts')).catch(() => null),
          getDocs(collection(db, 'services')).catch(() => null),
          getDocs(collection(db, 'equipments')).catch(() => null),
          getDocs(collection(db, 'estimates')).catch(() => null),
        ]).then(([partsSnap, srvSnap, eqSnap, estSnap]) => {
          if (srvSnap && !srvSnap.empty) {
            const sList = srvSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setAllServices(sList);
            localStorage.setItem('vollen_services', JSON.stringify(sList));
          }

          if (partsSnap && !partsSnap.empty) {
            const pList = partsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setAllParts(pList);
            localStorage.setItem('vollen_parts_stock', JSON.stringify(pList));
          }

          if (eqSnap && !eqSnap.empty) {
            const eList = eqSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setAllEquipments(eList);
            localStorage.setItem('vollen_equipments', JSON.stringify(eList));
          }

          if (estSnap && !estSnap.empty) {
            const estList = estSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Estimate));
            setEstimates(estList);
            localStorage.setItem('vollen_estimates', JSON.stringify(estList));
          }
        }).catch(() => {});
      } catch (err) {
        console.warn('Erro ao carregar cadastros:', err);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  useEffect(() => {
    loadData();

    // Sincronização em tempo real das coleções do Firestore
    const unsubOrders = subscribeOrders((realtimeOrders) => {
      setAllOrders(realtimeOrders);
      const fetchedMax = realtimeOrders.reduce((max, o) => {
        const num = parseInt((o.code || '').replace(/\D/g, ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      setMaxEverOrderCode(fetchedMax);
    });

    const unsubClients = subscribeClients((realtimeClients) => {
      setAllClients(realtimeClients);
    });

    let unsubParts = () => {};
    let unsubServices = () => {};
    let unsubEquipments = () => {};
    let unsubEstimates = () => {};
    let unsubCompany = () => {};
    let unsubStatuses = () => {};
    let unsubConfig = () => {};

    try {
      unsubParts = onSnapshot(collection(db, 'parts'), (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllParts(list);
        try { localStorage.setItem('vollen_parts_stock', JSON.stringify(list)); } catch (e) {}
      });

      unsubServices = onSnapshot(collection(db, 'services'), (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllServices(list);
        try { localStorage.setItem('vollen_services', JSON.stringify(list)); } catch (e) {}
      });

      unsubEquipments = onSnapshot(collection(db, 'equipments'), (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllEquipments(list);
        try { localStorage.setItem('vollen_equipments', JSON.stringify(list)); } catch (e) {}
      });

      unsubEstimates = onSnapshot(collection(db, 'estimates'), (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Estimate));
          setEstimates(list);
          try { localStorage.setItem('vollen_estimates', JSON.stringify(list)); } catch (e) {}
        }
      });

      unsubCompany = onSnapshot(doc(db, 'system_config', 'company_data'), (snap) => {
        if (snap.exists()) {
          const comp = snap.data() as CompanyData;
          setCompanyInfoState(comp);
          try {
            localStorage.setItem('vollen_company_data', JSON.stringify(comp));
          } catch (e) {}
        }
      });
      unsubStatuses = onSnapshot(collection(db, 'os_statuses'), (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          try {
            localStorage.setItem('custom_os_statuses_v3', JSON.stringify(list));
          } catch (e) {}
        }
      });
      unsubConfig = onSnapshot(doc(db, 'system_config', 'os_preferences'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          try {
            localStorage.setItem('vollen_os_preferences', JSON.stringify(data));
            localStorage.setItem('vollen_os_general_config', JSON.stringify(data));
          } catch (e) {}
        }
      });
      onSnapshot(doc(db, 'system_config', 'warranty_config'), (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setDefaultWarrantyConfig((prev: any) => ({ ...prev, ...data }));
          try {
            localStorage.setItem('vollen_os_config', JSON.stringify(data));
          } catch (e) {}
        }
      });

      // Registra/sincroniza a ApiKey da empresa para permitir conexão imediata pelo APK
      // Prioridade: Firestore > localStorage > gera nova chave
      import('./services/licenseService').then(async ({ getMasterFirestore, getSavedTenantFirebaseConfig, MASTER_CATALOG_FIREBASE_CONFIG }) => {
        try {
          const { getDoc, setDoc, doc: fsDoc } = await import('firebase/firestore');

          // 1. Tenta ler a chave salva no Firestore da empresa (fonte autoritativa)
          let finalApiKey = '';
          try {
            const firestoreSnap = await getDoc(fsDoc(db, 'system_config', 'company_apikey'));
            if (firestoreSnap.exists() && firestoreSnap.data()?.apiKey) {
              finalApiKey = firestoreSnap.data().apiKey;
            }
          } catch {}

          // 2. Se não encontrou no Firestore, usa o localStorage
          if (!finalApiKey) {
            finalApiKey = localStorage.getItem('vollen_company_apikey') || '';
          }

          // 3. Só gera uma nova chave se absolutamente não houver nenhuma registrada
          if (!finalApiKey) {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            const block = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
            finalApiKey = `${block(5)}-${block(5)}-${block(5)}`;
          }

          // Persiste localmente e no Firestore
          try { localStorage.setItem('vollen_company_apikey', finalApiKey); } catch {}

          // 4. Busca nome da empresa direto do Firestore (companyInfoState pode ainda não ter carregado)
          let resolvedCompanyName = '';
          try {
            const compSnap = await getDoc(fsDoc(db, 'system_config', 'company_data'));
            if (compSnap.exists()) {
              const d = compSnap.data() as any;
              resolvedCompanyName = d.tradingName || d.name || d.companyName || '';
            }
          } catch {}
          // Fallback para o localStorage se o Firestore não retornar
          if (!resolvedCompanyName) {
            try {
              const localComp = JSON.parse(localStorage.getItem('vollen_company_data') || '{}');
              resolvedCompanyName = localComp.tradingName || localComp.name || '';
            } catch {}
          }

          const tenantCfg = getSavedTenantFirebaseConfig() || MASTER_CATALOG_FIREBASE_CONFIG;
          const cleanApiKey = finalApiKey.replace(/[\s-]/g, '').toUpperCase();
          const masterDb = getMasterFirestore();

          // Grava/atualiza no Catálogo Central (para o APK resolver o banco)
          setDoc(fsDoc(masterDb, 'mobile_apikeys', cleanApiKey), {
            apiKeyFormatted: finalApiKey,
            companyName: resolvedCompanyName || 'Empresa Vinculada',
            firebaseConfig: tenantCfg,
            updatedAt: new Date().toISOString(),
          }, { merge: true }).catch(() => {});

          // Grava/atualiza no Firestore da empresa (para outros PCs e o APK verificarem)
          setDoc(fsDoc(db, 'system_config', 'company_apikey'), {
            apiKey: finalApiKey,
            updatedAt: new Date().toISOString(),
          }, { merge: true }).catch(() => {});
        } catch (err) {
          console.warn('Erro ao sincronizar ApiKey:', err);
        }
      });
    } catch (err) {
      console.warn('Erro ao conectar listeners de catálogo:', err);
    }

    return () => {
      unsubOrders();
      unsubClients();
      unsubParts();
      unsubServices();
      unsubEquipments();
      unsubCompany();
      unsubStatuses();
      unsubConfig();
      unsubEstimates();
    };
  }, [selectedDate]);

  // Conversão global e ativa de CAPS LOCK para todos os inputs e formulários do sistema
  useEffect(() => {
    if (isCapsLockActive) {
      document.body.classList.add('app-caps-active');
    } else {
      document.body.classList.remove('app-caps-active');
    }

    // Intercepta digitação antes de inserir o caractere no input
    const handleBeforeInput = (e: any) => {
      if (!isCapsLockActive) return;
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!target || !['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      const type = (target.getAttribute('type') || '').toLowerCase();
      if (['password', 'email', 'file', 'date', 'time', 'number', 'color', 'range', 'checkbox', 'radio'].includes(type)) return;

      if (e.data && typeof e.data === 'string' && e.data !== e.data.toUpperCase()) {
        e.preventDefault();
        const upperChar = e.data.toUpperCase();
        
        // Insere o caractere maiúsculo disparando eventos React
        const start = target.selectionStart ?? target.value.length;
        const end = target.selectionEnd ?? target.value.length;
        const prevVal = target.value;
        const newVal = prevVal.substring(0, start) + upperChar + prevVal.substring(end);

        // Atualiza via Prototype setter para o React registrar o onChange
        const prototype = Object.getPrototypeOf(target);
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        if (descriptor && descriptor.set) {
          descriptor.set.call(target, newVal);
        } else {
          target.value = newVal;
        }

        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.setSelectionRange(start + upperChar.length, start + upperChar.length);
      }
    };

    const handleInputUppercase = (e: Event) => {
      if (!isCapsLockActive) return;
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!target || !['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      const type = (target.getAttribute('type') || '').toLowerCase();
      if (['password', 'email', 'file', 'date', 'time', 'number', 'color', 'range', 'checkbox', 'radio'].includes(type)) return;

      const upper = target.value.toUpperCase();
      if (target.value !== upper) {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const prototype = Object.getPrototypeOf(target);
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        if (descriptor && descriptor.set) {
          descriptor.set.call(target, upper);
        } else {
          target.value = upper;
        }
        target.dispatchEvent(new Event('input', { bubbles: true }));
        if (start !== null && end !== null) {
          target.setSelectionRange(start, end);
        }
      }
    };

    document.addEventListener('beforeinput', handleBeforeInput, true);
    document.addEventListener('input', handleInputUppercase, true);

    return () => {
      document.removeEventListener('beforeinput', handleBeforeInput, true);
      document.removeEventListener('input', handleInputUppercase, true);
    };
  }, [isCapsLockActive]);

  // Intercepta a tentativa de fechar o aplicativo no botão "X" da janela (Tauri)
  useEffect(() => {
    let unlistenClose: (() => void) | undefined;
    let isExiting = false;

    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      const appWindow = getCurrentWindow();
      if (!appWindow) return;

      appWindow.onCloseRequested(async (event) => {
        if (isExiting) return;

        // No Tauri 2, event.preventDefault() precisa ser chamado sincronicamente antes do await
        event.preventDefault();

        const ok = await dlgConfirm({
          title: 'Fechar Sistema OS',
          message: 'Tem certeza de que deseja fechar todo o sistema?',
          variant: 'warning',
          confirmText: 'Sim, Fechar',
          cancelText: 'Cancelar',
        });

        if (ok) {
          isExiting = true;
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('close_app');
          } catch {
            try {
              const { exit } = await import('@tauri-apps/plugin-process');
              await exit(0);
            } catch {
              try {
                await appWindow.destroy();
              } catch {
                await appWindow.close();
              }
            }
          }
        }
      }).then((unlisten) => {
        unlistenClose = unlisten;
      }).catch(() => {});
    }).catch(() => {});

    return () => {
      if (unlistenClose) unlistenClose();
    };
  }, [dlgConfirm]);

  // Navegação Global com Tecla Enter entre Campos de Formulário (e Salvar no Último Campo)
  useEffect(() => {
    const handleEnterNavigation = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;

      const activeEl = document.activeElement as HTMLElement | null;
      if (!activeEl) return;

      const tagName = activeEl.tagName;
      // Permitir comportamento padrão para botões e textareas (para quebra de linha)
      if (tagName === 'BUTTON' || (tagName === 'TEXTAREA' && !e.ctrlKey)) {
        return;
      }

      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tagName)) {
        const form = activeEl.closest('form');
        const container = form || activeEl.closest('.fixed') || document.body;

        // Selecionar todos os elementos focáveis do container visível
        const focusables = Array.from(
          container.querySelectorAll<HTMLElement>(
            'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled])'
          )
        ).filter((el) => {
          return el.offsetWidth > 0 && el.offsetHeight > 0 && window.getComputedStyle(el).visibility !== 'hidden';
        });

        const currentIndex = focusables.indexOf(activeEl);

        if (currentIndex !== -1) {
          e.preventDefault();
          // Procurar o próximo campo de entrada (input/select/textarea)
          const nextFocusable = focusables.slice(currentIndex + 1).find((el) =>
            ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(el.tagName)
          );

          if (nextFocusable && nextFocusable.tagName !== 'BUTTON') {
            nextFocusable.focus();
          } else {
            // Se não houver mais campos de texto, buscar o botão de submit/salvar do formulário ou container
            const submitBtn = focusables.find(
              (el) =>
                el.tagName === 'BUTTON' &&
                (el.getAttribute('type') === 'submit' ||
                  el.textContent?.toLowerCase().includes('salvar') ||
                  el.textContent?.toLowerCase().includes('confirmar') ||
                  el.textContent?.toLowerCase().includes('cadastrar') ||
                  el.textContent?.toLowerCase().includes('entrar'))
            ) || form?.querySelector<HTMLButtonElement>('button[type="submit"]');

            if (submitBtn) {
              submitBtn.click();
            } else if (form) {
              form.requestSubmit();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleEnterNavigation);
    return () => window.removeEventListener('keydown', handleEnterNavigation);
  }, []);

  // Verifica se existe QUALQUER modal ou tela secundária aberta sobre a tela inicial
  const isAnyModalOpen = Boolean(
    isModalOpen ||
    registerModalType ||
    isMenuOSOpen ||
    isOpenOrdersModalOpen ||
    isFinishedOrdersModalOpen ||
    isClientsModalOpen ||
    isPartsModalOpen ||
    isServicesModalOpen ||
    isEquipmentsModalOpen ||
    isTechniciansModalOpen ||
    isOrderStatusModalOpen ||
    isUsersModalOpen ||
    isBackupModalOpen ||
    editingOrder ||
    viewingClient ||
    viewingPart ||
    viewingEquipment ||
    viewingService ||
    isClientOrdersHistoryOpen ||
    isWarrantyConfigOpen ||
    isWallpaperModalOpen ||
    isPeriodReportModalOpen ||
    isTechnicianReportModalOpen ||
    isFactoryResetModalOpen ||
    isOSGeneralConfigModalOpen ||
    isOrderSequenceModalOpen ||
    isPrinterConfigModalOpen ||
    isEstimatesModalOpen ||
    isCreateEstimateModalOpen ||
    isCompanyModalOpen ||
    isLinkMobileModalOpen ||
    isSearchOSModalOpen ||
    isScheduleModalOpen ||
    isSalesModalOpen
  );

  // O CAPS LOCK é uma funcionalidade VIRTUAL interna do sistema
  // Converte toda digitação dentro do programa em MAIÚSCULAS sem ligar o CapsLock físico do Windows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Se o usuário clicar na tecla CapsLock enquanto estiver no programa, alterna o botão virtual
      if (e.key === 'CapsLock' || e.code === 'CapsLock') {
        setIsCapsLockActive((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Bloqueio Global do F5 / Ctrl+R do Navegador/Webview e Atalhos de Teclado (F2, F5, F6, F7, F8)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Bloqueia sempre a recarga da página por F5 ou Ctrl+R para não recarregar/deslogar
      if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r')) {
        e.preventDefault();
      }

      // Se houver qualquer modal aberto na tela ou se estiver digitando em inputs, bloqueia novos atalhos
      if (isAnyModalOpen) {
        return;
      }

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement?.tagName || ''))) {
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        setOrderToEdit(null);
        setSelectedClientForNewOS(null);
        setCameFromOpenOrders(false);
        setCameFromFinishedOrders(false);
        setCreateOSOpenedFromMenuOS(false);
        setIsModalOpen(true);
      } else if (e.key === 'F5') {
        e.preventDefault();
        setOpenOrdersOpenedFromMenuOS(false);
        setIsOpenOrdersModalOpen(true);
      } else if (e.key === 'F6') {
        e.preventDefault();
        setFinishedOrdersOpenedFromMenuOS(false);
        setIsFinishedOrdersModalOpen(true);
      } else if (e.key === 'F7') {
        e.preventDefault();
        setIsSearchOSModalOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        setIsPartsModalOpen(true);
      } else if (e.key === 'F9') {
        e.preventDefault();
        setIsSalesModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [isAnyModalOpen]);

  // Handlers para Orçamentos
  const handleSaveEstimate = (estimate: Estimate) => {
    setEstimates((prev) => {
      const idx = prev.findIndex((e) => e.id === estimate.id);
      let updated: Estimate[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = estimate;
      } else {
        updated = [estimate, ...prev];
      }
      try {
        localStorage.setItem('vollen_estimates', JSON.stringify(updated));
      } catch (err) {
        console.error('Erro ao salvar orçamentos:', err);
      }
      return updated;
    });

    // Salva na nuvem Firestore
    try {
      setDoc(doc(db, 'estimates', estimate.id), estimate, { merge: true }).catch(() => {});
    } catch (e) {}

    setStatusMessage(`Orçamento #${estimate.code} salvo com sucesso.`);
  };

  const handleDeleteEstimate = (estimateId: string) => {
    setEstimates((prev) => {
      const updated = prev.filter((e) => e.id !== estimateId);
      try {
        localStorage.setItem('vollen_estimates', JSON.stringify(updated));
      } catch (err) {
        console.error('Erro ao excluir orçamento:', err);
      }
      return updated;
    });

    // Deleta na nuvem Firestore
    try {
      deleteDoc(doc(db, 'estimates', estimateId)).catch(() => {});
    } catch (e) {}

    setStatusMessage('Orçamento excluído com sucesso.');
  };

  const handleGenerateOSFromEstimate = (estimate: Estimate) => {
    const prefilledOrder = {
      isNewFromEstimate: true,
      client: {
        id: estimate.client?.id || '',
        name: estimate.client?.name || '',
        phone: estimate.client?.phone || '',
        whatsapp: estimate.client?.whatsapp || '',
        address: estimate.client?.address || '',
        number: estimate.client?.number || '',
        neighborhood: estimate.client?.neighborhood || '',
        city: estimate.client?.city || '',
        state: estimate.client?.state || '',
      },
      equipment: {
        type: estimate.equipment?.type || '',
        brand: estimate.equipment?.brand || '',
        model: estimate.equipment?.model || '',
        serialNumber: estimate.equipment?.serialNumber || '',
        accessories: estimate.equipment?.accessories || '',
      },
      problemDescription: estimate.problemDescription || '',
      technicalReport: estimate.technicalReport || '',
      type: 'ORCAMENTO',
      status: 'ABERTA',
      travelCost: estimate.travelCost || '0,00',
      discountCost: estimate.discountCost || '0,00',
      totalAmount: estimate.totalAmount || 0,
      partsUsed: (estimate.partsList || []).map((p) => ({
        code: p.code || '0001',
        name: p.name,
        qty: p.qty || 1,
        price: p.price,
      })),
      servicesExecuted: (estimate.servicesList || []).map((s) => ({
        name: s.name,
        price: s.price,
      })),
    };

    setEstimateToConvertToOS(estimate.id);
    setPendingEstimateForReturn(estimate);
    setSelectedClientForNewOS(null);
    setOrderToEdit(prefilledOrder as any);
    setIsCreateEstimateModalOpen(false);
    setIsEstimatesModalOpen(false);
    setIsModalOpen(true);
    setStatusMessage(`Gerando Ordem de Serviço a partir do Orçamento #${estimate.code}...`);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('vollen_current_user');
    } catch {}
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          try {
            sessionStorage.setItem('vollen_current_user', JSON.stringify(user));
          } catch {}
          setCurrentUser(user);
        }}
      />
    );
  }

  return (
    <div
      className={`h-screen w-screen bg-slate-100 text-slate-900 flex flex-col font-sans overflow-hidden relative ${isCapsLockActive ? 'caps-active' : ''
        }`}
    >
      {/* Barra de Menus Superior */}
      <TopMenuBar
        onNewOrder={() => {
          setOrderToEdit(null);
          setSelectedClientForNewOS(null);
          setEstimateToConvertToOS(null);
          setIsModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpenTab={(tab) => setActiveTab(tab)}
        onOpenRegister={(type) => {
          if ((type as string) === 'WARRANTY_TERMS') {
            setIsWarrantyConfigOpen(true);
          } else {
            setRegisterModalType(type);
          }
        }}
        onOpenMenuOSModal={() => setIsMenuOSOpen(true)}
        onOpenUsersModal={() => setIsUsersModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenClientsModal={(initialSearch) => {
          setClientSearchTerm(initialSearch || '');
          setIsClientsModalOpen(true);
        }}
        onOpenPartsModal={() => setIsPartsModalOpen(true)}
        onOpenEquipmentsModal={() => setIsEquipmentsModalOpen(true)}
        onOpenServicesModal={() => setIsServicesModalOpen(true)}
        onOpenOrderStatusModal={() => setIsOrderStatusModalOpen(true)}
        onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
        onOpenLinkMobileModal={() => setIsLinkMobileModalOpen(true)}
        onOpenEstimatesModal={() => setIsEstimatesModalOpen(true)}
        onOpenCreateEstimateModal={() => {
          setEstimateToEdit(null);
          setIsCreateEstimateModalOpen(true);
        }}
        onOpenWallpaperModal={() => setIsWallpaperModalOpen(true)}
        onOpenTechniciansModal={() => setIsTechniciansModalOpen(true)}
        onOpenFactoryResetModal={() => setIsFactoryResetModalOpen(true)}
        onOpenOSGeneralConfigModal={() => setIsOSGeneralConfigModalOpen(true)}
        onOpenOrderSequenceModal={() => setIsOrderSequenceModalOpen(true)}
        onOpenPrinterConfigModal={() => setIsPrinterConfigModalOpen(true)}
        onOpenPeriodReportModal={() => {
          setIsPeriodReportModalOpen(true);
          fetchOrders(true)
            .then((allWithDel) => {
              if (Array.isArray(allWithDel)) setAllOrdersWithDeleted(allWithDel);
            })
            .catch((err) => {
              console.error('Erro ao carregar ordens com excluídas:', err);
            });
        }}
        onOpenTechnicianOrdersReportModal={() => {
          setIsTechnicianReportModalOpen(true);
        }}
        onOpenUpdateSystemModal={() => setIsUpdateSystemModalOpen(true)}
        onOpenCashRegisterModal={() => setIsCashRegisterModalOpen(true)}
        onOpenSalesModal={() => setIsSalesModalOpen(true)}
        onOpenSerialLicenseModal={() => setIsSerialLicenseModalOpen(true)}
        currentUser={currentUser}
      />

      {/* Papel de Parede Personalizado do Sistema com Overlay Suave */}
      {customWallpaper && (
        <div
          className="absolute inset-0 pointer-events-none z-0 transition-all duration-300"
          style={{
            backgroundImage: `url(${customWallpaper})`,
            backgroundSize: wallpaperScale === 100 ? 'cover' : `${wallpaperScale}%`,
            backgroundPosition: `${wallpaperPosX}% ${wallpaperPosY}%`,
            backgroundRepeat: 'no-repeat',
            opacity: (wallpaperOpacity || 25) / 100,
          }}
        />
      )}

      {/* Conteúdo Principal Ajustado sem Barra de Rolagem */}
      <main className="flex-1 w-full h-full p-0 overflow-hidden flex flex-col justify-between">
        {activeTab === 'dashboard' && (
          <Dashboard
            hasCustomWallpaper={Boolean(customWallpaper)}
            onNewOrder={() => {
              setOrderToEdit(null);
              setSelectedClientForNewOS(null);
              setEstimateToConvertToOS(null);
              setIsModalOpen(true);
            }}
            onOpenMenuOS={() => setIsMenuOSOpen(true)}
            onSearchOS={() => setIsSearchOSModalOpen(true)}
            onOpenSchedule={() => setIsScheduleModalOpen(true)}
            onOpenClients={() => setIsClientsModalOpen(true)}
            onOpenEstimates={() => setIsEstimatesModalOpen(true)}
            onOpenSales={() => setIsSalesModalOpen(true)}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleCalendar
            visits={visits}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        )}
      </main>

      {/* NÍVEL 1: Modal Criar / Editar OS */}
      <CreateOrderModal
        isOpen={isModalOpen}
        clients={allClients}
        allOrders={allOrders}
        availableParts={allParts}
        availableServices={allServices}
        availableEquipments={allEquipments}
        visits={visits}
        selectedClient={selectedClientForNewOS}
        selectedPartForOS={selectedPartForOS}
        selectedServiceForOS={selectedServiceForOS}
        orderToEdit={orderToEdit}
        currentUser={currentUser}
        totalOrders={maxEverOrderCode}
        defaultWarrantyConfig={defaultWarrantyConfig}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedClientForNewOS(null);
          setOrderToEdit(null);
          setEstimateToConvertToOS(null);

          if (pendingEstimateForReturn) {
            setEstimateToEdit(pendingEstimateForReturn);
            setIsCreateEstimateModalOpen(true);
            setPendingEstimateForReturn(null);
          } else if (cameFromFinishedOrders) {
            setCameFromFinishedOrders(false);
            setIsFinishedOrdersModalOpen(true);
          } else if (cameFromOpenOrders) {
            setCameFromOpenOrders(false);
            setIsOpenOrdersModalOpen(true);
          } else if (createOSOpenedFromMenuOS) {
            setCreateOSOpenedFromMenuOS(false);
            setIsMenuOSOpen(true);
          }
        }}
        onOpenClientsModal={() => {
          setClientSelectCallback(() => (client: any) => {
            setSelectedClientForNewOS(client);
            if (orderToEdit) {
              setOrderToEdit((prev: any) => ({
                ...prev,
                clientId: client.id,
                client,
              }));
            }
          });
          setIsClientsModalOpen(true);
        }}
        onOpenPartsModal={() => {
          setPartSelectCallback(() => (part: any) => {
            setSelectedPartForOS(part);
            setTimeout(() => setSelectedPartForOS(null), 300);
          });
          setIsPartsModalOpen(true);
        }}
        onOpenServicesModal={() => {
          setServiceSelectCallback(() => (service: any) => {
            setSelectedServiceForOS(service);
            setTimeout(() => setSelectedServiceForOS(null), 300);
          });
          setIsServicesModalOpen(true);
        }}
        onOpenClientHistory={(clientName, clientId) => {
          const clientMatch = allClients.find(
            (c) => c.id === clientId || c.name.toLowerCase() === clientName.toLowerCase()
          );
          setViewingClient(clientMatch || { id: clientId, name: clientName });
          setIsClientOrdersHistoryOpen(true);
        }}
        onEditClient={(clientData) => {
          const clientMatch = allClients.find(
            (c) => c.id === clientData.id || c.name.toLowerCase() === clientData.name.toLowerCase()
          );
          setViewingClient(clientMatch || clientData);
          setViewingClientEditMode(true);
          setCameFromOSForClientEdit(true);
        }}
        onDeleteOrder={(deletedId) => {
          setAllOrders((prev) => prev.filter((o) => o.id !== deletedId));
          setVisits((prev) => prev.filter((v) => v.orderId !== deletedId && v.order?.id !== deletedId));
          setStatusMessage('Ordem de Serviço excluída definitivamente.');
        }}
        onUpdatePartsStock={saveParts}
        onSaveEquipment={(newEq) => {
          const typeFormatted = (newEq.type || newEq.name || '').trim();
          if (!typeFormatted) return;
          const normalizedNew = typeFormatted.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
          const exists = allEquipments.some((e) => {
            const existingName = (e.type || e.name || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
            return existingName === normalizedNew;
          });
          if (exists) {
            return; // Não duplica se já existir
          }
          const updated = [newEq, ...allEquipments];
          saveEquipments(updated);
        }}
        onCreateWarrantyReturn={handleCreateWarrantyReturn}
        onOpenWarrantyOrder={(targetOS) => {
          setOrderToEdit(targetOS);
          loadData();
        }}
        onSuccess={async (savedOrder?: any) => {
          if (estimateToConvertToOS) {
            const osIdToLink = savedOrder?.id || 'simulated-os';
            setEstimates((prev) => {
              const updated = prev.map((e) =>
                e.id === estimateToConvertToOS ? { ...e, status: 'APROVADO' as const, convertedToOSId: osIdToLink } : e
              );
              try {
                localStorage.setItem('vollen_estimates', JSON.stringify(updated));
              } catch (err) {
                console.error('Erro ao atualizar orçamento para aprovado:', err);
              }
              return updated;
            });

            // Atualiza também na nuvem Firestore
            try {
              setDoc(doc(db, 'estimates', estimateToConvertToOS), { status: 'APROVADO', convertedToOSId: osIdToLink }, { merge: true }).catch(() => {});
            } catch (e) {}

            setEstimateToConvertToOS(null);
          }
          setPendingEstimateForReturn(null);

          if (savedOrder) {
            setOrderToEdit(savedOrder);
          }

          await loadData();
          setStatusMessage('Ordem de Serviço salva com sucesso!');
        }}
        onFinalizeSuccess={async () => {
          if (estimateToConvertToOS) {
            setEstimates((prev) => {
              const updated = prev.map((e) =>
                e.id === estimateToConvertToOS ? { ...e, status: 'APROVADO' as const, convertedToOSId: 'finalized-os' } : e
              );
              try {
                localStorage.setItem('vollen_estimates', JSON.stringify(updated));
              } catch (err) { }
              return updated;
            });

            // Atualiza também na nuvem Firestore
            try {
              setDoc(doc(db, 'estimates', estimateToConvertToOS), { status: 'APROVADO', convertedToOSId: 'finalized-os' }, { merge: true }).catch(() => {});
            } catch (e) {}

            setEstimateToConvertToOS(null);
          }
          setPendingEstimateForReturn(null);
          setStatusMessage('Ordem de Serviço finalizada com sucesso!');
          await loadData();
          setIsModalOpen(false);
          setSelectedClientForNewOS(null);
          setOrderToEdit(null);
          if (cameFromFinishedOrders) {
            setCameFromFinishedOrders(false);
            setIsFinishedOrdersModalOpen(true);
          } else if (cameFromOpenOrders) {
            setCameFromOpenOrders(false);
            setIsOpenOrdersModalOpen(true);
          } else if (createOSOpenedFromMenuOS) {
            setCreateOSOpenedFromMenuOS(false);
            setIsMenuOSOpen(true);
          }
        }}
      />

      {/* NÍVEL 1: Modal Menu OS */}
      <MenuOSModal
        isOpen={isMenuOSOpen}
        orders={allOrders}
        onClose={() => setIsMenuOSOpen(false)}
        onOpenCreateOS={() => {
          setOrderToEdit(null);
          setSelectedClientForNewOS(null);
          setCameFromOpenOrders(false);
          setCameFromFinishedOrders(false);
          setCreateOSOpenedFromMenuOS(true);
          setIsModalOpen(true);
        }}
        onOpenOpenOrdersModal={() => {
          setIsMenuOSOpen(false);
          setOpenOrdersOpenedFromMenuOS(true);
          setIsOpenOrdersModalOpen(true);
        }}
        onOpenFinishedOrdersModal={() => {
          setIsMenuOSOpen(false);
          setFinishedOrdersOpenedFromMenuOS(true);
          setIsFinishedOrdersModalOpen(true);
        }}
        onOpenSearchOS={() => {
          setIsMenuOSOpen(false);
          setIsSearchOSModalOpen(true);
        }}
      />

      {/* NÍVEL 2: Modal Dedicado de OS Abertas com Tabela Interativa */}
      <OpenOrdersModal
        isOpen={isOpenOrdersModalOpen}
        orders={allOrders}
        onClose={() => {
          setIsOpenOrdersModalOpen(false);
          if (openOrdersOpenedFromMenuOS) {
            setOpenOrdersOpenedFromMenuOS(false);
            setIsMenuOSOpen(true);
          }
        }}
        onOpenCreateOS={() => {
          setOrderToEdit(null);
          setSelectedClientForNewOS(null);
          setCameFromOpenOrders(true);
          setCameFromFinishedOrders(false);
          setCreateOSOpenedFromMenuOS(false);
          setIsOpenOrdersModalOpen(false);
          setIsMenuOSOpen(false);
          setIsModalOpen(true);
        }}
        onUpdateOrderStatus={async (orderId, newStatus) => {
          setAllOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
          );
          setStatusMessage(`Status da Ordem de Serviço atualizado para: ${newStatus}`);
          try {
            await updateOrder(orderId, { status: newStatus });
            await loadData();
          } catch (err) {
            console.error('Erro ao atualizar status da OS no servidor:', err);
          }
        }}
        onOpenEditOS={(order) => {
          setOrderToEdit(order);
          setCameFromOpenOrders(true);
          setCameFromFinishedOrders(false);
          setCreateOSOpenedFromMenuOS(false);
          setIsOpenOrdersModalOpen(false);
          setIsModalOpen(true);
        }}
      />

      {/* NIVEL 2b: Modal Dedicado de OS Finalizadas com Tabela Interativa */}
      <FinishedOrdersModal
        isOpen={isFinishedOrdersModalOpen}
        orders={allOrders}
        onClose={() => {
          setIsFinishedOrdersModalOpen(false);
          if (finishedOrdersOpenedFromMenuOS) {
            setFinishedOrdersOpenedFromMenuOS(false);
            setIsMenuOSOpen(true);
          }
        }}
        onCreateWarrantyReturn={handleCreateWarrantyReturn}
        onUpdateOrderStatus={async (orderId, newStatus) => {
          setAllOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
          );
          setStatusMessage(`Status da Ordem de Servico atualizado para: ${newStatus}`);
          try {
            await updateOrder(orderId, { status: newStatus });
            await loadData();
          } catch (err) {
            console.error('Erro ao atualizar status da OS no servidor:', err);
          }
        }}
        onOpenEditOS={(order) => {
          setOrderToEdit(order);
          setCameFromFinishedOrders(true);
          setCameFromOpenOrders(false);
          setCreateOSOpenedFromMenuOS(false);
          setIsFinishedOrdersModalOpen(false);
          setIsModalOpen(true);
        }}
      />

      {/* NÍVEL 3: Modal de Edição da OS (Z-Index alto para sobrepor modais anteriores ao abrir uma OS) */}
      <EditOrderModal
        isOpen={!!editingOrder}
        order={editingOrder}
        clients={allClients}
        onClose={() => setEditingOrder(null)}
        onOpenCreateClient={() => setRegisterModalType('CLIENT')}
        onViewClientProfile={(client) => setViewingClient(client)}
        onOpenClientsModal={() => setIsClientsModalOpen(true)}
        onSave={(updatedOrder) => {
          setAllOrders((prev) =>
            prev.map((os) => (os.id === updatedOrder.id ? updatedOrder : os))
          );
          setStatusMessage(`Ordem de Serviço ${updatedOrder.code} atualizada e salva com sucesso!`);
        }}
      />

      {/* NÍVEL 4: Modal Unificado de Clientes Cadastrados */}
      <ClientsModal
        isOpen={isClientsModalOpen}
        clients={allClients}
        currentUser={currentUser}
        initialSearchTerm={clientSearchTerm}
        onClose={() => {
          setIsClientsModalOpen(false);
          setClientSearchTerm('');
        }}
        onOpenCreateClient={() => setRegisterModalType('CLIENT')}
        onOpenViewClient={(client, startInEditMode) => {
          setViewingClient(client);
          setViewingClientEditMode(!!startInEditMode);
        }}
        onDeleteClient={async (clientId) => {
          const clientToDel = allClients.find((c) => c.id === clientId);
          const hasOrders = allOrders.some(
            (os) =>
              os.clientId === clientId ||
              (os.client && os.client.id === clientId) ||
              (clientToDel && os.client?.name?.toLowerCase() === clientToDel.name?.toLowerCase())
          );

          if (hasOrders) {
            alert(`Não é possível excluir o cliente "${clientToDel?.name || ''}" pois existem Ordens de Serviço vinculadas a ele.`);
            return;
          }

          setAllClients((prev) => prev.filter((c) => c.id !== clientId));
          setStatusMessage('Cliente excluído com sucesso.');
          try {
            await deleteClient(clientId);
          } catch (err) {
            console.error('Erro ao deletar cliente no servidor:', err);
          }
          await loadData();
        }}
        onSelectClient={
          clientSelectCallback
            ? (client) => {
              clientSelectCallback(client);
              setClientSelectCallback(null);
              setIsClientsModalOpen(false);
            }
            : (isModalOpen || editingOrder)
              ? (client) => {
                if (editingOrder) {
                  setEditingOrder((prev: any) => ({ ...prev, clientId: client.id, client }));
                } else if (isModalOpen) {
                  setSelectedClientForNewOS(client);
                }
                setIsClientsModalOpen(false);
              }
              : undefined
        }
      />

      {/* Central de Equipamentos Cadastrados */}
      <EquipmentsModal
        isOpen={isEquipmentsModalOpen}
        equipments={allEquipments}
        currentUser={currentUser}
        onClose={() => setIsEquipmentsModalOpen(false)}
        onOpenCreateEquipment={() => setRegisterModalType('EQUIPMENT')}
        onOpenEditEquipment={(equipment) => {
          setViewingEquipment(equipment);
          setIsEquipmentsModalOpen(false);
        }}
        onDeleteEquipment={(eqId) => {
          const updated = allEquipments.filter((e) => e.id !== eqId);
          saveEquipments(updated);
          setStatusMessage('Equipamento excluído com sucesso.');
        }}
      />

      {/* NÍVEL 5: Modal Flutuante Exclusivo do Histórico de OS do Cliente */}
      <ClientOrdersHistoryModal
        isOpen={isClientOrdersHistoryOpen}
        clientName={viewingClient?.name || ''}
        orders={allOrders.filter((os) => {
          if (!viewingClient) return false;
          return (
            os.clientId === viewingClient.id ||
            (os.client && os.client.id === viewingClient.id) ||
            (viewingClient.name && os.client?.name?.toLowerCase() === viewingClient.name.toLowerCase())
          );
        })}
        onClose={() => setIsClientOrdersHistoryOpen(false)}
        onSelectOrder={(order) => {
          setIsClientOrdersHistoryOpen(false);
          setViewingClient(null);
          setOrderToEdit(order);
          setIsModalOpen(true);
        }}
      />

      {/* NÍVEL 6: Modal de Cadastros */}
      <RegisterModal
        isOpen={Boolean(registerModalType || viewingClient || viewingPart || viewingEquipment || viewingService)}
        initialType={registerModalType || (viewingPart ? 'PART' : viewingEquipment ? 'EQUIPMENT' : viewingService ? 'SERVICE' : 'CLIENT')}
        isExclusiveClientMode={registerModalType === 'CLIENT'}
        clientDataToView={viewingClient}
        partDataToView={viewingPart}
        equipmentDataToView={viewingEquipment}
        serviceDataToView={viewingService}
        availableEquipments={allEquipments}
        startInEditMode={viewingClientEditMode || Boolean(viewingPart) || Boolean(viewingEquipment) || Boolean(viewingService)}
        clientOrders={allOrders}
        nextClientCode={String(
          allClients.reduce((max, c) => {
            const num = parseInt(String(c.code || '').replace(/\D/g, ''), 10);
            return isNaN(num) ? max : Math.max(max, num);
          }, 0) + 1
        ).padStart(4, '0')}
        onOpenClientOrdersHistoryModal={() => setIsClientOrdersHistoryOpen(true)}
        onOpenSelectedOSFromClient={(order) => {
          setViewingClient(null);
          setRegisterModalType(null);
          setIsClientsModalOpen(false);
          setOrderToEdit(order);
          setIsModalOpen(true);
        }}
        onClose={() => {
          const wasClientForm = registerModalType === 'CLIENT' || Boolean(viewingClient);
          const wasPartForm = registerModalType === 'PART' || Boolean(viewingPart);
          const wasEquipmentForm = registerModalType === 'EQUIPMENT' || Boolean(viewingEquipment);
          const wasServiceForm = registerModalType === 'SERVICE' || Boolean(viewingService);
          const backToOS = cameFromOSForClientEdit;

          setRegisterModalType(null);
          setViewingClient(null);
          setViewingPart(null);
          setViewingEquipment(null);
          setViewingService(null);
          setViewingClientEditMode(false);
          setCameFromOSForClientEdit(false);

          if (backToOS) {
            setIsModalOpen(true);
          } else if (wasClientForm) {
            setIsClientsModalOpen(true);
          } else if (wasPartForm) {
            setIsPartsModalOpen(true);
          } else if (wasEquipmentForm) {
            setIsEquipmentsModalOpen(true);
          } else if (wasServiceForm) {
            setIsServicesModalOpen(true);
          }
          loadData();
        }}
        onSaveEquipment={(eqForm) => {
          const typeFormatted = (eqForm.type || '').trim();
          if (!typeFormatted) {
            alert('Por favor, informe o nome do equipamento.');
            return;
          }

          // Verifica se já existe um equipamento com o mesmo nome/tipo (ignorando acentos e maiúsculas/minúsculas)
          const normalizedNew = typeFormatted.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
          const duplicate = allEquipments.find((e) => {
            if (eqForm.id && e.id === eqForm.id) return false;
            const existingName = (e.type || e.name || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
            return existingName === normalizedNew;
          });

          if (duplicate) {
            alert(`Já existe um equipamento cadastrado com o nome "${duplicate.type || duplicate.name}" (Código: ${duplicate.code || 'N/D'}). Não é permitido cadastrar duplicados.`);
            return;
          }

          const maxNum = allEquipments.reduce((max, e) => {
            const num = parseInt(String(e.code || '').replace(/\D/g, ''), 10);
            return isNaN(num) ? max : Math.max(max, num);
          }, 0);
          const nextCode = String(maxNum + 1).padStart(4, '0');
          const finalType = isCapsLockActive ? typeFormatted.toUpperCase() : typeFormatted;
          const newEq = {
            id: eqForm.id || String(Date.now()),
            code: eqForm.code ? String(eqForm.code).padStart(4, '0') : nextCode,
            type: finalType,
            brand: isCapsLockActive ? (eqForm.brand || '').toUpperCase() : (eqForm.brand || ''),
            model: isCapsLockActive ? (eqForm.model || '').toUpperCase() : (eqForm.model || ''),
            serialNumber: isCapsLockActive ? (eqForm.serialNumber || '').toUpperCase() : (eqForm.serialNumber || ''),
          };
          const exists = allEquipments.some((e) => e.id === newEq.id);
          const updated = exists
            ? allEquipments.map((e) => (e.id === newEq.id ? newEq : e))
            : [newEq, ...allEquipments];
          saveEquipments(updated);
          setStatusMessage(`Equipamento "${newEq.type}" salvo com sucesso!`);
          setViewingEquipment(null);
          setIsEquipmentsModalOpen(true);
        }}
        onSavePart={(partForm) => {
          const maxNum = allParts.reduce((max, p) => {
            const num = parseInt(String(p.code || '').replace(/\D/g, ''), 10);
            return isNaN(num) ? max : Math.max(max, num);
          }, 0);
          const nextCode = String(maxNum + 1).padStart(4, '0');
          const newPart = {
            id: partForm.id || String(Date.now()),
            code: partForm.code ? partForm.code.replace('PEC-', '') : nextCode,
            name: isCapsLockActive ? (partForm.name || '').toUpperCase() : (partForm.name || 'PEÇA SEM NOME'),
            brand: isCapsLockActive ? (partForm.brand || '').toUpperCase() : (partForm.brand || ''),
            group: isCapsLockActive ? (partForm.group || '').toUpperCase() : (partForm.group || ''),
            location: isCapsLockActive ? (partForm.location || '').toUpperCase() : (partForm.location || ''),
            costPrice: partForm.costPrice || '',
            profitMarginPercent: partForm.profitMarginPercent || '',
            techPrice: partForm.techPrice || '',
            finalPrice: partForm.finalPrice || '0,00',
            application: isCapsLockActive ? (partForm.application || '').toUpperCase() : (partForm.application || ''),
            stockQuantity: Number(partForm.stockQuantity) || 0,
            minStock: Number(partForm.minStock) || 0,
          };
          const exists = allParts.some((p) => p.id === newPart.id);
          const updated = exists
            ? allParts.map((p) => (p.id === newPart.id ? newPart : p))
            : [newPart, ...allParts];
          saveParts(updated);
          setStatusMessage(`Peça "${newPart.name}" salva com sucesso!`);
          setViewingPart(null);
          setIsPartsModalOpen(true);
        }}
        onSaveService={(serviceForm) => {
          const maxNum = allServices.reduce((max, s) => {
            const num = parseInt(String(s.code || '').replace(/\D/g, ''), 10);
            return isNaN(num) ? max : Math.max(max, num);
          }, 0);
          const nextCode = String(maxNum + 1).padStart(4, '0');
          const newService = {
            id: serviceForm.id || String(Date.now()),
            code: serviceForm.code || nextCode,
            name: isCapsLockActive ? (serviceForm.name || '').toUpperCase() : (serviceForm.name || 'SERVIÇO SEM NOME'),
            price: serviceForm.price || '0,00',
          };
          const exists = allServices.some((s) => s.id === newService.id);
          const updated = exists
            ? allServices.map((s) => (s.id === newService.id ? newService : s))
            : [newService, ...allServices];
          saveServices(updated);
          setStatusMessage(`Serviço "${newService.name}" salvo com sucesso!`);
          setViewingService(null);
          setIsServicesModalOpen(true);
        }}
        onSaveClient={async (clientForm) => {
          const maxNum = allClients.reduce((max, c) => {
            const num = parseInt(String(c.code || '').replace(/\D/g, ''), 10);
            return isNaN(num) ? max : Math.max(max, num);
          }, 0);
          const tempCode = String(maxNum + 1).padStart(4, '0');
          const clientPayload = {
            ...clientForm,
            code: clientForm.code || tempCode,
          };

          let savedClient = null;
          try {
            savedClient = await createClient(clientPayload);
          } catch (err) {
            console.error('Erro ao salvar cliente no banco:', err);
          }

          const finalClient = savedClient || {
            ...clientPayload,
            id: clientPayload.id || String(Date.now()),
            name: clientPayload.name || 'Novo Cliente',
          };

          // 1. Atualização instantânea na tela
          setAllClients((prev) => [finalClient, ...prev.filter((c) => c.id !== finalClient.id)]);
          setStatusMessage(`Cliente ${finalClient.name} salvo com sucesso!`);

          if (cameFromOSForClientEdit) {
            setSelectedClientForNewOS(finalClient);
            setIsModalOpen(true);
            setCameFromOSForClientEdit(false);
          } else {
            setIsClientsModalOpen(true);
          }

          await loadData();
        }}
      />
      {/* NÍVEL 7: Modal de Usuários e Senhas */}
      <UsersModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
      />

      {/* NÍVEL 8: Central de Peças Cadastradas */}
      <PartsModal
        isOpen={isPartsModalOpen}
        parts={allParts}
        availableEquipments={allEquipments}
        currentUser={currentUser}
        onClose={() => {
          setIsPartsModalOpen(false);
          setPartSelectCallback(null);
        }}
        onSelectPart={
          partSelectCallback
            ? (part) => {
              partSelectCallback(part);
              setPartSelectCallback(null);
              setIsPartsModalOpen(false);
            }
            : (isModalOpen || editingOrder)
              ? (part) => {
                setSelectedPartForOS(part);
                setIsPartsModalOpen(false);
                setTimeout(() => setSelectedPartForOS(null), 300);
              }
              : undefined
        }
        onOpenCreatePart={() => setRegisterModalType('PART')}
        onOpenEditPart={(part) => {
          setViewingPart(part);
          setIsPartsModalOpen(false);
        }}
        onDeletePart={async (partId) => {
          const updated = allParts.filter((p) => p.id !== partId);
          saveParts(updated);
          try {
            await deleteDoc(doc(db, 'parts', String(partId)));
          } catch (e) {
            console.warn('Erro ao excluir peça no Firestore:', e);
          }
          setStatusMessage('Peça excluída com sucesso.');
        }}
        onAddToSales={(part) => {
          setIsPartsModalOpen(false);
          setSelectedPartForSales(part);
          setIsSalesModalOpen(true);
          setTimeout(() => setSelectedPartForSales(null), 300);
        }}
      />

      {/* Central de Serviços Cadastrados */}
      <ServicesModal
        isOpen={isServicesModalOpen}
        services={allServices}
        currentUser={currentUser}
        onClose={() => {
          setIsServicesModalOpen(false);
          setServiceSelectCallback(null);
        }}
        onSelectService={
          serviceSelectCallback
            ? (service) => {
              if (serviceSelectCallback) {
                serviceSelectCallback(service);
              }
              setServiceSelectCallback(null);
              setIsServicesModalOpen(false);
            }
            : (isModalOpen || editingOrder)
              ? (service) => {
                setSelectedServiceForOS(service);
                setIsServicesModalOpen(false);
              }
              : undefined
        }
        onOpenCreateService={() => setRegisterModalType('SERVICE')}
        onOpenEditService={(service) => {
          setViewingService(service);
          setIsServicesModalOpen(false);
        }}
        onDeleteService={async (serviceId) => {
          const updated = allServices.filter((s) => s.id !== serviceId);
          saveServices(updated);
          try {
            await deleteDoc(doc(db, 'services', String(serviceId)));
          } catch (e) {
            console.warn('Erro ao excluir serviço no Firestore:', e);
          }
          setStatusMessage('Serviço excluído com sucesso.');
        }}
      />

      {/* NÍVEL 8: Modal de Seleção de Pasta e Criação de Backup */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        parts={allParts}
        services={allServices}
        equipments={allEquipments}
        clients={allClients}
        orders={allOrders}
        estimates={estimates}
      />

      {/* Modal de Configuração de OS > Termos dos Comprovantes Padrão */}
      <WarrantyConfigModal
        isOpen={isWarrantyConfigOpen}
        defaultDays={defaultWarrantyConfig.defaultDays}
        defaultTerms={defaultWarrantyConfig.defaultTerms}
        defaultCoverage={defaultWarrantyConfig.defaultCoverage}
        defaultEntryTerms={defaultWarrantyConfig.defaultEntryTerms}
        defaultEstimateTerms={defaultWarrantyConfig.defaultEstimateTerms}
        defaultExitTerms={defaultWarrantyConfig.defaultExitTerms}
        onClose={() => setIsWarrantyConfigOpen(false)}
        onSave={(newCfg) => {
          setDefaultWarrantyConfig(newCfg);
          localStorage.setItem('vollen_os_config', JSON.stringify(newCfg));
          setStatusMessage('Configurações padrão dos Termos de OS salvas com sucesso.');
        }}
      />

      {/* Modal de Gerenciamento de Status de OS */}
      <OrderStatusModal
        isOpen={isOrderStatusModalOpen}
        currentUser={currentUser}
        onClose={() => setIsOrderStatusModalOpen(false)}
      />

      {/* Modal de Cadastro e Gerenciamento de Técnicos Responsáveis */}
      <TechniciansModal
        isOpen={isTechniciansModalOpen}
        currentUser={currentUser}
        onClose={() => setIsTechniciansModalOpen(false)}
      />

      {/* Modal de Opções > Dados da Empresa e Logotipo */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSave={(updatedCompanyData) => {
          setCompanyInfoState(updatedCompanyData);
          setStatusMessage('Dados da Empresa e Logotipo salvos com sucesso.');
        }}
      />

      {/* Modal de Busca Rápida de OS por Número */}
      <SearchOSModal
        isOpen={isSearchOSModalOpen}
        orders={allOrders}
        onClose={() => setIsSearchOSModalOpen(false)}
        onSelectOrder={(selectedOS) => {
          setOrderToEdit(selectedOS);
          setSelectedClientForNewOS(null);
          if (selectedOS.status === 'FINALIZADA' || selectedOS.status === 'CONCLUIDA' || selectedOS.status === 'GARANTIA_FINALIZADA' || selectedOS.status === 'GARANTIA/FINALIZADA') {
            setCameFromFinishedOrders(true);
            setCameFromOpenOrders(false);
          } else {
            setCameFromOpenOrders(true);
            setCameFromFinishedOrders(false);
          }
          setIsModalOpen(true);
        }}
      />

      {/* Modal da Grade Diária de Agendamentos */}
      <ScheduleCalendar
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        visits={visits}
        orders={allOrders}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onEditVisit={async (visitDataToUpdate) => {
          try {
            await updateVisit(visitDataToUpdate.id, visitDataToUpdate);
            setStatusMessage('Agendamento atualizado com sucesso!');
            await loadData();
          } catch (err) {
            console.error('Erro ao atualizar agendamento:', err);
          }
        }}
        onDeleteVisit={async (visitId) => {
          try {
            await deleteVisit(visitId);
            setStatusMessage('Agendamento excluído com sucesso.');
            await loadData();
          } catch (err) {
            console.error('Erro ao excluir agendamento:', err);
          }
        }}
        onOpenOS={(order) => {
          setIsScheduleModalOpen(false);
          setOrderToEdit(order);
          setSelectedClientForNewOS(null);
          if (order.status === 'FINALIZADA' || order.status === 'CONCLUIDA') {
            setCameFromFinishedOrders(true);
            setCameFromOpenOrders(false);
          } else {
            setCameFromOpenOrders(true);
            setCameFromFinishedOrders(false);
          }
          setIsModalOpen(true);
        }}
      />

      {/* Modal de Personalização do Papel de Parede */}
      <WallpaperModal
        isOpen={isWallpaperModalOpen}
        onClose={() => setIsWallpaperModalOpen(false)}
        currentWallpaper={customWallpaper}
        wallpaperOpacity={wallpaperOpacity}
        wallpaperPosX={wallpaperPosX}
        wallpaperPosY={wallpaperPosY}
        wallpaperScale={wallpaperScale}
        onSaveWallpaper={(newUrl, newOpacity, newPosX, newPosY, newScale) => {
          if (newUrl) {
            localStorage.setItem('system_wallpaper_url', newUrl);
            localStorage.setItem('system_wallpaper_opacity', String(newOpacity));
            localStorage.setItem('system_wallpaper_pos_x', String(newPosX));
            localStorage.setItem('system_wallpaper_pos_y', String(newPosY));
            localStorage.setItem('system_wallpaper_scale', String(newScale));
            setCustomWallpaper(newUrl);
            setWallpaperOpacity(newOpacity);
            setWallpaperPosX(newPosX);
            setWallpaperPosY(newPosY);
            setWallpaperScale(newScale);
            setStatusMessage('Papel de parede e enquadramento salvos com sucesso.');
          } else {
            localStorage.removeItem('system_wallpaper_url');
            localStorage.removeItem('system_wallpaper_opacity');
            localStorage.removeItem('system_wallpaper_pos_x');
            localStorage.removeItem('system_wallpaper_pos_y');
            localStorage.removeItem('system_wallpaper_scale');
            setCustomWallpaper(null);
            setWallpaperPosX(50);
            setWallpaperPosY(50);
            setWallpaperScale(100);
            setStatusMessage('Plano de fundo padrão restaurado.');
          }
        }}
      />

      {/* Modal de Lista / Relatório de Ordens de Serviço por Período */}
      <PeriodOrdersReportModal
        isOpen={isPeriodReportModalOpen}
        orders={allOrdersWithDeleted.length > 0 ? allOrdersWithDeleted : allOrders}
        companyInfo={companyInfoState}
        onClose={() => setIsPeriodReportModalOpen(false)}
        onOpenOrderDetails={(order) => {
          setIsPeriodReportModalOpen(false);
          setOrderToEdit(order);
          setSelectedClientForNewOS(null);
          if (order.status === 'FINALIZADA' || order.status === 'CONCLUIDA' || order.status === 'GARANTIA_FINALIZADA' || order.status === 'GARANTIA/FINALIZADA') {
            setCameFromFinishedOrders(true);
            setCameFromOpenOrders(false);
          } else {
            setCameFromOpenOrders(true);
            setCameFromFinishedOrders(false);
          }
          setIsModalOpen(true);
        }}
      />

      {/* Modal de Relatório de Ordens de Serviço por Técnico */}
      <TechnicianOrdersReportModal
        isOpen={isTechnicianReportModalOpen}
        orders={allOrdersWithDeleted.length > 0 ? allOrdersWithDeleted : allOrders}
        companyInfo={companyInfoState}
        onClose={() => setIsTechnicianReportModalOpen(false)}
        onOpenOrderDetails={(order) => {
          setIsTechnicianReportModalOpen(false);
          setOrderToEdit(order);
          setSelectedClientForNewOS(null);
          if (order.status === 'FINALIZADA' || order.status === 'CONCLUIDA' || order.status === 'GARANTIA_FINALIZADA' || order.status === 'GARANTIA/FINALIZADA') {
            setCameFromFinishedOrders(true);
            setCameFromOpenOrders(false);
          } else {
            setCameFromOpenOrders(true);
            setCameFromFinishedOrders(false);
          }
          setIsModalOpen(true);
        }}
      />

      {/* Modal de Vinculação com Celular (ApiKey) */}
      <LinkMobileModal
        isOpen={isLinkMobileModalOpen}
        companyInfo={companyInfoState}
        onClose={() => setIsLinkMobileModalOpen(false)}
        onOpenSerialModal={() => setIsSerialLicenseModalOpen(true)}
      />

      {/* Modal de Restauração de Padrão de Fábrica */}
      <FactoryResetModal
        isOpen={isFactoryResetModalOpen}
        currentUser={currentUser}
        onClose={() => setIsFactoryResetModalOpen(false)}
        onResetSuccess={async () => {
          setCustomWallpaper(null);
          setWallpaperPosX(50);
          setWallpaperPosY(50);
          setWallpaperScale(100);
          setCompanyInfoState(defaultCompanyData);
          setAllOrders([]);
          setAllOrdersWithDeleted([]);
          setAllClients([]);
          setAllServices([]);
          setAllParts([]);
          setVisits([]);
          setEstimates([]);
          setMaxEverOrderCode(0);
          await loadData();
          setStatusMessage('Padrão de fábrica restaurado com sucesso. Todos os dados foram limpos.');
        }}
      />

      {/* Modal de Configurações e Parâmetros Gerais de OS */}
      <OSGeneralConfigModal
        isOpen={isOSGeneralConfigModalOpen}
        onClose={() => setIsOSGeneralConfigModalOpen(false)}
        onSave={() => {
          setStatusMessage('Configurações e regras de OS salvas com sucesso.');
        }}
      />

      {/* Modal de Configurações de Impressora & Impressão */}
      <PrinterConfigModal
        isOpen={isPrinterConfigModalOpen}
        onClose={() => setIsPrinterConfigModalOpen(false)}
        onSave={() => {
          setStatusMessage('Configurações de impressora salvas com sucesso.');
        }}
      />

      {/* Modal de Verificação e Atualização do Sistema */}
      <UpdateSystemModal
        isOpen={isUpdateSystemModalOpen}
        currentUser={currentUser}
        onClose={() => setIsUpdateSystemModalOpen(false)}
      />

      {/* Modal de Controle de Caixa e Fluxo Financeiro */}
      <CashRegisterModal
        isOpen={isCashRegisterModalOpen}
        currentUser={currentUser}
        companyInfo={companyInfoState}
        onClose={() => setIsCashRegisterModalOpen(false)}
      />

      {/* NÍVEL 1: Central de Orçamentos */}
      <EstimatesModal
        isOpen={isEstimatesModalOpen}
        estimates={estimates}
        clientsList={allClients}
        onClose={() => setIsEstimatesModalOpen(false)}
        onOpenCreateEstimate={() => {
          setEstimateToEdit(null);
          setIsCreateEstimateModalOpen(true);
        }}
        onOpenEditEstimate={(estimate) => {
          setEstimateToEdit(estimate);
          setIsCreateEstimateModalOpen(true);
        }}
        onDeleteEstimate={handleDeleteEstimate}
        onGenerateOSFromEstimate={handleGenerateOSFromEstimate}
        onPrintEstimate={(estimate) => {
          setEstimateToEdit(estimate);
          setIsCreateEstimateModalOpen(true);
        }}
        onOpenClientsModal={() => {
          setClientSelectCallback(() => (client: any) => {
            setSelectedClientForNewOS(client);
          });
          setIsClientsModalOpen(true);
        }}
      />

      {/* NÍVEL 2: Ficha de Criação / Edição de Orçamento */}
      <CreateEstimateModal
        isOpen={isCreateEstimateModalOpen}
        estimateToEdit={estimateToEdit}
        allEstimates={estimates}
        clientsList={allClients}
        availableParts={allParts}
        availableServices={allServices}
        availableEquipments={allEquipments}
        allOrders={allOrders}
        selectedClient={selectedClientForNewOS}
        selectedPart={selectedPartForOS}
        selectedService={selectedServiceForOS}
        currentUser={currentUser}
        onClose={() => {
          setIsCreateEstimateModalOpen(false);
          setEstimateToEdit(null);
          setSelectedClientForNewOS(null);
          setPendingEstimateForReturn(null);
        }}
        onSaveEstimate={handleSaveEstimate}
        onDeleteEstimate={handleDeleteEstimate}
        onGenerateOSFromEstimate={handleGenerateOSFromEstimate}
        onOpenSalesModal={(estimateDraft) => {
          if (estimateDraft) {
            setPendingEstimateForReturn(estimateDraft);
          } else if (estimateToEdit) {
            setPendingEstimateForReturn(estimateToEdit);
          }
          setIsCreateEstimateModalOpen(false);
          setIsEstimatesModalOpen(false);
          setIsSalesModalOpen(true);
        }}
        onOpenClientsModal={() => {
          setClientSelectCallback(() => (client: any) => {
            setSelectedClientForNewOS(client);
          });
          setIsClientsModalOpen(true);
        }}
        onOpenPartsModal={() => {
          setPartSelectCallback(() => (part: any) => {
            setSelectedPartForOS(part);
            setTimeout(() => setSelectedPartForOS(null), 300);
          });
          setIsPartsModalOpen(true);
        }}
        onOpenServicesModal={() => {
          setServiceSelectCallback(() => (service: any) => {
            setSelectedServiceForOS(service);
            setTimeout(() => setSelectedServiceForOS(null), 300);
          });
          setIsServicesModalOpen(true);
        }}
      />

      {/* NÍVEL 2: Modal Exclusivo e Isolado de Numeração Inicial de OS */}
      <OrderSequenceModal
        isOpen={isOrderSequenceModalOpen}
        onClose={() => setIsOrderSequenceModalOpen(false)}
        onSaved={() => {
          loadData();
        }}
      />

      {/* Módulo de Vendas de Peças (Balcão) */}
      <SalesModal
        isOpen={isSalesModalOpen}
        onClose={() => {
          setIsSalesModalOpen(false);
          if (pendingEstimateForReturn) {
            setEstimateToEdit(pendingEstimateForReturn);
            setIsCreateEstimateModalOpen(true);
            setPendingEstimateForReturn(null);
          }
        }}
        onSaleCompleted={() => {
          setPendingEstimateForReturn(null);
          try {
            const saved = localStorage.getItem('vollen_estimates');
            if (saved) setEstimates(JSON.parse(saved));
          } catch {}
        }}
        parts={allParts}
        clients={allClients}
        currentUser={currentUser}
        companyInfo={companyInfoState}
        onUpdatePartsStock={(updatedParts) => {
          setAllParts(updatedParts);
        }}
        onOpenPartsModal={() => setIsPartsModalOpen(true)}
        selectedPartToAdd={selectedPartForSales}
      />

      {/* Modal de Gestão de Chave Serial & Conexão em Nuvem */}
      <SerialLicenseModal
        isOpen={isSerialLicenseModalOpen}
        onClose={() => setIsSerialLicenseModalOpen(false)}
        onLicenseChanged={() => {
          loadData();
        }}
        currentUser={currentUser}
      />

      {/* BARRA INFERIOR DE STATUS DO PROGRAMA (Fina, acima da barra do Windows) */}
      <StatusBar
        statusMessage={statusMessage}
        isCapsLockActive={isCapsLockActive}
        onToggleCapsLock={() => setIsCapsLockActive(!isCapsLockActive)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenSerialLicenseModal={() => setIsSerialLicenseModalOpen(true)}
        currentUser={currentUser}
      />
    </div>
  );
}
