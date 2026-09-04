import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calculator,
  Search,
  PlusCircle,
  FolderOpen,
  Printer,
  Trash2,
  Phone,
  Calendar,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { Estimate } from './CreateEstimateModal';
import { matchesSearchTerm } from '../utils/searchUtils';
import { useDialog } from './DialogContext';
import { modalStack } from '../utils/modalStack';

interface EstimatesModalProps {
  isOpen: boolean;
  estimates: Estimate[];
  clientsList?: any[];
  onClose: () => void;
  onOpenCreateEstimate: () => void;
  onOpenEditEstimate: (estimate: Estimate) => void;
  onDeleteEstimate: (estimateId: string) => void;
  onGenerateOSFromEstimate: (estimate: Estimate) => void;
  onPrintEstimate: (estimate: Estimate) => void;
  onOpenClientsModal?: () => void;
}

export const EstimatesModal: React.FC<EstimatesModalProps> = ({
  isOpen,
  estimates = [],
  clientsList = [],
  onClose,
  onOpenCreateEstimate,
  onOpenEditEstimate,
  onDeleteEstimate,
  onGenerateOSFromEstimate,
  onPrintEstimate,
  onOpenClientsModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const { alert: dlgAlert, confirm: dlgConfirm } = useDialog();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Registro na pilha de modais para ESC fechar apenas o último modal aberto
  useEffect(() => {
    if (isOpen) {
      modalStack.register('EstimatesModal', () => onCloseRef.current?.());
      return () => modalStack.unregister('EstimatesModal');
    }
  }, [isOpen]);

  // Atalhos Globais no Modal (F2: Novo)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        onOpenCreateEstimate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpenCreateEstimate]);

  if (!isOpen) return null;

  const safeEstimates = Array.isArray(estimates) ? estimates : [];

  const filteredEstimates = safeEstimates.filter((est) => {
    if (!est) return false;

    // Filtro de Status
    if (statusFilter !== 'TODOS' && est.status !== statusFilter) {
      return false;
    }

    // Filtro de Nome
    const cName = est.client?.name || '';
    if (searchTerm && !matchesSearchTerm(cName, searchTerm)) {
      return false;
    }

    // Filtro de Telefone
    const cPhone = `${est.client?.phone || ''} ${est.client?.whatsapp || ''}`;
    if (phoneSearch && !cPhone.includes(phoneSearch)) {
      return false;
    }

    // Filtro de Data
    if (est.createdAt) {
      const dStr = est.createdAt.split('T')[0];
      if (startDate && dStr < startDate) return false;
      if (endDate && dStr > endDate) return false;
    }

    return true;
  }).sort((a, b) => {
    const numA = parseInt(String(a.code || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(String(b.code || '').replace(/\D/g, ''), 10) || 0;
    return numB - numA;
  });

  const selectedEstimate = safeEstimates.find((e) => e && e.id === selectedEstimateId);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'APROVADO':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold px-2 py-0.5 rounded text-[10.5px]">✅ APROVADO</span>;
      case 'RECUSADO':
        return <span className="bg-red-50 text-red-700 border border-red-300 font-bold px-2 py-0.5 rounded text-[10.5px]">❌ RECUSADO</span>;
      default:
        return <span className="bg-amber-50 text-amber-700 border border-amber-300 font-bold px-2 py-0.5 rounded text-[10.5px]">⏳ PENDENTE</span>;
    }
  };

  // Exportar Listagem para Excel/CSV
  const handleExportCSV = () => {
    const dataToExport = selectedEstimate ? [selectedEstimate] : filteredEstimates;

    if (dataToExport.length === 0) {
      return alert('Nenhum orçamento selecionado ou visível para exportar.');
    }

    const headers = ['Código', 'Data', 'Cliente', 'Telefone', 'WhatsApp', 'Equipamento', 'Marca', 'Modelo', 'Defeito', 'Valor Total (R$)', 'Status'];
    const rows = dataToExport.map((e) => [
      `"${e.code || ''}"`,
      `"${e.createdAt ? e.createdAt.split('T')[0] : ''}"`,
      `"${(e.client?.name || '').replace(/"/g, '""')}"`,
      `"${e.client?.phone || ''}"`,
      `"${e.client?.whatsapp || ''}"`,
      `"${e.equipment?.type || ''}"`,
      `"${e.equipment?.brand || ''}"`,
      `"${e.equipment?.model || ''}"`,
      `"${(e.problemDescription || '').replace(/"/g, '""')}"`,
      `"${(e.totalAmount || 0).toFixed(2).replace('.', ',')}"`,
      `"${e.status || 'PENDENTE'}"`,
    ]);

    const csvString = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvString);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    const filename = selectedEstimate && selectedEstimate.code
      ? `orcamento_${selectedEstimate.code}.csv`
      : `relatorio_orcamentos_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Contadores por Status
  const countPending = safeEstimates.filter((e) => e && (e.status === 'PENDENTE' || !e.status)).length;
  const countApproved = safeEstimates.filter((e) => e && e.status === 'APROVADO').length;
  const countRejected = safeEstimates.filter((e) => e && e.status === 'RECUSADO').length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none font-sans text-xs"
      onClick={() => setSelectedEstimateId(null)}
    >
      <div
        className="bg-white border border-slate-300 rounded-2xl w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 bg-gradient-to-r from-amber-600 to-yellow-700 text-white border-b border-amber-800 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                Gestão de Orçamentos
              </h2>
              <p className="text-[10.5px] text-amber-100">
                Lista de todos os orçamentos criados com opção de impressão e geração de OS
              </p>
            </div>
          </div>

          {/* Badges de Contagem Rápida */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('TODOS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'TODOS'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Todos: {estimates.length}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDENTE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'PENDENTE'
                  ? 'bg-amber-100 text-amber-900 shadow-xs'
                  : 'bg-white/20 text-amber-100 hover:bg-white/30'
              }`}
            >
              ⏳ Pendentes: {countPending}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('APROVADO')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'APROVADO'
                  ? 'bg-emerald-100 text-emerald-900 shadow-xs'
                  : 'bg-white/20 text-emerald-100 hover:bg-white/30'
              }`}
            >
              ✅ Aprovados: {countApproved}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('RECUSADO')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'RECUSADO'
                  ? 'bg-red-100 text-red-900 shadow-xs'
                  : 'bg-white/20 text-red-100 hover:bg-white/30'
              }`}
            >
              ❌ Recusados: {countRejected}
            </button>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filtros Superiores */}
        <div className="p-3 bg-slate-100 border-b border-slate-300 grid grid-cols-1 md:grid-cols-5 gap-2.5 text-xs shrink-0">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Pesquisar por Cliente</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome do cliente..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                placeholder="Ex: 99999..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-amber-600 cursor-pointer"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="PENDENTE">⏳ Pendentes</option>
              <option value="APROVADO">✅ Aprovados</option>
              <option value="RECUSADO">❌ Recusados</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-amber-600 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-amber-600 font-bold"
            />
          </div>
        </div>

        {/* Tabela de Orçamentos */}
        <div
          className="flex-1 overflow-auto p-3 bg-slate-50 select-none"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('tr[data-row]') === null) {
              setSelectedEstimateId(null);
            }
          }}
        >
          <table className="w-full text-left text-xs border-collapse bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <thead className="bg-slate-200 text-slate-800 font-bold uppercase sticky top-0 z-10 text-[10.5px]">
              <tr>
                <th className="p-2.5 border-b border-slate-300 w-24">Cód. Orç.</th>
                <th className="p-2.5 border-b border-slate-300 w-24">Data</th>
                <th className="p-2.5 border-b border-slate-300 w-52">Cliente</th>
                <th className="p-2.5 border-b border-slate-300 w-36">Telefone</th>
                <th className="p-2.5 border-b border-slate-300 w-44">Equipamento</th>
                <th className="p-2.5 border-b border-slate-300">Defeito / Avaliação</th>
                <th className="p-2.5 border-b border-slate-300 text-right w-28">Valor Total</th>
                <th className="p-2.5 border-b border-slate-300 text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEstimates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <Calculator className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-600" />
                    Nenhum orçamento encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredEstimates.map((est) => {
                  const isSelected = est.id === selectedEstimateId;
                  const dateStr = est.createdAt ? new Date(est.createdAt).toLocaleDateString('pt-BR') : '-';
                  return (
                    <tr
                      key={est.id}
                      data-row="true"
                      onClick={() => setSelectedEstimateId(est.id)}
                      onDoubleClick={() => onOpenEditEstimate(est)}
                      className={`border-b border-slate-100 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-100/80 font-semibold'
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      <td className="p-2 font-mono font-bold text-amber-800">{est.code}</td>
                      <td className="p-2 text-slate-600">{dateStr}</td>
                      <td className="p-2 font-bold text-slate-900">{est.client?.name}</td>
                      <td className="p-2 text-slate-700">{est.client?.phone || est.client?.whatsapp || '-'}</td>
                      <td className="p-2 text-slate-800">
                        {est.equipment?.type} {est.equipment?.brand} {est.equipment?.model ? `(${est.equipment?.model})` : ''}
                      </td>
                      <td className="p-2 text-slate-600 truncate max-w-xs">{est.problemDescription || '-'}</td>
                      <td className="p-2 font-mono font-black text-right text-emerald-700">
                        R$ {(est.totalAmount || 0).toFixed(2).replace('.', ',')}
                      </td>
                      <td className="p-2 text-center">{getStatusBadge(est.status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-3 bg-slate-200 border-t border-slate-300 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">
              {selectedEstimate ? (
                <span>
                  Orçamento: <strong className="text-amber-800">#{selectedEstimate.code}</strong> - {selectedEstimate.client?.name} (Dê 2 cliques para abrir)
                </span>
              ) : (
                `${filteredEstimates.length} orçamento(s) cadastrado(s)`
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Novo Orçamento */}
            <button
              type="button"
              onClick={onOpenCreateEstimate}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Novo Orçamento (F2)
            </button>

            {/* Abrir / Editar */}
            <button
              type="button"
              disabled={!selectedEstimateId}
              onClick={() => {
                if (selectedEstimate) onOpenEditEstimate(selectedEstimate);
              }}
              className="h-8 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              Abrir / Editar
            </button>

            {/* Imprimir */}
            <button
              type="button"
              disabled={!selectedEstimateId}
              onClick={() => {
                if (selectedEstimate) onPrintEstimate(selectedEstimate);
              }}
              className="h-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>

            {/* Gerar OS a partir do Orçamento */}
            <button
              type="button"
              disabled={!selectedEstimateId}
              onClick={async () => {
                if (selectedEstimate) {
                  if (selectedEstimate.status === 'APROVADO') {
                    await dlgAlert({
                      title: 'Orçamento Já Convertido',
                      message: `O orçamento #${selectedEstimate.code} já foi aprovado e convertido em Ordem de Serviço anteriormente.\n\nNão é possível gerar outra OS a partir deste mesmo orçamento.`,
                      variant: 'warning',
                    });
                    return;
                  }

                  let matchedClientId = selectedEstimate.client?.id;
                  if (!matchedClientId && selectedEstimate.client?.name?.trim()) {
                    const searchName = selectedEstimate.client.name.trim().toLowerCase();
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

                  onGenerateOSFromEstimate({
                    ...selectedEstimate,
                    client: { ...selectedEstimate.client, id: matchedClientId }
                  });
                  onClose();
                }
              }}
              className="h-8 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-40 text-white px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition-all cursor-pointer hover:scale-102"
              title="Transforma este orçamento diretamente em Ordem de Serviço"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              Gerar OS do Orçamento
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Excluir Orçamento */}
            <button
              type="button"
              disabled={!selectedEstimateId}
              onClick={async () => {
                if (!selectedEstimate) return;
                const ok = await dlgConfirm({
                  title: 'Excluir Orçamento',
                  message: `Deseja realmente EXCLUIR o orçamento #${selectedEstimate.code}?`,
                  variant: 'danger',
                  confirmText: 'Excluir',
                });
                if (ok) {
                  onDeleteEstimate(selectedEstimate.id);
                  setSelectedEstimateId(null);
                }
              }}
              className="h-8 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
