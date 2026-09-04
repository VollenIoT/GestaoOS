import React, { useState } from 'react';
import { X, Search, PlusCircle, Cpu, Check, Trash2, Edit3 } from 'lucide-react';
import { matchesSearchTerm } from '../utils/searchUtils';
import { useDialog } from './DialogContext';
import { modalStack } from '../utils/modalStack';

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  visible: boolean;
  fixed?: boolean;
}

interface EquipmentsModalProps {
  isOpen: boolean;
  equipments: any[];
  currentUser?: any;
  onClose: () => void;
  onOpenCreateEquipment: () => void;
  onOpenEditEquipment?: (equipment: any) => void;
  onDeleteEquipment?: (equipmentId: string) => void;
}

export const EquipmentsModal: React.FC<EquipmentsModalProps> = ({
  isOpen,
  equipments = [],
  currentUser,
  onClose,
  onOpenCreateEquipment,
  onOpenEditEquipment,
  onDeleteEquipment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const canManage = Boolean(currentUser?.role === 'Admin' || currentUser?.permissions?.manageEquipments);
  const { alert: dlgAlert, confirm: dlgConfirm } = useDialog();

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem('equipments_modal_columns');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) { }
    return [
      { id: 'code', label: 'Código', width: 90, visible: true, fixed: true },
      { id: 'type', label: 'Tipo / Aparelho', width: 200, visible: true, fixed: true },
      { id: 'brand', label: 'Marca / Fabricante', width: 160, visible: true },
      { id: 'model', label: 'Modelo Padrão', width: 160, visible: true },
      { id: 'serialNumber', label: 'Nº de Série Padrão', width: 160, visible: true },
    ];
  });

  const saveColumnsToStorage = (newCols: ColumnConfig[]) => {
    try {
      localStorage.setItem('equipments_modal_columns', JSON.stringify(newCols));
    } catch (err) { }
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedEquipmentId(null);
    }
  }, [isOpen]);

  // Registro na pilha de modais para ESC fechar apenas o último modal aberto
  React.useEffect(() => {
    if (isOpen) {
      modalStack.register('EquipmentsModal', onClose);
      return () => modalStack.unregister('EquipmentsModal');
    }
  }, [isOpen, onClose]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'F2') {
        e.preventDefault();
        onClose();
        onOpenCreateEquipment();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpenCreateEquipment, onClose]);

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

  const filteredEquipments = equipments.filter((eq) => {
    if (!searchTerm.trim()) return true;
    return (
      matchesSearchTerm(eq.type, searchTerm) ||
      matchesSearchTerm(eq.brand, searchTerm) ||
      matchesSearchTerm(eq.model, searchTerm) ||
      matchesSearchTerm(eq.code, searchTerm) ||
      matchesSearchTerm(eq.serialNumber, searchTerm)
    );
  });

  const selectedEquipment = filteredEquipments.find((e) => e.id === selectedEquipmentId);

  const renderCellContent = (eq: any, columnId: string) => {
    switch (columnId) {
      case 'code':
        return <span className="font-mono font-bold text-sky-700">{eq.code || 'EQP-0001'}</span>;
      case 'type':
        return <span className="font-bold text-slate-900">{eq.type || 'Equipamento Geral'}</span>;
      case 'brand':
        return <span className="font-semibold text-slate-800">{eq.brand || '-'}</span>;
      case 'model':
        return <span>{eq.model || '-'}</span>;
      case 'serialNumber':
        return <span className="font-mono text-slate-700">{eq.serialNumber || '-'}</span>;
      default:
        return null;
    }
  };

  const totalPixels = columns
    .filter((c) => c.visible)
    .reduce((acc, col) => acc + col.width, 0);

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setContextMenu(null)}
    >
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans relative">
        {/* Header do Modal */}
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-sky-700" />
            Central de Equipamentos Cadastrados
          </h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra Superior com Busca */}
        <div className="p-4 bg-slate-100 border-b border-slate-300">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar equipamento por tipo, marca, modelo ou número de série..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-600"
            />
          </div>
        </div>

        {/* Tabela em Modo Unset com Largura Explícita em Pixels (Estilo idêntico ao de Clientes) */}
        <div
          className="flex-1 overflow-x-auto overflow-y-auto p-4 bg-slate-50 select-none"
          onContextMenu={handleContextMenu}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('tr[data-row]') === null) {
              setSelectedEquipmentId(null);
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
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-sky-500/60 z-30 opacity-0 group-hover:opacity-100"
                        />
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredEquipments.map((eq) => {
                  const isSelected = eq.id === selectedEquipmentId;
                  return (
                    <tr
                      key={eq.id}
                      data-row="true"
                      onClick={() => setSelectedEquipmentId(eq.id)}
                      onDoubleClick={() => {
                        if (onOpenEditEquipment) {
                          onClose();
                          onOpenEditEquipment(eq);
                        }
                      }}
                      className={`cursor-pointer transition-colors ${isSelected
                          ? 'bg-sky-100/90 text-sky-950'
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
                            {renderCellContent(eq, col.id)}
                          </td>
                        ))}
                    </tr>
                  );
                })}

                {filteredEquipments.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.filter((c) => c.visible).length}
                      className="text-center py-12 text-slate-400"
                    >
                      Nenhum equipamento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Menu de Contexto (Botão Direito) para Ocultar/Exibir Colunas */}
        {contextMenu && (
          <div
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            className="fixed bg-white border border-slate-300 rounded-xl shadow-2xl py-2 min-w-[230px] z-50 text-xs text-slate-800 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1 font-bold text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100 mb-1">
              Exibir / Remover Colunas
            </div>
            {columns.map((col) => (
              <button
                key={col.id}
                disabled={col.fixed}
                onClick={() => toggleColumnVisibility(col.id)}
                className={`w-full text-left px-3 py-1.5 hover:bg-sky-50 text-slate-800 flex items-center justify-between transition-colors ${col.fixed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
              >
                <span>{col.label}</span>
                {col.visible && <Check className="w-3.5 h-3.5 text-sky-600" />}
              </button>
            ))}
          </div>
        )}

        {/* Rodapé Fixo com Ações e Atalho Discreto F2 */}
        <div className="p-3 bg-slate-200 border-t border-slate-300 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 truncate min-w-0">
            <span className="font-semibold text-slate-700 truncate">
              {selectedEquipment ? (
                <span>
                  Equipamento Selecionado: <strong className="text-sky-700">{selectedEquipment.type}</strong>
                </span>
              ) : (
                'Selecione um equipamento na tabela acima'
              )}
            </span>
            <span className="text-[11px] text-slate-500 font-mono bg-slate-300/80 px-2 py-0.5 rounded border border-slate-300 shrink-0">
              [F2] Cadastrar Novo Equipamento
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                onClose();
                onOpenCreateEquipment();
              }}
              disabled={!canManage}
              title={!canManage ? 'Você não tem permissão para cadastrar equipamentos.' : undefined}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Cadastrar Novo Equipamento</span>
            </button>

            <button
              onClick={() => {
                if (!selectedEquipment) return alert('Por favor, selecione um equipamento na tabela.');
                if (onOpenEditEquipment) {
                  onClose();
                  onOpenEditEquipment(selectedEquipment);
                } else {
                  alert(`Editar equipamento: ${selectedEquipment.type}`);
                }
              }}
              disabled={!selectedEquipmentId || !canManage}
              title={!canManage ? 'Você não tem permissão para editar equipamentos.' : undefined}
              className="h-8 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-4 h-4 shrink-0" />
              <span>Editar Equipamento</span>
            </button>

            <button
              onClick={async () => {
                if (!selectedEquipment) return alert('Por favor, selecione um equipamento na tabela.');
                const ok = await dlgConfirm({
                  title: 'Excluir Equipamento',
                  message: `Deseja realmente EXCLUIR o equipamento "${selectedEquipment.type}"?`,
                  variant: 'danger',
                  confirmText: 'Excluir',
                });
                if (ok) {
                  if (onDeleteEquipment) {
                    onDeleteEquipment(selectedEquipment.id);
                  }
                  setSelectedEquipmentId(null);
                }
              }}
              disabled={!selectedEquipmentId || !canManage}
              title={!canManage ? 'Você não tem permissão para excluir equipamentos.' : undefined}
              className="h-8 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir</span>
            </button>

            <button
              onClick={onClose}
              className="h-8 bg-slate-700 hover:bg-slate-800 text-white px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
