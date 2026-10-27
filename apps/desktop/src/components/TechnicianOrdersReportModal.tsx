import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  UserCheck,
  Search,
  Printer,
  FileSpreadsheet,
  Calendar,
  Layers,
  FileText,
  ShoppingCart,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  DollarSign,
  Package,
  Wrench,
} from 'lucide-react';
import { matchesSearchTerm } from '../utils/searchUtils';
import { modalStack } from '../utils/modalStack';
import { getCurrentFeatures } from '../config/appFeatures';
import {
  isOrderStatusFinished,
  isOrderStatusCanceled,
  isOrderStatusOpen,
} from '../utils/orderStatusUtils';

interface TechnicianOrdersReportModalProps {
  isOpen: boolean;
  orders: any[];
  technicians?: any[];
  companyInfo?: any;
  onClose: () => void;
  onOpenOrderDetails?: (order: any) => void;
}

export type RecordTypeFilter = 'AMBOS' | 'OS' | 'VENDAS';
export type OSStatusSubgroup = 'TODOS' | 'FINALIZADA' | 'ABERTA' | 'CANCELADA';
export type PeriodPreset = 'THIS_MONTH' | 'TODAY' | 'THIS_WEEK' | 'LAST_MONTH' | 'ALL' | 'CUSTOM';

const ITEMS_PER_A4_PAGE = 14;

// Helper para obter início do mês atual até o dia de hoje
const getInitialDateRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const start = `${year}-${month}-01`;
  const end = `${year}-${month}-${day}`;
  return { start, end };
};

// Helper seguro para converter qualquer data (ISO, PT-BR ou timestamp) para string YYYY-MM-DD
const parseToIsoDate = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.substring(0, 10);
    }
    // Formato PT-BR: DD/MM/YYYY
    const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (brMatch) {
      const d = brMatch[1].padStart(2, '0');
      const m = brMatch[2].padStart(2, '0');
      const y = brMatch[3];
      return `${y}-${m}-${d}`;
    }
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {}
  return '';
};

// Formatação amigável DD/MM/YYYY
const formatDatePtBr = (val: any): string => {
  if (!val) return '-';
  const iso = parseToIsoDate(val);
  if (!iso) return '-';
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return '-';
};

export const TechnicianOrdersReportModal: React.FC<TechnicianOrdersReportModalProps> = ({
  isOpen,
  orders = [],
  technicians = [],
  companyInfo = {},
  onClose,
  onOpenOrderDetails,
}) => {
  const initialDates = getInitialDateRange();
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>(initialDates.start);
  const [endDate, setEndDate] = useState<string>(initialDates.end);

  const [selectedEmployee, setSelectedEmployee] = useState<string>('TODOS');
  const [recordType, setRecordType] = useState<RecordTypeFilter>('AMBOS');
  const [osStatusFilter, setOsStatusFilter] = useState<OSStatusSubgroup>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Lista de Vendas de Balcão
  const [salesHistory, setSalesHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_sales_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Lista de Usuários do Sistema para enriquecer a lista de funcionários
  const [syncedUsers, setSyncedUsers] = useState<any[]>([]);

  // Sincroniza dados sempre que o modal abre
  useEffect(() => {
    if (isOpen) {
      // 1. Recarrega vendas
      try {
        const savedSales = localStorage.getItem('vollen_sales_history');
        if (savedSales) setSalesHistory(JSON.parse(savedSales));
      } catch {}

      // 2. Reseta datas para padrão do Mês Atual (1º dia até hoje)
      const range = getInitialDateRange();
      setPeriodPreset('THIS_MONTH');
      setStartDate(range.start);
      setEndDate(range.end);
      setCurrentPage(1);

      // 3. Sincroniza usuários do Firestore
      import('../services/firebase').then(({ db }) => {
        if (db) {
          import('firebase/firestore').then(({ collection, getDocs }) => {
            getDocs(collection(db, 'users'))
              .then((snap) => {
                if (!snap.empty) {
                  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                  setSyncedUsers(list);
                }
              })
              .catch(() => {});
          });
        }
      });
    }
  }, [isOpen]);

  // Lista unificada de todos os Funcionários (Técnicos, Vendedores, Usuários)
  const availableEmployees = useMemo(() => {
    const map = new Map<string, string>();

    // 1. Técnicos de vollen_technicians
    try {
      const savedTechs = localStorage.getItem('vollen_technicians');
      if (savedTechs) {
        const parsed = JSON.parse(savedTechs);
        if (Array.isArray(parsed)) {
          parsed.forEach((t: any) => {
            const n = (t.name || '').trim();
            if (n && n !== 'Técnico Exemplo' && n !== 'Técnico Roberto') {
              map.set(n.toUpperCase(), n);
            }
          });
        }
      }
    } catch {}

    // 2. Usuários cadastrados (vollen_users & system_users)
    try {
      const savedUsers = localStorage.getItem('vollen_users');
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed)) {
          parsed.forEach((u: any) => {
            const n = (u.name || u.username || '').trim();
            if (n && n !== 'Técnico Exemplo') {
              map.set(n.toUpperCase(), n);
            }
          });
        }
      }
    } catch {}

    // 3. Sincronizados do Firestore
    syncedUsers.forEach((u) => {
      const n = (u.name || u.username || '').trim();
      if (n && n !== 'Técnico Exemplo') {
        map.set(n.toUpperCase(), n);
      }
    });

    // 4. Props de técnicos
    if (Array.isArray(technicians)) {
      technicians.forEach((t: any) => {
        const n = typeof t === 'string' ? t.trim() : (t.name || '').trim();
        if (n && n !== 'Técnico Exemplo') {
          map.set(n.toUpperCase(), n);
        }
      });
    }

    // 5. Nomes presentes em Ordens de Serviço
    if (Array.isArray(orders)) {
      orders.forEach((o: any) => {
        const n = (o.technician || o.technicianName || '').trim();
        if (n && n !== 'Técnico Exemplo') {
          map.set(n.toUpperCase(), n);
        }
      });
    }

    // 6. Nomes presentes em Vendas
    if (Array.isArray(salesHistory)) {
      salesHistory.forEach((s: any) => {
        const n = (s.sellerName || '').trim();
        if (n) {
          map.set(n.toUpperCase(), n);
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [technicians, orders, salesHistory, syncedUsers, isOpen]);

  // Manipulador de troca rápida de período
  const handlePeriodPresetChange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const now = new Date();
    const todayIso = now.toISOString().split('T')[0];

    if (preset === 'THIS_MONTH') {
      const range = getInitialDateRange();
      setStartDate(range.start);
      setEndDate(range.end);
    } else if (preset === 'TODAY') {
      setStartDate(todayIso);
      setEndDate(todayIso);
    } else if (preset === 'THIS_WEEK') {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      setStartDate(startOfWeek.toISOString().split('T')[0]);
      setEndDate(todayIso);
    } else if (preset === 'LAST_MONTH') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(firstDayLastMonth.toISOString().split('T')[0]);
      setEndDate(lastDayLastMonth.toISOString().split('T')[0]);
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Unificação e Filtragem dos Registros (OSs e Vendas)
  const unifiedRecords = useMemo(() => {
    const list: any[] = [];

    const targetEmpClean = selectedEmployee.toUpperCase().trim();

    // 1. Processar Ordens de Serviço
    if (recordType === 'AMBOS' || recordType === 'OS') {
      (orders || []).forEach((os) => {
        if (!os || os.isDeleted || os.status === 'EXCLUIDA') return;

        // Filtro de Funcionário (Técnico da OS)
        const osTech = (os.technician || os.technicianName || 'Sem Técnico').trim();
        if (selectedEmployee !== 'TODOS') {
          if (osTech.toUpperCase() !== targetEmpClean && !osTech.toUpperCase().includes(targetEmpClean)) {
            return;
          }
        }

        // Filtro de Data
        const osDateIso = parseToIsoDate(os.entryDate || os.createdAt || os.date);
        if (startDate && osDateIso && osDateIso < startDate) return;
        if (endDate && osDateIso && osDateIso > endDate) return;

        // Filtro de Subgrupo de Status da OS
        const isCanceled = isOrderStatusCanceled(os);
        const isFinal = isOrderStatusFinished(os);
        const isOpen = isOrderStatusOpen(os);

        if (osStatusFilter === 'FINALIZADA' && !isFinal) return;
        if (osStatusFilter === 'ABERTA' && !isOpen) return;
        if (osStatusFilter === 'CANCELADA' && !isCanceled) return;
        if (osStatusFilter === 'TODOS' && isCanceled) return;

        // Busca por texto
        if (searchTerm.trim()) {
          const matched =
            matchesSearchTerm(os.code || '', searchTerm) ||
            matchesSearchTerm(os.client?.name || '', searchTerm) ||
            matchesSearchTerm(os.equipment?.type || '', searchTerm) ||
            matchesSearchTerm(os.equipment?.brand || '', searchTerm) ||
            matchesSearchTerm(osTech, searchTerm);
          if (!matched) return;
        }

        const totalVal =
          typeof os.totalAmount === 'number'
            ? os.totalAmount
            : parseFloat(String(os.totalAmount || '0').replace('.', '').replace(',', '.')) || 0;

        list.push({
          id: `OS_${os.id || os.code}`,
          type: 'OS',
          rawType: 'Ordem de Serviço',
          code: os.code || os.id || '-',
          dateIso: osDateIso,
          dateFormatted: formatDatePtBr(os.entryDate || os.createdAt),
          time: os.entryTime || '',
          clientName: os.client?.name || 'Cliente Balcão',
          clientPhone: os.client?.phone || os.client?.whatsapp || '',
          description: `${os.equipment?.type || 'Equipamento'} ${os.equipment?.brand ? `(${os.equipment.brand})` : ''} ${os.equipment?.model ? `- ${os.equipment.model}` : ''}`.trim(),
          employeeName: osTech,
          status: os.status || (isFinal ? 'FINALIZADA' : (isCanceled ? 'CANCELADA' : 'ABERTA')),
          isFinalized: isFinal,
          isCanceled: isCanceled,
          isOpen: isOpen,
          totalAmount: totalVal,
          rawObject: os,
        });
      });
    }

    // 2. Processar Vendas de Balcão
    if (recordType === 'AMBOS' || recordType === 'VENDAS') {
      (salesHistory || []).forEach((sale) => {
        if (!sale) return;

        // Filtro de Funcionário (Vendedor da Venda)
        const seller = (sale.sellerName || 'Balcão').trim();
        if (selectedEmployee !== 'TODOS') {
          if (seller.toUpperCase() !== targetEmpClean && !seller.toUpperCase().includes(targetEmpClean)) {
            return;
          }
        }

        // Filtro de Data
        const saleDateIso = parseToIsoDate(sale.createdAt || sale.date);
        if (startDate && saleDateIso && saleDateIso < startDate) return;
        if (endDate && saleDateIso && saleDateIso > endDate) return;

        // Resumo de Itens Vendidos
        const itemsSummary = Array.isArray(sale.items)
          ? sale.items.map((i: any) => `${i.qty}x ${i.name}`).join(', ')
          : 'Venda de Peças';

        // Busca por texto
        if (searchTerm.trim()) {
          const matched =
            matchesSearchTerm(sale.saleCode || '', searchTerm) ||
            matchesSearchTerm(sale.clientName || '', searchTerm) ||
            matchesSearchTerm(itemsSummary, searchTerm) ||
            matchesSearchTerm(seller, searchTerm);
          if (!matched) return;
        }

        list.push({
          id: `SALE_${sale.id || sale.saleCode}`,
          type: 'VENDA',
          rawType: 'Venda de Peças',
          code: sale.saleCode || sale.id || '-',
          dateIso: saleDateIso,
          dateFormatted: formatDatePtBr(sale.date || sale.createdAt),
          time: sale.time || '',
          clientName: sale.clientName || 'Consumidor Final',
          clientPhone: sale.clientPhone || '',
          description: itemsSummary,
          employeeName: seller,
          status: 'CONCLUÍDA',
          isFinalized: true,
          totalAmount: Number(sale.totalAmount) || 0,
          rawObject: sale,
        });
      });
    }

    // Ordenação decrescente por data
    list.sort((a, b) => (b.dateIso || '').localeCompare(a.dateIso || ''));

    return list;
  }, [orders, salesHistory, recordType, osStatusFilter, selectedEmployee, startDate, endDate, searchTerm]);

  // Reseta página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEmployee, recordType, osStatusFilter, startDate, endDate, searchTerm]);

  // Estatísticas e Métricas de Produtividade
  const stats = useMemo(() => {
    let totalGross = 0;
    let totalOsVal = 0;
    let totalSalesVal = 0;
    let countOs = 0;
    let countSales = 0;
    let countOsOpen = 0;
    let countOsDone = 0;
    let countOsCanceled = 0;

    unifiedRecords.forEach((item) => {
      if (item.type === 'OS') {
        countOs++;
        if (item.isCanceled) {
          countOsCanceled++;
        } else if (item.isFinalized) {
          countOsDone++;
          totalOsVal += item.totalAmount;
          totalGross += item.totalAmount;
        } else {
          countOsOpen++;
          totalOsVal += item.totalAmount;
          totalGross += item.totalAmount;
        }
      } else if (item.type === 'VENDA') {
        countSales++;
        totalSalesVal += item.totalAmount;
        totalGross += item.totalAmount;
      }
    });

    const totalCount = unifiedRecords.length;
    const avgTicket = (countOsDone + countSales) > 0 ? totalGross / (countOsDone + countSales) : (totalCount > 0 ? totalGross / totalCount : 0);

    return {
      totalGross,
      totalOsVal,
      totalSalesVal,
      countOs,
      countSales,
      countOsOpen,
      countOsDone,
      countOsCanceled,
      totalCount,
      avgTicket,
    };
  }, [unifiedRecords]);

  // Quantidade de registros por página
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(unifiedRecords.length / itemsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRecords = useMemo(() => {
    if (itemsPerPage >= 99999) return unifiedRecords;
    const start = (safePage - 1) * itemsPerPage;
    return unifiedRecords.slice(start, start + itemsPerPage);
  }, [unifiedRecords, safePage, itemsPerPage]);

  // Sugestão dinâmica de até 10 páginas visíveis na barra de navegação
  const visiblePages = useMemo(() => {
    const maxVisible = 10;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  // Fechamento via modalStack
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (isOpen) {
      modalStack.register('TechnicianOrdersReportModal', () => {
        onCloseRef.current?.();
      });
      return () => modalStack.unregister('TechnicianOrdersReportModal');
    }
  }, [isOpen]);

  // Impressão A4 Formatada
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Por favor, permita janelas pop-up no navegador para visualizar a impressão.');

    const companyName = companyInfo?.tradingName || companyInfo?.name || 'Vollen Assistência Técnica';
    const companyPhone = companyInfo?.phone || companyInfo?.whatsapp || '';
    const companyCnpj = companyInfo?.cnpj ? `CNPJ: ${companyInfo.cnpj}` : '';

    const periodLabel =
      startDate && endDate
        ? `${formatDatePtBr(startDate)} até ${formatDatePtBr(endDate)}`
        : startDate
        ? `A partir de ${formatDatePtBr(startDate)}`
        : endDate
        ? `Até ${formatDatePtBr(endDate)}`
        : 'Todo o Histórico';

    const typeLabel =
      recordType === 'AMBOS'
        ? 'Ambos (Ordens de Serviço e Vendas)'
        : recordType === 'OS'
        ? `Ordens de Serviço (${osStatusFilter === 'TODOS' ? 'Abertas e Finalizadas' : osStatusFilter === 'ABERTA' ? 'Apenas Abertas' : 'Apenas Finalizadas'})`
        : 'Vendas de Peças (Balcão)';

    const printPages: any[][] = [];
    if (unifiedRecords.length === 0) {
      printPages.push([]);
    } else {
      for (let i = 0; i < unifiedRecords.length; i += ITEMS_PER_A4_PAGE) {
        printPages.push(unifiedRecords.slice(i, i + ITEMS_PER_A4_PAGE));
      }
    }

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <title>Relatório por Funcionário - ${selectedEmployee}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10.5px; color: #1e293b; background: #fff; }
          .page-container { width: 100%; min-height: 277mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; padding: 4px; }
          .page-container:last-child { page-break-after: avoid; }
          .header { border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 15px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
          .subtitle { font-size: 10px; color: #475569; margin-top: 2px; }
          .info-bar { background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 10.5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; }
          th { background-color: #f1f5f9; color: #334155; font-weight: 700; text-align: left; padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 9.5px; text-transform: uppercase; }
          td { padding: 5px 8px; border: 1px solid #cbd5e1; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .badge { display: inline-block; padding: 2px 5px; border-radius: 4px; font-weight: 700; font-size: 8.5px; }
          .badge-os { background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
          .badge-sale { background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
          .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 8px; }
          .summary-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; }
          .summary-card span { display: block; font-size: 8.5px; text-transform: uppercase; font-weight: 700; color: #64748b; }
          .summary-card strong { font-size: 12px; font-weight: 800; color: #0f172a; font-family: monospace; }
          .total-box { margin-top: 10px; padding: 8px 12px; background-color: #f8fafc; border: 1.5px solid #0f766e; border-radius: 6px; display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; }
          .footer { margin-top: 10px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 4px; }
        </style>
      </head>
      <body>
        ${printPages
          .map((pageItems, pageIdx) => {
            const isLastPage = pageIdx === printPages.length - 1;
            return `
              <div class="page-container">
                <div>
                  <div class="header">
                    <div>
                      <div class="title">${companyName}</div>
                      <div class="subtitle">${companyCnpj} ${companyPhone ? `• Contato: ${companyPhone}` : ''}</div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-weight: 800; color: #0f766e; font-size: 11.5px;">RELATÓRIO POR FUNCIONÁRIO (Pág. ${pageIdx + 1}/${printPages.length})</div>
                      <div class="subtitle">Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>

                  <div class="info-bar">
                    <div><strong>Funcionário:</strong> ${selectedEmployee === 'TODOS' ? 'Todos os Funcionários' : selectedEmployee}</div>
                    <div><strong>Período:</strong> ${periodLabel}</div>
                    <div><strong>Módulo / Tipo:</strong> ${typeLabel}</div>
                    <div><strong>Total de Registros:</strong> ${stats.totalCount} (Pág. ${pageIdx + 1} de ${printPages.length})</div>
                  </div>

                  ${
                    pageIdx === 0
                      ? `
                        <div class="summary-cards">
                          <div class="summary-card">
                            <span>Faturamento Total</span>
                            <strong style="color: #047857;">R$ ${stats.totalGross.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </div>
                          <div class="summary-card">
                            <span>Ordens de Serviço (${stats.countOs})</span>
                            <strong>R$ ${stats.totalOsVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </div>
                          <div class="summary-card">
                            <span>Vendas Balcão (${stats.countSales})</span>
                            <strong>R$ ${stats.totalSalesVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </div>
                          <div class="summary-card">
                            <span>Ticket Médio</span>
                            <strong>R$ ${stats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </div>
                        </div>
                      `
                      : ''
                  }

                  <table>
                    <thead>
                      <tr>
                        <th style="width: 55px; text-align: center;">Tipo</th>
                        <th style="width: 70px;">Cód.</th>
                        <th style="width: 75px;">Data</th>
                        <th>Cliente</th>
                        <th>Descrição / Itens / Equipamento</th>
                        <th style="width: 110px;">Responsável</th>
                        <th style="width: 80px; text-align: center;">Status</th>
                        <th style="width: 85px; text-align: right;">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${
                        pageItems.length === 0
                          ? '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;">Nenhum registro encontrado para os filtros selecionados.</td></tr>'
                          : pageItems
                              .map((item) => `
                                <tr>
                                  <td style="text-align: center;">
                                    <span class="badge ${item.type === 'OS' ? 'badge-os' : 'badge-sale'}">${item.type}</span>
                                  </td>
                                  <td style="font-weight: 700; font-family: monospace;">#${item.code}</td>
                                  <td>${item.dateFormatted}</td>
                                  <td><strong>${item.clientName}</strong></td>
                                  <td style="color: #334155;">${item.description}</td>
                                  <td style="font-weight: 600;">${item.employeeName}</td>
                                  <td style="text-align: center; font-size: 9px;">${item.status}</td>
                                  <td style="text-align: right; font-weight: 700; font-family: monospace;">
                                    R$ ${item.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              `)
                              .join('')
                      }
                    </tbody>
                  </table>
                </div>

                <div>
                  ${
                    isLastPage
                      ? `
                        <div class="total-box">
                          <div>
                            <span>OSs: <strong style="color: #0369a1;">${stats.countOs} (R$ ${stats.totalOsVal.toFixed(2).replace('.', ',')})</strong></span>
                            <span style="margin-left: 14px;">Vendas: <strong style="color: #047857;">${stats.countSales} (R$ ${stats.totalSalesVal.toFixed(2).replace('.', ',')})</strong></span>
                            <span style="margin-left: 14px;">Total Geral: <strong>${stats.totalCount} operações</strong></span>
                          </div>
                          <div>
                            FATURAMENTO TOTAL: <span style="color: #047857; font-size: 13px; font-weight: 900; margin-left: 6px;">R$ ${stats.totalGross.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      `
                      : ''
                  }

                  <div class="footer">
                    Vollen OS • Sistema Integrado de Gestão — Página ${pageIdx + 1} de ${printPages.length}
                  </div>
                </div>
              </div>
            `;
          })
          .join('')}
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  // Exportação CSV / Excel
  const handleExportCSV = () => {
    if (unifiedRecords.length === 0) return alert('Nenhum dado para exportar.');
    const header = ['Tipo', 'Código', 'Data', 'Cliente', 'Telefone', 'Descrição / Peças / Aparelho', 'Responsável', 'Status', 'Valor Total (R$)'];
    const rows = unifiedRecords.map((r) => [
      `"${r.rawType}"`,
      `"${r.code}"`,
      `"${r.dateFormatted}"`,
      `"${r.clientName}"`,
      `"${r.clientPhone || ''}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      `"${r.employeeName}"`,
      `"${r.status}"`,
      `"${r.totalAmount.toFixed(2).replace('.', ',')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [header.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_funcionario_${selectedEmployee.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-2.5 font-sans select-none animate-fadeIn text-xs">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-[96vw] xl:max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabeçalho Compacto e Elegante */}
        <div className="px-3.5 py-2 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-500/20 border border-teal-400/40 rounded-lg text-teal-300">
              <UserCheck className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white leading-none flex items-center gap-2">
              Relatório de Produtividade por Funcionário
              <span className="bg-teal-500/30 text-teal-300 text-[10px] font-semibold px-2 py-0.2 rounded-full border border-teal-400/40">
                OS & Vendas
              </span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de Filtros Compacta e Integrada em Linha Única */}
        <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-1.5 shrink-0 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Seletor de Funcionário */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 rounded-lg shadow-2xs">
              <UserCheck className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <label className="font-bold text-slate-600 text-[10.5px]">Func:</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="font-bold text-slate-900 focus:outline-none cursor-pointer bg-transparent text-xs max-w-[170px] truncate"
              >
                <option value="TODOS">-- TODOS OS FUNCIONÁRIOS --</option>
                {availableEmployees.map((emp) => (
                  <option key={emp} value={emp}>
                    {emp}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de Registro (Ambos / OS / Vendas) */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 rounded-lg shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <label className="font-bold text-slate-600 text-[10.5px]">Tipo:</label>
              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value as RecordTypeFilter)}
                className="font-bold text-indigo-950 focus:outline-none cursor-pointer bg-transparent text-xs"
              >
                <option value="AMBOS">Ambos (OS + Vendas)</option>
                <option value="OS">Apenas OSs</option>
                <option value="VENDAS">Apenas Vendas</option>
              </select>
            </div>

            {/* Subgrupo de Status da OS */}
            {(recordType === 'AMBOS' || recordType === 'OS') && (
              <div className="flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 rounded-lg shadow-2xs animate-fadeIn">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <label className="font-bold text-slate-600 text-[10.5px]">Status OS:</label>
                <select
                  value={osStatusFilter}
                  onChange={(e) => setOsStatusFilter(e.target.value as OSStatusSubgroup)}
                  className="font-bold text-slate-900 focus:outline-none cursor-pointer bg-transparent text-xs"
                >
                  <option value="TODOS">Todas (Abertas & Finalizadas)</option>
                  <option value="FINALIZADA">✅ Apenas Finalizadas</option>
                  <option value="ABERTA">⏳ Apenas Abertas</option>
                  <option value="CANCELADA">🚫 Apenas Canceladas</option>
                </select>
              </div>
            )}

            {/* Período */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 rounded-lg shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <select
                value={periodPreset}
                onChange={(e) => handlePeriodPresetChange(e.target.value as PeriodPreset)}
                className="font-bold text-teal-950 focus:outline-none cursor-pointer bg-transparent text-xs"
              >
                <option value="THIS_MONTH">Mês Atual</option>
                <option value="TODAY">Hoje</option>
                <option value="THIS_WEEK">Esta Semana</option>
                <option value="LAST_MONTH">Mês Anterior</option>
                <option value="ALL">Todo o Histórico</option>
                <option value="CUSTOM">Personalizado</option>
              </select>
            </div>

            {/* Datas */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 px-1.5 py-0.5 rounded-lg shadow-2xs text-[11px]">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPeriodPreset('CUSTOM');
                }}
                className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer text-[11px] w-28"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPeriodPreset('CUSTOM');
                }}
                className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer text-[11px] w-28"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Campo de Busca Compacto */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
              <input
                type="text"
                placeholder="Buscar código, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-0.5 text-slate-800 focus:outline-none focus:border-teal-600 w-40 text-xs shadow-2xs"
              />
            </div>

            {getCurrentFeatures().hasTechnicianReportExcelExport && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer text-xs"
                title="Exportar dados para Excel / CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="bg-teal-700 hover:bg-teal-800 text-white px-3 py-1 rounded-lg font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer text-xs"
              title="Imprimir relatório em formato A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Faixa Slim de Métricas em Linha Única */}
        <div className="px-3 py-1 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 font-sans">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Faturamento:</span>
              <strong className="text-emerald-700 font-mono text-xs">
                R$ {stats.totalGross.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="flex items-center gap-1 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-lg">
              <span className="text-[10px] font-bold text-sky-800 uppercase">OS Finalizadas:</span>
              <strong className="text-sky-950 font-mono text-xs">
                {stats.countOsDone}
              </strong>
            </div>

            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
              <span className="text-[10px] font-bold text-amber-800 uppercase">OS Abertas:</span>
              <strong className="text-amber-950 font-mono text-xs">
                {stats.countOsOpen}
              </strong>
            </div>

            {stats.countOsCanceled > 0 && (
              <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                <span className="text-[10px] font-bold text-rose-800 uppercase">OS Canceladas:</span>
                <strong className="text-rose-950 font-mono text-xs">
                  {stats.countOsCanceled}
                </strong>
              </div>
            )}

            <div className="flex items-center gap-1 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg">
              <span className="text-[10px] font-bold text-teal-800 uppercase">Vendas:</span>
              <strong className="text-teal-950 font-mono text-xs">
                {stats.countSales} • R$ {stats.totalSalesVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="flex items-center gap-1 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
              <span className="text-[10px] font-bold text-purple-800 uppercase">Ticket Médio:</span>
              <strong className="text-purple-950 font-mono text-xs">
                R$ {stats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          <div className="text-[10.5px] text-slate-500 font-semibold">
            {unifiedRecords.length} registro(s) encontrado(s)
          </div>
        </div>

        {/* Tabela de Registros Unificados */}
        <div className="flex-1 min-h-0 flex flex-col p-3 bg-slate-50 justify-between overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0 z-10 text-[10px] border-b border-slate-200 shadow-2xs">
                <tr>
                  <th className="p-2.5 w-16 text-center">Tipo</th>
                  <th className="p-2.5 w-24">Cód.</th>
                  <th className="p-2.5 w-24">Data</th>
                  <th className="p-2.5">Cliente</th>
                  <th className="p-2.5">Descrição / Peças / Aparelho</th>
                  <th className="p-2.5 w-36">Responsável</th>
                  <th className="p-2.5 w-28 text-center">Status</th>
                  <th className="p-2.5 w-28 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                {paginatedRecords.map((item) => {
                  const isSelected = item.id === selectedItemId;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      onDoubleClick={() => {
                        if (item.type === 'OS' && onOpenOrderDetails) {
                          onOpenOrderDetails(item.rawObject);
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-teal-50/80 font-medium' : 'hover:bg-slate-50/80 bg-white'
                      }`}
                      title={item.type === 'OS' ? 'Clique 2x para abrir a OS' : 'Venda de Balcão'}
                    >
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold text-[9.5px] uppercase ${
                            item.type === 'OS'
                              ? 'bg-sky-100 text-sky-800 border border-sky-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">
                        #{item.code}
                      </td>
                      <td className="p-2.5 text-slate-600 font-medium">
                        {item.dateFormatted}
                      </td>
                      <td className="p-2.5 font-bold text-slate-800 truncate max-w-[160px]">
                        {item.clientName}
                      </td>
                      <td className="p-2.5 text-slate-600 truncate max-w-[280px]">
                        {item.description}
                      </td>
                      <td className="p-2.5 font-semibold text-teal-950 truncate max-w-[140px]">
                        {item.employeeName}
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.isCanceled
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : item.isFinalized
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        R$ {item.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}

                {unifiedRecords.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      Nenhum registro de OS ou Venda encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 mt-2 shadow-2xs text-xs shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-medium text-[11px]">
                  Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({unifiedRecords.length} registros no total)
                </span>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 shadow-2xs">
                  <span className="text-[10.5px] font-bold text-slate-600">Exibir por página:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value={15}>15 itens (1 Folha A4)</option>
                    <option value={25}>25 itens</option>
                    <option value={50}>50 itens</option>
                    <option value={100}>100 itens</option>
                    <option value={99999}>Todos os registros</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-1 rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center transition-colors text-xs cursor-pointer"
                  title="Primeira Página"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors text-xs cursor-pointer"
                  title="Página Anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>

                {visiblePages[0] > 1 && (
                  <span className="text-slate-400 font-bold px-1 select-none text-xs">...</span>
                )}

                {visiblePages.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`min-w-[26px] h-6 px-1.5 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
                      currentPage === p
                        ? 'bg-teal-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                {visiblePages[visiblePages.length - 1] < totalPages && (
                  <span className="text-slate-400 font-bold px-1 select-none text-xs">...</span>
                )}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors text-xs cursor-pointer"
                  title="Próxima Página"
                >
                  Próxima <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="p-1 rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center transition-colors text-xs cursor-pointer"
                  title="Última Página"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Resumo Financeiro */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 italic text-[11px]">
              Dica: Clique duas vezes em qualquer linha de OS para abri-la diretamente.
            </span>
            <div className="flex items-center gap-2 font-bold text-[11px]">
              <span className="bg-sky-100 text-sky-900 px-2 py-0.5 rounded-lg border border-sky-300">
                OS: {stats.countOs}
              </span>
              <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded-lg border border-teal-300">
                Vendas: {stats.countSales}
              </span>
              <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded-lg">
                Total: {stats.totalCount} operações
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-white border border-slate-300 px-3 py-1 rounded-xl shadow-2xs flex items-center gap-2">
              <span className="text-slate-500 font-bold text-[11px]">Faturamento Período:</span>
              <span className="text-emerald-700 font-black text-sm font-mono">
                R$ {stats.totalGross.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-1.5 rounded-xl font-bold transition-colors cursor-pointer text-xs"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
