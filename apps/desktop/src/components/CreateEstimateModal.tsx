import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Calculator,
  Save,
  Printer,
  Trash2,
  Plus,
  PlusCircle,
  FileText,
  User,
  Search,
  Cpu,
  Package,
  Wrench,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Phone,
  ChevronDown,
  History,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { CompanyData, defaultCompanyData } from './CompanyModal';
import { useDialog } from './DialogContext';
import { modalStack } from '../utils/modalStack';

export interface EstimateItemPart {
  code?: string;
  name: string;
  qty: number;
  price: string;
}

export interface EstimateItemService {
  name: string;
  price: string;
}

export interface Estimate {
  id: string;
  code: string;
  createdAt: string;
  validityDays: number;
  status: 'PENDENTE' | 'APROVADO' | 'RECUSADO';
  client: {
    id?: string;
    name: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  equipment: {
    type: string;
    brand: string;
    model: string;
    serialNumber?: string;
    accessories?: string;
  };
  problemDescription: string;
  technicalReport?: string;
  partsList: EstimateItemPart[];
  servicesList: EstimateItemService[];
  travelCost?: string;
  discountCost?: string;
  totalAmount: number;
  paymentConditions?: string;
  notes?: string;
  convertedToOSId?: string;
  auditHistory?: Array<{ date: string; user?: string; changes?: string[]; description?: string }>;
}

interface CreateEstimateModalProps {
  isOpen: boolean;
  estimateToEdit?: Estimate | null;
  allEstimates: Estimate[];
  clientsList?: any[];
  availableParts?: any[];
  availableServices?: any[];
  availableEquipments?: any[];
  allOrders?: any[];
  onClose: () => void;
  onSaveEstimate: (estimate: Estimate) => void;
  onDeleteEstimate?: (estimateId: string) => void;
  onGenerateOSFromEstimate: (estimate: Estimate) => void;
  onOpenClientsModal?: () => void;
  onOpenPartsModal?: () => void;
  onOpenServicesModal?: () => void;
  onOpenSalesModal?: (estimateDraft?: Estimate) => void;
  selectedClient?: any;
  selectedPart?: any;
  selectedService?: any;
  currentUser?: any;
}

export const CreateEstimateModal: React.FC<CreateEstimateModalProps> = ({
  isOpen,
  estimateToEdit,
  allEstimates = [],
  clientsList = [],
  availableParts = [],
  availableServices = [],
  availableEquipments = [],
  allOrders = [],
  selectedClient,
  selectedPart,
  selectedService,
  currentUser,
  onClose,
  onSaveEstimate,
  onDeleteEstimate,
  onGenerateOSFromEstimate,
  onOpenClientsModal,
  onOpenPartsModal,
  onOpenServicesModal,
  onOpenSalesModal,
}) => {
  const [clientData, setClientData] = useState({
    id: '',
    name: '',
    phone: '',
    whatsapp: '',
    address: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  const [equipmentData, setEquipmentData] = useState({
    type: '',
    brand: '',
    model: '',
    serialNumber: '',
    accessories: '',
  });

  const [problemDescription, setProblemDescription] = useState('');
  const [technicalReport, setTechnicalReport] = useState('');
  const [validityDays, setValidityDays] = useState<number>(10);
  const [estimateStatus, setEstimateStatus] = useState<'PENDENTE' | 'APROVADO' | 'RECUSADO'>('PENDENTE');
  const [paymentConditions, setPaymentConditions] = useState('À Vista / PIX / Cartão');
  const [notes, setNotes] = useState('');

  // Histórico de Alterações / Auditoria
  const [auditHistory, setAuditHistory] = useState<Array<{ date: string; user?: string; changes?: string[]; description?: string }>>([]);
  const [isAuditHistoryModalOpen, setIsAuditHistoryModalOpen] = useState(false);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const printMenuRef = useRef<HTMLDivElement>(null);

  // Tabelas de Peças e Serviços
  const [partsList, setPartsList] = useState<EstimateItemPart[]>([]);
  const [servicesList, setServicesList] = useState<EstimateItemService[]>([]);

  // Inputs para nova peça
  const [newPartCode, setNewPartCode] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newPartQty, setNewPartQty] = useState<number>(1);
  const [newPartPrice, setNewPartPrice] = useState('');
  const [showPartDropdown, setShowPartDropdown] = useState(false);

  // Inputs para novo serviço
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  // Valores financeiros
  const [travelCost, setTravelCost] = useState('0,00');
  const [discountCost, setDiscountCost] = useState('0,00');

  // Helper para formatar moeda brasileira
  const formatCurrencyOnBlur = (val: string): string => {
    if (!val || String(val).trim() === '') return '0,00';
    let str = String(val).trim().replace(/\s/g, '').replace('R$', '');

    // Se possui vírgula (formato brasileiro Ex: 1.250,50 ou 50,00)
    if (str.includes(',')) {
      str = str.replace(/\./g, '').replace(',', '.');
    }
    const num = parseFloat(str);
    if (isNaN(num)) return '0,00';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const [isClientEquipmentsOpen, setIsClientEquipmentsOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Dados da empresa para impressão
  const [companyInfo, setCompanyInfo] = useState<CompanyData>(() => {
    try {
      const saved = localStorage.getItem('vollen_company_data');
      if (saved) return JSON.parse(saved);
    } catch { }
    return defaultCompanyData;
  });

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('vollen_company_data');
        if (saved) setCompanyInfo(JSON.parse(saved));
      } catch { }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (printMenuRef.current && !printMenuRef.current.contains(event.target as Node)) {
        setShowPrintMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Próximo código sequencial de Orçamento
  const nextEstimateCode = useMemo(() => {
    let maxNum = 0;
    const safeList = Array.isArray(allEstimates) ? allEstimates : [];
    safeList.forEach((est) => {
      if (est && est.code) {
        const n = parseInt(String(est.code).replace(/\D/g, ''), 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });
    return `ORC-${String(maxNum + 1).padStart(4, '0')}`;
  }, [allEstimates]);

  const activeCode = estimateToEdit?.code || nextEstimateCode;

  // Carregamento de dados ao abrir
  useEffect(() => {
    if (isOpen) {
      if (estimateToEdit) {
        // Busca os dados atualizados do cliente no cadastro do sistema se existir
        const currentClient = (clientsList || []).find(
          (c: any) =>
            (estimateToEdit.client?.id && c.id === estimateToEdit.client.id) ||
            (estimateToEdit.client?.name && c.name && c.name.trim().toLowerCase() === estimateToEdit.client.name.trim().toLowerCase())
        );

        setClientData({
          id: currentClient?.id || estimateToEdit.client?.id || '',
          name: currentClient?.name || estimateToEdit.client?.name || '',
          phone: currentClient?.phone || currentClient?.telephone || estimateToEdit.client?.phone || '',
          whatsapp: currentClient?.whatsapp || currentClient?.phone || estimateToEdit.client?.whatsapp || '',
          address: currentClient?.address || estimateToEdit.client?.address || '',
          number: currentClient?.number || estimateToEdit.client?.number || '',
          neighborhood: currentClient?.neighborhood || estimateToEdit.client?.neighborhood || '',
          city: currentClient?.city || estimateToEdit.client?.city || '',
          state: currentClient?.state || estimateToEdit.client?.state || '',
        });
        setEquipmentData({
          type: estimateToEdit.equipment?.type || '',
          brand: estimateToEdit.equipment?.brand || '',
          model: estimateToEdit.equipment?.model || '',
          serialNumber: estimateToEdit.equipment?.serialNumber || '',
          accessories: estimateToEdit.equipment?.accessories || '',
        });
        setProblemDescription(estimateToEdit.problemDescription || '');
        setTechnicalReport(estimateToEdit.technicalReport || '');
        setValidityDays(estimateToEdit.validityDays || 10);
        setEstimateStatus(estimateToEdit.status || 'PENDENTE');
        setPaymentConditions(estimateToEdit.paymentConditions || 'À Vista / PIX / Cartão');
        setNotes(estimateToEdit.notes || '');
        setPartsList(estimateToEdit.partsList || []);
        setServicesList(estimateToEdit.servicesList || []);
        setTravelCost(estimateToEdit.travelCost || '0,00');
        setDiscountCost(estimateToEdit.discountCost || '0,00');
        setAuditHistory(estimateToEdit.auditHistory && Array.isArray(estimateToEdit.auditHistory) ? estimateToEdit.auditHistory : []);
      } else {
        // Modo Novo Orçamento
        setAuditHistory([]);
        setClientData({
          id: '',
          name: '',
          phone: '',
          whatsapp: '',
          address: '',
          number: '',
          neighborhood: '',
          city: '',
          state: '',
        });
        setEquipmentData({
          type: '',
          brand: '',
          model: '',
          serialNumber: '',
          accessories: '',
        });
        setProblemDescription('');
        setTechnicalReport('');
        setValidityDays(10);
        setEstimateStatus('PENDENTE');
        setPaymentConditions('À Vista / PIX / Cartão');
        setNotes('');
        setPartsList([]);
        setServicesList([]);
        setTravelCost('0,00');
        setDiscountCost('0,00');
      }
      setIsDirty(false);
    }
  }, [isOpen, estimateToEdit]);

  // Se um cliente for selecionado externamente (ex: busca na Central de Clientes)
  useEffect(() => {
    if (selectedClient && isOpen) {
      setClientData({
        id: selectedClient.id || '',
        name: selectedClient.name || '',
        phone: selectedClient.phone || '',
        whatsapp: selectedClient.whatsapp || '',
        address: selectedClient.address || '',
        number: selectedClient.number ? String(selectedClient.number) : '',
        neighborhood: selectedClient.neighborhood || '',
        city: selectedClient.city || '',
        state: selectedClient.state || '',
      });
      setIsDirty(true);
    }
  }, [selectedClient, isOpen]);

  // Se uma peça for selecionada externamente pela Central de Peças
  useEffect(() => {
    if (selectedPart && isOpen) {
      const code = selectedPart.code || '';
      const name = selectedPart.name || '';

      const currentClient = (clientsList || []).find(
        (c: any) =>
          (clientData.id && c.id === clientData.id) ||
          (clientData.name && c.name && c.name.trim().toLowerCase() === clientData.name.trim().toLowerCase())
      );
      const isTech = Boolean(currentClient?.isTechnician);

      const rawPrice = (isTech && selectedPart.techPrice)
        ? selectedPart.techPrice
        : (selectedPart.finalPrice || selectedPart.price || selectedPart.salePrice || selectedPart.unitPrice || selectedPart.techPrice || '0,00');

      const priceStr = formatCurrencyOnBlur(String(rawPrice));

      setPartsList((prev) => {
        const existingIdx = prev.findIndex(
          (p) =>
            (code && p.code && p.code.trim().toLowerCase() === code.trim().toLowerCase()) ||
            (p.name.trim().toLowerCase() === name.trim().toLowerCase())
        );

        if (existingIdx >= 0) {
          return prev.map((p, idx) =>
            idx === existingIdx
              ? { ...p, qty: (p.qty || 1) + 1, price: priceStr || p.price }
              : p
          );
        }

        return [
          ...prev,
          {
            code,
            name: name.toUpperCase(),
            qty: 1,
            price: priceStr || '0,00',
          },
        ];
      });
      setIsDirty(true);
    }
  }, [selectedPart, isOpen, clientData.id, clientData.name, clientsList]);

  // Se um serviço for selecionado externamente pela Central de Serviços
  useEffect(() => {
    if (selectedService && isOpen) {
      const name = selectedService.name || selectedService.description || '';
      const rawPrice = selectedService.price || '0,00';
      const priceStr = typeof rawPrice === 'number' ? rawPrice.toFixed(2).replace('.', ',') : String(rawPrice).replace('R$', '').trim();

      setServicesList((prev) => {
        const existingIdx = prev.findIndex(
          (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase()
        );
        if (existingIdx >= 0) {
          // Já existe na lista: atualiza o preço se necessário sem duplicar linha
          return prev.map((s, idx) => (idx === existingIdx ? { ...s, price: priceStr || s.price } : s));
        }
        return [
          ...prev,
          {
            name,
            price: priceStr || '0,00',
          },
        ];
      });
      setIsDirty(true);
    }
  }, [selectedService, isOpen]);

  // Aparelhos anteriores do cliente para reaproveitar no orçamento
  const clientPreviousEquipments = useMemo(() => {
    if (!clientData.name?.trim() && !clientData.id) return [];
    const clientNameLower = (clientData.name || '').trim().toLowerCase();
    const clientId = clientData.id;

    const list: Array<{ type: string; brand: string; model: string; serialNumber: string }> = [];
    const safeOrders = Array.isArray(allOrders) ? allOrders : [];

    safeOrders.forEach((order) => {
      const ordClientId = order.clientId || (order.client && order.client.id);
      const ordClientName = (order.clientName || (order.client && order.client.name) || '').trim().toLowerCase();

      const match = (clientId && ordClientId === clientId) || (clientNameLower && ordClientName === clientNameLower);

      if (match && order.equipment) {
        const eq = order.equipment;
        const exists = list.some(
          (item) =>
            item.type === (eq.type || '') &&
            item.brand === (eq.brand || '') &&
            item.model === (eq.model || '') &&
            item.serialNumber === (eq.serialNumber || '')
        );
        if (!exists && (eq.type || eq.brand || eq.model || eq.serialNumber)) {
          list.push({
            type: eq.type || '',
            brand: eq.brand || '',
            model: eq.model || '',
            serialNumber: eq.serialNumber || '',
          });
        }
      }
    });

    return list;
  }, [clientData.id, clientData.name, allOrders]);

  // Totais de Peças e Serviços
  const totalServicesVal = servicesList.reduce((acc, s) => {
    const val = parseFloat((s.price || '0').replace('.', '').replace(',', '.')) || 0;
    return acc + val;
  }, 0);

  const totalPartsVal = partsList.reduce((acc, p) => {
    const unitVal = parseFloat((p.price || '0').replace('.', '').replace(',', '.')) || 0;
    const qty = p.qty || 1;
    return acc + unitVal * qty;
  }, 0);

  const travelVal = parseFloat((travelCost || '0').replace('.', '').replace(',', '.')) || 0;
  const discountVal = parseFloat((discountCost || '0').replace('.', '').replace(',', '.')) || 0;
  const grandTotalVal = Math.max(0, totalPartsVal + totalServicesVal + travelVal - discountVal);

  // Adicionar Peça (Apenas Peças Cadastradas)
  const handleAddPart = (customPrice?: string) => {
    if (isReadOnly) {
      dlgAlert({
        title: 'Orçamento Aprovado',
        message: 'Não é possível alterar os itens de um orçamento APROVADO.\n\nPara modificar as peças ou serviços, clique em "Reabrir para Edição" no rodapé.',
        variant: 'warning',
      });
      return;
    }
    if (!newPartName.trim()) {
      return alert('Por favor, selecione uma peça cadastrada.');
    }

    const cleanCode = newPartCode.trim().toLowerCase();
    const cleanName = newPartName.trim().toLowerCase();

    // Verifica se a peça existe no cadastro do sistema (por código ou por nome)
    const registeredPart = (availableParts || []).find((p) => {
      if (!p) return false;
      const cMatch = cleanCode && p.code && String(p.code).trim().toLowerCase() === cleanCode;
      const nMatch = p.name && String(p.name).trim().toLowerCase() === cleanName;
      return cMatch || nMatch;
    });

    if (!registeredPart) {
      dlgAlert({
        title: 'Peça Não Cadastrada',
        message: `A peça "${newPartName}" não está cadastrada no estoque do sistema.\n\nSelecione uma peça cadastrada na lista de busca ou adicione a peça na Central de Peças.`,
        variant: 'warning',
      });
      return;
    }

    const currentClient = (clientsList || []).find(
      (c: any) =>
        (clientData.id && c.id === clientData.id) ||
        (clientData.name && c.name && c.name.trim().toLowerCase() === clientData.name.trim().toLowerCase())
    );
    const isTechClient = Boolean(currentClient?.isTechnician);

    let defaultPartPrice = registeredPart.finalPrice || registeredPart.price || registeredPart.salePrice || registeredPart.unitPrice || '0,00';
    if (isTechClient && registeredPart.techPrice) {
      defaultPartPrice = registeredPart.techPrice;
    }

    const rawPrice = customPrice !== undefined 
      ? customPrice 
      : (newPartPrice && newPartPrice !== '0,00' ? newPartPrice : defaultPartPrice);
    const cleanPrice = formatCurrencyOnBlur(String(rawPrice));
    const addQty = Math.max(1, newPartQty);

    setPartsList((prev) => {
      const existingIdx = prev.findIndex(
        (p) =>
          (cleanCode && p.code && p.code.trim().toLowerCase() === cleanCode.toLowerCase()) ||
          (p.name.trim().toLowerCase() === cleanName.toLowerCase())
      );

      if (existingIdx >= 0) {
        return prev.map((p, idx) =>
          idx === existingIdx
            ? { ...p, qty: (p.qty || 1) + addQty, price: cleanPrice || p.price }
            : p
        );
      }

      return [
        ...prev,
        {
          code: cleanCode,
          name: cleanName,
          qty: addQty,
          price: cleanPrice,
        },
      ];
    });

    setNewPartCode('');
    setNewPartName('');
    setNewPartQty(1);
    setNewPartPrice('');
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
      setNewPartCode(foundPart.code || '');
      setNewPartName(foundPart.name || '');
      setNewPartPrice(foundPart.finalPrice || foundPart.price || '0,00');
    }
  };

  // Adicionar Serviço
  const handleAddService = (customPrice?: string) => {
    if (isReadOnly) {
      dlgAlert({
        title: 'Orçamento Aprovado',
        message: 'Não é possível alterar os itens de um orçamento APROVADO.\n\nPara modificar as peças ou serviços, clique em "Reabrir para Edição" no rodapé.',
        variant: 'warning',
      });
      return;
    }
    if (!newServiceName.trim()) {
      return alert('Informe a descrição do serviço.');
    }
    const cleanName = newServiceName.trim();
    const priceToUse = customPrice !== undefined ? customPrice : newServicePrice;
    const cleanPrice = formatCurrencyOnBlur(priceToUse);

    setServicesList((prev) => {
      const existingIdx = prev.findIndex(
        (s) => s.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (existingIdx >= 0) {
        return prev.map((s, idx) =>
          idx === existingIdx ? { ...s, price: cleanPrice || s.price } : s
        );
      }
      return [
        ...prev,
        {
          name: cleanName,
          price: cleanPrice,
        },
      ];
    });

    setNewServiceName('');
    setNewServicePrice('');
    setIsDirty(true);
  };

  // Salvar Orçamento
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!clientData.name.trim()) {
      return alert('Por favor, informe o nome do cliente.');
    }

    const nowFormatted = new Date().toLocaleString('pt-BR');
    const responsibleUser = currentUser?.name || 'Atendente';

    // Monta detalhes da alteração/salvamento para a auditoria
    const changeSummary: string[] = [];
    if (!estimateToEdit) {
      changeSummary.push(`Criação do Orçamento #${activeCode}`);
      changeSummary.push(`Status Inicial: ${estimateStatus}`);
      changeSummary.push(`Cliente: ${clientData.name}`);
      changeSummary.push(`Equipamento: ${equipmentData.type || 'Nenhum'} ${equipmentData.brand || ''}`);
      if (partsList.length > 0) {
        const partsDesc = partsList.map((p) => `${p.qty || 1}x ${p.name} (R$ ${p.price})`).join(', ');
        changeSummary.push(`Peças Iniciais (${partsList.length}): ${partsDesc}`);
      } else {
        changeSummary.push(`Peças Iniciais: Nenhuma`);
      }
      if (servicesList.length > 0) {
        const servDesc = servicesList.map((s) => `${s.name} (R$ ${s.price})`).join(', ');
        changeSummary.push(`Serviços Iniciais (${servicesList.length}): ${servDesc}`);
      } else {
        changeSummary.push(`Serviços Iniciais: Nenhum`);
      }
      changeSummary.push(`Valor Total: R$ ${grandTotalVal.toFixed(2).replace('.', ',')}`);
    } else {
      changeSummary.push(`Edição/Atualização do orçamento #${activeCode}`);
      changeSummary.push(`Status: ${estimateStatus}`);
      if (partsList.length > 0) {
        const partsDesc = partsList.map((p) => `${p.qty || 1}x ${p.name} (R$ ${p.price})`).join(', ');
        changeSummary.push(`Peças Lançadas (${partsList.length}): ${partsDesc}`);
      } else {
        changeSummary.push(`Peças Lançadas: Nenhuma`);
      }
      if (servicesList.length > 0) {
        const servDesc = servicesList.map((s) => `${s.name} (R$ ${s.price})`).join(', ');
        changeSummary.push(`Serviços Lançados (${servicesList.length}): ${servDesc}`);
      } else {
        changeSummary.push(`Serviços Lançados: Nenhum`);
      }
      changeSummary.push(`Valor Total: R$ ${grandTotalVal.toFixed(2).replace('.', ',')}`);
    }

    const newAuditEntry = {
      date: nowFormatted,
      user: responsibleUser,
      changes: changeSummary,
    };

    const updatedAuditHistory = [newAuditEntry, ...(auditHistory || [])];

    const estimateObj: Estimate = {
      id: estimateToEdit?.id || `est-${Date.now()}`,
      code: activeCode,
      createdAt: estimateToEdit?.createdAt || new Date().toISOString().split('T')[0],
      validityDays,
      status: estimateStatus,
      client: { ...clientData },
      equipment: { ...equipmentData },
      problemDescription,
      technicalReport,
      partsList: [...partsList],
      servicesList: [...servicesList],
      travelCost,
      discountCost,
      totalAmount: grandTotalVal,
      paymentConditions,
      notes,
      auditHistory: updatedAuditHistory,
    };

    onSaveEstimate(estimateObj);
    setIsDirty(false);
    setSaveToastVisible(true);
    setTimeout(() => setSaveToastVisible(false), 3000);
  };

  // Reabrir orçamento APROVADO para edição
  const handleReopenEstimate = async () => {
    const ok = await dlgConfirm({
      title: 'Reabrir Orçamento para Edição',
      message: 'Este orçamento está marcado como APROVADO.\n\nPara editá-lo, o status será alterado para PENDENTE. Deseja continuar?',
      variant: 'warning',
      confirmText: 'Reabrir para Edição',
      cancelText: 'Cancelar',
    });

    if (!ok) return;

    const nowFormatted = new Date().toLocaleString('pt-BR');
    const responsibleUser = currentUser?.name || 'Atendente';
    const newAuditEntry = {
      date: nowFormatted,
      user: responsibleUser,
      changes: ['Orçamento APROVADO foi reaberto para edição (Status alterado para PENDENTE)'],
    };

    const updatedAuditHistory = [newAuditEntry, ...(auditHistory || [])];
    setEstimateStatus('PENDENTE');
    setAuditHistory(updatedAuditHistory);

    const updatedEstimate: Estimate = {
      id: estimateToEdit?.id || `est-${Date.now()}`,
      code: activeCode,
      createdAt: estimateToEdit?.createdAt || new Date().toISOString().split('T')[0],
      validityDays,
      status: 'PENDENTE',
      client: { ...clientData },
      equipment: { ...equipmentData },
      problemDescription,
      technicalReport,
      partsList: [...partsList],
      servicesList: [...servicesList],
      travelCost,
      discountCost,
      totalAmount: grandTotalVal,
      paymentConditions,
      notes,
      auditHistory: updatedAuditHistory,
    };

    onSaveEstimate(updatedEstimate);
    setIsDirty(false);
  };

  const isReadOnly = estimateToEdit?.status === 'APROVADO';

  // Gerar Venda a partir das peças do orçamento
  const handleGenerateSale = async () => {
    if (!partsList || partsList.length === 0) {
      await dlgAlert({
        title: 'Nenhuma Peça no Orçamento',
        message: 'Este orçamento não possui peças para gerar uma venda no balcão.',
        variant: 'warning',
      });
      return;
    }

    // Prepara os itens do carrinho de vendas
    const saleItems = partsList.map((p) => {
      const unitVal = parseFloat((p.price || '0').replace(/\./g, '').replace(',', '.')) || 0;
      const qtyVal = p.qty || 1;

      // Procura peça no cadastro se existir para associar partId e dados completos
      const matchedPart = (availableParts || []).find(
        (ap: any) =>
          (p.code && ap.code && String(ap.code).trim().toLowerCase() === String(p.code).trim().toLowerCase()) ||
          (ap.name && String(ap.name).trim().toLowerCase() === String(p.name).trim().toLowerCase())
      );

      const partId = matchedPart?.id || `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const costPrice = parseFloat(String(matchedPart?.costPrice || '0').replace(',', '.')) || 0;

      return {
        partId,
        code: p.code || matchedPart?.code || '',
        name: (p.name || matchedPart?.name || 'Peça').toUpperCase(),
        application: matchedPart?.application || matchedPart?.applications || '',
        unitPrice: unitVal,
        qty: qtyVal,
        subtotal: unitVal * qtyVal,
        costPrice,
      };
    });

    try {
      localStorage.setItem('vollen_local_sales_cart', JSON.stringify(saleItems));

      if (clientData && (clientData.name || clientData.id)) {
        const matchedClient = (clientsList || []).find(
          (c: any) =>
            (clientData.id && c.id === clientData.id) ||
            (clientData.name && String(c.name).trim().toLowerCase() === String(clientData.name).trim().toLowerCase())
        );

        const clientToSave = {
          id: matchedClient?.id || clientData.id || '',
          name: matchedClient?.name || clientData.name || '',
          phone: matchedClient?.phone || matchedClient?.telephone || clientData.phone || clientData.whatsapp || '',
          doc: matchedClient?.document || matchedClient?.cpfCnpj || matchedClient?.doc || matchedClient?.cpf || matchedClient?.cnpj || '',
        };

        localStorage.setItem('vollen_local_sales_client', JSON.stringify(clientToSave));
      } else {
        localStorage.removeItem('vollen_local_sales_client');
      }

      if (estimateToEdit?.id) {
        localStorage.setItem('vollen_origin_estimate_id', estimateToEdit.id);
      } else {
        localStorage.removeItem('vollen_origin_estimate_id');
      }
    } catch (e) {
      console.error('Erro ao salvar carrinho de vendas:', e);
    }

    // Prepara o snapshot do orçamento atual caso a venda não seja concluída
    const currentEstimate: Estimate = {
      id: estimateToEdit?.id || `est-${Date.now()}`,
      code: activeCode,
      createdAt: estimateToEdit?.createdAt || new Date().toISOString().split('T')[0],
      validityDays,
      status: estimateToEdit?.status || 'PENDENTE',
      client: { ...clientData },
      equipment: { ...equipmentData },
      problemDescription,
      technicalReport,
      partsList: [...partsList],
      servicesList: [...servicesList],
      travelCost,
      discountCost,
      totalAmount: grandTotalVal,
      paymentConditions,
      notes,
      auditHistory: [...auditHistory],
    };

    if (onOpenSalesModal) {
      onOpenSalesModal(currentEstimate);
    }
  };
  const handleGenerateOS = async () => {
    if (estimateToEdit?.status === 'APROVADO') {
      await dlgAlert({
        title: 'Orçamento Já Convertido',
        message: `O orçamento #${activeCode} já foi aprovado e convertido em Ordem de Serviço anteriormente.\n\nNão é possível gerar outra OS a partir deste mesmo orçamento.`,
        variant: 'warning',
      });
      return;
    }

    // Validação: Para virar OS, o cliente precisa estar cadastrado no banco de clientes
    let matchedClientId = clientData.id;
    if (!matchedClientId && clientData.name?.trim()) {
      const searchName = clientData.name.trim().toLowerCase();
      const existingClient = (clientsList || []).find(
        (c: any) => c && c.name && c.name.trim().toLowerCase() === searchName
      );
      if (existingClient && existingClient.id) {
        matchedClientId = existingClient.id;
      }
    }

    if (!matchedClientId) {
      await dlgAlert({
        title: 'Cliente Não Cadastrado',
        message: 'Para gerar uma Ordem de Serviço a partir deste orçamento, o cliente deve estar cadastrado no sistema.\n\nPor favor, cadastre ou selecione um cliente existente na Central de Clientes.',
        variant: 'warning',
      });
      if (onOpenClientsModal) {
        onOpenClientsModal();
      }
      return;
    }

    const currentEstimate: Estimate = {
      id: estimateToEdit?.id || `est-${Date.now()}`,
      code: activeCode,
      createdAt: estimateToEdit?.createdAt || new Date().toISOString().split('T')[0],
      validityDays,
      status: estimateToEdit?.status || 'PENDENTE',
      client: { ...clientData, id: matchedClientId },
      equipment: { ...equipmentData },
      problemDescription,
      technicalReport,
      partsList: [...partsList],
      servicesList: [...servicesList],
      travelCost,
      discountCost,
      totalAmount: grandTotalVal,
      paymentConditions,
      notes,
      auditHistory: [...auditHistory],
    };

    onGenerateOSFromEstimate(currentEstimate);
    onClose();
  };

  // Envio de Orçamento formatado via WhatsApp
  const handleSendWhatsApp = () => {
    const rawPhone = (clientData.whatsapp || clientData.phone || '').replace(/\D/g, '');
    if (!rawPhone) {
      return alert('O cliente não possui WhatsApp ou telefone informado.');
    }
    const phoneWithDDI = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;

    let msg = `*ORÇAMENTO COMERCIAL #${activeCode}*\n`;
    if (companyInfo.name) msg += `*${companyInfo.name}*\n`;
    msg += `----------------------------------------\n`;
    msg += `*Cliente:* ${clientData.name}\n`;
    msg += `*Aparelho:* ${equipmentData.type || ''} ${equipmentData.brand || ''} ${equipmentData.model || ''}\n`;
    if (problemDescription) msg += `*Defeito Reclamado:* ${problemDescription}\n`;
    if (technicalReport) msg += `*Diagnóstico:* ${technicalReport}\n`;
    msg += `----------------------------------------\n`;

    if (servicesList.length > 0) {
      msg += `*SERVIÇOS:*\n`;
      servicesList.forEach((s) => {
        msg += `• ${s.name} - R$ ${s.price}\n`;
      });
    }

    if (partsList.length > 0) {
      msg += `\n*PEÇAS:*\n`;
      partsList.forEach((p) => {
        msg += `• ${p.name} (x${p.qty}) - R$ ${p.price}\n`;
      });
    }

    msg += `----------------------------------------\n`;
    msg += `*VALOR TOTAL:* R$ ${grandTotalVal.toFixed(2).replace('.', ',')}\n`;
    msg += `*Validade:* ${validityDays} dias\n`;
    msg += `*Condições:* ${paymentConditions || 'À Vista / PIX / Cartão'}\n`;
    if (notes) msg += `*Obs:* ${notes}\n`;
    msg += `\nPara aprovar este orçamento, por favor responda a esta mensagem.`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?phone=${phoneWithDDI}&text=${encoded}`, '_blank');
  };

  const { alert: dlgAlert, confirm: dlgConfirm } = useDialog();

  const handleSafeClose = async () => {
    if (isDirty) {
      const ok = await dlgConfirm({
        title: 'Descartar Alterações',
        message: 'Você fez alterações neste orçamento. Deseja realmente sair e descartar as alterações não salvas?',
        variant: 'warning',
        confirmText: 'Sair sem Salvar',
        cancelText: 'Continuar Editando',
      });
      if (!ok) return;
    }
    setIsDirty(false);
    onClose();
  };

  const handleSafeCloseRef = useRef(handleSafeClose);
  handleSafeCloseRef.current = handleSafeClose;

  // Registro na pilha de modais para ESC fechar apenas o último modal aberto
  useEffect(() => {
    if (isOpen) {
      modalStack.register('CreateEstimateModal', () => handleSafeCloseRef.current?.());
      return () => modalStack.unregister('CreateEstimateModal');
    }
  }, [isOpen]);

  // Atalhos Globais no Modal (F2: Salvar, Ctrl+P: Imprimir)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrintEstimate('A4');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, clientData, equipmentData, partsList, servicesList, validityDays, estimateStatus, travelCost, discountCost, problemDescription, technicalReport, paymentConditions, notes]);

  // Imprimir Orçamento (A4 ou Térmica 80mm) - Suporta window.open e Fallback via iframe invisível (imune a bloqueador de pop-ups)
  const handlePrintEstimate = (layout: 'A4' | 'THERMAL_80MM' = 'A4') => {
    const todayStr = new Date().toLocaleDateString('pt-BR');

    const generateHtml = () => {
      if (layout === 'THERMAL_80MM') {
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8"/>
              <title>Orçamento #${activeCode} - Térmica</title>
              <style>
                @page { size: 80mm auto; margin: 2mm; }
                body {
                  font-family: 'Courier New', monospace, sans-serif;
                  font-size: 11px;
                  color: #000;
                  margin: 0;
                  padding: 4px;
                  line-height: 1.25;
                  width: 76mm;
                }
                .center { text-align: center; }
                .bold { font-weight: bold; }
                .title { font-size: 14px; font-weight: bold; margin: 3px 0; }
                .divider { border-bottom: 1px dashed #000; margin: 4px 0; }
                .row { display: flex; justify-content: space-between; }
                .item-table { width: 100%; border-collapse: collapse; margin: 4px 0; }
                .item-table th { text-align: left; border-bottom: 1px solid #000; font-size: 10px; }
                .item-table td { font-size: 10.5px; padding: 2px 0; }
                .total-box { font-size: 13px; font-weight: bold; margin-top: 6px; text-align: right; }
                .footer { text-align: center; font-size: 9.5px; margin-top: 10px; }
              </style>
            </head>
            <body>
              <div class="center bold title">${companyInfo.name || 'ASSISTÊNCIA TÉCNICA'}</div>
              <div class="center" style="font-size: 10px;">${companyInfo.phone ? `Tel: ${companyInfo.phone}` : ''} ${companyInfo.whatsapp ? `| Whats: ${companyInfo.whatsapp}` : ''}</div>
              <div class="center" style="font-size: 9.5px;">${companyInfo.address || ''}</div>
              <div class="divider"></div>

              <div class="center bold" style="font-size: 12px;">ORÇAMENTO #${activeCode}</div>
              <div class="row" style="font-size: 10px;">
                <span>Emissão: ${todayStr}</span>
                <span>Validade: ${validityDays} dias</span>
              </div>
              <div class="divider"></div>

              <div><strong>CLIENTE:</strong> ${clientData.name}</div>
              ${clientData.phone ? `<div><strong>Tel:</strong> ${clientData.phone}</div>` : ''}
              <div><strong>APARELHO:</strong> ${equipmentData.type || ''} ${equipmentData.brand || ''} ${equipmentData.model || ''}</div>
              ${problemDescription ? `<div><strong>Defeito:</strong> ${problemDescription}</div>` : ''}
              <div class="divider"></div>

              ${servicesList.length > 0 ? `
                <div class="bold" style="font-size: 10px;">SERVIÇOS:</div>
                <table class="item-table">
                  ${servicesList.map(s => `
                    <tr>
                      <td>${s.name}</td>
                      <td style="text-align: right; font-weight: bold;">R$ ${s.price}</td>
                    </tr>
                  `).join('')}
                </table>
              ` : ''}

              ${partsList.length > 0 ? `
                <div class="bold" style="font-size: 10px;">PEÇAS:</div>
                <table class="item-table">
                  ${partsList.map(p => {
                    const uVal = parseFloat((p.price || '0').replace('.', '').replace(',', '.')) || 0;
                    const tot = uVal * (p.qty || 1);
                    return `
                      <tr>
                        <td>${p.name} (x${p.qty})</td>
                        <td style="text-align: right; font-weight: bold;">R$ ${tot.toFixed(2).replace('.', ',')}</td>
                      </tr>
                    `;
                  }).join('')}
                </table>
              ` : ''}

              <div class="divider"></div>
              <div class="total-box">TOTAL: R$ ${grandTotalVal.toFixed(2).replace('.', ',')}</div>
              <div style="font-size: 10px; margin-top: 3px;"><strong>Pagamento:</strong> ${paymentConditions || 'À Vista / PIX / Cartão'}</div>

              <div class="footer">
                <p>Validade de ${validityDays} dias.<br/>Agradecemos a preferência!</p>
                <br/><br/>
                ____________________________<br/>
                Assinatura do Cliente
              </div>
            </body>
          </html>
        `;
      }

      // Layout Padrão A4
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8"/>
            <title>Orçamento Comercial #${activeCode}</title>
            <style>
              @page { size: A4; margin: 10mm; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                color: #1e293b;
                margin: 0;
                padding: 10px;
                font-size: 12px;
                line-height: 1.35;
              }
              .header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
              .company-name { font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; }
              .company-sub { font-size: 10.5px; color: #475569; }
              .doc-title-box { text-align: right; }
              .doc-title { font-size: 18px; font-weight: 900; color: #d97706; }
              .doc-num { font-size: 14px; font-weight: 700; color: #0f172a; }
              .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
              .info-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background-color: #f8fafc; }
              .card-title { font-weight: bold; color: #0f172a; font-size: 11.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-top: 4px; }
              th { background-color: #f1f5f9; color: #334155; font-weight: 700; font-size: 10.5px; text-align: left; padding: 5px 6px; border: 1px solid #cbd5e1; }
              td { padding: 5px 6px; border: 1px solid #cbd5e1; font-size: 11px; }
              .total-box { margin-top: 10px; border: 2px solid #0f172a; border-radius: 6px; padding: 8px; background-color: #f8fafc; display: flex; justify-content: space-between; align-items: center; }
              .total-val { font-size: 18px; font-weight: 900; color: #0f172a; }
              .footer-terms { margin-top: 14px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 10px; color: #475569; line-height: 1.3; }
              .signatures { margin-top: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; }
              .sig-line { border-top: 1px solid #000; padding-top: 4px; font-size: 10px; font-weight: bold; }
            </style>
          </head>
          <body>
            <table class="header-table">
              <tr>
                <td>
                  <div class="company-name">${companyInfo.name || 'VOLLEN ASSISTÊNCIA TÉCNICA'}</div>
                  <div class="company-sub">${companyInfo.cnpj ? `CNPJ: ${companyInfo.cnpj} • ` : ''}${companyInfo.address || ''}</div>
                  <div class="company-sub">${companyInfo.phone ? `Tel: ${companyInfo.phone}` : ''} ${companyInfo.whatsapp ? `• WhatsApp: ${companyInfo.whatsapp}` : ''}</div>
                </td>
                <td class="doc-title-box">
                  <div class="doc-title">ORÇAMENTO</div>
                  <div class="doc-num">#${activeCode}</div>
                  <div style="font-size: 10.5px; color: #64748b;">Emissão: ${todayStr}</div>
                  <div style="font-size: 10.5px; color: #64748b;">Validade: ${validityDays} dias</div>
                </td>
              </tr>
            </table>

            <div class="grid-2">
              <div class="info-card">
                <div class="card-title">DADOS DO CLIENTE</div>
                <div><strong>Nome:</strong> ${clientData.name}</div>
                ${clientData.phone ? `<div><strong>Telefone:</strong> ${clientData.phone}</div>` : ''}
                ${clientData.address ? `<div><strong>Endereço:</strong> ${clientData.address}</div>` : ''}
              </div>

              <div class="info-card">
                <div class="card-title">DADOS DO APARELHO / EQUIPAMENTO</div>
                <div><strong>Aparelho:</strong> ${equipmentData.type || ''} ${equipmentData.brand || ''} ${equipmentData.model ? `(Mod: ${equipmentData.model})` : ''}</div>
                ${equipmentData.serialNumber ? `<div><strong>Nº de Série:</strong> ${equipmentData.serialNumber}</div>` : ''}
                ${problemDescription ? `<div style="margin-top: 2px;"><strong>Defeito Declarado:</strong> ${problemDescription}</div>` : ''}
                ${technicalReport ? `<div style="margin-top: 2px;"><strong>Laudo/Diagnóstico:</strong> ${technicalReport}</div>` : ''}
              </div>
            </div>

            ${servicesList.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <div style="font-weight: bold; color: #0f172a; margin-bottom: 3px; font-size: 11.5px;">SERVIÇOS / MÃO DE OBRA:</div>
                <table>
                  <thead>
                    <tr>
                      <th>DESCRIÇÃO DO SERVIÇO</th>
                      <th style="width: 120px; text-align: right;">VALOR (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${servicesList.map(s => `
                      <tr>
                        <td>${s.name}</td>
                        <td style="text-align: right; font-weight: bold;">R$ ${s.price}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            ${partsList.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <div style="font-weight: bold; color: #0f172a; margin-bottom: 3px; font-size: 11.5px;">PEÇAS E COMPONENTES A SUBSTITUIR:</div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 80px;">CÓDIGO</th>
                      <th>DESCRIÇÃO DA PEÇA</th>
                      <th style="width: 60px; text-align: center;">QTD</th>
                      <th style="width: 100px; text-align: right;">UNITÁRIO</th>
                      <th style="width: 100px; text-align: right;">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${partsList.map(p => {
                      const uVal = parseFloat((p.price || '0').replace('.', '').replace(',', '.')) || 0;
                      const tot = uVal * (p.qty || 1);
                      return `
                        <tr>
                          <td style="font-family: monospace;">${p.code || '-'}</td>
                          <td>${p.name}</td>
                          <td style="text-align: center;">${p.qty}</td>
                          <td style="text-align: right;">R$ ${p.price}</td>
                          <td style="text-align: right; font-weight: bold;">R$ ${tot.toFixed(2).replace('.', ',')}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <div class="total-box">
              <div>
                <strong>Condições de Pagamento:</strong> ${paymentConditions || 'À Vista / Cartão / PIX'}<br/>
                ${notes ? `<span style="font-size: 10.5px; color: #64748b;">Obs: ${notes}</span>` : ''}
              </div>
              <div style="text-align: right;">
                <span style="font-size: 12px; color: #64748b;">VALOR TOTAL DO ORÇAMENTO:</span>
                <div class="total-val">R$ ${grandTotalVal.toFixed(2).replace('.', ',')}</div>
              </div>
            </div>

            <div class="footer-terms">
              <strong>Condições Gerais:</strong> Este orçamento possui validade de ${validityDays || 10} dias a contar da data de emissão. A aprovação pode ser feita via WhatsApp ou diretamente no balcão. Após aprovação, as peças serão reservadas e o serviço executado nos prazos acordados.
            </div>

            <div class="signatures">
              <div>
                <div class="sig-line">ASSINATURA DA EMPRESA / TÉCNICO</div>
              </div>
              <div>
                <div class="sig-line">APROVAÇÃO DO CLIENTE</div>
              </div>
            </div>
          </body>
        </html>
      `;
    };

    const htmlContent = generateHtml();

    // 1. Tenta abrir janela popup de impressão
    let printWindow: Window | null = null;
    try {
      printWindow = window.open('', '_blank', 'width=900,height=750');
    } catch (e) {
      printWindow = null;
    }

    if (printWindow && printWindow.document) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (err) {
          console.warn('Erro ao chamar print na nova janela:', err);
        }
      }, 250);
      return;
    }

    // 2. FALLBACK IMUNE A BLOQUEIO DE POP-UPS (Iframe invisível no próprio documento)
    const existingIframe = document.getElementById('estimate_print_frame');
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'estimate_print_frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (iframeErr) {
          console.error('Falha ao imprimir via iframe:', iframeErr);
          window.print();
        }
      }, 300);
    } else {
      window.print();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 select-none font-sans text-xs"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-300 rounded-2xl w-full max-w-5xl max-h-[94vh] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Notification Toast de Salvamento Concluído (Overlay Flutuante) */}
        {saveToastVisible && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-2xl animate-pulse border border-emerald-400 pointer-events-none">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>Orçamento #{activeCode} salvo com sucesso!</span>
          </div>
        )}

        {/* Header */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight flex items-center gap-2">
                <span>{estimateToEdit ? `Editar Orçamento #${estimateToEdit.code}` : `Novo Orçamento #${activeCode}`}</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[11px] font-mono">
                  Validade: {validityDays} dias
                </span>
              </h2>
              <p className="text-[10.5px] text-amber-100">
                Elabore orçamentos prévios com peças e serviços e converta em OS a qualquer momento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-lg">
              <span className="text-[10.5px] font-semibold text-amber-100">Status:</span>
              <select
                value={estimateStatus}
                onChange={(e) => {
                  setEstimateStatus(e.target.value as any);
                  setIsDirty(true);
                }}
                className="bg-white text-slate-800 font-bold px-2 py-0.5 rounded text-xs focus:outline-none cursor-pointer"
              >
                <option value="PENDENTE">⏳ PENDENTE</option>
                <option value="APROVADO">✅ APROVADO</option>
                <option value="RECUSADO">❌ RECUSADO</option>
              </select>
            </div>

            {/* Histórico do Orçamento no Cabeçalho */}
            <button
              type="button"
              onClick={() => setIsAuditHistoryModalOpen(true)}
              className="h-7 px-2.5 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer text-xs border border-white/30 shadow-2xs"
              title="Visualizar histórico de edições e salvamentos deste orçamento"
            >
              <History className="w-3.5 h-3.5 text-amber-200 shrink-0" />
              <span>Histórico ({auditHistory.length})</span>
            </button>

            <button
              type="button"
              onClick={handleSafeClose}
              className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo com Rolagem */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1 bg-slate-50">
          {/* 1. SEÇÃO DO CLIENTE & EQUIPAMENTO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Box Cliente */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                <span className="font-bold text-sky-800 flex items-center gap-1.5 text-[11.5px]">
                  <User className="w-3.5 h-3.5 text-sky-600" /> Dados do Cliente
                </span>
                {onOpenClientsModal && (
                  <button
                    type="button"
                    onClick={onOpenClientsModal}
                    className="text-[10.5px] font-bold text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Search className="w-3 h-3" />
                    Buscar Cliente
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Nome do Cliente *</label>
                  <input
                    type="text"
                    required
                    value={clientData.name}
                    onChange={(e) => {
                      setClientData({ ...clientData, name: e.target.value });
                      setIsDirty(true);
                    }}
                    placeholder="Digite o nome do cliente..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Telefone</label>
                  <input
                    type="text"
                    value={clientData.phone}
                    onChange={(e) => {
                      const nums = e.target.value.replace(/\D/g, '').slice(0, 11);
                      let formatted = nums;
                      if (nums.length > 6) {
                        formatted = nums.length === 11
                          ? `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
                          : `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
                      } else if (nums.length > 2) {
                        formatted = `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
                      }
                      setClientData({ ...clientData, phone: formatted });
                      setIsDirty(true);
                    }}
                    placeholder="(00) 0000-0000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">WhatsApp</label>
                  <input
                    type="text"
                    value={clientData.whatsapp}
                    onChange={(e) => {
                      const nums = e.target.value.replace(/\D/g, '').slice(0, 11);
                      let formatted = nums;
                      if (nums.length > 6) {
                        formatted = nums.length === 11
                          ? `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
                          : `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
                      } else if (nums.length > 2) {
                        formatted = `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
                      }
                      setClientData({ ...clientData, whatsapp: formatted });
                      setIsDirty(true);
                    }}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>
            </div>

            {/* Box Equipamento */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11.5px]">
                  <Cpu className="w-3.5 h-3.5 text-amber-600" /> Equipamento / Aparelho
                </span>

                {clientPreviousEquipments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsClientEquipmentsOpen(true)}
                    className="text-[10.5px] font-bold text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Package className="w-3 h-3" />
                    Aparelhos Anteriores ({clientPreviousEquipments.length})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Tipo *</label>
                  <select
                    required
                    value={equipmentData.type}
                    onChange={(e) => {
                      setEquipmentData({ ...equipmentData, type: e.target.value });
                      setIsDirty(true);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-amber-600 uppercase cursor-pointer text-xs"
                  >
                    <option value="">SELECIONE O TIPO...</option>
                    {Array.from(
                      new Set(
                        (Array.isArray(availableEquipments) ? availableEquipments : [])
                          .map((eq) => (eq ? (eq.type || eq.name || '') : '').trim().toUpperCase())
                          .filter(Boolean)
                      )
                    ).map((typeName, idx) => (
                      <option key={idx} value={typeName} className="uppercase font-bold">
                        {typeName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Marca</label>
                  <input
                    type="text"
                    value={equipmentData.brand}
                    onChange={(e) => {
                      setEquipmentData({ ...equipmentData, brand: e.target.value });
                      setIsDirty(true);
                    }}
                    placeholder="Ex: Brastemp, Electrolux"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-amber-600 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Modelo</label>
                  <input
                    type="text"
                    value={equipmentData.model}
                    onChange={(e) => {
                      setEquipmentData({ ...equipmentData, model: e.target.value });
                      setIsDirty(true);
                    }}
                    placeholder="Ex: BWH15, DF52"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-amber-600 uppercase"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Número de Série do Equipamento</label>
                  <input
                    type="text"
                    value={equipmentData.serialNumber || ''}
                    onChange={(e) => {
                      setEquipmentData({ ...equipmentData, serialNumber: e.target.value });
                      setIsDirty(true);
                    }}
                    placeholder="Ex: SN-987654321, 2026-XYZ"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-amber-600 uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. TABELAS DE SERVIÇOS E PEÇAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* SERVIÇOS */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11.5px]">
                    <Wrench className="w-3.5 h-3.5 text-sky-600" /> Serviços / Mão de Obra
                  </span>
                  <div className="flex items-center gap-2">
                    {onOpenServicesModal && (
                      <button
                        type="button"
                        onClick={onOpenServicesModal}
                        className="text-[10.5px] font-bold text-sky-700 hover:underline flex items-center gap-1 cursor-pointer bg-sky-50 px-2 py-0.5 rounded border border-sky-200"
                      >
                        <Search className="w-3 h-3" />
                        Buscar Serviços
                      </button>
                    )}
                    <span className="font-mono font-bold text-sky-800 text-xs">
                      Subtotal: R$ {totalServicesVal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                {/* Form Adicionar Serviço */}
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddService();
                      }
                    }}
                    placeholder="Descrição do serviço..."
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-600"
                  />
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
                    placeholder="Valor R$"
                    className="w-24 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-right font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-sky-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddService()}
                    className="bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                    title="Adicionar serviço (Enter)"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>

                {/* Lista de Serviços em Tabela (Altura Fixa de 5 Linhas) */}
                <div className="border border-slate-200 rounded-lg overflow-hidden h-[175px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 text-[10.5px]">
                      <tr>
                        <th className="p-1.5 border-b border-slate-200">Descrição</th>
                        <th className="p-1.5 border-b border-slate-200 text-right w-24">Valor (R$)</th>
                        <th className="p-1.5 border-b border-slate-200 text-center w-10">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {servicesList.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-slate-400 italic">
                            Nenhum serviço adicionado
                          </td>
                        </tr>
                      ) : (
                        servicesList.map((srv, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-1.5 font-medium text-slate-800 whitespace-nowrap truncate max-w-[200px]" title={srv.name}>{srv.name}</td>
                            <td className="p-1.5 font-bold font-mono text-right text-slate-900 whitespace-nowrap">R$ {srv.price}</td>
                            <td className="p-1.5 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setServicesList((prev) => prev.filter((_, i) => i !== idx));
                                  setIsDirty(true);
                                }}
                                className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
                                title="Excluir serviço"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* PEÇAS */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11.5px]">
                    <Package className="w-3.5 h-3.5 text-amber-600" /> Peças / Componentes
                  </span>
                  <div className="flex items-center gap-2">
                    {onOpenPartsModal && (
                      <button
                        type="button"
                        onClick={onOpenPartsModal}
                        className="text-[10.5px] font-bold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer bg-amber-50 px-2 py-0.5 rounded border border-amber-200"
                      >
                        <Search className="w-3 h-3" />
                        Buscar Peças
                      </button>
                    )}
                    <span className="font-mono font-bold text-amber-800 text-xs">
                      Subtotal: R$ {totalPartsVal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                {/* Form Adicionar Peça com Filtro de Busca (Nome ou Aplicação) */}
                <div className="flex items-center gap-1 mb-2 relative">
                  <input
                    type="text"
                    value={newPartCode}
                    onChange={(e) => setNewPartCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchPartByCode(newPartCode);
                      }
                    }}
                    placeholder="Cód."
                    className="w-12 shrink-0 bg-slate-50 border border-slate-300 rounded-lg px-1.5 py-1 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-600 font-mono"
                  />
                  <div className="flex-1 min-w-0 relative">
                    <input
                      type="text"
                      value={newPartName}
                      onChange={(e) => {
                        setNewPartName(e.target.value);
                        setShowPartDropdown(true);
                      }}
                      onFocus={() => setShowPartDropdown(true)}
                      placeholder="Buscar peça por nome ou aplicação..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-600 font-medium"
                    />

                    {/* Dropdown Auto-Complete de Peças Filtradas */}
                    {showPartDropdown && newPartName.trim().length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                        {(() => {
                          const query = newPartName.trim().toLowerCase();
                          const filtered = (availableParts || []).filter((p) => {
                            if (!p) return false;
                            const nameMatch = (p.name || '').toLowerCase().includes(query);
                            const codeMatch = (p.code || '').toLowerCase().includes(query);
                            const appMatch = (p.application || p.applications || p.app || '').toLowerCase().includes(query);
                            return nameMatch || codeMatch || appMatch;
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="p-2.5 text-xs text-slate-500 italic text-center">
                                Nenhuma peça cadastrada encontrada com este nome ou aplicação.
                              </div>
                            );
                          }

                          return filtered.map((pt, idx) => (
                            <button
                              key={pt.id || idx}
                              type="button"
                              onClick={() => {
                                const currentClient = (clientsList || []).find(
                                  (c: any) =>
                                    (clientData.id && c.id === clientData.id) ||
                                    (clientData.name && c.name && c.name.trim().toLowerCase() === clientData.name.trim().toLowerCase())
                                );
                                const isTech = Boolean(currentClient?.isTechnician);
                                const selectedPrice = (isTech && pt.techPrice) ? pt.techPrice : (pt.finalPrice || pt.price || pt.salePrice || pt.unitPrice || pt.techPrice || '0,00');

                                setNewPartCode(pt.code || '');
                                setNewPartName((pt.name || '').toUpperCase());
                                setNewPartPrice(formatCurrencyOnBlur(String(selectedPrice)));
                                setShowPartDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-amber-50 border-b border-slate-100 last:border-0 cursor-pointer flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-xs text-slate-800 block truncate uppercase">
                                  {pt.name}
                                </span>
                                {(pt.application || pt.code) && (
                                  <span className="text-[10.5px] text-slate-500 block truncate uppercase">
                                    {pt.code ? `Cód: ${pt.code} ` : ''}{pt.application ? `| Aplicação: ${pt.application}` : ''}
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono font-bold text-amber-700 text-xs block">
                                  R$ {formatCurrencyOnBlur(String((Boolean((clientsList || []).find((c: any) => (clientData.id && c.id === clientData.id) || (clientData.name && c.name && c.name.trim().toLowerCase() === clientData.name.trim().toLowerCase()))?.isTechnician) && pt.techPrice) ? pt.techPrice : (pt.finalPrice || pt.price || pt.salePrice || pt.unitPrice || pt.techPrice || '0,00')))}
                                </span>
                                {pt.stockQuantity !== undefined && (
                                  <span className="text-[10px] text-slate-500 block">
                                    Est: {pt.stockQuantity}
                                  </span>
                                )}
                              </div>
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>

                  <input
                    type="number"
                    min="1"
                    value={newPartQty}
                    onChange={(e) => setNewPartQty(parseInt(e.target.value, 10) || 1)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPart();
                      }
                    }}
                    placeholder="Qtd"
                    className="w-11 shrink-0 bg-slate-50 border border-slate-300 rounded-lg px-1 py-1 text-xs text-center font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-600"
                  />
                  <input
                    type="text"
                    value={newPartPrice}
                    readOnly
                    placeholder="R$"
                    className="w-16 shrink-0 bg-slate-100 border border-slate-300 rounded-lg px-1 py-1 text-xs text-right font-bold text-slate-700 cursor-not-allowed"
                    title="O preço é puxado automaticamente do cadastro da peça selecionada"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddPart()}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-0.5 cursor-pointer shadow-xs text-xs shrink-0"
                    title="Adicionar peça (Enter)"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>

                {/* Lista de Peças em Tabela (Altura Fixa de 5 Linhas) */}
                <div className="border border-slate-200 rounded-lg overflow-hidden h-[175px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 text-[10.5px]">
                      <tr>
                        <th className="p-1.5 border-b border-slate-200 w-16 whitespace-nowrap">Cód</th>
                        <th className="p-1.5 border-b border-slate-200 whitespace-nowrap">Descrição</th>
                        <th className="p-1.5 border-b border-slate-200 text-center w-10 whitespace-nowrap">Qtd</th>
                        <th className="p-1.5 border-b border-slate-200 text-right w-16 whitespace-nowrap">Unit.</th>
                        <th className="p-1.5 border-b border-slate-200 text-right w-20 whitespace-nowrap">Total</th>
                        <th className="p-1.5 border-b border-slate-200 text-center w-8 whitespace-nowrap">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-3 text-center text-slate-400 italic">
                            Nenhuma peça adicionada
                          </td>
                        </tr>
                      ) : (
                        partsList.map((pt, idx) => {
                          const uVal = parseFloat((pt.price || '0').replace('.', '').replace(',', '.')) || 0;
                          const tVal = uVal * (pt.qty || 1);
                          return (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="p-1.5 font-mono text-[10.5px] text-slate-500 whitespace-nowrap">{pt.code || '-'}</td>
                              <td className="p-1.5 font-medium text-slate-800 whitespace-nowrap truncate max-w-[150px] uppercase" title={pt.name}>{pt.name}</td>
                              <td className="p-1.5 text-center font-bold text-slate-700 whitespace-nowrap">{pt.qty}</td>
                              <td className="p-1.5 text-right text-slate-600 font-mono whitespace-nowrap">{pt.price}</td>
                              <td className="p-1.5 text-right font-bold text-slate-900 font-mono whitespace-nowrap">R$ {tVal.toFixed(2).replace('.', ',')}</td>
                              <td className="p-1.5 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isReadOnly) {
                                      dlgAlert({
                                        title: 'Orçamento Aprovado',
                                        message: 'Não é possível alterar os itens de um orçamento APROVADO.\n\nPara modificar as peças ou serviços, clique em "Reabrir para Edição" no rodapé.',
                                        variant: 'warning',
                                      });
                                      return;
                                    }
                                    setPartsList((prev) => prev.filter((_, i) => i !== idx));
                                    setIsDirty(true);
                                  }}
                                  className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
                                  title="Excluir peça"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* 3. TOTALIZADOR FINANCEIRO & CONDIÇÕES (Barra Mais Compacta) */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Validade do Orçamento</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={validityDays}
                  onChange={(e) => {
                    setValidityDays(parseInt(e.target.value, 10) || 10);
                    setIsDirty(true);
                  }}
                  className="w-16 bg-slate-50 border border-slate-300 rounded-md py-0.5 px-1 text-center font-bold text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
                <span className="font-bold text-slate-600 text-xs">Dias</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Deslocamento (R$)</label>
              <input
                type="text"
                value={travelCost}
                onChange={(e) => {
                  setTravelCost(e.target.value);
                  setIsDirty(true);
                }}
                onBlur={(e) => {
                  setTravelCost(formatCurrencyOnBlur(e.target.value));
                }}
                placeholder="0,00"
                className="w-full bg-slate-50 border border-slate-300 rounded-md py-0.5 px-2 text-right font-bold text-xs text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Desconto (R$)</label>
              <input
                type="text"
                value={discountCost}
                onChange={(e) => {
                  setDiscountCost(e.target.value);
                  setIsDirty(true);
                }}
                onBlur={(e) => {
                  setDiscountCost(formatCurrencyOnBlur(e.target.value));
                }}
                placeholder="0,00"
                className="w-full bg-slate-50 border border-slate-300 rounded-md py-0.5 px-2 text-right font-bold text-xs text-red-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-2 py-1 text-right shadow-2xs flex items-center justify-between">
              <span className="text-[9.5px] font-bold text-emerald-800 uppercase block">TOTAL</span>
              <span className="text-lg font-black font-mono text-emerald-700">
                R$ {grandTotalVal.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé de Ações com Botões Principais */}
        <div className="p-3 bg-slate-100 border-t border-slate-300 flex flex-wrap items-center justify-end gap-2 shrink-0">

          {estimateToEdit && onDeleteEstimate && (
            <button
              type="button"
              onClick={async () => {
                const ok = await dlgConfirm({
                  title: 'Excluir Orçamento',
                  message: `Deseja realmente EXCLUIR o orçamento #${estimateToEdit.code}?`,
                  variant: 'danger',
                  confirmText: 'Excluir',
                });
                if (ok) {
                  onDeleteEstimate(estimateToEdit.id);
                  onClose();
                }
              }}
              className="h-9 px-3.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer text-xs"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Excluir</span>
            </button>
          )}

          {/* Botão Reabrir Orçamento se estiver APROVADO sem ter virado OS */}
          {estimateToEdit?.status === 'APROVADO' && !estimateToEdit?.convertedToOSId && (
            <button
              type="button"
              onClick={handleReopenEstimate}
              className="h-9 px-3.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer text-xs shadow-xs"
              title="Reabre este orçamento para edição e altera seu status para PENDENTE"
            >
              <RefreshCw className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Reabrir para Edição</span>
            </button>
          )}

          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer text-xs"
            title="Enviar orçamento formatado no WhatsApp do cliente"
          >
            <Phone className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>WhatsApp</span>
          </button>

          {/* Menu Dropdown de Impressão */}
          <div className="relative" ref={printMenuRef}>
            <button
              type="button"
              onClick={() => setShowPrintMenu(!showPrintMenu)}
              className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer text-xs"
              title="Selecione o formato de impressão do orçamento"
            >
              <Printer className="w-4 h-4 text-indigo-200 shrink-0" />
              <span>Imprimir</span>
              <ChevronDown className={`w-3.5 h-3.5 text-indigo-200 transition-transform ${showPrintMenu ? 'rotate-180' : ''}`} />
            </button>

            {showPrintMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-52 bg-white border border-slate-300 rounded-xl shadow-xl z-50 overflow-hidden text-xs py-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowPrintMenu(false);
                    handlePrintEstimate('A4');
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-slate-800 font-medium flex items-center gap-2 transition-colors cursor-pointer border-b border-slate-100"
                >
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">Imprimir Folha A4</div>
                    <div className="text-[10px] text-slate-500">Documento completo em A4</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPrintMenu(false);
                    handlePrintEstimate('THERMAL_80MM');
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-slate-800 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">Imprimir Cupom Térmico</div>
                    <div className="text-[10px] text-slate-500">Impressora não-fiscal 80mm/58mm</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Gerar Venda no Balcão */}
          <button
            type="button"
            onClick={handleGenerateSale}
            className="h-9 px-3.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer text-xs"
            title="Transfere todas as peças deste orçamento para o carrinho da aba Vendas (Balcão)"
          >
            <ShoppingBag className="w-4 h-4 text-cyan-100 shrink-0" />
            <span>Gerar Venda</span>
          </button>

          {/* Gerar OS a partir do Orçamento */}
          <button
            type="button"
            onClick={handleGenerateOS}
            className="h-9 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer text-xs hover:scale-102 active:scale-98"
            title="Abre a ficha de OS preenchida com este cliente, aparelho, peças e serviços. O orçamento será marcado como APROVADO após salvar a OS."
          >
            <Sparkles className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>Gerar OS</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>

          {/* Salvar Orçamento */}
          <button
            type="button"
            disabled={isReadOnly}
            onClick={handleSave}
            className="h-9 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer text-xs"
            title={isReadOnly ? 'Orçamento APROVADO não pode ser editado. Reabra para edição.' : 'Salvar Orçamento (F2)'}
          >
            <Save className="w-4 h-4 shrink-0" />
            <span>Salvar (F2)</span>
          </button>
        </div>

        {/* Modal Aparelhos Anteriores */}
        {isClientEquipmentsOpen && (
          <div
            className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setIsClientEquipmentsOpen(false)}
          >
            <div
              className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  Aparelhos Anteriores de {clientData.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsClientEquipmentsOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {clientPreviousEquipments.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setEquipmentData({
                        type: item.type,
                        brand: item.brand,
                        model: item.model,
                        serialNumber: item.serialNumber,
                        accessories: '',
                      });
                      setIsClientEquipmentsOpen(false);
                      setIsDirty(true);
                    }}
                    className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="font-bold text-slate-800 text-xs">
                      {item.type} - {item.brand} {item.model ? `(Mod: ${item.model})` : ''}
                    </div>
                    {item.serialNumber && (
                      <div className="text-[10.5px] text-slate-500 font-mono">N/S: {item.serialNumber}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Modal de Histórico de Auditoria do Orçamento */}
        {isAuditHistoryModalOpen && (
          <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-amber-900 via-slate-800 to-amber-950 text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/20 border border-amber-400/30 rounded-xl">
                    <History className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm tracking-wide">
                      Histórico do Orçamento #{activeCode}
                    </h3>
                    <p className="text-[11px] text-amber-200/80">
                      {auditHistory.length} registro(s) de alteração encontrado(s)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAuditHistoryModalOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50">
                {auditHistory.length > 0 ? (
                  auditHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-amber-600" />
                          {item.user || 'Atendente'}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {item.date}
                        </span>
                      </div>

                      {item.changes && item.changes.length > 0 ? (
                        <ul className="space-y-1 text-xs text-slate-600 pl-1">
                          {item.changes.map((change, cIdx) => (
                            <li key={cIdx} className="flex items-start gap-2">
                              <span className="text-amber-500 font-bold">•</span>
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-600">{item.description || 'Salvamento realizado'}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400 font-semibold text-xs">
                    Nenhum registro no histórico de auditoria deste orçamento.
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAuditHistoryModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
