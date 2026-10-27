import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  ShoppingCart,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Building2,
  PackageCheck,
  Send,
  Printer,
  FileSpreadsheet,
  Calendar,
  MessageCircle,
  Truck,
  DollarSign,
  Layers,
  ArrowDownToLine,
  RefreshCw,
  Trash2,
  FileDown,
  Eye,
  Search,
  Sparkles,
  ShoppingBag,
  Clock,
  Check,
  CreditCard,
  Receipt,
  Edit3,
  HelpCircle,
  AlertCircle,
  Tag,
  Plus,
} from 'lucide-react';
import { modalStack } from '../utils/modalStack';
import { useDialog } from './DialogContext';
import { Part } from './PartsModal';
import { SupplierItem } from './SuppliersModal';
import { CompanyData } from './CompanyModal';
import { formatCanonicalCode } from '../utils/searchUtils';

export interface PurchaseOrderItem {
  partId: string;
  partCode: string;
  partName: string;
  currentStock: number;
  minStock: number;
  suggestedQty: number;
  orderQty: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  code: string;
  createdAt: string;
  supplierId?: string;
  supplierName: string;
  supplierPhone?: string;
  supplierWhatsapp?: string;
  supplierEmail?: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  shippingCost?: number;
  paymentMethod?: string;
  expectedDeliveryDate?: string;
  status: 'RASCUNHO' | 'ENVIADO' | 'RECEBIDO_PARCIAL' | 'RECEBIDO_TOTAL' | 'CANCELADO';
  notes?: string;
  financialEntryCreated?: boolean;
  receivedAt?: string;
}

interface PurchaseOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  suppliers: SupplierItem[];
  companyInfo?: CompanyData;
  onSaveParts: (updatedParts: Part[]) => Promise<void>;
  initialTab?: 'auto_generator' | 'custom_order' | 'orders_list' | 'receiving';
}

export const PurchaseOrdersModal: React.FC<PurchaseOrdersModalProps> = ({
  isOpen,
  onClose,
  parts,
  suppliers,
  companyInfo,
  onSaveParts,
  initialTab = 'orders_list',
}) => {
  const { alert, confirm } = useDialog();

  const [activeTab, setActiveTab] = useState<'auto_generator' | 'custom_order' | 'orders_list' | 'receiving'>(initialTab);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_purchase_orders_v4');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [selectedOrderToView, setSelectedOrderToView] = useState<PurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Estado para Nova Ordem de Compra Personalizada
  const [customOrderSupplierId, setCustomOrderSupplierId] = useState<string>('');
  const [customOrderItems, setCustomOrderItems] = useState<PurchaseOrderItem[]>([]);
  const [customPaymentMethod, setCustomPaymentMethod] = useState<string>('BOLETO');
  const [customExpectedDelivery, setCustomExpectedDelivery] = useState<string>('');
  const [customShippingCost, setCustomShippingCost] = useState<string>('0,00');
  const [customOrderNotes, setCustomOrderNotes] = useState<string>('');
  const [partSearchQuery, setPartSearchQuery] = useState<string>('');
  const [isSearchingPart, setIsSearchingPart] = useState<boolean>(false);

  // Sincronização de modalStack para fechar com ESC
  useEffect(() => {
    if (isOpen) {
      modalStack.register('PurchaseOrdersModal', onClose);
    } else {
      modalStack.unregister('PurchaseOrdersModal');
    }
    return () => {
      modalStack.unregister('PurchaseOrdersModal');
    };
  }, [isOpen, onClose]);

  // Atualiza a aba inicial caso seja solicitada via prop
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Salva no localStorage sempre que houver alteração
  const savePurchaseOrders = (updated: PurchaseOrder[]) => {
    setPurchaseOrders(updated);
    try {
      localStorage.setItem('vollen_purchase_orders_v4', JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao persistir ordens de compra:', e);
    }
  };

  // ─── 1. VARREDURA INTELIGENTE DE PEÇAS ABAIXO DO MÍNIMO ───
  const lowStockItems = useMemo(() => {
    return parts.filter((p) => {
      const qty = Number(p.stockQuantity !== undefined ? p.stockQuantity : 0);
      const minQty = Number(p.minStock !== undefined ? p.minStock : 0);
      return qty <= minQty || qty <= 0;
    });
  }, [parts]);

  // Itens sugeridos filtrados pelo fornecedor selecionado
  const [autoOrderItems, setAutoOrderItems] = useState<PurchaseOrderItem[]>([]);

  useEffect(() => {
    const items: PurchaseOrderItem[] = lowStockItems
      .filter((p) => {
        if (!selectedSupplierId) return true;
        return p.supplierId === selectedSupplierId;
      })
      .map((p) => {
        const qty = Number(p.stockQuantity || 0);
        const minQty = Number(p.minStock || 0);
        const needed = Math.max(1, (minQty * 2) - qty); // Sugestão inteligente: repor até o dobro do mínimo
        const cost = parseFloat(String(p.costPrice || '0').replace(/\./g, '').replace(',', '.')) || 0;

        return {
          partId: p.id,
          partCode: p.code || '000',
          partName: p.name,
          currentStock: qty,
          minStock: minQty,
          suggestedQty: needed,
          orderQty: needed,
          unitCost: cost,
          totalCost: needed * cost,
        };
      });

    setAutoOrderItems(items);
  }, [lowStockItems, selectedSupplierId]);

  // ─── BUSCA DE PEÇAS PARA NOVA ORDEM DE COMPRA ───
  const filteredAvailableParts = parts.filter((p) => {
    if (!partSearchQuery.trim()) return false;
    const q = partSearchQuery.toLowerCase();
    const nameMatch = (p.name || '').toLowerCase().includes(q);
    const codeMatch = (p.code || '').toLowerCase().includes(q);
    const barcodeMatch = (p.barcode || '').toLowerCase().includes(q);
    const brandMatch = (p.brand || '').toLowerCase().includes(q);
    const groupMatch = (p.group || '').toLowerCase().includes(q);
    return nameMatch || codeMatch || barcodeMatch || brandMatch || groupMatch;
  }).slice(0, 8);

  const handleAddPartToCustomOrder = (part: Part) => {
    const cost = parseFloat(String(part.costPrice || '0').replace(/\./g, '').replace(',', '.')) || 0;
    const existingIdx = customOrderItems.findIndex((i) => i.partId === part.id);

    if (existingIdx >= 0) {
      setCustomOrderItems((prev) => {
        const copy = [...prev];
        const newQty = copy[existingIdx].orderQty + 1;
        copy[existingIdx] = {
          ...copy[existingIdx],
          orderQty: newQty,
          totalCost: newQty * copy[existingIdx].unitCost,
        };
        return copy;
      });
    } else {
      const newItem: PurchaseOrderItem = {
        partId: part.id,
        partCode: part.code || '000',
        partName: part.name,
        currentStock: Number(part.stockQuantity || 0),
        minStock: Number(part.minStock || 0),
        suggestedQty: 1,
        orderQty: 1,
        unitCost: cost,
        totalCost: 1 * cost,
      };
      setCustomOrderItems((prev) => [...prev, newItem]);
    }
    setPartSearchQuery('');
    setIsSearchingPart(false);
  };

  // ─── CRIAÇÃO DE ORDEM DE COMPRA (AUTOMÁTICA OU MANUAL) ───
  const handleCreateOrderFromItems = async (
    itemsList: PurchaseOrderItem[],
    supplierId?: string,
    notes?: string,
    payMethod?: string,
    expectedDate?: string,
    shipping?: number
  ) => {
    const validItems = itemsList
      .filter((i) => Number(i.orderQty) > 0)
      .map((i) => ({
        ...i,
        orderQty: Number(i.orderQty),
        totalCost: Number(i.orderQty) * Number(i.unitCost),
      }));

    if (validItems.length === 0) {
      alert({
        title: 'Nenhum item selecionado',
        message: 'Defina ao menos um item com quantidade maior que zero para gerar o pedido de compra.',
        variant: 'warning',
      });
      return;
    }

    const sup = suppliers.find((s) => s.id === supplierId);
    const newCode = `OC-${String(purchaseOrders.length + 1).padStart(4, '0')}`;
    const totalItemsCost = validItems.reduce((s, i) => s + i.totalCost, 0);
    const totalWithShipping = totalItemsCost + (shipping || 0);

    const newOrder: PurchaseOrder = {
      id: `po_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: newCode,
      createdAt: new Date().toISOString(),
      supplierId: supplierId || undefined,
      supplierName: sup?.tradeName || sup?.name || 'Fornecedores Diversos',
      supplierPhone: sup?.phone,
      supplierWhatsapp: sup?.whatsapp,
      supplierEmail: sup?.email,
      items: validItems,
      totalAmount: totalWithShipping,
      shippingCost: shipping || 0,
      paymentMethod: payMethod || 'BOLETO',
      expectedDeliveryDate: expectedDate || undefined,
      notes: notes || undefined,
      status: 'ENVIADO',
    };

    const updated = [newOrder, ...purchaseOrders];
    savePurchaseOrders(updated);

    // Limpa estado da ordem personalizada se aplicável
    setCustomOrderItems([]);
    setCustomOrderNotes('');
    setCustomExpectedDelivery('');

    setSelectedOrderToView(newOrder);
    setActiveTab('orders_list');

    const wantPrint = await confirm({
      title: 'Ordem de Compra Emitida!',
      message: `A Ordem de Compra ${newCode} foi gerada com sucesso no valor de R$ ${totalWithShipping.toFixed(2).replace('.', ',')}!\n\nDeseja enviar via WhatsApp ou Imprimir em PDF agora?`,
      confirmText: 'Enviar / Imprimir',
      cancelText: 'Concluir',
    });

    if (wantPrint) {
      if (newOrder.supplierWhatsapp || newOrder.supplierPhone) {
        handleSendViaWhatsApp(newOrder);
      } else {
        handlePrintOrSaveOrderPDF(newOrder);
      }
    }
  };

  // ─── ENVIO POR WHATSAPP COM FORMATAÇÃO PROFISSIONAL ───
  const handleSendViaWhatsApp = (order: PurchaseOrder) => {
    const validItems = (order.items || []).filter((i) => Number(i.orderQty) > 0);
    const totalOrderAmount = order.totalAmount;

    const lines = [
      `*📦 PEDIDO DE COMPRA / ORDEM DE COMPRA: ${order.code}*`,
      `🏢 *Empresa Compradora:* ${companyInfo?.tradingName || companyInfo?.name || 'Assistência Técnica'}`,
      `📅 *Data de Emissão:* ${new Date(order.createdAt).toLocaleDateString('pt-BR')}`,
      order.paymentMethod ? `💳 *Condição de Pagamento:* ${order.paymentMethod}` : '',
      order.expectedDeliveryDate ? `🚚 *Previsão Desejada:* ${new Date(order.expectedDeliveryDate).toLocaleDateString('pt-BR')}` : '',
      '',
      `*ITENS DO PEDIDO:*`,
      ...validItems.map(
        (i, idx) =>
          `${idx + 1}. [Cód: ${i.partCode}] *${i.partName}*\n   ↳ Quantidade: *${i.orderQty} un* | Custo: R$ ${Number(i.unitCost).toFixed(2).replace('.', ',')}/un | Subtotal: R$ ${Number(i.totalCost).toFixed(2).replace('.', ',')}`
      ),
      '',
      order.shippingCost ? `🚚 *Frete:* R$ ${Number(order.shippingCost).toFixed(2).replace('.', ',')}` : '',
      `💰 *VALOR TOTAL DO PEDIDO:* R$ ${totalOrderAmount.toFixed(2).replace('.', ',')}`,
      order.notes ? `\n📝 *Observações:* ${order.notes}` : '',
      '',
      `Por favor, confirme o recebimento deste pedido e a estimativa de entrega. Obrigado!`,
    ].filter(Boolean);

    const message = encodeURIComponent(lines.join('\n'));
    const phoneClean = (order.supplierWhatsapp || order.supplierPhone || '').replace(/\D/g, '');
    const url = phoneClean ? `https://wa.me/55${phoneClean}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  // ─── RECEBIMENTO DE MERCADORIA & INTEGRAÇÃO FINANCEIRA / ESTOQUE ───
  const handleReceiveOrderStock = async (order: PurchaseOrder) => {
    const ok = await confirm({
      title: 'Receber Mercadorias da OC',
      message: `Deseja dar entrada no estoque para os ${order.items.length} itens da Ordem ${order.code}?\n\nO saldo das peças será somado imediatamente ao estoque.`,
      confirmText: 'Confirmar Entrada',
    });
    if (!ok) return;

    // 1. Atualiza Estoque de Peças
    let updatedParts = [...parts];
    for (const item of order.items) {
      const idx = updatedParts.findIndex((p) => p.id === item.partId);
      if (idx >= 0) {
        const currentPart = updatedParts[idx];
        const currentQty = Number(currentPart.stockQuantity || 0);
        updatedParts[idx] = {
          ...currentPart,
          stockQuantity: currentQty + Number(item.orderQty),
          costPrice: item.unitCost > 0 ? item.unitCost.toFixed(2).replace('.', ',') : currentPart.costPrice,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    await onSaveParts(updatedParts);

    // 2. Opção de Integração Financeira Automática
    const shouldAddPayable = await confirm({
      title: 'Lançar no Financeiro (Contas a Pagar)?',
      message: `Deseja gerar automaticamente uma conta a pagar no valor de R$ ${order.totalAmount.toFixed(2).replace('.', ',')} para o fornecedor "${order.supplierName}"?`,
      confirmText: 'Sim, Lançar no Contas a Pagar',
      cancelText: 'Apenas Atualizar Estoque',
    });

    if (shouldAddPayable) {
      try {
        const rawBills = localStorage.getItem('vollen_accounts_bills');
        const bills = rawBills ? JSON.parse(rawBills) : [];
        const newBill = {
          id: `bill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'PAGAR',
          description: `Compra de Peças - ${order.code}`,
          entityName: order.supplierName || 'Fornecedor de Peças',
          entityId: order.supplierId,
          documentNumber: order.code,
          category: 'Peças e Estoque',
          amount: order.totalAmount,
          dueDate: order.expectedDeliveryDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          status: 'PENDENTE',
          paymentMethod: order.paymentMethod || 'BOLETO',
          notes: `Lançado automaticamente pelo recebimento da Ordem de Compra ${order.code}`,
          createdAt: new Date().toISOString(),
        };
        bills.push(newBill);
        localStorage.setItem('vollen_accounts_bills', JSON.stringify(bills));
      } catch (e) {
        console.warn('Erro ao lançar conta a pagar:', e);
      }
    }

    // 3. Atualiza status da OC para RECEBIDO_TOTAL
    const updatedPOs = purchaseOrders.map((po) =>
      po.id === order.id
        ? {
            ...po,
            status: 'RECEBIDO_TOTAL' as const,
            financialEntryCreated: shouldAddPayable,
            receivedAt: new Date().toISOString(),
          }
        : po
    );
    savePurchaseOrders(updatedPOs);

    alert({
      title: 'Mercadorias Recebidas!',
      message: `As peças foram adicionadas ao estoque com sucesso.${shouldAddPayable ? ' Conta a pagar gerada no módulo Financeiro.' : ''}`,
      variant: 'success',
    });
  };

  // ─── EXCLUSÃO & CANCELAMENTO DE ORDENS DE COMPRA ───
  const handleDeleteOrder = async (order: PurchaseOrder) => {
    const isReceived = order.status === 'RECEBIDO_TOTAL';

    if (isReceived) {
      const confirmRevert = await confirm({
        title: 'Excluir Ordem de Compra Recebida',
        message: `Atenção: A Ordem ${order.code} já foi RECEBIDA e suas peças entraram no estoque.\n\nDeseja ESTORNAR (remover) do estoque a quantidade das peças que entraram nesta compra?`,
        confirmText: 'Sim, Estornar Estoque e Excluir',
        cancelText: 'Apenas Excluir Registro (Manter Estoque)',
      });

      // Se confirmou estorno do estoque
      if (confirmRevert) {
        let updatedParts = [...parts];
        for (const item of order.items) {
          const idx = updatedParts.findIndex((p) => p.id === item.partId);
          if (idx >= 0) {
            const currentPart = updatedParts[idx];
            const currentQty = Number(currentPart.stockQuantity || 0);
            const newQty = Math.max(0, currentQty - Number(item.orderQty || 0));
            updatedParts[idx] = {
              ...currentPart,
              stockQuantity: newQty,
              updatedAt: new Date().toISOString(),
            };
          }
        }
        await onSaveParts(updatedParts);
      }
    } else {
      const ok = await confirm({
        title: 'Excluir Ordem de Compra',
        message: `Tem certeza que deseja excluir permanentemente a Ordem de Compra ${order.code} (${order.supplierName}) no valor de R$ ${order.totalAmount.toFixed(2).replace('.', ',')}?`,
        confirmText: 'Sim, Excluir',
        cancelText: 'Cancelar',
      });
      if (!ok) return;
    }

    // Remove conta a pagar gerada automaticamente vinculada a esta OC
    try {
      const rawBills = localStorage.getItem('vollen_accounts_bills');
      if (rawBills) {
        const bills = JSON.parse(rawBills);
        const filteredBills = bills.filter((b: any) => b.documentNumber !== order.code);
        localStorage.setItem('vollen_accounts_bills', JSON.stringify(filteredBills));
      }
    } catch (e) {
      console.warn('Erro ao limpar conta a pagar vinculada:', e);
    }

    const remaining = purchaseOrders.filter((po) => po.id !== order.id);
    savePurchaseOrders(remaining);
    if (selectedOrderToView?.id === order.id) {
      setSelectedOrderToView(null);
    }
    alert({
      title: 'Ordem Excluída',
      message: `A Ordem de Compra ${order.code} foi excluída com sucesso.`,
    });
  };

  const handleCancelOrder = async (order: PurchaseOrder) => {
    const ok = await confirm({
      title: 'Cancelar Ordem de Compra',
      message: `Deseja alterar o status da Ordem ${order.code} para "CANCELADO"?`,
      confirmText: 'Confirmar Cancelamento',
      cancelText: 'Voltar',
    });
    if (!ok) return;

    const updated = purchaseOrders.map((po) =>
      po.id === order.id ? { ...po, status: 'CANCELADO' as const } : po
    );
    savePurchaseOrders(updated);
    if (selectedOrderToView?.id === order.id) {
      setSelectedOrderToView({ ...selectedOrderToView, status: 'CANCELADO' });
    }
    alert({
      title: 'Ordem Cancelada',
      message: `A Ordem de Compra ${order.code} agora está marcada como Cancelada.`,
    });
  };

  const handleClearCanceledOrders = async () => {
    const canceledCount = purchaseOrders.filter((po) => po.status === 'CANCELADO').length;
    if (canceledCount === 0) {
      alert({
        title: 'Nenhuma Ordem Cancelada',
        message: 'Não há ordens de compra com status Cancelado para remover.',
      });
      return;
    }

    const ok = await confirm({
      title: 'Limpar Ordens Canceladas',
      message: `Deseja excluir permanentemente todas as ${canceledCount} ordens de compra canceladas?`,
      confirmText: `Excluir ${canceledCount} Canceladas`,
      cancelText: 'Voltar',
    });
    if (!ok) return;

    const remaining = purchaseOrders.filter((po) => po.status !== 'CANCELADO');
    savePurchaseOrders(remaining);
    alert({
      title: 'Ordens Canceladas Removidas',
      message: `${canceledCount} ordem(ns) cancelada(s) foram excluídas com sucesso.`,
    });
  };

  // ─── IMPRESSÃO EM PDF DO PEDIDO DE COMPRA ───
  const handlePrintOrSaveOrderPDF = (order: PurchaseOrder) => {
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) {
      alert({
        title: 'Pop-up Bloqueado',
        message: 'Por favor, permita pop-ups no navegador para visualizar a impressão.',
        variant: 'warning',
      });
      return;
    }

    const validItems = (order.items || []).filter((i) => Number(i.orderQty) > 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Ordem de Compra - ${order.code}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1e293b; background: #fff; font-size: 12px; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .company-name { font-size: 18px; font-weight: 800; color: #0f172a; }
          .order-badge { background: #e0f2fe; color: #0369a1; padding: 6px 14px; border-radius: 8px; font-size: 14px; font-weight: 800; text-align: right; }
          .section-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
          .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f1f5f9; color: #475569; font-weight: 700; text-align: left; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; font-size: 11px; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; }
          .total-box { margin-left: auto; width: 300px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
          .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-weight: 600; }
          .total-final { border-top: 2px solid #0284c7; padding-top: 6px; margin-top: 4px; font-size: 14px; font-weight: 800; color: #0f172a; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; }
          .sig-line { width: 45%; border-top: 1px solid #94a3b8; text-align: center; font-size: 11px; color: #64748b; padding-top: 6px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">${companyInfo?.tradingName || companyInfo?.name || 'Assistência Técnica Especializada'}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
              CNPJ: ${companyInfo?.cnpj || 'Não Informado'} | Fone: ${companyInfo?.phone || companyInfo?.whatsapp || '--'}
            </div>
            <div style="font-size: 11px; color: #64748b;">${companyInfo?.address || ''} ${companyInfo?.number ? ', ' + companyInfo.number : ''} - ${companyInfo?.city || ''}/${companyInfo?.state || ''}</div>
          </div>
          <div class="order-badge">
            ORDEM DE COMPRA<br>
            <span style="font-size: 18px; color: #0284c7;">${order.code}</span>
          </div>
        </div>

        <div class="info-box">
          <div>
            <div class="section-title">Dados do Fornecedor</div>
            <div><strong>Fornecedor:</strong> ${order.supplierName}</div>
            <div><strong>Telefone:</strong> ${order.supplierPhone || order.supplierWhatsapp || 'Não Informado'}</div>
            <div><strong>E-mail:</strong> ${order.supplierEmail || 'Não Informado'}</div>
          </div>
          <div>
            <div class="section-title">Condições do Pedido</div>
            <div><strong>Data de Emissão:</strong> ${new Date(order.createdAt).toLocaleDateString('pt-BR')} às ${new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            <div><strong>Forma de Pagamento:</strong> ${order.paymentMethod || 'A Combinar'}</div>
            <div><strong>Previsão de Entrega:</strong> ${order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString('pt-BR') : 'Imediata'}</div>
          </div>
        </div>

        <div class="section-title">Itens e Peças Solicitadas</div>
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">Item</th>
              <th style="width: 100px;">Código</th>
              <th>Descrição da Peça</th>
              <th style="text-align: center; width: 80px;">Qtd. Pedida</th>
              <th style="text-align: right; width: 110px;">Custo Unit. (R$)</th>
              <th style="text-align: right; width: 120px;">Subtotal (R$)</th>
            </tr>
          </thead>
          <tbody>
            ${validItems
              .map(
                (item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${item.partCode}</strong></td>
                <td>${item.partName}</td>
                <td style="text-align: center; font-weight: bold; font-size: 12.5px;">${item.orderQty}</td>
                <td style="text-align: right;">R$ ${Number(item.unitCost).toFixed(2).replace('.', ',')}</td>
                <td style="text-align: right; font-weight: bold;">R$ ${Number(item.totalCost).toFixed(2).replace('.', ',')}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-row">
            <span>Subtotal dos Itens:</span>
            <span>R$ ${(order.totalAmount - (order.shippingCost || 0)).toFixed(2).replace('.', ',')}</span>
          </div>
          ${
            order.shippingCost
              ? `
            <div class="total-row">
              <span>Frete:</span>
              <span>R$ ${Number(order.shippingCost).toFixed(2).replace('.', ',')}</span>
            </div>
          `
              : ''
          }
          <div class="total-row total-final">
            <span>TOTAL DO PEDIDO:</span>
            <span>R$ ${Number(order.totalAmount).toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        ${
          order.notes
            ? `
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px; margin-bottom: 20px; font-size: 11px;">
            <strong>Observações do Pedido:</strong> ${order.notes}
          </div>
        `
            : ''
        }

        <div class="signatures">
          <div class="sig-line">
            Responsável pelas Compras<br>
            <strong>${companyInfo?.tradingName || companyInfo?.name || 'Comprador'}</strong>
          </div>
          <div class="sig-line">
            Aceite do Fornecedor<br>
            <strong>${order.supplierName}</strong>
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

  // ─── MÉTRICAS RÁPIDAS PARA O PAINEL DE COMPRAS ───
  const metrics = useMemo(() => {
    const totalOrders = purchaseOrders.length;
    const pendingOrders = purchaseOrders.filter((po) => po.status !== 'RECEBIDO_TOTAL' && po.status !== 'CANCELADO').length;
    const totalSpent = purchaseOrders
      .filter((po) => po.status === 'RECEBIDO_TOTAL')
      .reduce((sum, po) => sum + po.totalAmount, 0);
    const criticalPartsCount = lowStockItems.length;

    return { totalOrders, pendingOrders, totalSpent, criticalPartsCount };
  }, [purchaseOrders, lowStockItems]);

  // Filtragem de Ordens na Lista
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (statusFilter !== 'ALL' && po.status !== statusFilter) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const codeMatch = (po.code || '').toLowerCase().includes(q);
      const supMatch = (po.supplierName || '').toLowerCase().includes(q);
      return codeMatch || supMatch;
    });
  }, [purchaseOrders, statusFilter, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* CABEÇALHO DO MÓDULO DE COMPRAS */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-800/40 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/30 border border-indigo-400/40 rounded-xl shadow-inner">
              <ShoppingBag className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                Módulo de Compras & Ordens de Compra
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Enterprise
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Gestão inteligente de compras, reposição automática de estoque e integração financeira
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CARDS DE MÉTRICAS RÁPIDAS NO TOPO */}
        <div className="bg-slate-100/80 border-b border-slate-200 px-5 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2 bg-amber-50 border border-amber-200 text-amber-600 rounded-lg shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500">Peças Abaixo do Mínimo</div>
              <div className="text-sm font-extrabold text-slate-800">{metrics.criticalPartsCount} itens</div>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2 bg-sky-50 border border-sky-200 text-sky-600 rounded-lg shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500">Ordens Pendentes</div>
              <div className="text-sm font-extrabold text-sky-700">{metrics.pendingOrders} pedidos</div>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg shrink-0">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500">Total de Ordens Emitidas</div>
              <div className="text-sm font-extrabold text-slate-800">{metrics.totalOrders} ordens</div>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500">Total Recebido / Concluído</div>
              <div className="text-sm font-extrabold text-emerald-700">
                R$ {metrics.totalSpent.toFixed(2).replace('.', ',')}
              </div>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE ABAS */}
        <div className="bg-slate-200 border-b border-slate-300 px-5 pt-2 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('orders_list')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'orders_list'
                ? 'bg-white text-indigo-700 shadow-xs border-t-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Ordens de Compra ({purchaseOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('custom_order')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'custom_order'
                ? 'bg-white text-indigo-700 shadow-xs border-t-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Nova Ordem de Compra</span>
          </button>

          <button
            onClick={() => setActiveTab('auto_generator')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'auto_generator'
                ? 'bg-white text-amber-700 shadow-xs border-t-2 border-amber-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Sugestão Inteligente de Reposição</span>
            {lowStockItems.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                {lowStockItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('receiving')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'receiving'
                ? 'bg-white text-emerald-700 shadow-xs border-t-2 border-emerald-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
            }`}
          >
            <PackageCheck className="w-4 h-4 text-emerald-600" />
            <span>Recebimento / Entrada de Mercadoria</span>
          </button>
        </div>

        {/* CONTEÚDO DA ABA ATIVA */}
        <div className="p-5 flex-1 overflow-y-auto bg-slate-50 min-h-[400px]">
          {/* ══════════ ABA 1: HISTÓRICO & GESTÃO DE ORDENS DE COMPRA ══════════ */}
          {activeTab === 'orders_list' && (
            <div className="space-y-4">
              {/* BARRA DE FILTROS E BUSCA */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar por código da OC (ex: OC-0001) ou nome do fornecedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-600 shrink-0">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="ALL">Todos os Status</option>
                    <option value="ENVIADO">Enviado / Aguardando</option>
                    <option value="RECEBIDO_TOTAL">Recebido (Concluído)</option>
                    <option value="RASCUNHO">Rascunho</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>

                  {purchaseOrders.some((po) => po.status === 'CANCELADO') && (
                    <button
                      onClick={handleClearCanceledOrders}
                      className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      title="Excluir todas as ordens canceladas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Limpar Canceladas
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('custom_order')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Pedido
                  </button>
                </div>
              </div>

              {/* LISTA DE ORDENS EM TABELA MODERNA */}
              {filteredOrders.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-3">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700">Nenhuma Ordem de Compra Encontrada</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Você ainda não gerou pedidos de compra ou nenhum resultado corresponde aos filtros aplicados.
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      onClick={() => setActiveTab('auto_generator')}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      Gerar Reposição Automática
                    </button>
                    <button
                      onClick={() => setActiveTab('custom_order')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Criar Pedido Manual
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3">Código OC</th>
                        <th className="p-3">Data</th>
                        <th className="p-3">Fornecedor</th>
                        <th className="p-3 text-center">Qtd. Itens</th>
                        <th className="p-3 text-right">Valor Total (R$)</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.map((order) => {
                        const isReceived = order.status === 'RECEBIDO_TOTAL';
                        return (
                          <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-mono font-extrabold text-indigo-700">
                              {order.code}
                            </td>
                            <td className="p-3 text-slate-600">
                              {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="p-3 font-semibold text-slate-800">
                              {order.supplierName}
                            </td>
                            <td className="p-3 text-center font-bold text-slate-700">
                              {order.items.reduce((s, i) => s + Number(i.orderQty || 0), 0)} un ({order.items.length} itens)
                            </td>
                            <td className="p-3 text-right font-mono font-extrabold text-slate-900">
                              R$ {order.totalAmount.toFixed(2).replace('.', ',')}
                            </td>
                            <td className="p-3 text-center">
                              {isReceived ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                                  <CheckCircle2 className="w-3 h-3" /> Recebido
                                </span>
                              ) : order.status === 'CANCELADO' ? (
                                <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                                  <X className="w-3 h-3" /> Cancelado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                                  <Clock className="w-3 h-3" /> Aguardando
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedOrderToView(order)}
                                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                  title="Ver Detalhes do Pedido"
                                >
                                  <Eye className="w-4 h-4 text-indigo-600" />
                                </button>
                                <button
                                  onClick={() => handleSendViaWhatsApp(order)}
                                  className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors cursor-pointer"
                                  title="Enviar via WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handlePrintOrSaveOrderPDF(order)}
                                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
                                  title="Imprimir / Salvar PDF"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                {!isReceived && (
                                  <button
                                    onClick={() => handleReceiveOrderStock(order)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                    title="Dar Entrada no Estoque"
                                  >
                                    <PackageCheck className="w-3.5 h-3.5" />
                                    Receber
                                  </button>
                                )}
                                {!isReceived && order.status !== 'CANCELADO' && (
                                  <button
                                    onClick={() => handleCancelOrder(order)}
                                    className="p-1.5 hover:bg-amber-100 rounded-lg text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                                    title="Cancelar Ordem"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteOrder(order)}
                                  className="p-1.5 hover:bg-red-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Excluir Ordem de Compra"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════ ABA 2: NOVA ORDEM DE COMPRA (PERSONALIZADA) ══════════ */}
          {activeTab === 'custom_order' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Emissão de Ordem de Compra Personalizada</h3>
                  <p className="text-xs text-slate-500">Selecione o fornecedor e adicione as peças desejadas para o pedido</p>
                </div>
              </div>

              {/* CABEÇALHO DO PEDIDO: FORNECEDOR E CONDIÇÕES */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fornecedor *</label>
                  <select
                    value={customOrderSupplierId}
                    onChange={(e) => setCustomOrderSupplierId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="">Selecione um fornecedor...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.tradeName || s.name} {s.phone ? `(${s.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                  <select
                    value={customPaymentMethod}
                    onChange={(e) => setCustomPaymentMethod(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="BOLETO">Boleto Faturado (A Prazo)</option>
                    <option value="PIX">Pix / À Vista</option>
                    <option value="CARTAO">Cartão de Crédito</option>
                    <option value="TRANSFERENCIA">Transferência Bancária</option>
                    <option value="OUTROS">A Combinar com Fornecedor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Previsão de Entrega</label>
                  <input
                    type="date"
                    value={customExpectedDelivery}
                    onChange={(e) => setCustomExpectedDelivery(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Frete / Taxas (R$)</label>
                  <input
                    type="text"
                    value={customShippingCost}
                    onChange={(e) => setCustomShippingCost(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* BUSCADOR DE PEÇAS PARA INCLUIR NA OC */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 text-xs">Adicionar Peças ao Pedido</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Digite o nome, código, marca ou código de barras da peça para adicionar..."
                    value={partSearchQuery}
                    onChange={(e) => {
                      setPartSearchQuery(e.target.value);
                      setIsSearchingPart(Boolean(e.target.value.trim()));
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 shadow-xs"
                  />
                  {isSearchingPart && filteredAvailableParts.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {filteredAvailableParts.map((part) => (
                        <div
                          key={part.id}
                          onClick={() => handleAddPartToCustomOrder(part)}
                          className="p-2.5 hover:bg-indigo-50/80 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-mono font-bold text-indigo-700 mr-2">[{part.code}]</span>
                            <span className="font-bold text-slate-800">{part.name}</span>
                            <span className="text-slate-500 ml-2">({part.brand || 'Sem Marca'})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500">Estoque: <strong>{part.stockQuantity || 0} un</strong></span>
                            <span className="font-bold text-emerald-700">R$ {part.costPrice || '0,00'}</span>
                            <button className="bg-indigo-600 text-white p-1 rounded-md">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* GRADE DE ITENS DA NOVA ORDEM */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-2.5">Cód</th>
                      <th className="p-2.5">Nome da Peça</th>
                      <th className="p-2.5 text-center">Estoque Atual</th>
                      <th className="p-2.5 text-center w-28">Qtd. a Pedir</th>
                      <th className="p-2.5 text-right w-32">Custo Unit. (R$)</th>
                      <th className="p-2.5 text-right w-32">Total (R$)</th>
                      <th className="p-2.5 text-center w-12">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customOrderItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          Nenhum item adicionado a este pedido ainda. Use o campo de busca acima para incluir peças.
                        </td>
                      </tr>
                    ) : (
                      customOrderItems.map((item, idx) => (
                        <tr key={item.partId} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-slate-700">{item.partCode}</td>
                          <td className="p-2.5 font-semibold text-slate-800">{item.partName}</td>
                          <td className="p-2.5 text-center text-slate-600">{item.currentStock} un</td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.orderQty}
                              onChange={(e) => {
                                const newQty = Math.max(1, parseInt(e.target.value) || 1);
                                setCustomOrderItems((prev) => {
                                  const copy = [...prev];
                                  copy[idx] = { ...copy[idx], orderQty: newQty, totalCost: newQty * copy[idx].unitCost };
                                  return copy;
                                });
                              }}
                              className="w-20 text-center font-bold bg-white border border-slate-300 rounded-md py-1 text-slate-800 focus:outline-none focus:border-indigo-600"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitCost}
                              onChange={(e) => {
                                const newCost = Math.max(0, parseFloat(e.target.value) || 0);
                                setCustomOrderItems((prev) => {
                                  const copy = [...prev];
                                  copy[idx] = { ...copy[idx], unitCost: newCost, totalCost: copy[idx].orderQty * newCost };
                                  return copy;
                                });
                              }}
                              className="w-24 text-right font-bold bg-white border border-slate-300 rounded-md py-1 px-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                            />
                          </td>
                          <td className="p-2.5 text-right font-mono font-extrabold text-slate-900">
                            R$ {item.totalCost.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => setCustomOrderItems((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer"
                              title="Remover Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* OBSERVAÇÕES E BOTÕES DE AÇÃO */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Observações adicionais para este pedido (opcional)..."
                    value={customOrderNotes}
                    onChange={(e) => setCustomOrderNotes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Total do Pedido:</span>
                    <div className="text-base font-extrabold text-slate-900">
                      R${' '}
                      {(
                        customOrderItems.reduce((s, i) => s + i.totalCost, 0) +
                        (parseFloat(customShippingCost.replace(',', '.')) || 0)
                      )
                        .toFixed(2)
                        .replace('.', ',')}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleCreateOrderFromItems(
                        customOrderItems,
                        customOrderSupplierId,
                        customOrderNotes,
                        customPaymentMethod,
                        customExpectedDelivery,
                        parseFloat(customShippingCost.replace(',', '.')) || 0
                      )
                    }
                    disabled={customOrderItems.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    Emitir Ordem de Compra
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ ABA 3: SUGESTÃO INTELIGENTE DE REPOSIÇÃO ══════════ */}
          {activeTab === 'auto_generator' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Reposição Inteligente de Estoque
                  </h3>
                  <p className="text-xs text-slate-500">
                    O sistema identificou {lowStockItems.length} peças que atingiram o limite mínimo ou estão zeradas
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Filtrar por Fornecedor:</span>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-600 cursor-pointer"
                  >
                    <option value="">Todos os Fornecedores</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.tradeName || s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TABELA DE SUGESTÕES */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-50/70 border-b border-amber-200 text-amber-950 font-bold">
                    <tr>
                      <th className="p-2.5">Código</th>
                      <th className="p-2.5">Peça</th>
                      <th className="p-2.5 text-center">Estoque Atual</th>
                      <th className="p-2.5 text-center">Estoque Mínimo</th>
                      <th className="p-2.5 text-center w-28">Qtd. Sugerida</th>
                      <th className="p-2.5 text-right w-32">Custo Unit. (R$)</th>
                      <th className="p-2.5 text-right w-32">Total Estimado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {autoOrderItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          🎉 Parabéns! Nenhuma peça está com estoque abaixo do mínimo para os critérios selecionados.
                        </td>
                      </tr>
                    ) : (
                      autoOrderItems.map((item, idx) => (
                        <tr key={item.partId} className="hover:bg-amber-50/30">
                          <td className="p-2.5 font-mono font-bold text-slate-700">{item.partCode}</td>
                          <td className="p-2.5 font-semibold text-slate-800">{item.partName}</td>
                          <td className="p-2.5 text-center">
                            <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded text-[11px]">
                              {item.currentStock} un
                            </span>
                          </td>
                          <td className="p-2.5 text-center text-slate-600">{item.minStock} un</td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.orderQty}
                              onChange={(e) => {
                                const newQty = Math.max(0, parseInt(e.target.value) || 0);
                                setAutoOrderItems((prev) => {
                                  const copy = [...prev];
                                  copy[idx] = { ...copy[idx], orderQty: newQty, totalCost: newQty * copy[idx].unitCost };
                                  return copy;
                                });
                              }}
                              className="w-20 text-center font-bold bg-white border border-slate-300 rounded-md py-1 text-slate-800 focus:outline-none focus:border-amber-600"
                            />
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-700">
                            R$ {item.unitCost.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="p-2.5 text-right font-mono font-extrabold text-slate-900">
                            R$ {item.totalCost.toFixed(2).replace('.', ',')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* TOTAL E EMISSÃO DA OC SUGERIDA */}
              {autoOrderItems.length > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-slate-500">
                    Total de {autoOrderItems.filter((i) => i.orderQty > 0).length} itens selecionados para compra
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-slate-500">Total Estimado:</span>
                      <div className="text-base font-extrabold text-amber-900">
                        R$ {autoOrderItems.reduce((s, i) => s + i.totalCost, 0).toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCreateOrderFromItems(autoOrderItems, selectedSupplierId)}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      Gerar Ordem de Reposição
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════ ABA 4: RECEBIMENTO / ENTRADA DE MERCADORIA ══════════ */}
          {activeTab === 'receiving' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-emerald-600" />
                    Central de Entrada & Recebimento de Mercadorias
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Confirme a entrega dos pedidos para alimentar automaticamente o estoque e gerar as contas a pagar
                  </p>
                </div>
              </div>

              {/* LISTA DE PEDIDOS AGUARDANDO ENTREGA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {purchaseOrders.filter((po) => po.status !== 'RECEBIDO_TOTAL' && po.status !== 'CANCELADO').length === 0 ? (
                  <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-700">Tudo em Dia!</h4>
                    <p className="text-xs text-slate-500">Não há ordens de compra pendentes de recebimento no momento.</p>
                  </div>
                ) : (
                  purchaseOrders
                    .filter((po) => po.status !== 'RECEBIDO_TOTAL' && po.status !== 'CANCELADO')
                    .map((order) => (
                      <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div>
                            <span className="font-mono font-extrabold text-indigo-700 text-sm">{order.code}</span>
                            <div className="font-bold text-slate-800 text-xs">{order.supplierName}</div>
                          </div>
                          <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded text-[11px] font-bold">
                            Aguardando Chegada
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 space-y-1">
                          <div>📅 Emitido em: <strong>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</strong></div>
                          <div>📦 Total de Itens: <strong>{order.items.reduce((s, i) => s + Number(i.orderQty || 0), 0)} unidades</strong></div>
                          <div>💰 Valor: <strong className="text-emerald-700">R$ {order.totalAmount.toFixed(2).replace('.', ',')}</strong></div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <button
                            onClick={() => setSelectedOrderToView(order)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Itens
                          </button>
                          <button
                            onClick={() => handleReceiveOrderStock(order)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <PackageCheck className="w-4 h-4" />
                            Dar Entrada no Estoque
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL / GAVETA DE VISUALIZAÇÃO DE UMA ORDEM ESPECÍFICA */}
        {selectedOrderToView && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden font-sans space-y-4 p-5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-extrabold text-slate-800">
                    Detalhes da Ordem de Compra {selectedOrderToView.code}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedOrderToView(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs grid grid-cols-2 gap-2">
                <div><strong>Fornecedor:</strong> {selectedOrderToView.supplierName}</div>
                <div><strong>Emissão:</strong> {new Date(selectedOrderToView.createdAt).toLocaleDateString('pt-BR')}</div>
                <div><strong>Condição:</strong> {selectedOrderToView.paymentMethod || 'A combinar'}</div>
                <div><strong>Status:</strong> {selectedOrderToView.status}</div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="p-2">Cód</th>
                      <th className="p-2">Peça</th>
                      <th className="p-2 text-center">Qtd</th>
                      <th className="p-2 text-right">Custo Unit.</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrderToView.items.map((item) => (
                      <tr key={item.partId}>
                        <td className="p-2 font-mono font-bold">{item.partCode}</td>
                        <td className="p-2">{item.partName}</td>
                        <td className="p-2 text-center font-bold">{item.orderQty}</td>
                        <td className="p-2 text-right">R$ {item.unitCost.toFixed(2).replace('.', ',')}</td>
                        <td className="p-2 text-right font-bold">R$ {item.totalCost.toFixed(2).replace('.', ',')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-extrabold text-slate-900">
                    Total: R$ {selectedOrderToView.totalAmount.toFixed(2).replace('.', ',')}
                  </div>
                  <div className="h-4 w-px bg-slate-300 mx-1" />
                  <button
                    onClick={() => handleDeleteOrder(selectedOrderToView)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Excluir Ordem de Compra"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                  {selectedOrderToView.status !== 'CANCELADO' && selectedOrderToView.status !== 'RECEBIDO_TOTAL' && (
                    <button
                      onClick={() => handleCancelOrder(selectedOrderToView)}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Marcar como Cancelada"
                    >
                      <X className="w-3.5 h-3.5" /> Cancelar
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSendViaWhatsApp(selectedOrderToView)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </button>
                  <button
                    onClick={() => handlePrintOrSaveOrderPDF(selectedOrderToView)}
                    className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" /> Imprimir / PDF
                  </button>
                  <button
                    onClick={() => setSelectedOrderToView(null)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RODAPÉ DO MODAL */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 italic">
            Sistema integrado com Estoque de Peças e Contas a Pagar
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};
