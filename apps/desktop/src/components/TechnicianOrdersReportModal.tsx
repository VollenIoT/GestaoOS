import React, { useState, useMemo } from 'react';
import {
  X,
  Wrench,
  Search,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Ban,
  Trash2,
  Filter,
  UserCheck,
} from 'lucide-react';
import { matchesSearchTerm } from '../utils/searchUtils';

interface TechnicianOrdersReportModalProps {
  isOpen: boolean;
  orders: any[];
  technicians?: any[];
  companyInfo?: any;
  onClose: () => void;
  onOpenOrderDetails?: (order: any) => void;
}

export const TechnicianOrdersReportModal: React.FC<TechnicianOrdersReportModalProps> = ({
  isOpen,
  orders = [],
  technicians = [],
  companyInfo = {},
  onClose,
  onOpenOrderDetails,
}) => {
  // Lista de técnicos disponíveis do sistema (carregados de vollen_technicians, vollen_users e das OSs)
  const [syncedTechs, setSyncedTechs] = useState<any[]>([]);

  // Sincroniza em tempo real com o Firestore e localStorage ao abrir
  React.useEffect(() => {
    if (!isOpen) return;

    let unsub = () => {};

    // 1. Tenta carregar do Firestore para garantir dados 100% atualizados
    import('../services/firebase').then(({ db }) => {
      import('firebase/firestore').then(({ collection, onSnapshot, getDocs }) => {
        unsub = onSnapshot(collection(db, 'users'), (snap) => {
          if (!snap.empty) {
            const list = snap.docs
              .map((d) => ({ id: d.id, ...d.data() } as any))
              .filter((u: any) => {
                const role = (u.role || '').toUpperCase();
                return (
                  role === 'TECNICO' ||
                  role === 'TÉCNICO' ||
                  u.isTechnician === true ||
                  u.specialty ||
                  role === 'ADMIN'
                );
              })
              .map((u: any) => ({
                id: u.id,
                name: (u.name || u.username || '').trim(),
              }))
              .filter((u: any) => Boolean(u.name) && u.name !== 'Técnico Exemplo');

            if (list.length > 0) {
              setSyncedTechs(list);
            }
          }
        });
      });
    });

    return () => unsub();
  }, [isOpen]);

  const availableTechnicians = useMemo(() => {
    const techMap = new Map<string, { id: string; name: string }>();

    // 1. Técnicos de vollen_technicians
    try {
      const saved = localStorage.getItem('vollen_technicians');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((t: any) => {
            const n = (t.name || '').trim();
            if (n && n !== 'Técnico Roberto' && n !== 'Técnico Carlos' && n !== 'Técnica Ana' && n !== 'Técnico Exemplo') {
              techMap.set(n.toLowerCase(), { id: t.id || n, name: n });
            }
          });
        }
      }
    } catch {}

    // 2. Usuários técnicos de vollen_users
    try {
      const savedUsers = localStorage.getItem('vollen_users');
      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        if (Array.isArray(parsedUsers)) {
          parsedUsers.forEach((u: any) => {
            const role = (u.role || '').toUpperCase();
            if (
              role === 'TECNICO' ||
              role === 'TÉCNICO' ||
              u.isTechnician === true ||
              u.specialty ||
              role === 'ADMIN'
            ) {
              const n = (u.name || u.username || '').trim();
              if (n && n !== 'Técnico Exemplo') {
                techMap.set(n.toLowerCase(), { id: u.id || n, name: n });
              }
            }
          });
        }
      }
    } catch {}

    // 3. Sincronizados do Firestore
    syncedTechs.forEach((t) => {
      const n = (t.name || '').trim();
      if (n) {
        techMap.set(n.toLowerCase(), { id: t.id || n, name: n });
      }
    });

    // 4. Props de técnicos se existirem
    if (Array.isArray(technicians)) {
      technicians.forEach((t: any) => {
        const n = typeof t === 'string' ? t.trim() : (t.name || '').trim();
        if (n && n !== 'Técnico Roberto' && n !== 'Técnico Carlos' && n !== 'Técnica Ana') {
          techMap.set(n.toLowerCase(), { id: t.id || n, name: n });
        }
      });
    }

    // 5. Técnicos atribuídos nas próprias OSs
    if (Array.isArray(orders)) {
      orders.forEach((o: any) => {
        const n = (o.technician || o.technicianName || '').trim();
        if (n && n !== 'Técnico Roberto' && n !== 'Técnico Carlos' && n !== 'Técnica Ana') {
          techMap.set(n.toLowerCase(), { id: n, name: n });
        }
      });
    }

    const result = Array.from(techMap.values());
    return result;
  }, [technicians, orders, syncedTechs, isOpen]);

  const [selectedTechName, setSelectedTechName] = useState<string>('TODOS');

  // Filtro de status: 'TODOS' (Ambas), 'ABERTA' (Abertas) ou 'FINALIZADA' (Finalizadas)
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ABERTA' | 'FINALIZADA'>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const safeCompany = companyInfo || {};

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

  const safeOrdersList = Array.isArray(orders) ? orders : [];

  // Filtra as OS pelo Técnico Selecionado e Status Escolhido
  const filteredOrders = useMemo(() => {
    return safeOrdersList.filter((o) => {
      const isDeleted = Boolean(o.isDeleted || o.status === 'EXCLUIDA');
      if (isDeleted) return false;

      // Filtro por Técnico
      if (selectedTechName !== 'TODOS') {
        const orderTech = (o.technician || o.technicianName || '').toLowerCase().trim();
        const targetTech = selectedTechName.toLowerCase().trim();
        if (orderTech !== targetTech && !orderTech.includes(targetTech) && !targetTech.includes(orderTech)) {
          return false;
        }
      }

      // Filtro por Status
      const st = (o.status || 'ABERTA').toUpperCase();
      if (statusFilter === 'ABERTA') {
        if (st === 'FINALIZADA' || st === 'CONCLUIDA') return false;
      } else if (statusFilter === 'FINALIZADA') {
        if (st !== 'FINALIZADA' && st !== 'CONCLUIDA') return false;
      }

      // Busca por texto (Código, Cliente, Equipamento)
      if (searchTerm.trim()) {
        const matches =
          matchesSearchTerm(o.code || '', searchTerm) ||
          matchesSearchTerm(o.client?.name || '', searchTerm) ||
          matchesSearchTerm(o.equipment?.type || '', searchTerm) ||
          matchesSearchTerm(o.equipment?.brand || '', searchTerm);
        if (!matches) return false;
      }

      return true;
    });
  }, [safeOrdersList, selectedTechName, statusFilter, searchTerm]);

  // Cálculos Financeiros e Métricas do Técnico
  const stats = useMemo(() => {
    let totalValue = 0;
    let openCount = 0;
    let finishedCount = 0;

    filteredOrders.forEach((o) => {
      const st = (o.status || 'ABERTA').toUpperCase();
      if (st === 'FINALIZADA' || st === 'CONCLUIDA') {
        finishedCount++;
      } else {
        openCount++;
      }

      const val =
        typeof o.totalAmount === 'number'
          ? o.totalAmount
          : parseFloat(String(o.totalAmount || '0').replace('.', '').replace(',', '.')) || 0;
      totalValue += val;
    });

    return {
      totalOrders: filteredOrders.length,
      openCount,
      finishedCount,
      totalValue,
    };
  }, [filteredOrders]);

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

  // Impressão do Relatório do Técnico
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Por favor, permita pop-ups para imprimir o relatório.');

    const companyName = safeCompany.name || 'Vollen Assistência Técnica';
    const companyPhone = safeCompany.phone || safeCompany.whatsapp || '';
    const companyCnpj = safeCompany.cnpj ? `CNPJ: ${safeCompany.cnpj}` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de OS por Técnico - ${selectedTechName}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: portrait; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 10px; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 2px; }
          .subtitle { font-size: 11px; color: #475569; }
          .info-bar { background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; font-size: 11px; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px; }
          .badge-open { background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
          .badge-done { background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10.5px; }
          th { background-color: #e2e8f0; color: #334155; font-weight: bold; text-align: left; padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 10px; text-transform: uppercase; }
          td { padding: 6px 8px; border: 1px solid #cbd5e1; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .total-box { margin-top: 14px; padding: 10px 14px; background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; display: flex; justify-content: space-between; font-weight: bold; font-size: 11.5px; }
          .footer { margin-top: 20px; text-align: center; font-size: 9.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">${companyName}</div>
            <div class="subtitle">${companyCnpj} ${companyPhone ? `• Tel: ${companyPhone}` : ''}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; color: #0284c7; font-size: 13px;">RELATÓRIO POR TÉCNICO</div>
            <div class="subtitle">Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        <div class="info-bar">
          <div><strong>Técnico Responsável:</strong> ${selectedTechName}</div>
          <div><strong>Filtro de Status:</strong> ${statusFilter === 'TODOS' ? 'Ambas (Abertas e Finalizadas)' : statusFilter === 'ABERTA' ? 'Apenas Abertas' : 'Apenas Finalizadas'}</div>
          <div><strong>Total de OS:</strong> ${stats.totalOrders}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 75px;">Nº OS</th>
              <th style="width: 75px;">Entrada</th>
              <th>Cliente</th>
              <th>Aparelho / Equipamento</th>
              <th style="width: 95px;">Status</th>
              <th style="width: 85px; text-align: right;">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            ${
              filteredOrders.length === 0
                ? '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">Nenhuma Ordem de Serviço encontrada para os filtros selecionados.</td></tr>'
                : filteredOrders
                    .map((o) => {
                      const st = (o.status || 'ABERTA').toUpperCase();
                      const isFinal = st === 'FINALIZADA' || st === 'CONCLUIDA';
                      const val =
                        typeof o.totalAmount === 'number'
                          ? o.totalAmount
                          : parseFloat(String(o.totalAmount || '0').replace('.', '').replace(',', '.')) || 0;
                      return `
                        <tr>
                          <td style="font-weight: bold; font-family: monospace;">${o.code || '-'}</td>
                          <td>${formatDateSafe(o.entryDate || o.createdAt)}</td>
                          <td><strong>${o.client?.name || 'Cliente Sem Nome'}</strong></td>
                          <td>${o.equipment?.type || '-'} ${o.equipment?.brand ? `(${o.equipment.brand})` : ''}</td>
                          <td>
                            <span class="badge ${isFinal ? 'badge-done' : 'badge-open'}">${st}</span>
                          </td>
                          <td style="text-align: right; font-weight: bold;">R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      `;
                    })
                    .join('')
            }
          </tbody>
        </table>

        <div class="total-box">
          <div>
            <span>Abertas: <strong style="color: #0284c7;">${stats.openCount}</strong></span>
            <span style="margin-left: 14px;">Finalizadas: <strong style="color: #16a34a;">${stats.finishedCount}</strong></span>
          </div>
          <div>
            TOTAL GERAL: <span style="color: #047857; font-size: 13px; margin-left: 6px;">R$ ${stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div class="footer">
          Vollen OS • Sistema Integrado de Ordens de Serviço
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Exportação para CSV (Excel)
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return alert('Nenhum dado para exportar.');
    const header = ['Nº OS', 'Data Entrada', 'Técnico', 'Cliente', 'Telefone', 'Equipamento', 'Marca', 'Status', 'Valor Total'];
    const rows = filteredOrders.map((o) => [
      `"${o.code || ''}"`,
      `"${formatDateSafe(o.entryDate || o.createdAt)}"`,
      `"${o.technician || o.technicianName || ''}"`,
      `"${o.client?.name || ''}"`,
      `"${o.client?.phone || o.client?.whatsapp || ''}"`,
      `"${o.equipment?.type || ''}"`,
      `"${o.equipment?.brand || ''}"`,
      `"${o.status || 'ABERTA'}"`,
      `"${(o.totalAmount || '0').toString().replace('.', ',')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_tecnico_${selectedTechName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-fadeIn">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="p-4 bg-gradient-to-r from-slate-800 via-indigo-900 to-slate-900 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/40 rounded-xl">
              <UserCheck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Relatório de Ordens de Serviço por Técnico
              </h2>
              <p className="text-xs text-indigo-200">
                Visualize todas as OS atribuídas a cada técnico com filtros de status abertas, finalizadas ou ambas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white hover:bg-slate-700/50 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtros Elegante */}
        <div className="p-3 bg-slate-100 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor do Técnico */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1 rounded-xl shadow-xs">
              <Wrench className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <label className="font-bold text-slate-700 whitespace-nowrap">Técnico:</label>
              <select
                value={selectedTechName}
                onChange={(e) => setSelectedTechName(e.target.value)}
                className="font-bold text-indigo-950 focus:outline-none cursor-pointer bg-transparent pr-2"
              >
                <option value="TODOS">-- TODOS OS TÉCNICOS --</option>
                {availableTechnicians.map((t: any) => (
                  <option key={t.id || t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Status (Abertas, Finalizadas, Ambas) */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1 rounded-xl shadow-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <label className="font-bold text-slate-700 whitespace-nowrap">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="font-bold text-slate-900 focus:outline-none cursor-pointer bg-transparent pr-2"
              >
                <option value="TODOS">Todas (Abertas e Finalizadas)</option>
                <option value="ABERTA">Apenas Abertas / Em Andamento</option>
                <option value="FINALIZADA">Apenas Finalizadas</option>
              </select>
            </div>

            {/* Campo de Busca Rápida */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Buscar por OS, cliente ou aparelho..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-1 text-slate-800 focus:outline-none focus:border-indigo-600 w-64 shadow-xs"
              />
            </div>
          </div>

          {/* Botões de Ação (Imprimir e Excel) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Excel / CSV
            </button>

            <button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Relatório
            </button>
          </div>
        </div>

        {/* Tabela de Ordens de Serviço */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50">
          <div className="bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-200 text-slate-800 font-bold uppercase sticky top-0 z-10 text-[10.5px]">
                <tr>
                  <th className="p-2.5 border-b border-r border-slate-300 w-24">Nº OS</th>
                  <th className="p-2.5 border-b border-r border-slate-300 w-24">Entrada</th>
                  <th className="p-2.5 border-b border-r border-slate-300">Cliente</th>
                  <th className="p-2.5 border-b border-r border-slate-300">Técnico Responsável</th>
                  <th className="p-2.5 border-b border-r border-slate-300">Equipamento / Aparelho</th>
                  <th className="p-2.5 border-b border-r border-slate-300 w-32 text-center">Status</th>
                  <th className="p-2.5 border-b border-slate-300 w-28 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 text-[11.5px]">
                {filteredOrders.map((o) => {
                  const isSelected = o.id === selectedOrderId;
                  const st = (o.status || 'ABERTA').toUpperCase();
                  const isFinal = st === 'FINALIZADA' || st === 'CONCLUIDA';
                  const val =
                    typeof o.totalAmount === 'number'
                      ? o.totalAmount
                      : parseFloat(String(o.totalAmount || '0').replace('.', '').replace(',', '.')) || 0;

                  return (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedOrderId(o.id)}
                      onDoubleClick={() => {
                        if (onOpenOrderDetails) onOpenOrderDetails(o);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-100 text-indigo-950 font-medium' : 'hover:bg-slate-100 bg-white'
                      }`}
                      title="Clique 2x para abrir a OS"
                    >
                      <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-indigo-700">
                        {o.code || '-'}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-600 font-medium">
                        {formatDateSafe(o.entryDate || o.createdAt)}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">
                        {o.client?.name || 'Cliente Sem Nome'}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-indigo-900 font-semibold">
                        {o.technician || o.technicianName || '-'}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-800">
                        {o.equipment?.type || '-'} {o.equipment?.brand ? `(${o.equipment.brand})` : ''}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isFinal
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-sky-100 text-sky-800 border border-sky-300'
                          }`}
                        >
                          {st}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900 font-mono">
                        R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      Nenhuma Ordem de Serviço encontrada para o técnico e filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rodapé com Resumo Estatístico e Financeiro do Técnico */}
        <div className="p-3 bg-slate-200 border-t border-slate-300 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 font-sans">
          <div className="flex items-center gap-4">
            <span className="text-slate-600 italic">
              Dica: Clique duas vezes em qualquer linha para abrir a OS.
            </span>
            <div className="flex items-center gap-3 font-bold">
              <span className="bg-sky-100 text-sky-900 px-2.5 py-0.5 rounded-lg border border-sky-300">
                Abertas: {stats.openCount}
              </span>
              <span className="bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                Finalizadas: {stats.finishedCount}
              </span>
              <span className="bg-slate-300 text-slate-900 px-2.5 py-0.5 rounded-lg">
                Total de OS: {stats.totalOrders}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-white border border-slate-300 px-3 py-1 rounded-xl shadow-xs flex items-center gap-2">
              <span className="text-slate-500 font-bold">Total Geral:</span>
              <span className="text-emerald-700 font-black text-sm font-mono">
                R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={onClose}
              className="bg-slate-300 hover:bg-slate-400 text-slate-800 px-4 py-1 rounded-xl font-bold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
