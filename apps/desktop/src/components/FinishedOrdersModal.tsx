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
import { modalStack } from "../utils/modalStack";
import { cancelCashMovementsByOrderCode } from "./CashRegisterModal";
import { getCurrentFeatures } from "../config/appFeatures";

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
  currentUser?: any;
  onClose: () => void;
  onUpdateOrderStatus: (orderId: string, status: string, additionalPayload?: any) => void;
  onOpenEditOS: (order: any) => void;
  onCreateWarrantyReturn?: (order: any) => void;
}

export const FinishedOrdersModal: React.FC<FinishedOrdersModalProps> = ({
  isOpen,
  orders,
  currentUser,
  onClose,
  onUpdateOrderStatus,
  onOpenEditOS,
  onCreateWarrantyReturn,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenStatus, setReopenStatus] = useState<string>('RETORNO_GARANTIA');
  const [confirmDialogData, setConfirmDialogData] = useState<{
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
    onConfirm: () => {},
  });

  const isAdmin = Boolean(
    !currentUser ||
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'admin' ||
    currentUser?.accessLevel === 'ADMIN' ||
    currentUser?.isAdmin === true ||
    currentUser?.username?.toLowerCase() === 'admin' ||
    (currentUser?.name || '').toLowerCase().includes('admin')
  );

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Fechar com a tecla ESC via modalStack
  useEffect(() => {
    if (isOpen) {
      modalStack.register('FinishedOrdersModal', () => {
        if (isReopenModalOpen) {
          setIsReopenModalOpen(false);
        } else {
          onCloseRef.current?.();
        }
      });
      return () => modalStack.unregister('FinishedOrdersModal');
    }
  }, [isOpen, isReopenModalOpen]);
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
      const saved = localStorage.getItem('finished_orders_modal_columns_v3');
      if (saved) return JSON.parse(saved);
    } catch (err) { }
    return [
      { id: "code", label: "Código OS", width: 110, visible: true, fixed: true },
      { id: "exitDate", label: "Data Saída", width: 110, visible: true },
      { id: "status", label: "Status", width: 130, visible: true },
      { id: "client", label: "Cliente", width: 180, visible: true, fixed: true },
      { id: "contact", label: "Telefone / WhatsApp", width: 180, visible: true },
      { id: "equipment", label: "Equipamento", width: 170, visible: true },
      { id: "problem", label: "Problema Relatado", width: 200, visible: true },
      { id: "value", label: "Valor Total", width: 120, visible: true },
      { id: "address", label: "Endereço", width: 220, visible: true },
      { id: "warranty", label: "Garantia", width: 140, visible: true },
      { id: "type", label: "Tipo OS", width: 120, visible: true },
    ];
  });

  const saveColumnsToStorage = (newCols: ColumnConfig[]) => {
    try {
      localStorage.setItem('finished_orders_modal_columns_v3', JSON.stringify(newCols));
    } catch (err) { }
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [addressSearch, setAddressSearch] = useState("");
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
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
      setStartDate('');
      setEndDate('');
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const isStatusFinished = (status: string): boolean => {
    if (!status) return false;
    const upper = status.trim().toUpperCase();
    return /liberad|conclui|finaliz|execut|entregue|sem condi|garantia_fabrica|garantia fábrica|garantia fabrica|garantia_empresa|garantia empresa|irreparavel|irreparável/i.test(upper);
  };

  const isStatusCanceled = (status: string): boolean => {
    if (!status) return false;
    const upper = status.trim().toUpperCase();
    return /cancel/i.test(upper);
  };

  // Carrega status cadastrados e extrai opções para o filtro
  const availableStatuses = React.useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    try {
      const saved = localStorage.getItem('custom_os_statuses_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((s) => {
            const name = (s.name || '').trim();
            if (name && (isStatusFinished(name) || isStatusCanceled(name)) && !seen.has(name.toUpperCase())) {
              if (showCanceled || !isStatusCanceled(name)) {
                seen.add(name.toUpperCase());
                list.push(name);
              }
            }
          });
        }
      }
    } catch {}

    orders.forEach((os) => {
      const name = (os.status || '').trim();
      if (name && (isStatusFinished(name) || isStatusCanceled(name)) && !seen.has(name.toUpperCase())) {
        if (showCanceled || !isStatusCanceled(name)) {
          seen.add(name.toUpperCase());
          list.push(name);
        }
      }
    });

    return list;
  }, [orders, showCanceled]);

  const seenIds = new Set<string>();
  const seenCodes = new Set<string>();
  const finishedOrders = orders.filter((os) => {
    if (!os || !os.id) return false;
    if (seenIds.has(os.id)) return false;
    if (os.code && seenCodes.has(os.code)) return false;
    seenIds.add(os.id);
    if (os.code) seenCodes.add(os.code);

    const isFinished = isStatusFinished(os.status);
    const isCanceled = isStatusCanceled(os.status);
    if (!isFinished && (!showCanceled || !isCanceled)) return false;

    // Filtro por Status
    if (statusFilter !== "ALL") {
      if (String(os.status || '').trim().toUpperCase() !== statusFilter.trim().toUpperCase()) return false;
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
      case "exitDate": {
        const rawDate = os.exitDate || os.updatedAt || os.createdAt;
        if (!rawDate) return <span className="text-slate-400 font-mono">-</span>;
        const d = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
        const [y, m, day] = d.split("-");
        const formatted = day && m && y ? `${day}/${m}/${y}` : d;
        return <span className="font-mono text-slate-700 font-semibold">{formatted}</span>;
      }
      case "type": {
        const rawType = String(os.type || '').toUpperCase();
        const isVisita = rawType === 'VISITA_TECNICA' || rawType === 'VISITA TECNICA' || rawType === 'VISITA';
        const isAgendamento = rawType === 'AGENDAMENTO';

        let badgeLabel = 'ORÇAMENTO';
        let badgeClass = 'bg-sky-50 text-sky-700 border-sky-200';

        if (isVisita) {
          badgeLabel = 'VISITA TÉCNICA';
          badgeClass = 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
        } else if (isAgendamento) {
          badgeLabel = 'AGENDAMENTO';
          badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
        } else if (rawType && rawType !== 'ORCAMENTO' && rawType !== 'ORÇAMENTO') {
          badgeLabel = rawType;
        }

        return (
          <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${badgeClass}`}>
            {badgeLabel}
          </span>
        );
      }
      case "client": return <span className="font-bold text-slate-900">{os.client?.name}</span>;
      case "contact": {
        const phone = (os.client?.phone || "").trim();
        const whatsapp = (os.client?.whatsapp || "").trim();
        if (!phone && !whatsapp) {
          return <span className="text-slate-400 font-mono">-</span>;
        }
        if (phone && whatsapp && phone === whatsapp) {
          return (
            <span className="text-slate-800 font-semibold flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{phone}</span>
            </span>
          );
        }
        if (phone && whatsapp) {
          return (
            <div className="flex flex-col text-[10px] leading-tight justify-center">
              <span className="text-slate-800 font-medium flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                {phone}
              </span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-emerald-600 shrink-0" />
                {whatsapp}
              </span>
            </div>
          );
        }
        if (whatsapp) {
          return (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{whatsapp}</span>
            </span>
          );
        }
        return (
          <span className="text-slate-800 font-medium flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{phone}</span>
          </span>
        );
      }
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

  const isColumnAllowed = (colId: string) => {
    if (colId === "type" && !getCurrentFeatures().hasOSTableTypeColumn) return false;
    if (colId === "problem" && !getCurrentFeatures().hasOSTableProblemColumn) return false;
    if (colId === "warranty" && !getCurrentFeatures().hasOSTableWarrantyColumn) return false;
    return true;
  };

  const effectiveColumns = columns.filter((col) => isColumnAllowed(col.id));

  const totalPixels = effectiveColumns.filter((c) => c.visible).reduce((acc, col) => acc + col.width, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setContextMenu(null)}>
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans relative">
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>OS Finalizadas</span>
              <span className="text-[11px] bg-slate-100 text-slate-500 border border-slate-300 font-mono font-semibold px-1.5 py-0.5 rounded ml-1 shadow-2xs">
                F6
              </span>
            </h2>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-300/80 border border-slate-300 px-2.5 py-0.5 rounded-full">
              {finishedOrders.length} {finishedOrders.length === 1 ? 'ordem' : 'ordens'}
            </span>
          </div>
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
              {availableStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
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

        <div className="flex-1 overflow-x-auto overflow-y-auto bg-slate-50" onContextMenu={handleContextMenu} onClick={(e) => { if ((e.target as HTMLElement).closest("tr[data-row]") === null) { setSelectedOrderId(null); } }}>
          <div style={{ width: `${totalPixels}px`, minWidth: '100%' }}>
            <table style={{ tableLayout: "fixed", width: `${totalPixels}px` }} className="text-left text-[11px] text-slate-800 border-collapse select-none">
              <colgroup>
                {effectiveColumns.filter((col) => col.visible).map((col) => (
                  <col key={col.id} style={{ width: `${col.width}px` }} />
                ))}
              </colgroup>
              <thead className="bg-slate-200 text-slate-800 font-bold uppercase sticky top-0 z-20 text-[10px]">
                <tr>
                  {effectiveColumns
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
                      {effectiveColumns.filter((col) => col.visible).map((col) => (
                        <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px` }} className="p-1.5 border-r border-slate-200 truncate">
                          {renderCellContent(os, col.id)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {finishedOrders.length === 0 && (
                  <tr><td colSpan={effectiveColumns.filter((c) => c.visible).length} className="text-center py-12 text-slate-400">Nenhuma OS finalizada encontrada para os filtros aplicados.</td></tr>
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
              {effectiveColumns.map((col, cIdx) => (
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
                      disabled={cIdx === effectiveColumns.length - 1}
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

        <div className="p-3 bg-slate-200 border-t border-slate-300 flex items-center justify-between gap-3 shrink-0 flex-nowrap overflow-hidden">
          <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
            <span className="text-xs font-semibold text-slate-700 truncate min-w-0">
              {selectedOrder ? (
                <span className="truncate inline-block max-w-full" title={`OS Selecionada: ${selectedOrder.code} - ${selectedOrder.client?.name || ''}`}>
                  OS Selecionada: <strong className="text-emerald-700">{selectedOrder.code}</strong> -{' '}
                  <span className="font-semibold text-slate-800">{selectedOrder.client?.name}</span> (Dê 2 cliques para abrir)
                </span>
              ) : (
                `${finishedOrders.length} OS(s) listada(s) no período`
              )}
            </span>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none bg-white border border-slate-300 rounded-lg px-2.5 py-1 hover:bg-slate-50 transition-colors shrink-0">
              <input
                type="checkbox"
                checked={showCanceled}
                onChange={(e) => setShowCanceled(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Exibir OS Canceladas</span>
            </label>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => handleOpenOS(selectedOrder)} disabled={!selectedOrderId}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer">
              <FolderOpen className="w-4 h-4" />Abrir OS
            </button>
            <button
              onClick={() => {
                if (!selectedOrder) return;
                if (!getCurrentFeatures().hasWarrantyReturnInReopen) {
                  // Versão 2: sem opções de garantia, confirma e reabre direto como ABERTA
                  setConfirmDialogData({
                    isOpen: true,
                    title: 'Confirmar Reabertura da Ordem de Serviço',
                    message: `Deseja realmente reabrir a OS #${selectedOrder.code} como ABERTA?\n\n• A data de saída será limpa.\n• O status voltará para ABERTA sem perda das informações cadastradas.`,
                    confirmText: 'Sim, Reabrir OS',
                    variant: 'warning',
                    onConfirm: async () => {
                      setConfirmDialogData((prev) => ({ ...prev, isOpen: false }));
                      try {
                        const now = new Date();
                        const dateTimeStr = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                        const userName = currentUser?.name || currentUser?.username || 'Administrador';

                        const newAuditEntry = {
                          date: dateTimeStr,
                          user: userName,
                          action: `OS Reaberta de FINALIZADA para ABERTA`,
                          details: [
                            `Reabertura efetuada por ${userName}`,
                            `Data de saída limpa`,
                          ],
                        };
                        const existingAudit = Array.isArray(selectedOrder.auditHistory) ? selectedOrder.auditHistory : [];
                        const updatedAudit = [newAuditEntry, ...existingAudit];

                        onUpdateOrderStatus(selectedOrder.id, 'ABERTA', {
                          exitDate: '',
                          auditHistory: updatedAudit,
                        });

                        setSelectedOrderId(null);
                      } catch (err) {
                        console.error('Erro ao reabrir OS:', err);
                        alert('Erro ao reabrir OS. Por favor, tente novamente.');
                      }
                    },
                  });
                  return;
                }
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
                Selecione a ação de reabertura para a Ordem de Serviço <strong>#{selectedOrder.code}</strong>:
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">Ação / Status de Reabertura *</label>
                <select
                  value={reopenStatus}
                  onChange={(e) => setReopenStatus(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-600 cursor-pointer shadow-2xs"
                >
                  <option value="RETORNO_GARANTIA">Retorno em Garantia (Gera nova OS de retorno vinculada)</option>
                  {isAdmin && (
                    <option value="ABERTA">Reabrir OS (Status Aberta, limpa data de saída e cancela lançamento no caixa)</option>
                  )}
                </select>
              </div>

              {reopenStatus === 'ABERTA' && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-950 font-medium space-y-1.5 shadow-2xs">
                  <span className="font-bold block text-amber-900 flex items-center gap-1">
                    ⚠️ Atenção - Reabertura de OS Finalizada (Apenas Administrador):
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5 text-amber-900">
                    <li>O status voltará para <strong>ABERTA</strong> e a OS poderá ser editada.</li>
                    <li>A <strong>Data de Saída será limpa</strong>.</li>
                    <li>Qualquer <strong>lançamento de recebimento no Caixa será cancelado/excluído</strong>.</li>
                    <li>A reabertura ficará gravada no <strong>Histórico de Auditoria</strong>.</li>
                  </ul>
                </div>
              )}

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
                  onClick={async () => {
                    if (!selectedOrder) return;

                    if (reopenStatus === 'RETORNO_GARANTIA') {
                      if (onCreateWarrantyReturn) onCreateWarrantyReturn(selectedOrder);
                      setIsReopenModalOpen(false);
                      setSelectedOrderId(null);
                      return;
                    }

                    if (reopenStatus === 'ABERTA') {
                      setIsReopenModalOpen(false);
                      setConfirmDialogData({
                        isOpen: true,
                        title: 'Confirmar Reabertura da Ordem de Serviço',
                        message: `ATENÇÃO: Deseja realmente reabrir a OS #${selectedOrder.code}?\n\n• O lançamento do valor recebido no Caixa será CANCELADO/EXCLUÍDO.\n• A Data de Saída será LIMPA.\n• O status voltará para ABERTA sem perda das informações cadastradas.\n• A reabertura ficará gravada no Histórico da OS.\n\nDeseja prosseguir?`,
                        confirmText: 'Sim, Reabrir e Cancelar Caixa',
                        variant: 'warning',
                        onConfirm: async () => {
                          setConfirmDialogData((prev) => ({ ...prev, isOpen: false }));
                          try {
                            const now = new Date();
                            const dateTimeStr = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                            const userName = currentUser?.name || currentUser?.username || 'Administrador';

                            // 1. Cancela lançamentos no caixa
                            await cancelCashMovementsByOrderCode(selectedOrder.code);

                            // 2. Histórico de auditoria
                            const newAuditEntry = {
                              date: dateTimeStr,
                              user: userName,
                              action: `OS Reaberta de FINALIZADA para ABERTA por Administrador`,
                              details: [
                                `Reabertura administrativa efetuada por ${userName}`,
                                `Data de saída limpa`,
                                `Lançamento do valor no caixa cancelado/revertido`,
                              ],
                            };
                            const existingAudit = Array.isArray(selectedOrder.auditHistory) ? selectedOrder.auditHistory : [];
                            const updatedAudit = [newAuditEntry, ...existingAudit];

                            // 3. Atualiza status com payload adicional
                            onUpdateOrderStatus(selectedOrder.id, 'ABERTA', {
                              exitDate: '',
                              auditHistory: updatedAudit,
                            });

                            setSelectedOrderId(null);
                          } catch (err) {
                            console.error('Erro ao reabrir OS:', err);
                            alert('Erro ao reabrir OS. Por favor, tente novamente.');
                          }
                        },
                      });
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
        isOpen={confirmDialogData.isOpen}
        title={confirmDialogData.title}
        message={confirmDialogData.message}
        confirmText={confirmDialogData.confirmText}
        variant={confirmDialogData.variant}
        onConfirm={confirmDialogData.onConfirm}
        onCancel={() => setConfirmDialogData((prev) => ({ ...prev, isOpen: false }))}
      />

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
