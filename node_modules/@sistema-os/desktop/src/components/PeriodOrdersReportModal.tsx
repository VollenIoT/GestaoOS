import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Search,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Ban,
  Trash2,
  Filter,
  ShoppingCart,
  FileText,
  DollarSign,
  Layers,
  Tag,
  User,
  CreditCard,
  Banknote,
  QrCode,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { matchesSearchTerm } from '../utils/searchUtils';

export interface SaleItemSummary {
  id: string;
  saleCode: string;
  date: string;
  time: string;
  createdAt?: string;
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  sellerName: string;
  items: Array<{ name: string; qty: number; unitPrice: number; subtotal: number }>;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  notes?: string;
}

interface PeriodOrdersReportModalProps {
  isOpen: boolean;
  orders: any[];
  companyInfo?: any;
  onClose: () => void;
  onOpenOrderDetails?: (order: any) => void;
}

export const PeriodOrdersReportModal: React.FC<PeriodOrdersReportModalProps> = ({
  isOpen,
  orders = [],
  companyInfo = {},
  onClose,
  onOpenOrderDetails,
}) => {
  // Aba Ativa do Relatório Geral: 'TODOS' | 'OS' | 'VENDAS' | 'CLIENTES' | 'EQUIPAMENTOS' | 'PECAS'
  const [activeReportTab, setActiveReportTab] = useState<'TODOS' | 'OS' | 'VENDAS' | 'CLIENTES' | 'EQUIPAMENTOS' | 'PECAS'>('TODOS');

  // Listas de Clientes, Equipamentos e Peças
  const [clientsList, setClientsList] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_clients');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [equipmentsList, setEquipmentsList] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_equipments');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [partsList, setPartsList] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_parts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  React.useEffect(() => {
    if (isOpen) {
      try {
        const savedCli = localStorage.getItem('vollen_clients');
        if (savedCli) setClientsList(JSON.parse(savedCli));
        const savedEq = localStorage.getItem('vollen_equipments');
        if (savedEq) setEquipmentsList(JSON.parse(savedEq));
        const savedParts = localStorage.getItem('vollen_parts');
        if (savedParts) setPartsList(JSON.parse(savedParts));
      } catch {}
    }
  }, [isOpen]);

  // Padrão: início do mês atual até hoje
  const [startDate, setStartDate] = useState(() => {
    try {
      const d = new Date();
      d.setDate(1);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  });

  const [endDate, setEndDate] = useState(() => {
    try {
      return new Date().toISOString().split('T')[0];
    } catch {
      return '';
    }
  });

  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [paymentFilter, setPaymentFilter] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Carrega histórico de vendas do localStorage
  const [salesList, setSalesList] = useState<SaleItemSummary[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_sales_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  React.useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('vollen_sales_history');
        if (saved) setSalesList(JSON.parse(saved));
      } catch {}
    }
  }, [isOpen]);

  const safeCompany = companyInfo || {};

  // Formatação segura de data sem risco de RangeError
  const formatDateSafe = (dateVal: any): string => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const getIsoDateSafe = (dateVal: any): string => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal).split('T')[0] || '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const safeOrdersList = Array.isArray(orders) ? orders : [];

  // Filtragem de Ordens de Serviço
  const filteredOrders = useMemo(() => {
    return safeOrdersList.filter((os) => {
      if (!os) return false;

      // Filtro de Data (CreatedAt ou EntryDate)
      const orderDateStr = getIsoDateSafe(os.createdAt || os.entryDate);

      if (startDate && orderDateStr && orderDateStr < startDate) return false;
      if (endDate && orderDateStr && orderDateStr > endDate) return false;

      // Filtro de Status
      const st = (os.status || 'ABERTA').toUpperCase();
      if (statusFilter !== 'TODOS') {
        if (statusFilter === 'ABERTA') {
          if (['FINALIZADA', 'CONCLUIDA', 'CANCELADA', 'EXCLUIDA'].includes(st)) return false;
        } else if (statusFilter === 'FINALIZADA') {
          if (st !== 'FINALIZADA' && st !== 'CONCLUIDA') return false;
        } else if (statusFilter === 'CANCELADA') {
          if (st !== 'CANCELADA') return false;
        } else if (statusFilter === 'EXCLUIDA') {
          if (st !== 'EXCLUIDA') return false;
        }
      }

      // Busca textual insensível a acentos
      if (searchTerm.trim()) {
        const codeMatch = matchesSearchTerm(String(os.code || ''), searchTerm);
        const clientMatch = matchesSearchTerm(os.client?.name, searchTerm);
        const eqType = matchesSearchTerm(os.equipment?.type, searchTerm);
        const eqBrand = matchesSearchTerm(os.equipment?.brand, searchTerm);
        const eqModel = matchesSearchTerm(os.equipment?.model, searchTerm);

        if (!codeMatch && !clientMatch && !eqType && !eqBrand && !eqModel) return false;
      }

      return true;
    });
  }, [safeOrdersList, startDate, endDate, statusFilter, searchTerm]);

  // Filtragem de Vendas de Balcão
  const filteredSales = useMemo(() => {
    return salesList.filter((sale) => {
      if (!sale) return false;

      const saleDate = getIsoDateSafe(sale.createdAt || sale.date);
      if (startDate && saleDate && saleDate < startDate) return false;
      if (endDate && saleDate && saleDate > endDate) return false;

      if (paymentFilter !== 'TODOS') {
        const pm = (sale.paymentMethod || '').toUpperCase();
        if (!pm.includes(paymentFilter.toUpperCase())) return false;
      }

      if (searchTerm.trim()) {
        const codeMatch = matchesSearchTerm(sale.saleCode, searchTerm);
        const clientMatch = matchesSearchTerm(sale.clientName, searchTerm);
        const sellerMatch = matchesSearchTerm(sale.sellerName, searchTerm);
        const itemsMatch = sale.items?.some((i) => matchesSearchTerm(i.name, searchTerm));

        if (!codeMatch && !clientMatch && !sellerMatch && !itemsMatch) return false;
      }

      return true;
    });
  }, [salesList, startDate, endDate, paymentFilter, searchTerm]);

  // Filtragem de Clientes
  const filteredClients = useMemo(() => {
    return clientsList.filter((cli) => {
      if (!cli) return false;
      if (!searchTerm.trim()) return true;
      return (
        matchesSearchTerm(cli.name, searchTerm) ||
        matchesSearchTerm(cli.cpfCnpj, searchTerm) ||
        matchesSearchTerm(cli.phone, searchTerm) ||
        matchesSearchTerm(cli.whatsapp, searchTerm) ||
        matchesSearchTerm(cli.city, searchTerm) ||
        matchesSearchTerm(cli.address, searchTerm)
      );
    });
  }, [clientsList, searchTerm]);

  // Filtragem de Equipamentos
  const filteredEquipments = useMemo(() => {
    return equipmentsList.filter((eq) => {
      if (!eq) return false;
      if (!searchTerm.trim()) return true;
      return (
        matchesSearchTerm(eq.type, searchTerm) ||
        matchesSearchTerm(eq.brand, searchTerm) ||
        matchesSearchTerm(eq.model, searchTerm) ||
        matchesSearchTerm(eq.category, searchTerm) ||
        matchesSearchTerm(eq.name, searchTerm)
      );
    });
  }, [equipmentsList, searchTerm]);

  // Filtragem de Peças
  const filteredParts = useMemo(() => {
    return partsList.filter((prt) => {
      if (!prt) return false;
      if (!searchTerm.trim()) return true;
      return (
        matchesSearchTerm(prt.name, searchTerm) ||
        matchesSearchTerm(String(prt.code || ''), searchTerm) ||
        matchesSearchTerm(prt.manufacturerCode, searchTerm) ||
        matchesSearchTerm(prt.application, searchTerm) ||
        matchesSearchTerm(prt.group, searchTerm) ||
        matchesSearchTerm(prt.location, searchTerm)
      );
    });
  }, [partsList, searchTerm]);

  // Estatísticas Consolidadas do Período
  const stats = useMemo(() => {
    let totalOS = filteredOrders.length;
    let abertasOS = 0;
    let finalizadasOS = 0;
    let canceladasOS = 0;
    let excluidasOS = 0;
    let faturamentoOS = 0;

    filteredOrders.forEach((os) => {
      if (!os) return;
      const st = (os.status || 'ABERTA').toUpperCase();
      const val = typeof os.totalAmount === 'number' ? os.totalAmount : parseFloat(String(os.totalAmount || '0').replace('.', '').replace(',', '.')) || 0;
      if (st === 'EXCLUIDA') {
        excluidasOS++;
      } else if (st === 'CANCELADA') {
        canceladasOS++;
      } else if (st === 'FINALIZADA' || st === 'CONCLUIDA') {
        finalizadasOS++;
        faturamentoOS += val;
      } else {
        abertasOS++;
        faturamentoOS += val;
      }
    });

    let totalVendas = filteredSales.length;
    let faturamentoVendas = filteredSales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
    let totalItensVendidos = filteredSales.reduce((acc, s) => acc + (s.items?.reduce((ia, i) => ia + (i.qty || 1), 0) || 0), 0);

    const faturamentoTotalGeral = faturamentoOS + faturamentoVendas;

    let totalEstoquePecas = partsList.reduce((acc, p) => acc + (Number(p.stockQuantity) || 0), 0);
    let valorEstoquePecas = partsList.reduce((acc, p) => {
      const price = parseFloat(String(p.finalPrice || '0').replace(/\./g, '').replace(',', '.')) || 0;
      return acc + price * (Number(p.stockQuantity) || 0);
    }, 0);

    return {
      totalOS,
      abertasOS,
      finalizadasOS,
      canceladasOS,
      excluidasOS,
      faturamentoOS,
      totalVendas,
      faturamentoVendas,
      totalItensVendidos,
      faturamentoTotalGeral,
      totalClientes: clientsList.length,
      totalEquipamentos: equipmentsList.length,
      totalPecas: partsList.length,
      totalEstoquePecas,
      valorEstoquePecas,
    };
  }, [filteredOrders, filteredSales, clientsList, equipmentsList, partsList]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Paginação por Folha A4 (Padrão: 25 registros por folha A4)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  // Reseta para a página 1 ao mudar aba ou filtros
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeReportTab, startDate, endDate, statusFilter, paymentFilter, searchTerm]);

  // Total de itens baseado na aba ativa
  const activeListLength = useMemo(() => {
    switch (activeReportTab) {
      case 'OS': return filteredOrders.length;
      case 'VENDAS': return filteredSales.length;
      case 'CLIENTES': return filteredClients.length;
      case 'EQUIPAMENTOS': return filteredEquipments.length;
      case 'PECAS': return filteredParts.length;
      case 'TODOS': default:
        return Math.max(
          filteredOrders.length,
          filteredSales.length,
          filteredClients.length,
          filteredEquipments.length,
          filteredParts.length
        );
    }
  }, [activeReportTab, filteredOrders.length, filteredSales.length, filteredClients.length, filteredEquipments.length, filteredParts.length]);

  const totalPages = Math.max(1, Math.ceil(activeListLength / itemsPerPage));

  // Aplica fatia (slice) para exibição compacta por folha A4
  const paginatedOrders = useMemo(() => {
    if (itemsPerPage >= 9999) return filteredOrders;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const paginatedSales = useMemo(() => {
    if (itemsPerPage >= 9999) return filteredSales;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage, itemsPerPage]);

  const paginatedClients = useMemo(() => {
    if (itemsPerPage >= 9999) return filteredClients;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(start, start + itemsPerPage);
  }, [filteredClients, currentPage, itemsPerPage]);

  const paginatedEquipments = useMemo(() => {
    if (itemsPerPage >= 9999) return filteredEquipments;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEquipments.slice(start, start + itemsPerPage);
  }, [filteredEquipments, currentPage, itemsPerPage]);

  const paginatedParts = useMemo(() => {
    if (itemsPerPage >= 9999) return filteredParts;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredParts.slice(start, start + itemsPerPage);
  }, [filteredParts, currentPage, itemsPerPage]);

  if (!isOpen) return null;

  const handlePrintReport = () => {
    const todayStr = new Date().toLocaleDateString('pt-BR');
    const periodLabel = `${startDate ? formatDateSafe(startDate) : 'Início'} até ${endDate ? formatDateSafe(endDate) : 'Hoje'}`;

    const reportTitle = activeReportTab === 'OS' 
      ? 'RELATÓRIO DE ORDENS DE SERVIÇO' 
      : activeReportTab === 'VENDAS' 
      ? 'RELATÓRIO DE VENDAS DE BALCÃO' 
      : activeReportTab === 'CLIENTES' 
      ? 'RELATÓRIO DE CLIENTES CADASTRADOS' 
      : activeReportTab === 'EQUIPAMENTOS' 
      ? 'RELATÓRIO DE EQUIPAMENTOS' 
      : activeReportTab === 'PECAS' 
      ? 'RELATÓRIO DE PEÇAS E ESTOQUE' 
      : 'RELATÓRIO GERAL CONSOLIDADO';

    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>${reportTitle} - ${periodLabel}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5px; color: #111; margin: 0; padding: 0; line-height: 1.15; }
            .header { border-bottom: 1.5px solid #000; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: flex-start; }
            .company-name { font-size: 13px; font-weight: bold; text-transform: uppercase; }
            .title { font-size: 12px; font-weight: bold; text-align: right; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 9px; }
            th { background: #f2f2f2; border: 1px solid #777; padding: 3px 4px; font-weight: bold; text-align: left; text-transform: uppercase; font-size: 8.5px; white-space: nowrap; }
            td { border: 1px solid #bbb; padding: 2.5px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .total-box { margin-top: 6px; padding: 4px 8px; background: #f7f7f7; border: 1px solid #bbb; font-size: 10px; font-weight: bold; text-align: right; }
            .section-title { font-weight: bold; font-size: 10px; margin-top: 8px; margin-bottom: 2px; text-transform: uppercase; }
            .page-break { page-break-after: always; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company-name">${safeCompany.tradingName || safeCompany.name || 'VOLLEN - ASSISTÊNCIA TÉCNICA'}</div>
              <div style="font-size: 8.5px; color: #444;">
                ${safeCompany.cnpj ? `CNPJ: ${safeCompany.cnpj} • ` : ''}Tel: ${safeCompany.phone || ''} ${safeCompany.whatsapp ? `• Whats: ${safeCompany.whatsapp}` : ''}
              </div>
            </div>
            <div>
              <div class="title">${reportTitle}</div>
              <div style="font-size: 8.5px; text-align: right;">Período: ${periodLabel}</div>
              <div style="font-size: 8px; color: #666; text-align: right;">Emitido em: ${todayStr}</div>
            </div>
          </div>

          ${(activeReportTab === 'TODOS' || activeReportTab === 'OS') ? `
            <div class="section-title">Ordens de Serviço (${filteredOrders.length} registros)</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 55px;">Nº OS</th>
                  <th style="width: 65px;">Data</th>
                  <th style="width: 140px;">Cliente</th>
                  <th style="width: 85px;">Telefone</th>
                  <th>Equipamento</th>
                  <th style="width: 75px; text-align: center;">Status</th>
                  <th style="width: 75px; text-align: right;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${filteredOrders.map((os) => {
                  const isDel = (os.status || '').toUpperCase() === 'EXCLUIDA';
                  const dFormatted = formatDateSafe(os.createdAt || os.entryDate);
                  const st = (os.status || 'ABERTA').toUpperCase();
                  const totalNum = typeof os.totalAmount === 'number' ? os.totalAmount : parseFloat(String(os.totalAmount || '0').replace('.', '').replace(',', '.')) || 0;
                  return `
                    <tr>
                      <td style="font-family: monospace; font-weight: bold;">${os.code || '-'}</td>
                      <td>${isDel ? '-' : dFormatted}</td>
                      <td style="max-width: 140px;">${os.client?.name || '-'}</td>
                      <td style="max-width: 85px;">${isDel ? '-' : (os.client?.whatsapp || os.client?.phone || '-')}</td>
                      <td style="max-width: 200px;">${os.equipment?.type || ''} ${os.equipment?.brand || ''} ${os.equipment?.model || ''}</td>
                      <td style="text-align: center;">${st}</td>
                      <td style="text-align: right; font-weight: bold;">${isDel ? '-' : `R$ ${totalNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            <div class="total-box">
              Total OS: R$ ${stats.faturamentoOS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          ` : ''}

          ${(activeReportTab === 'TODOS' || activeReportTab === 'VENDAS') ? `
            <div class="section-title" style="margin-top: 10px;">Vendas Diretas de Balcão (${filteredSales.length} vendas)</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 55px;">Cód</th>
                  <th style="width: 65px;">Data</th>
                  <th style="width: 140px;">Cliente</th>
                  <th>Itens Vendidos</th>
                  <th style="width: 75px;">Pagamento</th>
                  <th style="width: 80px;">Vendedor</th>
                  <th style="width: 75px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${filteredSales.map((sale) => `
                  <tr>
                    <td style="font-family: monospace; font-weight: bold;">${sale.saleCode}</td>
                    <td>${sale.date}</td>
                    <td style="max-width: 140px;">${sale.clientName}</td>
                    <td style="max-width: 240px;">${sale.items?.map((i) => `${i.qty}x ${i.name}`).join(', ')}</td>
                    <td>${sale.paymentMethod}</td>
                    <td style="max-width: 80px;">${sale.sellerName}</td>
                    <td style="text-align: right; font-weight: bold;">R$ ${Number(sale.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total-box">
              Total Vendas: R$ ${stats.faturamentoVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          ` : ''}

          ${(activeReportTab === 'TODOS' || activeReportTab === 'CLIENTES') ? `
            <div class="section-title" style="margin-top: 10px;">Clientes (${filteredClients.length} registros)</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 55px;">Cód</th>
                  <th style="width: 160px;">Nome / Razão Social</th>
                  <th style="width: 95px;">CPF / CNPJ</th>
                  <th style="width: 85px;">WhatsApp</th>
                  <th style="width: 85px;">Telefone</th>
                  <th>Cidade / UF</th>
                </tr>
              </thead>
              <tbody>
                ${filteredClients.map((cli) => `
                  <tr>
                    <td style="font-family: monospace; font-weight: bold;">${cli.code || cli.id?.slice(0, 6) || '-'}</td>
                    <td style="max-width: 160px;">${cli.name || '-'}</td>
                    <td>${cli.cpfCnpj || '-'}</td>
                    <td>${cli.whatsapp || '-'}</td>
                    <td>${cli.phone || '-'}</td>
                    <td>${cli.city || '-'} ${cli.state ? `(${cli.state})` : ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          ${(activeReportTab === 'TODOS' || activeReportTab === 'EQUIPAMENTOS') ? `
            <div class="section-title" style="margin-top: 10px;">Equipamentos (${filteredEquipments.length} registros)</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 110px;">Tipo / Categoria</th>
                  <th style="width: 100px;">Marca</th>
                  <th style="width: 110px;">Modelo</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                ${filteredEquipments.map((eq) => `
                  <tr>
                    <td style="font-weight: bold;">${eq.type || eq.category || '-'}</td>
                    <td>${eq.brand || '-'}</td>
                    <td>${eq.model || '-'}</td>
                    <td>${eq.notes || eq.serialNumber || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          ${(activeReportTab === 'TODOS' || activeReportTab === 'PECAS') ? `
            <div class="section-title" style="margin-top: 10px;">Peças e Estoque (${filteredParts.length} itens)</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 60px;">Código</th>
                  <th style="width: 180px;">Descrição da Peça</th>
                  <th>Aplicação</th>
                  <th style="width: 55px; text-align: center;">Estoque</th>
                  <th style="width: 75px; text-align: right;">Preço</th>
                </tr>
              </thead>
              <tbody>
                ${filteredParts.map((prt) => {
                  const price = parseFloat(String(prt.finalPrice || '0').replace(/\./g, '').replace(',', '.')) || 0;
                  return `
                    <tr>
                      <td style="font-family: monospace; font-weight: bold;">${prt.code || '-'}</td>
                      <td style="max-width: 180px;">${prt.name || '-'}</td>
                      <td>${prt.application || '-'}</td>
                      <td style="text-align: center; font-weight: bold;">${prt.stockQuantity || 0}</td>
                      <td style="text-align: right; font-weight: bold;">R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            <div class="total-box">
              Valor Total do Estoque: R$ ${stats.valorEstoquePecas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          ` : ''}

        </body>
      </html>
    `;

    // Acionamento único de impressão via iframe oculto
    try {
      const oldFrame = document.getElementById('hidden-print-report-iframe');
      if (oldFrame) {
        oldFrame.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'hidden-print-report-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(reportHtml);
        frameDoc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => {
              try {
                iframe.remove();
              } catch {}
            }, 1000);
          } catch (e) {
            console.error('Erro ao acionar print no iframe:', e);
          }
        }, 300);
        return;
      }
    } catch (err) {
      console.warn('Falha no iframe oculto de impressão:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const st = (status || 'ABERTA').toUpperCase();
    if (st === 'EXCLUIDA') {
      return (
        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-red-600 text-white leading-none inline-block">
          EXCLUÍDA
        </span>
      );
    }
    if (st === 'CANCELADA') {
      return (
        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-slate-200 text-slate-700 leading-none inline-block">
          CANCELADA
        </span>
      );
    }
    if (st === 'FINALIZADA' || st === 'CONCLUIDA') {
      return (
        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 leading-none inline-block">
          FINALIZADA
        </span>
      );
    }
    if (st === 'EM_ATENDIMENTO' || st === 'VISITA_TECNICA') {
      return (
        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 leading-none inline-block">
          EM ATENDIMENTO
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300 leading-none inline-block">
        ABERTA
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 select-none"
      onClick={() => setSelectedOrderId(null)}
    >
      <div
        className="bg-white border border-slate-300 rounded-2xl w-full max-w-6xl h-[94vh] flex flex-col shadow-2xl overflow-hidden font-sans relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-3 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-sky-500/20 border border-sky-400/40 p-2 rounded-xl text-sky-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight leading-none text-white">
                  Central de Relatórios Gerais
                </h2>
                <span className="bg-sky-500/30 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-400/40">
                  OS • Vendas • Clientes • Peças • Equipamentos
                </span>
              </div>
              <p className="text-[11px] text-sky-200 mt-0.5">
                Consolidação completa e exportação para impressão com filtros dinâmicos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintReport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-xs transition-colors cursor-pointer"
              title="Imprimir Relatório com a visualização selecionada"
            >
              <Printer className="w-4 h-4" />
              Imprimir Relatório
            </button>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Abas Superiores de Seleção de Relatório */}
        <div className="bg-slate-800 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 border-b border-slate-700">
          <button
            type="button"
            onClick={() => setActiveReportTab('TODOS')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeReportTab === 'TODOS'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Visão Consolidada
          </button>

          <button
            type="button"
            onClick={() => setActiveReportTab('OS')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeReportTab === 'OS'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Ordens de Serviço ({filteredOrders.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveReportTab('VENDAS')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeReportTab === 'VENDAS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Vendas de Balcão ({filteredSales.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveReportTab('CLIENTES')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeReportTab === 'CLIENTES'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Clientes ({filteredClients.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveReportTab('EQUIPAMENTOS')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeReportTab === 'EQUIPAMENTOS'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Equipamentos ({filteredEquipments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveReportTab('PECAS')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeReportTab === 'PECAS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Peças e Estoque ({filteredParts.length})
          </button>
        </div>

        {/* Filtros Contextuais */}
        <div className="p-2.5 bg-slate-100 border-b border-slate-300 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs shrink-0">
          {(activeReportTab === 'TODOS' || activeReportTab === 'OS' || activeReportTab === 'VENDAS') && (
            <>
              {/* Data Inicial */}
              <div>
                <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">Data Inicial</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                />
              </div>

              {/* Data Final */}
              <div>
                <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">Data Final</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                />
              </div>
            </>
          )}

          {/* Filtro Específico */}
          <div>
            {activeReportTab === 'VENDAS' ? (
              <>
                <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">Forma de Pagamento</label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-emerald-600 cursor-pointer text-xs"
                >
                  <option value="TODOS">Todas as Formas</option>
                  <option value="DINHEIRO">💵 Dinheiro</option>
                  <option value="PIX">📱 PIX</option>
                  <option value="CARTAO_DEBITO">💳 Cartão de Débito</option>
                  <option value="CARTAO_CREDITO">💳 Cartão de Crédito</option>
                </select>
              </>
            ) : (activeReportTab === 'TODOS' || activeReportTab === 'OS') ? (
              <>
                <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">Status das Ordens (OS)</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 cursor-pointer text-xs"
                >
                  <option value="TODOS">📋 Todas as OS</option>
                  <option value="ABERTA">⏳ Abertas / Em Atendimento</option>
                  <option value="FINALIZADA">✅ Finalizadas / Concluídas</option>
                  <option value="CANCELADA">🚫 Canceladas</option>
                  <option value="EXCLUIDA">🗑️ Excluídas</option>
                </select>
              </>
            ) : (
              <div className="flex flex-col justify-end">
                <span className="text-[11px] font-bold text-slate-500">Módulo Selecionado</span>
                <span className="font-bold text-slate-800 text-xs py-1">
                  {activeReportTab === 'CLIENTES' && '👥 Base de Clientes Cadastrados'}
                  {activeReportTab === 'EQUIPAMENTOS' && '💻 Cadastro de Equipamentos'}
                  {activeReportTab === 'PECAS' && '📦 Catálogo e Estoque de Peças'}
                </span>
              </div>
            )}
          </div>

          {/* Busca por Texto */}
          <div>
            <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">Pesquisar Registros</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome, código, modelo, telefone..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-2.5 py-1 text-slate-800 text-xs focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>
        </div>

        {/* Resumo de Indicadores Consolidados */}
        <div className="bg-slate-200/80 border-b border-slate-300 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-700 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-white px-2 py-0.5 rounded border border-slate-300">
              OS: <strong className="text-sky-900 font-mono">{filteredOrders.length}</strong>
            </span>
            <span className="bg-white px-2 py-0.5 rounded border border-slate-300">
              Vendas: <strong className="text-emerald-900 font-mono">{filteredSales.length}</strong>
            </span>
            <span className="bg-white px-2 py-0.5 rounded border border-slate-300">
              Clientes: <strong className="text-indigo-900 font-mono">{filteredClients.length}</strong>
            </span>
            <span className="bg-white px-2 py-0.5 rounded border border-slate-300">
              Peças: <strong className="text-amber-900 font-mono">{filteredParts.length}</strong> ({stats.totalEstoquePecas} unid.)
            </span>
          </div>

          <div className="text-emerald-950 font-black bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-xl shadow-2xs text-xs flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-700" />
            <span>Faturamento Total (OS + Vendas):</span>
            <span className="text-emerald-800 font-mono text-sm">
              R$ {stats.faturamentoTotalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Conteúdo das Tabelas Compactas (Espaço Mínimo por Item) */}
        <div className="flex-1 overflow-y-auto p-2 bg-slate-50 space-y-2.5">
          {/* TABELA 1: ORDENS DE SERVIÇO */}
          {(activeReportTab === 'TODOS' || activeReportTab === 'OS') && (
            <div className="bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
              <div className="px-2.5 py-1 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                <span className="font-black text-slate-800 text-[11px] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-700" />
                  Ordens de Serviço ({filteredOrders.length} OS listadas)
                </span>
                <span className="text-[10.5px] font-bold text-sky-900">
                  Subtotal OS: R$ {stats.faturamentoOS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-1.5 py-1 border-r border-slate-200 w-16 whitespace-nowrap">Nº OS</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 w-20 whitespace-nowrap">Data</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 whitespace-nowrap">Cliente</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 w-24 whitespace-nowrap">Telefone</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 whitespace-nowrap">Equipamento / Aparelho</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 text-center w-24 whitespace-nowrap">Status</th>
                    <th className="px-1.5 py-1 text-right w-20 whitespace-nowrap">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px]">
                  {paginatedOrders.map((os) => {
                    const isDeleted = (os.status || '').toUpperCase() === 'EXCLUIDA';
                    const isSelected = os.id === selectedOrderId;
                    const dateFormatted = formatDateSafe(os.createdAt || os.entryDate);
                    const totalNum = typeof os.totalAmount === 'number' ? os.totalAmount : parseFloat(String(os.totalAmount || '0').replace('.', '').replace(',', '.')) || 0;
                    const eqText = `${os.equipment?.type || ''} ${os.equipment?.brand || ''} ${os.equipment?.model || ''}`.trim() || '-';

                    return (
                      <tr
                        key={os.id || `ord-${Math.random()}`}
                        data-row="true"
                        onClick={() => setSelectedOrderId(os.id)}
                        onDoubleClick={() => onOpenOrderDetails && onOpenOrderDetails(os)}
                        className={`cursor-pointer transition-colors leading-none h-6 ${
                          isSelected
                            ? 'bg-sky-100 text-sky-950 font-bold border-l-3 border-sky-600'
                            : 'hover:bg-slate-50 bg-white'
                        }`}
                      >
                        <td className="px-1.5 py-0.5 border-r border-slate-100 font-mono font-bold text-sky-700 whitespace-nowrap">
                          {os.code || '-'}
                        </td>
                        <td className="px-1.5 py-0.5 border-r border-slate-100 font-mono text-slate-600 text-[9.5px] whitespace-nowrap">
                          {dateFormatted}
                        </td>
                        <td className="px-1.5 py-0.5 border-r border-slate-100 font-bold text-slate-900 truncate max-w-[150px] whitespace-nowrap" title={os.client?.name}>
                          {os.client?.name || '-'}
                        </td>
                        <td className="px-1.5 py-0.5 border-r border-slate-100 text-slate-700 truncate max-w-[100px] text-[9.5px] whitespace-nowrap" title={os.client?.whatsapp || os.client?.phone}>
                          {os.client?.whatsapp || os.client?.phone || '-'}
                        </td>
                        <td className="px-1.5 py-0.5 border-r border-slate-100 text-slate-800 truncate max-w-[190px] whitespace-nowrap" title={eqText}>
                          {eqText}
                        </td>
                        <td className="px-1.5 py-0.5 border-r border-slate-100 text-center whitespace-nowrap">
                          {getStatusBadge(os.status)}
                        </td>
                        <td className="px-1.5 py-0.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {isDeleted ? '-' : `R$ ${totalNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-3 text-slate-400 text-[10px]">
                        Nenhuma Ordem de Serviço encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TABELA 2: VENDAS DE BALCÃO */}
          {(activeReportTab === 'TODOS' || activeReportTab === 'VENDAS') && (
            <div className="bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
              <div className="px-2.5 py-1 bg-emerald-50/80 border-b border-emerald-200 flex items-center justify-between">
                <span className="font-black text-emerald-950 text-[11px] flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-700" />
                  Vendas Diretas de Balcão ({filteredSales.length} vendas)
                </span>
                <span className="text-[10.5px] font-bold text-emerald-900">
                  Subtotal Vendas: R$ {stats.faturamentoVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-1.5 py-1 border-r border-slate-200 w-16 whitespace-nowrap">Cód</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 w-24 whitespace-nowrap">Data / Hora</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 whitespace-nowrap">Cliente</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 whitespace-nowrap">Itens / Peças Vendidas</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 w-20 whitespace-nowrap">Forma Pgto</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 w-20 whitespace-nowrap">Vendedor</th>
                    <th className="px-1.5 py-1 text-right w-20 whitespace-nowrap">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px]">
                  {paginatedSales.map((sale) => {
                    const itemsSummary = sale.items?.map((i) => `${i.qty}x ${i.name}`).join(', ') || '-';
                    return (
                      <tr key={sale.id} className="hover:bg-emerald-50/40 transition-colors leading-none h-6">
                        <td className="px-1.5 py-0.5 border-r border-slate-100 font-mono font-bold text-emerald-800 whitespace-nowrap">
                          {sale.saleCode}
                        </td>
                        <td className="px-1.5 py-0.5 border-r border-slate-100 font-mono text-slate-600 text-[9.5px] whitespace-nowrap">
                          {sale.date} <span className="text-slate-400">{sale.time}</span>
                        </td>
                        <td className="px-1.5 py-0.5 border-r border-slate-100 font-bold text-slate-900 truncate max-w-[150px] whitespace-nowrap" title={sale.clientName}>
                          {sale.clientName}
                        </td>
                        <td className="px-1.5 py-0.5 border-r border-slate-100 text-slate-700 truncate max-w-[250px] whitespace-nowrap" title={itemsSummary}>
                          {itemsSummary}
                        </td>
                        <td className="px-1.5 py-0.5 border-r border-slate-100 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-800 font-bold px-1 py-0.2 rounded text-[8.5px] border border-slate-200 leading-none inline-block">
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="px-1.5 py-0.5 border-r border-slate-100 font-medium text-slate-700 truncate max-w-[90px] whitespace-nowrap" title={sale.sellerName}>
                          {sale.sellerName || '-'}
                        </td>
                        <td className="px-1.5 py-0.5 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                          R$ {Number(sale.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-3 text-slate-400 text-[10px]">
                        Nenhuma venda de balcão encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TABELA 3: CLIENTES */}
          {(activeReportTab === 'TODOS' || activeReportTab === 'CLIENTES') && (
            <div className="bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
              <div className="px-2.5 py-1 bg-indigo-50/80 border-b border-indigo-200 flex items-center justify-between">
                <span className="font-black text-indigo-950 text-[11px] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-700" />
                  Base de Clientes Cadastrados ({filteredClients.length} clientes)
                </span>
              </div>

              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-1.5 py-1 border-r border-slate-200 w-16 whitespace-nowrap">Cód</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 whitespace-nowrap">Nome / Razão Social</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 w-28 whitespace-nowrap">CPF / CNPJ</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 w-24 whitespace-nowrap">WhatsApp</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 w-24 whitespace-nowrap">Telefone</th>
                    <th className="px-1.5 py-1 whitespace-nowrap">Cidade / UF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px]">
                  {paginatedClients.map((cli) => (
                    <tr key={cli.id} className="hover:bg-indigo-50/30 transition-colors leading-none h-6">
                      <td className="px-1.5 py-0.5 border-r border-slate-100 font-mono font-bold text-indigo-800 whitespace-nowrap">
                        {cli.code || cli.id?.slice(0, 6) || '-'}
                      </td>
                      <td className="px-1.5 py-0.5 border-r border-slate-100 font-bold text-slate-900 truncate max-w-[190px] whitespace-nowrap" title={cli.name}>
                        {cli.name || '-'}
                      </td>
                      <td className="px-1.5 py-0.5 border-r border-slate-100 font-mono text-slate-700 whitespace-nowrap text-[9.5px]">
                        {cli.cpfCnpj || '-'}
                      </td>
                      <td className="px-1.5 py-0.5 border-r border-slate-100 text-slate-700 whitespace-nowrap text-[9.5px]">
                        {cli.whatsapp || '-'}
                      </td>
                      <td className="px-1.5 py-0.5 border-r border-slate-100 text-slate-700 whitespace-nowrap text-[9.5px]">
                        {cli.phone || '-'}
                      </td>
                      <td className="px-1.5 py-0.5 text-slate-700 truncate max-w-[150px] whitespace-nowrap">
                        {cli.city || '-'} {cli.state ? `(${cli.state})` : ''}
                      </td>
                    </tr>
                  ))}

                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-3 text-slate-400 text-[10px]">
                        Nenhum cliente encontrado para a busca informada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TABELA 4: EQUIPAMENTOS */}
          {(activeReportTab === 'TODOS' || activeReportTab === 'EQUIPAMENTOS') && (
            <div className="bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
              <div className="px-2.5 py-1 bg-purple-50/80 border-b border-purple-200 flex items-center justify-between">
                <span className="font-black text-purple-950 text-[11px] flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-purple-700" />
                  Cadastro de Equipamentos ({filteredEquipments.length} itens)
                </span>
              </div>

              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-1.5 py-1 border-r border-slate-200 w-32 whitespace-nowrap">Tipo / Categoria</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 w-28 whitespace-nowrap">Marca</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 w-32 whitespace-nowrap">Modelo</th>
                    <th className="px-1.5 py-1 whitespace-nowrap">Observações / Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px]">
                  {paginatedEquipments.map((eq) => (
                    <tr key={eq.id} className="hover:bg-purple-50/30 transition-colors leading-none h-6">
                      <td className="px-1.5 py-0.5 border-r border-slate-100 font-bold text-purple-900 whitespace-nowrap">
                        {eq.type || eq.category || '-'}
                      </td>
                      <td className="px-1.5 py-0.5 border-r border-slate-100 font-medium text-slate-800 whitespace-nowrap">
                        {eq.brand || '-'}
                      </td>
                      <td className="px-1.5 py-0.5 border-r border-slate-100 font-mono text-slate-800 whitespace-nowrap">
                        {eq.model || '-'}
                      </td>
                      <td className="px-1.5 py-0.5 text-slate-600 truncate max-w-sm whitespace-nowrap" title={eq.notes || eq.serialNumber}>
                        {eq.notes || eq.serialNumber || '-'}
                      </td>
                    </tr>
                  ))}

                  {filteredEquipments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-3 text-slate-400 text-[10px]">
                        Nenhum equipamento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TABELA 5: PEÇAS E ESTOQUE */}
          {(activeReportTab === 'TODOS' || activeReportTab === 'PECAS') && (
            <div className="bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
              <div className="px-2.5 py-1 bg-amber-50/80 border-b border-amber-200 flex items-center justify-between">
                <span className="font-black text-amber-950 text-[11px] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-700" />
                  Catálogo e Tabela de Peças ({filteredParts.length} peças cadastradas)
                </span>
                <span className="text-[10.5px] font-bold text-amber-950">
                  Estoque: {stats.totalEstoquePecas} unid. • Valor Total: R$ {stats.valorEstoquePecas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-1.5 py-1 border-r border-slate-200 w-20 whitespace-nowrap">Código</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 whitespace-nowrap">Descrição da Peça</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 whitespace-nowrap">Aplicação / Compatibilidade</th>
                    <th className="px-1.5 py-1 border-r border-slate-200 w-16 text-center whitespace-nowrap">Estoque</th>
                    <th className="px-1.5 py-1 text-right w-20 whitespace-nowrap">Preço Venda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px]">
                  {paginatedParts.map((prt) => {
                    const price = parseFloat(String(prt.finalPrice || '0').replace(/\./g, '').replace(',', '.')) || 0;
                    return (
                      <tr key={prt.id} className="hover:bg-amber-50/30 transition-colors leading-none h-6">
                        <td className="px-1.5 py-0.5 border-r border-slate-100 font-mono font-bold text-amber-800 whitespace-nowrap">
                          {prt.code || '-'}
                        </td>
                        <td className="px-1.5 py-0.5 border-r border-slate-100 font-bold text-slate-900 truncate max-w-[190px] whitespace-nowrap" title={prt.name}>
                          {prt.name || '-'}
                        </td>
                        <td className="px-1.5 py-0.5 border-r border-slate-100 text-slate-700 truncate max-w-[190px] whitespace-nowrap" title={prt.application}>
                          {prt.application || '-'}
                        </td>
                        <td className="px-1.5 py-0.5 border-r border-slate-100 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                          {prt.stockQuantity || 0}
                        </td>
                        <td className="px-1.5 py-0.5 text-right font-mono font-bold text-amber-900 whitespace-nowrap">
                          R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredParts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-3 text-slate-400 text-[10px]">
                        Nenhuma peça encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rodapé com Navegação por Folha A4 e Controles */}
        <div className="p-2.5 bg-slate-200 border-t border-slate-300 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 select-none">
          {/* Informações e Seletor de Folha A4 */}
          <div className="flex items-center gap-3">
            <span className="text-slate-700 font-bold">
              Página <strong className="text-slate-900 font-mono">{currentPage}</strong> de <strong className="text-slate-900 font-mono">{totalPages}</strong>
              <span className="text-slate-500 font-normal ml-1">({activeListLength} registros no total)</span>
            </span>

            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2 py-0.5 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-600">Exibir por folha:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
              >
                <option value={25}>25 itens (1 Folha A4)</option>
                <option value={30}>30 itens (1 Folha A4 Compacta)</option>
                <option value={50}>50 itens (2 Folhas A4)</option>
                <option value={99999}>Todos os itens</option>
              </select>
            </div>
          </div>

          {/* Botões de Navegação entre Folhas A4 */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700 cursor-pointer"
              title="Primeira Folha"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700 font-bold flex items-center gap-1 cursor-pointer"
              title="Folha Anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </button>

            <span className="bg-sky-600 text-white font-black px-3 py-1 rounded-lg shadow-2xs text-xs font-mono">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700 font-bold flex items-center gap-1 cursor-pointer"
              title="Próxima Folha"
            >
              Próxima
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700 cursor-pointer"
              title="Última Folha"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="ml-2 bg-slate-300 hover:bg-slate-400 text-slate-800 px-4 py-1.5 rounded-xl font-bold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
