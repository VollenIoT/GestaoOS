import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { CompanyData, defaultCompanyData } from './CompanyModal';

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
  selectedClient?: any;
  selectedPart?: any;
  selectedService?: any;
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
  onClose,
  onSaveEstimate,
  onDeleteEstimate,
  onGenerateOSFromEstimate,
  onOpenClientsModal,
  onOpenPartsModal,
  onOpenServicesModal,
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

  // Tabelas de Peças e Serviços
  const [partsList, setPartsList] = useState<EstimateItemPart[]>([]);
  const [servicesList, setServicesList] = useState<EstimateItemService[]>([]);

  // Inputs para nova peça
  const [newPartCode, setNewPartCode] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newPartQty, setNewPartQty] = useState<number>(1);
  const [newPartPrice, setNewPartPrice] = useState('');

  // Inputs para novo serviço
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');

  // Valores financeiros
  const [travelCost, setTravelCost] = useState('0,00');
  const [discountCost, setDiscountCost] = useState('0,00');

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
        setClientData({
          id: estimateToEdit.client?.id || '',
          name: estimateToEdit.client?.name || '',
          phone: estimateToEdit.client?.phone || '',
          whatsapp: estimateToEdit.client?.whatsapp || '',
          address: estimateToEdit.client?.address || '',
          number: estimateToEdit.client?.number || '',
          neighborhood: estimateToEdit.client?.neighborhood || '',
          city: estimateToEdit.client?.city || '',
          state: estimateToEdit.client?.state || '',
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
      } else {
        // Modo Novo Orçamento
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
      const rawPrice = selectedPart.salePrice || selectedPart.price || '0,00';
      const priceStr = typeof rawPrice === 'number' ? rawPrice.toFixed(2).replace('.', ',') : String(rawPrice).replace('R$', '').trim();
      
      setPartsList((prev) => [
        ...prev,
        {
          code,
          name,
          qty: 1,
          price: priceStr || '0,00',
        },
      ]);
      setIsDirty(true);
    }
  }, [selectedPart, isOpen]);

  // Se um serviço for selecionado externamente pela Central de Serviços
  useEffect(() => {
    if (selectedService && isOpen) {
      const name = selectedService.name || '';
      const rawPrice = selectedService.price || '0,00';
      const priceStr = typeof rawPrice === 'number' ? rawPrice.toFixed(2).replace('.', ',') : String(rawPrice).replace('R$', '').trim();

      setServicesList((prev) => [
        ...prev,
        {
          name,
          price: priceStr || '0,00',
        },
      ]);
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
    safeOrders.forEach((o) => {
      if (!o) return;
      const matchId = clientId && (o.clientId === clientId || o.client?.id === clientId);
      const matchName = clientNameLower && o.client?.name?.trim().toLowerCase() === clientNameLower;
      if (!matchId && !matchName) return;

      const eq = o.equipment;
      if (!eq) return;
      const type = (eq.type || '').trim();
      const brand = (eq.brand || '').trim();
      const model = (eq.model || '').trim();
      const serialNumber = (eq.serialNumber || '').trim();
      if (!type && !brand && !model) return;

      const key = `${type}|${brand}|${model}|${serialNumber}`.toUpperCase();
      if (!list.some((item) => `${item.type}|${item.brand}|${item.model}|${item.serialNumber}`.toUpperCase() === key)) {
        list.push({ type, brand, model, serialNumber });
      }
    });
    return list;
  }, [allOrders, clientData.id, clientData.name]);

  // Cálculos Financeiros
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
  const grandTotalVal = Math.max(0, totalPartsVal + totalServicesVal + travelVal - discountVal);

  // Adicionar Peça
  const handleAddPart = () => {
    if (!newPartName.trim()) {
      return alert('Informe o nome ou descrição da peça.');
    }
    const cleanPrice = newPartPrice.trim() || '0,00';
    setPartsList((prev) => [
      ...prev,
      {
        code: newPartCode.trim(),
        name: newPartName.trim(),
        qty: Math.max(1, newPartQty),
        price: cleanPrice,
      },
    ]);
    setNewPartCode('');
    setNewPartName('');
    setNewPartQty(1);
    setNewPartPrice('');
    setIsDirty(true);
  };

  // Adicionar Serviço
  const handleAddService = () => {
    if (!newServiceName.trim()) {
      return alert('Informe a descrição do serviço.');
    }
    const cleanPrice = newServicePrice.trim() || '0,00';
    setServicesList((prev) => [
      ...prev,
      {
        name: newServiceName.trim(),
        price: cleanPrice,
      },
    ]);
    setNewServiceName('');
    setNewServicePrice('');
    setIsDirty(true);
  };

  // Salvar Orçamento
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!clientData.name.trim()) {
      return alert('Por favor, informe o nome do cliente.');
    }

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
    };

    onSaveEstimate(estimateObj);
    setIsDirty(false);
    onClose();
  };

  // Gerar OS a partir deste orçamento
  const handleGenerateOS = () => {
    const currentEstimate: Estimate = {
      id: estimateToEdit?.id || `est-${Date.now()}`,
      code: activeCode,
      createdAt: estimateToEdit?.createdAt || new Date().toISOString().split('T')[0],
      validityDays,
      status: 'APROVADO',
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

  // Atalhos Globais no Modal (F2: Salvar, Ctrl+P: Imprimir, Esc: Fechar)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrintEstimate('A4');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, clientData, equipmentData, partsList, servicesList, validityDays, estimateStatus, travelCost, discountCost, problemDescription, technicalReport, paymentConditions, notes]);

  // Imprimir Orçamento (A4 ou Térmica 80mm)
  const handlePrintEstimate = (layout: 'A4' | 'THERMAL_80MM' = 'A4') => {
    const printWindow = window.open('', '_blank', 'width=900,height=750');
    if (!printWindow) {
      return alert('Não foi possível abrir a janela de impressão. Desbloqueie pop-ups.');
    }

    const todayStr = new Date().toLocaleDateString('pt-BR');

    if (layout === 'THERMAL_80MM') {
      printWindow.document.write(`
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

            <script>
              window.onload = function() { window.print(); };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      return;
    }

    // Layout Padrão A4
    printWindow.document.write(`
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
            .doc-title { font-size: 18px; font-weight: 900; text-align: right; color: #d97706; }
            .doc-sub { font-size: 11px; text-align: right; color: #64748b; font-weight: bold; }
            .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; margin-bottom: 10px; background-color: #f8fafc; }
            .box-title { font-weight: bold; font-size: 11.5px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 6px; text-transform: uppercase; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; }
            th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; font-size: 10.5px; text-transform: uppercase; color: #334155; }
            td { border: 1px solid #e2e8f0; padding: 4px 6px; font-size: 11px; }
            .total-box { display: flex; justify-content: space-between; align-items: center; border: 2px solid #0f172a; padding: 10px 14px; border-radius: 6px; margin-top: 12px; background: #f8fafc; }
            .total-val { font-size: 18px; font-weight: 900; color: #059669; font-family: monospace; }
            .footer-terms { font-size: 10px; color: #64748b; margin-top: 14px; border: 1px dashed #cbd5e1; padding: 6px 8px; border-radius: 4px; }
            .signatures { margin-top: 35px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; text-align: center; }
            .sig-line { border-top: 1px solid #64748b; padding-top: 4px; font-size: 10px; font-weight: bold; color: #475569; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="border: none; vertical-align: top;">
                <div class="company-name">${companyInfo.name || 'ASSISTÊNCIA TÉCNICA E SERVIÇOS'}</div>
                <div style="font-size: 11px; color: #475569;">
                  ${companyInfo.cnpj ? `CNPJ: ${companyInfo.cnpj} ` : ''}<br/>
                  ${companyInfo.address ? `${companyInfo.address}, ` : ''}${companyInfo.city || ''} - ${companyInfo.state || ''}<br/>
                  ${companyInfo.phone ? `Telefone: ${companyInfo.phone} ` : ''}${companyInfo.whatsapp ? `| WhatsApp: ${companyInfo.whatsapp}` : ''}
                </div>
              </td>
              <td style="border: none; vertical-align: top; text-align: right;">
                <div class="doc-title">ORÇAMENTO #${activeCode}</div>
                <div class="doc-sub">DATA: ${todayStr}</div>
                <div class="doc-sub" style="color: #b45309;">VALIDADE: ${validityDays} DIAS</div>
              </td>
            </tr>
          </table>

          <div class="grid-2">
            <div class="box">
              <div class="box-title">DADOS DO CLIENTE</div>
              <div><strong>Nome:</strong> ${clientData.name}</div>
              <div><strong>Telefone / WhatsApp:</strong> ${clientData.phone || ''} ${clientData.whatsapp ? `/ ${clientData.whatsapp}` : ''}</div>
              <div><strong>Endereço:</strong> ${clientData.address || ''} ${clientData.number ? `, Nº ${clientData.number}` : ''}</div>
              <div><strong>Bairro/Cidade:</strong> ${clientData.neighborhood || ''} - ${clientData.city || ''} / ${clientData.state || ''}</div>
            </div>

            <div class="box">
              <div class="box-title">EQUIPAMENTO & DIAGNÓSTICO</div>
              <div><strong>Equipamento:</strong> ${equipmentData.type || '-'} | <strong>Marca:</strong> ${equipmentData.brand || '-'}</div>
              <div><strong>Modelo:</strong> ${equipmentData.model || '-'}</div>
              <div><strong>Nº de Série:</strong> ${equipmentData.serialNumber || '-'}</div>
              <div style="margin-top: 4px;"><strong>Defeito Reclamado:</strong> ${problemDescription || 'Avaliação solicitada pelo cliente'}</div>
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

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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

            <button
              type="button"
              onClick={onClose}
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
                      setClientData({ ...clientData, phone: e.target.value });
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
                      setClientData({ ...clientData, whatsapp: e.target.value });
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
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Defeito Reclamado pelo Cliente</label>
                  <input
                    type="text"
                    value={problemDescription}
                    onChange={(e) => {
                      setProblemDescription(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Ex: Não liga, faz barulho ao centrifugar, vazamento de água..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-amber-600"
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddService();
                      }
                    }}
                    placeholder="Valor R$"
                    className="w-24 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-right font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-sky-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddService}
                    className="bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                    title="Adicionar serviço (Enter)"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>

                {/* Lista de Serviços em Tabela */}
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
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
                          <td colSpan={3} className="p-3 text-center text-slate-400 italic">
                            Nenhum serviço adicionado
                          </td>
                        </tr>
                      ) : (
                        servicesList.map((srv, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-1.5 font-medium text-slate-800">{srv.name}</td>
                            <td className="p-1.5 font-bold font-mono text-right text-slate-900">R$ {srv.price}</td>
                            <td className="p-1.5 text-center">
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

                {/* Form Adicionar Peça */}
                <div className="grid grid-cols-12 gap-1.5 mb-2">
                  <input
                    type="text"
                    value={newPartCode}
                    onChange={(e) => setNewPartCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPart();
                      }
                    }}
                    placeholder="Cód."
                    className="col-span-2 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-600"
                  />
                  <input
                    type="text"
                    value={newPartName}
                    onChange={(e) => setNewPartName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPart();
                      }
                    }}
                    placeholder="Nome da peça..."
                    className="col-span-5 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-600"
                  />
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
                    className="col-span-2 bg-slate-50 border border-slate-300 rounded-lg px-1.5 py-1 text-xs text-center font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-600"
                  />
                  <input
                    type="text"
                    value={newPartPrice}
                    onChange={(e) => setNewPartPrice(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPart();
                      }
                    }}
                    placeholder="Unit. R$"
                    className="col-span-3 bg-slate-50 border border-slate-300 rounded-lg px-1.5 py-1 text-xs text-right font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-600"
                  />
                </div>
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={handleAddPart}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow-xs text-xs"
                    title="Adicionar peça (Enter)"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Peça
                  </button>
                </div>

                {/* Lista de Peças em Tabela */}
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 text-[10.5px]">
                      <tr>
                        <th className="p-1.5 border-b border-slate-200 w-16">Cód</th>
                        <th className="p-1.5 border-b border-slate-200">Descrição</th>
                        <th className="p-1.5 border-b border-slate-200 text-center w-10">Qtd</th>
                        <th className="p-1.5 border-b border-slate-200 text-right w-16">Unit.</th>
                        <th className="p-1.5 border-b border-slate-200 text-right w-20">Total</th>
                        <th className="p-1.5 border-b border-slate-200 text-center w-8">Ação</th>
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
                              <td className="p-1.5 font-mono text-[10.5px] text-slate-500">{pt.code || '-'}</td>
                              <td className="p-1.5 font-medium text-slate-800">{pt.name}</td>
                              <td className="p-1.5 text-center font-bold text-slate-700">{pt.qty}</td>
                              <td className="p-1.5 text-right text-slate-600 font-mono">R$ {pt.price}</td>
                              <td className="p-1.5 text-right font-bold text-slate-900 font-mono">R$ {tVal.toFixed(2).replace('.', ',')}</td>
                              <td className="p-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
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

          {/* 3. TOTALIZADOR FINANCEIRO & CONDIÇÕES */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <div>
              <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Validade do Orçamento</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={validityDays}
                  onChange={(e) => {
                    setValidityDays(parseInt(e.target.value, 10) || 10);
                    setIsDirty(true);
                  }}
                  className="w-20 bg-slate-50 border border-slate-300 rounded-lg p-1 text-center font-bold text-slate-900 focus:bg-white focus:outline-none"
                />
                <span className="font-bold text-slate-600 text-xs">Dias</span>
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Deslocamento (R$)</label>
              <input
                type="text"
                value={travelCost}
                onChange={(e) => {
                  setTravelCost(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="0,00"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1 text-right font-bold text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Desconto (R$)</label>
              <input
                type="text"
                value={discountCost}
                onChange={(e) => {
                  setDiscountCost(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="0,00"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1 text-right font-bold text-red-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-right shadow-2xs">
              <span className="text-[10.5px] font-bold text-emerald-800 uppercase block">VALOR TOTAL DO ORÇAMENTO</span>
              <span className="text-xl font-black font-mono text-emerald-700">
                R$ {grandTotalVal.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé de Ações com Botões Principais */}
        <div className="p-3 bg-slate-100 border-t border-slate-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-all cursor-pointer text-xs"
            >
              Cancelar
            </button>

            {estimateToEdit && onDeleteEstimate && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Deseja realmente EXCLUIR o orçamento #${estimateToEdit.code}?`)) {
                    onDeleteEstimate(estimateToEdit.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Orçamento
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer text-xs"
              title="Enviar orçamento formatado no WhatsApp do cliente"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-200" />
              WhatsApp
            </button>

            {/* Imprimir Térmica */}
            <button
              type="button"
              onClick={() => handlePrintEstimate('THERMAL_80MM')}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer text-xs"
              title="Imprimir cupom de balcão para impressora térmica 80mm / 58mm"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              Térmica
            </button>

            {/* Imprimir Orçamento A4 */}
            <button
              type="button"
              onClick={() => handlePrintEstimate('A4')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer text-xs"
              title="Imprimir folha A4 (Ctrl+P)"
            >
              <Printer className="w-4 h-4" />
              Imprimir A4
            </button>

            {/* Gerar OS a partir do Orçamento */}
            <button
              type="button"
              onClick={handleGenerateOS}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer text-xs hover:scale-102 active:scale-98"
              title="Abre a ficha de OS preenchida com este cliente, aparelho, peças e serviços e exclui o orçamento após salvar"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              Gerar OS
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Salvar Orçamento */}
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer text-xs"
              title="Salvar Orçamento (F2)"
            >
              <Save className="w-4 h-4" />
              Salvar (F2)
            </button>
          </div>
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
      </div>
    </div>
  );
};
