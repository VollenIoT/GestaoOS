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
import { fetchDashboardStats, fetchVisits, fetchOrders, fetchClients, createClient, updateOrder, deleteClient, updateVisit, deleteVisit } from './services/api';

import { EquipmentsModal } from './components/EquipmentsModal';
import { ServicesModal } from './components/ServicesModal';
import { WarrantyConfigModal } from './components/WarrantyConfigModal';
import { OrderStatusModal } from './components/OrderStatusModal';
import { CompanyModal, CompanyData, defaultCompanyData } from './components/CompanyModal';
import { SearchOSModal } from './components/SearchOSModal';
import { WallpaperModal } from './components/WallpaperModal';
import { PeriodOrdersReportModal } from './components/PeriodOrdersReportModal';
import { TechniciansModal } from './components/TechniciansModal';
import { FactoryResetModal } from './components/FactoryResetModal';
import { OSGeneralConfigModal } from './components/OSGeneralConfigModal';
import { PrinterConfigModal } from './components/PrinterConfigModal';
import { EstimatesModal } from './components/EstimatesModal';
import { CreateEstimateModal, Estimate } from './components/CreateEstimateModal';
import { OrderSequenceModal } from './components/OrderSequenceModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule'>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);

  // ESTADO DO CAPS LOCK (Ativo por padrão: transforma toda digitação em maiúscula)
  const [isCapsLockActive, setIsCapsLockActive] = useState<boolean>(true);

  // ESTADO DA BARRA DE STATUS DO RODAPÉ
  const [statusMessage, setStatusMessage] = useState<string>(
    'Vollen - Gestão de OS pronto e operando normalmente.'
  );

  // ESTADO DA LISTA DE PEÇAS COM ESTOQUE PERSISTIDO
  const [allParts, setAllParts] = useState<any[]>(() => {
    const defaultParts = [
      {
        id: 'part-1',
        code: '0001',
        name: 'BOMBA DE DRENAGEM BRASTEMP / CONSUL',
        costPrice: '45,00',
        profitMarginPercent: '50',
        techPrice: '65,00',
        finalPrice: '120,00',
        application: 'Lavadoras Brastemp / Consul 10kg a 15kg',
        stockQuantity: 15,
        minStock: 3,
      },
      {
        id: 'part-2',
        code: '0002',
        name: 'VÁLVULA DE ENTRADA DE ÁGUA DUPLA 127V',
        costPrice: '28,00',
        profitMarginPercent: '50',
        techPrice: '40,00',
        finalPrice: '85,00',
        application: 'Electrolux LTE09 / LTR10 / LST12',
        stockQuantity: 8,
        minStock: 2,
      },
    ];
    try {
      const saved = localStorage.getItem('vollen_parts_stock');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {}
    return defaultParts;
  });

  const saveParts = (newParts: any[]) => {
    setAllParts(newParts);
    try {
      localStorage.setItem('vollen_parts_stock', JSON.stringify(newParts));
    } catch (err) {}
  };

  // ESTADO DA LISTA DE SERVIÇOS CADASTRADOS
  const [allServices, setAllServices] = useState<any[]>([
    { id: 'srv-1', name: 'Higienização e Limpeza Completa', price: '150,00' },
    { id: 'srv-2', name: 'Carga de Gás Refrigerante R134a / R600a', price: '220,00' },
    { id: 'srv-3', name: 'Troca de Placa Eletrônica / Módulo', price: '180,00' },
    { id: 'srv-4', name: 'Desentupimento e Manutenção Preventiva', price: '120,00' },
  ]);

  // ESTADO DA LISTA DE EQUIPAMENTOS CADASTRADOS
  const [allEquipments, setAllEquipments] = useState<any[]>(() => {
    const defaultEquipments = [
      {
        id: 'eqp-1',
        code: '0001',
        type: 'Geladeira Frost Free',
        brand: 'Brastemp',
        model: 'BRM54JK',
        serialNumber: 'SN987654321',
      },
      {
        id: 'eqp-2',
        code: '0002',
        type: 'Lava e Seca',
        brand: 'Samsung',
        model: 'WD11M',
        serialNumber: 'SN123456789',
      },
      {
        id: 'eqp-3',
        code: '0003',
        type: 'Máquina de Lavar',
        brand: 'Electrolux',
        model: 'LES13',
        serialNumber: 'SN456789123',
      },
    ];
    try {
      const saved = localStorage.getItem('vollen_equipments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {}
    return defaultEquipments;
  });

  const saveEquipments = (newEquipments: any[]) => {
    setAllEquipments(newEquipments);
    try {
      localStorage.setItem('vollen_equipments', JSON.stringify(newEquipments));
    } catch (err) {}
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
  const [isFactoryResetModalOpen, setIsFactoryResetModalOpen] = useState<boolean>(false);
  const [isOSGeneralConfigModalOpen, setIsOSGeneralConfigModalOpen] = useState<boolean>(false);
  const [isPrinterConfigModalOpen, setIsPrinterConfigModalOpen] = useState<boolean>(false);

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
    try {
      const saved = localStorage.getItem('vollen_company_data');
      if (saved) return JSON.parse(saved);
    } catch (err) { }
    return defaultCompanyData;
  });
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState<boolean>(false);
  const [isSearchOSModalOpen, setIsSearchOSModalOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [isOrderSequenceModalOpen, setIsOrderSequenceModalOpen] = useState<boolean>(false);

  // ESTADO GLOBAL DA CONFIGURAÇÃO PADRÃO DE TERMOS DE GARANTIA E ORÇAMENTO DA OS
  const [defaultWarrantyConfig, setDefaultWarrantyConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('vollen_os_config');
      if (saved) return JSON.parse(saved);
    } catch (err) { }
    return {
      defaultDays: '90',
      defaultTerms: 'A garantia cobre defeitos de fabricação das peças substituídas e serviços executados pelo período especificado. Não cobre danos causados por mau uso, oscilações na rede elétrica, umidade ou intervenções de terceiros.',
      defaultCoverage: 'PECAS_E_MAO_DE_OBRA',
      defaultEstimateTerms: 'O orçamento possui validade de 10 dias. Equipamentos não retirados em até 90 dias após notificação estarão sujeitos a taxas de armazenamento ou descarte nos termos da lei.',
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
      if (Array.isArray(clientsData)) setAllClients(clientsData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Conversão suave de CAPS LOCK via CSS na classe do body ou quando aplicável
  useEffect(() => {
    if (isCapsLockActive) {
      document.body.classList.add('app-caps-active');
    } else {
      document.body.classList.remove('app-caps-active');
    }
  }, [isCapsLockActive]);

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
            if (nextFocusable instanceof HTMLInputElement) {
              nextFocusable.select();
            }
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
    isFactoryResetModalOpen ||
    isOSGeneralConfigModalOpen ||
    isOrderSequenceModalOpen ||
    isPrinterConfigModalOpen ||
    isEstimatesModalOpen ||
    isCreateEstimateModalOpen ||
    isCompanyModalOpen ||
    isSearchOSModalOpen ||
    isScheduleModalOpen
  );

  // Atalhos Globais de Teclado (F2, F5, F6, F7, F8) - Ativos APENAS na tela inicial
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
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
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
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
    setSelectedClientForNewOS(null);
    setOrderToEdit(prefilledOrder as any);
    setIsModalOpen(true);
    setStatusMessage(`Gerando Ordem de Serviço a partir do Orçamento #${estimate.code}...`);
  };

  const handleLogout = () => setCurrentUser(null);

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
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
        onOpenClientsModal={() => setIsClientsModalOpen(true)}
        onOpenPartsModal={() => setIsPartsModalOpen(true)}
        onOpenServicesModal={() => setIsServicesModalOpen(true)}
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
          setStatusMessage('Ordem de Serviço excluída definitivamente.');
        }}
        onSuccess={async (savedOrder?: any) => {
          if (estimateToConvertToOS) {
            setEstimates((prev) => {
              const updated = prev.filter((e) => e.id !== estimateToConvertToOS);
              try {
                localStorage.setItem('vollen_estimates', JSON.stringify(updated));
              } catch (err) {
                console.error('Erro ao remover orçamento convertido:', err);
              }
              return updated;
            });
            setEstimateToConvertToOS(null);
          }

          if (savedOrder) {
            setOrderToEdit(savedOrder);
          }

          await loadData();
          setStatusMessage('Ordem de Serviço salva com sucesso!');
        }}
        onFinalizeSuccess={async () => {
          if (estimateToConvertToOS) {
            setEstimates((prev) => {
              const updated = prev.filter((e) => e.id !== estimateToConvertToOS);
              try {
                localStorage.setItem('vollen_estimates', JSON.stringify(updated));
              } catch (err) { }
              return updated;
            });
            setEstimateToConvertToOS(null);
          }
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
          setEditingOrder(order);
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
          const maxNum = allEquipments.reduce((max, e) => {
            const num = parseInt(String(e.code || '').replace(/\D/g, ''), 10);
            return isNaN(num) ? max : Math.max(max, num);
          }, 0);
          const nextCode = String(maxNum + 1).padStart(4, '0');
          const newEq = {
            id: eqForm.id || String(Date.now()),
            code: eqForm.code ? String(eqForm.code).padStart(4, '0') : nextCode,
            type: eqForm.type || 'Equipamento Geral',
            brand: eqForm.brand || '',
            model: eqForm.model || '',
            serialNumber: eqForm.serialNumber || '',
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
            name: partForm.name || 'PEÇA SEM NOME',
            brand: partForm.brand || '',
            group: partForm.group || '',
            location: partForm.location || '',
            costPrice: partForm.costPrice || '',
            profitMarginPercent: partForm.profitMarginPercent || '',
            techPrice: partForm.techPrice || '',
            finalPrice: partForm.finalPrice || '0,00',
            application: partForm.application || '',
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
            name: serviceForm.name || 'SERVIÇO SEM NOME',
            price: serviceForm.price || '0,00',
          };
          setAllServices((prev) => {
            const exists = prev.some((s) => s.id === newService.id);
            if (exists) {
              return prev.map((s) => (s.id === newService.id ? newService : s));
            }
            return [newService, ...prev];
          });
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
        onDeletePart={(partId) => {
          setAllParts((prev) => prev.filter((p) => p.id !== partId));
          setStatusMessage('Peça excluída com sucesso.');
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
              serviceSelectCallback(service);
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
        onDeleteService={(serviceId) => {
          setAllServices((prev) => prev.filter((s) => s.id !== serviceId));
          setStatusMessage('Serviço excluído com sucesso.');
        }}
      />

      {/* NÍVEL 8: Modal de Seleção de Pasta e Criação de Backup */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      {/* Modal de Configuração de OS > Termos de Garantia e Orçamento Padrão */}
      <WarrantyConfigModal
        isOpen={isWarrantyConfigOpen}
        defaultDays={defaultWarrantyConfig.defaultDays}
        defaultTerms={defaultWarrantyConfig.defaultTerms}
        defaultCoverage={defaultWarrantyConfig.defaultCoverage}
        defaultEstimateTerms={defaultWarrantyConfig.defaultEstimateTerms}
        onClose={() => setIsWarrantyConfigOpen(false)}
        onSave={(newCfg) => {
          setDefaultWarrantyConfig(newCfg);
          localStorage.setItem('vollen_os_config', JSON.stringify(newCfg));
          setStatusMessage('Configurações padrão dos Termos de Garantia e Orçamento salvas com sucesso.');
        }}
      />

      {/* Modal de Gerenciamento de Status de OS */}
      <OrderStatusModal
        isOpen={isOrderStatusModalOpen}
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
          if (selectedOS.status === 'FINALIZADA' || selectedOS.status === 'CONCLUIDA') {
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
          await loadData();
          setStatusMessage('Padrão de fábrica restaurado com sucesso.');
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

      {/* NÍVEL 1: Central de Orçamentos */}
      <EstimatesModal
        isOpen={isEstimatesModalOpen}
        estimates={estimates}
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
        onClose={() => {
          setIsCreateEstimateModalOpen(false);
          setEstimateToEdit(null);
          setSelectedClientForNewOS(null);
        }}
        onSaveEstimate={handleSaveEstimate}
        onDeleteEstimate={handleDeleteEstimate}
        onGenerateOSFromEstimate={handleGenerateOSFromEstimate}
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

      {/* BARRA INFERIOR DE STATUS DO PROGRAMA (Fina, acima da barra do Windows) */}
      <StatusBar
        statusMessage={statusMessage}
        isCapsLockActive={isCapsLockActive}
        onToggleCapsLock={() => setIsCapsLockActive(!isCapsLockActive)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
      />
    </div>
  );
}
