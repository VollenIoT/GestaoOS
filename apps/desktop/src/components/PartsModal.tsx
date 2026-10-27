import React, { useState, useRef, useEffect } from 'react';
import { X, Search, PlusCircle, FolderOpen, Edit3, Trash2, LogOut, Package, Check, Tag } from 'lucide-react';
import { PartViewModal } from './PartViewModal';
import { matchesSearchTerm } from '../utils/searchUtils';
import { useDialog } from './DialogContext';
import { modalStack } from '../utils/modalStack';
import { getCurrentFeatures } from '../config/appFeatures';

export interface PartCustomAttribute {
  name: string;
  value: string;
}

export interface Part {
  id: string;
  code: string;
  manufacturerCode?: string;
  barcode?: string;
  name: string;
  brand?: string;
  group?: string;
  location?: string;
  costPrice?: string;
  profitMarginPercent?: string;
  techPrice?: string;
  finalPrice: string;
  application?: string;
  unit?: string;
  stockQuantity?: number;
  minStock?: number;
  supplierId?: string;
  supplierName?: string;
  imageUrl?: string;
  updatedAt?: string;
  createdAt?: string;

  // 1. Medidas & Dimensões Físicas
  length?: string;           // Comprimento (ex: 150 mm)
  width?: string;            // Largura (ex: 80 mm)
  height?: string;           // Altura / Espessura (ex: 25 mm)
  innerDiameter?: string;    // Diâmetro Interno (ex: 8 mm / 5/16")
  outerDiameter?: string;    // Diâmetro Externo (ex: 22 mm)
  threadFitting?: string;    // Rosca / Encaixe / Passo (ex: M6, 1/4", 30 vias)
  weight?: string;           // Peso (ex: 250 g, 1.5 kg)

  // 2. Especificações Elétricas & Técnicas
  voltage?: string;          // Tensão / Voltagem (ex: 110V, 220V, Bivolt, 12V DC)
  power?: string;            // Potência / Consumo (ex: 1500W, 1/4 HP, 12000 BTUs)
  current?: string;          // Corrente / Amperagem (ex: 10A, 500mA)
  capacitance?: string;      // Capacitância / Parâmetro (ex: 45 µF)
  frequency?: string;        // Frequência / Rotação (ex: 60Hz, 1750 RPM)
  resistance?: string;       // Resistência (ex: 25 Ω)
  material?: string;         // Material / Composição (ex: Cobre, Inox, Alumínio, ABS)

  // 3. Compatibilidade & OEM
  compatibleModels?: string; // Modelos Compatíveis
  oemCrossReference?: string; // Códigos Equivalentes / Cross Reference (OEM)
  colorFinish?: string;      // Cor / Acabamento

  // 5. Atributos Personalizados Extras
  customAttributes?: PartCustomAttribute[];
}

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  visible: boolean;
  fixed?: boolean;
}

interface PartsModalProps {
  isOpen: boolean;
  parts: Part[];
  allOrders?: any[];
  availableEquipments?: any[];
  currentUser?: any;
  onClose: () => void;
  onSelectPart?: (part: Part) => void;
  onOpenCreatePart: () => void;
  onOpenEditPart?: (part: Part) => void;
  onDeletePart?: (partId: string) => void;
  onAddToSales?: (part: Part) => void;
  onOpenNfeImport?: () => void;
  onOpenLabelsGenerator?: (part: Part) => void;
  onOpenQuickStock?: () => void;
}

export const PartsModal: React.FC<PartsModalProps> = ({
  isOpen,
  parts,
  allOrders = [],
  availableEquipments = [],
  currentUser,
  onClose,
  onSelectPart,
  onOpenCreatePart,
  onOpenEditPart,
  onDeletePart,
  onAddToSales,
  onOpenNfeImport,
  onOpenLabelsGenerator,
  onOpenQuickStock,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExactSearch, setIsExactSearch] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [viewingPart, setViewingPart] = useState<Part | null>(null);
  const [filterOnlyLowStock, setFilterOnlyLowStock] = useState<boolean>(false);
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const defaultCols: ColumnConfig[] = [
      { id: 'code', label: 'Código', width: 90, visible: true, fixed: true },
      { id: 'barcode', label: 'Cód. Barras', width: 130, visible: true },
      { id: 'manufacturerCode', label: 'Cód. Fabricante', width: 130, visible: true },
      { id: 'name', label: 'Nome da Peça', width: 220, visible: true, fixed: true },
      { id: 'supplierName', label: 'Fornecedor', width: 160, visible: true },
      { id: 'stockQuantity', label: 'Em Estoque', width: 95, visible: true, fixed: true },
      { id: 'reservedQuantity', label: 'Reservada', width: 100, visible: true },
      { id: 'techPrice', label: 'Valor Técnico', width: 105, visible: true },
      { id: 'finalPrice', label: 'Consumidor Final', width: 125, visible: true, fixed: true },
      { id: 'application', label: 'Referência / Aplicação', width: 180, visible: true },
      { id: 'group', label: 'Grupo (Tipo Equip.)', width: 160, visible: true },
      { id: 'location', label: 'Localização', width: 120, visible: true },
      { id: 'updatedAt', label: 'Última Alteração', width: 140, visible: true },
      { id: 'brand', label: 'Marca / Fabricante', width: 140, visible: false },
      { id: 'minStock', label: 'Estoque Mín.', width: 95, visible: false },
      { id: 'costPrice', label: 'Valor Custo', width: 105, visible: false },
      { id: 'profitMarginPercent', label: 'Margem (%)', width: 95, visible: false },
    ];
    try {
      const saved = localStorage.getItem('parts_modal_columns_v8');
      if (saved) {
        const parsed: ColumnConfig[] = JSON.parse(saved);
        if (parsed.some((c) => c.id === 'supplierName' || c.id === 'updatedAt')) return parsed;
      }
    } catch (err) { }
    return defaultCols;
  });

  const saveColumnsToStorage = (newCols: ColumnConfig[]) => {
    try {
      localStorage.setItem('parts_modal_columns_v8', JSON.stringify(newCols));
    } catch (err) { }
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setIsExactSearch(false);
      setSelectedGroup('');
      setSelectedPartId(null);
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    } else {
      setSearchTerm('');
      setIsExactSearch(false);
      setSelectedGroup('');
      setSelectedPartId(null);
    }
  }, [isOpen]);

  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  // Registro na pilha de modais para ESC fechar apenas o último modal aberto
  React.useEffect(() => {
    if (isOpen) {
      modalStack.register('PartsModal', () => onCloseRef.current?.());
      return () => modalStack.unregister('PartsModal');
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

    const onGlobalMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

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

      setDraggingColId(null);
      setDragOverColId(null);
    };

    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);
  };

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

  // Move coluna para a esquerda ou direita
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

  const availableGroups = Array.from(
    new Set(
      availableEquipments
        .map((eq) => (eq.type || eq.name || '').trim().toUpperCase())
        .filter(Boolean)
    )
  );

  const lowStockCount = React.useMemo(() => {
    return (parts || []).filter((p) => {
      const qty = Number(p.stockQuantity !== undefined ? p.stockQuantity : 0);
      const minQty = Number(p.minStock !== undefined ? p.minStock : 0);
      return qty <= minQty || qty <= 0;
    }).length;
  }, [parts]);

  const filteredParts = React.useMemo(() => {
    return (parts || [])
      .filter((p) => {
        if (!p) return false;

        // Filtro por Grupo (Tipo de Equipamento)
        if (selectedGroup) {
          const partGroup = (p.group || '').trim().toUpperCase();
          if (partGroup !== selectedGroup) return false;
        }

        // v4.0.0: Filtro de Estoque Baixo / Mínimo
        if (filterOnlyLowStock) {
          const qty = Number(p.stockQuantity !== undefined ? p.stockQuantity : 0);
          const minQty = Number(p.minStock !== undefined ? p.minStock : 0);
          if (qty > minQty && qty > 0) return false;
        }

        if (!searchTerm.trim()) return true;

        if (isExactSearch) {
          return (
            matchesSearchTerm(String(p.code || ''), searchTerm, true) ||
            matchesSearchTerm(p.barcode, searchTerm, true) ||
            matchesSearchTerm(p.manufacturerCode, searchTerm, true) ||
            matchesSearchTerm(String(p.id || ''), searchTerm, true) ||
            matchesSearchTerm(p.name, searchTerm, true)
          );
        }

        return (
          matchesSearchTerm(p.name, searchTerm) ||
          matchesSearchTerm(String(p.code || ''), searchTerm) ||
          matchesSearchTerm(p.barcode, searchTerm) ||
          matchesSearchTerm(p.manufacturerCode, searchTerm) ||
          matchesSearchTerm(p.brand, searchTerm) ||
          matchesSearchTerm(p.group, searchTerm) ||
          matchesSearchTerm(p.location, searchTerm) ||
          matchesSearchTerm(p.application, searchTerm) ||
          matchesSearchTerm(p.voltage, searchTerm) ||
          matchesSearchTerm(p.power, searchTerm) ||
          matchesSearchTerm(p.compatibleModels, searchTerm) ||
          matchesSearchTerm(p.oemCrossReference, searchTerm) ||
          matchesSearchTerm(p.threadFitting, searchTerm) ||
          matchesSearchTerm(p.material, searchTerm) ||
          matchesSearchTerm(p.innerDiameter, searchTerm) ||
          matchesSearchTerm(p.outerDiameter, searchTerm) ||
          (Array.isArray(p.customAttributes) && p.customAttributes.some((attr) => matchesSearchTerm(`${attr.name} ${attr.value}`, searchTerm)))
        );
      })
      .sort((a, b) => {
        const nameA = String(a.name || '').trim();
        const nameB = String(b.name || '').trim();
        return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
      });
  }, [parts, selectedGroup, filterOnlyLowStock, searchTerm, isExactSearch]);

  // Mapeamento dinâmico das quantidades reservadas de cada peça em todas as OSs abertas/em andamento
  const reservedQuantitiesMap = React.useMemo(() => {
    const map = new Map<string, { totalQty: number; ordersCount: number }>();
    const norm = (val: any) => String(val || '').trim().toLowerCase();
    const numClean = (val: any) => String(val || '').replace(/\D/g, '');

    (allOrders || []).forEach((order: any) => {
      if (!order) return;
      const st = String(order.status || '').toUpperCase().trim();
      // Não conta peças de OS finalizada ou cancelada
      if (
        st === 'FINALIZADA' ||
        st === 'CONCLUIDA' ||
        st === 'GARANTIA_FINALIZADA' ||
        st === 'GARANTIA/FINALIZADA' ||
        st === 'CANCELADA' ||
        st === 'CANCELADO'
      ) {
        return;
      }

      // Verifica se as peças da OS estão reservadas ou separadas
      const isReserved = Boolean(
        order.isPartsReserved ||
        st === 'ORCAMENTO_APROVADO' ||
        st === 'APROVADO'
      );

      const rawParts = order.partsUsed || order.parts || order.partsList || [];
      if (!Array.isArray(rawParts)) return;

      rawParts.forEach((prt: any) => {
        if (!prt) return;
        // Se a OS for de status que reserva OU se a peça individual estiver marcada como separada
        const shouldCount = isReserved || Boolean(prt.separated);
        if (!shouldCount) return;

        const qty = Number(prt.qty || prt.quantity || 1);
        if (qty <= 0) return;

        const pName = norm(prt.name);
        const pCode = norm(prt.code);
        const pClean = numClean(prt.code);

        (parts || []).forEach((stkPart) => {
          const sName = norm(stkPart.name);
          const sCode = norm(stkPart.code);
          const sClean = numClean(stkPart.code);
          const sId = norm(stkPart.id);

          const isMatch =
            (pCode && sCode && pCode === sCode) ||
            (pClean && sClean && pClean === sClean) ||
            (pName && sName && pName === sName) ||
            (pCode && sId && pCode === sId);

          if (isMatch) {
            const current = map.get(stkPart.id) || { totalQty: 0, ordersCount: 0 };
            map.set(stkPart.id, {
              totalQty: current.totalQty + qty,
              ordersCount: current.ordersCount + 1,
            });
          }
        });
      });
    });

    return map;
  }, [allOrders, parts]);

  const selectedPart = parts.find((p) => p.id === selectedPartId);

  const { alert, confirm } = useDialog();

  const handleEditPart = async () => {
    if (!selectedPart) { await alert({ title: 'Selecione uma Peça', message: 'Por favor, selecione uma peça na tabela.', variant: 'info' }); return; }
    if (onOpenEditPart) onOpenEditPart(selectedPart);
  };

  const handleDoubleClickRow = (p: Part) => {
    // Duplo clique sempre abre a ficha da peça.
    // Se aberto no contexto de Vendas (onSelectPart presente), o botão
    // "Adicionar à Venda" dentro da ficha é quem confirma a seleção.
    setSelectedPartId(p.id);
    setViewingPart(p);
  };

  const handleDeletePart = async () => {
    if (!selectedPart) { await alert({ title: 'Selecione uma Peça', message: 'Por favor, selecione uma peça na tabela.', variant: 'info' }); return; }
    const ok = await confirm({ title: 'Excluir Peça', message: `Deseja realmente EXCLUIR a peça "${selectedPart.name}"?`, variant: 'danger', confirmText: 'Excluir' });
    if (ok) {
      if (onDeletePart) onDeletePart(selectedPart.id);
      setSelectedPartId(null);
    }
  };

  // Navegação por teclado (Enter para selecionar, Setas Cima/Baixo para navegar, F2 para novo)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'F2') {
        e.preventDefault();
        onClose();
        onOpenCreatePart();
        return;
      }

      if (e.key === 'ArrowDown') {
        if (filteredParts.length > 0) {
          e.preventDefault();
          const currIdx = filteredParts.findIndex((p) => p.id === selectedPartId);
          const nextIdx = currIdx < filteredParts.length - 1 ? currIdx + 1 : 0;
          setSelectedPartId(filteredParts[nextIdx].id);
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        if (filteredParts.length > 0) {
          e.preventDefault();
          const currIdx = filteredParts.findIndex((p) => p.id === selectedPartId);
          const prevIdx = currIdx > 0 ? currIdx - 1 : filteredParts.length - 1;
          setSelectedPartId(filteredParts[prevIdx].id);
        }
        return;
      }

      if (e.key === 'Enter') {
        // Se houver modal de visualização ou context menu aberto, não intercepta
        if (viewingPart || contextMenu) return;

        const partToSelect = selectedPart || (filteredParts.length > 0 ? (selectedPartId ? filteredParts.find((p) => p.id === selectedPartId) : filteredParts[0]) : null);
        if (partToSelect) {
          e.preventDefault();
          if (onSelectPart) {
            onSelectPart(partToSelect);
            onClose();
          } else {
            setSelectedPartId(partToSelect.id);
            setViewingPart(partToSelect);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpenCreatePart, onClose, onSelectPart, selectedPart, selectedPartId, filteredParts, viewingPart, contextMenu]);

  const renderCellContent = (p: Part, columnId: string) => {
    const qty = p.stockQuantity !== undefined ? p.stockQuantity : 0;
    const minQty = p.minStock !== undefined ? p.minStock : 0;
    const isLowStock = qty <= minQty || qty <= 0;
    const unitLabel = (p.unit || 'un').toLowerCase();
    const reservedInfo = reservedQuantitiesMap.get(p.id);
    const reservedQty = reservedInfo ? reservedInfo.totalQty : 0;

    switch (columnId) {
      case 'code':
        return (
          <span className="font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            {p.code}
          </span>
        );
      case 'barcode':
        return (
          <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 truncate inline-block">
            {p.barcode || '-'}
          </span>
        );
      case 'manufacturerCode':
        return <span className="font-mono font-bold">{p.manufacturerCode || '-'}</span>;
      case 'name':
        return <span className="font-bold">{p.name}</span>;
      case 'brand':
        return <span className="font-semibold text-slate-800">{p.brand || '-'}</span>;
      case 'group':
        return (
          <span className="font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-[10px] uppercase">
            {p.group || '-'}
          </span>
        );
      case 'location':
        return <span className="font-mono font-semibold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">{p.location || '-'}</span>;
      case 'stockQuantity':
        return (
          <div className={`flex items-center w-full px-2 py-0.5 rounded font-mono ${isLowStock ? 'bg-red-200 text-red-950 border border-red-400' : 'bg-slate-100 text-slate-900'}`}>
            <span className="flex-1 text-center font-extrabold">{qty}</span>
            <span className="text-[10px] font-bold opacity-75 ml-1">{unitLabel}</span>
          </div>
        );
      case 'reservedQuantity':
        if (reservedQty > 0) {
          return (
            <div
              className="flex items-center w-full px-2 py-0.5 rounded font-mono bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs font-bold"
              title={`${reservedQty} ${unitLabel} reservada(s) em ${reservedInfo?.ordersCount || 1} Ordem(ns) de Serviço`}
            >
              <span className="flex-1 text-center font-extrabold">{reservedQty}</span>
              <span className="text-[10px] font-bold opacity-80 ml-1">{unitLabel}</span>
            </div>
          );
        }
        return (
          <span className="text-slate-400 font-mono text-center block w-full">0</span>
        );
      case 'minStock':
        const minUnitLabel = (p.unit || 'un').toLowerCase();
        return (
          <div className="flex items-center w-full px-2 py-0.5 rounded font-mono text-slate-700 bg-slate-50">
            <span className="flex-1 text-center font-bold">{minQty}</span>
            <span className="text-[10px] font-semibold opacity-70 ml-1">{minUnitLabel}</span>
          </div>
        );
      case 'costPrice':
        return <span className="block text-right pr-1">{p.costPrice ? `R$ ${p.costPrice}` : '-'}</span>;
      case 'profitMarginPercent':
        return <span className="font-mono text-indigo-700 block text-right pr-1">{p.profitMarginPercent ? `${p.profitMarginPercent}%` : '-'}</span>;
      case 'techPrice':
        return <span className="block text-right font-semibold text-slate-800 pr-1">{p.techPrice ? `R$ ${p.techPrice}` : '-'}</span>;
      case 'finalPrice':
        return <span className="block text-right font-bold text-emerald-700 pr-1">R$ {p.finalPrice}</span>;
      case 'application':
        return <span className="truncate">{p.application || '-'}</span>;
      case 'supplierName':
        return (
          <span className="font-semibold text-slate-800 truncate" title={p.supplierName || ''}>
            {p.supplierName || '-'}
          </span>
        );
      case 'updatedAt':
        if (!p.updatedAt) return <span className="text-slate-400 font-mono text-[10px]">-</span>;
        try {
          const d = new Date(p.updatedAt);
          if (isNaN(d.getTime())) return <span className="font-mono text-[10px]">{p.updatedAt}</span>;
          const formattedDate = d.toLocaleDateString('pt-BR');
          const formattedTime = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          return (
            <span className="font-mono text-slate-700 text-[10px] truncate" title={`${formattedDate} às ${formattedTime}`}>
              {formattedDate} {formattedTime}
            </span>
          );
        } catch {
          return <span className="font-mono text-[10px]">{p.updatedAt}</span>;
        }
      default:
        return null;
    }
  };

  // Mantém a primeira linha selecionada por padrão para agilizar seleção por Enter
  useEffect(() => {
    if (filteredParts.length > 0 && (!selectedPartId || !filteredParts.some((p) => p.id === selectedPartId))) {
      setSelectedPartId(filteredParts[0].id);
    }
  }, [filteredParts, selectedPartId]);

  const features = getCurrentFeatures();
  const visibleColumns = columns
    .filter((col) => {
      if (!features.hasPartsTechPrice && col.id === 'techPrice') return false;
      if (!features.hasPartsReservedColumn && col.id === 'reservedQuantity') return false;
      return true;
    });

  const totalPixels = visibleColumns
    .filter((c) => c.visible)
    .reduce((acc, col) => acc + col.width, 0);

  if (!isOpen) return null;

  return (
    <>
    <div
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setContextMenu(null)}
    >
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans relative">
        {/* Header */}
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" />
              Central de Peças Cadastradas
            </h2>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-300/80 border border-slate-300 px-2.5 py-0.5 rounded-full">
              {searchTerm.trim() || selectedGroup || filterOnlyLowStock ? `${filteredParts.length} de ${parts.length}` : `${parts.length}`} {parts.length === 1 ? 'peça' : 'peças'}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Pesquisa e Filtros de Grupo/Equipamento */}
        <div className="p-3.5 bg-slate-100 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Campo Busca Livre */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsExactSearch(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const partToSelect = selectedPart || (filteredParts.length > 0 ? (selectedPartId ? filteredParts.find((p) => p.id === selectedPartId) : filteredParts[0]) : null);
                    if (partToSelect) {
                      setSelectedPartId(partToSelect.id);
                      setViewingPart(partToSelect);
                    } else {
                      setIsExactSearch(true);
                    }
                  }
                }}
                placeholder="Buscar por nome, código, marca... (Pressione Enter para selecionar a peça)"
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-600"
              />
            </div>

            {/* Botão / Dropdown de Filtrar por Grupo (Tipo de Equipamento) */}
            <div className="min-w-[180px]">
              <select
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(e.target.value);
                }}
                className="w-full bg-white border border-sky-300 text-sky-950 font-bold rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-sky-600 cursor-pointer uppercase shadow-xs"
              >
                <option value="">TODOS OS GRUPOS (TIPOS)</option>
                {availableGroups.map((grp, idx) => (
                  <option key={idx} value={grp}>
                    GRUPO: {grp}
                  </option>
                ))}
              </select>
            </div>

            {/* v4.0.0: Filtro Rápido de Estoque Crítico / Abaixo do Mínimo */}
            {features.hasStockAlerts && (
              <button
                type="button"
                onClick={() => {
                  setFilterOnlyLowStock((prev) => !prev);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  filterOnlyLowStock
                    ? 'bg-red-600 text-white border-red-700 shadow-sm'
                    : 'bg-white hover:bg-red-50 text-red-700 border-red-200'
                }`}
                title="Mostrar apenas peças com estoque zerado ou abaixo do mínimo"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span>Abaixo do Mínimo</span>
                {lowStockCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    filterOnlyLowStock ? 'bg-white text-red-700' : 'bg-red-100 text-red-800'
                  }`}>
                    {lowStockCount}
                  </span>
                )}
              </button>
            )}

            {/* v4.0.0: Botão de Importar XML (NF-e) */}
            {features.hasNfeXmlImport && onOpenNfeImport && (
              <button
                type="button"
                onClick={onOpenNfeImport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer border border-emerald-500/40 hover:scale-105 active:scale-95"
                title="Importar Nota Fiscal Eletrônica (XML) para Entrada de Estoque"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Importar NF-e (XML)</span>
              </button>
            )}

            {/* Atualização Rápida de Estoque & Preço */}
            {onOpenQuickStock && (
              <button
                type="button"
                onClick={onOpenQuickStock}
                className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer border border-amber-500/40 hover:scale-105 active:scale-95"
                title="Atualização Rápida de Estoque e Preços por Código"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Atualização Rápida</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabela Interativa */}
        <div
          className="flex-1 overflow-x-auto overflow-y-auto bg-slate-50 select-none"
          onContextMenu={handleContextMenu}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('tr[data-row]') === null) {
              setSelectedPartId(null);
            }
          }}
        >
          <div style={{ width: `${totalPixels}px`, minWidth: '100%' }}>
            <table
              style={{ tableLayout: 'fixed', width: `${totalPixels}px` }}
              className="text-left text-[11px] text-slate-800 border-collapse"
            >
              <colgroup>
                {visibleColumns
                  .filter((col) => col.visible)
                  .map((col) => (
                    <col key={col.id} style={{ width: `${col.width}px` }} />
                  ))}
              </colgroup>
              <thead className="bg-slate-200 text-slate-800 font-bold uppercase sticky top-0 z-20 text-[10px]">
                <tr>
                  {visibleColumns
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
                              ? 'opacity-40 bg-amber-300 border-amber-500 scale-[0.98]'
                              : isOverThis
                              ? 'bg-amber-200 border-l-4 border-l-amber-600'
                              : ''
                          }`}
                        >
                          <div className={`flex items-center justify-between pointer-events-none select-none ${['techPrice', 'finalPrice', 'costPrice', 'profitMarginPercent'].includes(col.id) ? 'text-right' : col.id === 'stockQuantity' ? 'text-center' : ''}`}>
                            <span className="truncate pr-1 font-bold">{col.label}</span>
                            <span className="text-[10px] text-slate-400 opacity-60 group-hover:opacity-100">⠿</span>
                          </div>
                          <div
                            data-resize="true"
                            onMouseDown={(e) => handleMouseDownResize(e, col.id)}
                            className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-amber-500/60 z-30 opacity-0 group-hover:opacity-100"
                          />
                        </th>
                      );
                    })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredParts.map((p) => {
                  const isSelected = p.id === selectedPartId;
                  const qty = p.stockQuantity !== undefined ? p.stockQuantity : 0;
                  const minQty = p.minStock !== undefined ? p.minStock : 0;
                  const isLowStock = qty <= minQty || qty <= 0;

                  return (
                    <tr
                      key={p.id}
                      data-row="true"
                      onClick={() => setSelectedPartId(p.id)}
                      onDoubleClick={() => handleDoubleClickRow(p)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? isLowStock
                            ? 'bg-red-100 text-red-950'
                            : 'bg-amber-100/90 text-amber-950'
                          : isLowStock
                          ? 'bg-red-50 text-red-900 hover:bg-red-100/80'
                          : 'hover:bg-slate-100 bg-white'
                      }`}
                    >
                      {visibleColumns
                        .filter((col) => col.visible)
                        .map((col) => (
                          <td
                            key={col.id}
                            style={{ width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px` }}
                            className="p-1.5 border-r border-slate-200 truncate"
                          >
                            {renderCellContent(p, col.id)}
                          </td>
                        ))}
                    </tr>
                  );
                })}

                {filteredParts.length === 0 && (
                  <tr>
                    <td
                      colSpan={visibleColumns.filter((c) => c.visible).length}
                      className="text-center py-12 text-slate-400"
                    >
                      Nenhuma peça cadastrada ou encontrada para a pesquisa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Menu de Contexto do Botão Direito para Ocultar/Exibir Colunas */}
        {contextMenu && (
          <div
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            className="fixed bg-white border border-slate-300 rounded-xl shadow-2xl py-2 min-w-[230px] z-50 text-xs text-slate-800 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1 font-bold text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100 mb-1">
              Exibir / Remover Colunas
            </div>
            {visibleColumns
              .filter((col) => !col.fixed)
              .map((col) => (
                <button
                  key={col.id}
                  onClick={() => toggleColumnVisibility(col.id)}
                  className="w-full text-left px-3 py-1.5 hover:bg-amber-50 text-slate-800 flex items-center justify-between cursor-pointer"
                >
                  <span>{col.label}</span>
                  {col.visible && <Check className="w-3.5 h-3.5 text-amber-600" />}
                </button>
              ))}
          </div>
        )}

        {/* Rodapé com Botões de Ação e Atalho Discreto F2 */}
        <div className="p-3 bg-slate-200 border-t border-slate-300 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 truncate min-w-0">
            <span className="font-semibold text-slate-700 truncate">
              {selectedPart ? (
                <span>
                  Peça Selecionada: <strong className="text-amber-800">{selectedPart.name}</strong> (Consumidor: R$ {selectedPart.finalPrice})
                </span>
              ) : (
                'Selecione uma peça na tabela acima'
              )}
            </span>
            <span className="text-[11px] text-slate-500 font-mono bg-slate-300/80 px-2 py-0.5 rounded border border-slate-300 shrink-0">
              [F2] Cadastrar Nova Peça
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onSelectPart && (
              <button
                onClick={() => {
                  if (selectedPart) {
                    onSelectPart(selectedPart);
                    onClose();
                  }
                }}
                disabled={!selectedPartId}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>Selecionar Peça</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onOpenCreatePart();
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Cadastrar Nova Peça</span>
            </button>

            <button
              onClick={handleEditPart}
              disabled={!selectedPartId}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
            >
              <Edit3 className="w-4 h-4 shrink-0" />
              <span>Editar Peça</span>
            </button>

            <button
              onClick={handleDeletePart}
              disabled={!selectedPartId}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Excluir</span>
            </button>

            <button
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <PartViewModal
      isOpen={viewingPart !== null}
      part={viewingPart}
      currentUser={currentUser}
      onClose={() => setViewingPart(null)}
      onEdit={(p) => {
        setViewingPart(null);
        if (onOpenEditPart) onOpenEditPart(p);
      }}
      onAddToSales={(p) => {
        setViewingPart(null);
        if (onSelectPart) {
          onSelectPart(p);
          onClose();
        } else if (onAddToSales) {
          onAddToSales(p);
        }
      }}
      onOpenLabelsGenerator={(p) => {
        setViewingPart(null);
        if (onOpenLabelsGenerator) onOpenLabelsGenerator(p);
      }}
    />
    </>
  );
};
