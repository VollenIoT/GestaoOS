import React, { useState } from 'react';
import { X, Search, PlusCircle, FolderOpen, Edit3, Trash2, LogOut, Package, Check } from 'lucide-react';
import { PartViewModal } from './PartViewModal';
import { matchesSearchTerm } from '../utils/searchUtils';

export interface Part {
  id: string;
  code: string;
  manufacturerCode?: string;
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
  availableEquipments?: any[];
  currentUser?: any;
  onClose: () => void;
  onSelectPart?: (part: Part) => void;
  onOpenCreatePart: () => void;
  onOpenEditPart?: (part: Part) => void;
  onDeletePart?: (partId: string) => void;
}

export const PartsModal: React.FC<PartsModalProps> = ({
  isOpen,
  parts,
  availableEquipments = [],
  currentUser,
  onClose,
  onSelectPart,
  onOpenCreatePart,
  onOpenEditPart,
  onDeletePart,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedEquipmentModel, setSelectedEquipmentModel] = useState<string>('');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [viewingPart, setViewingPart] = useState<Part | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const defaultCols: ColumnConfig[] = [
      { id: 'code', label: 'Código', width: 90, visible: true, fixed: true },
      { id: 'name', label: 'Nome da Peça', width: 200, visible: true, fixed: true },
      { id: 'brand', label: 'Marca / Fabricante', width: 140, visible: true },
      { id: 'group', label: 'Grupo (Tipo Equip.)', width: 160, visible: true },
      { id: 'location', label: 'Localização', width: 120, visible: true },
      { id: 'manufacturerCode', label: 'Cód. Fabricante', width: 130, visible: true },
      { id: 'stockQuantity', label: 'Em Estoque', width: 95, visible: true, fixed: true },
      { id: 'minStock', label: 'Estoque Mín.', width: 95, visible: true },
      { id: 'costPrice', label: 'Valor Custo', width: 105, visible: true },
      { id: 'profitMarginPercent', label: 'Margem (%)', width: 95, visible: false },
      { id: 'techPrice', label: 'Valor Técnico', width: 105, visible: true },
      { id: 'finalPrice', label: 'Consumidor Final', width: 125, visible: true, fixed: true },
      { id: 'application', label: 'Referência / Aplicação', width: 180, visible: true },
    ];
    try {
      const saved = localStorage.getItem('parts_modal_columns_v5');
      if (saved) {
        const parsed: ColumnConfig[] = JSON.parse(saved);
        if (parsed.some((c) => c.id === 'group')) return parsed;
      }
    } catch (err) { }
    return defaultCols;
  });

  const saveColumnsToStorage = (newCols: ColumnConfig[]) => {
    try {
      localStorage.setItem('parts_modal_columns_v5', JSON.stringify(newCols));
    } catch (err) { }
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedPartId(null);
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'F2') {
        e.preventDefault();
        onClose();
        onOpenCreatePart();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Redimensionamento isolado de coluna à direita
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

  const availableGroups = Array.from(
    new Set(
      availableEquipments
        .map((eq) => (eq.type || eq.name || '').trim().toUpperCase())
        .filter(Boolean)
    )
  );

  const availableModelsForSelectedGroup = Array.from(
    new Set(
      availableEquipments
        .filter((eq) => !selectedGroup || (eq.type || eq.name || '').trim().toUpperCase() === selectedGroup)
        .map((eq) => (eq.model || eq.brand || '').trim().toUpperCase())
        .filter(Boolean)
    )
  );

  const filteredParts = (parts || []).filter((p) => {
    if (!p) return false;

    // Filtro por Grupo (Tipo de Equipamento)
    if (selectedGroup) {
      const partGroup = (p.group || '').trim().toUpperCase();
      if (partGroup !== selectedGroup) return false;
    }

    // Filtro por Equipamento/Modelo
    if (selectedEquipmentModel) {
      const partApp = (p.application || '').trim().toUpperCase();
      const partBrand = (p.brand || '').trim().toUpperCase();
      const modelUpper = selectedEquipmentModel.toUpperCase();
      if (!partApp.includes(modelUpper) && !partBrand.includes(modelUpper)) return false;
    }

    if (!searchTerm.trim()) return true;
    return (
      matchesSearchTerm(p.name, searchTerm) ||
      matchesSearchTerm(String(p.code || ''), searchTerm) ||
      matchesSearchTerm(p.manufacturerCode, searchTerm) ||
      matchesSearchTerm(p.brand, searchTerm) ||
      matchesSearchTerm(p.group, searchTerm) ||
      matchesSearchTerm(p.location, searchTerm) ||
      matchesSearchTerm(p.application, searchTerm)
    );
  });

  const selectedPart = parts.find((p) => p.id === selectedPartId);

  const handleEditPart = () => {
    if (!selectedPart) return alert('Por favor, selecione uma peça na tabela.');
    if (onOpenEditPart) {
      onOpenEditPart(selectedPart);
    }
  };

  const handleDoubleClickRow = (p: Part) => {
    if (onSelectPart) {
      // 2 cliques na busca de OS: seleciona e fecha
      onSelectPart(p);
      onClose();
    } else {
      // Central de Peças avulsa: abre modal de visualização
      setSelectedPartId(p.id);
      setViewingPart(p);
    }
  };

  const handleDeletePart = () => {
    if (!selectedPart) return alert('Por favor, selecione uma peça na tabela.');
    if (confirm(`Deseja realmente EXCLUIR a peça "${selectedPart.name}"?`)) {
      if (onDeletePart) {
        onDeletePart(selectedPart.id);
      }
      setSelectedPartId(null);
    }
  };

  const renderCellContent = (p: Part, columnId: string) => {
    const qty = p.stockQuantity !== undefined ? p.stockQuantity : 0;
    const minQty = p.minStock !== undefined ? p.minStock : 0;
    const isLowStock = qty <= minQty || qty <= 0;

    switch (columnId) {
      case 'code':
        return (
          <span className="font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            {p.code}
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
        const unitLabel = p.unit ? p.unit.toLowerCase() : 'un';
        return (
          <span className={`font-mono font-extrabold px-2 py-0.5 rounded ${isLowStock ? 'bg-red-200 text-red-950 border border-red-400' : 'bg-slate-100 text-slate-900'}`}>
            {qty} {unitLabel}
          </span>
        );
      case 'minStock':
        const minUnitLabel = p.unit ? p.unit.toLowerCase() : 'un';
        return <span className="font-mono font-bold text-slate-700">{minQty} {minUnitLabel}</span>;
      case 'costPrice':
        return <span>{p.costPrice ? `R$ ${p.costPrice}` : '-'}</span>;
      case 'profitMarginPercent':
        return <span className="font-mono text-indigo-700">{p.profitMarginPercent ? `${p.profitMarginPercent}%` : '-'}</span>;
      case 'techPrice':
        return <span>{p.techPrice ? `R$ ${p.techPrice}` : '-'}</span>;
      case 'finalPrice':
        return <span className="font-bold text-emerald-700">R$ {p.finalPrice}</span>;
      case 'application':
        return <span className="truncate">{p.application || '-'}</span>;
      default:
        return null;
    }
  };

  const totalPixels = columns
    .filter((c) => c.visible)
    .reduce((acc, col) => acc + col.width, 0);

  return (
    <>
    <div
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setContextMenu(null)}
    >
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans relative">
        {/* Header */}
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            Central de Peças Cadastradas
          </h2>
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
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, código, marca..."
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-600"
              />
            </div>

            {/* Botão / Dropdown de Filtrar por Grupo (Tipo de Equipamento) */}
            <div className="min-w-[180px]">
              <select
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(e.target.value);
                  setSelectedEquipmentModel('');
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

            {/* Botão / Dropdown de Filtrar por Equipamento (Aparece após selecionar o grupo ou se houver equipamentos) */}
            {selectedGroup ? (
              <div className="min-w-[180px] animate-fadeIn">
                <select
                  value={selectedEquipmentModel}
                  onChange={(e) => setSelectedEquipmentModel(e.target.value)}
                  className="w-full bg-indigo-50 border border-indigo-300 text-indigo-950 font-bold rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-600 cursor-pointer uppercase shadow-xs"
                >
                  <option value="">TODOS EQUIPAMENTOS</option>
                  {availableModelsForSelectedGroup.map((mdl, idx) => (
                    <option key={idx} value={mdl}>
                      EQUIP.: {mdl}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </div>

        {/* Tabela Interativa */}
        <div
          className="flex-1 overflow-x-auto overflow-y-auto p-4 bg-slate-50 select-none"
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
                        draggable
                        onDragStart={(e) => handleDragStart(e, col.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                        style={{ width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px` }}
                        className="p-1.5 border-b border-r border-slate-300 relative group cursor-grab active:cursor-grabbing hover:bg-slate-300/80 transition-colors"
                      >
                        <div className="truncate pr-2">{col.label}</div>
                        <div
                          onMouseDown={(e) => handleMouseDownResize(e, col.id)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500/60 z-30 opacity-0 group-hover:opacity-100"
                        />
                      </th>
                    ))}
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
                      {columns
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
                      colSpan={columns.filter((c) => c.visible).length}
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
            {columns
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
    />
    </>
  );
};
