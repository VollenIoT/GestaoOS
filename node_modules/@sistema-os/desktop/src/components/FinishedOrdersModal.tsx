import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  FolderOpen,
  CheckCircle2,
  Phone,
  Check,
  MessageSquare,
  MapPin,
} from "lucide-react";
import { StatusBadge } from "./Dashboard";
import { ConfirmModal } from "./ConfirmModal";
import { matchesSearchTerm } from "../utils/searchUtils";

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  visible: boolean;
  fixed?: boolean;
}

interface FinishedOrdersModalProps {
  isOpen: boolean;
  orders: any[];
  onClose: () => void;
  onUpdateOrderStatus: (orderId: string, status: string) => void;
  onOpenEditOS: (order: any) => void;
  onCreateWarrantyReturn?: (order: any) => void;
}

export const FinishedOrdersModal: React.FC<FinishedOrdersModalProps> = ({
  isOpen,
  orders,
  onClose,
  onUpdateOrderStatus,
  onOpenEditOS,
  onCreateWarrantyReturn,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenStatus, setReopenStatus] = useState<string>('ABERTA');

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
      const saved = localStorage.getItem('finished_orders_modal_columns');
      if (saved) return JSON.parse(saved);
    } catch (err) { }
    return [
      { id: "code", label: "Codigo OS", width: 110, visible: true, fixed: true },
      { id: "type", label: "Tipo OS", width: 120, visible: true },
      { id: "client", label: "Cliente", width: 180, visible: true, fixed: true },
      { id: "phone", label: "Telefone", width: 130, visible: true, fixed: true },
      { id: "whatsapp", label: "WhatsApp", width: 130, visible: false },
      { id: "equipment", label: "Equipamento", width: 170, visible: true },
      { id: "address", label: "Endereco", width: 220, visible: true },
      { id: "problem", label: "Problema Relatado", width: 200, visible: true },
      { id: "value", label: "Valor Total", width: 120, visible: true },
      { id: "warranty", label: "Garantia", width: 140, visible: true },
      { id: "status", label: "Status", width: 130, visible: true },
    ];
  });

  const saveColumnsToStorage = (newCols: ColumnConfig[]) => {
    try {
      localStorage.setItem('finished_orders_modal_columns', JSON.stringify(newCols));
    } catch (err) { }
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [addressSearch, setAddressSearch] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [showCanceled, setShowCanceled] = useState<boolean>(false);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  React.useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setPhoneSearch("");
      setAddressSearch("");
      setStatusFilter("ALL");
      setShowCanceled(false);
      setSelectedOrderId(null);
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(new Date().toISOString().split("T")[0]);
    } else {
      setSearchTerm("");
      setSelectedOrderId(null);
    }
  }, [isOpen]);

  // Estado para arraste direto via Mouse
  const [draggingColId, setDraggingColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

  // Limpa estados ao fechar ou desmontar
  useEffect(() => {
    return () => {
      isDraggingRef.current = false;
      setDraggingColId(null);
      setDragOverColId(null);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMouseDownHeader = (e: React.MouseEvent, colId: string) => {
    if ((e.target as HTMLElement).getAttribute('data-resize') === 'true') {
      return;
    }
    // Só inicia com o botão primário (esquerdo) do mouse
    if (e.button !== 0) return;

    e.preventDefault();
    isDraggingRef.current = true;
    setDraggingColId(colId);

    const onGlobalMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const elem = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const th = elem?.closest('th[data-col-id]') as HTMLElement | null;
      if (th) {
        const targetId = th.getAttribute('data-col-id');
        if (targetId && targetId !== colId) {
          setDragOverColId(targetId);
        } else {
          setDragOverColId(null);
        }
      } else {
        setDragOverColId(null);
      }
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
      isDraggingRef.current = false;
      setDraggingColId(null);
      setDragOverColId(null);
    };

    const onGlobalMouseUp = (upEvent: MouseEvent) => {
      const wasDragging = isDraggingRef.current;
      cleanup();

      if (!wasDragging) return;

      const elem = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      const th = elem?.closest('th[data-col-id]') as HTMLElement | null;
      const targetId = th?.getAttribute('data-col-id');

      if (targetId && targetId !== colId) {
        setColumns((prev) => {
          const srcIdx = prev.findIndex((c) => c.id === colId);
          const destIdx = prev.findIndex((c) => c.id === targetId);
          if (srcIdx === -1 || destIdx === -1) return prev;
          const newCols = [...prev];
          const [moved] = newCols.splice(srcIdx, 1);
          newCols.splice(destIdx, 0, moved);
          saveColumnsToStorage(newCols);
          return newCols;
        });
      }
    };

    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);
  };

  const handleMouseDownResize = (e: React.MouseEvent, columnId: string) => {
    e.stopPropagation(); e.preventDefault();
    const startX = e.clientX;
    const initialWidth = columns.find((c) => c.id === columnId)?.width || 100;
    const onMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.max(50, initialWidth + ev.clientX - startX);
      setColumns((prev) => {
        const updated = prev.map((col) => col.id === columnId ? { ...col, width: newWidth } : col);
        saveColumnsToStorage(updated);
        return updated;
      });
    };
    const onMouseUp = () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleMoveColumn = (columnId: string, direction: 'left' | 'right') => {
    const idx = columns.findIndex((c) => c.id === columnId);
    if (idx === -1) return;
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= columns.length) return;

    const newCols = [...columns];
    const [moved] = newCols.splice(idx, 1);
    newCols.splice(targetIdx, 0, moved);
    setColumns(newCols);
    saveColumnsToStorage(newCols);
  };

  const toggleColumnVisibility = (columnId: string) => {
    setColumns((prev) => {
      const updated = prev.map((col) => col.fixed ? col : col.id === columnId ? { ...col, visible: !col.visible } : col);
      saveColumnsToStorage(updated);
      return updated;
    });
  };

  const seenIds = new Set<string>();
  const seenCodes = new Set<string>();
  const finishedOrders = orders.filter((os) => {
    if (!os || !os.id) return false;
    if (seenIds.has(os.id)) return false;
    if (os.code && seenCodes.has(os.code)) return false;
    seenIds.add(os.id);
    if (os.code) seenCodes.add(os.code);

    const isFinished = os.status === "FINALIZADA" || os.status === "CONCLUIDA" || os.status === "GARANTIA_FINALIZADA" || os.status === "GARANTIA/FINALIZADA";
    const isCanceled = os.status === "CANCELADA";
    if (!isFinished && (!showCanceled || !isCanceled)) return false;

    // Filtro por Status
    if (statusFilter !== "ALL") {
      if (statusFilter === "FINALIZADA" && !isFinished) return false;
      if (statusFilter === "CANCELADA" && !isCanceled) return false;
      if (statusFilter !== "FINALIZADA" && statusFilter !== "CANCELADA" && os.status !== statusFilter) return false;
    }

    const matchesName = matchesSearchTerm(os.client?.name, searchTerm);
    const matchesPhone =
      !phoneSearch ||
      matchesSearchTerm(os.client?.phone, phoneSearch) ||
      matchesSearchTerm(os.client?.whatsapp, phoneSearch);
    const addr = `${os.client?.address || ""} ${os.client?.neighborhood || ""} ${os.client?.city || ""}`;
    const matchesAddress = matchesSearchTerm(addr, addressSearch);
    let matchesDate = true;
    if (os.createdAt) {
      const osDate = os.createdAt.split("T")[0];
      if (startDate && osDate < startDate) matchesDate = false;
      if (endDate && osDate > endDate) matchesDate = false;
    }
    return matchesName && matchesPhone && matchesAddress && matchesDate;
  }).sort((a, b) => {
    const numA = parseInt((a.code || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt((b.code || '').replace(/\D/g, ''), 10) || 0;
    return numB - numA;
  });

  const selectedOrder = finishedOrders.find((os) => os.id === selectedOrderId);

  const handleOpenOS = (order: any) => { if (!order) return; onOpenEditOS(order); };

  const renderCellContent = (os: any, columnId: string) => {
    switch (columnId) {
      case "code": return <span className="font-mono font-bold text-emerald-700">{os.code}</span>;
      case "type": return (
        <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${os.type === "AGENDAMENTO" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-sky-50 text-sky-700 border-sky-200"}`}>
          {os.type === "AGENDAMENTO" ? "AGENDAMENTO" : "ORCAMENTO"}
        </span>
      );
      case "client": return <span className="font-bold text-slate-900">{os.client?.name}</span>;
      case "phone": return <span>{os.client?.phone}</span>;
      case "whatsapp": return (<span className="text-emerald-700 font-semibold flex items-center gap-1"><MessageSquare className="w-3 h-3 text-emerald-600" />{os.client?.whatsapp || '-'}</span>);
      case "equipment": return <span>{os.equipment?.type} - {os.equipment?.brand}</span>;
      case "address": return <span className="truncate">{os.client?.address}, {os.client?.number} - {os.client?.neighborhood}</span>;
      case "problem": return <span className="truncate">{os.problemDescription}</span>;
      case "value": {
        const totalAmt = typeof os.totalAmount === "number" ? os.totalAmount : parseFloat(os.totalAmount || "0") || 0;
        const trvl = parseFloat((os.travelCost || "0").toString().replace(",", ".")) || 0;
        const disc = parseFloat((os.discountCost || "0").toString().replace(",", ".")) || 0;
        let fromVisits = 0;
        if (os.visits?.length) os.visits.forEach((v: any) => (v.partsUsed || []).forEach((p: any) => { fromVisits += (parseFloat((p.price || "0").toString().replace(",", ".")) || 0) * (p.quantity || p.qty || 1); }));
        const displayTotal = totalAmt > 0 ? totalAmt : Math.max(0, fromVisits + trvl - disc);
        return <span className={`font-extrabold font-mono ${displayTotal > 0 ? "text-emerald-700" : "text-slate-400"}`}>R$ {displayTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      }
      case "warranty": {
        const wType = os.warrantyType || "NAO_SE_APLICA";
        const label = wType === "GARANTIA_LOJA" ? "Garantia da Empresa" : wType === "GARANTIA_FABRICA" ? "Garantia de Fabrica" : "Nao se Aplica";
        const cls = wType === "GARANTIA_LOJA" ? "bg-purple-50 text-purple-700 border-purple-200" : wType === "GARANTIA_FABRICA" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-100 text-slate-600 border-slate-200";
        return <span className={`font-semibold px-2 py-0.5 rounded text-[10px] border ${cls}`}>{label}</span>;
      }
      case "status": return <StatusBadge status={os.status} />;
      default: return null;
    }
  };

  const totalPixels = columns.filter((c) => c.visible).reduce((acc, col) => acc + col.width, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setContextMenu(null)}>
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans relative">
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>OS Finalizadas</span>
            <span className="text-[11px] bg-slate-100 text-slate-500 border border-slate-300 font-mono font-semibold px-1.5 py-0.5 rounded ml-1 shadow-2xs">
              F6
            </span>
          </h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 p-1 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 bg-slate-100 border-b border-slate-300 grid grid-cols-1 md:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Pesquisar por Nome</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Ex: Maria, Carlos..." className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:border-emerald-600 font-medium" />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Telefone / Whats</label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input type="text" value={phoneSearch} onChange={(e) => setPhoneSearch(e.target.value)} placeholder="Ex: 99999..." className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:border-emerald-600 font-medium" />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Endereco / Bairro</label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input type="text" value={addressSearch} onChange={(e) => setAddressSearch(e.target.value)} placeholder="Ex: Centro, Rua..." className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:border-emerald-600 font-medium" />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Status da OS</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-emerald-600 cursor-pointer shadow-xs"
            >
              <option value="ALL">Todas Finalizadas</option>
              <option value="FINALIZADA">Finalizadas / Concluídas</option>
              <option value="CANCELADA">Canceladas</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Data Inicial</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-emerald-600 font-bold" />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Data Final</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-emerald-600 font-bold" />
          </div>
        </div>

        <div
          className="flex-1 overflow-x-auto overflow-y-auto p-4 bg-slate-50 select-none"
          onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('tr[data-row]') === null) {
              setSelectedOrderId(null);
            }
          }}
        >
          <div style={{ width: `${totalPixels}px`, minWidth: "100%" }}>
            <table style={{ tableLayout: "fixed", width: `${totalPixels}px` }} className="text-left text-[11px] text-slate-800 border-collapse">
              <colgroup>{columns.filter((c) => c.visible).map((col) => <col key={col.id} style={{ width: `${col.width}px` }} />)}</colgroup>
              <thead className="bg-slate-200 text-slate-800 font-bold uppercase sticky top-0 z-20 text-[10px]">
                <tr>
                  {columns
                    .filter((col) => col.visible)
                    .map((col) => {
                      const isDraggingThis = draggingColId === col.id;
                      const isOverThis = dragOverColId === col.id;

                      return (
                        <th
                          key={col.id}
                          data-col-id={col.id}
                          onMouseDown={(e) => handleMouseDownHeader(e, col.id)}
                          style={{ width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px`, userSelect: 'none' }}
                          className={`p-1.5 border-b border-r border-slate-300 relative group select-none transition-all cursor-grab active:cursor-grabbing hover:bg-slate-300/90 ${
                            isDraggingThis
                              ? 'opacity-40 bg-emerald-300 border-emerald-500 scale-[0.98]'
                              : isOverThis
                              ? 'bg-emerald-200 border-l-4 border-l-emerald-600'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between pointer-events-none select-none">
                            <span className="truncate pr-1 font-bold">{col.label}</span>
                            <span className="text-[10px] text-slate-400 opacity-60 group-hover:opacity-100">⠿</span>
                          </div>
                          <div
                            data-resize="true"
                            onMouseDown={(e) => handleMouseDownResize(e, col.id)}
                            className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-emerald-500/60 z-30 opacity-0 group-hover:opacity-100"
                          />
                        </th>
                      );
                    })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {finishedOrders.map((os) => {
                  const isSelected = os.id === selectedOrderId;

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
                          ? 'bg-emerald-200/90 text-emerald-950'
                          : statusRowBg
                        }`}
                    >
                      {columns.filter((col) => col.visible).map((col) => (
                        <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px` }} className="p-1.5 border-r border-slate-200 truncate">
                          {renderCellContent(os, col.id)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {finishedOrders.length === 0 && (
                  <tr><td colSpan={columns.filter((c) => c.visible).length} className="text-center py-12 text-slate-400">Nenhuma OS finalizada encontrada para os filtros aplicados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {contextMenu && (
          <div style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-50 bg-white border border-slate-300 rounded-xl shadow-2xl p-2 text-xs w-64 space-y-1 font-sans" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold text-slate-700 px-2 py-1 border-b border-slate-200 flex justify-between items-center">
              <span>Organizar Colunas</span>
              <button onClick={() => setContextMenu(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {columns.map((col, cIdx) => (
                <div
                  key={col.id}
                  className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  <button
                    disabled={col.fixed}
                    onClick={() => toggleColumnVisibility(col.id)}
                    className={`flex-1 text-left flex items-center justify-between mr-2 ${
                      col.fixed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <span className="truncate">{col.label}</span>
                    {col.visible && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />}
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      title="Mover para esquerda"
                      disabled={cIdx === 0}
                      onClick={() => handleMoveColumn(col.id, 'left')}
                      className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      ◀
                    </button>
                    <button
                      title="Mover para direita"
                      disabled={cIdx === columns.length - 1}
                      onClick={() => handleMoveColumn(col.id, 'right')}
                      className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-3 bg-slate-200 border-t border-slate-300 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">
              {selectedOrder ? (
                <span>OS Selecionada: <strong className="text-emerald-700">{selectedOrder.code}</strong> - {selectedOrder.client?.name} (Dê 2 cliques para abrir)</span>
              ) : (
                `${finishedOrders.length} OS(s) listada(s) no período`
              )}
            </span>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none bg-white border border-slate-300 rounded-lg px-2.5 py-1 hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={showCanceled}
                onChange={(e) => setShowCanceled(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Exibir OS Canceladas</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleOpenOS(selectedOrder)} disabled={!selectedOrderId}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer">
              <FolderOpen className="w-4 h-4" />Abrir OS
            </button>
            <button
              onClick={() => {
                if (!selectedOrder) return;
                setReopenStatus('RETORNO_GARANTIA');
                setIsReopenModalOpen(true);
              }}
              disabled={!selectedOrderId}
              className="h-8 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Reabrir OS
            </button>
            <button onClick={onClose} className="h-8 bg-slate-700 hover:bg-slate-800 text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer">
              <X className="w-4 h-4" />Fechar
            </button>
          </div>
        </div>
      </div>

      {/* MODAL SELEÇÃO DE STATUS AO REABRIR OS */}
      {isReopenModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans text-xs flex flex-col">
            <div className="p-3.5 bg-amber-600 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Reabrir OS #{selectedOrder.code}
              </h3>
              <button onClick={() => setIsReopenModalOpen(false)} className="text-white/80 hover:text-white p-0.5 rounded cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 bg-slate-50 text-slate-800">
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                Selecione para qual status a Ordem de Serviço <strong>#{selectedOrder.code}</strong> será reaberta:
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">Novo Status da OS *</label>
                <select
                  value={reopenStatus}
                  onChange={(e) => setReopenStatus(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-600 cursor-pointer shadow-2xs"
                >
                  <option value="RETORNO_GARANTIA">Retorno em Garantia</option>
                  <option value="EM_ATENDIMENTO">Em Atendimento</option>
                  <option value="AGUARDANDO_PECA">Aguardando Peça</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsReopenModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-all cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (reopenStatus === 'RETORNO_GARANTIA' && onCreateWarrantyReturn && selectedOrder) {
                      onCreateWarrantyReturn(selectedOrder);
                      setIsReopenModalOpen(false);
                      setSelectedOrderId(null);
                    } else {
                      onUpdateOrderStatus(selectedOrder.id, reopenStatus);
                      setIsReopenModalOpen(false);
                      setSelectedOrderId(null);
                    }
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {reopenStatus === 'RETORNO_GARANTIA' ? 'Criar OS de Retorno em Garantia' : 'Confirmar Reabertura'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
