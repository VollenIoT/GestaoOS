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
} from 'lucide-react';
import { matchesSearchTerm } from '../utils/searchUtils';

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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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

  // Filtragem
  const filteredOrders = safeOrdersList.filter((os) => {
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

  // Estatísticas do Período
  const stats = useMemo(() => {
    let total = filteredOrders.length;
    let abertas = 0;
    let finalizadas = 0;
    let canceladas = 0;
    let excluidas = 0;
    let faturamento = 0;

    filteredOrders.forEach((os) => {
      if (!os) return;
      const st = (os.status || 'ABERTA').toUpperCase();
      const val = typeof os.totalAmount === 'number' ? os.totalAmount : parseFloat(String(os.totalAmount || '0').replace('.', '').replace(',', '.')) || 0;
      if (st === 'EXCLUIDA') {
        excluidas++;
      } else if (st === 'CANCELADA') {
        canceladas++;
      } else if (st === 'FINALIZADA' || st === 'CONCLUIDA') {
        finalizadas++;
        faturamento += val;
      } else {
        abertas++;
        faturamento += val;
      }
    });

    return { total, abertas, finalizadas, canceladas, excluidas, faturamento };
  }, [filteredOrders]);

  if (!isOpen) return null;

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=950,height=750');
    if (!printWindow) {
      return alert('Não foi possível abrir a janela de impressão. Por favor, desbloqueie pop-ups.');
    }

    const todayStr = new Date().toLocaleDateString('pt-BR');
    const periodLabel = `${startDate ? formatDateSafe(startDate) : 'Início'} até ${endDate ? formatDateSafe(endDate) : 'Hoje'}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Relatório de Ordens de Serviço - ${periodLabel}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 10px; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start; }
            .company-name { font-size: 16px; font-weight: 900; color: #0f172a; text-transform: uppercase; }
            .title { font-size: 15px; font-weight: 900; color: #0369a1; text-align: right; text-transform: uppercase; }
            .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; margin-bottom: 12px; text-align: center; }
            .stat-box span { display: block; font-size: 9px; text-transform: uppercase; font-weight: bold; color: #64748b; }
            .stat-box strong { font-size: 13px; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 10.5px; }
            th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 5px 6px; font-weight: bold; text-align: left; font-size: 9.5px; text-transform: uppercase; }
            td { border: 1px solid #e2e8f0; padding: 4px 6px; }
            .badge-exc { color: #b91c1c; font-weight: bold; }
            .badge-fin { color: #047857; font-weight: bold; }
            .badge-can { color: #64748b; }
            .badge-ab { color: #b45309; font-weight: bold; }
            .total-val { font-weight: bold; font-family: monospace; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company-name">${safeCompany.tradingName || safeCompany.name || 'VOLLEN - ASSISTÊNCIA TÉCNICA'}</div>
              <div style="font-size: 10px; color: #475569;">
                ${safeCompany.cnpj ? `CNPJ: ${safeCompany.cnpj} • ` : ''}Tel: ${safeCompany.phone || ''} ${safeCompany.whatsapp ? `• Whats: ${safeCompany.whatsapp}` : ''}
              </div>
            </div>
            <div>
              <div class="title">RELATÓRIO DE ORDENS DE SERVIÇO</div>
              <div style="font-size: 10.5px; font-weight: bold; text-align: right; color: #475569;">Período: ${periodLabel}</div>
              <div style="font-size: 9px; color: #64748b; text-align: right;">Emitido em: ${todayStr}</div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-box">
              <span>Total no Período</span>
              <strong>${stats.total} OS</strong>
            </div>
            <div class="stat-box">
              <span style="color: #b45309;">Abertas</span>
              <strong style="color: #b45309;">${stats.abertas}</strong>
            </div>
            <div class="stat-box">
              <span style="color: #047857;">Finalizadas</span>
              <strong style="color: #047857;">${stats.finalizadas}</strong>
            </div>
            <div class="stat-box">
              <span style="color: #b91c1c;">Excluídas</span>
              <strong style="color: #b91c1c;">${stats.excluidas}</strong>
            </div>
            <div class="stat-box">
              <span style="color: #047857;">Faturamento</span>
              <strong style="color: #047857;">R$ ${Number(stats.faturamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 65px;">Nº OS</th>
                <th style="width: 65px;">Data</th>
                <th>Cliente</th>
                <th style="width: 100px;">Telefone</th>
                <th>Equipamento</th>
                <th style="width: 85px; text-align: center;">Status</th>
                <th style="width: 80px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${filteredOrders.map((os) => {
                const isDel = (os.status || '').toUpperCase() === 'EXCLUIDA';
                const dFormatted = formatDateSafe(os.createdAt || os.entryDate);
                const st = (os.status || 'ABERTA').toUpperCase();
                const stClass = isDel ? 'badge-exc' : (st === 'FINALIZADA' || st === 'CONCLUIDA') ? 'badge-fin' : st === 'CANCELADA' ? 'badge-can' : 'badge-ab';
                return `
                  <tr>
                    <td style="font-family: monospace; font-weight: bold;">${os.code || '-'}</td>
                    <td style="font-family: monospace;">${isDel ? '-' : dFormatted}</td>
                    <td style="font-weight: bold;">${os.client?.name || '-'}</td>
                    <td>${isDel ? '-' : (os.client?.whatsapp || os.client?.phone || '-')}</td>
                    <td>${os.equipment?.type || 'Equipamento'} ${os.equipment?.brand || ''} ${os.equipment?.model || ''}</td>
                    <td style="text-align: center;" class="${stClass}">${st}</td>
                    <td class="total-val">${isDel ? '-' : `R$ ${Number(os.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status: string) => {
    const st = (status || 'ABERTA').toUpperCase();
    if (st === 'EXCLUIDA') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white shadow-xs">
          EXCLUÍDA
        </span>
      );
    }
    if (st === 'CANCELADA') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
          CANCELADA
        </span>
      );
    }
    if (st === 'FINALIZADA' || st === 'CONCLUIDA') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          FINALIZADA
        </span>
      );
    }
    if (st === 'EM_ATENDIMENTO' || st === 'VISITA_TECNICA') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
          EM ATENDIMENTO
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
        ABERTA
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={() => setSelectedOrderId(null)}
    >
      <div
        className="bg-white border border-slate-300 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-4 bg-gradient-to-r from-slate-800 to-sky-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-2 rounded-xl">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                Lista de Ordens de Serviço por Período
              </h2>
              <p className="text-xs text-sky-200">
                Relatório resumido com todas as OS do sistema (Abertas, Finalizadas, Canceladas e Excluídas)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintReport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir Relatório
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filtros e Barra de Ações */}
        <div className="p-3 bg-slate-100 border-b border-slate-300 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Data Inicial */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-sky-600"
            />
          </div>

          {/* Data Final */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-sky-600"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Status da OS</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-sky-600 cursor-pointer"
            >
              <option value="TODOS">📋 Todas as OS (Sem Filtro)</option>
              <option value="ABERTA">⏳ Abertas / Em Atendimento</option>
              <option value="FINALIZADA">✅ Finalizadas / Concluídas</option>
              <option value="CANCELADA">🚫 Canceladas</option>
              <option value="EXCLUIDA">🗑️ Excluídas</option>
            </select>
          </div>

          {/* Busca por Texto */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Pesquisar</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cliente, equipamento, OS..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>
        </div>

        {/* Resumo de Indicadores */}
        <div className="bg-slate-200/70 border-b border-slate-300 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-4">
            <span>
              Total: <strong className="text-slate-900 font-mono">{stats.total}</strong>
            </span>
            <span className="text-amber-800">
              Abertas: <strong className="font-mono">{stats.abertas}</strong>
            </span>
            <span className="text-emerald-800">
              Finalizadas: <strong className="font-mono">{stats.finalizadas}</strong>
            </span>
            <span className="text-slate-600">
              Canceladas: <strong className="font-mono">{stats.canceladas}</strong>
            </span>
            <span className="text-red-700 font-black">
              Excluídas: <strong className="font-mono">{stats.excluidas}</strong>
            </span>
          </div>

          <div className="text-slate-900 font-bold bg-white px-3 py-1 rounded-lg border border-slate-300 shadow-xs">
            Faturamento do Período: <span className="text-emerald-700 font-mono">R$ {Number(stats.faturamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Tabela de Ordens */}
        <div
          className="flex-1 overflow-auto p-4 bg-slate-50"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('tr[data-row]') === null) {
              setSelectedOrderId(null);
            }
          }}
        >
          <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-200 text-slate-800 font-bold uppercase text-[11px] border-b border-slate-300 sticky top-0 z-10">
                <tr>
                  <th className="p-2.5 border-r border-slate-300 w-24">Nº OS</th>
                  <th className="p-2.5 border-r border-slate-300 w-24">Data</th>
                  <th className="p-2.5 border-r border-slate-300">Cliente</th>
                  <th className="p-2.5 border-r border-slate-300 w-32">Telefone</th>
                  <th className="p-2.5 border-r border-slate-300">Equipamento / Aparelho</th>
                  <th className="p-2.5 border-r border-slate-300 text-center w-36">Status</th>
                  <th className="p-2.5 text-right w-28">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrders.map((os) => {
                  const isDeleted = (os.status || '').toUpperCase() === 'EXCLUIDA';
                  const isSelected = os.id === selectedOrderId;
                  const dateFormatted = formatDateSafe(os.createdAt || os.entryDate);

                  if (isDeleted) {
                    return (
                      <tr
                        key={os.id || `del-${Math.random()}`}
                        data-row="true"
                        onClick={() => setSelectedOrderId(os.id)}
                        className={`transition-colors font-medium ${
                          isSelected
                            ? 'bg-red-200/90 text-red-950 font-bold border-l-4 border-red-700'
                            : 'bg-red-50/70 text-red-950 hover:bg-red-100/80'
                        }`}
                      >
                        <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-red-700">
                          {os.code || '-'}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-slate-400 font-mono">
                          -
                        </td>
                        <td className="p-2.5 border-r border-slate-200 font-bold text-slate-800">
                          {os.client?.name || 'Cliente não identificado'}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-slate-400">
                          -
                        </td>
                        <td className="p-2.5 border-r border-slate-200 font-medium text-slate-700">
                          {os.equipment?.type || 'Equipamento'} {os.equipment?.brand || ''} {os.equipment?.model || ''}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white shadow-xs">
                            EXCLUÍDA
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-400">
                          -
                        </td>
                      </tr>
                    );
                  }

                  const totalNum = typeof os.totalAmount === 'number' ? os.totalAmount : parseFloat(String(os.totalAmount || '0').replace('.', '').replace(',', '.')) || 0;

                  return (
                    <tr
                      key={os.id || `ord-${Math.random()}`}
                      data-row="true"
                      onClick={() => setSelectedOrderId(os.id)}
                      onDoubleClick={() => onOpenOrderDetails && onOpenOrderDetails(os)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-sky-100 text-sky-950 font-bold border-l-4 border-sky-600'
                          : 'hover:bg-slate-100 bg-white'
                      }`}
                    >
                      <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-sky-700">
                        {os.code || '-'}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 font-mono text-slate-600">
                        {dateFormatted}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900 truncate max-w-[200px]">
                        {os.client?.name || '-'}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-700 truncate">
                        {os.client?.whatsapp || os.client?.phone || '-'}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-800 truncate max-w-[220px]">
                        {os.equipment?.type || ''} {os.equipment?.brand || ''} {os.equipment?.model || ''}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-center">
                        {getStatusBadge(os.status)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        R$ {totalNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      Nenhuma Ordem de Serviço encontrada para o período e filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-3 bg-slate-200 border-t border-slate-300 flex items-center justify-between text-xs">
          <span className="text-slate-600 italic">
            Clique 2x em qualquer OS ativa para visualizar ou editar os detalhes completos.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-300 hover:bg-slate-400 text-slate-800 px-4 py-1.5 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
