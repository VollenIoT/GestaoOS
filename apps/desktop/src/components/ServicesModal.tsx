import React, { useState } from 'react';
import { X, Search, PlusCircle, Wrench, Check, LogOut, Edit3, Trash2 } from 'lucide-react';
import { matchesSearchTerm } from '../utils/searchUtils';
import { useDialog } from './DialogContext';

export interface ServiceItem {
  id: string;
  code?: string;
  name: string;
  price: string;
  description?: string;
}

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  visible: boolean;
  fixed?: boolean;
}

interface ServicesModalProps {
  isOpen: boolean;
  services: ServiceItem[];
  currentUser?: any;
  onClose: () => void;
  onSelectService?: (service: ServiceItem) => void;
  onOpenCreateService?: () => void;
  onOpenEditService?: (service: ServiceItem) => void;
  onDeleteService?: (serviceId: string) => void;
}

export const ServicesModal: React.FC<ServicesModalProps> = ({
  isOpen,
  services,
  currentUser,
  onClose,
  onSelectService,
  onOpenCreateService,
  onOpenEditService,
  onDeleteService,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const canManage = Boolean(currentUser?.role === 'Admin' || currentUser?.permissions?.manageServices);
  const { alert: dlgAlert, confirm: dlgConfirm } = useDialog();

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem('services_modal_columns');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) { }
    return [
      { id: 'code', label: 'Código', width: 100, visible: true },
      { id: 'name', label: 'Descrição do Serviço', width: 420, visible: true },
      { id: 'price', label: 'Valor Padrão (R$)', width: 160, visible: true },
    ];
  });

  const saveColumnsToStorage = (newCols: ColumnConfig[]) => {
    try {
      localStorage.setItem('services_modal_columns', JSON.stringify(newCols));
    } catch (err) { }
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedServiceId(null);
    } else {
      setSearchTerm('');
      setSelectedServiceId(null);
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'F2') {
        e.preventDefault();
        onClose();
        if (onOpenCreateService) onOpenCreateService();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMouseDownResize = (e: React.MouseEvent, columnId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const initialWidth = columns.find((c) => c.id === columnId)?.width || 100;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(80, initialWidth + deltaX);
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

  const filteredServices = services.filter((srv) => {
    if (!searchTerm.trim()) return true;
    return (
      matchesSearchTerm(srv.name || srv.description, searchTerm) ||
      matchesSearchTerm(srv.price, searchTerm)
    );
  });

  const selectedService = filteredServices.find((s) => s.id === selectedServiceId);

  const renderCellContent = (srv: ServiceItem, columnId: string) => {
    switch (columnId) {
      case 'code':
        let formattedCode = '0001';
        if (srv.code) {
          const num = parseInt(String(srv.code).replace(/\D/g, ''), 10);
          formattedCode = !isNaN(num) && num > 0 ? String(num).padStart(4, '0') : String(srv.code);
        } else if (srv.id) {
          const num = parseInt(String(srv.id).replace(/\D/g, ''), 10);
          formattedCode = !isNaN(num) && num > 0 ? String(num).padStart(4, '0') : String(srv.id);
        }
        return <span className="font-mono font-bold text-sky-700">{formattedCode}</span>;
      case 'name':
        return <span className="font-bold text-slate-900">{srv.name || srv.description}</span>;
      case 'price':
        return <span className="font-bold text-emerald-700">R$ {srv.price}</span>;
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
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl overflow-hidden font-sans relative">
        {/* Header do Modal */}
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-sky-700" />
            Central de Serviços Cadastrados
          </h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra Superior de Pesquisa */}
        <div className="p-4 bg-slate-100 border-b border-slate-300">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar serviço por descrição..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-600"
            />
          </div>
        </div>

        {/* Tabela de Serviços */}
        <div
          className="flex-1 overflow-x-auto overflow-y-auto p-4 bg-slate-50 select-none"
          onContextMenu={handleContextMenu}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('tr[data-row]') === null) {
              setSelectedServiceId(null);
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
                {filteredServices.map((srv) => {
                  const isSelected = srv.id === selectedServiceId;
                  return (
                    <tr
                      key={srv.id}
                      data-row="true"
                      onClick={() => setSelectedServiceId(srv.id)}
                      onDoubleClick={() => {
                        setSelectedServiceId(srv.id);
                        if (onSelectService) {
                          onSelectService(srv);
                          onClose();
                        } else if (onOpenEditService) {
                          onClose();
                          onOpenEditService(srv);
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
                            {renderCellContent(srv, col.id)}
                          </td>
                        ))}
                    </tr>
                  );
                })}

                {filteredServices.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.filter((c) => c.visible).length}
                      className="text-center py-12 text-slate-400"
                    >
                      Nenhum serviço cadastrado encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rodapé Fixo com Ações e Atalho Discreto F2 */}
        <div className="p-3 bg-slate-200 border-t border-slate-300 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 truncate min-w-0">
            <span className="font-semibold text-slate-700 truncate">
              {selectedService ? (
                <span>
                  Serviço Selecionado: <strong className="text-sky-800">{selectedService.name}</strong> (Valor: R$ {selectedService.price})
                </span>
              ) : (
                'Selecione um serviço na tabela acima'
              )}
            </span>
            <span className="text-[11px] text-slate-500 font-mono bg-slate-300/80 px-2 py-0.5 rounded border border-slate-300 shrink-0">
              [F2] Cadastrar Novo Serviço
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onSelectService && (
              <button
                onClick={() => {
                  if (selectedService) {
                    onSelectService(selectedService);
                    onClose();
                  }
                }}
                disabled={!selectedServiceId}
                className="h-8 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>Selecionar Serviço</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                if (onOpenCreateService) onOpenCreateService();
              }}
              disabled={!canManage}
              title={!canManage ? 'Você não tem permissão para cadastrar serviços.' : undefined}
              className="h-8 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Cadastrar Novo Serviço</span>
            </button>

            <button
              onClick={async () => {
                if (!selectedService) { await dlgAlert({ title: 'Selecione um Serviço', message: 'Por favor, selecione um serviço na tabela.', variant: 'info' }); return; }
                if (onOpenEditService) { onClose(); onOpenEditService(selectedService); }
              }}
              disabled={!selectedServiceId || !canManage}
              title={!canManage ? 'Você não tem permissão para editar serviços.' : undefined}
              className="h-8 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-4 h-4 shrink-0" />
              <span>Editar Serviço</span>
            </button>

            <button
              onClick={async () => {
                if (!selectedService) { await dlgAlert({ title: 'Selecione um Serviço', message: 'Por favor, selecione um serviço na tabela.', variant: 'info' }); return; }
                const ok = await dlgConfirm({ title: 'Excluir Serviço', message: `Deseja realmente EXCLUIR o serviço "${selectedService.name || selectedService.description}"?`, variant: 'danger', confirmText: 'Excluir' });
                if (ok) { if (onDeleteService) onDeleteService(selectedService.id); setSelectedServiceId(null); }
              }}
              disabled={!selectedServiceId || !canManage}
              title={!canManage ? 'Você não tem permissão para excluir serviços.' : undefined}
              className="h-8 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
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
