import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  BackHandler,
} from 'react-native';
import {
  ArrowLeft,
  Save,
  User,
  Search,
  Plus,
  Trash2,
  Package,
  Wrench,
  ChevronDown,
  X,
  PlusCircle,
  FileText,
  Printer,
  Edit3,
  CheckCircle2,
  Check,
  DollarSign,
  ShieldCheck,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { db } from '../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  saveOrderMobile,
  fetchEquipmentsMobile,
  fetchPartsMobile,
  fetchServicesMobile,
  fetchTechniciansMobile,
  fetchStatusesMobile,
  getCurrentUserMobile,
  adjustStockForStatusChange,
  fetchCompanyDataMobile,
  subscribeCompanyDataMobile,
  fetchOSPreferencesMobile,
  subscribeOSPreferencesMobile,
  DEFAULT_EQUIPMENTS_PC,
  DEFAULT_PARTS_PC,
  DEFAULT_SERVICES_PC,
  DEFAULT_STATUSES_MOBILE,
} from '../services/api';
import { CreateClientScreen } from './CreateClientScreen';

interface CreateOrderScreenProps {
  clients: any[];
  orderToEdit?: any;
  onBack: () => void;
  onSaved: () => void;
  onOpenCreateClient: () => void;
}

export const CreateOrderScreen: React.FC<CreateOrderScreenProps> = ({
  clients,
  orderToEdit,
  onBack,
  onSaved,
  onOpenCreateClient,
}) => {
  const [currentOrder, setCurrentOrder] = useState<any | null>(orderToEdit || null);
  // DATAS NO INÍCIO COM CALENDÁRIO VISUAL
  const [entryDate, setEntryDate] = useState(
    orderToEdit?.entryDate || (orderToEdit?.createdAt ? orderToEdit.createdAt.split('T')[0] : new Date().toISOString().split('T')[0])
  );
  const [exitDate, setExitDate] = useState(orderToEdit?.exitDate || '');
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Modal de busca de clientes e edição de cliente
  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);
  const [clientSearchText, setClientSearchText] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(() => {
    if (orderToEdit?.client && (orderToEdit.client.name || orderToEdit.client.id)) {
      return orderToEdit.client;
    }
    if (orderToEdit?.clientId && Array.isArray(clients)) {
      const found = clients.find((c) => String(c.id) === String(orderToEdit.clientId));
      if (found) return found;
    }
    return null;
  });
  const [clientToEditInside, setClientToEditInside] = useState<any | null>(null);
  const [isCreatingClientInside, setIsCreatingClientInside] = useState(false);

  // Equipamento (Menu dropdown inline direto)
  const [availableEquipments, setAvailableEquipments] = useState<any[]>(DEFAULT_EQUIPMENTS_PC);
  const [isEquipmentDropdownOpen, setIsEquipmentDropdownOpen] = useState(false);
  const [equipmentType, setEquipmentType] = useState(orderToEdit?.equipment?.type || '');
  const [equipmentSearch, setEquipmentSearch] = useState(orderToEdit?.equipment?.type || '');
  const [equipmentBrand, setEquipmentBrand] = useState(orderToEdit?.equipment?.brand || '');
  const [equipmentModel, setEquipmentModel] = useState(orderToEdit?.equipment?.model || '');
  const [serialNumber, setSerialNumber] = useState(orderToEdit?.equipment?.serialNumber || '');
  const [equipmentCode, setEquipmentCode] = useState(orderToEdit?.equipment?.code || '');

  // Status da OS (Menu dropdown inline direto)
  const [orderStatus, setOrderStatus] = useState(orderToEdit?.status || 'ABERTA');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [orderType, setOrderType] = useState<'ORCAMENTO' | 'AGENDAMENTO'>(orderToEdit?.type || 'ORCAMENTO');

  // Detalhes da OS
  const [problemDescription, setProblemDescription] = useState(orderToEdit?.problemDescription || '');
  const [technicalReport, setTechnicalReport] = useState(orderToEdit?.technicalReport || '');
  const [executedService, setExecutedService] = useState(
    orderToEdit?.executedService || orderToEdit?.servicePerformed || orderToEdit?.servicoExecutado || ''
  );

  // Catálogos (Peças e Serviços)
  const [availableParts, setAvailableParts] = useState<any[]>(DEFAULT_PARTS_PC);
  const [availableServices, setAvailableServices] = useState<any[]>(DEFAULT_SERVICES_PC);
  const [isPartsCatalogOpen, setIsPartsCatalogOpen] = useState(false);
  const [isServicesCatalogOpen, setIsServicesCatalogOpen] = useState(false);
  const [catalogSearchText, setCatalogSearchText] = useState('');

  // TABELA ÚNICA DE PEÇAS E SERVIÇOS
  const [itemsList, setItemsList] = useState<any[]>(() => {
    const p = (orderToEdit?.parts || orderToEdit?.partsUsed || []).map((x: any) => ({ ...x, itemType: 'PART' }));
    const s = (orderToEdit?.services || orderToEdit?.servicesExecuted || []).map((x: any) => ({ ...x, itemType: 'SERVICE' }));
    return [...p, ...s];
  });

  // Modal para inclusão avulsa (Peça ou Serviço)
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [customItemType, setCustomItemType] = useState<'PART' | 'SERVICE'>('PART');
  const [customItemCode, setCustomItemCode] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQty, setCustomItemQty] = useState('1');
  const [customItemPrice, setCustomItemPrice] = useState('');

  // Form State - Garantia da OS (Sincronizado 100% com o PC)
  const [warrantyType, setWarrantyType] = useState<'GARANTIA_LOJA' | 'GARANTIA_FABRICA' | 'NAO_SE_APLICA'>(
    orderToEdit?.warrantyType || 'NAO_SE_APLICA'
  );
  const [warrantyDays, setWarrantyDays] = useState(orderToEdit?.warrantyDays || orderToEdit?.warrantyTermsData?.periodDays || '90');
  
  // Dados Completos de Nota Fiscal / Garantia de Fábrica (100% igual ao PC)
  const [purchaseDate, setPurchaseDate] = useState(orderToEdit?.purchaseDate || orderToEdit?.nfData?.purchaseDate || '');
  const [nfNumber, setNfNumber] = useState(orderToEdit?.nfNumber || orderToEdit?.nfData?.nfNumber || '');
  const [nfValue, setNfValue] = useState(orderToEdit?.nfData?.nfValue || '');
  const [guarantor, setGuarantor] = useState(orderToEdit?.nfData?.guarantor || 'NAO_SE_APLICA');
  const [authorizedCode, setAuthorizedCode] = useState(orderToEdit?.nfData?.authorizedCode || '');
  const [retailerName, setRetailerName] = useState(orderToEdit?.nfData?.retailerName || '');
  const [cnpj, setCnpj] = useState(orderToEdit?.nfData?.cnpj || '');
  const [additionalNotes, setAdditionalNotes] = useState(orderToEdit?.nfData?.additionalNotes || '');

  const [warrantyTerms, setWarrantyTerms] = useState(
    orderToEdit?.warrantyTerms ||
    orderToEdit?.warrantyTermsData?.termsText ||
    'A garantia cobre defeitos de fabricação das peças substituídas e serviços executados pelo período especificado. Não cobre danos causados por mau uso, oscilações na rede elétrica, umidade ou intervenções de terceiros.'
  );

  // Modal de Finalização de OS
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  // Técnico Responsável (Para Admin poder selecionar qualquer técnico)
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [techniciansList, setTechniciansList] = useState<any[]>([]);
  const [selectedTechnicianName, setSelectedTechnicianName] = useState(() => {
    if (!orderToEdit) return '';
    return orderToEdit.technician || orderToEdit.technicianName || '';
  });
  const [selectedAttendantName, setSelectedAttendantName] = useState(() => {
    if (!orderToEdit) return '';
    return orderToEdit.attendantName || orderToEdit.attendant || '';
  });
  const [isTechDropdownOpen, setIsTechDropdownOpen] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState(orderToEdit?.paymentMethod || 'PIX');
  const [isSplitPayment, setIsSplitPayment] = useState(Boolean(orderToEdit?.secondaryPaymentMethod));
  const [secondaryPaymentMethod, setSecondaryPaymentMethod] = useState(orderToEdit?.secondaryPaymentMethod || 'DINHEIRO');
  const [secondaryAmount, setSecondaryAmount] = useState(orderToEdit?.secondaryPaymentAmount || '');
  const [cardInstallments, setCardInstallments] = useState(orderToEdit?.cardInstallments || '1');

  const [submitting, setSubmitting] = useState(false);

  // Snapshot do formulário para rastrear alterações reais não salvas (isDirty)
  const getFormSnapshot = () => {
    return JSON.stringify({
      clientId: selectedClient?.id || '',
      equipmentType,
      equipmentBrand,
      equipmentModel,
      serialNumber,
      equipmentCode,
      orderStatus,
      orderType,
      entryDate,
      exitDate,
      problemDescription,
      technicalReport,
      executedService,
      itemsList,
      warrantyType,
      warrantyDays,
      purchaseDate,
      nfNumber,
      nfValue,
      guarantor,
      authorizedCode,
      retailerName,
      cnpj,
      additionalNotes,
      warrantyTerms,
      selectedTechnicianName,
      paymentMethod,
      secondaryPaymentMethod: isSplitPayment ? secondaryPaymentMethod : '',
      secondaryAmount: isSplitPayment ? secondaryAmount : '',
      cardInstallments,
    });
  };

  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>(() => {
    if (orderToEdit) {
      return JSON.stringify({
        clientId: orderToEdit.client?.id || orderToEdit.clientId || '',
        equipmentType: orderToEdit.equipment?.type || '',
        equipmentBrand: orderToEdit.equipment?.brand || '',
        equipmentModel: orderToEdit.equipment?.model || '',
        serialNumber: orderToEdit.equipment?.serialNumber || '',
        equipmentCode: orderToEdit.equipment?.code || '',
        orderStatus: orderToEdit.status || 'ABERTA',
        orderType: orderToEdit.type || 'ORCAMENTO',
        entryDate: orderToEdit.entryDate || (orderToEdit.createdAt ? orderToEdit.createdAt.split('T')[0] : ''),
        exitDate: orderToEdit.exitDate || '',
        problemDescription: orderToEdit.problemDescription || '',
        technicalReport: orderToEdit.technicalReport || '',
        executedService: orderToEdit.executedService || '',
        itemsList: [
          ...(orderToEdit.parts || orderToEdit.partsUsed || []).map((x: any) => ({ ...x, itemType: 'PART' })),
          ...(orderToEdit.services || orderToEdit.servicesExecuted || []).map((x: any) => ({ ...x, itemType: 'SERVICE' })),
        ],
        warrantyType: orderToEdit.warrantyType || 'NAO_SE_APLICA',
        warrantyDays: orderToEdit.warrantyDays || orderToEdit.warrantyTermsData?.periodDays || '90',
        purchaseDate: orderToEdit.purchaseDate || orderToEdit.nfData?.purchaseDate || '',
        nfNumber: orderToEdit.nfNumber || orderToEdit.nfData?.nfNumber || '',
        nfValue: orderToEdit.nfData?.nfValue || '',
        guarantor: orderToEdit.nfData?.guarantor || 'NAO_SE_APLICA',
        authorizedCode: orderToEdit.nfData?.authorizedCode || '',
        retailerName: orderToEdit.nfData?.retailerName || '',
        cnpj: orderToEdit.nfData?.cnpj || '',
        additionalNotes: orderToEdit.nfData?.additionalNotes || '',
        warrantyTerms: orderToEdit.warrantyTerms || orderToEdit.warrantyTermsData?.termsText || 'A garantia cobre defeitos de fabricação das peças substituídas e serviços executados pelo período especificado. Não cobre danos causados por mau uso, oscilações na rede elétrica, umidade ou intervenções de terceiros.',
        selectedTechnicianName: orderToEdit.technician || orderToEdit.technicianName || '',
        paymentMethod: orderToEdit.paymentMethod || 'PIX',
        secondaryPaymentMethod: orderToEdit.secondaryPaymentMethod || '',
        secondaryAmount: orderToEdit.secondaryPaymentAmount || '',
        cardInstallments: orderToEdit.cardInstallments || '1',
      });
    }
    // Para nova OS vazia
    return JSON.stringify({
      clientId: '',
      equipmentType: '',
      equipmentBrand: '',
      equipmentModel: '',
      serialNumber: '',
      equipmentCode: '',
      orderStatus: 'ABERTA',
      orderType: 'ORCAMENTO',
      entryDate: new Date().toISOString().split('T')[0],
      exitDate: '',
      problemDescription: '',
      technicalReport: '',
      executedService: '',
      itemsList: [],
      warrantyType: 'NAO_SE_APLICA',
      warrantyDays: '90',
      purchaseDate: '',
      nfNumber: '',
      nfValue: '',
      guarantor: 'NAO_SE_APLICA',
      authorizedCode: '',
      retailerName: '',
      cnpj: '',
      additionalNotes: '',
      warrantyTerms: 'A garantia cobre defeitos de fabricação das peças substituídas e serviços executados pelo período especificado. Não cobre danos causados por mau uso, oscilações na rede elétrica, umidade ou intervenções de terceiros.',
      selectedTechnicianName: '',
      paymentMethod: 'PIX',
      secondaryPaymentMethod: '',
      secondaryAmount: '',
      cardInstallments: '1',
    });
  });

  const loadCatalogs = async () => {
    const [eqs, prts, srvs, user, techs, sts] = await Promise.all([
      fetchEquipmentsMobile(),
      fetchPartsMobile(),
      fetchServicesMobile(),
      getCurrentUserMobile(),
      fetchTechniciansMobile(),
      fetchStatusesMobile(),
    ]);
    setAvailableEquipments(eqs);
    setAvailableParts(prts);
    setAvailableServices(srvs);
    setCurrentUser(user);
    setTechniciansList(techs);
    if (sts && sts.length > 0) {
      setAvailableStatuses(sts);
    }
  };

  const [osPreferences, setOsPreferences] = useState<any>({
    entryReceiptTemplate: 'DEFAULT_2VIAS',
    exitReceiptTemplate: 'MODERN_DETAILED',
  });
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    loadCatalogs();

    fetchOSPreferencesMobile().then((p) => {
      if (p) setOsPreferences(p);
    });
    const unsubPrefs = subscribeOSPreferencesMobile((p) => {
      if (p) setOsPreferences(p);
    });

    fetchCompanyDataMobile().then((c) => {
      if (c) setCompanyInfo(c);
    });
    const unsubCompany = subscribeCompanyDataMobile((c) => {
      if (c) setCompanyInfo(c);
    });

    const unsubParts = onSnapshot(collection(db, 'parts'), (snap) => {
      if (!snap.empty) {
        const pList = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setAvailableParts(pList);
      }
    });

    const unsubServices = onSnapshot(collection(db, 'services'), (snap) => {
      if (!snap.empty) {
        const sList = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setAvailableServices(sList);
      }
    });

    const unsubEquipments = onSnapshot(collection(db, 'equipments'), (snap) => {
      const eList = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setAvailableEquipments(eList);
    });

    const unsubStatuses = onSnapshot(collection(db, 'os_statuses'), (snap) => {
      if (!snap.empty) {
        const stList = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setAvailableStatuses(stList);
      }
    });

    return () => {
      unsubPrefs();
      unsubCompany();
      unsubParts();
      unsubServices();
      unsubEquipments();
      unsubStatuses();
    };
  }, []);

  const filteredClients = clients.filter((c) => {
    if (!clientSearchText.trim()) return true;
    const term = clientSearchText.toLowerCase().trim();
    const digitsSearch = term.replace(/\D/g, '');
    const phoneDigits = (c.phone || '').replace(/\D/g, '');
    const whatsappDigits = (c.whatsapp || '').replace(/\D/g, '');
    const cpfCnpjDigits = (c.cpfCnpj || c.cpf || c.cnpj || '').replace(/\D/g, '');
    const codeDigits = (c.code || '').replace(/\D/g, '');

    const matchesDigits = digitsSearch.length >= 1 && (
      phoneDigits.includes(digitsSearch) ||
      whatsappDigits.includes(digitsSearch) ||
      cpfCnpjDigits.includes(digitsSearch) ||
      codeDigits.includes(digitsSearch)
    );

    return (
      matchesDigits ||
      (c.name || '').toLowerCase().includes(term) ||
      (c.phone || '').includes(term) ||
      (c.whatsapp || '').includes(term) ||
      (c.address || '').toLowerCase().includes(term) ||
      (c.neighborhood || '').toLowerCase().includes(term) ||
      (c.city || '').toLowerCase().includes(term)
    );
  });

  const calculateTotal = () => {
    return itemsList.reduce((acc, item) => {
      const price = parseFloat(String(item.price || item.finalPrice || '0').replace(',', '.')) || 0;
      const qty = Number(item.qty || item.quantity || 1);
      return acc + price * qty;
    }, 0);
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) return;
    const priceNum = parseFloat(customItemPrice.replace(',', '.')) || 0;
    const qtyNum = parseInt(customItemQty, 10) || 1;
    const trimmedName = customItemName.trim();
    const itemCode = customItemCode.trim() || (customItemType === 'PART' ? '0001' : '');

    setItemsList((prev) => {
      const existingIndex = prev.findIndex(
        (x) =>
          x.itemType === customItemType &&
          x.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        const currentQty = Number(updated[existingIndex].qty || updated[existingIndex].quantity || 1);
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: currentQty + (customItemType === 'PART' ? qtyNum : 1),
          price: priceNum > 0 ? priceNum : updated[existingIndex].price,
        };
        return updated;
      }

      return [
        ...prev,
        {
          code: itemCode,
          name: trimmedName,
          qty: customItemType === 'PART' ? qtyNum : 1,
          price: priceNum,
          itemType: customItemType,
        },
      ];
    });

    setCustomItemCode('');
    setCustomItemName('');
    setCustomItemQty('1');
    setCustomItemPrice('');
    setIsCustomItemModalOpen(false);
  };

  const handleAddItemFromCatalog = (item: any, type: 'PART' | 'SERVICE') => {
    const priceNum = parseFloat(String(item.finalPrice || item.price || '0').replace(',', '.')) || 0;
    
    setItemsList((prev) => {
      const existingIndex = prev.findIndex(
        (x) =>
          x.itemType === type &&
          ((x.id && item.id && String(x.id) === String(item.id)) ||
            (x.code && item.code && String(x.code) === String(item.code)) ||
            (x.name && item.name && x.name.trim().toLowerCase() === item.name.trim().toLowerCase()))
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        const currentQty = Number(updated[existingIndex].qty || updated[existingIndex].quantity || 1);
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: currentQty + 1,
          price: priceNum > 0 ? priceNum : updated[existingIndex].price,
        };
        return updated;
      }

      return [
        ...prev,
        {
          id: item.id,
          code: item.code || '',
          name: item.name,
          price: priceNum,
          qty: 1,
          itemType: type,
          stockQuantity: item.stockQuantity,
        },
      ];
    });

    setIsPartsCatalogOpen(false);
    setIsServicesCatalogOpen(false);
  };

  const executeSaveOrder = async (extraPayload: any = {}, silent = false) => {
    if (!selectedClient) {
      Alert.alert('Atenção', 'Selecione um cliente para a Ordem de Serviço.');
      return null;
    }
    if (!equipmentType.trim()) {
      Alert.alert('Atenção', 'Informe o tipo do equipamento.');
      return null;
    }

    setSubmitting(true);
    try {
      const partsOnly = itemsList.filter((x) => x.itemType === 'PART');
      const servicesOnly = itemsList.filter((x) => x.itemType === 'SERVICE');
      const grandTotal = calculateTotal();
      const currentFinalStatus = extraPayload.status || orderStatus;
      const techName = selectedTechnicianName ? selectedTechnicianName.trim() : '';

      // Ajusta estoque com base nas peças e no novo status da OS
      const previousStatus = currentOrder?.status || orderToEdit?.status || '';
      const previousSnapshot = currentOrder?.partsReservedSnapshot || orderToEdit?.partsReservedSnapshot || [];
      const { newSnapshot, insufficient } = await adjustStockForStatusChange(
        partsOnly,
        previousSnapshot,
        currentFinalStatus,
        previousStatus,
      );

      const activeId = currentOrder?.id || orderToEdit?.id;
      const activeCode = currentOrder?.code || orderToEdit?.code;

      const saved = await saveOrderMobile({
        id: activeId,
        code: activeCode,
        clientId: selectedClient.id,
        client: selectedClient,
        technician: techName,
        technicianName: techName,
        equipment: {
          type: equipmentType,
          brand: equipmentBrand,
          model: equipmentModel,
          serialNumber: serialNumber,
          code: equipmentCode,
        },
        entryDate,
        exitDate: extraPayload.exitDate || exitDate,
        problemDescription,
        technicalReport,
        executedService,
        servicePerformed: executedService,
        servicoExecutado: executedService,
        parts: partsOnly,
        partsUsed: partsOnly,
        partsReservedSnapshot: newSnapshot,
        services: servicesOnly,
        servicesExecuted: servicesOnly,
        type: orderType,
        status: currentFinalStatus,
        paymentMethod: extraPayload.paymentMethod || paymentMethod,
        secondaryPaymentMethod: extraPayload.secondaryPaymentMethod || secondaryPaymentMethod,
        secondaryPaymentAmount: extraPayload.secondaryAmount || secondaryAmount,
        cardInstallments: extraPayload.cardInstallments || cardInstallments,
        warrantyType: extraPayload.warrantyType || warrantyType,
        warrantyDays: extraPayload.warrantyDays || warrantyDays,
        warrantyTerms: extraPayload.warrantyTerms || warrantyTerms,
        purchaseDate: purchaseDate,
        nfData: {
          purchaseDate,
          nfNumber,
          nfValue,
          guarantor,
          authorizedCode,
          retailerName,
          cnpj,
          additionalNotes,
        },
        warrantyTermsData: {
          periodDays: extraPayload.warrantyDays || warrantyDays,
          startDate: extraPayload.exitDate || exitDate || entryDate,
          termsText: extraPayload.warrantyTerms || warrantyTerms,
          printTerms: true,
        },
        totalAmount: grandTotal,
      });

      if (saved) {
        setCurrentOrder(saved);
        setLastSavedSnapshot(getFormSnapshot());
      }

      // Avisa sobre estoque insuficiente
      if (insufficient.length > 0) {
        Alert.alert(
          '⚠️ Estoque Insuficiente',
          `As seguintes peças foram reservadas com estoque zerado ou negativo:\n\n${insufficient.map((p) => `• ${p}`).join('\n')}\n\nRealze a compra ou ajuste o estoque o quanto antes.`,
          [{ text: 'Entendido', style: 'default' }]
        );
      }

      if (!silent) {
        Alert.alert('Sucesso', (activeCode || saved?.code) ? `OS ${saved?.code || activeCode} salva com sucesso!` : 'Ordem de Serviço salva com sucesso!');
        onSaved?.(); // Atualiza listas em background sem forçar saída da tela
      }
      return saved;
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível salvar a OS.');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // GERADOR DO COMPROVANTE EXATO IDÊNTICO AO PC COM 2 VIAS OU SAÍDA
  const handleGenerateReceipt = async (receiptType: 'ENTRADA' | 'SAIDA', finalizedOrderData?: any) => {
    let orderToUse = finalizedOrderData;
    if (!orderToUse) {
      orderToUse = await executeSaveOrder({}, true);
    }
    if (!orderToUse) return;

    try {
      const isEntrada = receiptType === 'ENTRADA';
      const grandTotal = calculateTotal();
      const todayFormatted = new Date().toLocaleDateString('pt-BR');
      const printTimeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const compName = companyInfo?.tradingName || companyInfo?.name || 'Vollen Assistência Técnica';
      const compSlogan = companyInfo?.slogan || 'Assistência Técnica Especializada em Eletrodomésticos';
      const compLogo = companyInfo?.logoUrl ? `<img src="${companyInfo.logoUrl}" alt="Logo" style="max-height: 48px; max-width: 90px; object-fit: contain;" />` : '';
      const compCnpj = companyInfo?.cnpj ? `CNPJ: ${companyInfo.cnpj}` : '';
      const compPhone = companyInfo?.phone || companyInfo?.whatsapp ? `Tel: ${companyInfo?.phone || companyInfo?.whatsapp}` : '';
      const compAddress = companyInfo?.address ? `${companyInfo.address}, ${companyInfo.number || 'S/N'} - ${companyInfo.neighborhood || ''} • ${companyInfo.city || ''}/${companyInfo.state || ''}` : '';

      const entryTemplate = osPreferences?.entryReceiptTemplate || 'DEFAULT_2VIAS';
      const exitTemplate = osPreferences?.exitReceiptTemplate || 'MODERN_DETAILED';

      let htmlContent = '';

      if (isEntrada) {
        if (entryTemplate === 'THERMAL_80MM') {
          htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Comprovante de Entrada - ${orderToUse.code}</title>
              <style>
                @page { size: 80mm auto; margin: 2mm; }
                body { font-family: monospace; font-size: 11px; color: #000; margin: 0; padding: 4px; }
                .center { text-align: center; }
                .border-bottom { border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
                .sig { border-top: 1px solid #000; margin-top: 25px; text-align: center; padding-top: 4px; }
              </style>
            </head>
            <body>
              <div class="center border-bottom">
                ${compLogo}
                <div style="font-size: 14px; font-weight: bold; text-transform: uppercase;">${compName}</div>
                <div style="font-size: 9px;">${compCnpj} | ${compPhone}</div>
                <div style="font-size: 8px;">${compAddress}</div>
                <div style="margin-top: 6px; font-weight: bold; font-size: 13px; border: 1px solid #000; padding: 2px 4px; display: inline-block;">
                  COMPROVANTE DE ENTRADA #${orderToUse.code}
                </div>
              </div>

              <div class="border-bottom">
                <p><strong>Entrada:</strong> ${orderToUse.entryDate || todayFormatted} ${printTimeStr}</p>
                <p><strong>Cliente:</strong> ${selectedClient.name?.toUpperCase()}</p>
                <p><strong>Fone:</strong> ${selectedClient.phone || selectedClient.whatsapp || '-'}</p>
                <p><strong>Equipamento:</strong> ${equipmentType} ${equipmentBrand || ''} ${equipmentModel || ''}</p>
                <p><strong>Nº Série:</strong> ${serialNumber || 'N/A'}</p>
                <p><strong>Acessórios:</strong> ${equipmentCode || 'Nenhum'}</p>
              </div>

              <div class="border-bottom">
                <p><strong>Defeito Relatado:</strong></p>
                <p>${problemDescription || 'Nenhum defeito relatado.'}</p>
              </div>

              <div style="font-size: 8px; margin-top: 6px;">
                * Apresente este comprovante para retirada do equipamento. Prazo legal de guarda: 90 dias.
              </div>

              <div class="sig">
                Assinatura do Cliente
              </div>
            </body>
            </html>
          `;
        } else {
          // Padrão 2 Vias Compacto e Elegante
          htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Comprovante de Entrada - ${orderToUse.code}</title>
              <style>
                @page { size: A4; margin: 8mm; }
                body { font-family: Arial, sans-serif; font-size: 10px; color: #0f172a; margin: 0; padding: 0; }
                .via-box { border: 1.5px solid #334155; border-radius: 8px; padding: 10px; margin-bottom: 8px; background: #ffffff; }
                .header { display: flex; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 6px; }
                .company-name { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #0f172a; }
                .os-badge { font-size: 13px; font-weight: bold; font-family: monospace; color: #0369a1; text-align: right; }
                .badge-tag { display: inline-block; background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; padding: 1px 6px; border-radius: 4px; font-size: 8px; font-weight: bold; text-transform: uppercase; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px; }
                .sub-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; line-height: 1.35; }
                .sub-title { font-size: 8.5px; font-weight: bold; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; margin-bottom: 4px; padding-bottom: 2px; }
                .cut-line { border-bottom: 1.5px dashed #94a3b8; text-align: center; margin: 8px 0; position: relative; height: 8px; }
                .cut-text { background: #fff; padding: 0 8px; font-size: 8px; color: #94a3b8; font-weight: bold; position: relative; top: -6px; }
                .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: center; margin-top: 8px; padding-top: 6px; font-size: 8px; }
                .sig-line { border-top: 1px solid #64748b; margin-bottom: 2px; }
              </style>
            </head>
            <body>
              <!-- VIA 1: VIA DA EMPRESA -->
              <div class="via-box">
                <div class="header">
                  <div style="display: flex; gap: 8px; align-items: center;">
                    ${compLogo}
                    <div>
                      <span class="badge-tag">VIA DA EMPRESA</span>
                      <div class="company-name">${compName}</div>
                      <div style="font-size: 8px; color: #64748b;">${compSlogan} • ${compCnpj} • ${compPhone}</div>
                    </div>
                  </div>
                  <div class="os-badge">
                    OS #${orderToUse.code}
                    <div style="font-size: 8px; color: #64748b; font-weight: normal;">Entrada: ${orderToUse.entryDate || todayFormatted} | ${printTimeStr}</div>
                  </div>
                </div>

                <div class="grid">
                  <div class="sub-box">
                    <div class="sub-title">Dados do Cliente</div>
                    <div><strong>Nome:</strong> ${selectedClient.name?.toUpperCase()}</div>
                    <div><strong>Telefone:</strong> ${selectedClient.phone || selectedClient.whatsapp || '-'}</div>
                    <div><strong>Endereço:</strong> ${selectedClient.address || ''}, ${selectedClient.number || 'S/N'} - ${selectedClient.neighborhood || ''}</div>
                    <div><strong>Cidade/UF:</strong> ${selectedClient.city || ''}</div>
                  </div>
                  <div class="sub-box">
                    <div class="sub-title">Dados do Equipamento</div>
                    <div><strong>Tipo/Aparelho:</strong> ${equipmentType} ${equipmentBrand || ''}</div>
                    ${equipmentModel ? `<div><strong>Modelo:</strong> ${equipmentModel}</div>` : ''}
                    <div><strong>Nº de Série:</strong> ${serialNumber || '-'}</div>
                    <div><strong>Modalidade:</strong> ${warrantyType === 'GARANTIA_LOJA' ? 'Garantia da Loja' : warrantyType === 'GARANTIA_FABRICA' ? 'Garantia de Fábrica' : 'Sem Garantia'}</div>
                  </div>
                </div>

                <div class="grid" style="margin-bottom: 6px;">
                  <div class="sub-box" style="background: #f0f9ff; border-color: #bae6fd;">
                    <div class="sub-title" style="color: #0369a1; border-bottom-color: #e0f2fe;">Atendente Responsável</div>
                    <div><strong>Nome:</strong> ${selectedAttendantName || orderToUse.attendant || 'Não informado'}</div>
                  </div>
                  <div class="sub-box" style="background: #eef2ff; border-color: #c7d2fe;">
                    <div class="sub-title" style="color: #4338ca; border-bottom-color: #e0e7ff;">Técnico Responsável</div>
                    <div><strong>Nome:</strong> ${orderToUse.technician || selectedTechnicianName || 'Não informado'}</div>
                  </div>
                </div>

                ${orderToUse.guarantor === 'FABRICANTE' ? `
                <div class="sub-box" style="margin-bottom: 6px; background: #fffbeb; border-color: #fde68a;">
                  <div class="sub-title" style="color: #92400e; border-bottom-color: #fef3c7;">📄 Dados da Nota Fiscal (Garantia do Fabricante)</div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 8.5px;">
                    <div><strong>Nº NF:</strong> ${orderToUse.nfNumber || '-'}</div>
                    <div><strong>Data de Compra:</strong> ${orderToUse.purchaseDate || '-'}</div>
                  </div>
                  <div style="font-size: 8.5px; margin-top: 2px;">
                    <strong>Revenda:</strong> ${orderToUse.retailerName || '-'} | <strong>CNPJ:</strong> ${orderToUse.cnpj || '-'}
                  </div>
                </div>
                ` : ''}

                <div class="sub-box" style="margin-bottom: 6px;">
                  <div style="margin-bottom: 4px;">
                    <strong>Defeito / Problema Relatado:</strong>
                    <div style="min-height: 3.2em; padding-top: 2px;">${problemDescription || ''}</div>
                  </div>
                  <div style="margin-bottom: 4px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
                    <strong>Laudo Técnico:</strong>
                    <div style="min-height: 3.2em; padding-top: 2px;">${technicalReport || ''}</div>
                  </div>
                  <div style="margin-bottom: 4px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
                    <strong>Observações do Equipamento:</strong>
                    <div style="min-height: 3.2em; padding-top: 2px;">${equipmentCode || ''}</div>
                  </div>
                  <div style="font-size: 7.5px; color: #64748b; margin-top: 4px; border-top: 1px solid #f1f5f9; padding-top: 2px;">
                    * O cliente autoriza a avaliação técnica no equipamento. Equipamentos não retirados em até 90 dias após notificação estarão sujeitos a taxa de guarda conforme a lei.
                  </div>
                </div>

                <div class="sigs">
                  <div><div class="sig-line"></div>Assinatura da Empresa</div>
                  <div><div class="sig-line"></div>Assinatura do Cliente</div>
                </div>
              </div>

              <div class="cut-line"><span class="cut-text">✂ CORTE AQUI ✂</span></div>

              <!-- VIA 2: VIA DO CLIENTE -->
              <div class="via-box">
                <div class="header">
                  <div style="display: flex; gap: 8px; align-items: center;">
                    ${compLogo}
                    <div>
                      <span class="badge-tag" style="background: #dcfce7; color: #15803d; border-color: #86efac;">VIA DO CLIENTE</span>
                      <div class="company-name">${compName}</div>
                      <div style="font-size: 8px; color: #64748b;">${compSlogan} • ${compCnpj} • ${compPhone}</div>
                    </div>
                  </div>
                  <div class="os-badge">
                    OS #${orderToUse.code}
                    <div style="font-size: 8px; color: #64748b; font-weight: normal;">Entrada: ${orderToUse.entryDate || todayFormatted} | ${printTimeStr}</div>
                  </div>
                </div>

                <div class="grid">
                  <div class="sub-box">
                    <div class="sub-title">Dados do Cliente</div>
                    <div><strong>Nome:</strong> ${selectedClient.name?.toUpperCase()}</div>
                    <div><strong>Telefone:</strong> ${selectedClient.phone || selectedClient.whatsapp || '-'}</div>
                    <div><strong>Endereço:</strong> ${selectedClient.address || ''}, ${selectedClient.number || 'S/N'} - ${selectedClient.neighborhood || ''}</div>
                    <div><strong>Cidade/UF:</strong> ${selectedClient.city || ''}</div>
                  </div>
                  <div class="sub-box">
                    <div class="sub-title">Dados do Equipamento</div>
                    <div><strong>Tipo/Aparelho:</strong> ${equipmentType} ${equipmentBrand || ''}</div>
                    ${equipmentModel ? `<div><strong>Modelo:</strong> ${equipmentModel}</div>` : ''}
                    <div><strong>Nº de Série:</strong> ${serialNumber || '-'}</div>
                    <div><strong>Modalidade:</strong> ${warrantyType === 'GARANTIA_LOJA' ? 'Garantia da Loja' : warrantyType === 'GARANTIA_FABRICA' ? 'Garantia de Fábrica' : 'Sem Garantia'}</div>
                  </div>
                </div>

                ${orderToUse.guarantor === 'FABRICANTE' ? `
                <div class="sub-box" style="margin-bottom: 6px; background: #fffbeb; border-color: #fde68a;">
                  <div class="sub-title" style="color: #92400e; border-bottom-color: #fef3c7;">📄 Dados da Nota Fiscal (Garantia do Fabricante)</div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 8.5px;">
                    <div><strong>Nº NF:</strong> ${orderToUse.nfNumber || '-'}</div>
                    <div><strong>Data de Compra:</strong> ${orderToUse.purchaseDate || '-'}</div>
                  </div>
                  <div style="font-size: 8.5px; margin-top: 2px;">
                    <strong>Revenda:</strong> ${orderToUse.retailerName || '-'} | <strong>CNPJ:</strong> ${orderToUse.cnpj || '-'}
                  </div>
                </div>
                ` : ''}

                <div class="sub-box" style="margin-bottom: 6px;">
                  <div style="margin-bottom: 4px;">
                    <strong>Defeito / Problema Relatado:</strong>
                    <div style="min-height: 3.2em; padding-top: 2px;">${problemDescription || ''}</div>
                  </div>
                  <div style="margin-bottom: 4px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
                    <strong>Laudo Técnico:</strong>
                    <div style="min-height: 3.2em; padding-top: 2px;">${technicalReport || ''}</div>
                  </div>
                  <div style="margin-bottom: 4px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
                    <strong>Observações do Equipamento:</strong>
                    <div style="min-height: 3.2em; padding-top: 2px;">${equipmentCode || ''}</div>
                  </div>
                  <div style="font-size: 7.5px; color: #64748b; margin-top: 4px; border-top: 1px solid #f1f5f9; padding-top: 2px;">
                    * Guarde este comprovante para a retirada do equipamento ou acompanhamento do serviço.
                  </div>
                </div>

                <div class="sigs">
                  <div><div class="sig-line"></div>Assinatura da Empresa</div>
                  <div><div class="sig-line"></div>Assinatura do Cliente</div>
                </div>
              </div>
            </body>
            </html>
          `;
        }
      } else {
        // Comprovante de Saída
        if (exitTemplate === 'THERMAL_80MM') {
          htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Comprovante de Saída - ${orderToUse.code}</title>
              <style>
                @page { size: 80mm auto; margin: 2mm; }
                body { font-family: monospace; font-size: 11px; color: #000; margin: 0; padding: 4px; }
                .center { text-align: center; }
                .border-bottom { border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
                .sig { border-top: 1px solid #000; margin-top: 25px; text-align: center; padding-top: 4px; }
              </style>
            </head>
            <body>
              <div class="center border-bottom">
                ${compLogo}
                <div style="font-size: 14px; font-weight: bold; text-transform: uppercase;">${compName}</div>
                <div style="font-size: 9px;">${compCnpj} | ${compPhone}</div>
                <div style="margin-top: 6px; font-weight: bold; font-size: 13px; border: 1px solid #000; padding: 2px 4px; display: inline-block;">
                  COMPROVANTE DE SAÍDA #${orderToUse.code}
                </div>
              </div>

              <div class="border-bottom">
                <p><strong>Saída / Entrega:</strong> ${orderToUse.exitDate || todayFormatted} ${printTimeStr}</p>
                <p><strong>Cliente:</strong> ${selectedClient.name?.toUpperCase()}</p>
                <p><strong>Aparelho:</strong> ${equipmentType} ${equipmentBrand || ''} ${equipmentModel || ''}</p>
                <p><strong>Nº Série:</strong> ${serialNumber || 'N/A'}</p>
                <p><strong>Técnico:</strong> ${orderToUse.technician || selectedTechnicianName || 'Técnico Responsável'}</p>
              </div>

              <div class="border-bottom">
                <p><strong>Serviço Executado:</strong></p>
                <p>${executedService || 'Manutenção técnica executada.'}</p>
              </div>

              <div class="border-bottom" style="font-weight: bold; font-size: 13px; display: flex; justify-content: space-between;">
                <span>TOTAL PAGO:</span>
                <span>R$ ${grandTotal.toFixed(2)}</span>
              </div>

              <div class="border-bottom">
                <p><strong>Garantia:</strong> ${orderToUse.warrantyDays || warrantyDays} Dias</p>
                <p style="font-size: 8.5px;">${orderToUse.warrantyTerms || warrantyTerms}</p>
              </div>

              <div class="sig">
                Responsável Técnico / Empresa
              </div>
            </body>
            </html>
          `;
        } else {
          // Moderno Detalhado / Padrão Oficial com Termos de Garantia
          htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Comprovante de Saída - ${orderToUse.code}</title>
              <style>
                @page { size: A4; margin: 10mm; }
                body { font-family: Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 0; line-height: 1.4; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; }
                .company-name { font-size: 16px; font-weight: bold; text-transform: uppercase; color: #0f172a; }
                .os-card { border: 2px solid #0f172a; border-radius: 8px; padding: 6px 12px; text-align: right; background: #f8fafc; }
                .os-num { font-size: 16px; font-weight: bold; font-family: monospace; }
                .status-tag { display: inline-block; background: #dcfce7; color: #166534; font-weight: bold; font-size: 9px; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
                .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; background: #ffffff; }
                .box-title { font-size: 9.5px; font-weight: bold; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; margin-bottom: 5px; padding-bottom: 2px; }
                table { width: 100%; border-collapse: collapse; margin-top: 4px; }
                th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; font-size: 10px; }
                th { background: #f1f5f9; text-transform: uppercase; font-size: 9px; }
                .total-box { display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #0f172a; margin-top: 8px; padding-top: 6px; font-size: 13px; font-weight: bold; }
                .total-val { font-size: 16px; font-family: monospace; color: #15803d; }
                .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; text-align: center; margin-top: 25px; padding-top: 8px; }
                .sig-line { border-top: 1px solid #334155; margin-bottom: 3px; }
              </style>
            </head>
            <body>
              <div class="header">
                <div style="display: flex; gap: 10px; align-items: center;">
                  ${compLogo}
                  <div>
                    <div class="company-name">${compName}</div>
                    <div style="font-size: 9.5px; color: #475569;">${compSlogan}</div>
                    <div style="font-size: 9px; color: #64748b;">${compCnpj} • ${compPhone}</div>
                  </div>
                </div>
                <div class="os-card">
                  <div style="font-size: 8.5px; font-weight: bold; color: #64748b;">COMPROVANTE DE SAÍDA</div>
                  <div class="os-num">OS #${orderToUse.code}</div>
                  <span class="status-tag">FINALIZADA / ENTREGUE</span>
                  <div style="font-size: 8px; color: #64748b; margin-top: 2px;">Saída: ${orderToUse.exitDate || todayFormatted} ${printTimeStr}</div>
                </div>
              </div>

              <div class="grid">
                <div class="box">
                  <div class="box-title">Dados do Cliente</div>
                  <div><strong>Nome:</strong> ${selectedClient.name?.toUpperCase()}</div>
                  <div><strong>Telefone:</strong> ${selectedClient.phone || selectedClient.whatsapp || '-'}</div>
                  <div><strong>Endereço:</strong> ${selectedClient.address || ''}, ${selectedClient.number || 'S/N'} - ${selectedClient.neighborhood || ''}</div>
                  <div><strong>Cidade/UF:</strong> ${selectedClient.city || ''}</div>
                </div>

                <div class="box">
                  <div class="box-title">Dados do Equipamento</div>
                  <div><strong>Tipo/Aparelho:</strong> ${equipmentType} ${equipmentBrand || ''}</div>
                  ${equipmentModel ? `<div><strong>Modelo:</strong> ${equipmentModel}</div>` : ''}
                  <div><strong>Nº de Série:</strong> ${serialNumber || '-'}</div>
                  <div><strong>Modalidade:</strong> ${warrantyType === 'GARANTIA_LOJA' ? 'Garantia da Empresa' : warrantyType === 'GARANTIA_FABRICA' ? 'Garantia de Fábrica' : 'Sem Garantia'}</div>
                </div>
              </div>

              <div class="grid" style="margin-bottom: 8px;">
                <div class="box" style="background: #f0f9ff; border-color: #bae6fd;">
                  <div class="box-title" style="color: #0369a1; border-bottom-color: #e0f2fe;">Atendente Responsável</div>
                  <div><strong>Nome:</strong> ${selectedAttendantName || orderToUse.attendant || 'Não informado'}</div>
                </div>
                <div class="box" style="background: #eef2ff; border-color: #c7d2fe;">
                  <div class="box-title" style="color: #4338ca; border-bottom-color: #e0e7ff;">Técnico Responsável</div>
                  <div><strong>Nome:</strong> ${orderToUse.technician || selectedTechnicianName || 'Não informado'}</div>
                </div>
              </div>

              <div class="box" style="margin-bottom: 8px;">
                <div class="box-title">Relatório Técnico e Serviços Realizados</div>
                <div style="margin-bottom: 4px;">
                  <span style="font-size: 8.5px; font-weight: bold; text-transform: uppercase; color: #475569; display: block; border-bottom: 1px solid #e2e8f0; margin-bottom: 2px;">Defeito Reclamado:</span>
                  <div style="min-height: 3.2em; max-height: 3.8em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">${problemDescription || 'Não informado'}</div>
                </div>
                ${technicalReport ? `
                <div style="margin-bottom: 4px;">
                  <span style="font-size: 8.5px; font-weight: bold; text-transform: uppercase; color: #475569; display: block; border-bottom: 1px solid #e2e8f0; margin-bottom: 2px;">Laudo Técnico:</span>
                  <div style="min-height: 3.2em; max-height: 3.8em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">${technicalReport}</div>
                </div>` : ''}
                <div style="margin-top: 4px; padding: 6px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; color: #166534;">
                  <span style="font-size: 8.5px; font-weight: bold; text-transform: uppercase; display: block; border-bottom: 1px solid #bbf7d0; margin-bottom: 2px;">Serviço Executado:</span>
                  <div style="font-weight: bold; min-height: 3.2em; max-height: 3.8em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">${executedService || 'Serviço concluído conforme especificações técnicas.'}</div>
                </div>
              </div>

              ${itemsList.length > 0 && warrantyType !== 'GARANTIA_FABRICA' && orderStatus !== 'Garantia' && orderStatus !== 'RETORNO_GARANTIA' ? `
              <div class="box" style="margin-bottom: 8px;">
                <div class="box-title">Peças e Mão de Obra Utilizadas</div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 70px;">Tipo</th>
                      <th>Descrição</th>
                      <th style="width: 40px; text-align: center;">Qtd</th>
                      <th style="width: 80px; text-align: right;">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsList.map((item) => `
                      <tr>
                        <td>${item.itemType === 'PART' ? '📦 Peça' : '🔧 Serviço'}</td>
                        <td>${item.name}</td>
                        <td style="text-align: center;">${item.qty || 1}</td>
                        <td style="text-align: right;">R$ ${(parseFloat(String(item.price).replace(',', '.')) || 0).toFixed(2)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>

                <div class="total-box">
                  <span>VALOR TOTAL DA OS:</span>
                  <span class="total-val">R$ ${grandTotal.toFixed(2)}</span>
                </div>
                <div style="font-size: 9.5px; color: #475569; margin-top: 4px;">
                  Forma de Pagamento: <strong>${orderToUse.paymentMethod || paymentMethod}</strong> 
                  ${orderToUse.secondaryPaymentMethod ? ` + <strong>${orderToUse.secondaryPaymentMethod} (R$ ${orderToUse.secondaryPaymentAmount || '0,00'})</strong>` : ''}
                </div>
              </div>
              ` : ''}

              <div class="box">
                <div class="box-title">Termo de Garantia e Entrega</div>
                <div class="grid" style="margin-bottom: 0;">
                  <div><strong>Data de Entrada:</strong> ${orderToUse.entryDate || todayFormatted}</div>
                  <div><strong>Data de Saída / Entrega:</strong> ${orderToUse.exitDate || todayFormatted}</div>
                </div>
                <div style="margin-top: 3px;">
                  <strong>Modalidade:</strong> ${warrantyType === 'GARANTIA_LOJA' ? 'Garantia da Empresa' : warrantyType === 'GARANTIA_FABRICA' ? 'Garantia de Fábrica' : 'Sem Garantia'}
                  ${warrantyType === 'GARANTIA_LOJA' ? ` • <strong>Prazo de Garantia:</strong> ${orderToUse.warrantyDays || warrantyDays} Dias` : ''}
                </div>
                <div style="font-size: 8.5px; color: #64748b; margin-top: 3px;">${orderToUse.warrantyTerms || warrantyTerms}</div>
              </div>

              <div class="sigs" style="display: flex; justify-content: center;">
                <div style="width: 60%; text-align: center;">
                  <div class="sig-line"></div>
                  <strong>Assinatura da Empresa / Técnico</strong>
                  <div style="font-size: 8px; color: #64748b;">${orderToUse.technician || selectedTechnicianName || 'Técnico Responsável'}</div>
                </div>
              </div>
            </body>
            </html>
          `;
        }
      }

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      Alert.alert('Sucesso', `Comprovante de ${isEntrada ? 'Entrada' : 'Saída'} gerado e compartilhado com sucesso!`);
      onSaved();
    } catch (err) {
      console.error('Erro ao gerar comprovante:', err);
    }
  };

  const handleConfirmFinalizeOS = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setExitDate(todayStr);

    const saved = await executeSaveOrder(
      {
        status: 'FINALIZADA',
        exitDate: todayStr,
        paymentMethod,
        secondaryPaymentMethod: isSplitPayment ? secondaryPaymentMethod : '',
        secondaryAmount: isSplitPayment ? secondaryAmount : '',
        cardInstallments,
        warrantyDays,
        warrantyTerms,
      },
      true
    );

    if (saved) {
      setIsFinalizeModalOpen(false);
      Alert.alert('OS Finalizada!', 'Gerando Comprovante de Saída...');
      await handleGenerateReceipt('SAIDA', saved);
    }
  };

  const handleClientLongPress = (client: any) => {
    Alert.alert(
      `Cliente: ${client.name?.toUpperCase()}`,
      `Telefone: ${client.phone || client.whatsapp || 'Não informado'}\nEndereço: ${client.address || ''}`,
      [
        {
          text: '✏️ Editar Cadastro',
          onPress: () => {
            setClientToEditInside(client);
            setIsClientsModalOpen(false);
            setIsCreatingClientInside(true);
          },
        },
        {
          text: '✅ Selecionar para esta OS',
          onPress: () => {
            setSelectedClient(client);
            setIsClientsModalOpen(false);
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  // Render do calendário de dias com DIA ATUAL DESTACADO
  const renderCalendarDays = () => {
    const today = new Date();
    const todayDateFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calDayEmpty} />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const mStr = String(calendarMonth + 1).padStart(2, '0');
      const dateFormatted = `${calendarYear}-${mStr}-${dayStr}`;

      const isToday = dateFormatted === todayDateFormatted;
      const isSelected = calendarTarget === 'ENTRY' ? entryDate === dateFormatted : exitDate === dateFormatted;

      days.push(
        <TouchableOpacity
          key={`day-${d}`}
          style={[
            styles.calDayBtn,
            isToday && styles.calDayBtnToday,
            isSelected && styles.calDayBtnActive,
          ]}
          onPress={() => {
            if (calendarTarget === 'ENTRY') setEntryDate(dateFormatted);
            else setExitDate(dateFormatted);
            setIsCalendarModalOpen(false);
          }}
        >
          <Text
            style={[
              styles.calDayText,
              isToday && styles.calDayTextToday,
              isSelected && styles.calDayTextActive,
            ]}
          >
            {d}
          </Text>
          {isToday && !isSelected && <View style={styles.todayDot} />}
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendarWrapper}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={() => {
              if (calendarMonth === 0) {
                setCalendarMonth(11);
                setCalendarYear(calendarYear - 1);
              } else {
                setCalendarMonth(calendarMonth - 1);
              }
            }}
          >
            <ChevronLeft size={20} color="#ffffff" />
          </TouchableOpacity>

          <Text style={styles.calendarMonthTitle}>
            {monthNames[calendarMonth]} {calendarYear}
          </Text>

          <TouchableOpacity
            onPress={() => {
              if (calendarMonth === 11) {
                setCalendarMonth(0);
                setCalendarYear(calendarYear + 1);
              } else {
                setCalendarMonth(calendarMonth + 1);
              }
            }}
          >
            <ChevronRight size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekDaysRow}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((w, idx) => (
            <Text key={idx} style={styles.weekDayText}>{w}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>{days}</View>
      </View>
    );
  };

  const [availableStatuses, setAvailableStatuses] = useState<any[]>(DEFAULT_STATUSES_MOBILE);

  const statusOptions: string[] = availableStatuses && availableStatuses.length > 0
    ? Array.from(new Set(availableStatuses.map((s: any) => String(s.name || s.id || s).toUpperCase())))
    : [
        'ABERTA',
        'ORCAMENTO_APROVADO',
        'EM_ATENDIMENTO',
        'AGUARDANDO_PECA',
        'APARELHO_LIBERADO',
        'FINALIZADA',
        'CANCELADA',
      ];

  // Manipulador seguro para voltar/fechar OS com confirmação de alterações
  const handleRequestBack = () => {
    const isDirty = getFormSnapshot() !== lastSavedSnapshot;

    if (isDirty) {
      Alert.alert(
        'Sair sem Salvar',
        'Você alterou informações nesta Ordem de Serviço que ainda não foram salvas. Deseja realmente sair sem salvar?',
        [
          { text: 'Continuar Editando', style: 'cancel' },
          {
            text: 'Sim, Sair sem Salvar',
            style: 'destructive',
            onPress: () => onBack(),
          },
        ]
      );
    } else {
      onBack();
    }
  };

  // Listener para o botão físico Voltar do Android
  useEffect(() => {
    const backAction = () => {
      if (isClientsModalOpen || isPartsCatalogOpen || isServicesCatalogOpen || isCustomItemModalOpen || isCalendarModalOpen || isFinalizeModalOpen) {
        setIsClientsModalOpen(false);
        setIsPartsCatalogOpen(false);
        setIsServicesCatalogOpen(false);
        setIsCustomItemModalOpen(false);
        setIsCalendarModalOpen(false);
        setIsFinalizeModalOpen(false);
        return true;
      }
      handleRequestBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [
    lastSavedSnapshot,
    selectedClient,
    equipmentType,
    equipmentBrand,
    equipmentModel,
    serialNumber,
    equipmentCode,
    orderStatus,
    orderType,
    entryDate,
    exitDate,
    problemDescription,
    technicalReport,
    executedService,
    itemsList,
    warrantyType,
    warrantyDays,
    purchaseDate,
    nfNumber,
    nfValue,
    guarantor,
    authorizedCode,
    retailerName,
    cnpj,
    additionalNotes,
    warrantyTerms,
    selectedTechnicianName,
    paymentMethod,
    isSplitPayment,
    secondaryPaymentMethod,
    secondaryAmount,
    cardInstallments,
    isClientsModalOpen,
    isPartsCatalogOpen,
    isServicesCatalogOpen,
    isCustomItemModalOpen,
    isCalendarModalOpen,
    isFinalizeModalOpen,
  ]);

  if (isCreatingClientInside) {
    return (
      <CreateClientScreen
        clientToEdit={clientToEditInside}
        onBack={() => {
          setIsCreatingClientInside(false);
          setClientToEditInside(null);
        }}
        onSaved={(newClient) => {
          setSelectedClient(newClient);
          setIsCreatingClientInside(false);
          setClientToEditInside(null);
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com Número da OS */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleRequestBack} style={styles.backButton}>
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>
            {orderToEdit ? `Editar OS #${orderToEdit.code}` : 'Nova Ordem de Serviço'}
          </Text>
          <Text style={{ fontSize: 11, color: '#38bdf8', fontWeight: 'bold' }}>
            {orderToEdit?.code ? `Número: ${orderToEdit.code}` : 'Número: Sincronizado ao Salvar'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => executeSaveOrder({}, false)} disabled={submitting} style={styles.saveButton}>
          <Save size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* 1. DATAS NO INÍCIO COM CALENDÁRIO VISUAL */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CalendarIcon size={18} color="#0284c7" />
            <Text style={styles.cardTitle}>Datas da Ordem de Serviço</Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Data de Entrada</Text>
              <TouchableOpacity
                style={styles.dateSelectorBtn}
                onPress={() => {
                  setCalendarTarget('ENTRY');
                  setIsCalendarModalOpen(true);
                }}
              >
                <CalendarIcon size={15} color="#38bdf8" />
                <Text style={styles.dateSelectorText}>{entryDate ? new Date(entryDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Selecionar'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Data de Saída</Text>
              <TouchableOpacity
                style={[styles.dateSelectorBtn, exitDate && { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}
                onPress={() => {
                  setCalendarTarget('EXIT');
                  setIsCalendarModalOpen(true);
                }}
              >
                <CalendarIcon size={15} color={exitDate ? '#059669' : '#64748b'} />
                <Text style={[styles.dateSelectorText, exitDate ? { color: '#059669' } : null]}>
                  {exitDate ? new Date(exitDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Automática'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 2. SELEÇÃO DE CLIENTE COM EXIBIÇÃO DE NOME, TELEFONE E ENDEREÇO */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={18} color="#0284c7" />
            <Text style={styles.cardTitle}>Cliente da OS</Text>
          </View>

          {selectedClient ? (
            <View style={styles.selectedClientBox}>
              <Text style={styles.selectedClientName}>{selectedClient.name?.toUpperCase()}</Text>
              
              <View style={styles.clientDetailRow}>
                <Text style={styles.clientDetailLabel}>📞 Telefone / WhatsApp:</Text>
                <Text style={styles.clientDetailValue}>
                  {selectedClient.phone || selectedClient.whatsapp || 'Não informado'}
                </Text>
              </View>

              <View style={styles.clientDetailRow}>
                <Text style={styles.clientDetailLabel}>📍 Endereço Completo:</Text>
                <Text style={styles.clientDetailValue}>
                  {selectedClient.address ? `${selectedClient.address}, ${selectedClient.number || 'S/N'}${selectedClient.neighborhood ? ` - ${selectedClient.neighborhood}` : ''}${selectedClient.city ? ` (${selectedClient.city}/${selectedClient.state || 'SP'})` : ''}` : 'Endereço não informado'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                <TouchableOpacity
                  style={styles.changeClientBtn}
                  onPress={() => setIsClientsModalOpen(true)}
                >
                  <Text style={styles.changeClientBtnText}>Trocar Cliente</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editClientBtn}
                  onPress={() => {
                    setClientToEditInside(selectedClient);
                    setIsCreatingClientInside(true);
                  }}
                >
                  <Text style={styles.editClientBtnText}>✏️ Editar Cadastro</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.clientActionButtons}>
              <TouchableOpacity
                style={styles.selectClientBtn}
                onPress={() => setIsClientsModalOpen(true)}
              >
                <Search size={16} color="#ffffff" />
                <Text style={styles.btnText}>Selecionar na Lista de Clientes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.newClientBtn}
                onPress={() => {
                  setClientToEditInside(null);
                  setIsCreatingClientInside(true);
                }}
              >
                <PlusCircle size={16} color="#ffffff" />
                <Text style={styles.btnText}>+ Cadastrar Novo Cliente</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 3. DADOS DO EQUIPAMENTO COM SELEÇÃO DIRETA NA LISTA INLINE */}
        <View style={[styles.card, { zIndex: isEquipmentDropdownOpen ? 1000 : 20, elevation: isEquipmentDropdownOpen ? 10 : 1 }]}>
          <View style={styles.cardHeader}>
            <Wrench size={18} color="#0284c7" />
            <Text style={styles.cardTitle}>Dados do Equipamento</Text>
          </View>

          <Text style={styles.label}>Tipo de Aparelho *</Text>
          <View style={{ zIndex: 1000, position: 'relative' }}>
            <View style={[styles.inputWithIconRow, isEquipmentDropdownOpen && { borderColor: '#38bdf8' }]}>
              <TextInput
                style={styles.autocompleteInput}
                placeholder="Digite ou selecione o aparelho..."
                placeholderTextColor="#64748b"
                autoCapitalize="characters"
                value={equipmentSearch}
                onFocus={() => {
                  loadCatalogs();
                  setEquipmentSearch('');
                  setIsEquipmentDropdownOpen(true);
                }}
                onChangeText={(text) => {
                  const upper = text.toUpperCase();
                  setEquipmentSearch(upper);
                  setEquipmentType(upper);
                  setIsEquipmentDropdownOpen(true);
                }}
                onBlur={() => {
                  // Se nada foi selecionado da lista, usa o texto digitado como tipo
                  if (equipmentSearch.trim()) {
                    setEquipmentType(equipmentSearch.trim().toUpperCase());
                  }
                  setTimeout(() => setIsEquipmentDropdownOpen(false), 150);
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  loadCatalogs();
                  if (!isEquipmentDropdownOpen) {
                    setEquipmentSearch('');
                  }
                  setIsEquipmentDropdownOpen(!isEquipmentDropdownOpen);
                }}
                style={{ padding: 6 }}
              >
                <ChevronDown
                  size={20}
                  color="#38bdf8"
                  style={{ transform: [{ rotate: isEquipmentDropdownOpen ? '180deg' : '0deg' }] }}
                />
              </TouchableOpacity>
            </View>

            {isEquipmentDropdownOpen && (
              <View style={styles.floatingDropdownMenu}>
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
                  {availableEquipments
                    .filter((eq) => {
                      // Sem texto: mostra tudo. Com texto: filtra
                      if (!equipmentSearch.trim()) return true;
                      const term = equipmentSearch.trim().toUpperCase();
                      const typeStr = (eq.type || eq.name || '').toUpperCase();
                      return typeStr.includes(term);
                    })
                    .map((eq, idx) => {
                      const selType = (eq.type || eq.name || '').toUpperCase();
                      const isSelected = equipmentType.toUpperCase() === selType;
                      return (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.7}
                          style={[
                            styles.inlineDropdownOption,
                            isSelected && styles.inlineDropdownOptionActive,
                          ]}
                          onPress={() => {
                            setEquipmentType(selType);
                            setEquipmentSearch(selType);
                            setIsEquipmentDropdownOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.inlineDropdownOptionTitle,
                              isSelected && { color: '#38bdf8' },
                            ]}
                          >
                            {selType}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                  {availableEquipments.filter((eq) => {
                    if (!equipmentSearch.trim()) return true;
                    const term = equipmentSearch.trim().toUpperCase();
                    const typeStr = (eq.type || eq.name || '').toUpperCase();
                    return typeStr.includes(term);
                  }).length === 0 && equipmentSearch.trim().length > 0 && (
                    <TouchableOpacity
                      style={{ padding: 12 }}
                      onPress={() => {
                        setEquipmentType(equipmentSearch.trim().toUpperCase());
                        setIsEquipmentDropdownOpen(false);
                      }}
                    >
                      <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: 'bold' }}>
                        ➕ Usar: "{equipmentSearch.toUpperCase()}"
                      </Text>
                      <Text style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
                        (Tipo personalizado, salvo apenas nesta OS)
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Marca</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Brastemp"
                placeholderTextColor="#64748b"
                value={equipmentBrand}
                onChangeText={setEquipmentBrand}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Modelo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: BWH15AB"
                placeholderTextColor="#64748b"
                value={equipmentModel}
                onChangeText={setEquipmentModel}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Número de Série</Text>
              <TextInput
                style={styles.input}
                placeholder="Série do aparelho..."
                placeholderTextColor="#64748b"
                value={serialNumber}
                onChangeText={setSerialNumber}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Código Equipamento</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: EQP-0001"
                placeholderTextColor="#64748b"
                value={equipmentCode}
                onChangeText={setEquipmentCode}
              />
            </View>
          </View>
        </View>

        {/* 4. STATUS DA OS COM DROPLIST EXPANSÍVEL NA PRÓPRIA TELA */}
        <View style={[styles.card, { zIndex: isStatusDropdownOpen ? 999 : 10, elevation: isStatusDropdownOpen ? 10 : 1 }]}>
          <Text style={styles.label}>Status da OS *</Text>
          <View style={{ position: 'relative', zIndex: 999 }}>
            {(() => {
              const isAdminUser = Boolean(
                currentUser?.role === 'Admin' ||
                currentUser?.isAdmin ||
                currentUser?.username === 'admin'
              );
              const isFinalizedLocked = !isAdminUser && (orderToEdit?.status || '').toUpperCase() === 'FINALIZADA';

              const formatStatusName = (stName: string) => {
                const u = (stName || '').toUpperCase();
                if (u === 'ABERTA') return 'Aberta';
                if (u === 'ORCAMENTO_APROVADO') return 'Orçamento Aprovado';
                if (u === 'EM_ATENDIMENTO') return 'Em Atendimento';
                if (u === 'APROVADO') return 'Aprovado';
                if (u === 'AGUARDANDO_PECA') return 'Aguardando Peça';
                if (u === 'APARELHO_LIBERADO') return 'Aparelho Liberado';
                if (u === 'FINALIZADA' || u === 'CONCLUIDA') return 'Finalizada / Concluída';
                if (u === 'GARANTIA_FINALIZADA' || u === 'GARANTIA/FINALIZADA') return 'Garantia / Finalizada';
                if (u === 'CANCELADA') return 'Cancelada';
                if (u === 'RETORNO_GARANTIA') return 'Retorno em Garantia';
                return u.replace(/_/g, ' ');
              };

              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={isFinalizedLocked}
                  style={[
                    styles.inlineSelectTrigger,
                    isStatusDropdownOpen && { borderColor: '#38bdf8' },
                    isFinalizedLocked && { opacity: 0.6, backgroundColor: '#1e293b' },
                  ]}
                  onPress={() => {
                    if (isFinalizedLocked) {
                      Alert.alert(
                        'OS Finalizada',
                        'Esta OS já foi finalizada e não pode ser reaberta por técnicos. Apenas o Administrador pode reabrir.'
                      );
                      return;
                    }
                    setIsStatusDropdownOpen(!isStatusDropdownOpen);
                  }}
                >
                  <Text style={styles.inlineSelectTriggerText}>{formatStatusName(orderStatus)}</Text>
                  <ChevronDown
                    size={20}
                    color="#38bdf8"
                    style={{ transform: [{ rotate: isStatusDropdownOpen ? '180deg' : '0deg' }] }}
                  />
                </TouchableOpacity>
              );
            })()}

            {isStatusDropdownOpen && (
              <View style={[styles.floatingDropdownMenu, { maxHeight: 300, zIndex: 9999, elevation: 25 }]}>
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 290 }}>
                  {statusOptions.map((st, idx) => {
                    const formatStatusName = (stName: string) => {
                      const u = (stName || '').toUpperCase();
                      if (u === 'ABERTA') return 'Aberta';
                      if (u === 'ORCAMENTO_APROVADO') return 'Orçamento Aprovado';
                      if (u === 'EM_ATENDIMENTO') return 'Em Atendimento';
                      if (u === 'APROVADO') return 'Aprovado';
                      if (u === 'AGUARDANDO_PECA') return 'Aguardando Peça';
                      if (u === 'APARELHO_LIBERADO') return 'Aparelho Liberado';
                      if (u === 'FINALIZADA' || u === 'CONCLUIDA') return 'Finalizada / Concluída';
                      if (u === 'GARANTIA_FINALIZADA' || u === 'GARANTIA/FINALIZADA') return 'Garantia / Finalizada';
                      if (u === 'CANCELADA') return 'Cancelada';
                      if (u === 'RETORNO_GARANTIA') return 'Retorno em Garantia';
                      return u.replace(/_/g, ' ');
                    };

                    const isSelected = orderStatus === st;

                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.7}
                        style={[
                          styles.inlineDropdownOption,
                          isSelected && styles.inlineDropdownOptionActive,
                        ]}
                        onPress={() => {
                          setOrderStatus(st);
                          if (st === 'FINALIZADA') {
                            const todayStr = exitDate || new Date().toISOString().split('T')[0];
                            setExitDate(todayStr);
                            setIsFinalizeModalOpen(true);
                          }
                          setIsStatusDropdownOpen(false);
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text
                            style={[
                              styles.inlineDropdownOptionTitle,
                              isSelected && { color: '#0284c7' },
                            ]}
                          >
                            {formatStatusName(st)}
                          </Text>
                          {isSelected && <Check size={16} color="#0284c7" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* SELETOR DE TÉCNICO RESPONSÁVEL (Apenas visível se o usuário for Admin ou tiver múltiplos técnicos) */}
          {(currentUser?.role === 'Admin' || currentUser?.isAdmin || currentUser?.username === 'admin') && (
            <View style={{ marginTop: 14, zIndex: 85, position: 'relative' }}>
              <Text style={styles.label}>Técnico Responsável pela OS 👑</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.inlineSelectTrigger, isTechDropdownOpen && { borderColor: '#a855f7' }]}
                onPress={() => setIsTechDropdownOpen(!isTechDropdownOpen)}
              >
                <Text style={[styles.inlineSelectTriggerText, { color: '#e9d5ff' }]}>
                  {selectedTechnicianName || 'Selecione o Técnico'}
                </Text>
                <ChevronDown
                  size={20}
                  color="#a855f7"
                  style={{ transform: [{ rotate: isTechDropdownOpen ? '180deg' : '0deg' }] }}
                />
              </TouchableOpacity>

              {isTechDropdownOpen && (
                <View style={[styles.floatingDropdownMenu, { borderColor: '#a855f7' }]}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[
                        styles.inlineDropdownOption,
                        !selectedTechnicianName && styles.inlineDropdownOptionActive,
                      ]}
                      onPress={() => {
                        setSelectedTechnicianName('');
                        setIsTechDropdownOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.inlineDropdownOptionTitle,
                          !selectedTechnicianName && { color: '#c084fc' },
                        ]}
                      >
                        Nenhum (Sem Técnico)
                      </Text>
                    </TouchableOpacity>
                    {techniciansList.map((t, idx) => (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.7}
                        style={[
                          styles.inlineDropdownOption,
                          selectedTechnicianName === (t.name || t.username) && styles.inlineDropdownOptionActive,
                        ]}
                        onPress={() => {
                          setSelectedTechnicianName(t.name || t.username);
                          setIsTechDropdownOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.inlineDropdownOptionTitle,
                            selectedTechnicianName === (t.name || t.username) && { color: '#c084fc' },
                          ]}
                        >
                          {t.name || t.username} {t.role === 'Admin' || t.isAdmin ? '👑' : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          <Text style={[styles.label, { marginTop: 12 }]}>Defeito Reclamado / Problema</Text>
          <TextInput
            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
            multiline
            placeholder="Descreva o que o cliente relatou..."
            placeholderTextColor="#64748b"
            value={problemDescription}
            onChangeText={setProblemDescription}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Laudo Técnico</Text>
          <TextInput
            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
            multiline
            placeholder="Diagnóstico técnico realizado..."
            placeholderTextColor="#64748b"
            value={technicalReport}
            onChangeText={setTechnicalReport}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Serviço Executado</Text>
          <TextInput
            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
            multiline
            placeholder="Detalhes dos serviços prestados..."
            placeholderTextColor="#64748b"
            value={executedService}
            onChangeText={setExecutedService}
          />
        </View>

        {/* 5. SEÇÃO UNIFICADA ELEGANTE: PEÇAS E SERVIÇOS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Package size={18} color="#0284c7" />
            <Text style={styles.cardTitle}>Peças e Serviços ({itemsList.length})</Text>
          </View>

          {/* 3 BOTÕES DE AÇÃO COM TEXTOS AJUSTADOS E RESPONSIVOS */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.btnActionPart}
              onPress={() => {
                loadCatalogs();
                setIsPartsCatalogOpen(true);
              }}
            >
              <Package size={14} color="#ffffff" />
              <Text style={styles.btnActionText}>+ Peça</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.btnActionService}
              onPress={() => {
                loadCatalogs();
                setIsServicesCatalogOpen(true);
              }}
            >
              <Wrench size={14} color="#ffffff" />
              <Text style={styles.btnActionText}>+ Serviço</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.btnActionCustom}
              onPress={() => {
                setCustomItemType('PART');
                setCustomItemName('');
                setCustomItemPrice('');
                setCustomItemQty('1');
                setCustomItemCode('');
                setIsCustomItemModalOpen(true);
              }}
            >
              <Plus size={14} color="#ffffff" />
              <Text style={styles.btnActionText}>+ Avulso</Text>
            </TouchableOpacity>
          </View>

          {/* TABELA UNIFICADA ELEGANTE COM QTD EM PRIMEIRO LUGAR */}
          <View style={styles.tableCardContainer}>
            {/* CABEÇALHO DA TABELA */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableColHeader, { width: 38, textAlign: 'center' }]}>QTD</Text>
              <Text style={[styles.tableColHeader, { flex: 1, paddingLeft: 6 }]}>DESCRIÇÃO DO ITEM</Text>
              <Text style={[styles.tableColHeader, { width: 75, textAlign: 'right' }]}>VALOR</Text>
              <Text style={[styles.tableColHeader, { width: 28, textAlign: 'center' }]}></Text>
            </View>

            {itemsList.length === 0 ? (
              <View style={styles.emptyTableBox}>
                <Package size={22} color="#475569" style={{ marginBottom: 4 }} />
                <Text style={styles.emptyTableText}>Nenhum item incluído nesta OS</Text>
                <Text style={styles.emptyTableSubtext}>Toque nos botões acima para adicionar peças ou serviços.</Text>
              </View>
            ) : (
              itemsList.map((item, idx) => {
                const priceNum = parseFloat(String(item.price || item.finalPrice || '0').replace(',', '.')) || 0;
                const qtyNum = Number(item.qty || item.quantity || 1);
                const subtotal = priceNum * qtyNum;

                return (
                  <View key={idx} style={styles.tableBodyRow}>
                    {/* 1ª COLUNA: QUANTIDADE COMPACTA EDITÁVEL */}
                    <TextInput
                      style={styles.qtyInputCompact}
                      keyboardType="numeric"
                      value={String(item.qty || 1)}
                      onChangeText={(val) => {
                        const parsed = parseInt(val, 10);
                        const updated = [...itemsList];
                        updated[idx].qty = isNaN(parsed) || parsed <= 0 ? 1 : parsed;
                        setItemsList(updated);
                      }}
                    />

                    {/* 2ª COLUNA: DESCRIÇÃO DO ITEM COM TAG */}
                    <View style={{ flex: 1, paddingHorizontal: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <Text style={item.itemType === 'PART' ? styles.tagPart : styles.tagService}>
                          {item.itemType === 'PART' ? 'PEÇA' : 'SERVIÇO'}
                        </Text>
                        <Text style={styles.itemTitle} numberOfLines={2}>{item.name}</Text>
                      </View>
                      {item.code ? <Text style={styles.itemCodeText}>Cód: {item.code}</Text> : null}
                    </View>

                    {/* 3ª COLUNA: VALOR TOTAL */}
                    <Text style={styles.itemPriceText}>R$ {subtotal.toFixed(2)}</Text>

                    {/* 4ª COLUNA: EXCLUIR */}
                    <TouchableOpacity
                      style={styles.deleteItemBtn}
                      onPress={() => setItemsList(itemsList.filter((_, i) => i !== idx))}
                    >
                      <Trash2 size={15} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            {itemsList.length > 0 && (
              <View style={styles.tableFooterTotal}>
                <Text style={styles.tableFooterTotalLabel}>SUBTOTAL ({itemsList.length} itens):</Text>
                <Text style={styles.tableFooterTotalVal}>R$ {calculateTotal().toFixed(2)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 5. GARANTIA DA ORDEM DE SERVIÇO (100% Sincronizado com o PC) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ShieldCheck size={18} color="#a855f7" />
            <Text style={styles.cardTitle}>Garantia da Ordem de Serviço</Text>
          </View>

          {/* MODALIDADE DE GARANTIA */}
          <Text style={styles.label}>Modalidade de Garantia *</Text>
          <View style={styles.warrantyTypeGrid}>
            {[
              { id: 'GARANTIA_LOJA', label: 'Garantia da Empresa' },
              { id: 'GARANTIA_FABRICA', label: 'Garantia de Fábrica' },
              { id: 'NAO_SE_APLICA', label: 'Não se Aplica' },
            ].map((wt) => (
              <TouchableOpacity
                key={wt.id}
                style={[
                  styles.warrantyTypeBtn,
                  warrantyType === wt.id && styles.warrantyTypeBtnActive,
                ]}
                onPress={() => setWarrantyType(wt.id as any)}
              >
                <Text
                  style={[
                    styles.warrantyTypeBtnText,
                    warrantyType === wt.id && styles.warrantyTypeBtnTextActive,
                  ]}
                >
                  {wt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {warrantyType === 'GARANTIA_LOJA' && (
            <View style={{ marginTop: 10, gap: 10 }}>
              {/* PRAZO DE GARANTIA */}
              <View>
                <Text style={styles.label}>Tempo de Garantia (Dias) *</Text>
                <View style={styles.paymentMethodsGrid}>
                  {[
                    { days: '30', label: '30 Dias (1 Mês)' },
                    { days: '90', label: '90 Dias (3 Meses)' },
                    { days: '180', label: '180 Dias (6 Meses)' },
                    { days: '365', label: '365 Dias (1 Ano)' },
                  ].map((p) => (
                    <TouchableOpacity
                      key={p.days}
                      style={[
                        styles.paymentBtn,
                        warrantyDays === p.days && styles.paymentBtnActive,
                      ]}
                      onPress={() => setWarrantyDays(p.days)}
                    >
                      <Text
                        style={[
                          styles.paymentBtnText,
                          warrantyDays === p.days && styles.paymentBtnTextActive,
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* CLÁUSULAS E TERMOS DE GARANTIA */}
              <View>
                <Text style={styles.label}>Cláusulas e Termos de Garantia</Text>
                <TextInput
                  style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
                  multiline
                  value={warrantyTerms}
                  onChangeText={setWarrantyTerms}
                  placeholder="Termos de garantia para esta OS..."
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>
          )}

          {warrantyType === 'GARANTIA_FABRICA' && (
            <View style={{ marginTop: 10, gap: 10 }}>
              {/* LINHA 1: NÚMERO NF E VALOR DA NF COM MÁSCARA AUTOMÁTICA */}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Nº da Nota Fiscal (NF-e)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 000.123.456"
                    placeholderTextColor="#64748b"
                    value={nfNumber}
                    onChangeText={setNfNumber}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Valor da NF (R$)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0,00"
                    keyboardType="numeric"
                    placeholderTextColor="#64748b"
                    value={nfValue}
                    onChangeText={(text) => {
                      const clean = text.replace(/\D/g, '');
                      if (!clean) {
                        setNfValue('');
                        return;
                      }
                      const num = parseFloat(clean) / 100;
                      setNfValue(
                        num.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      );
                    }}
                  />
                </View>
              </View>

              {/* LINHA 2: DATA DA COMPRA (DD/MM/AAAA) E GARANTIDOR (FABRICANTE / SEGURADORA) */}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Data da Compra (DD/MM/AAAA) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/AAAA"
                    keyboardType="numeric"
                    maxLength={10}
                    placeholderTextColor="#64748b"
                    value={purchaseDate}
                    onChangeText={(text) => {
                      let clean = text.replace(/\D/g, '');
                      if (clean.length > 8) clean = clean.slice(0, 8);
                      let formatted = clean;
                      if (clean.length >= 3 && clean.length <= 4) {
                        formatted = `${clean.slice(0, 2)}/${clean.slice(2)}`;
                      } else if (clean.length >= 5) {
                        formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)}`;
                      }
                      setPurchaseDate(formatted);
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Garantidor *</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[
                      { id: 'FABRICANTE', label: 'Fabricante' },
                      { id: 'SEGURADORA', label: 'Seguradora' },
                    ].map((g) => (
                      <TouchableOpacity
                        key={g.id}
                        style={[
                          styles.guarantorBtnDual,
                          guarantor === g.id && styles.guarantorBtnActive,
                        ]}
                        onPress={() => setGuarantor(g.id)}
                      >
                        <Text
                          style={[
                            styles.guarantorBtnText,
                            guarantor === g.id && styles.guarantorBtnTextActive,
                          ]}
                        >
                          {g.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* LINHA 3: NOME DA REVENDA (AMPLO E MAIOR) */}
              <View>
                <Text style={styles.label}>Nome da Revenda / Loja Vendedora</Text>
                <TextInput
                  style={[styles.input, { paddingVertical: 10 }]}
                  placeholder="Ex: Magazine Luiza / Casas Bahia / Fast Shop..."
                  placeholderTextColor="#64748b"
                  value={retailerName}
                  onChangeText={setRetailerName}
                />
              </View>

              {/* LINHA 4: CNPJ DA REVENDA (TAMANHO AJUSTADO COM MÁSCARA AUTOMÁTICA) E CÓDIGO AUTORIZAÇÃO */}
              <View style={styles.row}>
                <View style={{ width: 170 }}>
                  <Text style={styles.label}>CNPJ da Revenda</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="00.000.000/0001-00"
                    keyboardType="numeric"
                    maxLength={18}
                    placeholderTextColor="#64748b"
                    value={cnpj}
                    onChangeText={(text) => {
                      let clean = text.replace(/\D/g, '');
                      if (clean.length > 14) clean = clean.slice(0, 14);
                      let formatted = clean;
                      if (clean.length > 2 && clean.length <= 5) {
                        formatted = `${clean.slice(0, 2)}.${clean.slice(2)}`;
                      } else if (clean.length > 5 && clean.length <= 8) {
                        formatted = `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
                      } else if (clean.length > 8 && clean.length <= 12) {
                        formatted = `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
                      } else if (clean.length > 12) {
                        formatted = `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
                      }
                      setCnpj(formatted);
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Cód. Autorização</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: OS-FAB-9988"
                    placeholderTextColor="#64748b"
                    value={authorizedCode}
                    onChangeText={setAuthorizedCode}
                  />
                </View>
              </View>

              {/* LINHA 5: OBSERVAÇÕES ADICIONAIS DA GARANTIA */}
              <View>
                <Text style={styles.label}>Observações Adicionais da Garantia de Fábrica</Text>
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="Protocolo da fábrica, notas de faturamento..."
                  placeholderTextColor="#64748b"
                  value={additionalNotes}
                  onChangeText={setAdditionalNotes}
                />
              </View>

              {/* VERIFICAÇÃO AUTOMÁTICA DE VALIDADE DA GARANTIA DE FÁBRICA */}
              {!purchaseDate.trim() ? (
                <View style={styles.factoryWarrantyWarning}>
                  <Text style={styles.factoryWarrantyWarningTitle}>⚠️ Garantia de Fábrica Não se Aplica / Incompleta</Text>
                  <Text style={styles.factoryWarrantyWarningDesc}>
                    Nenhuma Data de Compra/Emissão da NF foi informada. Para validar a Garantia de Fábrica, insira a data da compra da Nota Fiscal acima.
                  </Text>
                </View>
              ) : (() => {
                try {
                  const cleanStr = purchaseDate.trim();
                  const parts = cleanStr.split(/[-/]/).map(Number);
                  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
                    return (
                      <View style={styles.factoryWarrantyWarning}>
                        <Text style={styles.factoryWarrantyWarningTitle}>⚠️ Data Incompleta</Text>
                        <Text style={styles.factoryWarrantyWarningDesc}>Preencha a data completa da compra no formato DD/MM/AAAA.</Text>
                      </View>
                    );
                  }

                  let pDay = parts[0];
                  let pMonth = parts[1];
                  let pYear = parts[2];

                  // Suporta AAAA-MM-DD ou DD/MM/AAAA
                  if (parts[0] > 1900) {
                    pYear = parts[0];
                    pMonth = parts[1];
                    pDay = parts[2];
                  }

                  if (pYear < 1900 || pMonth < 1 || pMonth > 12 || pDay < 1 || pDay > 31) {
                    return (
                      <View style={styles.factoryWarrantyWarning}>
                        <Text style={styles.factoryWarrantyWarningTitle}>⚠️ Data Inválida</Text>
                        <Text style={styles.factoryWarrantyWarningDesc}>Verifique o dia, mês ou ano informado.</Text>
                      </View>
                    );
                  }

                  const pDate = new Date(pYear, pMonth - 1, pDay);
                  const expDate = new Date(pDate);
                  expDate.setFullYear(expDate.getFullYear() + 1);

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const isValid = expDate.getTime() >= today.getTime();

                  return (
                    <View style={[styles.factoryWarrantyAlert, !isValid && styles.factoryWarrantyExpired]}>
                      <Text style={[styles.factoryWarrantyAlertTitle, !isValid && { color: '#fca5a5' }]}>
                        {isValid ? '🛡️ Garantia de Fábrica Válida (+1 Ano)' : '❌ Garantia de Fábrica Expirada (+1 Ano)'}
                      </Text>
                      <Text style={styles.factoryWarrantyAlertDesc}>
                        {isValid
                          ? `Equipamento dentro da garantia legal/fabricante até ${expDate.toLocaleDateString('pt-BR')}. Cobertura garantida.`
                          : `O prazo de 1 ano a partir da compra (${pDate.toLocaleDateString('pt-BR')}) expirou em ${expDate.toLocaleDateString('pt-BR')}. A Garantia de Fábrica não se aplica.`}
                      </Text>
                    </View>
                  );
                } catch {
                  return (
                    <View style={styles.factoryWarrantyWarning}>
                      <Text style={styles.factoryWarrantyWarningTitle}>⚠️ Data Inválida</Text>
                      <Text style={styles.factoryWarrantyWarningDesc}>Informe a data no formato DD/MM/AAAA.</Text>
                    </View>
                  );
                }
              })()}
            </View>
          )}
        </View>

        {/* VALOR TOTAL */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>VALOR TOTAL DA OS:</Text>
          <Text style={styles.totalValue}>R$ {calculateTotal().toFixed(2)}</Text>
        </View>

        {/* BOTÕES FINAIS DE AÇÃO (SALVAR, FINALIZAR OS, COMPROVANTES) */}
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.mainSaveBtn}
            disabled={submitting}
            onPress={() => executeSaveOrder({}, false)}
          >
            <Save size={18} color="#ffffff" />
            <Text style={styles.mainSaveBtnText}>Salvar Ordem de Serviço</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.finalizeBtn}
            disabled={submitting}
            onPress={() => setIsFinalizeModalOpen(true)}
          >
            <CheckCircle2 size={18} color="#ffffff" />
            <Text style={styles.finalizeBtnText}>Finalizar OS & Comprovante de Saída</Text>
          </TouchableOpacity>

          <View style={styles.receiptButtonsRow}>
            <TouchableOpacity
              style={styles.receiptBtnEntrada}
              disabled={submitting}
              onPress={() => handleGenerateReceipt('ENTRADA')}
            >
              <Printer size={16} color="#ffffff" />
              <Text style={styles.receiptBtnText}>Gerar Comprovante Entrada</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.receiptBtnSaida}
              disabled={submitting}
              onPress={() => handleGenerateReceipt('SAIDA')}
            >
              <FileText size={16} color="#ffffff" />
              <Text style={styles.receiptBtnText}>Gerar Comprovante Saída</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* MODAL INSERIR AVULSO ELEGANTE COM TOGGLE PEÇA/SERVIÇO */}
      <Modal visible={isCustomItemModalOpen} transparent animationType="fade" onRequestClose={() => setIsCustomItemModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalAlertBox, { maxWidth: 360 }]}>
            <Text style={styles.modalAlertTitle}>Inserir Item Avulso</Text>

            <View style={styles.customTypeSelector}>
              <TouchableOpacity
                style={[styles.typeBtn, customItemType === 'PART' && styles.typeBtnActive]}
                onPress={() => setCustomItemType('PART')}
              >
                <Package size={14} color={customItemType === 'PART' ? '#ffffff' : '#94a3b8'} />
                <Text style={[styles.typeBtnText, customItemType === 'PART' && styles.typeBtnTextActive]}>Peça</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, customItemType === 'SERVICE' && styles.typeBtnActive]}
                onPress={() => setCustomItemType('SERVICE')}
              >
                <Wrench size={14} color={customItemType === 'SERVICE' ? '#ffffff' : '#94a3b8'} />
                <Text style={[styles.typeBtnText, customItemType === 'SERVICE' && styles.typeBtnTextActive]}>Mão de Obra / Serviço</Text>
              </TouchableOpacity>
            </View>

            {customItemType === 'PART' && (
              <View style={styles.row}>
                <View style={{ width: 80 }}>
                  <Text style={styles.label}>Código</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0001"
                    placeholderTextColor="#64748b"
                    value={customItemCode}
                    onChangeText={setCustomItemCode}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Quantidade</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    keyboardType="numeric"
                    placeholderTextColor="#64748b"
                    value={customItemQty}
                    onChangeText={setCustomItemQty}
                  />
                </View>
              </View>
            )}

            <Text style={[styles.label, { marginTop: 8 }]}>Descrição do Item *</Text>
            <TextInput
              style={styles.input}
              placeholder={customItemType === 'PART' ? 'Ex: Capacitor de Partida' : 'Ex: Troca de Termostato'}
              placeholderTextColor="#64748b"
              value={customItemName}
              onChangeText={setCustomItemName}
            />

            <Text style={[styles.label, { marginTop: 8 }]}>Valor Unitário (R$) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              keyboardType="numeric"
              placeholderTextColor="#64748b"
              value={customItemPrice}
              onChangeText={setCustomItemPrice}
            />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setIsCustomItemModalOpen(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addModalBtn}
                onPress={handleAddCustomItem}
              >
                <Text style={styles.addModalBtnText}>Adicionar na OS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DO CALENDÁRIO VISUAL COMPLETO COM DESTAQUE NO DIA ATUAL */}
      <Modal visible={isCalendarModalOpen} transparent animationType="fade" onRequestClose={() => setIsCalendarModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalAlertBox, { maxWidth: 340 }]}>
            <Text style={styles.modalAlertTitle}>
              {calendarTarget === 'ENTRY' ? '📅 Selecione a Data de Entrada' : '📅 Selecione a Data de Saída'}
            </Text>

            {renderCalendarDays()}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={styles.dateTodayBtn}
                onPress={() => {
                  const d = new Date().toISOString().split('T')[0];
                  if (calendarTarget === 'ENTRY') setEntryDate(d);
                  else setExitDate(d);
                  setIsCalendarModalOpen(false);
                }}
              >
                <Text style={styles.dateTodayBtnText}>Definir Hoje</Text>
              </TouchableOpacity>

              {calendarTarget === 'EXIT' && (
                <TouchableOpacity
                  style={styles.dateClearBtn}
                  onPress={() => {
                    setExitDate('');
                    setIsCalendarModalOpen(false);
                  }}
                >
                  <Text style={styles.dateClearBtnText}>Limpar</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setIsCalendarModalOpen(false)}
              >
                <Text style={styles.cancelModalBtnText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE FINALIZAÇÃO DE OS COM PAGAMENTO E GARANTIA */}
      <Modal visible={isFinalizeModalOpen} animationType="slide" onRequestClose={() => setIsFinalizeModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Finalizar Ordem de Serviço</Text>
            <TouchableOpacity onPress={() => setIsFinalizeModalOpen(false)}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16 }}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <DollarSign size={18} color="#10b981" />
                <Text style={styles.cardTitle}>Forma de Pagamento</Text>
              </View>

              <Text style={styles.label}>Forma Principal</Text>
              <View style={styles.paymentMethodsGrid}>
                {['PIX', 'DINHEIRO', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'BOLETO'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.paymentBtn, paymentMethod === m && styles.paymentBtnActive]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <Text style={[styles.paymentBtnText, paymentMethod === m && styles.paymentBtnTextActive]}>
                      {m.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.splitToggle}
                onPress={() => setIsSplitPayment(!isSplitPayment)}
              >
                <Text style={styles.splitToggleText}>
                  {isSplitPayment ? '✓ Dividir em 2 Formas de Pagamento' : '+ Adicionar 2ª Forma de Pagamento'}
                </Text>
              </TouchableOpacity>

              {isSplitPayment && (
                <View style={{ marginTop: 10, gap: 8 }}>
                  <Text style={styles.label}>Segunda Forma de Pagamento</Text>
                  <View style={styles.paymentMethodsGrid}>
                    {['DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO'].map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.paymentBtn, secondaryPaymentMethod === m && styles.paymentBtnActive]}
                        onPress={() => setSecondaryPaymentMethod(m)}
                      >
                        <Text style={[styles.paymentBtnText, secondaryPaymentMethod === m && styles.paymentBtnTextActive]}>
                          {m.replace('_', ' ')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Valor 2ª Forma (R$)"
                    keyboardType="numeric"
                    placeholderTextColor="#64748b"
                    value={secondaryAmount}
                    onChangeText={setSecondaryAmount}
                  />
                </View>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={18} color="#0284c7" />
                <Text style={styles.cardTitle}>Garantia do Serviço</Text>
              </View>

              <Text style={styles.label}>Prazo de Garantia</Text>
              <View style={styles.paymentMethodsGrid}>
                {['30', '90', '180', '365'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.paymentBtn, warrantyDays === d && styles.paymentBtnActive]}
                    onPress={() => setWarrantyDays(d)}
                  >
                    <Text style={[styles.paymentBtnText, warrantyDays === d && styles.paymentBtnTextActive]}>
                      {d} Dias
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { marginTop: 10 }]}>Termos de Garantia</Text>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                multiline
                value={warrantyTerms}
                onChangeText={setWarrantyTerms}
              />
            </View>

            <TouchableOpacity
              style={styles.confirmFinalizeBtn}
              onPress={handleConfirmFinalizeOS}
            >
              <CheckCircle2 size={20} color="#ffffff" />
              <Text style={styles.confirmFinalizeBtnText}>Confirmar e Finalizar OS</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL DE SELEÇÃO DE CLIENTES (COM CLIQUE LONGO PARA EDITAR) */}
      <Modal visible={isClientsModalOpen} animationType="slide" onRequestClose={() => setIsClientsModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Banco de Clientes</Text>
            <TouchableOpacity onPress={() => setIsClientsModalOpen(false)}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchBox}>
            <Search size={18} color="#94a3b8" />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Buscar por nome, telefone, endereço..."
              placeholderTextColor="#64748b"
              value={clientSearchText}
              onChangeText={setClientSearchText}
            />
          </View>

          <Text style={styles.modalHint}>💡 Toque para selecionar ou segure para opções/editar cadastro</Text>

          <FlatList
            data={filteredClients}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.clientItemCard}
                onPress={() => {
                  setSelectedClient(item);
                  setIsClientsModalOpen(false);
                }}
                onLongPress={() => handleClientLongPress(item)}
                delayLongPress={400}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.clientItemName}>{item.name?.toUpperCase()}</Text>
                  <Edit3 size={16} color="#94a3b8" />
                </View>
                <Text style={styles.clientItemSub}>📞 {item.phone || item.whatsapp || 'Sem telefone'}</Text>
                {item.address ? (
                  <Text style={styles.clientItemAddress}>📍 {item.address}, {item.number || 'S/N'} - {item.city || ''}</Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* MODAL DE PEÇAS CADASTRADAS */}
      <Modal visible={isPartsCatalogOpen} animationType="slide" onRequestClose={() => setIsPartsCatalogOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Catálogo de Peças Cadastradas</Text>
            <TouchableOpacity onPress={() => setIsPartsCatalogOpen(false)}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchBox}>
            <Search size={18} color="#94a3b8" />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Buscar peça..."
              placeholderTextColor="#64748b"
              value={catalogSearchText}
              onChangeText={setCatalogSearchText}
            />
          </View>

          <FlatList
            data={availableParts.filter((p) => (p.name || '').toLowerCase().includes(catalogSearchText.toLowerCase()))}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.catalogItemCard}
                onPress={() => handleAddItemFromCatalog(item, 'PART')}
              >
                <View>
                  <Text style={styles.catalogItemName}>{item.name}</Text>
                  <Text style={styles.catalogItemStock}>Estoque: {item.stockQuantity ?? '0'}</Text>
                </View>
                <Text style={styles.catalogItemPrice}>R$ {item.finalPrice || item.price}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* MODAL DE SERVIÇOS CADASTRADOS */}
      <Modal visible={isServicesCatalogOpen} animationType="slide" onRequestClose={() => setIsServicesCatalogOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Catálogo de Serviços Cadastrados</Text>
            <TouchableOpacity onPress={() => setIsServicesCatalogOpen(false)}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchBox}>
            <Search size={18} color="#94a3b8" />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Buscar serviço..."
              placeholderTextColor="#64748b"
              value={catalogSearchText}
              onChangeText={setCatalogSearchText}
            />
          </View>

          <FlatList
            data={availableServices.filter((s) => (s.name || '').toLowerCase().includes(catalogSearchText.toLowerCase()))}
            keyExtractor={(s) => s.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.catalogItemCard}
                onPress={() => handleAddItemFromCatalog(item, 'SERVICE')}
              >
                <Text style={styles.catalogItemName}>{item.name}</Text>
                <Text style={styles.catalogItemPrice}>R$ {item.price}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  saveButton: {
    backgroundColor: '#0284c7',
    padding: 8,
    borderRadius: 8,
  },
  scroll: { flex: 1, padding: 14 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 6,
  },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  label: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#0f172a',
    fontSize: 13,
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 6,
  },
  dateSelectorText: { color: '#0f172a', fontSize: 13, fontWeight: 'bold' },
  clientActionButtons: { gap: 8 },
  selectClientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  newClientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  selectedClientBox: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  selectedClientName: { color: '#0369a1', fontSize: 16, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#e0f2fe', paddingBottom: 4, marginBottom: 6 },
  clientDetailRow: { flexDirection: 'column', marginVertical: 2 },
  clientDetailLabel: { color: '#64748b', fontSize: 11, fontWeight: 'bold' },
  clientDetailValue: { color: '#0f172a', fontSize: 13, fontWeight: '600' },
  changeClientBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d97706', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  changeClientBtnText: { color: '#d97706', fontSize: 11, fontWeight: 'bold' },
  editClientBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#0284c7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  editClientBtnText: { color: '#0284c7', fontSize: 11, fontWeight: 'bold' },
  inputWithIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingRight: 8,
  },
  autocompleteInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 'bold',
  },
  inlineSelectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  inlineSelectTriggerText: { color: '#0f172a', fontSize: 13, fontWeight: 'bold' },
  floatingDropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#0284c7',
    marginTop: 4,
    zIndex: 9999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  inlineDropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  inlineDropdownOptionActive: { backgroundColor: '#e0f2fe' },
  inlineDropdownOptionTitle: { color: '#0f172a', fontSize: 13, fontWeight: 'bold' },
  inlineDropdownOptionSub: { color: '#64748b', fontSize: 11, marginTop: 2 },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  btnActionPart: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d97706',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 4,
  },
  btnActionService: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 4,
  },
  btnActionCustom: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 4,
  },
  btnActionText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  tableCardContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableColHeader: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyTableBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyTableText: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
  emptyTableSubtext: { color: '#94a3b8', fontSize: 11, textAlign: 'center', marginTop: 2 },
  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tagPart: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tagService: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  qtyInputCompact: {
    width: 38,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#0284c7',
    borderRadius: 6,
    color: '#0f172a',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  itemTitle: { color: '#0f172a', fontSize: 12, fontWeight: 'bold', flexShrink: 1 },
  itemCodeText: { color: '#64748b', fontSize: 10, marginTop: 1 },
  itemQtyText: { width: 40, textAlign: 'center', color: '#475569', fontWeight: 'bold', fontSize: 12 },
  itemPriceText: { width: 75, textAlign: 'right', color: '#059669', fontWeight: 'bold', fontSize: 12 },
  deleteItemBtn: { width: 30, alignItems: 'center', justifyContent: 'center' },
  tableFooterTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
  },
  tableFooterTotalLabel: { color: '#64748b', fontSize: 11, fontWeight: 'bold' },
  tableFooterTotalVal: { color: '#059669', fontSize: 13, fontWeight: 'bold', fontFamily: 'monospace' },
  totalCard: {
    backgroundColor: '#064e3b',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#059669',
    marginBottom: 14,
  },
  totalLabel: { color: '#a7f3d0', fontSize: 14, fontWeight: 'bold' },
  totalValue: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', fontFamily: 'monospace' },
  footerActions: { gap: 10, marginBottom: 20 },
  mainSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  mainSaveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  finalizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  finalizeBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  receiptButtonsRow: { flexDirection: 'row', gap: 10 },
  receiptBtnEntrada: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0891b2',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  receiptBtnSaida: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d9488',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  receiptBtnText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  paymentMethodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  paymentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  paymentBtnActive: { backgroundColor: '#059669', borderColor: '#059669' },
  paymentBtnText: { color: '#64748b', fontSize: 11, fontWeight: 'bold' },
  paymentBtnTextActive: { color: '#ffffff' },
  splitToggle: { marginVertical: 6 },
  splitToggleText: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  confirmFinalizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginVertical: 16,
  },
  confirmFinalizeBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalAlertBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalAlertTitle: { color: '#0f172a', fontSize: 15, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  calendarWrapper: { backgroundColor: '#0f172a', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#334155' },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  calendarMonthTitle: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold' },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
  weekDayText: { color: '#64748b', fontSize: 11, fontWeight: 'bold', width: 34, textAlign: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 238, alignSelf: 'center' },
  calDayBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', borderRadius: 6, marginVertical: 2, position: 'relative' },
  calDayBtnToday: { borderWidth: 1.5, borderColor: '#38bdf8', backgroundColor: '#0369a120' },
  calDayBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  calDayEmpty: { width: 34, height: 34, marginVertical: 2 },
  calDayText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  calDayTextToday: { color: '#38bdf8', fontWeight: 'bold' },
  calDayTextActive: { color: '#ffffff', fontWeight: 'bold' },
  todayDot: { position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#38bdf8' },
  dateTodayBtn: { flex: 1, backgroundColor: '#0284c7', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  dateTodayBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  dateClearBtn: { flex: 1, backgroundColor: '#b91c1c', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  dateClearBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  customTypeSelector: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeBtnActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  typeBtnText: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold' },
  typeBtnTextActive: { color: '#ffffff' },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalBtnText: { color: '#475569', fontWeight: 'bold' },
  addModalBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#0284c7',
    borderRadius: 8,
    alignItems: 'center',
  },
  addModalBtnText: { color: '#ffffff', fontWeight: 'bold' },
  modalContainer: { flex: 1, backgroundColor: '#f1f5f9' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 8,
  },
  modalSearchInput: { flex: 1, paddingVertical: 10, color: '#0f172a', fontSize: 13 },
  modalHint: { color: '#94a3b8', fontSize: 11, paddingHorizontal: 16, marginBottom: 8 },
  clientItemCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  clientItemName: { color: '#0f172a', fontSize: 15, fontWeight: 'bold' },
  clientItemSub: { color: '#0284c7', fontSize: 12, marginTop: 2 },
  clientItemAddress: { color: '#64748b', fontSize: 11, marginTop: 2 },
  catalogItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catalogItemName: { color: '#0f172a', fontSize: 13, fontWeight: 'bold' },
  catalogItemStock: { color: '#64748b', fontSize: 11, marginTop: 2 },
  catalogItemPrice: { color: '#059669', fontSize: 13, fontWeight: 'bold' },
  warrantyTypeGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  warrantyTypeBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warrantyTypeBtnActive: {
    backgroundColor: '#581c87',
    borderColor: '#a855f7',
  },
  warrantyTypeBtnText: {
    color: '#94a3b8',
    fontSize: 10.5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  warrantyTypeBtnTextActive: {
    color: '#ffffff',
  },
  coverageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  coverageBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverageBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  coverageBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  coverageBtnTextActive: {
    color: '#ffffff',
  },
  factoryWarrantyAlert: {
    padding: 12,
    backgroundColor: '#3b076440',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a855f7',
  },
  factoryWarrantyAlertTitle: {
    color: '#d8b4fe',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  factoryWarrantyAlertDesc: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
  },
  factoryWarrantyWarning: {
    padding: 12,
    backgroundColor: '#78350f35',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  factoryWarrantyWarningTitle: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  factoryWarrantyWarningDesc: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
  },
  factoryWarrantyExpired: {
    backgroundColor: '#7f1d1d35',
    borderColor: '#ef4444',
  },
  guarantorSelectorBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  guarantorBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guarantorBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  guarantorBtnText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  guarantorBtnTextActive: {
    color: '#ffffff',
  },
  guarantorBtnDual: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
