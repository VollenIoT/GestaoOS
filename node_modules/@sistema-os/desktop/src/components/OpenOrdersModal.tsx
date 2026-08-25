import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  PlusCircle,
  FolderOpen,
  Ban,
  CheckCircle2,
  Phone,
  Clock,
  Check,
  MessageSquare,
  MapPin,
} from 'lucide-react';
import { StatusBadge } from './Dashboard';
import { ConfirmModal } from './ConfirmModal';
import { matchesSearchTerm } from '../utils/searchUtils';

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  visible: boolean;
  fixed?: boolean;
}

interface OpenOrdersModalProps {
  isOpen: boolean;
  orders: any[];
  onClose: () => void;
  onOpenCreateOS: () => void;
  onUpdateOrderStatus: (orderId: string, status: string) => void;
  onOpenEditOS: (order: any) => void;
}

export const OpenOrdersModal: React.FC<OpenOrdersModalProps> = ({
  isOpen,
  orders,
  onClose,
  onOpenCreateOS,
  onUpdateOrderStatus,
  onOpenEditOS,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Fechar com a tecla ESC
  useEffect(() => {
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

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem('open_orders_modal_columns');
      if (saved) return JSON.parse(saved);
    } catch (err) { }
    return [
      { id: 'code', label: 'Código OS', width: 110, visible: true, fixed: true },
      { id: 'type', label: 'Tipo OS', width: 120, visible: true },
      { id: 'client', label: 'Cliente', width: 180, visible: true, fixed: true },
      { id: 'phone', label: 'Telefone', width: 130, visible: true, fixed: true },
      { id: 'whatsapp', label: 'WhatsApp', width: 130, visible: false },
      { id: 'equipment', label: 'Equipamento', width: 170, visible: true },
      { id: 'address', label: 'Endereço', width: 220, visible: true },
      { id: 'problem', label: 'Problema Relatado', width: 200, visible: true },
      { id: 'value', label: 'Valor Total', width: 120, visible: true },
      { id: 'warranty', label: 'Garantia', width: 140, visible: true },
      { id: 'status', label: 'Status', width: 130, visible: true },
    ];
  });

  const saveColumnsToStorage = (newCols: ColumnConfig[]) => {
    try {
      localStorage.setItem('open_orders_modal_columns', JSON.stringify(newCols));
    } catch (err) { }
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [addressSearch, setAddressSearch] = useState('');
  const [showCanceled, setShowCanceled] = useState<boolean>(false);

  const [startDate, setStartDate] = useState(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return thirtyDaysAgo.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleMouseDownResize = (e: React.MouseEvent, columnId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const initialWidth = columns.find((c) => c.id === columnId)?.width || 100;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(50, initialWidth + deltaX);
      setColumns((prev) => {
        const updated = prev.map((col) => (col.id === columnId ? { ...col, width: newWidth } : col));
        saveColumnsToStorage(updated);
        return updated;
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedColumnId(colId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!draggedColumnId || draggedColumnId === targetColId) return;

    const newCols = [...columns];
    const sourceIdx = newCols.findIndex((c) => c.id === draggedColumnId);
    const targetIdx = newCols.findIndex((c) => c.id === targetColId);

    const [removed] = newCols.splice(sourceIdx, 1);
    newCols.splice(targetIdx, 0, removed);

    setColumns(newCols);
    saveColumnsToStorage(newCols);
    setDraggedColumnId(null);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const toggleColumnVisibility = (columnId: string) => {
    setColumns((prev) => {
      const updated = prev.map((col) => {
        if (col.fixed) return col;
        return col.id === columnId ? { ...col, visible: !col.visible } : col;
      });
      saveColumnsToStorage(updated);
      return updated;
    });
  };

  const openOrders = orders.filter((os) => {
    const isFinished = os.status === 'FINALIZADA' || os.status === 'CONCLUIDA';
    if (isFinished) return false;
    if (!showCanceled && os.status === 'CANCELADA') return false;

    const clientName = os.client?.name || '';
    const matchesName = matchesSearchTerm(clientName, searchTerm);

    const clientPhone = os.client?.phone || '';
    const matchesPhone = !phoneSearch || clientPhone.includes(phoneSearch);

    const clientAddress = `${os.client?.address || ''} ${os.client?.neighborhood || ''} ${os.client?.city || ''}`;
    const matchesAddress = matchesSearchTerm(clientAddress, addressSearch);

    let matchesDate = true;
    if (os.createdAt) {
      const osDate = os.createdAt.split('T')[0];
      if (startDate && osDate < startDate) matchesDate = false;
      if (endDate && osDate > endDate) matchesDate = false;
    }

    return matchesName && matchesPhone && matchesAddress && matchesDate;
  }).sort((a, b) => {
    const numA = parseInt((a.code || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt((b.code || '').replace(/\D/g, ''), 10) || 0;
    return numB - numA;
  });

  const selectedOrder = openOrders.find((os) => os.id === selectedOrderId);

  const handleOpenOS = (order: any) => {
    if (!order) return;
    onOpenEditOS(order);
  };

  const renderCellContent = (os: any, columnId: string) => {
    switch (columnId) {
      case 'code':
        return <span className="font-mono font-bold text-sky-700">{os.code}</span>;
      case 'type':
        return (
          <span
            className={`font-bold px-2 py-0.5 rounded text-[10px] border ${os.type === 'AGENDAMENTO'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-sky-50 text-sky-700 border-sky-200'
              }`}
          >
            {os.type === 'AGENDAMENTO' ? 'AGENDAMENTO' : 'ORÇAMENTO'}
          </span>
        );
      case 'client':
        return <span className="font-bold text-slate-900">{os.client?.name}</span>;
      case 'phone':
        return <span>{os.client?.phone}</span>;
      case 'whatsapp':
        return (
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-emerald-600" />
            {os.client?.whatsapp || '-'}
          </span>
        );
      case 'equipment':
        return (
          <span>
            {os.equipment?.type} - {os.equipment?.brand}
          </span>
        );
      case 'address':
        return (
          <span className="truncate">
            {os.client?.address}, {os.client?.number} - {os.client?.neighborhood}
          </span>
        );
      case 'problem':
        return <span className="truncate">{os.problemDescription}</span>;
      case 'value': {
        // Usa totalAmount gravado no banco; se zero, tenta calcular via travelCost/discountCost
        const totalAmt = typeof os.totalAmount === 'number' ? os.totalAmount : parseFloat(os.totalAmount || '0') || 0;
        const trvl = parseFloat((os.travelCost || '0').toString().replace(',', '.')) || 0;
        const disc = parseFloat((os.discountCost || '0').toString().replace(',', '.')) || 0;
        // Calcula a partir das visitas se disponível
        let fromVisits = 0;
        if (os.visits && os.visits.length > 0) {
          os.visits.forEach((v: any) => {
            (v.partsUsed || []).forEach((p: any) => {
              const val = parseFloat((p.price || '0').toString().replace(',', '.')) || 0;
              fromVisits += val * (p.quantity || p.qty || 1);
            });
          });
        }
        const displayTotal = totalAmt > 0 ? totalAmt : Math.max(0, fromVisits + trvl - disc);
        return (
          <span className={`font-extrabold font-mono ${displayTotal > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
            R$ {displayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      }
      case 'warranty':
        const wType = os.warrantyType || 'NAO_SE_APLICA';
        let label = 'Não se Aplica';
        let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';

        if (wType === 'GARANTIA_LOJA') {
          label = 'Garantia da Empresa';
          badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
        } else if (wType === 'GARANTIA_FABRICA') {
          label = 'Garantia de Fábrica';
          badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        }

        return (
          <span className={`font-semibold px-2 py-0.5 rounded text-[10px] border ${badgeClass}`}>
            {label}
          </span>
        );
      case 'status':
        return <StatusBadge status={os.status} />;
      default:
        return null;
    }
  };

  const totalPixels = columns
    .filter((c) => c.visible)
    .reduce((acc, col) => acc + col.width, 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setContextMenu(null)}
    >
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans relative">
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span>OS em Aberto</span>
            <span className="text-[11px] bg-slate-100 text-slate-500 border border-slate-300 font-mono font-semibold px-1.5 py-0.5 rounded ml-1 shadow-2xs">
              F5
            </span>
          </h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-slate-100 border-b border-slate-300 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Pesquisar por Nome</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ex: Maria, Carlos..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Telefone / Whats</label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                placeholder="Ex: 99999..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Endereço / Bairro</label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={addressSearch}
                onChange={(e) => setAddressSearch(e.target.value)}
                placeholder="Ex: Centro, Rua..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-sky-600 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-sky-600 font-bold"
            />
          </div>
        </div>

        {/* Tabela em Modo Unset com Largura Explícita em Pixels (Nenhum campo à esquerda é afetado mesmo sem scroll) */}
        <div
          className="flex-1 overflow-x-auto overflow-y-auto p-4 bg-slate-50 select-none"
          onContextMenu={handleContextMenu}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('tr[data-row]') === null) {
              setSelectedOrderId(null);
            }
          }}
        >
          <div style={{ width: `${totalPixels}px`, minWidth: '100%' }}>
            <table
              style={{ tableLayout: 'fixed', width: `${totalPixels}px` }}
              className="text-left text-[11px] text-slate-800 border-collapse"
            >
              <colgroup>
                {columns
                  .filter((col) => col.visible)
                  .map((col) => (
                    <col key={col.id} style={{ width: `${col.width}px` }} />
                  ))}
              </colgroup>
              <thead className="bg-slate-200 text-slate-800 font-bold uppercase sticky top-0 z-20 text-[10px]">
                <tr>
                  {columns
                    .filter((col) => col.visible)
                    .map((col) => (
                      <th
                        key={col.id}
                        draggable={!col.fixed}
                        onDragStart={(e) => handleDragStart(e, col.id)}
                        onDragOver={handleDragOver}
                        onDrop={() => {
                          if (!draggedColumnId || draggedColumnId === col.id) return;
                          const srcIdx = columns.findIndex((c) => c.id === draggedColumnId);
                          const destIdx = columns.findIndex((c) => c.id === col.id);
                          if (columns[srcIdx].fixed || columns[destIdx].fixed) return;
                          const newCols = [...columns];
                          const [moved] = newCols.splice(srcIdx, 1);
                          newCols.splice(destIdx, 0, moved);
                          setColumns(newCols);
                          setDraggedColumnId(null);
                        }}
                        style={{ width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px` }}
                        className={`p-1.5 border-b border-r border-slate-300 relative group transition-colors ${col.fixed ? 'cursor-default' : 'cursor-grab active:cursor-grabbing hover:bg-slate-300/80'
                          }`}
                      >
                        <div className="truncate pr-2">{col.label}</div>
                        <div
                          onMouseDown={(e) => handleMouseDownResize(e, col.id)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-sky-500/60 z-30 opacity-0 group-hover:opacity-100"
                        />
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {openOrders.map((os) => {
                  const isSelected = os.id === selectedOrderId;

                  // Mapeamento de cor exclusivo para o status APARELHO_LIBERADO
                  let statusRowBg = 'bg-white hover:bg-slate-100';
                  if (os.status === 'APARELHO_LIBERADO') {
                    statusRowBg = 'bg-yellow-100/80 hover:bg-yellow-200/90 text-yellow-950';
                  }

                  return (
                    <tr
                      key={os.id}
                      data-row="true"
                      onClick={() => setSelectedOrderId(os.id)}
                      onDoubleClick={() => handleOpenOS(os)}
                      title="Clique 2x para abrir os detalhes da OS"
                      className={`cursor-pointer transition-colors ${isSelected
                        ? 'bg-sky-200/90 text-sky-950'
                        : statusRowBg
                        }`}
                    >
                      {columns
                        .filter((col) => col.visible)
                        .map((col) => (
                          <td
                            key={col.id}
                            style={{ width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px` }}
                            className="p-1.5 border-r border-slate-200 truncate"
                          >
                            {renderCellContent(os, col.id)}
                          </td>
                        ))}
                    </tr>
                  );
                })}

                {openOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.filter((c) => c.visible).length}
                      className="text-center py-12 text-slate-400"
                    >
                      Nenhuma Ordem de Serviço encontrada para os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {contextMenu && (
          <div
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-50 bg-white border border-slate-300 rounded-xl shadow-2xl p-2 text-xs w-48 space-y-1 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold text-slate-700 px-2 py-1 border-b border-slate-200">
              Exibir / Ocultar Colunas
            </div>
            {columns.map((col) => (
              <button
                key={col.id}
                disabled={col.fixed}
                onClick={() => toggleColumnVisibility(col.id)}
                className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-colors ${col.fixed
                  ? 'opacity-50 cursor-not-allowed text-slate-400'
                  : 'hover:bg-slate-100 text-slate-700 cursor-pointer'
                  }`}
              >
                <span>{col.label}</span>
                {col.visible && <Check className="w-3.5 h-3.5 text-sky-600" />}
              </button>
            ))}
          </div>
        )}

        <div className="p-3 bg-slate-200 border-t border-slate-300 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">
              {selectedOrder ? (
                <span>
                  OS Selecionada: <strong className="text-sky-700">{selectedOrder.code}</strong> -{' '}
                  {selectedOrder.client?.name} (Dê 2 cliques para abrir)
                </span>
              ) : (
                'Selecione uma OS ou dê 2 cliques para abrir'
              )}
            </span>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none bg-white border border-slate-300 rounded-lg px-2.5 py-1 hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={showCanceled}
                onChange={(e) => setShowCanceled(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <span>Exibir OS Canceladas</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onOpenCreateOS();
              }}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Criar Nova OS
            </button>

            <button
              onClick={() => handleOpenOS(selectedOrder)}
              disabled={!selectedOrderId}
              className="h-8 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              Abrir OS
            </button>

            <button
              onClick={() => {
                if (!selectedOrder) return;
                setConfirmDialog({
                  isOpen: true,
                  title: 'Cancelar Ordem de Serviço',
                  message: `Deseja realmente CANCELAR a ${selectedOrder.code}?`,
                  confirmText: 'Sim, Cancelar OS',
                  variant: 'warning',
                  onConfirm: () => {
                    onUpdateOrderStatus(selectedOrder.id, 'CANCELADA');
                    setSelectedOrderId(null);
                    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                  },
                });
              }}
              disabled={!selectedOrderId}
              className="h-8 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Ban className="w-4 h-4" />
              Cancelar OS
            </button>

            <button
              onClick={() => {
                if (!selectedOrder) return;
                setConfirmDialog({
                  isOpen: true,
                  title: 'Finalizar Ordem de Serviço',
                  message: `Deseja alterar o status da ${selectedOrder.code} para FINALIZADA?`,
                  confirmText: 'Sim, Finalizar OS',
                  variant: 'info',
                  onConfirm: () => {
                    onUpdateOrderStatus(selectedOrder.id, 'FINALIZADA');
                    setSelectedOrderId(null);
                    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                  },
                });
              }}
              disabled={!selectedOrderId}
              className="h-8 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Finalizar
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
