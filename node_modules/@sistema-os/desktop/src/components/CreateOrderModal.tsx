import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Loader2, Save, MapPin, Wrench, User, FileText, Package, Cpu, Plus, Trash2, Ban, Trash, History, Calendar, ShieldCheck, Edit3, CheckCircle2, Printer, ChevronDown, FolderOpen } from 'lucide-react';
import { fetchAddressByCep, createClient, createOrder, updateOrder, deleteOrder, createVisit } from '../services/api';
import { ConfirmModal } from './ConfirmModal';
import { CompanyData, defaultCompanyData } from './CompanyModal';

interface CreateOrderModalProps {
  isOpen: boolean;
  clients?: any[];
  allOrders?: any[];
  availableParts?: any[];
  availableServices?: any[];
  availableEquipments?: any[];
  visits?: any[];
  selectedClient?: any;
  selectedPartForOS?: any;
  selectedServiceForOS?: any;
  orderToEdit?: any;
  currentUser?: any;
  onClose: () => void;
  onSuccess: (savedOrder?: any) => void;
  onFinalizeSuccess?: () => void;
  onOpenClientsModal?: () => void;
  onOpenPartsModal?: () => void;
  onOpenServicesModal?: () => void;
  onDeleteOrder?: (orderId: string) => void;
  onOpenClientHistory?: (clientName: string, clientId?: string) => void;
  onEditClient?: (clientData: any) => void;
  onUpdatePartsStock?: (updatedParts: any[]) => void;
  onSaveEquipment?: (equipment: any) => void;
  onOpenWarrantyOrder?: (targetOS: any) => void;
  onCreateWarrantyReturn?: (order: any) => void;
  totalOrders?: number;
  defaultWarrantyConfig?: {
    defaultDays: string;
    defaultTerms: string;
    defaultCoverage: string;
    defaultEntryTerms?: string;
    defaultEstimateTerms?: string;
    defaultExitTerms?: string;
  };
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  clients = [],
  allOrders = [],
  availableParts = [],
  availableServices = [],
  availableEquipments = [],
  visits = [],
  selectedClient,
  selectedPartForOS,
  selectedServiceForOS,
  orderToEdit,
  currentUser,
  totalOrders,
  defaultWarrantyConfig,
  onClose,
  onSuccess,
  onFinalizeSuccess,
  onOpenClientsModal,
  onOpenPartsModal,
  onOpenServicesModal,
  onDeleteOrder,
  onOpenClientHistory,
  onEditClient,
  onUpdatePartsStock,
  onSaveEquipment,
  onOpenWarrantyOrder,
  onCreateWarrantyReturn,
}) => {
  const [loadingCep, setLoadingCep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Status e Tipo da OS (Padrão: Orçamento)
  const [orderStatus, setOrderStatus] = useState<string>('ABERTA');
  const [orderType, setOrderType] = useState<'ORCAMENTO' | 'AGENDAMENTO'>('ORCAMENTO');

  // Aba ativa da OS
  const [activeTab, setActiveTab] = useState<'EQUIPMENT' | 'INFO' | 'SERVICES_PARTS' | 'AGENDAMENTO' | 'DATA' | 'WARRANTY'>('EQUIPMENT');

  // Form State - Termos e Opções de Garantia
  const [warrantyTermsData, setWarrantyTermsData] = useState({
    periodDays: '90',
    startDate: new Date().toISOString().split('T')[0],
    coverageType: 'PECAS_E_MAO_DE_OBRA',
    termsText: 'A garantia cobre defeitos de fabricação das peças substituídas e serviços executados pelo período especificado. Não cobre danos causados por mau uso, oscilações na rede elétrica, umidade ou intervenções de terceiros.',
    printTerms: true,
  });

  // Form State - Dados da Nota Fiscal (Garantia de Fábrica)
  const [nfData, setNfData] = useState({
    nfNumber: '',
    nfValue: '',
    purchaseDate: '',
    retailerName: '',
    cnpj: '',
    authorizedCode: '',
    guarantor: 'NAO_SE_APLICA',
    additionalNotes: '',
  });

  // Form State - Cliente
  const [clientData, setClientData] = useState({
    id: '',
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    cep: '',
    address: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    complement: '',
    reference: '',
  });

  // Form State - Equipamento
  const [equipmentData, setEquipmentData] = useState({
    code: '',
    type: '',
    brand: '',
    model: '',
    serialNumber: '',
    accessories: '',
    observations: '',
  });

  // Form State - Tipo de Garantia
  const [warrantyType, setWarrantyType] = useState<'GARANTIA_LOJA' | 'GARANTIA_FABRICA' | 'NAO_SE_APLICA'>('NAO_SE_APLICA');

  // Form State - Informações / Laudo & Agendamento
  const [problemDescription, setProblemDescription] = useState('');
  const [printProblemDescription, setPrintProblemDescription] = useState(true);
  const [printEquipmentObservations, setPrintEquipmentObservations] = useState(true);
  const [technicalReport, setTechnicalReport] = useState('');
  const [executedService, setExecutedService] = useState('');
  const [originalExecutedService, setOriginalExecutedService] = useState('');
  const [returnExecutedService, setReturnExecutedService] = useState('');
  const [reopenHistory, setReopenHistory] = useState<Array<{ date: string; reason: string; oldExitDate?: string; executedService?: string; returnExecutedService?: string }>>([]);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenStatus, setReopenStatus] = useState<string>('ABERTA');
  const [showReopenHistoryDetails, setShowReopenHistoryDetails] = useState(false);
  // Campos de vínculo de garantia (OS original → OS de retorno)
  const [originalOsCode, setOriginalOsCode] = useState<string>('');
  const [warrantyReturnOsCode, setWarrantyReturnOsCode] = useState<string>('');
  const [orderObservations, setOrderObservations] = useState('');
  const [printTechnicalReport, setPrintTechnicalReport] = useState(true);
  const [printServicesList, setPrintServicesList] = useState(true);
  const [printPartsList, setPrintPartsList] = useState(true);
  const [printMode, setPrintMode] = useState<'ENTRY_RECEIPT' | 'EXIT_RECEIPT' | 'ESTIMATE'>('ENTRY_RECEIPT');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [exitDate, setExitDate] = useState<string>('');
  const [originalExitDate, setOriginalExitDate] = useState<string>('');
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);
  const [activeEditingOrder, setActiveEditingOrder] = useState<any | null>(orderToEdit);
  // Form State - Finalização de OS
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [cardInstallments, setCardInstallments] = useState('1');
  const [advancePayment, setAdvancePayment] = useState('');
  const [isZeroValueWarranty, setIsZeroValueWarranty] = useState(false);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [secondaryPaymentMethod, setSecondaryPaymentMethod] = useState('DINHEIRO');
  const [secondaryPaymentAmount, setSecondaryPaymentAmount] = useState('');
  const [customWarrantyText, setCustomWarrantyText] = useState('');
  const [printExitReceipt, setPrintExitReceipt] = useState(true);
  const [finalizePrintDocument, setFinalizePrintDocument] = useState<'EXIT_RECEIPT' | 'ESTIMATE'>('EXIT_RECEIPT');
  const [customExitDate, setCustomExitDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendantName, setAttendantName] = useState<string>(() => {
    return orderToEdit?.attendant || orderToEdit?.attendantName || currentUser?.name || '';
  });
  const [auditHistory, setAuditHistory] = useState<Array<{ date: string; user?: string; changes?: string[] | any[]; description?: string }>>([]);
  const [isAuditHistoryModalOpen, setIsAuditHistoryModalOpen] = useState(false);
  const [isPartsReserved, setIsPartsReserved] = useState<boolean>(() => {
    return Boolean(orderToEdit?.isPartsReserved || orderToEdit?.status === 'ORCAMENTO_APROVADO' || orderToEdit?.status === 'APROVADO');
  });
  const [isLocalClientHistoryModalOpen, setIsLocalClientHistoryModalOpen] = useState(false);
  const [visitData, setVisitData] = useState({
    date: '',
    period: '',
    technicianName: '',
    notes: '',
  });

  const isAdmin = Boolean(
    !currentUser ||
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'admin' ||
    currentUser?.accessLevel === 'ADMIN' ||
    currentUser?.isAdmin === true ||
    currentUser?.username?.toLowerCase() === 'admin' ||
    (currentUser?.name || '').toLowerCase().includes('admin')
  );

  const canReopenOS = Boolean(
    isAdmin ||
    currentUser?.permissions?.reopenOS === true ||
    currentUser?.permissions?.reopenOS === undefined // padrão ativo se não especificado
  );

  const canDeleteOS = Boolean(
    isAdmin ||
    currentUser?.permissions?.deleteOS === true
  );

  const isCanceledOrder = Boolean(
    orderToEdit && (
      orderToEdit.status === 'CANCELADA' ||
      orderToEdit.status === 'CANCELADO'
    )
  );

  const isReadOnly = Boolean(
    orderToEdit && (
      orderToEdit.status === 'FINALIZADA' ||
      orderToEdit.status === 'CONCLUIDA' ||
      orderToEdit.status === 'GARANTIA_FINALIZADA' ||
      orderToEdit.status === 'GARANTIA/FINALIZADA' ||
      orderToEdit.status === 'CANCELADA' ||
      orderToEdit.status === 'CANCELADO'
    )
  );

  // Lista de todas as OS do cliente atual
  const clientHistoryOrders = React.useMemo(() => {
    if (!clientData.name.trim() && !clientData.id) return [];
    const clientNameLower = clientData.name.trim().toLowerCase();
    const clientId = clientData.id;

    return (allOrders || []).filter((o) => {
      const matchId = clientId && (o.clientId === clientId || o.client?.id === clientId);
      const matchName = clientNameLower && o.client?.name?.trim().toLowerCase() === clientNameLower;
      return Boolean(matchId || matchName);
    });
  }, [allOrders, clientData.id, clientData.name]);

  // Identifica toda a linhagem/árvore de retorno em garantia desta OS
  const warrantyLineage = React.useMemo(() => {
    if (!orderToEdit) return { activeReturn: null, finishedReturns: [], allPreviousOrders: [], accumulatedServices: [] };

    const currentId = orderToEdit.id;
    const currentCode = orderToEdit.code;

    // Encontra todas as OSs que foram geradas como retorno desta OS (direta ou indiretamente)
    const directReturns = (allOrders || []).filter(
      (o: any) => o.id !== currentId && (o.originalOsId === currentId || (currentCode && o.originalOsCode === currentCode))
    );

    // Encontra a OS de retorno que está atualmente ABERTA/EM ANDAMENTO (se houver)
    const activeReturn = directReturns.find(
      (o: any) => o.status !== 'FINALIZADA' && o.status !== 'CONCLUIDA' && o.status !== 'GARANTIA_FINALIZADA' && o.status !== 'GARANTIA/FINALIZADA' && o.status !== 'CANCELADA' && o.status !== 'CANCELADO'
    ) || null;

    // Encontra todas as OSs de retorno finalizadas desta OS
    const finishedReturns = directReturns.filter(
      (o: any) => o.status === 'FINALIZADA' || o.status === 'CONCLUIDA' || o.status === 'GARANTIA_FINALIZADA' || o.status === 'GARANTIA/FINALIZADA'
    );

    // Encontra todas as OSs anteriores na árvore (se esta OS for um retorno de outra)
    const allPreviousOrders: any[] = [];
    let checkPrevId = orderToEdit.originalOsId;
    let checkPrevCode = orderToEdit.originalOsCode;
    const visited = new Set<string>();

    while ((checkPrevId || checkPrevCode) && !visited.has(checkPrevId || checkPrevCode)) {
      visited.add(checkPrevId || checkPrevCode);
      const foundPrev = (allOrders || []).find(
        (o: any) => (checkPrevId && o.id === checkPrevId) || (checkPrevCode && o.code === checkPrevCode)
      );
      if (foundPrev) {
        allPreviousOrders.unshift(foundPrev);
        checkPrevId = foundPrev.originalOsId;
        checkPrevCode = foundPrev.originalOsCode;
      } else {
        break;
      }
    }

    // Coleta todos os serviços executados anteriores estruturados com data e OS
    const accumulatedServices: Array<{ osCode: string; date: string; service: string }> = [];
    allPreviousOrders.forEach((prevOrder) => {
      const srv = prevOrder.originalExecutedService || prevOrder.executedService || prevOrder.returnExecutedService;
      if (srv && srv.trim()) {
        accumulatedServices.push({
          osCode: prevOrder.code || 'OS Anterior',
          date: prevOrder.exitDate || prevOrder.entryDate || prevOrder.createdAt?.split('T')[0] || '',
          service: srv.trim(),
        });
      }
    });

    return {
      activeReturn,
      finishedReturns,
      allPreviousOrders,
      accumulatedServices,
    };
  }, [allOrders, orderToEdit]);

  // Modal para escolher aparelho do histórico do cliente
  const [isClientEquipmentsModalOpen, setIsClientEquipmentsModalOpen] = useState(false);
  const [isNewEquipmentModalOpen, setIsNewEquipmentModalOpen] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState('');

  // Aparelhos anteriores do cliente selecionado
  const clientPreviousEquipments = React.useMemo(() => {
    if (!clientData.name.trim() && !clientData.id) return [];
    const clientNameLower = clientData.name.trim().toLowerCase();
    const clientId = clientData.id;

    // Filtra apenas ordens encerradas deste cliente (FINALIZADA, CONCLUIDA ou CANCELADA)
    const ordersOfClient = allOrders.filter((o) => {
      const matchId = clientId && (o.clientId === clientId || o.client?.id === clientId);
      const matchName = clientNameLower && o.client?.name?.trim().toLowerCase() === clientNameLower;
      if (!matchId && !matchName) return false;

      const st = (o.status || '').toUpperCase();
      return st === 'FINALIZADA' || st === 'CONCLUIDA' || st === 'CANCELADA';
    });

    // Extrai aparelhos únicos
    const list: Array<{
      type: string;
      brand: string;
      model: string;
      serialNumber: string;
      code?: string;
      accessories?: string;
      lastOsCode?: string;
      lastOsDate?: string;
    }> = [];

    ordersOfClient.forEach((o) => {
      const eq = o.equipment;
      if (!eq) return;
      const type = (eq.type || '').trim();
      const brand = (eq.brand || '').trim();
      const model = (eq.model || '').trim();
      const serialNumber = (eq.serialNumber || '').trim();

      if (!type && !brand && !model && !serialNumber) return;

      // Chave única para não duplicar aparelhos idênticos
      const key = `${type}|${brand}|${model}|${serialNumber}`.toUpperCase();
      const alreadyExists = list.some(
        (item) => `${item.type}|${item.brand}|${item.model}|${item.serialNumber}`.toUpperCase() === key
      );

      if (!alreadyExists) {
        list.push({
          type,
          brand,
          model,
          serialNumber,
          code: eq.code || '',
          accessories: eq.accessories || '',
          lastOsCode: o.code || '',
          lastOsDate: o.createdAt ? new Date(o.createdAt).toLocaleDateString('pt-BR') : '',
        });
      }
    });

    return list;
  }, [allOrders, clientData.id, clientData.name]);

  // Form State - Dados da Empresa
  const [companyInfo, setCompanyInfo] = useState<CompanyData>(() => {
    try {
      const saved = localStorage.getItem('vollen_company_data');
      if (saved) return JSON.parse(saved);
    } catch (err) { }
    return defaultCompanyData;
  });

  // Lista de Técnicos cadastrados no sistema (sincronizado estritamente com Gestão de Técnicos e Usuários Técnicos)
  const [registeredTechnicians, setRegisteredTechnicians] = useState<string[]>(() => {
    try {
      const savedTechs = localStorage.getItem('vollen_technicians');
      if (savedTechs) {
        const parsed = JSON.parse(savedTechs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filtra apenas quem tem role TECNICO ou sem role específica em vollen_technicians, excluindo nomes mockados
          const list = parsed
            .filter((t: any) => (!t.role || t.role === 'TECNICO' || t.role === 'Técnico') && t.name !== 'Técnico Exemplo' && t.name !== 'Técnico Roberto')
            .map((t: any) => t.name)
            .filter(Boolean);
          if (list.length > 0) return Array.from(new Set(list));
        }
      }
      const savedUsers = localStorage.getItem('vollen_users');
      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
          const techUsers = parsedUsers
            .filter((u: any) => (u.role === 'Técnico' || u.role === 'TECNICO' || u.isTechnician === true) && u.name !== 'Técnico Exemplo')
            .map((u: any) => u.name || u.username)
            .filter(Boolean);
          if (techUsers.length > 0) return Array.from(new Set(techUsers));
        }
      }
    } catch (err) { }
    return [];
  });

  // Lista de Atendentes cadastrados no sistema (sincronizado com Gestão de Usuários)
  const [registeredAttendants, setRegisteredAttendants] = useState<string[]>(() => {
    try {
      const savedUsers = localStorage.getItem('vollen_users');
      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
          const attendants = parsedUsers
            .map((u: any) => (u.name || u.username || '').trim())
            .filter(Boolean);
          if (attendants.length > 0) return Array.from(new Set(attendants));
        }
      }
    } catch (err) { }
    return [];
  });

  React.useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('vollen_company_data');
        if (saved) setCompanyInfo(JSON.parse(saved));

        // Atualiza lista de atendentes reais cadastrados sem duplicidades
        const savedUsers = localStorage.getItem('vollen_users');
        if (savedUsers) {
          const parsedUsers = JSON.parse(savedUsers);
          if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
            const attendants = parsedUsers
              .map((u: any) => (u.name || u.username || '').trim())
              .filter(Boolean);
            setRegisteredAttendants(Array.from(new Set(attendants)));
          }
        }

        // Atualiza lista de técnicos cadastrados reais
        let techNames: string[] = [];
        const savedTechs = localStorage.getItem('vollen_technicians');
        if (savedTechs) {
          const parsed = JSON.parse(savedTechs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            techNames = parsed
              .filter((t: any) => (!t.role || t.role === 'TECNICO' || t.role === 'Técnico') && t.name !== 'Técnico Exemplo' && t.name !== 'Técnico Roberto')
              .map((t: any) => t.name)
              .filter(Boolean);
          }
        }
        if (techNames.length === 0 && savedUsers) {
          const parsedUsers = JSON.parse(savedUsers);
          if (Array.isArray(parsedUsers)) {
            techNames = parsedUsers
              .filter((u: any) => (u.role === 'Técnico' || u.role === 'TECNICO' || u.isTechnician === true) && u.name !== 'Técnico Exemplo')
              .map((u: any) => u.name || u.username)
              .filter(Boolean);
          }
        }
        setRegisteredTechnicians(Array.from(new Set(techNames)));

        // Carrega status sincronizados com a nuvem / cadastro de status
        const savedStatuses = localStorage.getItem('custom_os_statuses_v3');
        if (savedStatuses) {
          const parsedStatuses = JSON.parse(savedStatuses);
          if (Array.isArray(parsedStatuses) && parsedStatuses.length > 0) {
            setDynamicStatuses(parsedStatuses.sort((a: any, b: any) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999)));
          }
        }
      } catch (err) { }
    }
  }, [isOpen]);

  // Listener para sincronização em tempo real quando o modal estiver aberto
  React.useEffect(() => {
    if (!isOpen) return;
    let unsubStatuses = () => {};
    import('../services/firebase').then(({ db }) => {
      import('firebase/firestore').then(({ collection, onSnapshot }) => {
        unsubStatuses = onSnapshot(collection(db, 'os_statuses'), (snap) => {
          if (!snap.empty) {
            const list = snap.docs
              .map((d) => ({ id: d.id, ...d.data() } as any))
              .sort((a: any, b: any) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
            setDynamicStatuses(list);
            try {
              localStorage.setItem('custom_os_statuses_v3', JSON.stringify(list));
            } catch (e) {}
          }
        });
      });
    });
    return () => unsubStatuses();
  }, [isOpen]);

  // Status dinâmicos sincronizados com a nuvem e com o módulo Gestão de Status de OS
  const [dynamicStatuses, setDynamicStatuses] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('custom_os_statuses_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      { id: '1', name: 'ABERTA' },
      { id: '7', name: 'ORCAMENTO_APROVADO' },
      { id: '2', name: 'EM_ATENDIMENTO' },
      { id: '8', name: 'APROVADO' },
      { id: '3', name: 'AGUARDANDO_PECA' },
      { id: '4', name: 'APARELHO_LIBERADO' },
      { id: 'retorno', name: 'RETORNO_GARANTIA' },
      { id: '5', name: 'FINALIZADA' },
      { id: '6', name: 'CANCELADA' },
    ];
  });

  // Form State - Modal de Confirmação no padrão do sistema
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  // State para rastrear alterações não salvas (isDirty) e se a OS foi recém-salva (isSavedState)
  const [isDirty, setIsDirty] = useState(false);
  const [isSavedState, setIsSavedState] = useState(false);

  // Calcula com total precisão o próximo número de OS baseado no maior código existente ou na numeração inicial configurada
  const suggestedNextCode = React.useMemo(() => {
    let maxNum = 0;
    try {
      const customNext = localStorage.getItem('vollen_custom_next_os_number');
      if (customNext) {
        const initN = parseInt(String(customNext).replace(/\D/g, ''), 10);
        if (!isNaN(initN) && initN > 0) {
          maxNum = initN - 1;
        }
      } else {
        const prefsSaved = localStorage.getItem('vollen_os_preferences');
        if (prefsSaved) {
          const parsed = JSON.parse(prefsSaved);
          if (parsed.initialOrderNumber) {
            const initN = parseInt(String(parsed.initialOrderNumber).replace(/\D/g, ''), 10);
            if (!isNaN(initN) && initN > 0) {
              maxNum = initN - 1;
            }
          }
        }
      }
    } catch {}

    (allOrders || []).forEach((o) => {
      if (o?.code) {
        const n = parseInt(String(o.code).replace(/\D/g, ''), 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });
    return `OS-${String(maxNum + 1).padStart(4, '0')}`;
  }, [allOrders]);

  // Lote de Ordens de Serviço criadas nesta sessão para o mesmo cliente (múltiplos aparelhos)
  const [sessionBatchOrders, setSessionBatchOrders] = useState<any[]>([]);
  const [batchCounterOffset, setBatchCounterOffset] = useState<number>(0);

  // Modal para escolher quais OS imprimir quando houver múltiplas criadas na sessão
  const [isBatchPrintModalOpen, setIsBatchPrintModalOpen] = useState(false);
  const [pendingPrintMode, setPendingPrintMode] = useState<'ENTRY_RECEIPT' | 'EXIT_RECEIPT' | 'ESTIMATE'>('ENTRY_RECEIPT');
  const [selectedBatchOrderIds, setSelectedBatchOrderIds] = useState<string[]>([]);

  // Manipulador seguro para fechar a OS (exibe confirmação apenas se o formulário for alterado)
  const handleRequestClose = () => {
    if (isDirty) {
      setConfirmDialog({
        isOpen: true,
        title: 'Sair sem Salvar',
        message: 'Você alterou informações nesta Ordem de Serviço que ainda não foram salvas. Deseja realmente sair sem salvar?',
        confirmText: 'Sim, Sair sem Salvar',
        variant: 'warning',
        onConfirm: () => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setIsDirty(false);
          setIsSavedState(false);
          onClose();
        },
      });
    } else {
      setIsSavedState(false);
      onClose();
    }
  };

  // Event Listener para tecla ESC com hierarquia de modais
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !isOpen) return;

      // 1. Se o Modal de Histórico de Alterações da OS estiver aberto, fecha apenas ele
      if (isAuditHistoryModalOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIsAuditHistoryModalOpen(false);
        return;
      }

      // 2. Se o Modal de Histórico de OS do Cliente estiver aberto, fecha apenas ele
      if (isLocalClientHistoryModalOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIsLocalClientHistoryModalOpen(false);
        return;
      }

      // 3. Se o Modal de Escolha de Aparelhos do Cliente estiver aberto, fecha apenas ele
      if (isClientEquipmentsModalOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIsClientEquipmentsModalOpen(false);
        return;
      }

      // 4. Se o Modal de Detalhes de Retorno/Reabertura estiver aberto, fecha apenas ele
      if (showReopenHistoryDetails) {
        e.preventDefault();
        e.stopPropagation();
        setShowReopenHistoryDetails(false);
        return;
      }

      // 5. Se o Modal de Confirmação de Saída ou Finalização estiver aberto, não fecha direto
      if (confirmDialog.isOpen || isFinalizeModalOpen) {
        return;
      }

      // 6. Caso contrário, solicita o fechamento normal da Ordem de Serviço
      e.preventDefault();
      handleRequestClose();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    isOpen,
    isDirty,
    isAuditHistoryModalOpen,
    isLocalClientHistoryModalOpen,
    isClientEquipmentsModalOpen,
    showReopenHistoryDetails,
    confirmDialog.isOpen,
    isFinalizeModalOpen,
  ]);

  // Form State - Menu Dropdown de Impressões
  const [showPrintMenu, setShowPrintMenu] = useState<boolean>(false);
  const printMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (printMenuRef.current && !printMenuRef.current.contains(event.target as Node)) {
        setShowPrintMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Form State - Hora de Emissão do Comprovante
  const [printTime, setPrintTime] = useState<string>('');

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('vollen_company_data');
      if (saved) setCompanyInfo(JSON.parse(saved));
    } catch (err) { }
  }, [isOpen]);

  // Form State - Serviços Adicionados
  const [servicesList, setServicesList] = useState<Array<{ name: string; price: string }>>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  // Form State - Peças Utilizadas
  const [partsList, setPartsList] = useState<Array<{ code: string; name: string; qty: number; price: string; separated?: boolean }>>([]);
  const [newPartCode, setNewPartCode] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newPartQty, setNewPartQty] = useState<number>(1);
  const [newPartPrice, setNewPartPrice] = useState('');

  // Form State - Valores Financeiros da OS (Deslocamento e Desconto)
  const [travelCost, setTravelCost] = useState<string>('0,00');
  const [discountCost, setDiscountCost] = useState<string>('0,00');

  // Helper para formatar moeda brasileira ao perder o foco (blur ou enter)
  const formatCurrencyOnBlur = (val: string): string => {
    if (!val || val.trim() === '') return '0,00';
    let clean = val.trim().replace(/\s/g, '').replace('R$', '');

    // Trata virgula ou ponto digitado no final (ex: "45," -> "45" ou "20." -> "20")
    if (clean.endsWith(',') || clean.endsWith('.')) {
      clean = clean.slice(0, -1);
    }

    // Substitui vírgulas decimais por ponto para parse seguro
    if (clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    }

    const num = parseFloat(clean);
    if (isNaN(num)) return '0,00';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Cálculo da Validade da Garantia de Fábrica (1 ano a partir da data de compra/emissão da NF)
  const factoryWarrantyInfo = React.useMemo(() => {
    if (!nfData.purchaseDate) {
      return {
        isValid: false,
        message: 'Informe a Data da Compra / Emissão da NF na aba Dados para calcular a garantia de fábrica.',
        badgeColor: 'bg-slate-100 border-slate-300 text-slate-600',
      };
    }

    try {
      const [year, month, day] = nfData.purchaseDate.split('-').map(Number);
      const purchaseDateObj = new Date(year, month - 1, day);

      // Validade: +1 Ano (365 dias ou exatos 12 meses)
      const expirationDateObj = new Date(purchaseDateObj);
      expirationDateObj.setFullYear(expirationDateObj.getFullYear() + 1);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffTime = expirationDateObj.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const formattedExpiration = expirationDateObj.toLocaleDateString('pt-BR');

      if (diffDays > 0) {
        return {
          isValid: true,
          daysRemaining: diffDays,
          expirationDate: formattedExpiration,
          message: `Garantia de Fábrica VÁLIDA até ${formattedExpiration} (Resta(m) ${diffDays} dia(s)).`,
          badgeColor: 'bg-emerald-50 border-emerald-300 text-emerald-900',
        };
      } else {
        const expiredDaysAgo = Math.abs(diffDays);
        return {
          isValid: false,
          daysRemaining: 0,
          expirationDate: formattedExpiration,
          message: `Garantia de Fábrica EXPIRADA em ${formattedExpiration} (Vencida há ${expiredDaysAgo} dia(s)).`,
          badgeColor: 'bg-red-50 border-red-300 text-red-900',
        };
      }
    } catch (err) {
      return {
        isValid: false,
        message: 'Data de compra inválida.',
        badgeColor: 'bg-slate-100 border-slate-300 text-slate-600',
      };
    }
  }, [nfData.purchaseDate]);

  // Cálculo do Tempo Restante de Garantia em relação à Data de Saída
  const companyReturnWarrantyInfo = React.useMemo(() => {
    // Tenta usar a Data de Saída da OS ou a Data de Início da Garantia informada
    const baseDateStr = exitDate || warrantyTermsData.startDate;

    if (!baseDateStr) {
      return {
        isValid: false,
        message: 'Defina a Data de Saída (no topo da OS) ou a Data de Início da Garantia para calcular o tempo restante.',
        badgeColor: 'bg-slate-100 border-slate-300 text-slate-600',
      };
    }

    const days = parseInt(warrantyTermsData.periodDays || '90', 10);
    if (isNaN(days) || days <= 0) {
      return {
        isValid: false,
        message: 'Selecione um tempo de garantia válido para calcular o retorno.',
        badgeColor: 'bg-slate-100 border-slate-300 text-slate-600',
      };
    }

    try {
      const [year, month, day] = baseDateStr.split('-').map(Number);
      const startDateObj = new Date(year, month - 1, day);

      const expirationDateObj = new Date(startDateObj);
      expirationDateObj.setDate(expirationDateObj.getDate() + days);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffTime = expirationDateObj.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const formattedExpiration = expirationDateObj.toLocaleDateString('pt-BR');
      const formattedStart = startDateObj.toLocaleDateString('pt-BR');

      if (diffDays > 0) {
        return {
          isValid: true,
          daysRemaining: diffDays,
          expirationDate: formattedExpiration,
          startDate: formattedStart,
          message: `Retorno em Garantia DENTRO DO PRAZO! Válida até ${formattedExpiration} (Resta(m) ${diffDays} dia(s) de garantia).`,
          badgeColor: 'bg-purple-50 border-purple-300 text-purple-950',
        };
      } else {
        const expiredDaysAgo = Math.abs(diffDays);
        return {
          isValid: false,
          daysRemaining: 0,
          expirationDate: formattedExpiration,
          startDate: formattedStart,
          message: `Retorno FORA DA GARANTIA. A garantia venceu em ${formattedExpiration} (Expirou há ${expiredDaysAgo} dia(s)).`,
          badgeColor: 'bg-red-50 border-red-300 text-red-950',
        };
      }
    } catch (err) {
      return {
        isValid: false,
        message: 'Data de início/saída inválida.',
        badgeColor: 'bg-slate-100 border-slate-300 text-slate-600',
      };
    }
  }, [exitDate, warrantyTermsData.startDate, warrantyTermsData.periodDays]);

  // Cálculos Automáticos de Totais
  const totalPartsVal = partsList.reduce((acc, p) => {
    const val = parseFloat((p.price || '0').replace('.', '').replace(',', '.')) || 0;
    return acc + val * (p.qty || 1);
  }, 0);

  const totalServicesVal = servicesList.reduce((acc, s) => {
    const val = parseFloat((s.price || '0').replace('.', '').replace(',', '.')) || 0;
    return acc + val;
  }, 0);

  const travelVal = parseFloat((travelCost || '0').replace('.', '').replace(',', '.')) || 0;
  const discountVal = parseFloat((discountCost || '0').replace('.', '').replace(',', '.')) || 0;
  const rawGrandTotal = Math.max(0, totalPartsVal + totalServicesVal + travelVal - discountVal);
  const isWarrantyZeroActive = Boolean(isZeroValueWarranty && (orderStatus === 'RETORNO_GARANTIA' || orderStatus === 'GARANTIA_FINALIZADA' || Boolean(originalOsCode)));
  const grandTotalVal = isWarrantyZeroActive ? 0 : rawGrandTotal;

  // Ref para controlar a OS anteriormente carregada
  const prevOrderRef = React.useRef<any>(null);
  const prevIsOpenRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      prevOrderRef.current = null;
      return;
    }

    const isOpening = !prevIsOpenRef.current;
    prevIsOpenRef.current = true;
    prevOrderRef.current = orderToEdit;

    // Reseta submodais internos ao abrir ou trocar de OS
    setIsAuditHistoryModalOpen(false);
    setIsLocalClientHistoryModalOpen(false);
    setIsClientEquipmentsModalOpen(false);
    setShowReopenHistoryDetails(false);
    setIsFinalizeModalOpen(false);

    setSessionBatchOrders([]);
    setActiveEditingOrder(orderToEdit);
    if (orderToEdit) {
      // MODO EDIÇÃO: Carrega todos os campos da OS existente
      const matchedClient = (clients && Array.isArray(clients))
        ? clients.find((cl) => cl.id === orderToEdit.clientId || cl.id === orderToEdit.client?.id)
        : null;
      const c = matchedClient || orderToEdit.client || {};
      const eq = orderToEdit.equipment || {};
      const orderVisits = (orderToEdit.visits && Array.isArray(orderToEdit.visits) && orderToEdit.visits.length > 0)
          ? orderToEdit.visits
          : visits.filter((v) =>
            (v.orderId && String(v.orderId) === String(orderToEdit.id)) ||
            (v.order?.id && String(v.order.id) === String(orderToEdit.id)) ||
            (v.order?.code && orderToEdit.code && String(v.order.code) === String(orderToEdit.code))
          );
        const firstVisit = orderVisits[0] || {};

        setSelectedClientId(c.id || orderToEdit.clientId || '');
        setClientData({
          id: c.id || orderToEdit.clientId || '',
          name: c.name || '',
          phone: c.phone || '',
          whatsapp: c.whatsapp || '',
          email: c.email || '',
          cep: c.cep || '',
          address: c.address || '',
          number: c.number || '',
          neighborhood: c.neighborhood || '',
          city: c.city || '',
          state: c.state || '',
          complement: c.complement || '',
          reference: c.reference || '',
        });
        setEquipmentData({
          code: eq.code || '',
          type: eq.type || '',
          brand: eq.brand || '',
          model: eq.model || '',
          serialNumber: eq.serialNumber || '',
          accessories: eq.accessories || '',
          observations: eq.observations || '',
        });
        setProblemDescription(orderToEdit.problemDescription || '');
        setTechnicalReport(orderToEdit.technicalReport || '');
        setOrderObservations(orderToEdit.orderObservations || orderToEdit.observations || orderToEdit.generalNotes || '');
        setOrderStatus(orderToEdit.status || 'ABERTA');
        setOrderType(orderToEdit.type || 'ORCAMENTO');
        setWarrantyType(orderToEdit.warrantyType || 'NAO_SE_APLICA');
        setAttendantName(orderToEdit.attendant || orderToEdit.attendantName || '');
        setAuditHistory(orderToEdit.auditHistory && Array.isArray(orderToEdit.auditHistory) ? orderToEdit.auditHistory : []);
        const rawPartsInitial = orderToEdit.partsUsed || orderToEdit.parts || orderToEdit.partsList || firstVisit?.partsUsed || firstVisit?.parts || [];
        const existingPartsList = Array.isArray(rawPartsInitial) ? rawPartsInitial : [];
        const hasSeparatedParts = existingPartsList.some((p: any) => Boolean(p.separated));
        setIsPartsReserved(Boolean(orderToEdit.isPartsReserved || hasSeparatedParts));
        // Carrega vínculos de garantia
        setOriginalOsCode(orderToEdit.originalOsCode || '');
        setWarrantyReturnOsCode(orderToEdit.warrantyReturnOsCode || '');

        const loadedEntry = orderToEdit.entryDate
          ? (orderToEdit.entryDate.includes('T') ? orderToEdit.entryDate.split('T')[0] : orderToEdit.entryDate)
          : (orderToEdit.createdAt ? (orderToEdit.createdAt.includes('T') ? orderToEdit.createdAt.split('T')[0] : orderToEdit.createdAt) : new Date().toISOString().split('T')[0]);
        setEntryDate(loadedEntry);

        const loadedExit = orderToEdit.exitDate
          ? (orderToEdit.exitDate.includes('T') ? orderToEdit.exitDate.split('T')[0] : orderToEdit.exitDate)
          : '';
        setExitDate(loadedExit);

        // Carrega termos de garantia salvos na OS
        const savedTerms = orderToEdit.warrantyTermsData || {};
        setWarrantyTermsData({
          periodDays: savedTerms.periodDays || defaultWarrantyConfig?.defaultDays || '90',
          startDate: savedTerms.startDate || (loadedExit || loadedEntry || new Date().toISOString().split('T')[0]),
          coverageType: savedTerms.coverageType || defaultWarrantyConfig?.defaultCoverage || 'PECAS_E_MAO_DE_OBRA',
          termsText: savedTerms.termsText || defaultWarrantyConfig?.defaultTerms || 'A garantia cobre defeitos de fabricação das peças substituídas e serviços executados pelo período especificado.',
          printTerms: savedTerms.printTerms !== false,
        });

        // Carrega Dados da Nota Fiscal e Informações Complementares
        let parsedAdditionalNotes = orderToEdit.additionalNotes || '';
        let parsedReopenHistory: Array<{ date: string; reason: string; oldExitDate?: string }> = [];
        let parsedOriginalExitDate = '';

        if (parsedAdditionalNotes.includes('___REOPEN_HISTORY___')) {
          try {
            const parts = parsedAdditionalNotes.split('___REOPEN_HISTORY___');
            parsedAdditionalNotes = parts[0] || '';
            parsedReopenHistory = JSON.parse(parts[1]);
            if (parsedReopenHistory.length > 0 && parsedReopenHistory[0].oldExitDate) {
              parsedOriginalExitDate = parsedReopenHistory[0].oldExitDate;
            }
          } catch (e) { }
        }

        const loadedExitDate = orderToEdit.exitDate
          ? new Date(orderToEdit.exitDate).toISOString().split('T')[0]
          : (orderToEdit.status === 'FINALIZADA' ? (orderToEdit.updatedAt ? new Date(orderToEdit.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]) : '');

        setReopenHistory(parsedReopenHistory);
        setOriginalExitDate(parsedOriginalExitDate || loadedExitDate);
        // Só sobrescreve exitDate se já não foi definido corretamente na linha 874
        if (parsedOriginalExitDate) {
          setExitDate(parsedOriginalExitDate);
        } else if (loadedExitDate) {
          setExitDate(loadedExitDate);
        }

        // Extrai servico executado original congelado se existir
        // Carrega histórico de alterações da OS se houver
        if (orderToEdit.auditHistory && Array.isArray(orderToEdit.auditHistory)) {
          setAuditHistory(orderToEdit.auditHistory);
        } else {
          setAuditHistory([]);
        }

        if (orderToEdit.attendant || orderToEdit.attendantName) {
          setAttendantName(orderToEdit.attendant || orderToEdit.attendantName || '');
        }

        let parsedOriginalService = '';
        let parsedReturnService = '';
        if (parsedAdditionalNotes.includes('___ORIGINAL_SERVICE___')) {
          try {
            const sParts = parsedAdditionalNotes.split('___ORIGINAL_SERVICE___');
            parsedAdditionalNotes = sParts[0] || '';
            const sub = sParts[1] || '';
            if (sub.includes('___RETURN_SERVICE___')) {
              const subParts = sub.split('___RETURN_SERVICE___');
              parsedOriginalService = subParts[0] || '';
              parsedReturnService = subParts[1] || '';
            } else {
              parsedOriginalService = sub;
            }
          } catch (e) { }
        }

        let foundOrigServiceFromLinked = '';
        if (!parsedOriginalService && !orderToEdit.originalExecutedService && (orderToEdit.originalOsCode || orderToEdit.originalOsId)) {
          const linkedOrig = (allOrders || []).find(
            (o: any) => (orderToEdit.originalOsCode && o.code === orderToEdit.originalOsCode) || (orderToEdit.originalOsId && o.id === orderToEdit.originalOsId)
          );
          if (linkedOrig) {
            foundOrigServiceFromLinked = linkedOrig.executedService || linkedOrig.originalExecutedService || '';
          }
        }

        const finalOrigService = parsedOriginalService || orderToEdit.originalExecutedService || foundOrigServiceFromLinked || orderToEdit.executedService || '';
        setOriginalExecutedService(finalOrigService);
        setReturnExecutedService(parsedReturnService || orderToEdit.returnExecutedService || '');
        setExecutedService(orderToEdit.executedService || parsedOriginalService || '');

        setNfData({
          nfNumber: orderToEdit.nfNumber || '',
          nfValue: orderToEdit.nfValue || '',
          purchaseDate: orderToEdit.purchaseDate || '',
          retailerName: orderToEdit.retailerName || '',
          cnpj: orderToEdit.cnpj || '',
          authorizedCode: orderToEdit.authorizedCode || '',
          guarantor: orderToEdit.guarantor || 'NAO_SE_APLICA',
          additionalNotes: parsedAdditionalNotes,
        });
        setTravelCost(orderToEdit.travelCost || '0,00');
        setDiscountCost(orderToEdit.discountCost || '0,00');
        setAdvancePayment(orderToEdit.advancePayment || '0,00');
        setIsZeroValueWarranty(Boolean(orderToEdit.isZeroValueWarranty));

        if (firstVisit && (firstVisit.id || firstVisit.date)) {
          setVisitData({
            date: firstVisit.date ? (firstVisit.date.includes('T') ? firstVisit.date.split('T')[0] : firstVisit.date) : '',
            period: firstVisit.period || '',
            technicianName: firstVisit.technicianName || orderToEdit.technician || '',
            notes: firstVisit.notes || '',
          });
        } else {
          setVisitData({
            date: '',
            period: '',
            technicianName: orderToEdit.technician || '',
            notes: '',
          });
        }

        // Carrega peças existentes da OS (compatível com partsUsed, parts, partsList e visits)
        const rawParts = orderToEdit.partsUsed || orderToEdit.parts || orderToEdit.partsList || firstVisit?.partsUsed || firstVisit?.parts || [];
        const existingParts = Array.isArray(rawParts) ? rawParts : [];

        if (existingParts.length > 0) {
          setPartsList(existingParts.map((p: any) => ({
            code: p.code || p.partCode || '0001',
            name: p.name || p.partName || p.description || '',
            qty: Number(p.qty || p.quantity || 1),
            price: (p.price || p.unitPrice || '0,00').toString(),
            separated: Boolean(p.separated),
          })));
        } else {
          setPartsList([]);
        }

        // Carrega serviços existentes da OS (compatível com servicesExecuted, services e servicesList)
        const existingServices = (orderToEdit.servicesExecuted && Array.isArray(orderToEdit.servicesExecuted) && orderToEdit.servicesExecuted.length > 0)
          ? orderToEdit.servicesExecuted
          : (orderToEdit.services && Array.isArray(orderToEdit.services) && orderToEdit.services.length > 0)
            ? orderToEdit.services
            : (orderToEdit.servicesList && Array.isArray(orderToEdit.servicesList) && orderToEdit.servicesList.length > 0)
              ? orderToEdit.servicesList
              : (firstVisit && firstVisit.servicesExecuted && Array.isArray(firstVisit.servicesExecuted) && firstVisit.servicesExecuted.length > 0)
                ? firstVisit.servicesExecuted
                : (firstVisit && firstVisit.services && Array.isArray(firstVisit.services) && firstVisit.services.length > 0)
                  ? firstVisit.services
                  : [];

        if (existingServices.length > 0) {
          setServicesList(existingServices.map((s: any) => ({
            name: s.name || s.description || '',
            price: (s.price || '0,00').toString(),
          })));
        } else {
          setServicesList([]);
        }

        if (isOpening) {
          setActiveTab('EQUIPMENT');
        }
        setIsDirty(false);
      } else if (isOpening && selectedClient) {
        setSelectedClientId(selectedClient.id || '');
        setClientData({
          id: selectedClient.id || '',
          name: selectedClient.name || '',
          phone: selectedClient.phone || '',
          whatsapp: selectedClient.whatsapp || '',
          email: selectedClient.email || '',
          cep: selectedClient.cep || '',
          address: selectedClient.address || '',
          number: selectedClient.number || '',
          neighborhood: selectedClient.neighborhood || '',
          city: selectedClient.city || '',
          state: selectedClient.state || '',
          complement: selectedClient.complement || '',
          reference: selectedClient.reference || '',
        });
        setEquipmentData({
          code: '',
          type: '',
          brand: '',
          model: '',
          serialNumber: '',
          accessories: '',
          observations: '',
        });
        setProblemDescription('');
        setTechnicalReport('');
        setOrderObservations('');
        setExecutedService('');
        setOriginalExecutedService('');
        setReturnExecutedService('');
        setOrderStatus('ABERTA');
        setOrderType('ORCAMENTO');
        setWarrantyType('NAO_SE_APLICA');
        setEntryDate(new Date().toISOString().split('T')[0]);
        setExitDate('');
        setServicesList([]);
        setPartsList([]);
        setAuditHistory([]);
        setReopenHistory([]);
        setVisitData({
          date: '',
          period: '',
          technicianName: '',
          notes: '',
        });
        setNfData({
          nfNumber: '',
          nfValue: '',
          purchaseDate: '',
          retailerName: '',
          cnpj: '',
          authorizedCode: '',
          guarantor: 'NAO_SE_APLICA',
          additionalNotes: '',
        });
        setWarrantyTermsData({
          periodDays: defaultWarrantyConfig?.defaultDays || '90',
          startDate: new Date().toISOString().split('T')[0],
          coverageType: defaultWarrantyConfig?.defaultCoverage || 'PECAS_E_MAO_DE_OBRA',
          termsText: defaultWarrantyConfig?.defaultTerms || 'A garantia cobre defeitos de fabricação das peças substituídas e serviços executados pelo período especificado.',
          printTerms: true,
        });
        setTravelCost('0,00');
        setDiscountCost('0,00');
        setAdvancePayment('0,00');
        setIsZeroValueWarranty(false);
        setActiveTab('EQUIPMENT');
        setIsDirty(false);
        setIsSavedState(false);
      } else if (isOpening || !orderToEdit) {
        setSelectedClientId('');
        setClientData({
          id: '',
          name: '',
          phone: '',
          whatsapp: '',
          email: '',
          cep: '',
          address: '',
          number: '',
          neighborhood: '',
          city: '',
          state: '',
          complement: '',
          reference: '',
        });
        setEquipmentData({
          code: '',
          type: '',
          brand: '',
          model: '',
          serialNumber: '',
          accessories: '',
          observations: '',
        });
        setProblemDescription('');
        setTechnicalReport('');
        setOrderObservations('');
        setExecutedService('');
        setOriginalExecutedService('');
        setReturnExecutedService('');
        setOrderStatus('ABERTA');
        setOrderType('ORCAMENTO');
        setWarrantyType('NAO_SE_APLICA');
        setEntryDate(new Date().toISOString().split('T')[0]);
        setExitDate('');
        setServicesList([]);
        setPartsList([]);
        setAuditHistory([]);
        setReopenHistory([]);
        setVisitData({
          date: '',
          period: '',
          technicianName: '',
          notes: '',
        });
        setNfData({
          nfNumber: '',
          nfValue: '',
          purchaseDate: '',
          retailerName: '',
          cnpj: '',
          authorizedCode: '',
          guarantor: 'NAO_SE_APLICA',
          additionalNotes: '',
        });
        setWarrantyTermsData({
          periodDays: defaultWarrantyConfig?.defaultDays || '90',
          startDate: new Date().toISOString().split('T')[0],
          coverageType: defaultWarrantyConfig?.defaultCoverage || 'PECAS_E_MAO_DE_OBRA',
          termsText: defaultWarrantyConfig?.defaultTerms || 'A garantia cobre defeitos de fabricação das peças substituídas e serviços executados pelo período especificado.',
          printTerms: true,
        });
        setAttendantName(currentUser?.name || '');
        setTravelCost('0,00');
        setDiscountCost('0,00');
        setAdvancePayment('0,00');
        setIsZeroValueWarranty(false);
        setActiveTab('EQUIPMENT');
        setIsDirty(false);
        setIsSavedState(false);
      }
  }, [isOpen, orderToEdit, currentUser]);

  // Sincroniza atualização instantânea do cliente quando editado externamente
  React.useEffect(() => {
    if (selectedClient && selectedClient.name) {
      setClientData({
        id: selectedClient.id || '',
        name: selectedClient.name || '',
        phone: selectedClient.phone || '',
        whatsapp: selectedClient.whatsapp || '',
        email: selectedClient.email || '',
        cep: selectedClient.cep || '',
        address: selectedClient.address || '',
        number: selectedClient.number || '',
        neighborhood: selectedClient.neighborhood || '',
        city: selectedClient.city || '',
        state: selectedClient.state || '',
        complement: selectedClient.complement || '',
        reference: selectedClient.reference || '',
      });
    }
  }, [selectedClient]);

  React.useEffect(() => {
    if (selectedPartForOS) {
      const code = selectedPartForOS.code || '0001';
      const name = selectedPartForOS.name || '';
      const price = selectedPartForOS.finalPrice || selectedPartForOS.price || '0,00';
      setPartsList((prev) => {
        const existing = prev.findIndex((p) => p.code === code && p.name === name);
        if (existing >= 0) {
          // Já existe: incrementa quantidade
          return prev.map((p, i) => i === existing ? { ...p, qty: (p.qty || 1) + 1 } : p);
        }
        return [...prev, { code, name, qty: 1, price }];
      });
      setNewPartCode('');
      setNewPartName('');
      setNewPartQty(1);
      setNewPartPrice('');
      setActiveTab('SERVICES_PARTS');
    }
  }, [selectedPartForOS]);

  React.useEffect(() => {
    if (selectedServiceForOS) {
      const name = selectedServiceForOS.name || selectedServiceForOS.description || '';
      const price = selectedServiceForOS.price || selectedServiceForOS.finalPrice || '0,00';
      setServicesList((prev) => {
        const existing = prev.findIndex((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
        if (existing >= 0) {
          // Já existe: não duplica (serviço idêntico)
          return prev;
        }
        return [...prev, { name, price }];
      });
      setNewServiceName('');
      setNewServicePrice('');
      setActiveTab('SERVICES_PARTS');
    }
  }, [selectedServiceForOS]);

  if (!isOpen) return null;

  const handleAddService = () => {
    if (!newServiceName.trim()) return alert('Informe a descrição do serviço.');
    const nameToAdd = newServiceName.trim();
    setServicesList((prev) => {
      const existing = prev.findIndex((s) => s.name.trim().toLowerCase() === nameToAdd.toLowerCase());
      if (existing >= 0) {
        // Já existe: não duplica
        return prev;
      }
      return [...prev, { name: nameToAdd, price: newServicePrice.trim() || '0,00' }];
    });
    setNewServiceName('');
    setNewServicePrice('');
  };

  const handleRemoveService = (idx: number) => {
    setServicesList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddPart = () => {
    if (!newPartName.trim()) return alert('Informe o nome da peça.');
    const codeToAdd = newPartCode.trim() || '0001';
    const nameToAdd = newPartName.trim();
    const qtyToAdd = newPartQty > 0 ? newPartQty : 1;
    setPartsList((prev) => {
      const existing = prev.findIndex((p) => p.code === codeToAdd && p.name === nameToAdd);
      if (existing >= 0) {
        // Já existe: soma a quantidade
        return prev.map((p, i) => i === existing ? { ...p, qty: (p.qty || 1) + qtyToAdd } : p);
      }
      return [...prev, { code: codeToAdd, name: nameToAdd, qty: qtyToAdd, price: newPartPrice.trim() || '0,00' }];
    });
    setNewPartCode('');
    setNewPartName('');
    setNewPartQty(1);
    setNewPartPrice('');
  };

  const handleRemovePart = (idx: number) => {
    const partToRemove = partsList[idx];
    if (partToRemove && partToRemove.separated) {
      // Se a peça já estava separada/baixada no estoque, estorna a quantidade ao estoque
      const qtyToRestore = Number(partToRemove.qty || 1);
      const norm = (val: any) => String(val || '').trim().toLowerCase();
      const numClean = (val: any) => String(val || '').replace(/\D/g, '');

      const pNormName = norm(partToRemove.name);
      const pNormCode = norm(partToRemove.code);
      const pCleanCode = numClean(partToRemove.code);

      const updatedParts = (availableParts || []).map((p: any) => {
        const sNormName = norm(p.name);
        const sNormCode = norm(p.code);
        const sCleanCode = numClean(p.code);
        const sId = norm(p.id);

        const match =
          (pNormCode && sNormCode && pNormCode === sNormCode) ||
          (pCleanCode && sCleanCode && pCleanCode === sCleanCode) ||
          (pNormName && sNormName && pNormName === sNormName) ||
          (pNormCode && sId && pNormCode === sId);

        if (match) {
          const currentStock = Number(p.stockQuantity !== undefined ? p.stockQuantity : 0);
          return { ...p, stockQuantity: currentStock + qtyToRestore };
        }
        return p;
      });
      if (onUpdatePartsStock) {
        onUpdatePartsStock(updatedParts);
      }
      try {
        localStorage.setItem('vollen_parts_stock', JSON.stringify(updatedParts));
      } catch {}
    }
    setPartsList((prev) => prev.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  const handleSearchPartByCode = (codeToSearch: string) => {
    const trimmedCode = codeToSearch.trim();
    if (!trimmedCode || !availableParts || availableParts.length === 0) return;

    const foundPart = availableParts.find(
      (p) =>
        (p.code && p.code.toLowerCase() === trimmedCode.toLowerCase()) ||
        (p.id && String(p.id) === trimmedCode)
    );

    if (foundPart) {
      setNewPartName(foundPart.name || '');
      setNewPartPrice(foundPart.finalPrice || foundPart.price || '0,00');
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!clientData.name.trim()) {
      return alert('Por favor, selecione um cliente ou informe o nome do cliente no topo.');
    }

    if (!attendantName || !attendantName.trim()) {
      return alert('Por favor, selecione o Atendente responsável pela Ordem de Serviço.');
    }

    const isFinalizing = orderStatus === 'FINALIZADA' || orderStatus === 'GARANTIA_FINALIZADA';

    if (isFinalizing) {
      if (!visitData.technicianName || !visitData.technicianName.trim()) {
        return alert('⚠️ Não é possível finalizar a Ordem de Serviço sem antes definir o Técnico Responsável.\n\nPor favor, selecione um Técnico Responsável no rodapé.');
      }
      if (!attendantName || !attendantName.trim()) {
        return alert('⚠️ Não é possível finalizar a Ordem de Serviço sem antes definir o Atendente.\n\nPor favor, selecione um Atendente no topo.');
      }
    }

    const isCurrentCanceled = orderStatus === 'CANCELADA' || orderStatus === 'CANCELADO';
    const wasAlreadyCanceled = orderToEdit && (orderToEdit.status === 'CANCELADA' || orderToEdit.status === 'CANCELADO');

    if (isCurrentCanceled && !wasAlreadyCanceled) {
      setConfirmDialog({
        isOpen: true,
        title: 'Cancelar Ordem de Serviço',
        message: 'ATENÇÃO: Ao salvar esta Ordem de Serviço como CANCELADA, ela não poderá mais ser editada ou alterada, ficando apenas disponível para visualização.\n\nCaso seja necessário modificá-la no futuro, somente um Administrador poderá reabri-la.\n\nDeseja realmente salvar como CANCELADA?',
        confirmText: 'Sim, Cancelar e Salvar OS',
        variant: 'warning',
        onConfirm: () => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          executeSaveProcess(true);
        },
      });
      return;
    }

    await executeSaveProcess(false);
  };

  const executeSaveProcess = async (_confirmedCancel: boolean) => {

    // GESTÃO DE ESTOQUE COMPLETA E INTELIGENTE:
    // 1. Se o status configurado tem returnStock === true (ex: CANCELADA / DESISTÊNCIA):
    //    -> Devolve ao estoque estritamente apenas as peças que já estavam marcadas como separadas/baixadas (p.separated === true).
    //    -> Peças que não estavam separadas não somam nada ao estoque.
    //    -> Desativa o flag isPartsReserved.
    // 2. Se 'Separar Peças' OU o Status da OS tiver deductStock:
    //    -> Dá baixa nas peças da lista que ainda NÃO foram baixadas (!p.separated) e marca separated: true.
    // 3. Se 'Separar Peças' NÃO estiver ativo E o Status da OS NÃO der baixa:
    //    -> Se o status pedir retorno ou se a opção de separar foi desligada, estorna as peças que estavam como separated: true.
    const matchingStatusObj = dynamicStatuses.find(
      (s) => String(s.name || s.id || '').toUpperCase() === String(orderStatus || '').toUpperCase()
    );
    const statusDeductsStock = matchingStatusObj
      ? Boolean(matchingStatusObj.deductStock)
      : (orderStatus === 'ORCAMENTO_APROVADO' || orderStatus === 'APROVADO');

    const statusReturnsStock = matchingStatusObj
      ? Boolean(matchingStatusObj.returnStock)
      : (orderStatus === 'CANCELADA' || orderStatus === 'CANCELADO');

    // Se o status força retorno, o shouldDeductStock é false
    const shouldDeductStock = statusReturnsStock ? false : Boolean(isPartsReserved || statusDeductsStock);
    let currentStockList = availableParts ? [...availableParts] : [];
    let stockChanged = false;

    // Normalizador de strings para matching preciso
    const norm = (val: any) => String(val || '').trim().toLowerCase();
    const numClean = (val: any) => String(val || '').replace(/\D/g, '');

    const updatedPartsList = partsList.map((p) => {
      const qty = Number(p.qty || 1);
      const pNormName = norm(p.name);
      const pNormCode = norm(p.code);
      const pCleanCode = numClean(p.code);

      const findAndMutateStock = (delta: number) => {
        currentStockList = currentStockList.map((stkPart) => {
          const sNormName = norm(stkPart.name);
          const sNormCode = norm(stkPart.code);
          const sCleanCode = numClean(stkPart.code);
          const sId = norm(stkPart.id);

          const match =
            (pNormCode && sNormCode && pNormCode === sNormCode) ||
            (pCleanCode && sCleanCode && pCleanCode === sCleanCode) ||
            (pNormName && sNormName && pNormName === sNormName) ||
            (pNormCode && sId && pNormCode === sId);

          if (match) {
            stockChanged = true;
            const currentQty = Number(stkPart.stockQuantity !== undefined ? stkPart.stockQuantity : 0);
            return { ...stkPart, stockQuantity: Math.max(0, currentQty + delta) };
          }
          return stkPart;
        });
      };

      if (statusReturnsStock) {
        // Se o status for de retorno/cancelamento: devolve APENAS se a peça já estava separada
        if (p.separated) {
          findAndMutateStock(+qty);
          return { ...p, separated: false };
        }
        // Se não estava separada, mantém sem alterar estoque
        return { ...p, separated: false };
      }

      if (shouldDeductStock && !p.separated) {
        // Verifica se há estoque disponível para esta peça antes de separar
        const currentStkPart = currentStockList.find((stkPart) => {
          const sNormName = norm(stkPart.name);
          const sNormCode = norm(stkPart.code);
          const sCleanCode = numClean(stkPart.code);
          const sId = norm(stkPart.id);

          return (
            (pNormCode && sNormCode && pNormCode === sNormCode) ||
            (pCleanCode && sCleanCode && pCleanCode === sCleanCode) ||
            (pNormName && sNormName && pNormName === sNormName) ||
            (pNormCode && sId && pNormCode === sId)
          );
        });

        const availableQty = currentStkPart && currentStkPart.stockQuantity !== undefined ? Number(currentStkPart.stockQuantity) : 0;

        if (availableQty <= 0) {
          // Estoque zerado: NÃO separa a peça (permanece na lista da OS como não separada)
          return { ...p, separated: false };
        }

        // Há estoque disponível: dá baixa na quantidade
        findAndMutateStock(-qty);
        return { ...p, separated: true };
      } else if (!shouldDeductStock && p.separated) {
        // O usuário desmarcou Separar Peças e o status não dá baixa: DEVOLVE ao estoque
        findAndMutateStock(+qty);
        return { ...p, separated: false };
      }
      return p;
    });

    if (stockChanged && onUpdatePartsStock) {
      onUpdatePartsStock(currentStockList);
      try {
        localStorage.setItem('vollen_parts_stock', JSON.stringify(currentStockList));
      } catch {}
    }

    setSubmitting(true);
    try {
      let client = null;
      if (clientData.id) {
        client = { id: clientData.id };
      } else {
        client = await createClient(clientData);
      }

      const safeEquipment = {
        code: (equipmentData.code || '').trim(),
        type: equipmentData.type.trim(),
        brand: equipmentData.brand.trim(),
        model: equipmentData.model.trim(),
        serialNumber: equipmentData.serialNumber.trim(),
        accessories: (equipmentData.accessories || '').trim(),
        observations: (equipmentData.observations || '').trim(),
      };

      const finalProblem = problemDescription.trim();
      let finalSavedOrder: any = null;

      const responsibleUser = attendantName.trim() || currentUser?.name || 'Atendente';
      const nowFormatted = new Date().toLocaleString('pt-BR');

      if (activeEditingOrder) {
        // ATUALIZA OS EXISTENTE (Evita duplicação)
        const origService = originalExecutedService || executedService;
        let finalAdditionalNotes = nfData.additionalNotes || '';
        if (origService) {
          finalAdditionalNotes += `___ORIGINAL_SERVICE___${origService}___RETURN_SERVICE___${returnExecutedService}`;
        }
        if (reopenHistory.length > 0) {
          finalAdditionalNotes += `___REOPEN_HISTORY___${JSON.stringify(reopenHistory)}`;
        }

        const fieldChanges: string[] = [];

        // Detecção de alteração de Status
        if (activeEditingOrder.status && activeEditingOrder.status !== orderStatus) {
          fieldChanges.push(`Status alterado de "${activeEditingOrder.status}" para "${orderStatus}"`);
        }

        // Detecção de alteração de Cliente e Contato
        const prevClientName = (activeEditingOrder.client?.name || '').trim();
        if (prevClientName && prevClientName !== clientData.name.trim()) {
          fieldChanges.push(`Cliente alterado: "${prevClientName}" ➔ "${clientData.name.trim()}"`);
        }
        const prevPhone = (activeEditingOrder.client?.phone || '').trim();
        if (prevPhone && prevPhone !== clientData.phone.trim()) {
          fieldChanges.push(`Telefone alterado: "${prevPhone}" ➔ "${clientData.phone.trim()}"`);
        }
        const prevWhatsapp = (activeEditingOrder.client?.whatsapp || '').trim();
        if (prevWhatsapp && prevWhatsapp !== clientData.whatsapp.trim()) {
          fieldChanges.push(`WhatsApp alterado: "${prevWhatsapp}" ➔ "${clientData.whatsapp.trim()}"`);
        }

        // Detecção de alteração de Defeito
        const prevProblem = (activeEditingOrder.problemDescription || '').trim();
        if (prevProblem && prevProblem !== finalProblem) {
          fieldChanges.push(`Defeito alterado: "${prevProblem}" ➔ "${finalProblem}"`);
        }

        // Detecção de alteração de Equipamento (Marca, Modelo, Nº Série, Acessórios, Tipo)
        const prevEq: any = activeEditingOrder.equipment || {};
        if ((prevEq.brand || '').trim() !== safeEquipment.brand) {
          fieldChanges.push(`Marca alterada: "${prevEq.brand || 'Vazio'}" ➔ "${safeEquipment.brand || 'Vazio'}"`);
        }
        if ((prevEq.model || '').trim() !== safeEquipment.model) {
          fieldChanges.push(`Modelo alterado: "${prevEq.model || 'Vazio'}" ➔ "${safeEquipment.model || 'Vazio'}"`);
        }
        if ((prevEq.serialNumber || '').trim() !== safeEquipment.serialNumber) {
          fieldChanges.push(`Nº de Série alterado: "${prevEq.serialNumber || 'Vazio'}" ➔ "${safeEquipment.serialNumber || 'Vazio'}"`);
        }
        if ((prevEq.accessories || '').trim() !== safeEquipment.accessories) {
          fieldChanges.push(`Acessórios alterados: "${prevEq.accessories || 'Nenhum'}" ➔ "${safeEquipment.accessories || 'Nenhum'}"`);
        }
        if ((prevEq.type || '').trim() !== safeEquipment.type) {
          fieldChanges.push(`Tipo de Aparelho alterado: "${prevEq.type || 'Vazio'}" ➔ "${safeEquipment.type || 'Vazio'}"`);
        }

        // Detecção de alteração de Peças
        const prevParts = activeEditingOrder.partsUsed || activeEditingOrder.parts || [];
        const currentPartsSerialized = JSON.stringify(partsList.map((p) => ({ name: p.name, qty: p.qty, price: p.price })));
        const prevPartsSerialized = JSON.stringify(prevParts.map((p: any) => ({ name: p.name, qty: p.qty || p.quantity, price: p.price })));
        if (currentPartsSerialized !== prevPartsSerialized) {
          fieldChanges.push(`Lista de peças alterada (${partsList.length} item(ns))`);
        }

        // Detecção de alteração de Serviços
        const prevServices = activeEditingOrder.servicesExecuted || activeEditingOrder.services || [];
        const currentServicesSerialized = JSON.stringify(servicesList.map((s) => ({ name: s.name, price: s.price })));
        const prevServicesSerialized = JSON.stringify(prevServices.map((s: any) => ({ name: s.name, price: s.price })));
        if (currentServicesSerialized !== prevServicesSerialized) {
          fieldChanges.push(`Lista de serviços alterada (${servicesList.length} item(ns))`);
        }

        // Detecção de Atendente
        const prevAttendant = (activeEditingOrder.attendant || activeEditingOrder.attendantName || '').trim();
        const currentAttendant = attendantName.trim();
        if (prevAttendant && currentAttendant && prevAttendant !== currentAttendant) {
          fieldChanges.push(`Atendente alterado: "${prevAttendant}" ➔ "${currentAttendant}"`);
        } else if (!prevAttendant && currentAttendant) {
          fieldChanges.push(`Atendente definido: "${currentAttendant}"`);
        }

        // Detecção de Técnico Responsável
        const prevTech = (activeEditingOrder.technician || activeEditingOrder.technicianName || '').trim();
        const currentTech = (visitData.technicianName || '').trim();
        if (prevTech && currentTech && prevTech !== currentTech) {
          fieldChanges.push(`Técnico alterado: "${prevTech}" ➔ "${currentTech}"`);
        } else if (!prevTech && currentTech) {
          fieldChanges.push(`Técnico definido: "${currentTech}"`);
        }

        // Detecção de Laudo / Relato Técnico
        const prevReport = (activeEditingOrder.technicalReport || '').trim();
        if (prevReport !== technicalReport.trim()) {
          fieldChanges.push('Laudo Técnico atualizado');
        }

        // Detecção de Serviço Executado
        const prevExec = (activeEditingOrder.executedService || '').trim();
        if (prevExec !== executedService.trim()) {
          fieldChanges.push('Serviço Executado atualizado');
        }

        // Só adiciona nova entrada no histórico se REALMENTE houver alterações
        let updatedAuditHistory = auditHistory || [];
        if (fieldChanges.length > 0) {
          const partsDetails = partsList.length > 0
            ? partsList.map((p) => `Peça: ${p.name || 'Item'} (${p.qty || 1}x - R$ ${p.price || '0,00'})`)
            : [];
          const servicesDetails = servicesList.length > 0
            ? servicesList.map((s) => `Serviço: ${s.name || 'Serviço'} (R$ ${s.price || '0,00'})`)
            : [];

          const newAuditEntry = {
            date: nowFormatted,
            user: responsibleUser,
            changes: [
              ...fieldChanges,
              ...(partsDetails.length > 0 ? partsDetails : ['Sem peças vinculadas']),
              ...(servicesDetails.length > 0 ? servicesDetails : ['Sem serviços vinculados']),
            ],
          };
          updatedAuditHistory = [newAuditEntry, ...(auditHistory || [])];
        }

        const updatedOrderPayload = {
          code: activeEditingOrder.code,
          clientId: client.id,
          client: {
            id: client.id,
            name: clientData.name,
            phone: clientData.phone,
            whatsapp: clientData.whatsapp,
            email: clientData.email,
            cep: clientData.cep,
            address: clientData.address,
            number: clientData.number,
            neighborhood: clientData.neighborhood,
            city: clientData.city,
            state: clientData.state,
            complement: clientData.complement,
            reference: clientData.reference,
          },
          attendant: attendantName,
          attendantName: attendantName,
          technician: visitData.technicianName,
          equipment: safeEquipment,
          problemDescription: finalProblem,
          status: orderStatus,
          type: orderType,
          warrantyType: warrantyType,
          travelCost,
          discountCost,
          advancePayment,
          isZeroValueWarranty,
          totalAmount: grandTotalVal,
          partsUsed: updatedPartsList.map((p) => ({
            code: p.code || '0001',
            name: p.name,
            qty: p.qty || 1,
            quantity: p.qty || 1,
            price: p.price || '0,00',
            separated: Boolean(p.separated),
          })),
          parts: updatedPartsList.map((p) => ({
            code: p.code || '0001',
            name: p.name,
            qty: p.qty || 1,
            quantity: p.qty || 1,
            price: p.price || '0,00',
            separated: Boolean(p.separated),
          })),
          partsList: updatedPartsList.map((p) => ({
            code: p.code || '0001',
            name: p.name,
            qty: p.qty || 1,
            quantity: p.qty || 1,
            price: p.price || '0,00',
            separated: Boolean(p.separated),
          })),
          servicesExecuted: servicesList.map((s) => ({
            name: s.name,
            description: s.name,
            price: s.price || '0,00',
          })),
          services: servicesList.map((s) => ({
            name: s.name,
            description: s.name,
            price: s.price || '0,00',
          })),
          servicesList: servicesList.map((s) => ({
            name: s.name,
            description: s.name,
            price: s.price || '0,00',
          })),
          exitDate,
          nfNumber: nfData.nfNumber,
          nfValue: nfData.nfValue,
          purchaseDate: nfData.purchaseDate,
          retailerName: nfData.retailerName,
          cnpj: nfData.cnpj,
          authorizedCode: nfData.authorizedCode,
          guarantor: nfData.guarantor,
          additionalNotes: finalAdditionalNotes,
          auditHistory: updatedAuditHistory,
          technicalReport,
          orderObservations,
          observations: orderObservations,
          executedService,
          originalExecutedService: origService,
          returnExecutedService,
          warrantyTermsData: {
            ...warrantyTermsData,
            startDate: warrantyTermsData.startDate || exitDate || entryDate,
          },
          isPartsReserved: shouldDeductStock,
          // Preserva vínculos de garantia
          originalOsCode: activeEditingOrder.originalOsCode || '',
          originalOsId: activeEditingOrder.originalOsId || '',
          warrantyReturnOsCode: activeEditingOrder.warrantyReturnOsCode || '',
          warrantyReturnOsId: activeEditingOrder.warrantyReturnOsId || '',
        };

        const updated = await updateOrder(activeEditingOrder.id, updatedOrderPayload);
        finalSavedOrder = updated || { ...activeEditingOrder, ...updatedOrderPayload };
        setAuditHistory(updatedAuditHistory);

        // Apenas cria/atualiza agendamento se a Data da Visita estiver informada ou tipo da OS for AGENDAMENTO
        if (visitData.date || orderType === 'AGENDAMENTO') {
          const dateToUse = visitData.date || new Date().toISOString().split('T')[0];
          const timeToUse = visitData.period || '08:00';
          const createdVisit = await createVisit({
            orderId: activeEditingOrder.id,
            date: dateToUse,
            period: timeToUse,
            technicianName: visitData.technicianName || 'Técnico Roberto',
            notes: visitData.notes || 'Agendamento de visita técnica da OS',
            status: 'AGENDADA',
          });

          if (createdVisit) {
            if (!activeEditingOrder.visits) activeEditingOrder.visits = [];
            activeEditingOrder.visits = [createdVisit, ...activeEditingOrder.visits.filter((v: any) => v.id !== createdVisit.id)];
            setVisitData({
              date: dateToUse,
              period: timeToUse,
              technicianName: createdVisit.technicianName || visitData.technicianName || 'Técnico Roberto',
              notes: createdVisit.notes || visitData.notes || '',
            });
          }
        }

        setActiveEditingOrder(finalSavedOrder);
        setPartsList(updatedPartsList);
        setIsPartsReserved(shouldDeductStock);
      } else {
        // CRIA NOVA OS
        const partsDetails = updatedPartsList.length > 0
          ? updatedPartsList.map((p) => `Peça: ${p.name || 'Item'} (${p.qty || 1}x - R$ ${p.price || '0,00'})`)
          : [];
        const servicesDetails = servicesList.length > 0
          ? servicesList.map((s) => `Serviço: ${s.name || 'Serviço'} (R$ ${s.price || '0,00'})`)
          : [];

        const clientPhones = [clientData.phone, clientData.whatsapp ? `WhatsApp: ${clientData.whatsapp}` : '']
          .filter(Boolean)
          .join(' | ');

        const equipmentDesc = [
          safeEquipment.type ? `Tipo: ${safeEquipment.type}` : '',
          safeEquipment.brand ? `Marca: ${safeEquipment.brand}` : '',
          safeEquipment.model ? `Modelo: ${safeEquipment.model}` : '',
          safeEquipment.serialNumber ? `Nº Série: ${safeEquipment.serialNumber}` : '',
          safeEquipment.accessories ? `Acessórios: ${safeEquipment.accessories}` : '',
        ].filter(Boolean).join(' - ');

        const initialAuditEntry = {
          date: nowFormatted,
          user: responsibleUser,
          changes: [
            `Abertura da Ordem de Serviço #${suggestedNextCode}`,
            `Cliente: ${clientData.name || 'Não informado'}${clientPhones ? ` (${clientPhones})` : ''}`,
            `Aparelho / Equipamento: ${equipmentDesc || 'Equipamento Geral'}`,
            finalProblem ? `Defeito relatado: "${finalProblem}"` : 'Defeito relatado: Não informado',
            `Status Inicial: ${orderStatus}`,
            `Atendente: ${attendantName.trim() || 'Não informado'}`,
            visitData.technicianName ? `Técnico Responsável: ${visitData.technicianName}` : '',
            ...(partsDetails.length > 0 ? partsDetails : ['Nenhuma peça vinculada inicialmente']),
            ...(servicesDetails.length > 0 ? servicesDetails : ['Nenhum serviço vinculado inicialmente']),
          ].filter(Boolean),
        };
        const initialAuditHistory = [initialAuditEntry];

        const order = await createOrder({
          code: suggestedNextCode,
          clientId: client.id,
          client: {
            id: client.id,
            name: clientData.name,
            phone: clientData.phone,
            whatsapp: clientData.whatsapp,
            email: clientData.email,
            cep: clientData.cep,
            address: clientData.address,
            number: clientData.number,
            neighborhood: clientData.neighborhood,
            city: clientData.city,
            state: clientData.state,
            complement: clientData.complement,
            reference: clientData.reference,
          },
          attendant: attendantName,
          attendantName: attendantName,
          technician: visitData.technicianName,
          equipment: safeEquipment,
          problemDescription: finalProblem,
          status: orderStatus,
          type: orderType,
          warrantyType: warrantyType,
          travelCost,
          discountCost,
          advancePayment,
          isZeroValueWarranty,
          totalAmount: grandTotalVal,
          partsUsed: updatedPartsList.map((p) => ({
            code: p.code || '0001',
            name: p.name,
            qty: p.qty || 1,
            quantity: p.qty || 1,
            price: p.price || '0,00',
            separated: Boolean(p.separated),
          })),
          parts: updatedPartsList.map((p) => ({
            code: p.code || '0001',
            name: p.name,
            qty: p.qty || 1,
            quantity: p.qty || 1,
            price: p.price || '0,00',
            separated: Boolean(p.separated),
          })),
          partsList: updatedPartsList.map((p) => ({
            code: p.code || '0001',
            name: p.name,
            qty: p.qty || 1,
            quantity: p.qty || 1,
            price: p.price || '0,00',
            separated: Boolean(p.separated),
          })),
          servicesExecuted: servicesList.map((s) => ({
            name: s.name,
            description: s.name,
            price: s.price || '0,00',
          })),
          services: servicesList.map((s) => ({
            name: s.name,
            description: s.name,
            price: s.price || '0,00',
          })),
          servicesList: servicesList.map((s) => ({
            name: s.name,
            description: s.name,
            price: s.price || '0,00',
          })),
          exitDate,
          nfNumber: nfData.nfNumber,
          nfValue: nfData.nfValue,
          purchaseDate: nfData.purchaseDate,
          retailerName: nfData.retailerName,
          cnpj: nfData.cnpj,
          authorizedCode: nfData.authorizedCode,
          guarantor: nfData.guarantor,
          additionalNotes: nfData.additionalNotes,
          auditHistory: initialAuditHistory,
          technicalReport,
          orderObservations,
          observations: orderObservations,
          executedService,
          warrantyTermsData: {
            ...warrantyTermsData,
            startDate: warrantyTermsData.startDate || exitDate || entryDate,
          },
          isPartsReserved: shouldDeductStock,
          originalOsCode: originalOsCode || '',
          originalOsId: '',
        });

        finalSavedOrder = order;
        setAuditHistory(initialAuditHistory);
        setPartsList(updatedPartsList);
        setIsPartsReserved(shouldDeductStock);

        // Apenas cria agendamento se a Data da Visita estiver informada ou tipo da OS for AGENDAMENTO
        if (visitData.date || orderType === 'AGENDAMENTO') {
          const dateToUse = visitData.date || new Date().toISOString().split('T')[0];
          const timeToUse = visitData.period || '08:00';
          const createdVisit = await createVisit({
            orderId: order.id,
            date: dateToUse,
            period: timeToUse,
            technicianName: visitData.technicianName || '',
            notes: visitData.notes || 'Agendamento de visita técnica da OS',
            status: 'AGENDADA',
          });

          if (createdVisit) {
            setVisitData({
              date: dateToUse,
              period: timeToUse,
              technicianName: createdVisit.technicianName || visitData.technicianName || '',
              notes: createdVisit.notes || visitData.notes || '',
            });
          }
        }

        // Mantém a ordem recém-salva ativa na tela com seu código real gravado
        if (order) {
          setActiveEditingOrder(order);
        }
      }

      setSubmitting(false);
      setIsDirty(false);
      setIsSavedState(true);
      setSavedSuccessMessage('Ordem de Serviço salva com sucesso!');
      setTimeout(() => setSavedSuccessMessage(null), 4000);

      if (orderStatus === 'FINALIZADA' && onFinalizeSuccess) {
        onFinalizeSuccess();
      } else {
        onSuccess(finalSavedOrder || activeEditingOrder || orderToEdit);
      }
    } catch (error) {
      console.error('Erro ao salvar OS:', error);
      setSubmitting(false);
      alert('Erro ao salvar OS. Tente novamente.');
    }
  };

  // Executa a limpeza e transição para o novo aparelho mantendo o cliente
  const executeResetForNewEquipment = () => {
    // Se a OS anterior já estava salva no banco, adiciona ao lote da sessão para impressão conjunta
    if (activeEditingOrder && activeEditingOrder.code) {
      const alreadyInBatch = sessionBatchOrders.some((b) => b.id === activeEditingOrder.id);
      if (!alreadyInBatch) {
        setSessionBatchOrders((prev) => [
          ...prev,
          {
            ...activeEditingOrder,
            client: { ...clientData },
            equipment: { ...equipmentData },
            problemDescription,
            technicalReport,
            executedService,
            servicesList: [...servicesList],
            partsList: [...partsList],
            travelCost,
            discountCost,
            grandTotalVal,
            entryDate,
            exitDate,
            status: orderStatus,
            type: orderType,
            warrantyType,
          },
        ]);
      }
    }

    // Desconecta do modo edição: passa para modo Nova OS
    setActiveEditingOrder(null);

    // Limpa todos os dados do equipamento, defeito, laudos, serviços, peças e agendamento
    setEquipmentData({
      code: '',
      type: '',
      brand: '',
      model: '',
      serialNumber: '',
      accessories: '',
      observations: '',
    });
    setProblemDescription('');
    setTechnicalReport('');
    setExecutedService('');
    setServicesList([]);
    setPartsList([]);
    setTravelCost('');
    setDiscountCost('');
    setOrderStatus('ABERTA');
    setOrderType('ORCAMENTO');
    setWarrantyType('NAO_SE_APLICA');
    setVisitData({
      date: '',
      period: '',
      technicianName: '',
      notes: '',
    });
    setNfData({
      nfNumber: '',
      nfValue: '',
      purchaseDate: '',
      retailerName: '',
      cnpj: '',
      authorizedCode: '',
      guarantor: 'NAO_SE_APLICA',
      additionalNotes: '',
    });

    setIsDirty(false);
    setIsSavedState(false);
    setActiveTab('EQUIPMENT');
    setSavedSuccessMessage(
      `✨ Campos limpos para o novo equipamento de ${clientData.name || 'Cliente'}. Preencha e clique em "Salvar Ordem de Serviço" para gravar.`
    );
    setTimeout(() => setSavedSuccessMessage(null), 6000);
  };

  // Função "Novo Equipamento": Pergunta se deseja salvar a OS atual antes de limpar e gerar a próxima
  const handleSaveAndAddNewEquipment = () => {
    // 1. Se houver alterações não salvas (isDirty): pergunta se deseja salvar antes
    if (isDirty) {
      setConfirmDialog({
        isOpen: true,
        title: 'Salvar Ordem de Serviço Atual?',
        message: `Você possui alterações não salvas nesta Ordem de Serviço (${activeEditingOrder?.code || 'em elaboração'}). Deseja salvar as alterações desta OS antes de iniciar o Novo Equipamento?`,
        confirmText: 'Sim, Salvar e Continuar',
        variant: 'info',
        onConfirm: async () => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          try {
            // Executa o salvamento da OS atual
            await handleSubmit();
            // Em seguida prepara o novo aparelho
            executeResetForNewEquipment();
          } catch (err) {
            console.error('Erro ao salvar OS antes do novo equipamento:', err);
          }
        },
      });
      return;
    }

    // 2. Se já tem uma OS ou aparelho preenchido mas sem alterações pendentes, pede confirmação
    if (activeEditingOrder || equipmentData.type || equipmentData.brand || problemDescription) {
      setConfirmDialog({
        isOpen: true,
        title: 'Iniciar Novo Equipamento (+1 Aparelho)',
        message: `Deseja iniciar o atendimento de um novo aparelho para ${clientData.name || 'este cliente'} mantendo a OS atual salva?`,
        confirmText: 'Sim, Iniciar Novo Aparelho',
        variant: 'info',
        onConfirm: () => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          executeResetForNewEquipment();
        },
      });
      return;
    }

    // 3. Se os campos já estão vazios, apenas limpa
    executeResetForNewEquipment();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-5xl h-[92vh] shadow-2xl flex flex-col font-sans overflow-hidden">
        {/* Header Superior Compacto com Datas de Entrada e Saída */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-200 border-b border-slate-300 shrink-0">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-sky-700" />
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              {activeEditingOrder && activeEditingOrder.code
                ? `Editar Ordem de Serviço ${String(activeEditingOrder.code).startsWith('OS') ? activeEditingOrder.code : `OS-${activeEditingOrder.code}`}`
                : (
                  <span className="flex items-center gap-2">
                    Nova Ordem de Serviço
                    <span className="font-mono text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-xs">
                      {suggestedNextCode}
                    </span>
                  </span>
                )
              }
              <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-300 font-mono font-semibold px-1.5 py-0.5 rounded ml-1 shadow-2xs">
                F2
              </span>
            </h2>
          </div>

          {/* Campos de Atendente, Data de Entrada e Saída */}
          <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800">
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-xs">
              <span className="text-slate-600 text-[11px] whitespace-nowrap">Atendente:</span>
              <select
                value={attendantName}
                onChange={(e) => setAttendantName(e.target.value)}
                disabled={isReadOnly}
                className={`bg-transparent font-bold focus:outline-none text-xs max-w-[140px] truncate ${isReadOnly ? 'text-slate-500 cursor-not-allowed' : 'text-slate-900 cursor-pointer'}`}
              >
                <option value="">-- Selecione --</option>
                {registeredAttendants.map((att, idx) => (
                  <option key={idx} value={att}>
                    {att}
                  </option>
                ))}
                {attendantName && !registeredAttendants.includes(attendantName) && (
                  <option value={attendantName}>{attendantName}</option>
                )}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-xs">
              <span className="text-slate-600 text-[11px]">Entrada:</span>
              <input
                type="date"
                disabled={isReadOnly}
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className={`bg-transparent font-bold focus:outline-none text-xs ${isReadOnly ? 'text-slate-500 cursor-not-allowed' : 'text-slate-900 cursor-pointer'}`}
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-xs">
              <span className="text-slate-600 text-[11px]">Saída:</span>
              <input
                type="date"
                disabled={isReadOnly}
                value={exitDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setExitDate(newDate);
                  setWarrantyTermsData((prev) => ({ ...prev, startDate: newDate }));
                }}
                placeholder="Pendente"
                title={isReadOnly ? 'Data de Saída bloqueada (OS Cancelada / Finalizada)' : 'Selecione a Data de Saída / Entrega'}
                className={`bg-transparent font-bold focus:outline-none text-xs ${isReadOnly
                  ? 'text-slate-500 cursor-not-allowed bg-slate-100/50'
                  : exitDate
                    ? 'text-emerald-700 cursor-pointer'
                    : 'text-slate-400 font-normal cursor-pointer'
                  }`}
              />
            </div>

            <button
              type="button"
              onClick={handleRequestClose}
              className="text-slate-600 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-300 ml-2 cursor-pointer"
              title="Fechar Ordem de Serviço (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {savedSuccessMessage && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-emerald-600/95 backdrop-blur-xs text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-3 shadow-2xl border border-emerald-400/50 animate-fadeIn pointer-events-auto">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              {savedSuccessMessage}
            </span>
            <button
              type="button"
              onClick={() => setSavedSuccessMessage(null)}
              className="text-white/80 hover:text-white p-0.5 rounded hover:bg-emerald-700/50 cursor-pointer ml-1"
              title="Fechar notificação"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* BANNER DE AVISO QUANDO A OS ESTIVER FINALIZADA (MODO SOMENTE LEITURA) */}
        {orderToEdit && (orderToEdit.status === 'FINALIZADA' || orderToEdit.status === 'CONCLUIDA' || orderToEdit.status === 'GARANTIA_FINALIZADA' || orderToEdit.status === 'GARANTIA/FINALIZADA') && (
          <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-xs font-bold text-amber-900 flex items-center justify-between shrink-0 shadow-xs">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              ESTA OS ESTÁ FINALIZADA {orderToEdit.status === 'GARANTIA_FINALIZADA' || orderToEdit.status === 'GARANTIA/FINALIZADA' ? '(GARANTIA)' : ''}: Edições bloqueadas. Para alterar qualquer dado, clique no botão &quot;Reabrir OS&quot; no rodapé.
            </span>
          </div>
        )}

        {/* BANNER DE AVISO QUANDO A OS ESTIVER CANCELADA (MODO SOMENTE LEITURA) */}
        {orderToEdit && (orderToEdit.status === 'CANCELADA' || orderToEdit.status === 'CANCELADO') && (
          <div className="bg-red-100 border-b border-red-300 px-4 py-2 text-xs font-bold text-red-900 flex items-center justify-between shrink-0 shadow-xs">
            <span className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-700" />
              ESTA OS ESTÁ CANCELADA: Edições bloqueadas (apenas visualização). Somente Administradores podem reabri-la.
            </span>
          </div>
        )}

        {/* BANNER 1: ALERTA DE OS DE RETORNO EM GARANTIA JÁ EM ANDAMENTO (NÃO FINALIZADA) */}
        {orderToEdit && isReadOnly && warrantyLineage.activeReturn && (
          <div className="bg-amber-500 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 shadow-md border-b border-amber-600 animate-fadeIn">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-100 animate-pulse" />
              <span>
                ⚠️ <strong>ATENÇÃO:</strong> Já existe uma Ordem de Retorno em Garantia <u>em aberto</u> para este atendimento: <strong className="text-amber-100 bg-amber-700/60 px-1.5 py-0.5 rounded ml-1">#{warrantyLineage.activeReturn.code}</strong> ({warrantyLineage.activeReturn.status?.replace(/_/g, ' ')})
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (onOpenWarrantyOrder) onOpenWarrantyOrder(warrantyLineage.activeReturn);
              }}
              className="bg-white text-amber-900 hover:bg-amber-100 px-3 py-1 rounded-lg text-xs font-extrabold cursor-pointer transition-all flex items-center gap-1.5 shadow"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Abrir OS em Aberto #{warrantyLineage.activeReturn.code}
            </button>
          </div>
        )}

        {/* BANNER 2: HISTÓRICO DE NOTAS DE RETORNO JÁ FINALIZADAS DESTA OS */}
        {orderToEdit && isReadOnly && !warrantyLineage.activeReturn && warrantyLineage.finishedReturns.length > 0 && (
          <div className="bg-purple-100 border-b border-purple-300 px-4 py-2 text-xs font-bold text-purple-900 flex items-center justify-between shrink-0 shadow-xs">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              <span>
                Esta OS possui {warrantyLineage.finishedReturns.length} retorno(s) em garantia anteriores já finalizados: {warrantyLineage.finishedReturns.map((r: any) => `#${r.code}`).join(', ')}. Você pode abrir uma nova reabertura se necessário.
              </span>
            </span>
          </div>
        )}

        {/* BANNER 3: Esta OS é um Retorno em Garantia de outra OS (Mostra todas as anteriores) */}
        {orderStatus === 'RETORNO_GARANTIA' && (originalOsCode || warrantyLineage.allPreviousOrders.length > 0) && (
          <div className="bg-sky-100 border-b border-sky-300 px-4 py-2 text-xs font-bold text-sky-900 flex items-center justify-between shrink-0 shadow-xs">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-700" />
              <span>
                Esta OS é Retorno em Garantia da(s) OS: <strong>{warrantyLineage.allPreviousOrders.map((o: any) => `#${o.code}`).join(' ➔ ') || `#${originalOsCode}`}</strong>
              </span>
            </span>
            {warrantyLineage.allPreviousOrders.length > 0 && (
              <div className="flex items-center gap-1.5">
                {warrantyLineage.allPreviousOrders.map((prev: any) => (
                  <button
                    key={prev.id || prev.code}
                    type="button"
                    onClick={() => {
                      if (onOpenWarrantyOrder) onOpenWarrantyOrder(prev);
                    }}
                    className="bg-sky-700 hover:bg-sky-800 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                    title={`Abrir OS #${prev.code}`}
                  >
                    <FolderOpen className="w-3 h-3" />
                    OS #{prev.code}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 1. SEÇÃO DO CLIENTE FIXA NO TOPO (Sem Rolagem, Compacta) */}
        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-300 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-700" /> Dados do Cliente (Fixo)
            </span>

            <div className="flex items-center gap-2">
              {onOpenClientsModal && (
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={onOpenClientsModal}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow transition-all ${isReadOnly ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 text-white cursor-pointer'}`}
                >
                  <Search className="w-3 h-3" />
                  Selecionar Cliente na Lista
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!clientData.name.trim() && !clientData.id) {
                    return alert('Selecione ou informe um cliente primeiro para visualizar o histórico de OS.');
                  }
                  setIsLocalClientHistoryModalOpen(true);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow transition-all cursor-pointer"
                title="Exibe o histórico de todas as Ordens de Serviço cadastradas para este cliente com botão para abrir"
              >
                <History className="w-3 h-3" />
                Histórico de OS do Cliente ({clientHistoryOrders.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div className="flex flex-col justify-between">
              <div className="flex items-center justify-between h-5 mb-0.5">
                <label className="block text-[10px] font-bold text-slate-800">Nome Completo do Cliente *</label>
                {onEditClient && (
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      if (!clientData.name.trim()) {
                        return alert('Selecione um cliente primeiro para editar o cadastro.');
                      }
                      onEditClient(clientData);
                    }}
                    className={`text-[10px] border px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold transition-all ${isReadOnly ? 'text-slate-400 bg-slate-200 border-slate-300 cursor-not-allowed' : 'text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 cursor-pointer'}`}
                    title="Editar ficha completa de cadastro deste cliente"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                    Editar Cadastro
                  </button>
                )}
              </div>
              <input
                type="text"
                readOnly
                required
                value={clientData.name}
                onKeyDown={(e) => {
                  if (e.key !== 'c' && e.key !== 'C' && !(e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                  }
                }}
                placeholder="Selecione o cliente na lista acima..."
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs cursor-text select-text"
              />
            </div>

            <div className="flex flex-col justify-between">
              <div className="flex items-center justify-between h-5 mb-0.5">
                <label className="block text-[10px] font-bold text-slate-800">Telefone Fixo / Recado</label>
              </div>
              <input
                type="text"
                readOnly
                value={clientData.phone}
                onKeyDown={(e) => {
                  if (e.key !== 'c' && e.key !== 'C' && !(e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                  }
                }}
                placeholder="Telefone..."
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs cursor-text select-text"
              />
            </div>

            <div className="flex flex-col justify-between">
              <div className="flex items-center justify-between h-5 mb-0.5">
                <label className="block text-[10px] font-bold text-slate-800">WhatsApp / Celular</label>
              </div>
              <input
                type="text"
                readOnly
                value={clientData.whatsapp}
                onKeyDown={(e) => {
                  if (e.key !== 'c' && e.key !== 'C' && !(e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                  }
                }}
                placeholder="WhatsApp..."
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs cursor-text select-text"
              />
            </div>
          </div>
        </div>

        {/* 2. ABAS DE NAVEGAÇÃO INTERNAS */}
        <div className="flex border-b border-slate-300 bg-slate-200 text-xs font-bold text-slate-700 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('EQUIPMENT')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${activeTab === 'EQUIPMENT'
              ? 'border-sky-600 text-sky-700 bg-white'
              : 'border-transparent hover:bg-slate-300'
              }`}
          >
            <Cpu className="w-3.5 h-3.5" /> Equipamento
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('INFO')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${activeTab === 'INFO'
              ? 'border-sky-600 text-sky-700 bg-white'
              : 'border-transparent hover:bg-slate-300'
              }`}
          >
            <FileText className="w-3.5 h-3.5" /> Informações / Laudo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SERVICES_PARTS')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${activeTab === 'SERVICES_PARTS'
              ? 'border-sky-600 text-sky-700 bg-white'
              : 'border-transparent hover:bg-slate-300'
              }`}
          >
            <Wrench className="w-3.5 h-3.5 text-sky-700" /> Serviços &amp; Peças ({servicesList.length + partsList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('AGENDAMENTO')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${activeTab === 'AGENDAMENTO'
              ? 'border-sky-600 text-sky-700 bg-white'
              : 'border-transparent hover:bg-slate-300'
              }`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Agendamento
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DATA')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${activeTab === 'DATA'
              ? 'border-sky-600 text-sky-700 bg-white'
              : 'border-transparent hover:bg-slate-300'
              }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" /> Dados
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('WARRANTY')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${activeTab === 'WARRANTY'
              ? 'border-sky-600 text-sky-700 bg-white'
              : 'border-transparent hover:bg-slate-300'
              }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Garantia
          </button>
        </div>

        {/* 3. CONTEÚDO DAS ABAS (Sem Rolagem Vertical) */}
        <form
          onSubmit={handleSubmit}
          onChange={() => setIsDirty(true)}
          onKeyDown={(e) => {
            if (isReadOnly) {
              if (e.key !== 'c' && e.key !== 'C' && !(e.ctrlKey || e.metaKey)) {
                e.preventDefault();
              }
            }
          }}
          className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-50 text-xs"
        >
          <div className={`flex-1 p-3.5 flex flex-col justify-between overflow-hidden ${isReadOnly ? 'pointer-events-none select-text' : ''
            }`}>
            {/* ABA 1: EQUIPAMENTO - Perfeitamente enquadrado com rolagem de segurança se a tela for pequena */}
            {activeTab === 'EQUIPMENT' && (
              <div className="h-full flex flex-col justify-between overflow-y-auto bg-white p-3 rounded-xl border border-slate-200 shadow-xs gap-2">
                <div className="border-b border-slate-200 pb-1 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <Cpu className="w-3.5 h-3.5 text-sky-700" /> Dados do Equipamento & Defeito Reclamado
                    </h4>
                    {sessionBatchOrders.length > 0 && (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {sessionBatchOrders.length} aparelho(s) salvo(s) neste atendimento
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {clientPreviousEquipments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsClientEquipmentsModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer animate-pulse hover:animate-none"
                        title="Clique para ver e selecionar um aparelho já cadastrado para este cliente"
                      >
                        <Package className="w-3.5 h-3.5 text-indigo-200" />
                        <span>Aparelhos Anteriores ({clientPreviousEquipments.length})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveAndAddNewEquipment}
                      disabled={submitting}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Salva a OS atual deste aparelho e inicia uma nova OS com os dados deste mesmo cliente em branco para o próximo aparelho"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Novo Equipamento (+1 Aparelho)</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 shrink-0">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[11px] font-bold text-slate-800">Tipo de Equipamento</label>
                      <button
                        type="button"
                        onClick={() => {
                          setNewEquipmentName('');
                          setIsNewEquipmentModalOpen(true);
                        }}
                        className="text-[10px] text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold transition-all cursor-pointer shadow-2xs"
                        title="Cadastrar novo tipo de equipamento diretamente"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Novo tipo</span>
                      </button>
                    </div>
                    <select
                      value={equipmentData.type}
                      onChange={(e) => setEquipmentData({ ...equipmentData, type: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 cursor-pointer text-xs uppercase"
                    >
                      <option value="">SELECIONE O TIPO DE EQUIPAMENTO...</option>
                      {Array.from(
                        new Set(
                          availableEquipments
                            .map((eq) => (eq.type || eq.name || '').trim().toUpperCase())
                            .filter(Boolean)
                        )
                      ).map((typeName, idx) => (
                        <option key={idx} value={typeName} className="uppercase font-bold">
                          {typeName}
                        </option>
                      ))}
                      {equipmentData.type && !availableEquipments.some((eq) => (eq.type || eq.name || '').trim().toUpperCase() === equipmentData.type.trim().toUpperCase()) && (
                        <option value={equipmentData.type} className="uppercase font-bold">
                          {equipmentData.type}
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-0.5">Marca</label>
                    <input
                      type="text"
                      value={equipmentData.brand}
                      onChange={(e) => setEquipmentData({ ...equipmentData, brand: e.target.value })}
                      placeholder="Digite a marca..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-medium focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-0.5">Modelo</label>
                    <input
                      type="text"
                      value={equipmentData.model}
                      onChange={(e) => setEquipmentData({ ...equipmentData, model: e.target.value })}
                      placeholder="Ex: BRM54JK"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-medium focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-0.5">Número de Série</label>
                    <input
                      type="text"
                      value={equipmentData.serialNumber}
                      onChange={(e) => setEquipmentData({ ...equipmentData, serialNumber: e.target.value })}
                      placeholder="Digite o número de série..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-medium focus:outline-none focus:border-sky-600 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-0.5">Código do Equipamento</label>
                    <input
                      type="text"
                      value={equipmentData.code}
                      onChange={(e) => setEquipmentData({ ...equipmentData, code: e.target.value })}
                      placeholder="Ex: EQP-0001"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-medium focus:outline-none focus:border-sky-600 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-0.5">Acessórios</label>
                    <input
                      type="text"
                      value={equipmentData.accessories}
                      onChange={(e) => setEquipmentData({ ...equipmentData, accessories: e.target.value })}
                      placeholder="Ex: Cabo de força, controle..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-medium focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>
                </div>

                {/* CAMPOS LADO A LADO: DEFEITO RECLAMADO E OBSERVAÇÕES DO EQUIPAMENTO */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0">
                  {/* CAMPO DEFEITO / RECLAMAÇÃO DO CLIENTE */}
                  <div className="flex flex-col min-h-0 h-full">
                    <div className="flex items-center justify-between mb-1 shrink-0">
                      <label className="block font-bold text-slate-800 text-xs">
                        Defeito / Reclamação do Cliente *
                      </label>

                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={printProblemDescription}
                          onChange={(e) => setPrintProblemDescription(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span>Exibir na impressão</span>
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={problemDescription}
                      onChange={(e) => setProblemDescription(e.target.value)}
                      placeholder="Descreva o defeito reclamado ou sintomas informados pelo cliente..."
                      className="w-full h-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium focus:outline-none focus:border-sky-600 text-xs resize-none"
                    />
                  </div>

                  {/* CAMPO OBSERVAÇÕES DO EQUIPAMENTO */}
                  <div className="flex flex-col min-h-0 h-full">
                    <div className="flex items-center justify-between mb-1 shrink-0">
                      <label className="block font-bold text-slate-800 text-xs">Observações do Equipamento</label>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={printEquipmentObservations}
                          onChange={(e) => setPrintEquipmentObservations(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span>Exibir na impressão</span>
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={equipmentData.observations}
                      onChange={(e) => setEquipmentData({ ...equipmentData, observations: e.target.value })}
                      placeholder="Observações do estado físico (ex: riscado, amassado, sem tampa)..."
                      className="w-full h-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium focus:outline-none focus:border-sky-600 text-xs resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: INFORMAÇÕES / LAUDO (100% Enquadrado sem Rolagem) */}
            {activeTab === 'INFO' && (
              <div className="h-full flex flex-col justify-between overflow-hidden gap-2 font-sans text-xs">
                {/* BLOCO SUPERIOR: LAUDO TÉCNICO E OBSERVAÇÕES GERAIS DA OS LADO A LADO */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 min-h-0">
                  {/* LAUDO TÉCNICO */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between min-h-0">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1 shrink-0">
                      <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                        <FileText className="w-3.5 h-3.5 text-sky-700" /> Laudo Técnico / Diagnóstico
                      </h4>

                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={printTechnicalReport}
                          onChange={(e) => setPrintTechnicalReport(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span>Exibir na impressão</span>
                      </label>
                    </div>

                    <textarea
                      value={technicalReport}
                      onChange={(e) => setTechnicalReport(e.target.value)}
                      placeholder="Diagnóstico técnico detalhado, causas e observações..."
                      className="w-full h-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium focus:outline-none focus:border-sky-600 text-xs resize-none"
                    />
                  </div>

                  {/* OBSERVAÇÕES DA OS */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between min-h-0">
                    <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex items-center gap-1.5 text-xs shrink-0">
                      <FileText className="w-3.5 h-3.5 text-amber-600" /> Observações Gerais da OS
                    </h4>
                    <textarea
                      value={orderObservations}
                      onChange={(e) => setOrderObservations(e.target.value)}
                      placeholder="Observações internas ou notas gerais sobre o atendimento..."
                      className="w-full h-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium focus:outline-none focus:border-sky-600 text-xs resize-none"
                    />
                  </div>
                </div>

                {/* BLOCO INFERIOR EXPANDIDO: SERVIÇO EXECUTADO */}
                <div className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between min-h-0">
                  <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex items-center justify-between gap-1.5 text-xs shrink-0">
                    <span className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-emerald-600" /> Serviço Executado
                    </span>
                    {orderStatus === 'RETORNO_GARANTIA' && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-md">
                        Retorno em Garantia Ativo
                      </span>
                    )}
                  </h4>

                  {orderStatus === 'RETORNO_GARANTIA' ? (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 mt-1.5 min-h-0">
                      <div className="flex flex-col min-h-0 bg-slate-50 border border-slate-200 p-2 rounded-lg">
                        <label className="text-[10px] font-extrabold text-slate-600 uppercase mb-1 block">
                          🔒 Serviço(s) Executado(s) Anteriormente (Fixo / Inalterável)
                        </label>
                        <div className="flex-1 bg-slate-100 border border-slate-300 rounded p-2 text-slate-700 font-bold text-xs overflow-y-auto whitespace-pre-wrap space-y-2">
                          {warrantyLineage.accumulatedServices.length > 0 ? (
                            warrantyLineage.accumulatedServices.map((acc, idx) => (
                              <div key={idx} className="border-b border-slate-300/80 pb-1.5 last:border-b-0 last:pb-0">
                                <div className="text-[10px] text-sky-800 font-black uppercase flex items-center justify-between mb-0.5">
                                  <span>📌 OS #{acc.osCode}</span>
                                  {acc.date && <span className="text-slate-500 font-medium">Data: {acc.date}</span>}
                                </div>
                                <div className="text-slate-800 font-semibold">{acc.service}</div>
                              </div>
                            ))
                          ) : (
                            originalExecutedService || executedService || 'Nenhum serviço registrado anteriormente.'
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col min-h-0">
                        <label className="text-[10px] font-extrabold text-amber-800 uppercase mb-1 block">
                          🛠️ Novo Serviço Executado no Retorno em Garantia
                        </label>
                        <textarea
                          value={returnExecutedService}
                          onChange={(e) => setReturnExecutedService(e.target.value)}
                          placeholder="Descreva o novo reparo ou serviço realizado nesta reabertura por garantia..."
                          className="w-full flex-1 bg-white border border-amber-300 focus:border-amber-600 rounded-lg p-2 text-slate-900 font-medium focus:outline-none text-xs resize-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <textarea
                      value={executedService}
                      onChange={(e) => {
                        setExecutedService(e.target.value);
                        if (!originalExecutedService) setOriginalExecutedService(e.target.value);
                      }}
                      placeholder="Descreva detalhadamente o serviço que foi efetivamente executado no equipamento..."
                      className="w-full h-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium focus:outline-none focus:border-sky-600 text-xs resize-none mt-1"
                    />
                  )}
                </div>
              </div>
            )}

            {/* ABA 5: AGENDAMENTO DA VISITA */}
            {activeTab === 'AGENDAMENTO' && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Dados de Agendamento da Visita Técnica
                  </h4>

                  <div className="flex items-center gap-1.5">
                    <label className="text-slate-700 text-xs font-bold whitespace-nowrap">Tipo da OS:</label>
                    <select
                      value={orderType}
                      disabled={isReadOnly}
                      onChange={(e) => setOrderType(e.target.value as any)}
                      className={`border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-bold focus:outline-none focus:border-sky-600 shadow-xs text-xs ${isReadOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white cursor-pointer'}`}
                    >
                      <option value="ORCAMENTO">Orçamento (Padrão)</option>
                      <option value="VISITA_TECNICA">Visita Técnica</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Data da Visita *</label>
                    <input
                      type="date"
                      value={visitData.date}
                      onChange={(e) => setVisitData({ ...visitData, date: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Horário da Visita *</label>
                    <input
                      type="time"
                      value={visitData.period}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      onChange={(e) => setVisitData({ ...visitData, period: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-sky-600 cursor-pointer text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Observações do Agendamento</label>
                  <textarea
                    rows={3}
                    value={visitData.notes}
                    onChange={(e) => setVisitData({ ...visitData, notes: e.target.value })}
                    placeholder="Instruções ou observações para o agendamento (ex: Ligar antes de ir, interfone quebrado)..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium focus:outline-none focus:border-sky-600 text-xs"
                  />
                </div>
              </div>
            )}

            {/* ABA DADOS: NOTA FISCAL (GARANTIA DE FÁBRICA) */}
            {activeTab === 'DATA' && (
              <div className="h-full flex flex-col justify-between overflow-y-auto bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 shrink-0">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Dados da Nota Fiscal & Garantia de Fábrica
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 shrink-0">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Número da Nota Fiscal (NF-e)</label>
                    <input
                      type="text"
                      value={nfData.nfNumber}
                      onChange={(e) => setNfData({ ...nfData, nfNumber: e.target.value })}
                      placeholder="Ex: 000.123.456"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-sky-600 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Valor da NF (R$)</label>
                    <input
                      type="text"
                      value={nfData.nfValue}
                      onChange={(e) => setNfData({ ...nfData, nfValue: e.target.value })}
                      onBlur={(e) => {
                        if (e.target.value) {
                          setNfData({ ...nfData, nfValue: formatCurrencyOnBlur(e.target.value) });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && nfData.nfValue) {
                          setNfData({ ...nfData, nfValue: formatCurrencyOnBlur(nfData.nfValue) });
                        }
                      }}
                      placeholder="Ex: 1.500,00"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Data da Compra / Emissão</label>
                    <input
                      type="date"
                      value={nfData.purchaseDate}
                      onChange={(e) => setNfData({ ...nfData, purchaseDate: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Garantidor / Modalidade de Garantia *</label>
                    <select
                      value={warrantyType === 'GARANTIA_FABRICA' ? (nfData.guarantor || 'FABRICANTE') : warrantyType === 'GARANTIA_LOJA' ? 'ASSISTENCIA_PROPRIA' : 'NAO_SE_APLICA'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNfData({ ...nfData, guarantor: val });
                        if (val === 'NAO_SE_APLICA') {
                          setWarrantyType('NAO_SE_APLICA');
                        } else if (val === 'ASSISTENCIA_PROPRIA') {
                          setWarrantyType('GARANTIA_LOJA');
                        } else {
                          // FABRICANTE, SEGURADORA, REVENDA
                          setWarrantyType('GARANTIA_FABRICA');
                        }
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-900 font-bold focus:outline-none focus:border-sky-600 cursor-pointer text-xs"
                    >
                      <option value="NAO_SE_APLICA">Sem Garantia (Não se Aplica)</option>
                      <option value="ASSISTENCIA_PROPRIA">Garantia da Empresa (Própria Assistência)</option>
                      <option value="FABRICANTE">Garantia de Fábrica (Fabricante)</option>
                      <option value="SEGURADORA">Seguradora / Garantia Estendida</option>
                      <option value="REVENDA">Revenda / Loja Vendedora</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 shrink-0">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Código de Autorização</label>
                    <input
                      type="text"
                      value={nfData.authorizedCode}
                      onChange={(e) => setNfData({ ...nfData, authorizedCode: e.target.value })}
                      placeholder="Ex: OS-FAB-998877"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-sky-600 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Nome da Revenda / Loja vendedora</label>
                    <input
                      type="text"
                      value={nfData.retailerName}
                      onChange={(e) => setNfData({ ...nfData, retailerName: e.target.value })}
                      placeholder="Ex: Magazine Luiza / Casas Bahia / Fast Shop..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">CNPJ da Revenda</label>
                    <input
                      type="text"
                      value={nfData.cnpj}
                      onChange={(e) => setNfData({ ...nfData, cnpj: e.target.value })}
                      placeholder="00.000.000/0001-00"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-sky-600 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <label className="block text-[11px] font-bold text-slate-800 mb-0.5 shrink-0">Observações Adicionais da Garantia de Fábrica</label>
                  <textarea
                    rows={2}
                    value={nfData.additionalNotes}
                    onChange={(e) => setNfData({ ...nfData, additionalNotes: e.target.value })}
                    placeholder="Informações adicionais da nota fiscal, código de chamado junto à fábrica..."
                    className="w-full h-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium focus:outline-none focus:border-sky-600 text-xs resize-none"
                  />
                </div>
              </div>
            )}

            {/* ABA GARANTIA: TERMOS & COBERTURA */}
            {activeTab === 'WARRANTY' && (
              <div className="h-full flex flex-col justify-between overflow-y-auto bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 shrink-0">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    {warrantyType === 'GARANTIA_LOJA'
                      ? 'Termos & Condições da Garantia da Empresa'
                      : warrantyType === 'GARANTIA_FABRICA'
                        ? 'Informações & Validade da Garantia de Fábrica'
                        : 'Configuração da Modalidade de Garantia'}
                  </h4>
                  {warrantyType === 'GARANTIA_LOJA' && (
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={warrantyTermsData.printTerms}
                        onChange={(e) => setWarrantyTermsData({ ...warrantyTermsData, printTerms: e.target.checked })}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <span>Imprimir Termos no Certificado/OS</span>
                    </label>
                  )}
                </div>

                {/* CAMPOS DINÂMICOS DE ACORDO COM A MODALIDADE */}
                {warrantyType === 'GARANTIA_LOJA' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0">
                      <div>
                        <label className="block text-[11px] font-bold text-purple-900 mb-0.5">Modalidade de Garantia *</label>
                        <select
                          value={warrantyType}
                          onChange={(e) => setWarrantyType(e.target.value as any)}
                          className="w-full bg-purple-50 border border-purple-300 rounded-lg px-2.5 py-1.5 text-purple-950 font-bold focus:outline-none focus:border-purple-600 cursor-pointer text-xs shadow-xs"
                        >
                          <option value="NAO_SE_APLICA">Não se Aplica</option>
                          <option value="GARANTIA_LOJA">Garantia da Empresa</option>
                          <option value="GARANTIA_FABRICA">Garantia de Fábrica</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-800 mb-0.5">Tempo de Garantia (Dias) *</label>
                        <select
                          value={warrantyTermsData.periodDays}
                          onChange={(e) => setWarrantyTermsData({ ...warrantyTermsData, periodDays: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-sky-600 cursor-pointer text-xs"
                        >
                          <option value="30">30 Dias (1 Mês)</option>
                          <option value="90">90 Dias (3 Meses - Legal)</option>
                          <option value="180">180 Dias (6 Meses)</option>
                          <option value="365">365 Dias (1 Ano)</option>
                          <option value="CUSTOM">Personalizado</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-800 mb-0.5">Data de Início da Garantia (Saída)</label>
                        <input
                          type="date"
                          disabled={orderStatus === 'FINALIZADA'}
                          value={warrantyTermsData.startDate || exitDate}
                          onChange={(e) => {
                            const newDate = e.target.value;
                            setWarrantyTermsData({ ...warrantyTermsData, startDate: newDate });
                            setExitDate(newDate);
                          }}
                          className={`w-full border rounded-lg px-2.5 py-1.5 font-bold text-xs ${orderStatus === 'FINALIZADA'
                            ? 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-white border-slate-300 text-slate-800 focus:outline-none focus:border-sky-600'
                            }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-800 mb-0.5">Abrangência da Cobertura *</label>
                        <select
                          value={warrantyTermsData.coverageType}
                          onChange={(e) => setWarrantyTermsData({ ...warrantyTermsData, coverageType: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-sky-600 cursor-pointer text-xs"
                        >
                          <option value="PECAS_E_MAO_DE_OBRA">Peças Substituídas & Mão de Obra</option>
                          <option value="APENAS_MAO_DE_OBRA">Apenas Mão de Obra</option>
                          <option value="APENAS_PECAS">Apenas Peças Substituídas</option>
                          <option value="SERVICO_ESPECIFICO">Serviço Específico Realizado</option>
                        </select>
                      </div>
                    </div>

                    {/* QUADRO DE VERIFICAÇÃO DE RETORNO EM GARANTIA DA EMPRESA */}
                    {orderStatus === 'RETORNO_GARANTIA' && (
                      <div className={`p-3 rounded-xl border font-sans text-xs flex items-center justify-between shadow-xs shrink-0 ${companyReturnWarrantyInfo.badgeColor}`}>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className={`w-5 h-5 shrink-0 ${companyReturnWarrantyInfo.isValid ? 'text-purple-600' : 'text-red-600'}`} />
                          <div>
                            <p className="font-bold text-xs">{companyReturnWarrantyInfo.message}</p>
                            <p className="text-[11px] opacity-80 mt-0.5">
                              Cálculo baseado na Data de Saída ({companyReturnWarrantyInfo.startDate || 'Não definida'}) + {warrantyTermsData.periodDays || '90'} dias de garantia da empresa.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-bold uppercase bg-white/80 px-2.5 py-1 rounded-lg border border-purple-200 text-purple-900 shadow-2xs">
                            {companyReturnWarrantyInfo.isValid ? 'Retorno Válido' : 'Garantia Expirada'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* HISTÓRICO DE REABERTURA EM GARANTIA (Exibido APENAS quando a OS tiver histórico de reabertura) */}
                    {(reopenHistory.length > 0 || orderStatus === 'RETORNO_GARANTIA') && (
                      <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 shrink-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <History className="w-4 h-4 text-amber-700" />
                            <span className="font-bold text-amber-950 text-xs">Histórico de Reabertura por Retorno em Garantia</span>
                          </div>
                          {reopenHistory.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowReopenHistoryDetails(true)}
                              className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Ver Mais Detalhes
                            </button>
                          )}
                        </div>

                        {reopenHistory.length > 0 ? (
                          <div className="space-y-1">
                            {reopenHistory.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="bg-white p-2 rounded-lg border border-amber-200 text-[11px] flex items-center justify-between text-slate-800 font-medium">
                                <div>
                                  <span className="font-bold text-amber-900">Reabertura em {item.date}</span>
                                  {item.oldExitDate && <span className="text-slate-500 ml-1.5">(Saída original: {item.oldExitDate})</span>}
                                </div>
                                <span className="text-slate-600 italic truncate max-w-[250px]">{item.reason}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-800 italic">
                            Esta OS encontra-se reaberta em Retorno de Garantia.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex-1 flex flex-col min-h-[140px]">
                      <label className="block text-[11px] font-bold text-slate-800 mb-1 shrink-0">
                        Cláusulas e Termos de Garantia da Empresa
                      </label>
                      <textarea
                        rows={6}
                        value={warrantyTermsData.termsText}
                        onChange={(e) => setWarrantyTermsData({ ...warrantyTermsData, termsText: e.target.value })}
                        placeholder="Edite ou informe os termos de garantia da empresa para esta OS..."
                        className="w-full flex-1 bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium focus:outline-none focus:border-sky-600 text-xs resize-none"
                      />
                    </div>
                  </>
                )}

                {warrantyType === 'GARANTIA_FABRICA' && (
                  <div className="space-y-3 shrink-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-purple-900 mb-0.5">Modalidade de Garantia *</label>
                        <select
                          value={warrantyType}
                          onChange={(e) => setWarrantyType(e.target.value as any)}
                          className="w-full bg-purple-50 border border-purple-300 rounded-lg px-2.5 py-1.5 text-purple-950 font-bold focus:outline-none focus:border-purple-600 cursor-pointer text-xs shadow-xs"
                        >
                          <option value="NAO_SE_APLICA">Não se Aplica</option>
                          <option value="GARANTIA_LOJA">Garantia da Empresa</option>
                          <option value="GARANTIA_FABRICA">Garantia de Fábrica</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-center">
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Data de Emissão / Compra da NF (Aba Dados)</label>
                        <input
                          type="date"
                          value={nfData.purchaseDate}
                          onChange={(e) => setNfData({ ...nfData, purchaseDate: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>
                    </div>

                    {/* QUADRO DE VALIDAÇÃO AUTOMÁTICA DA GARANTIA DE FÁBRICA */}
                    <div className={`p-3 rounded-xl border font-sans text-xs flex items-center justify-between shadow-xs ${factoryWarrantyInfo.badgeColor}`}>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`w-5 h-5 shrink-0 ${factoryWarrantyInfo.isValid ? 'text-emerald-600' : 'text-amber-600'}`} />
                        <div>
                          <p className="font-bold text-xs">{factoryWarrantyInfo.message}</p>
                          <p className="text-[11px] opacity-80 mt-0.5">
                            A garantia de fábrica é calculada automaticamente (1 ano de validade a partir da data de compra da NF).
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('DATA')}
                        className="px-3 py-1 bg-white border border-slate-300 rounded-lg font-bold text-[11px] hover:bg-slate-50 transition-all text-slate-800 cursor-pointer shrink-0 ml-2 shadow-xs"
                      >
                        Ver NF na Aba Dados
                      </button>
                    </div>
                  </div>
                )}

                {warrantyType === 'NAO_SE_APLICA' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
                    <div>
                      <label className="block text-[11px] font-bold text-purple-900 mb-0.5">Modalidade de Garantia *</label>
                      <select
                        value={warrantyType}
                        onChange={(e) => setWarrantyType(e.target.value as any)}
                        className="w-full bg-purple-50 border border-purple-300 rounded-lg px-2.5 py-1.5 text-purple-950 font-bold focus:outline-none focus:border-purple-600 cursor-pointer text-xs shadow-xs"
                      >
                        <option value="NAO_SE_APLICA">Não se Aplica</option>
                        <option value="GARANTIA_LOJA">Garantia da Empresa</option>
                        <option value="GARANTIA_FABRICA">Garantia de Fábrica</option>
                      </select>
                    </div>
                    <div className="flex items-center text-slate-500 font-medium text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                      Esta Ordem de Serviço não possui garantia vinculada.
                    </div>
                  </div>
                )}

                {/* PEQUENO HISTÓRICO DE REABERTURA EM GARANTIA (EXIBIDO SEMPRE QUE HOUVER HISTÓRICO OU STATUS RETORNO) */}
                {(reopenHistory.length > 0 || orderStatus === 'RETORNO_GARANTIA') && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 shrink-0 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <History className="w-4 h-4 text-amber-700" />
                        <span className="font-bold text-amber-950 text-xs">Histórico de Reabertura por Retorno em Garantia</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowReopenHistoryDetails(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Ver Mais Detalhes
                      </button>
                    </div>

                    {reopenHistory.length > 0 ? (
                      <div className="space-y-1">
                        {reopenHistory.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="bg-white p-2 rounded-lg border border-amber-200 text-[11px] flex items-center justify-between text-slate-800 font-medium">
                            <div>
                              <span className="font-bold text-amber-900">Reabertura em {item.date}</span>
                              {item.oldExitDate && <span className="text-slate-500 ml-1.5">(Saída original: {item.oldExitDate})</span>}
                            </div>
                            <span className="text-slate-600 italic truncate max-w-[250px]">{item.reason}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-800 italic">
                        Esta OS encontra-se reaberta em Retorno de Garantia.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ABA UNIFICADA: SERVIÇOS & PEÇAS */}
            {activeTab === 'SERVICES_PARTS' && (
              <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden font-sans text-xs min-h-0">
                {/* COLUNA DA ESQUERDA: SERVIÇOS */}
                <div className="h-full flex flex-col gap-2 overflow-hidden min-h-0">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs space-y-2 shrink-0">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-sky-600" /> Serviços da OS
                        </h4>
                        <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer select-none bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors">
                          <input
                            type="checkbox"
                            checked={printServicesList}
                            onChange={(e) => setPrintServicesList(e.target.checked)}
                            className="w-3 h-3 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                          />
                          Exibir na Impressão
                        </label>
                      </div>

                      {onOpenServicesModal && (
                        <button
                          type="button"
                          onClick={onOpenServicesModal}
                          className="bg-sky-600 hover:bg-sky-700 text-white px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                        >
                          <Search className="w-3 h-3" />
                          Buscar Cadastrado
                        </button>
                      )}
                    </div>

                    {/* Formulário de inclusão de serviços ocultado/desabilitado se a OS for somente leitura */}
                    {!isReadOnly && (
                      <div className="flex items-center gap-1.5 relative">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={newServiceName}
                            onChange={(e) => {
                              setNewServiceName(e.target.value);
                              setShowServiceDropdown(true);
                            }}
                            onFocus={() => setShowServiceDropdown(true)}
                            onBlur={() => {
                              setTimeout(() => setShowServiceDropdown(false), 200);
                            }}
                            placeholder="Descrição do serviço..."
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                          />

                          {/* LISTA SUSPENSA DE AUTOCOMPLETAR SERVIÇOS */}
                          {showServiceDropdown && newServiceName.trim().length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 font-sans text-xs">
                              {availableServices
                                .filter((srv) => {
                                  const name = srv.name || srv.description || '';
                                  return name.toLowerCase().includes(newServiceName.toLowerCase());
                                })
                                .map((srv, idx) => {
                                  const srvName = srv.name || srv.description || '';
                                  const srvPrice = srv.price || srv.finalPrice || '0,00';
                                  return (
                                    <div
                                      key={idx}
                                      onMouseDown={() => {
                                        setNewServiceName(srvName);
                                        setNewServicePrice(srvPrice);
                                        setShowServiceDropdown(false);
                                      }}
                                      className="p-2 hover:bg-sky-50 cursor-pointer flex items-center justify-between transition-colors"
                                    >
                                      <span className="font-bold text-slate-800">{srvName}</span>
                                      <span className="font-bold text-emerald-700 text-[11px]">R$ {srvPrice}</span>
                                    </div>
                                  );
                                })}

                              {availableServices.filter((srv) => {
                                const name = srv.name || srv.description || '';
                                return name.toLowerCase().includes(newServiceName.toLowerCase());
                              }).length === 0 && (
                                <div className="p-2 text-slate-400 text-center text-[11px]">
                                  Nenhum serviço cadastrado encontrado.
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <input
                          type="text"
                          value={newServicePrice}
                          onChange={(e) => setNewServicePrice(e.target.value)}
                          onBlur={(e) => {
                            if (e.target.value) {
                              setNewServicePrice(formatCurrencyOnBlur(e.target.value));
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newServicePrice) {
                                setNewServicePrice(formatCurrencyOnBlur(newServicePrice));
                              }
                              handleAddService();
                            }
                          }}
                          placeholder="R$"
                          className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleAddService}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer text-xs shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" /> Incluir
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tabela de Serviços */}
                  <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-y-auto flex flex-col justify-between min-h-0">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-200 font-bold uppercase text-slate-800 border-b border-slate-300 sticky top-0 z-10 text-[11px]">
                        <tr>
                          <th className="p-2">Serviço</th>
                          <th className="p-2 w-24">Valor (R$)</th>
                          {!isReadOnly && <th className="p-2 w-10 text-center">Ação</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {servicesList.map((srv, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-bold text-slate-900">{srv.name}</td>
                            <td className="p-2 font-bold text-emerald-700">R$ {srv.price}</td>
                            {!isReadOnly && (
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveService(idx)}
                                  className="text-red-600 hover:text-red-800 p-0.5 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                        {servicesList.length === 0 && (
                          <tr>
                            <td colSpan={3} className="text-center py-6 text-slate-400">
                              Nenhum serviço adicionado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {servicesList.length > 0 && (
                        <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-10 text-[11px]">
                          <tr>
                            <td className="p-2 text-right font-bold text-slate-800">TOTAL SERVIÇOS:</td>
                            <td className="p-2 text-emerald-700 font-extrabold" colSpan={2}>
                              R${' '}
                              {servicesList
                                .reduce((acc, s) => {
                                  const val = parseFloat((s.price || '0').replace('.', '').replace(',', '.')) || 0;
                                  return acc + val;
                                }, 0)
                                .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* COLUNA DA DIREITA: PEÇAS */}
                <div className="h-full flex flex-col gap-2 overflow-hidden min-h-0">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs space-y-2 shrink-0">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-amber-600" /> Peças da OS
                        </h4>
                        <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer select-none bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors">
                          <input
                            type="checkbox"
                            checked={printPartsList}
                            onChange={(e) => setPrintPartsList(e.target.checked)}
                            className="w-3 h-3 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                          />
                          Exibir na Impressão
                        </label>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (isReadOnly) return;
                            const nextState = !isPartsReserved;
                            if (nextState) {
                              // Ao tentar ativar 'Separar Peças', verifica se há peças na lista com estoque zerado ou insuficiente
                              const norm = (val: any) => String(val || '').trim().toLowerCase();
                              const numClean = (val: any) => String(val || '').replace(/\D/g, '');

                              const zeroStockParts: string[] = [];

                              partsList.forEach((p) => {
                                const pNormName = norm(p.name);
                                const pNormCode = norm(p.code);
                                const pCleanCode = numClean(p.code);

                                const stkPart = (availableParts || []).find((sp: any) => {
                                  const sNormName = norm(sp.name);
                                  const sNormCode = norm(sp.code);
                                  const sCleanCode = numClean(sp.code);
                                  const sId = norm(sp.id);

                                  return (
                                    (pNormCode && sNormCode && pNormCode === sNormCode) ||
                                    (pCleanCode && sCleanCode && pCleanCode === sCleanCode) ||
                                    (pNormName && sNormName && pNormName === sNormName) ||
                                    (pNormCode && sId && pNormCode === sId)
                                  );
                                });

                                const availableQty = stkPart && stkPart.stockQuantity !== undefined ? Number(stkPart.stockQuantity) : 0;
                                const requiredQty = Number(p.qty || 1);

                                if (availableQty <= 0) {
                                  zeroStockParts.push(`• ${p.name} (Estoque atual: 0 un / Necessário: ${requiredQty} un)`);
                                }
                              });

                              if (zeroStockParts.length > 0) {
                                alert(
                                  `⚠️ ATENÇÃO: As seguintes peças estão com ESTOQUE ZERADO e não poderão ser separadas:\n\n` +
                                  zeroStockParts.join('\n') +
                                  `\n\nAs peças foram mantidas na lista da OS para visualização e orçamento. Para separá-las, dê entrada de estoque.`
                                );
                              }
                            }
                            setIsPartsReserved(nextState);
                            setIsDirty(true);
                          }}
                          className={`h-6 px-2.5 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer border shrink-0 min-w-[110px] ${
                            isPartsReserved
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                          }`}
                          title="Clique para alternar a reserva/separação de todas as peças desta OS no estoque"
                        >
                          <Package className="w-3 h-3 shrink-0" />
                          <span className="whitespace-nowrap">{isPartsReserved ? '✓ Peças Separadas' : 'Separar Peças'}</span>
                        </button>

                        {onOpenPartsModal && (
                          <button
                            type="button"
                            onClick={onOpenPartsModal}
                            className="h-6 bg-amber-600 hover:bg-amber-700 text-white px-2.5 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer border border-transparent shrink-0"
                          >
                            <Search className="w-3 h-3 shrink-0" />
                            <span className="whitespace-nowrap">Buscar Cadastrada</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Formulário de inclusão de peças ocultado/desabilitado se a OS for somente leitura */}
                    {!isReadOnly && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newPartCode}
                          onChange={(e) => setNewPartCode(e.target.value)}
                          onBlur={() => handleSearchPartByCode(newPartCode)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearchPartByCode(newPartCode);
                            }
                          }}
                          placeholder="Cód."
                          className="w-16 bg-white border border-slate-300 rounded-lg px-1.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 font-mono text-xs"
                        />
                        <input
                          type="text"
                          value={newPartName}
                          onChange={(e) => setNewPartName(e.target.value)}
                          placeholder="Nome da peça..."
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                        <input
                          type="number"
                          min={1}
                          value={newPartQty}
                          onChange={(e) => setNewPartQty(Number(e.target.value))}
                          placeholder="Qtd"
                          className="w-12 bg-white border border-slate-300 rounded-lg px-1 py-1 text-slate-800 font-bold text-center focus:outline-none focus:border-sky-600 text-xs"
                        />
                        <input
                          type="text"
                          value={newPartPrice}
                          onChange={(e) => setNewPartPrice(e.target.value)}
                          onBlur={(e) => {
                            if (e.target.value) {
                              setNewPartPrice(formatCurrencyOnBlur(e.target.value));
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newPartPrice) {
                                setNewPartPrice(formatCurrencyOnBlur(newPartPrice));
                              }
                              handleAddPart();
                            }
                          }}
                          placeholder="R$"
                          className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleAddPart}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer text-xs shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" /> Incluir
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tabela de Peças */}
                  <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-y-auto flex flex-col justify-between min-h-0">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-200 font-bold uppercase text-slate-800 border-b border-slate-300 sticky top-0 z-10 text-[11px]">
                        <tr>
                          <th className="p-2 w-16">Cód.</th>
                          <th className="p-2">Peça</th>
                          <th className="p-2 w-10 text-center">Qtd</th>
                          <th className="p-2 w-20">Valor Un.</th>
                          {!isReadOnly && <th className="p-2 w-10 text-center">Ação</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {partsList.map((prt, idx) => {
                          const norm = (val: any) => String(val || '').trim().toLowerCase();
                          const numClean = (val: any) => String(val || '').replace(/\D/g, '');
                          const pNormName = norm(prt.name);
                          const pNormCode = norm(prt.code);
                          const pCleanCode = numClean(prt.code);

                          const stk = (availableParts || []).find((sp: any) => {
                            const sNormName = norm(sp.name);
                            const sNormCode = norm(sp.code);
                            const sCleanCode = numClean(sp.code);
                            const sId = norm(sp.id);
                            return (
                              (pNormCode && sNormCode && pNormCode === sNormCode) ||
                              (pCleanCode && sCleanCode && pCleanCode === sCleanCode) ||
                              (pNormName && sNormName && pNormName === sNormName) ||
                              (pNormCode && sId && pNormCode === sId)
                            );
                          });

                          const isZeroStock = stk && stk.stockQuantity !== undefined ? Number(stk.stockQuantity) <= 0 : false;

                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2 font-mono font-bold text-amber-700">{prt.code}</td>
                              <td className="p-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900">{prt.name}</span>
                                  {prt.separated && (
                                    <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded-full whitespace-nowrap">
                                      ✓ Separada
                                    </span>
                                  )}
                                  {isZeroStock && !prt.separated && (
                                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded-full whitespace-nowrap" title="Estoque zerado no almoxarifado - Não pode ser baixada/separada até haver entrada">
                                      ⚠️ Sem Estoque (0 un)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 text-center font-bold text-slate-800">{prt.qty}</td>
                              <td className="p-2 font-bold text-emerald-700">R$ {prt.price}</td>
                              {!isReadOnly && (
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePart(idx)}
                                    className="text-red-600 hover:text-red-800 p-0.5 rounded cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                        {partsList.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-6 text-slate-400">
                              Nenhuma peça adicionada.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {partsList.length > 0 && (
                        <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-10 text-[11px]">
                          <tr>
                            <td className="p-2 text-right font-bold text-slate-800" colSpan={3}>TOTAL PEÇAS:</td>
                            <td className="p-2 text-emerald-700 font-extrabold" colSpan={2}>
                              R${' '}
                              {partsList
                                .reduce((acc, p) => {
                                  const val = parseFloat((p.price || '0').replace('.', '').replace(',', '.')) || 0;
                                  return acc + val * (p.qty || 1);
                                }, 0)
                                .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RESUMO FINANCEIRO DA OS (PEÇAS, SERVIÇOS, DESLOCAMENTO, DESCONTO, ADIANTAMENTO E VALOR TOTAL) */}
          <div className="px-3 py-1.5 bg-slate-800 text-white border-t border-slate-700 flex items-center justify-between gap-2 text-xs shrink-0 font-sans">
            <div className="flex items-center gap-2.5 font-bold flex-nowrap overflow-x-auto py-0.5">
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-semibold text-[10.5px]">Peças:</span>
                <span className="text-amber-400 font-mono text-[11px]">
                  R$ {totalPartsVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <span className="text-slate-600 text-[10px]">+</span>

              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-semibold text-[10.5px]">Serviços:</span>
                <span className="text-sky-400 font-mono text-[11px]">
                  R$ {totalServicesVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <span className="text-slate-600 text-[10px]">+</span>

              <div className="flex items-center gap-1">
                <label className="text-slate-300 font-semibold text-[10.5px] whitespace-nowrap">Desloc. (R$):</label>
                <input
                  type="text"
                  value={travelCost}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setTravelCost(e.target.value)}
                  onBlur={(e) => setTravelCost(formatCurrencyOnBlur(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setTravelCost(formatCurrencyOnBlur((e.target as HTMLInputElement).value));
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  placeholder="0,00"
                  className="w-16 bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-white font-mono text-[11px] focus:outline-none focus:border-sky-500 font-bold text-center"
                />
              </div>

              <span className="text-slate-600 text-[10px]">-</span>

              <div className="flex items-center gap-1">
                <label className="text-slate-300 font-semibold text-[10.5px] whitespace-nowrap">Desconto (R$):</label>
                <input
                  type="text"
                  value={discountCost}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDiscountCost(e.target.value)}
                  onBlur={(e) => setDiscountCost(formatCurrencyOnBlur(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setDiscountCost(formatCurrencyOnBlur((e.target as HTMLInputElement).value));
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  placeholder="0,00"
                  className="w-16 bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-emerald-400 font-mono text-[11px] focus:outline-none focus:border-emerald-500 font-bold text-center"
                />
              </div>

              <span className="text-slate-600 text-[10px]">-</span>

              <div className="flex items-center gap-1">
                <label className="text-amber-300 font-semibold text-[10.5px] whitespace-nowrap">Adiant. (R$):</label>
                <input
                  type="text"
                  value={advancePayment}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setAdvancePayment(e.target.value)}
                  onBlur={(e) => setAdvancePayment(formatCurrencyOnBlur(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setAdvancePayment(formatCurrencyOnBlur((e.target as HTMLInputElement).value));
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  placeholder="0,00"
                  className="w-16 bg-slate-900 border border-amber-600 rounded px-1.5 py-0.5 text-amber-300 font-mono text-[11px] focus:outline-none focus:border-amber-400 font-bold text-center"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Opção para zerar valor da OS quando for Retorno em Garantia */}
              {(orderStatus === 'RETORNO_GARANTIA' || orderStatus === 'GARANTIA_FINALIZADA' || Boolean(originalOsCode)) && (
                <label className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-all select-none ${isZeroValueWarranty ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'}`}>
                  <input
                    type="checkbox"
                    checked={isZeroValueWarranty}
                    disabled={isReadOnly}
                    onChange={(e) => setIsZeroValueWarranty(e.target.checked)}
                    className="w-3.5 h-3.5 text-amber-500 rounded border-slate-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Garantia Sem Custo (R$ 0,00)</span>
                </label>
              )}

              <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-1 rounded-xl shadow-xs">
                <span className="text-emerald-300 text-[10.5px] font-bold uppercase tracking-wider whitespace-nowrap">Total OS:</span>
                <strong className={`text-xs font-extrabold font-mono whitespace-nowrap ${isZeroValueWarranty ? 'text-amber-400' : 'text-emerald-400'}`}>
                  R$ {grandTotalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            </div>
          </div>

          {/* RODAPÉ ESTRUTURADO EM 2 LINHAS */}
          <div className="px-4 py-2 bg-slate-200 border-t border-slate-300 flex flex-col gap-2 shrink-0">
            {/* LINHA 1 (CIMA): Seletores de Técnico e Status */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-800 border-b border-slate-300 pb-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-slate-700 whitespace-nowrap text-xs">
                  Técnico Responsável {orderStatus === 'FINALIZADA' ? '*' : '(Opcional)'}
                </label>
                <select
                  value={visitData.technicianName}
                  onChange={(e) => setVisitData({ ...visitData, technicianName: e.target.value })}
                  disabled={isReadOnly}
                  className={`border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-bold focus:outline-none focus:border-sky-600 shadow-xs text-xs ${isReadOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white cursor-pointer'}`}
                >
                  <option value="">-- SELECIONE --</option>
                  {Array.from(new Set([...registeredTechnicians, ...(visitData.technicianName ? [visitData.technicianName] : [])]))
                    .filter((name) => name !== 'Técnico Exemplo' && name !== 'Técnico Roberto')
                    .map((tName, idx) => (
                      <option key={idx} value={tName}>
                        {tName}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-slate-700 whitespace-nowrap text-xs">Status da OS *</label>
                <select
                  value={orderStatus}
                  disabled={isReadOnly || orderStatus === 'RETORNO_GARANTIA'}
                  onChange={(e) => {
                    const newSt = e.target.value;
                    setOrderStatus(newSt);
                    if (newSt === 'FINALIZADA' && !exitDate) {
                      setExitDate(new Date().toISOString().split('T')[0]);
                    }
                    const matchSt = dynamicStatuses.find(
                      (s) => String(s.name || s.id || '').toUpperCase() === String(newSt || '').toUpperCase()
                    );
                    if (matchSt && matchSt.returnStock) {
                      setIsPartsReserved(false);
                    } else if (newSt === 'CANCELADA' || newSt === 'CANCELADO') {
                      setIsPartsReserved(false);
                    }
                  }}
                  className={`border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-bold focus:outline-none focus:border-sky-600 shadow-xs text-xs ${(isReadOnly || orderStatus === 'RETORNO_GARANTIA') ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white cursor-pointer'}`}
                >
                  {(() => {
                    // Exibe ESTRITAMENTE apenas os status cadastrados na Central de Status / Nuvem
                    const validRegisteredStatuses = dynamicStatuses && dynamicStatuses.length > 0
                      ? dynamicStatuses
                      : [
                          { name: 'ABERTA' },
                          { name: 'ORCAMENTO_APROVADO' },
                          { name: 'EM_ATENDIMENTO' },
                          { name: 'APROVADO' },
                          { name: 'AGUARDANDO_PECA' },
                          { name: 'APARELHO_LIBERADO' },
                          { name: 'FINALIZADA' },
                          { name: 'CANCELADA' },
                        ];

                    // Garante que RETORNO_GARANTIA seja renderizado corretamente no select
                    const listToRender = validRegisteredStatuses.some((s: any) => String(s.name || s.id || '').toUpperCase() === 'RETORNO_GARANTIA')
                      ? validRegisteredStatuses
                      : [{ name: 'RETORNO_GARANTIA' }, ...validRegisteredStatuses];

                    return listToRender.map((stObj: any) => {
                      const stValue = String(stObj.name || stObj.id || '').trim();
                      const stDisplay = stValue === 'RETORNO_GARANTIA' ? 'Retorno em Garantia' : (stObj.name ? String(stObj.name) : stValue);
                      const isAbertaDisabled = (stValue.toUpperCase() === 'ABERTA' || stValue.toUpperCase() === 'ABERTO') && reopenHistory.length > 0;

                      return (
                        <option
                          key={stObj.id || stValue}
                          value={stValue}
                          disabled={isAbertaDisabled}
                        >
                          {stDisplay} {isAbertaDisabled ? '(Indisponível pós-reabertura)' : ''}
                        </option>
                      );
                    });
                  })()}
                </select>
              </div>
            </div>

            {/* LINHA 2 (BAIXO): Botões de Ação */}
            <div className="flex items-center justify-between gap-2">
              {/* LADO ESQUERDO: Histórico, Reabrir, Excluir */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAuditHistoryModalOpen(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer text-xs"
                  title="Ver linha do tempo com histórico de alterações desta OS"
                >
                  <History className="w-3.5 h-3.5 text-sky-700" />
                  <span>Histórico ({auditHistory.length})</span>
                </button>

                {orderToEdit && isReadOnly && (
                  canReopenOS ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (orderToEdit.status === 'CANCELADA' || orderToEdit.status === 'CANCELADO') {
                          setReopenStatus('ABERTA');
                        } else {
                          setReopenStatus('RETORNO_GARANTIA');
                        }
                        setIsReopenModalOpen(true);
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer text-xs"
                      title="Reabre esta OS cancelada ou finalizada escolhendo o novo status"
                    >
                      <History className="w-3.5 h-3.5" />
                      Reabrir OS
                    </button>
                  ) : (
                    <div className="text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      Reabertura não permitida para seu usuário
                    </div>
                  )
                )}

                {orderToEdit && canDeleteOS && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: 'Excluir Ordem de Serviço',
                        message: `ATENÇÃO: Deseja EXCLUIR DEFINITIVAMENTE a ${orderToEdit.code || 'OS'}? Esta ação não poderá ser desfeita.`,
                        confirmText: 'Sim, Excluir Definitivamente',
                        variant: 'danger',
                        onConfirm: async () => {
                          setSubmitting(true);
                          await deleteOrder(orderToEdit.id);
                          if (onDeleteOrder) onDeleteOrder(orderToEdit.id);
                          setSubmitting(false);
                          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                          onSuccess();
                          onClose();
                        },
                      });
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer text-xs"
                    title="Exclui definitivamente a Ordem de Serviço do banco de dados"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    Excluir OS
                  </button>
                )}
              </div>

              {/* LADO DIREITO: Imprimir, Finalizar, Salvar */}
              <div className="flex items-center gap-2">
                {!isCanceledOrder && (
                  <div className="relative" ref={printMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowPrintMenu(!showPrintMenu)}
                      className="bg-indigo-700 hover:bg-indigo-800 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer text-xs"
                      title="Selecione o comprovante ou orçamento para imprimir"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-200" />
                      Imprimir
                      <ChevronDown className={`w-3.5 h-3.5 text-indigo-200 transition-transform ${showPrintMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showPrintMenu && (
                      <div className="absolute bottom-full right-0 mb-2 w-56 bg-white border border-slate-300 rounded-xl shadow-xl z-50 overflow-hidden text-xs py-1 animate-fadeIn">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPrintMenu(false);
                            setPrintTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                            if (sessionBatchOrders.length > 0) {
                              setPendingPrintMode('ESTIMATE');
                              setSelectedBatchOrderIds(['CURRENT', ...sessionBatchOrders.map((o) => o.id)]);
                              setIsBatchPrintModalOpen(true);
                            } else {
                              setPrintMode('ESTIMATE');
                              setTimeout(() => {
                                window.print();
                              }, 200);
                            }
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-slate-800 font-medium flex items-center gap-2 transition-colors cursor-pointer border-b border-slate-100"
                        >
                          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <div className="font-bold text-indigo-950">Gerar Orçamento</div>
                            <div className="text-[10px] text-slate-500">Proposta comercial para o cliente</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowPrintMenu(false);
                            setPrintTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                            if (sessionBatchOrders.length > 0) {
                              setPendingPrintMode('ENTRY_RECEIPT');
                              setSelectedBatchOrderIds(['CURRENT', ...sessionBatchOrders.map((o) => o.id)]);
                              setIsBatchPrintModalOpen(true);
                            } else {
                              setPrintMode('ENTRY_RECEIPT');
                              setTimeout(() => {
                                window.print();
                              }, 200);
                            }
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-sky-50 text-slate-800 font-medium flex items-center gap-2 transition-colors cursor-pointer border-b border-slate-100"
                        >
                          <Printer className="w-4 h-4 text-sky-600 shrink-0" />
                          <div>
                            <div className="font-bold text-sky-950">Comprovante de Entrada</div>
                            <div className="text-[10px] text-slate-500">2 vias A4 (Empresa e Cliente)</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowPrintMenu(false);
                            setPrintTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                            if (sessionBatchOrders.length > 0) {
                              setPendingPrintMode('EXIT_RECEIPT');
                              setSelectedBatchOrderIds(['CURRENT', ...sessionBatchOrders.map((o) => o.id)]);
                              setIsBatchPrintModalOpen(true);
                            } else {
                              setPrintMode('EXIT_RECEIPT');
                              setTimeout(() => {
                                window.print();
                              }, 200);
                            }
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-slate-800 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Printer className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-bold text-emerald-950">Comprovante de Saída</div>
                            <div className="text-[10px] text-slate-500">Recibo final de entrega de equipamento</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {!isReadOnly && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (!visitData.technicianName || !visitData.technicianName.trim()) {
                          return alert('⚠️ É necessário primeiro definir o Técnico Responsável para finalizar a Ordem de Serviço.\n\nPor favor, selecione um Técnico no seletor abaixo.');
                        }
                        if (!attendantName || !attendantName.trim()) {
                          return alert('⚠️ É necessário primeiro definir o Atendente para finalizar a Ordem de Serviço.\n\nPor favor, selecione o Atendente no campo superior.');
                        }
                        setCustomExitDate(exitDate || new Date().toISOString().split('T')[0]);
                        setIsFinalizeModalOpen(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer text-xs"
                      title="Abre a confirmação de finalização da OS"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Finalizar OS
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer text-xs"
                    >
                      {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Salvar OS
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* MODAL COMPLETO DE CONFIRMAÇÃO DE FINALIZAÇÃO DA OS */}
      {isFinalizeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans text-xs flex flex-col">
            <div className="px-3.5 py-2.5 bg-emerald-700 text-white flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                Opções de Finalização e Entrega da Ordem de Serviço
              </h3>
              <button
                onClick={() => setIsFinalizeModalOpen(false)}
                className="text-white/80 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-2 text-slate-800 bg-slate-50">
              {/* RESUMO FINANCEIRO COMPACTO DA OS */}
              <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>Resumo de Valores</span>
                    {(orderStatus === 'RETORNO_GARANTIA' || orderStatus === 'GARANTIA_FINALIZADA' || Boolean(originalOsCode)) && (
                      <label className={`flex items-center gap-1 px-1.5 py-0.2 rounded border text-[10px] font-bold cursor-pointer transition-all select-none ${isZeroValueWarranty ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-slate-100 border-slate-300 text-slate-600'}`}>
                        <input
                          type="checkbox"
                          checked={isZeroValueWarranty}
                          onChange={(e) => setIsZeroValueWarranty(e.target.checked)}
                          className="w-3 h-3 text-amber-600 rounded border-slate-300 focus:ring-0 cursor-pointer"
                        />
                        <span>Garantia Sem Custo (R$ 0,00)</span>
                      </label>
                    )}
                  </div>
                  <span className="font-mono text-emerald-700 font-extrabold">#{orderToEdit?.code || 'NOVA_OS'}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[11px] items-center">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">Peças:</span>
                    <span className="font-bold font-mono text-slate-900">R$ {totalPartsVal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">Serviços:</span>
                    <span className="font-bold font-mono text-slate-900">R$ {totalServicesVal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div>
                    <span className="text-slate-700 block text-[10px] font-bold">Desloc. (R$):</span>
                    <input
                      type="text"
                      value={travelCost}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setTravelCost(e.target.value)}
                      onBlur={(e) => setTravelCost(formatCurrencyOnBlur(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setTravelCost(formatCurrencyOnBlur((e.target as HTMLInputElement).value));
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder="0,00"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 font-bold font-mono text-slate-900 text-xs focus:outline-none focus:border-sky-600 shadow-2xs"
                    />
                  </div>
                  <div>
                    <span className="text-red-700 block text-[10px] font-bold">Desconto (R$):</span>
                    <input
                      type="text"
                      value={discountCost}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setDiscountCost(e.target.value)}
                      onBlur={(e) => setDiscountCost(formatCurrencyOnBlur(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setDiscountCost(formatCurrencyOnBlur((e.target as HTMLInputElement).value));
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder="0,00"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 font-bold font-mono text-red-600 text-xs focus:outline-none focus:border-red-500 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Adiantamento e total restante */}
                {(() => {
                  const advance = parseFloat((advancePayment || '0').replace(',', '.')) || 0;
                  const remaining = Math.max(0, grandTotalVal - advance);
                  return (
                    <div className="border-t border-slate-100 pt-1 space-y-0.5">
                      {advance > 0 && (
                        <div className="flex justify-between items-center text-[11px] text-amber-700 font-bold">
                          <span>Adiantamento pago:</span>
                          <span className="font-mono">- R$ {advance.toFixed(2).replace('.', ',')}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-xs font-bold text-emerald-900">
                        <span>{advance > 0 ? 'RESTANTE A PAGAR:' : 'VALOR TOTAL A PAGAR:'}</span>
                        <span className="text-sm font-black font-mono text-emerald-700">
                          R$ {(advance > 0 ? remaining : grandTotalVal).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* OPÇÕES DE FINALIZAÇÃO */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                {/* FORMA DE PAGAMENTO PRINCIPAL & DATA DE SAÍDA */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-800 mb-0.5">Forma de Pagamento</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-bold focus:outline-none focus:border-emerald-600 cursor-pointer text-xs"
                    >
                      <option value="">-- Selecione uma forma de pagamento --</option>
                      <option value="PIX">PIX</option>
                      <option value="DINHEIRO">Dinheiro (Espécie)</option>
                      <option value="CARTAO_DEBITO">Cartão de Débito</option>
                      <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                      <option value="BOLETO">Boleto Bancário</option>
                      <option value="FATURADO">Faturado / A Prazo</option>
                      <option value="SEM_PAGAMENTO">Sem Pagamento / Cortesia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-800 mb-0.5">Data de Saída / Entrega *</label>
                    <input
                      type="date"
                      value={customExitDate}
                      onChange={(e) => {
                        setCustomExitDate(e.target.value);
                        setExitDate(e.target.value);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-bold focus:outline-none focus:border-emerald-600 cursor-pointer text-xs"
                    />
                  </div>
                </div>

                {/* OPÇÃO DE PARCELAMENTO SE CARTÃO DE CRÉDITO */}
                {paymentMethod === 'CARTAO_CREDITO' && (
                  <div className="p-1.5 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-between gap-2 text-xs">
                    <label className="text-[11px] font-bold text-sky-900 whitespace-nowrap">Parcelamento (Cartão):</label>
                    <select
                      value={cardInstallments}
                      onChange={(e) => setCardInstallments(e.target.value)}
                      className="bg-white border border-sky-300 rounded-lg px-2 py-0.5 text-sky-950 font-bold text-xs focus:outline-none focus:border-sky-600 cursor-pointer"
                    >
                      <option value="1">1x à vista (R$ {grandTotalVal.toFixed(2).replace('.', ',')})</option>
                      <option value="2">2x de R$ {(grandTotalVal / 2).toFixed(2).replace('.', ',')}</option>
                      <option value="3">3x de R$ {(grandTotalVal / 3).toFixed(2).replace('.', ',')}</option>
                      <option value="4">4x de R$ {(grandTotalVal / 4).toFixed(2).replace('.', ',')}</option>
                      <option value="5">5x de R$ {(grandTotalVal / 5).toFixed(2).replace('.', ',')}</option>
                      <option value="6">6x de R$ {(grandTotalVal / 6).toFixed(2).replace('.', ',')}</option>
                      <option value="10">10x de R$ {(grandTotalVal / 10).toFixed(2).replace('.', ',')}</option>
                      <option value="12">12x de R$ {(grandTotalVal / 12).toFixed(2).replace('.', ',')}</option>
                    </select>
                  </div>
                )}

                {/* ADIANTAMENTO & DIVISÃO DE PAGAMENTO */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-800 mb-0.5">Adiantamento / Sinal (R$)</label>
                    <input
                      type="text"
                      value={advancePayment}
                      onChange={(e) => setAdvancePayment(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600 text-xs"
                    />
                  </div>

                  <div className="flex items-center pt-3">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isPartialPayment}
                        onChange={(e) => setIsPartialPayment(e.target.checked)}
                        className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      Dividir em 2 Formas
                    </label>
                  </div>
                </div>

                {/* PAINEL SEGUNDA FORMA DE PAGAMENTO */}
                {isPartialPayment && (
                  <div className="p-2 bg-amber-50/90 border border-amber-200 rounded-lg grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 mb-0.5">2ª Forma Pagamento</label>
                      <select
                        value={secondaryPaymentMethod}
                        onChange={(e) => setSecondaryPaymentMethod(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 text-slate-900 font-bold focus:outline-none focus:border-amber-600 cursor-pointer text-xs"
                      >
                        <option value="">-- Selecione --</option>
                        <option value="DINHEIRO">Dinheiro (Espécie)</option>
                        <option value="PIX">PIX</option>
                        <option value="CARTAO_DEBITO">Cartão de Débito</option>
                        <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                        <option value="BOLETO">Boleto Bancário</option>
                        <option value="FATURADO">Faturado / A Prazo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 mb-0.5">Valor 2ª Forma (R$)</label>
                      <input
                        type="text"
                        value={secondaryPaymentAmount}
                        onChange={(e) => setSecondaryPaymentAmount(e.target.value)}
                        placeholder="0,00"
                        className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-600 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* GARANTIA - só exibe se for Garantia da Empresa */}
                {warrantyType === 'GARANTIA_LOJA' && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-emerald-900">Garantia da Empresa:</span>
                    <span className="font-mono font-black text-emerald-700 text-xs">
                      {warrantyTermsData.periodDays === 'NAO_SE_APLICA' ? 'Não se Aplica' : `${warrantyTermsData.periodDays} dias`}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600">Tipo:</span>
                    <span className="text-[11px] font-bold text-emerald-800">{warrantyType === 'GARANTIA_LOJA' ? 'Garantia da Empresa' : warrantyType}</span>
                  </div>
                )}

                {/* OPÇÕES DE IMPRESSÃO AO FINALIZAR */}
                <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={printExitReceipt}
                        onChange={(e) => setPrintExitReceipt(e.target.checked)}
                        className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <Printer className="w-3.5 h-3.5 text-emerald-700" />
                      Imprimir Documento ao Confirmar
                    </label>

                    {printExitReceipt && (
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-300">
                        <button
                          type="button"
                          onClick={() => setFinalizePrintDocument('EXIT_RECEIPT')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${finalizePrintDocument === 'EXIT_RECEIPT'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                          Comprovante Saída
                        </button>
                        <button
                          type="button"
                          onClick={() => setFinalizePrintDocument('ESTIMATE')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${finalizePrintDocument === 'ESTIMATE'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                          Orçamento
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsFinalizeModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-all cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={async () => {
                    const finalExitDate = (reopenHistory.length > 0 && originalExitDate)
                      ? originalExitDate
                      : (exitDate || customExitDate || new Date().toISOString().split('T')[0]);
                    setExitDate(finalExitDate);
                    const isWarrantyOrder = orderStatus === 'RETORNO_GARANTIA' || (reopenHistory && reopenHistory.length > 0) || Boolean(orderToEdit?.originalOsCode);
                    const targetFinalStatus = isWarrantyOrder ? 'GARANTIA_FINALIZADA' : 'FINALIZADA';
                    setOrderStatus(targetFinalStatus);
                    setIsFinalizeModalOpen(false);

                    if (printExitReceipt) {
                      setPrintTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                      setPrintMode(finalizePrintDocument);
                      setTimeout(() => {
                        window.print();
                      }, 300);
                    }

                    // Dispara submissão do formulário
                    setTimeout(() => {
                      const formEl = document.querySelector('form');
                      if (formEl) formEl.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }, 100);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer text-xs"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Confirmar e Finalizar OS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA REABRIR OS COM SELEÇÃO DE STATUS */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans text-xs flex flex-col">
            <div className="p-3.5 bg-amber-600 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold flex items-center gap-2">
                <History className="w-4 h-4" /> Reabrir Ordem de Serviço #{orderToEdit?.code || 'OS'}
              </h3>
              <button onClick={() => setIsReopenModalOpen(false)} className="text-white/80 hover:text-white p-0.5 rounded cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 bg-slate-50 text-slate-800">
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                {orderToEdit && (orderToEdit.status === 'CANCELADA' || orderToEdit.status === 'CANCELADO')
                  ? 'Esta OS foi cancelada anteriormente. Selecione para qual status você deseja reabri-la:'
                  : 'Selecione o novo status para o qual esta Ordem de Serviço finalizada será reaberta:'}
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">Novo Status da OS *</label>
                <select
                  value={reopenStatus}
                  onChange={(e) => setReopenStatus(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-600 cursor-pointer shadow-2xs"
                >
                  {orderToEdit && (orderToEdit.status === 'CANCELADA' || orderToEdit.status === 'CANCELADO') ? (
                    // Opções de reabertura para OS Cancelada (status operacionais ativos)
                    (dynamicStatuses && dynamicStatuses.length > 0 ? dynamicStatuses : [
                      { name: 'ABERTA' },
                      { name: 'ORCAMENTO_APROVADO' },
                      { name: 'EM_ATENDIMENTO' },
                      { name: 'APROVADO' },
                      { name: 'AGUARDANDO_PECA' },
                      { name: 'APARELHO_LIBERADO' },
                    ])
                      .filter((s: any) => {
                        const stName = String(s.name || s.id || '').toUpperCase();
                        return stName !== 'CANCELADA' && stName !== 'CANCELADO' && stName !== 'FINALIZADA' && stName !== 'RETORNO_GARANTIA';
                      })
                      .map((s: any) => {
                        const stName = String(s.name || s.id || '').toUpperCase();
                        const label = stName.replace(/_/g, ' ');
                        return (
                          <option key={stName} value={stName}>
                            {label}
                          </option>
                        );
                      })
                  ) : (
                    // Opção fixa de reabertura para OS Finalizada (Retorno em Garantia)
                    <option value="RETORNO_GARANTIA">Retorno em Garantia (Equipamento retornou no prazo)</option>
                  )}
                </select>
              </div>

              {reopenStatus === 'RETORNO_GARANTIA' && (
                <div className="space-y-2">
                  {warrantyLineage.activeReturn && (
                    <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-[11px] text-red-950 font-bold space-y-1.5 shadow-xs">
                      <span className="flex items-center gap-1.5 text-red-900 font-extrabold text-xs">
                        ⚠️ ATENÇÃO: Já existe um Retorno em Aberto!
                      </span>
                      <p className="text-red-900 font-normal">
                        A ordem de retorno <strong>#{warrantyLineage.activeReturn.code}</strong> já foi criada para este atendimento e ainda está em andamento (status: <strong>{warrantyLineage.activeReturn.status?.replace(/_/g, ' ')}</strong>).
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsReopenModalOpen(false);
                          if (onOpenWarrantyOrder) onOpenWarrantyOrder(warrantyLineage.activeReturn);
                        }}
                        className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 mt-1 shadow"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        Ir para a OS #{warrantyLineage.activeReturn.code} em Aberto
                      </button>
                    </div>
                  )}

                  {warrantyLineage.finishedReturns.length > 0 && !warrantyLineage.activeReturn && (
                    <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-[11px] text-purple-950 font-medium space-y-1">
                      <span className="font-bold block text-purple-900">ℹ️ Retornos Anteriores Concluídos:</span>
                      <p>
                        Esta OS já teve {warrantyLineage.finishedReturns.length} retorno(s) finalizado(s) ({warrantyLineage.finishedReturns.map((r: any) => `#${r.code}`).join(', ')}). Ao confirmar, uma <strong>nova OS de garantia</strong> será criada com histórico acumulado de todos os serviços.
                      </p>
                    </div>
                  )}

                  <div className="p-2.5 bg-amber-100/90 border border-amber-300 rounded-xl text-[11px] text-amber-950 font-medium space-y-1">
                    <span className="font-bold block text-amber-900">ℹ️ Registro Automático de Histórico de Garantia:</span>
                    <p>
                      Todos os serviços originais e retornos anteriores serão preservados e exibidos de forma inalterável na nova OS gerada.
                    </p>
                  </div>
                </div>
              )}

              {orderToEdit && (orderToEdit.status === 'CANCELADA' || orderToEdit.status === 'CANCELADO') && (
                <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-[11px] text-sky-950 font-medium space-y-1">
                  <span className="font-bold block text-sky-900">ℹ️ Reativação da OS:</span>
                  <p>
                    A Ordem de Serviço voltará a ficar 100% liberada para edição normalmente no status escolhido, registrando a reabertura no histórico.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsReopenModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-all cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={async () => {
                    if (!orderToEdit) return;

                    const isCanceledOrder = orderToEdit.status === 'CANCELADA' || orderToEdit.status === 'CANCELADO';

                    // Reabertura em Garantia de OS Finalizada: gera uma NOVA OS com novo número sequencial
                    if (!isCanceledOrder && reopenStatus === 'RETORNO_GARANTIA' && onCreateWarrantyReturn) {
                      setSubmitting(false);
                      setIsReopenModalOpen(false);
                      onCreateWarrantyReturn(orderToEdit);
                      return;
                    }

                    setSubmitting(true);

                    const now = new Date();
                    const dateTimeStr = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                    const userName = currentUser?.name || currentUser?.username || 'Administrador';

                    if (isCanceledOrder) {
                      // REABERTURA DE OS CANCELADA:
                      // Volta ao fluxo normal sem comportamento de garantia, apenas adicionando registro na auditoria
                      const newAuditEntry = {
                        date: dateTimeStr,
                        user: userName,
                        action: `OS Reaberta de CANCELADA para o status "${reopenStatus.replace(/_/g, ' ')}"`,
                        details: [`A OS foi reativada por ${userName} e voltou para o fluxo normal de atendimento`],
                      };

                      const currentAudit = Array.isArray(auditHistory) ? auditHistory : [];
                      const updatedAudit = [newAuditEntry, ...currentAudit];

                      const updatedOrder = await updateOrder(orderToEdit.id, {
                        status: reopenStatus,
                        attendant: attendantName || orderToEdit.attendant || orderToEdit.attendantName || '',
                        attendantName: attendantName || orderToEdit.attendant || orderToEdit.attendantName || '',
                        technician: visitData.technicianName || orderToEdit.technician || '',
                        auditHistory: updatedAudit,
                      });

                      const savedOrderObj = updatedOrder || {
                        ...orderToEdit,
                        status: reopenStatus,
                        attendant: attendantName || orderToEdit.attendant || orderToEdit.attendantName || '',
                        attendantName: attendantName || orderToEdit.attendant || orderToEdit.attendantName || '',
                        technician: visitData.technicianName || orderToEdit.technician || '',
                        auditHistory: updatedAudit,
                      };

                      setOrderStatus(reopenStatus);
                      setAuditHistory(updatedAudit);
                      setActiveEditingOrder(savedOrderObj);

                      setSubmitting(false);
                      setIsReopenModalOpen(false);
                      setIsDirty(false);
                      onSuccess(savedOrderObj);
                      return;
                    }

                    // REABERTURA DE OS FINALIZADA:
                    const origService = originalExecutedService || executedService;
                    const updatedHistory = [
                      ...reopenHistory,
                      {
                        date: dateTimeStr,
                        reason: reopenStatus === 'RETORNO_GARANTIA' ? 'Retorno em Garantia de Equipamento' : `Reabertura de OS para status ${reopenStatus}`,
                        oldExitDate: exitDate || 'Não informada',
                        executedService: origService || 'Nenhum serviço registrado',
                        returnExecutedService: returnExecutedService || '',
                      },
                    ];

                    const combinedNotes = (nfData.additionalNotes || '') +
                      `___ORIGINAL_SERVICE___${origService}___RETURN_SERVICE___${returnExecutedService}` +
                      `___REOPEN_HISTORY___${JSON.stringify(updatedHistory)}`;

                    const exitDateToKeep = originalExitDate || exitDate || new Date().toISOString().split('T')[0];
                    if (!originalExitDate) setOriginalExitDate(exitDateToKeep);

                    const newAuditEntry = {
                      date: dateTimeStr,
                      user: userName,
                      action: `OS Reaberta de FINALIZADA para o status "${reopenStatus.replace(/_/g, ' ')}"`,
                      details: [`Reabertura realizada por ${userName}`],
                    };
                    const updatedAudit = [newAuditEntry, ...(Array.isArray(auditHistory) ? auditHistory : [])];

                    const updatedOrder = await updateOrder(orderToEdit.id, {
                      status: reopenStatus,
                      exitDate: exitDateToKeep,
                      additionalNotes: combinedNotes,
                      auditHistory: updatedAudit,
                    });

                    const savedOrderObj = updatedOrder || {
                      ...orderToEdit,
                      status: reopenStatus,
                      exitDate: exitDateToKeep,
                      auditHistory: updatedAudit,
                    };

                    setOrderStatus(reopenStatus);
                    setReopenHistory(updatedHistory);
                    setAuditHistory(updatedAudit);
                    setExitDate(exitDateToKeep);
                    setActiveEditingOrder(savedOrderObj);
                    if (!originalExecutedService) setOriginalExecutedService(executedService);

                    setSubmitting(false);
                    setIsReopenModalOpen(false);
                    setIsDirty(false);
                    onSuccess(savedOrderObj);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer text-xs"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Confirmar e Reabrir OS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DO HISTÓRICO DE REABERTURAS POR GARANTIA */}
      {showReopenHistoryDetails && (
        <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans text-xs flex flex-col">
            <div className="p-3.5 bg-amber-700 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold flex items-center gap-2">
                <History className="w-4 h-4" /> Detalhes do Histórico de Reabertura por Garantia
              </h3>
              <button onClick={() => setShowReopenHistoryDetails(false)} className="text-white/80 hover:text-white p-0.5 rounded cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 bg-slate-50 text-slate-800 max-h-[75vh] overflow-y-auto">
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-amber-900 block text-xs">Ordem de Serviço #{orderToEdit?.code || 'OS'}</span>
                <p className="text-[11px] text-slate-600">
                  Histórico cronológico de retornos em garantia e reaberturas registradas neste atendimento.
                </p>
              </div>

              {reopenHistory.length > 0 ? (
                <div className="space-y-2">
                  {reopenHistory.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-950 pb-1 border-b border-slate-100">
                        <span>Reabertura #{idx + 1} - 🕒 {item.date}</span>
                        <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono">
                          Saída Anterior: {item.oldExitDate || 'N/A'}
                        </span>
                      </div>
                      <p className="text-slate-800 font-bold text-xs">{item.reason}</p>

                      {/* EXIBIÇÃO DO SERVIÇO EXECUTADO */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase block">🔒 1º Serviço Executado Original:</span>
                          <span className="text-xs text-slate-800 font-semibold">{item.executedService || originalExecutedService || executedService || 'Nenhum serviço registrado'}</span>
                        </div>
                        {item.returnExecutedService && (
                          <div className="pt-1 border-t border-slate-200">
                            <span className="text-[10px] font-extrabold text-amber-800 uppercase block">🛠️ Serviço Executado no Retorno:</span>
                            <span className="text-xs text-amber-950 font-semibold">{item.returnExecutedService}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500 italic">
                  Nenhuma reabertura registrada no histórico desta OS até o momento.
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowReopenHistoryDetails(false)}
                  className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs"
                >
                  Fechar Janela
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODELO EXCLUSIVO DE IMPRESSÃO DA OS (SUPORTA IMPRESSÃO EM LOTE DE MÚLTIPLOS APARELHOS) */}
      <div className="os-print-root hidden print:block fixed inset-0 bg-white p-6 font-sans text-slate-900 z-[9999]">
        {(() => {
          // Constrói a lista de OS a serem impressas
          const currentOrderObj = {
            id: 'CURRENT',
            code: orderToEdit?.code || `OS-${String((totalOrders ?? 0) + 1 + batchCounterOffset).padStart(4, '0')}`,
            client: clientData,
            attendant: attendantName,
            attendantName: attendantName,
            technician: visitData.technicianName,
            equipment: equipmentData,
            problemDescription,
            technicalReport,
            executedService,
            servicesList,
            partsList,
            travelCost,
            discountCost,
            grandTotalVal,
            entryDate,
            exitDate: exitDate || customExitDate,
            status: orderStatus,
            type: orderType,
            warrantyType,
            warrantyTermsData,
            nfData,
            paymentMethod,
            cardInstallments,
            advancePayment,
            originalOsCode: originalOsCode || orderToEdit?.originalOsCode || '',
            originalExecutedService: originalExecutedService || orderToEdit?.originalExecutedService || '',
            returnExecutedService: returnExecutedService || orderToEdit?.returnExecutedService || '',
          };

          const allOrdersToConsider = [currentOrderObj, ...sessionBatchOrders];
          const ordersToPrint = sessionBatchOrders.length > 0 && selectedBatchOrderIds.length > 0
            ? allOrdersToConsider.filter((o) => selectedBatchOrderIds.includes(o.id))
            : [currentOrderObj];

          return ordersToPrint.map((orderItem, orderIdx) => {
            const cClient = orderItem.client || clientData;
            const cAttendant = orderItem.attendant || orderItem.attendantName || attendantName;
            const cTech = orderItem.technician || visitData.technicianName;
            const cEq = orderItem.equipment || equipmentData;
            const cServices = orderItem.servicesList || [];
            const cParts = orderItem.partsList || [];
            const cTotal = orderItem.grandTotalVal || orderItem.totalAmount || 0;
            const cProblem = orderItem.problemDescription || '';
            const cReport = orderItem.technicalReport || '';
            const cExecuted = orderItem.executedService || '';
            const cWarrantyTerms = orderItem.warrantyTermsData || warrantyTermsData;
            const cWarrantyType = orderItem.warrantyType || warrantyType;
            const cNfData = orderItem.nfData || nfData || {};
            const cEntry = orderItem.entryDate || entryDate;
            const cExit = orderItem.exitDate || exitDate;

            return (
              <div key={orderIdx} className={`print-single-sheet ${orderIdx > 0 ? 'print-page-break' : ''}`}>
                {printMode === 'ENTRY_RECEIPT' ? (
                  /* COMPROVANTE DE ENTRADA (FOLHA A4 - 2 VIAS: VIA EMPRESA E VIA CLIENTE) */
                  <div className="entry-receipt-container flex flex-col justify-between h-full">
                    {/* VIA 1: VIA DA EMPRESA */}
                    <div className="entry-receipt-via border border-slate-400 p-2.5 rounded-lg bg-slate-50/20 text-[9.5px] flex flex-col justify-between">
                      <div className="space-y-1.5">
                        {/* TOPO VIA 1 */}
                        <div className="flex justify-between items-center border-b border-slate-300 pb-1.5 gap-2">
                          <div className="flex items-center gap-2.5">
                            {companyInfo.logoUrl && (
                              <img src={companyInfo.logoUrl} alt="Logo" className="h-9 w-auto object-contain shrink-0" />
                            )}
                            <div>
                              <h1 className="text-xs font-black text-slate-900 uppercase leading-tight">{companyInfo.tradingName || companyInfo.name || 'Vollen - Gestão OS'}</h1>
                              <p className="text-[8.5px] text-slate-600 font-medium">{companyInfo.slogan || 'Assistência Técnica Especializada'}</p>
                              <p className="text-[8px] text-slate-500">
                                CNPJ: {companyInfo.cnpj} | Tel: {companyInfo.phone || companyInfo.whatsapp} | {companyInfo.email}
                              </p>
                              <p className="text-[8px] text-slate-500">
                                {companyInfo.address}, {companyInfo.number} - {companyInfo.neighborhood} • {companyInfo.city}/{companyInfo.state}
                              </p>
                            </div>
                          </div>

                          {/* BLOCO DA OS E IDENTIFICAÇÃO DA VIA */}
                          <div className="text-right flex flex-col items-end shrink-0">
                            <span className="text-[8px] font-black uppercase text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded border border-sky-300 mb-0.5">
                              COMPROVANTE DE ENTRADA • VIA DA EMPRESA
                            </span>
                            <div className="text-sm font-black text-slate-900 font-mono leading-tight">
                              {String(orderItem.code).startsWith('OS') ? orderItem.code : `OS-${orderItem.code}`}
                              {(orderItem.originalOsCode || orderItem.status === 'RETORNO_GARANTIA' || orderItem.status === 'GARANTIA_FINALIZADA') && (
                                <span className="block text-[8px] font-bold text-amber-800 font-sans mt-0.5">
                                  {orderItem.originalOsCode ? `(Retorno da OS #${orderItem.originalOsCode})` : '(Retorno em Garantia)'}
                                </span>
                              )}
                            </div>
                            <div className="text-[8.5px] font-bold text-slate-700">
                              ENTRADA: {cEntry ? new Date(cEntry).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-[8px] font-semibold text-slate-500">
                              EMISSÃO: {printTime || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                          </div>
                        </div>

                        {/* DADOS DO CLIENTE & EQUIPAMENTO */}
                        <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
                          <div className="bg-white p-1.5 rounded border border-slate-200 space-y-0.5">
                            <p className="font-bold text-slate-800 border-b pb-0.5 mb-0.5 text-[8.5px] uppercase">Dados do Cliente</p>
                            <p><strong>Nome:</strong> {cClient.name || ''}</p>
                            <p><strong>Endereço:</strong> {cClient.address ? `${cClient.address}${cClient.number ? `, ${cClient.number}` : ''}` : ''}</p>
                            <p><strong>Bairro:</strong> {cClient.neighborhood || ''} {cClient.city ? `| Cidade/UF: ${cClient.city}/${cClient.state || ''}` : ''}</p>
                            {cClient.complement && <p><strong>Complemento:</strong> {cClient.complement}</p>}
                            {cClient.reference && <p><strong>Referência:</strong> {cClient.reference}</p>}
                            <p><strong>Telefone:</strong> {cClient.phone || ''} {cClient.whatsapp ? `| WhatsApp: ${cClient.whatsapp}` : ''}</p>
                          </div>
                          <div className="bg-white p-1.5 rounded border border-slate-200 space-y-0.5">
                            <p className="font-bold text-slate-800 border-b pb-0.5 mb-0.5 text-[8.5px] uppercase">Dados do Aparelho / Equipamento</p>
                            <p><strong>Equipamento:</strong> {cEq.type || ''}</p>
                            <p><strong>Marca:</strong> {cEq.brand || ''} {cEq.model ? <><span> | </span><strong>Modelo:</strong> {` ${cEq.model}`}</> : ''}</p>
                            <p><strong>Nº de Série:</strong> {cEq.serialNumber || ''}</p>
                            <p><strong>Acessórios:</strong> {cEq.accessories || ''}</p>
                          </div>
                        </div>

                        {/* RESPONSÁVEIS & DADOS COMPLEMENTARES / NF */}
                        <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                          <div className="bg-sky-50/70 p-1 rounded border border-sky-200 flex flex-col justify-center">
                            <span className="font-bold text-sky-950 uppercase text-[7.5px] block border-b border-sky-200 pb-0.5 mb-0.5">Atendente:</span>
                            <span className="font-semibold text-slate-800 truncate block">{cAttendant || ''}</span>
                          </div>

                          {/* DADOS DA NF / GARANTIA DO FABRICANTE / GARANTIA DA EMPRESA */}
                          <div className="bg-slate-100 p-1 rounded border border-slate-200 flex flex-col justify-center text-[8.5px]">
                            {cWarrantyType === 'GARANTIA_FABRICA' ? (
                              <>
                                <span className="font-bold text-slate-800 uppercase text-[7.5px] block border-b border-slate-300 pb-0.5 mb-0.5">DADOS DA NOTA FISCAL / GARANTIA DO FABRICANTE:</span>
                                <div className="flex flex-wrap gap-x-2 text-slate-700">
                                  <span><strong>NF:</strong> {cNfData.nfNumber || ''}</span>
                                  <span><strong>Compra:</strong> {cNfData.purchaseDate ? new Date(cNfData.purchaseDate).toLocaleDateString('pt-BR') : ''}</span>
                                  <span><strong>Revenda:</strong> {cNfData.retailerName || ''}</span>
                                  <span><strong>Autoriz.:</strong> {cNfData.authorizedCode || ''}</span>
                                </div>
                              </>
                            ) : cWarrantyType === 'GARANTIA_LOJA' ? (
                              (() => {
                                const baseDateStr = cWarrantyTerms?.startDate || cExit;
                                const days = parseInt(cWarrantyTerms?.periodDays || '90', 10);
                                let expiryStr = '';
                                if (baseDateStr && !isNaN(days) && days > 0) {
                                  try {
                                    const dp = baseDateStr.split('-').map(Number);
                                    const sd = new Date(dp[0], dp[1] - 1, dp[2]);
                                    const ed = new Date(sd);
                                    ed.setDate(ed.getDate() + days);
                                    expiryStr = ed.toLocaleDateString('pt-BR');
                                  } catch {}
                                }
                                const origCode = orderItem.originalOsCode || '';
                                return (
                                  <>
                                    <span className="font-bold text-slate-800 uppercase text-[7.5px] block border-b border-slate-300 pb-0.5 mb-0.5">GARANTIA DA EMPRESA:</span>
                                    <div className="flex flex-wrap gap-x-2 text-slate-700">
                                      {origCode && <span><strong>OS Orig.:</strong> #{origCode}</span>}
                                      {expiryStr
                                        ? <span><strong>Válida até:</strong> {expiryStr}</span>
                                        : <span className="text-slate-500">Data de saída não informada</span>
                                      }
                                      <span><strong>Prazo:</strong> {isNaN(days) ? '90' : days} dias</span>
                                    </div>
                                  </>
                                );
                              })()
                            ) : (
                              <div className="flex items-center h-full">
                                <span className="font-bold text-slate-700 uppercase text-[7.5px]">
                                  GARANTIA FABRICA / EMPRESA: NÃO SE APLICA
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* OBSERVAÇÕES DO EQUIPAMENTO */}
                        {printEquipmentObservations && (
                          <div className="text-[9px] bg-white p-1.5 rounded border border-slate-200">
                            <p className="font-bold text-slate-800 text-[8.5px] uppercase border-b border-slate-100 pb-0.5 mb-0.5">Obs. do Equipamento:</p>
                            <div className="whitespace-pre-wrap leading-tight text-slate-800 truncate min-h-[1.2em]">{cEq.observations || '\u00A0'}</div>
                          </div>
                        )}

                        {/* DEFEITO, LAUDO & TERMOS */}
                        <div className="text-[9px] bg-white p-1.5 rounded border border-slate-200 space-y-1">
                          {printProblemDescription && (
                            <div>
                              <p className="font-bold text-slate-800 text-[8.5px] uppercase border-b border-slate-100 pb-0.5 mb-0.5">Defeito / Reclamação do Cliente:</p>
                              <div className="whitespace-pre-wrap leading-tight text-slate-800 min-h-[2.2em]">{cProblem ? cProblem : '\u00A0\n\u00A0'}</div>
                            </div>
                          )}
                          {printTechnicalReport && (
                            <div className={`${printProblemDescription ? 'border-t border-slate-100 pt-0.5' : ''}`}>
                              <p className="font-bold text-slate-800 text-[8.5px] uppercase border-b border-slate-100 pb-0.5 mb-0.5">Laudo Técnico Inicial:</p>
                              <div className="whitespace-pre-wrap leading-tight text-slate-800 min-h-[2.2em]">{cReport ? cReport : '\u00A0\n\u00A0'}</div>
                            </div>
                          )}
                          <div className="pt-0.5 border-t border-slate-100 mt-0.5">
                            <p className="font-bold text-slate-800 text-[8px] uppercase">Termos de Entrada:</p>
                            <p className="text-[7.8px] text-slate-500 leading-tight whitespace-pre-wrap">{defaultWarrantyConfig?.defaultEntryTerms || defaultWarrantyConfig?.defaultEstimateTerms || 'O cliente autoriza a realização da avaliação e diagnóstico técnico no equipamento descrito neste comprovante. Equipamentos não retirados em até 90 dias após notificação estarão sujeitos a taxas de armazenamento ou descarte conforme a lei.'}</p>
                          </div>
                        </div>
                      </div>

                      {/* ASSINATURAS */}
                      <div className="grid grid-cols-2 gap-4 pt-1 text-center text-[8.5px]">
                        <div>
                          <div className="border-b border-slate-400 w-2/3 mx-auto mb-0.5"></div>
                          <p className="font-bold">Assinatura da Empresa</p>
                        </div>
                        <div>
                          <div className="border-b border-slate-400 w-2/3 mx-auto mb-0.5"></div>
                          <p className="font-bold">Assinatura do Cliente</p>
                        </div>
                      </div>
                    </div>

                    {/* LINHA DE CORTE TRACEJADA / PONTILHADA */}
                    <div className="entry-receipt-cutline border-b-2 border-dashed border-slate-400 my-0 w-full"></div>

                    {/* VIA 2: VIA DO CLIENTE */}
                    <div className="entry-receipt-via border border-slate-400 p-2.5 rounded-lg bg-slate-50/20 text-[9.5px] flex flex-col justify-between">
                      <div className="space-y-1.5">
                        {/* TOPO VIA 2 */}
                        <div className="flex justify-between items-center border-b border-slate-300 pb-1.5 gap-2">
                          <div className="flex items-center gap-2.5">
                            {companyInfo.logoUrl && (
                              <img src={companyInfo.logoUrl} alt="Logo" className="h-9 w-auto object-contain shrink-0" />
                            )}
                            <div>
                              <h1 className="text-xs font-black text-slate-900 uppercase leading-tight">{companyInfo.tradingName || companyInfo.name || 'Vollen - Gestão OS'}</h1>
                              <p className="text-[8.5px] text-slate-600 font-medium">{companyInfo.slogan || 'Assistência Técnica Especializada'}</p>
                              <p className="text-[8px] text-slate-500">
                                CNPJ: {companyInfo.cnpj} | Tel: {companyInfo.phone || companyInfo.whatsapp} | {companyInfo.email}
                              </p>
                              <p className="text-[8px] text-slate-500">
                                {companyInfo.address}, {companyInfo.number} - {companyInfo.neighborhood} • {companyInfo.city}/{companyInfo.state}
                              </p>
                            </div>
                          </div>

                          {/* BLOCO DA OS E IDENTIFICAÇÃO DA VIA */}
                          <div className="text-right flex flex-col items-end shrink-0">
                            <span className="text-[8px] font-black uppercase text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 mb-0.5">
                              COMPROVANTE DE ENTRADA • VIA DO CLIENTE
                            </span>
                            <div className="text-sm font-black text-slate-900 font-mono leading-tight">
                              {String(orderItem.code).startsWith('OS') ? orderItem.code : `OS-${orderItem.code}`}
                              {(orderItem.originalOsCode || orderItem.status === 'RETORNO_GARANTIA' || orderItem.status === 'GARANTIA_FINALIZADA') && (
                                <span className="block text-[8px] font-bold text-amber-800 font-sans mt-0.5">
                                  {orderItem.originalOsCode ? `(Retorno da OS #${orderItem.originalOsCode})` : '(Retorno em Garantia)'}
                                </span>
                              )}
                            </div>
                            <div className="text-[8.5px] font-bold text-slate-700">
                              ENTRADA: {cEntry ? new Date(cEntry).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-[8px] font-semibold text-slate-500">
                              EMISSÃO: {printTime || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                          </div>
                        </div>

                        {/* DADOS DO CLIENTE & EQUIPAMENTO */}
                        <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
                          <div className="bg-white p-1.5 rounded border border-slate-200 space-y-0.5">
                            <p className="font-bold text-slate-800 border-b pb-0.5 mb-0.5 text-[8.5px] uppercase">Dados do Cliente</p>
                            <p><strong>Nome:</strong> {cClient.name || ''}</p>
                            <p><strong>Endereço:</strong> {cClient.address ? `${cClient.address}${cClient.number ? `, ${cClient.number}` : ''}` : ''}</p>
                            <p><strong>Bairro:</strong> {cClient.neighborhood || ''} {cClient.city ? `| Cidade/UF: ${cClient.city}/${cClient.state || ''}` : ''}</p>
                            {cClient.complement && <p><strong>Complemento:</strong> {cClient.complement}</p>}
                            {cClient.reference && <p><strong>Referência:</strong> {cClient.reference}</p>}
                            <p><strong>Telefone:</strong> {cClient.phone || ''} {cClient.whatsapp ? `| WhatsApp: {cClient.whatsapp}` : ''}</p>
                          </div>
                          <div className="bg-white p-1.5 rounded border border-slate-200 space-y-0.5">
                            <p className="font-bold text-slate-800 border-b pb-0.5 mb-0.5 text-[8.5px] uppercase">Dados do Aparelho / Equipamento</p>
                            <p><strong>Equipamento:</strong> {cEq.type || ''}</p>
                            <p><strong>Marca:</strong> {cEq.brand || ''} {cEq.model ? <><span> | </span><strong>Modelo:</strong> {` ${cEq.model}`}</> : ''}</p>
                            <p><strong>Nº de Série:</strong> {cEq.serialNumber || ''}</p>
                            <p className="whitespace-pre-wrap"><strong>Acessórios:</strong> {cEq.accessories || ''}</p>
                          </div>
                        </div>

                        {/* RESPONSÁVEIS & DADOS COMPLEMENTARES / NF */}
                        <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                          <div className="bg-sky-50/70 p-1 rounded border border-sky-200 flex flex-col justify-center">
                            <span className="font-bold text-sky-950 uppercase text-[7.5px] block border-b border-sky-200 pb-0.5 mb-0.5">Atendente:</span>
                            <span className="font-semibold text-slate-800 truncate block">{cAttendant || ''}</span>
                          </div>

                          {/* DADOS DA NF / GARANTIA DO FABRICANTE / GARANTIA DA EMPRESA */}
                          <div className="bg-slate-100 p-1 rounded border border-slate-200 flex flex-col justify-center text-[8.5px]">
                            {cWarrantyType === 'GARANTIA_FABRICA' ? (
                              <>
                                <span className="font-bold text-slate-800 uppercase text-[7.5px] block border-b border-slate-300 pb-0.5 mb-0.5">DADOS DA NOTA FISCAL / GARANTIA DO FABRICANTE:</span>
                                <div className="flex flex-wrap gap-x-2 text-slate-700">
                                  <span><strong>NF:</strong> {cNfData.nfNumber || ''}</span>
                                  <span><strong>Compra:</strong> {cNfData.purchaseDate ? new Date(cNfData.purchaseDate).toLocaleDateString('pt-BR') : ''}</span>
                                  <span><strong>Revenda:</strong> {cNfData.retailerName || ''}</span>
                                  <span><strong>Autoriz.:</strong> {cNfData.authorizedCode || ''}</span>
                                </div>
                              </>
                            ) : cWarrantyType === 'GARANTIA_LOJA' ? (
                              (() => {
                                const baseDateStr = cWarrantyTerms?.startDate || cExit;
                                const days = parseInt(cWarrantyTerms?.periodDays || '90', 10);
                                let expiryStr = '';
                                if (baseDateStr && !isNaN(days) && days > 0) {
                                  try {
                                    const dp = baseDateStr.split('-').map(Number);
                                    const sd = new Date(dp[0], dp[1] - 1, dp[2]);
                                    const ed = new Date(sd);
                                    ed.setDate(ed.getDate() + days);
                                    expiryStr = ed.toLocaleDateString('pt-BR');
                                  } catch {}
                                }
                                const origCode = orderItem.originalOsCode || '';
                                return (
                                  <>
                                    <span className="font-bold text-slate-800 uppercase text-[7.5px] block border-b border-slate-300 pb-0.5 mb-0.5">GARANTIA DA EMPRESA:</span>
                                    <div className="flex flex-wrap gap-x-2 text-slate-700">
                                      {origCode && <span><strong>OS Orig.:</strong> #{origCode}</span>}
                                      {expiryStr
                                        ? <span><strong>Válida até:</strong> {expiryStr}</span>
                                        : <span className="text-slate-500">Data de saída não informada</span>
                                      }
                                      <span><strong>Prazo:</strong> {isNaN(days) ? '90' : days} dias</span>
                                    </div>
                                  </>
                                );
                              })()
                            ) : (
                              <div className="flex items-center h-full">
                                <span className="font-bold text-slate-700 uppercase text-[7.5px]">
                                  GARANTIA FABRICA / EMPRESA: NÃO SE APLICA
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* OBSERVAÇÕES DO EQUIPAMENTO */}
                        {printEquipmentObservations && (
                          <div className="text-[9px] bg-white p-1.5 rounded border border-slate-200">
                            <p className="font-bold text-slate-800 text-[8.5px] uppercase border-b border-slate-100 pb-0.5 mb-0.5">Obs. do Equipamento:</p>
                            <div className="whitespace-pre-wrap leading-tight text-slate-800 truncate min-h-[1.2em]">{cEq.observations || '\u00A0'}</div>
                          </div>
                        )}

                        {/* DEFEITO, LAUDO & TERMOS */}
                        <div className="text-[9px] bg-white p-1.5 rounded border border-slate-200 space-y-1">
                          {printProblemDescription && (
                            <div>
                              <p className="font-bold text-slate-800 text-[8.5px] uppercase border-b border-slate-100 pb-0.5 mb-0.5">Defeito / Reclamação do Cliente:</p>
                              <div className="whitespace-pre-wrap leading-tight text-slate-800 min-h-[2.2em]">{cProblem ? cProblem : '\u00A0\n\u00A0'}</div>
                            </div>
                          )}
                          {printTechnicalReport && (
                            <div className={`${printProblemDescription ? 'border-t border-slate-100 pt-0.5' : ''}`}>
                              <p className="font-bold text-slate-800 text-[8.5px] uppercase border-b border-slate-100 pb-0.5 mb-0.5">Laudo Técnico Inicial:</p>
                              <div className="whitespace-pre-wrap leading-tight text-slate-800 min-h-[2.2em]">{cReport ? cReport : '\u00A0\n\u00A0'}</div>
                            </div>
                          )}
                          <div className="pt-0.5 border-t border-slate-100 mt-0.5">
                            <p className="font-bold text-slate-800 text-[8px] uppercase">Termos de Entrada:</p>
                            <p className="text-[7.8px] text-slate-500 leading-tight whitespace-pre-wrap">{defaultWarrantyConfig?.defaultEntryTerms || defaultWarrantyConfig?.defaultEstimateTerms || 'O cliente autoriza a realização da avaliação e diagnóstico técnico no equipamento descrito neste comprovante. Equipamentos não retirados em até 90 dias após notificação estarão sujeitos a taxas de armazenamento ou descarte conforme a lei.'}</p>
                          </div>
                        </div>
                      </div>

                      {/* ASSINATURAS */}
                      <div className="grid grid-cols-2 gap-4 pt-1.5 text-center text-[8.5px]">
                        <div>
                          <div className="border-b border-slate-400 w-2/3 mx-auto mb-0.5"></div>
                          <p className="font-bold">Assinatura da Empresa</p>
                        </div>
                        <div>
                          <div className="border-b border-slate-400 w-2/3 mx-auto mb-0.5"></div>
                          <p className="font-bold">Assinatura do Cliente</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : printMode === 'EXIT_RECEIPT' ? (
                  /* COMPROVANTE DE SAÍDA (FOLHA A4 - 1 VIA COMPLETA) */
                  <div className="space-y-3 text-xs">
                    {/* TOPO DA SAÍDA */}
                    <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2.5 gap-2">
                      <div className="flex items-center gap-3">
                        {companyInfo.logoUrl && (
                          <img src={companyInfo.logoUrl} alt="Logo" className="h-12 w-auto object-contain shrink-0" />
                        )}
                        <div>
                          <h1 className="text-base font-black text-slate-900 uppercase leading-tight">{companyInfo.tradingName || companyInfo.name || 'Vollen - Gestão OS'}</h1>
                          <p className="text-[10px] text-slate-600 font-medium">{companyInfo.slogan || 'Assistência Técnica Especializada'}</p>
                          <p className="text-[9px] text-slate-500">
                            CNPJ: {companyInfo.cnpj} | Tel: {companyInfo.phone || companyInfo.whatsapp} | {companyInfo.email}
                          </p>
                          <p className="text-[9px] text-slate-500">
                            {companyInfo.address}, {companyInfo.number} - {companyInfo.neighborhood} • {companyInfo.city}/{companyInfo.state}
                          </p>
                        </div>
                      </div>

                      {/* BLOCO DA OS E IDENTIFICAÇÃO DA SAÍDA */}
                      <div className="text-right flex flex-col items-end shrink-0">
                        <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 mb-0.5">
                          COMPROVANTE DE SAÍDA / ENTREGA
                        </span>
                        <div className="text-lg font-black text-slate-900 font-mono leading-tight">
                          {String(orderItem.code).startsWith('OS') ? orderItem.code : `OS-${orderItem.code}`}
                          {(orderItem.originalOsCode || orderItem.status === 'RETORNO_GARANTIA' || orderItem.status === 'GARANTIA_FINALIZADA') && (
                            <span className="block text-[9.5px] font-bold text-amber-800 font-sans mt-0.5">
                              {orderItem.originalOsCode ? `(Retorno da OS #${orderItem.originalOsCode})` : '(Retorno em Garantia)'}
                            </span>
                          )}
                        </div>
                        <div className="text-[9.5px] font-bold text-slate-700">
                          SAÍDA: {(() => {
                            const raw = orderItem.exitDate || exitDate;
                            if (!raw) return new Date().toLocaleDateString('pt-BR');
                            // Parsing manual para evitar bug de timezone com strings ISO date-only
                            const parts = raw.split('T')[0].split('-');
                            if (parts.length === 3) {
                              return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).toLocaleDateString('pt-BR');
                            }
                            return new Date(raw).toLocaleDateString('pt-BR');
                          })()}
                        </div>
                        <div className="text-[8.5px] font-semibold text-slate-500">
                          EMISSÃO: {printTime || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* DADOS DO CLIENTE & EQUIPAMENTO */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <p className="font-bold text-slate-800 border-b pb-0.5 mb-1 text-[10px] uppercase">Dados do Cliente</p>
                        <p><strong>Nome:</strong> {cClient.name || ''}</p>
                        <p><strong>Endereço:</strong> {cClient.address ? `${cClient.address}${cClient.number ? `, ${cClient.number}` : ''}` : ''}</p>
                        <p><strong>Bairro:</strong> {cClient.neighborhood || ''} {cClient.city ? `| Cidade/UF: ${cClient.city}/${cClient.state || ''}` : ''}</p>
                        {cClient.complement && <p><strong>Complemento:</strong> {cClient.complement}</p>}
                        {cClient.reference && <p><strong>Referência:</strong> {cClient.reference}</p>}
                        <p><strong>Telefone:</strong> {cClient.phone || ''} {cClient.whatsapp ? `| WhatsApp: ${cClient.whatsapp}` : ''}</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <p className="font-bold text-slate-800 border-b pb-0.5 mb-1 text-[10px] uppercase">Dados do Aparelho / Equipamento</p>
                        <p><strong>Equipamento:</strong> {cEq.type || ''}</p>
                        <p><strong>Marca:</strong> {cEq.brand || ''} {cEq.model ? <><span> | </span><strong>Modelo:</strong> {` ${cEq.model}`}</> : ''}</p>
                        <p><strong>Nº de Série:</strong> {cEq.serialNumber || ''}</p>
                        <p><strong>Acessórios:</strong> {cEq.accessories || ''}</p>
                      </div>
                    </div>

                    {/* RESPONSÁVEIS */}
                    <div className="bg-sky-50/70 p-2 rounded-lg border border-sky-200">
                      <span className="font-bold text-sky-950 uppercase text-[9px] block border-b border-sky-200 pb-0.5 mb-1">Responsáveis pelo Atendimento:</span>
                      <span className="font-semibold text-slate-800 text-[9.5px]">
                        <strong>Atendente:</strong> {cAttendant || ''} &nbsp;|&nbsp; <strong>Técnico:</strong> {cTech || ''}
                      </span>
                    </div>

                    {/* DEFEITO E LAUDO TÉCNICO (SE MARCADOS) */}
                    {(printProblemDescription || printTechnicalReport) && (
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                        {printProblemDescription && (
                          <div>
                            <p className="font-bold text-slate-800 text-[9.5px] uppercase border-b border-slate-100 pb-0.5 mb-0.5">Defeito / Reclamação Relatada:</p>
                            <p className="text-slate-700 whitespace-pre-wrap leading-tight min-h-[2.6em]">
                              {cProblem || ''}
                            </p>
                          </div>
                        )}
                        {printTechnicalReport && (
                          <div className={`${printProblemDescription ? 'border-t border-slate-200 pt-1' : ''}`}>
                            <p className="font-bold text-slate-800 text-[9.5px] uppercase border-b border-slate-100 pb-0.5 mb-0.5">Laudo Técnico Inicial:</p>
                            <p className="text-slate-700 whitespace-pre-wrap leading-tight min-h-[2.6em]">
                              {cReport || ''}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SERVIÇO EXECUTADO */}
                    <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-300">
                      <p className="font-bold text-emerald-950 text-[10px] uppercase border-b border-emerald-200 pb-0.5 mb-1">Serviço Executado / Realizado:</p>
                      {(() => {
                        const finalExec = (orderItem.originalOsCode || orderItem.status === 'RETORNO_GARANTIA' || orderItem.status === 'GARANTIA_FINALIZADA')
                          ? (orderItem.returnExecutedService || cExecuted || orderItem.originalExecutedService || '')
                          : (cExecuted || '');
                        return (
                          <p className="text-slate-900 font-medium whitespace-pre-wrap leading-tight min-h-[2.6em]">
                            {finalExec}
                          </p>
                        );
                      })()}
                    </div>

                    {/* DISCRIMINAÇÃO DE SERVIÇOS E PEÇAS (só exibe se marcado para impressão) */}
                    {(printServicesList || printPartsList) && (
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-700">
                          {printServicesList && (
                            <div>
                              <span className="font-bold text-slate-800 border-b pb-0.5 mb-1 block">Serviços Adicionados:</span>
                              {cServices.length > 0 ? (
                                <ul className="list-disc list-inside space-y-0.5">
                                  {cServices.map((s: any, idx: number) => (
                                    <li key={idx} className="truncate">{s.name} - <strong>R$ {s.price}</strong></li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          )}
                          {printPartsList && (
                            <div>
                              <span className="font-bold text-slate-800 border-b pb-0.5 mb-1 block">Peças / Componentes Trocados:</span>
                              {cParts.length > 0 ? (
                                <ul className="list-disc list-inside space-y-0.5">
                                  {cParts.map((p: any, idx: number) => (
                                    <li key={idx} className="truncate">{p.name} (Qtd: {p.qty}) - <strong>R$ {p.price}</strong></li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TOTAL E FORMA DE PAGAMENTO */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex justify-end items-center gap-6 text-sm font-black text-slate-900">
                        <span className="text-xs font-semibold text-slate-700">
                          Forma de Pagamento: <strong>{orderItem.paymentMethod || paymentMethod || 'Dinheiro / Pix'}</strong>
                        </span>
                        <span>VALOR TOTAL: R$ {Number(cTotal).toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>

                    {/* DADOS DA GARANTIA + CLÁUSULAS E TERMOS */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                      {/* Dados de garantia da loja em destaque acima das cláusulas */}
                      {cWarrantyType === 'GARANTIA_LOJA' && (() => {
                        const baseDateStr = cWarrantyTerms?.startDate || cExit || cEntry;
                        const days = parseInt(cWarrantyTerms?.periodDays || '90', 10);
                        let expiryStr = '';
                        if (baseDateStr && !isNaN(days) && days > 0) {
                          try {
                            const dp = baseDateStr.split('-').map(Number);
                            const sd = new Date(dp[0], dp[1] - 1, dp[2]);
                            const ed = new Date(sd);
                            ed.setDate(ed.getDate() + days);
                            expiryStr = ed.toLocaleDateString('pt-BR');
                          } catch {}
                        }
                        return (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-md p-2 flex flex-wrap gap-x-5 gap-y-0.5 text-[10px] text-emerald-900 font-semibold">
                            <span>🛡️ <strong>Tempo de Garantia:</strong> {isNaN(days) ? '90' : days} dias</span>
                            {expiryStr && <span><strong>Válida até:</strong> {expiryStr}</span>}
                            {orderItem.originalOsCode && <span><strong>OS Origem:</strong> #{orderItem.originalOsCode}</span>}
                          </div>
                        );
                      })()}

                      <p className="font-bold text-slate-800 text-[9.5px] uppercase border-b border-slate-200 pb-0.5">
                        {cWarrantyType === 'GARANTIA_LOJA' ? 'Cláusulas e Termos de Garantia da Empresa:' : 'Termos de Entrega do Equipamento:'}
                      </p>
                      <p className="text-[9px] text-slate-600 leading-relaxed whitespace-pre-wrap">{cWarrantyType === 'GARANTIA_LOJA'
                          ? (cWarrantyTerms?.termsText || defaultWarrantyConfig?.defaultExitTerms || defaultWarrantyConfig?.defaultTerms || 'A garantia cobre defeitos de fabricação das peças substituídas e serviços executados pelo período especificado. Não cobre danos por mau uso, umidade, descargas elétricas ou intervenção de terceiros.')
                          : (cWarrantyTerms?.termsText || defaultWarrantyConfig?.defaultExitTerms || 'Declaramos que o equipamento acima foi entregue devidamente testado e funcionando nas condições especificadas pelo cliente.')}</p>
                    </div>

                    {/* ASSINATURAS */}
                    <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
                      <div>
                        <div className="border-b border-slate-400 w-3/4 mx-auto mb-1"></div>
                        <p className="font-bold text-slate-800">Assinatura da Empresa / Técnico</p>
                        <p className="text-[10px] text-slate-500">{companyInfo.tradingName || companyInfo.name || 'Vollen - Gestão OS'}</p>
                      </div>
                      <div>
                        <div className="border-b border-slate-400 w-3/4 mx-auto mb-1"></div>
                        <p className="font-bold text-slate-800">Assinatura do Cliente</p>
                        <p className="text-[10px] text-slate-500">{cClient.name || 'Cliente'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* PROPOSTA DE ORÇAMENTO COMERCIAL */
                  <div>
                    {/* TOPO DA PROPOSTA DE ORÇAMENTO */}
                    <div className="border-b-2 border-indigo-900 pb-4 mb-4 flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        {companyInfo.logoUrl && (
                          <img src={companyInfo.logoUrl} alt="Logo" className="h-14 w-auto object-contain shrink-0" />
                        )}
                        <div>
                          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{companyInfo.tradingName || companyInfo.name || 'Vollen - Gestão OS'}</h1>
                          <p className="text-xs font-semibold text-slate-700">{companyInfo.slogan || 'Assistência Técnica Especializada'}</p>
                          <p className="text-[11px] text-slate-600 mt-1">
                            CNPJ: {companyInfo.cnpj} | Telefone: {companyInfo.phone || companyInfo.whatsapp} | Email: {companyInfo.email}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            Endereço: {companyInfo.address}, {companyInfo.number} - {companyInfo.neighborhood} • {companyInfo.city}/{companyInfo.state}
                          </p>
                        </div>
                      </div>
                      <div className="text-right border-2 border-indigo-900 p-3 rounded-xl bg-indigo-50/50">
                        <div className="text-[10px] font-black text-indigo-900 uppercase tracking-wider">PROPOSTA DE ORÇAMENTO</div>
                        <div className="text-2xl font-black text-slate-900 font-mono">
                          {String(orderItem.code).startsWith('OS') ? orderItem.code : `OS-${orderItem.code}`}
                          {(orderItem.originalOsCode || orderItem.status === 'RETORNO_GARANTIA' || orderItem.status === 'GARANTIA_FINALIZADA') && (
                            <span className="block text-[10px] font-bold text-amber-800 font-sans mt-0.5">
                              {orderItem.originalOsCode ? `(Retorno da OS #${orderItem.originalOsCode})` : '(Retorno em Garantia)'}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] font-semibold text-slate-600 mt-1 pt-1 border-t border-indigo-200">
                          Emissão: {printTime || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* DADOS DO CLIENTE & DADOS DO EQUIPAMENTO */}
                    <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                      <div className="border border-slate-300 p-3 rounded-xl bg-slate-50 space-y-1">
                        <h3 className="font-bold text-slate-900 uppercase text-[10px] border-b border-slate-200 pb-1 mb-1">
                          Dados do Cliente
                        </h3>
                        <p><strong>Nome / Razão Social:</strong> {cClient.name || ''}</p>
                        <p><strong>Telefone / WhatsApp:</strong> {cClient.phone || cClient.whatsapp || ''}</p>
                        <p><strong>Email:</strong> {cClient.email || ''}</p>
                        <p><strong>Endereço:</strong> {cClient.address ? `${cClient.address}, ${cClient.number || 'S/N'} - ${cClient.neighborhood || ''}` : ''}</p>
                      </div>

                      <div className="border border-slate-300 p-3 rounded-xl bg-slate-50 space-y-1">
                        <h3 className="font-bold text-slate-900 uppercase text-[10px] border-b border-slate-200 pb-1 mb-1">
                          Dados do Equipamento
                        </h3>
                        <p><strong>Equipamento:</strong> {cEq.type || ''}</p>
                        <p><strong>Marca / Modelo:</strong> {cEq.brand || cEq.model ? `${cEq.brand} ${cEq.model}` : ''}</p>
                        <p><strong>Nº de Série:</strong> {cEq.serialNumber || ''}</p>
                        <p><strong>Atendente:</strong> {cAttendant || ''} | <strong>Técnico:</strong> {cTech || ''}</p>
                      </div>
                    </div>

                    {/* DEFEITO E LAUDO TÉCNICO */}
                    <div className="border border-slate-300 p-3 rounded-xl mb-4 text-xs space-y-2 bg-slate-50/50">
                      <h3 className="font-bold text-slate-900 uppercase text-[10px] border-b border-slate-200 pb-1">
                        Diagnóstico & Laudo Técnico Profissional
                      </h3>
                      {cProblem ? (
                        <p><strong>Defeito Relatado / Sintomas:</strong> {cProblem}</p>
                      ) : null}
                      {cReport ? (
                        <p className="bg-sky-50 p-2 rounded-lg border border-sky-200 text-sky-950 font-medium">
                          <strong>Laudo Técnico / Diagnóstico:</strong> {cReport}
                        </p>
                      ) : null}
                    </div>

                    {/* PEÇAS E SERVIÇOS DO ORÇAMENTO */}
                    <div className="border border-slate-300 rounded-xl overflow-hidden mb-4 text-xs">
                      <div className="bg-slate-100 p-2 font-bold uppercase text-[10px] text-slate-700 border-b border-slate-200 flex justify-between">
                        <span>Discriminação das Peças e Serviços Propostos</span>
                        <span>Valores em Reais (R$)</span>
                      </div>

                      {cServices.length > 0 && (
                        <div className="p-3 border-b border-slate-200 space-y-1.5">
                          <h4 className="font-bold text-[10px] uppercase text-indigo-900">Serviços Especializados Propostos:</h4>
                          {cServices.map((svc: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-slate-800 text-xs">
                              <span>• {svc.name}</span>
                              <span className="font-mono font-bold">R$ {(Number(svc.price ? String(svc.price).replace(',', '.') : 0) || 0).toFixed(2).replace('.', ',')}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {cParts.length > 0 && (
                        <div className="p-3 border-b border-slate-200 space-y-1.5 bg-slate-50/40">
                          <h4 className="font-bold text-[10px] uppercase text-amber-900">Peças & Componentes de Reposição:</h4>
                          {cParts.map((part: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-slate-800 text-xs">
                              <span>• {part.name} (Qtd: {part.qty || 1})</span>
                              <span className="font-mono font-bold">R$ {((Number(part.price ? String(part.price).replace(',', '.') : 0) || 0) * (part.qty || 1)).toFixed(2).replace('.', ',')}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* RESUMO TOTAL DA PROPOSTA */}
                      <div className="p-3 bg-indigo-50/90 flex flex-col gap-1 text-right">
                        {Number(orderItem.travelCost ? String(orderItem.travelCost).replace(',', '.') : 0) > 0 && (
                          <p className="text-slate-600">Taxa de Deslocamento / Visita: <strong>R$ {(Number(String(orderItem.travelCost).replace(',', '.')) || 0).toFixed(2).replace('.', ',')}</strong></p>
                        )}
                        {Number(orderItem.discountCost ? String(orderItem.discountCost).replace(',', '.') : 0) > 0 && (
                          <p className="text-red-600">Desconto Concedido: <strong>- R$ {(Number(String(orderItem.discountCost).replace(',', '.')) || 0).toFixed(2).replace('.', ',')}</strong></p>
                        )}
                        <div className="text-base font-black text-indigo-950 font-mono pt-1 border-t border-indigo-200">
                          VALOR TOTAL DO ORÇAMENTO: R$ {Number(cTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* VALIDADE E CONDIÇÕES */}
                    <div className="border border-slate-300 p-3 rounded-xl mb-6 text-xs bg-slate-50 space-y-1">
                      <h3 className="font-bold text-slate-900 uppercase text-[10px] border-b border-slate-200 pb-1">
                        Validade da Proposta & Condições de Atendimento
                      </h3>
                      <p className="text-[10.5px] text-slate-600 pt-1 leading-relaxed whitespace-pre-wrap">* {defaultWarrantyConfig?.defaultEstimateTerms || 'O orçamento possui validade de 10 dias. Equipamentos não retirados em até 90 dias após notificação estarão sujeitos a taxas de armazenamento ou descarte nos termos da lei.'}</p>
                    </div>

                    {/* ASSINATURA DE APROVAÇÃO DO CLIENTE */}
                    <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300 text-center text-xs">
                      <div>
                        <div className="border-b border-slate-400 mb-1 w-3/4 mx-auto"></div>
                        <p className="font-bold text-slate-800">Assinatura da Empresa / Responsável</p>
                        <p className="text-[10px] text-slate-500">{companyInfo.tradingName || companyInfo.name || 'Vollen - Gestão OS'}</p>
                      </div>
                      <div>
                        <div className="border-b border-slate-400 mb-1 w-3/4 mx-auto"></div>
                        <p className="font-bold text-slate-800">Aprovação do Cliente</p>
                        <p className="text-[10px] text-slate-500">Autorizo a execução dos serviços acima discriminados.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>

      {/* MODAL DE SELEÇÃO DE APARELHOS ANTERIORES DO CLIENTE */}
      {isClientEquipmentsModalOpen && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsClientEquipmentsModalOpen(false)}
        >
          <div
            className="bg-white border border-slate-300 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="p-3.5 bg-gradient-to-r from-indigo-700 to-indigo-800 border-b border-indigo-900 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">Aparelhos Cadastrados deste Cliente</h3>
                  <p className="text-[11px] text-indigo-200 font-medium">
                    Cliente: <span className="font-bold text-white">{clientData.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClientEquipmentsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explicação */}
            <div className="px-4 py-2 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between text-[11px] text-indigo-900 font-medium">
              <span>Selecione o aparelho abaixo para preencher os dados automaticamente na OS:</span>
              <span className="bg-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded-full text-[10px]">
                {clientPreviousEquipments.length} encontrado(s)
              </span>
            </div>

            {/* Lista de Aparelhos */}
            <div className="p-3 overflow-y-auto flex-1 space-y-2 max-h-[50vh]">
              {clientPreviousEquipments.map((eq, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setEquipmentData((prev) => ({
                      ...prev,
                      type: eq.type || prev.type,
                      brand: eq.brand || prev.brand,
                      model: eq.model || prev.model,
                      serialNumber: eq.serialNumber || prev.serialNumber,
                      code: eq.code || prev.code,
                      accessories: eq.accessories || prev.accessories,
                    }));
                    setIsClientEquipmentsModalOpen(false);
                  }}
                  className="bg-white border-2 border-slate-200 hover:border-indigo-500 rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-all hover:shadow-md hover:bg-indigo-50/30 group"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="bg-slate-100 group-hover:bg-indigo-100 p-2.5 rounded-xl text-slate-600 group-hover:text-indigo-700 shrink-0 transition-colors">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-sm group-hover:text-indigo-900 uppercase">
                          {eq.type || 'Equipamento'}
                        </span>
                        {eq.brand && (
                          <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            {eq.brand}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-600">
                        <div>
                          <span className="font-bold text-slate-700">Modelo: </span>
                          <span className="font-mono text-slate-800 font-semibold">{eq.model || '—'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-700">Nº de Série: </span>
                          <span className="font-mono text-slate-800 font-semibold">{eq.serialNumber || '—'}</span>
                        </div>
                      </div>

                      {eq.lastOsCode && (
                        <div className="mt-1 text-[10px] text-slate-400 font-mono">
                          Passou na OS <strong className="text-slate-600">#{eq.lastOsCode}</strong>
                          {eq.lastOsDate ? ` em ${eq.lastOsDate}` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="bg-indigo-600 group-hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Selecionar</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Rodapé do Modal */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 italic">
                Se for um aparelho novo, feche esta janela e digite os dados normalmente.
              </span>
              <button
                type="button"
                onClick={() => setIsClientEquipmentsModalOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Digitar Novo Aparelho (Fechar)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SELEÇÃO DE IMPRESSÃO EM LOTE (QUANDO CLIENTE POSSUI MÚLTIPLOS APARELHOS NO MESMO ATENDIMENTO) */}
      {isBatchPrintModalOpen && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsBatchPrintModalOpen(false)}
        >
          <div
            className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans text-xs flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 bg-gradient-to-r from-sky-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Printer className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">Opções de Impressão do Atendimento</h3>
                  <p className="text-[11px] text-sky-200">
                    Cliente: <span className="font-bold text-white">{clientData.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchPrintModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 bg-slate-50">
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 text-slate-700">
                <p className="font-bold text-slate-800 text-xs">
                  {pendingPrintMode === 'ENTRY_RECEIPT'
                    ? '🖨️ Imprimir Comprovante de Entrada'
                    : pendingPrintMode === 'EXIT_RECEIPT'
                      ? '🖨️ Imprimir Comprovante de Saída'
                      : '📄 Imprimir Orçamento'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Foram criadas <strong>{sessionBatchOrders.length + 1} Ordens de Serviço</strong> neste atendimento. Selecione como deseja imprimir:
                </p>
              </div>

              {/* Lista de OS com Checkbox */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto bg-white p-2.5 rounded-xl border border-slate-200">
                {/* OS Atual */}
                <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedBatchOrderIds.includes('CURRENT')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBatchOrderIds((prev) => [...prev, 'CURRENT']);
                        } else {
                          setSelectedBatchOrderIds((prev) => prev.filter((id) => id !== 'CURRENT'));
                        }
                      }}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-slate-900">
                        OS #{orderToEdit?.code || `OS-${String((totalOrders ?? 0) + 1 + batchCounterOffset).padStart(4, '0')}`} <span className="text-sky-700 text-[10px]">(OS Atual)</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {equipmentData.type || 'Equipamento'} {equipmentData.brand} {equipmentData.model}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-700">
                    R$ {grandTotalVal.toFixed(2).replace('.', ',')}
                  </span>
                </label>

                {/* OS Anteriores da mesma sessão */}
                {sessionBatchOrders.map((bo, idx) => (
                  <label key={idx} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedBatchOrderIds.includes(bo.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBatchOrderIds((prev) => [...prev, bo.id]);
                          } else {
                            setSelectedBatchOrderIds((prev) => prev.filter((id) => id !== bo.id));
                          }
                        }}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-slate-900 font-mono">
                          OS #{bo.code}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {bo.equipment?.type || 'Equipamento'} {bo.equipment?.brand} {bo.equipment?.model}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">
                      R$ {(bo.grandTotalVal || bo.totalAmount || 0).toFixed(2).replace('.', ',')}
                    </span>
                  </label>
                ))}
              </div>

              {/* Botões de Ação Rápida */}
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedBatchOrderIds(['CURRENT', ...sessionBatchOrders.map((o) => o.id)])}
                  className="text-sky-700 hover:underline font-bold cursor-pointer"
                >
                  Selecionar Todas ({sessionBatchOrders.length + 1})
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedBatchOrderIds(['CURRENT'])}
                  className="text-slate-600 hover:underline font-bold cursor-pointer"
                >
                  Apenas a Atual (1)
                </button>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsBatchPrintModalOpen(false)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={selectedBatchOrderIds.length === 0}
                onClick={() => {
                  setIsBatchPrintModalOpen(false);
                  setPrintMode(pendingPrintMode);
                  setTimeout(() => {
                    window.print();
                  }, 250);
                }}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Selecionadas ({selectedBatchOrderIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE HISTÓRICO DE ALTERAÇÕES DA OS */}
      {isAuditHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden font-sans text-xs flex flex-col max-h-[85vh]">
            <div className="px-4 py-3 bg-sky-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <History className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">
                    Histórico de Alterações da {orderToEdit?.code || activeEditingOrder?.code || 'Nova OS'}
                  </h3>
                  <p className="text-[11px] text-sky-200">
                    Equipamento: <span className="font-extrabold text-white">{equipmentData.type || 'Equipamento'} {equipmentData.brand} {equipmentData.model ? `(${equipmentData.model})` : ''}</span>
                    {equipmentData.serialNumber ? ` • Nº Série: ${equipmentData.serialNumber}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                  {auditHistory.length} registro(s)
                </span>
                <button
                  type="button"
                  onClick={() => setIsAuditHistoryModalOpen(false)}
                  className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Linha do Tempo de Alterações */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 min-h-0 space-y-3">
              {auditHistory.length > 0 ? (
                <div className="relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-300 space-y-4">
                  {auditHistory.map((item, idx) => (
                    <div key={idx} className="relative">
                      {/* Ponto indicador na linha */}
                      <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-sky-600 border-2 border-white shadow-xs"></div>

                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-1.5 hover:border-sky-300 transition-colors">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <span className="font-mono font-extrabold text-slate-800 text-[11px] flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-sky-600" />
                            {item.date || (item as any).createdAt || (item as any).timestamp || (item as any).data || new Date().toLocaleString('pt-BR')}
                          </span>
                          <span className="text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                            Responsável: {item.user || (item as any).responsible || (item as any).author || (attendantName.trim() || orderToEdit?.attendant || orderToEdit?.attendantName || currentUser?.name || 'Atendente')}
                          </span>
                        </div>

                        <ul className="space-y-1 text-[11px] text-slate-700">
                          {Array.isArray(item.changes) && item.changes.length > 0 ? (
                            item.changes.map((chg: any, chgIdx: number) => {
                              const text = typeof chg === 'string' ? chg : (chg?.description || chg?.text || chg?.label || chg?.name || JSON.stringify(chg));
                              if (!text) return null;
                              return (
                                <li key={chgIdx} className="flex items-start gap-1.5">
                                  <span className="text-sky-600 font-bold">•</span>
                                  <span className="font-medium text-slate-800">{text}</span>
                                </li>
                              );
                            })
                          ) : typeof item === 'string' ? (
                            <li className="flex items-start gap-1.5">
                              <span className="text-sky-600 font-bold">•</span>
                              <span className="font-medium text-slate-800">{item}</span>
                            </li>
                          ) : (item as any).description || (item as any).message || (item as any).text || (item as any).details ? (
                            <li className="flex items-start gap-1.5">
                              <span className="text-sky-600 font-bold">•</span>
                              <span className="font-medium text-slate-800">{(item as any).description || (item as any).message || (item as any).text || (item as any).details}</span>
                            </li>
                          ) : (
                            <li className="flex items-start gap-1.5">
                              <span className="text-sky-600 font-bold">•</span>
                              <span className="font-medium text-slate-800">
                                {typeof item === 'object' ? Object.entries(item).filter(([k]) => !['date', 'user', 'createdAt', 'timestamp'].includes(k)).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' | ') || 'Alteração na Ordem de Serviço' : String(item)}
                              </span>
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <History className="w-10 h-10 text-slate-300" />
                  <p className="font-bold text-slate-600">Nenhuma alteração registrada ainda.</p>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    As modificações de status, técnicos, atendentes, peças, serviços e valores salvos nesta OS aparecerão aqui com data e hora.
                  </p>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsAuditHistoryModalOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-xl font-bold transition-colors cursor-pointer text-xs"
              >
                Fechar Histórico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE HISTÓRICO DE TODAS AS OS DESTE CLIENTE */}
      {isLocalClientHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden font-sans text-xs flex flex-col max-h-[85vh]">
            <div className="px-4 py-3 bg-amber-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <History className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">
                    Histórico de Ordens de Serviço do Cliente
                  </h3>
                  <p className="text-[11px] text-amber-100 font-medium">
                    Cliente: <span className="font-extrabold text-white">{clientData.name}</span>
                    {clientData.phone ? ` • Tel: ${clientData.phone}` : ''}
                    {clientData.whatsapp ? ` • WhatsApp: ${clientData.whatsapp}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                  {clientHistoryOrders.length} OS encontrada(s)
                </span>
                <button
                  type="button"
                  onClick={() => setIsLocalClientHistoryModalOpen(false)}
                  className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lista de Ordens de Serviço do Cliente */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 min-h-0 space-y-2.5">
              {clientHistoryOrders.length > 0 ? (
                clientHistoryOrders.map((osItem) => {
                  const eq = osItem.equipment || {};
                  const isCurrent = orderToEdit?.id === osItem.id || activeEditingOrder?.id === osItem.id;
                  return (
                    <div
                      key={osItem.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-sky-50 border-sky-300 ring-1 ring-sky-400'
                          : 'bg-white border-slate-200 hover:border-amber-300 shadow-xs'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sky-800 bg-sky-100 border border-sky-200 px-2 py-0.5 rounded text-xs">
                            #{osItem.code || osItem.id?.slice(0, 6)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              osItem.status === 'FINALIZADA' || osItem.status === 'FINALIZADO'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : osItem.status === 'CANCELADA'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : osItem.status === 'ORCAMENTO_APROVADO'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {osItem.status?.replace(/_/g, ' ') || 'ABERTA'}
                          </span>
                          {isCurrent && (
                            <span className="bg-sky-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                              OS Atual em Edição
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {osItem.createdAt ? new Date(osItem.createdAt).toLocaleDateString('pt-BR') : ''}
                          </span>
                        </div>

                        <div className="text-xs text-slate-800 font-semibold flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>
                            {eq.type || 'Equipamento'} {eq.brand || ''} {eq.model ? `(${eq.model})` : ''}
                            {eq.serialNumber ? ` - Nº Série: ${eq.serialNumber}` : ''}
                          </span>
                        </div>

                        {osItem.problemDescription && (
                          <p className="text-[11px] text-slate-600 line-clamp-1">
                            <span className="font-bold text-slate-700">Defeito:</span> {osItem.problemDescription}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-500 font-bold uppercase">Valor Total</div>
                          <div className="font-mono font-bold text-emerald-700 text-xs">
                            R${' '}
                            {(parseFloat(String(osItem.totalAmount || osItem.totalValue || 0)) || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsLocalClientHistoryModalOpen(false);
                            if (onOpenWarrantyOrder) {
                              onOpenWarrantyOrder(osItem);
                            }
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer text-xs"
                          title="Abrir detalhes desta Ordem de Serviço"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Abrir OS</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <History className="w-10 h-10 text-slate-300" />
                  <p className="font-bold text-slate-600">Nenhuma Ordem de Serviço encontrada para este cliente.</p>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    Todas as OSs vinculadas ao nome ou cadastro deste cliente serão listadas aqui com opção para abrir.
                  </p>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsLocalClientHistoryModalOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-xl font-bold transition-colors cursor-pointer text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA CADASTRAR NOVO TIPO DE EQUIPAMENTO DIRETAMENTE */}
      {isNewEquipmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans text-xs flex flex-col">
            <div className="px-4 py-3 bg-sky-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-200" />
                <h3 className="text-xs font-bold">Cadastrar Novo Tipo de Equipamento</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewEquipmentModalOpen(false)}
                className="text-white/80 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">
                  Nome / Tipo do Equipamento *
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newEquipmentName}
                  onChange={(e) => setNewEquipmentName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = newEquipmentName.trim().toUpperCase();
                      if (val) {
                        const normalizedNew = val.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        const duplicate = availableEquipments.find((eq: any) => {
                          const existingName = (eq.type || eq.name || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
                          return existingName === normalizedNew;
                        });

                        if (duplicate) {
                          alert(`O equipamento "${duplicate.type || duplicate.name}" já está cadastrado! Selecionando-o na OS.`);
                          setEquipmentData((prev) => ({ ...prev, type: duplicate.type || duplicate.name }));
                          setIsNewEquipmentModalOpen(false);
                          return;
                        }

                        setEquipmentData((prev) => ({ ...prev, type: val }));

                        const newEqItem = {
                          id: String(Date.now()),
                          type: val,
                          name: val,
                          code: String((availableEquipments?.length || 0) + 1).padStart(4, '0'),
                        };

                        if (onSaveEquipment) {
                          onSaveEquipment(newEqItem);
                        } else {
                          try {
                            const saved = localStorage.getItem('vollen_equipments') || localStorage.getItem('system_equipments');
                            const list = saved ? JSON.parse(saved) : [];
                            if (!list.some((eq: any) => (eq.type || eq.name || '').toUpperCase() === val)) {
                              list.push(newEqItem);
                              localStorage.setItem('vollen_equipments', JSON.stringify(list));
                              localStorage.setItem('system_equipments', JSON.stringify(list));
                              window.dispatchEvent(new Event('storage'));
                            }
                          } catch {}
                        }

                        setIsNewEquipmentModalOpen(false);
                      }
                    }
                  }}
                  placeholder="Ex: LAVA E SECA, MICRO-ONDAS, GELADEIRA..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs uppercase"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  O novo tipo ficará disponível imediatamente para seleção nesta e nas próximas OS.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsNewEquipmentModalOpen(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = newEquipmentName.trim().toUpperCase();
                  if (!val) {
                    alert('Por favor, informe o nome do tipo de equipamento.');
                    return;
                  }

                  const normalizedNew = val.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                  const duplicate = availableEquipments.find((eq: any) => {
                    const existingName = (eq.type || eq.name || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
                    return existingName === normalizedNew;
                  });

                  if (duplicate) {
                    alert(`O equipamento "${duplicate.type || duplicate.name}" já está cadastrado! Selecionando-o na OS.`);
                    setEquipmentData((prev) => ({ ...prev, type: duplicate.type || duplicate.name }));
                    setIsNewEquipmentModalOpen(false);
                    return;
                  }

                  setEquipmentData((prev) => ({ ...prev, type: val }));

                  const newEqItem = {
                    id: String(Date.now()),
                    type: val,
                    name: val,
                    code: String((availableEquipments?.length || 0) + 1).padStart(4, '0'),
                  };

                  if (onSaveEquipment) {
                    onSaveEquipment(newEqItem);
                  } else {
                    try {
                      const saved = localStorage.getItem('vollen_equipments') || localStorage.getItem('system_equipments');
                      const list = saved ? JSON.parse(saved) : [];
                      if (!list.some((eq: any) => (eq.type || eq.name || '').toUpperCase() === val)) {
                        list.push(newEqItem);
                        localStorage.setItem('vollen_equipments', JSON.stringify(list));
                        localStorage.setItem('system_equipments', JSON.stringify(list));
                        window.dispatchEvent(new Event('storage'));
                      }
                    } catch {}
                  }

                  setIsNewEquipmentModalOpen(false);
                }}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold flex items-center gap-1 shadow transition-colors cursor-pointer text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar e Usar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO PADRONIZADO DO SISTEMA */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => {
          if (orderStatus === 'CANCELADA' || orderStatus === 'CANCELADO') {
            if (orderToEdit && orderToEdit.status) {
              setOrderStatus(orderToEdit.status);
            } else {
              setOrderStatus('ABERTA');
            }
          }
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
};
