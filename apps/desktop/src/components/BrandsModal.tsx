import React, { useState } from 'react';
import { X, Search, PlusCircle, Tag, Check, Trash2, Edit3 } from 'lucide-react';
import { matchesSearchTerm } from '../utils/searchUtils';
import { useDialog } from './DialogContext';
import { modalStack } from '../utils/modalStack';
import { useCatalogStore } from '../stores/useCatalogStore';

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  visible: boolean;
  fixed?: boolean;
}

interface BrandsModalProps {
  isOpen: boolean;
  brands: any[];
  currentUser?: any;
  onClose: () => void;
  onSaveBrand?: (brandData: any) => void;
  onDeleteBrand?: (brandId: string) => void;
}

export const BrandsModal: React.FC<BrandsModalProps> = ({
  isOpen,
  brands = [],
  currentUser,
  onClose,
  onSaveBrand,
  onDeleteBrand,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExactSearch, setIsExactSearch] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [isCreateOrEditOpen, setIsCreateOrEditOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);
  const [brandFormName, setBrandFormName] = useState('');

  const canManage = Boolean(currentUser?.role === 'Admin' || currentUser?.permissions?.manageEquipments || !currentUser);
  const { alert: dlgAlert, confirm: dlgConfirm } = useDialog();

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem('brands_modal_columns_v1');
      if (saved) return JSON.parse(saved);
    } catch (err) { }
    return [
      { id: 'code', label: 'Código', width: 100, visible: true, fixed: true },
      { id: 'name', label: 'Nome da Marca', width: 450, visible: true, fixed: true },
    ];
  });

  const saveColumnsToStorage = (newCols: ColumnConfig[]) => {
    try {
      localStorage.setItem('brands_modal_columns_v1', JSON.stringify(newCols));
    } catch (err) { }
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setIsExactSearch(false);
      setSelectedBrandId(null);
      setIsCreateOrEditOpen(false);
      setEditingBrand(null);
      setBrandFormName('');
    }
  }, [isOpen]);

  // Pilha de modais ESC
  React.useEffect(() => {
    if (isOpen) {
      modalStack.register('BrandsModal', () => {
        if (isCreateOrEditOpen) {
          setIsCreateOrEditOpen(false);
        } else {
          onClose();
        }
      });
      return () => modalStack.unregister('BrandsModal');
    }
  }, [isOpen, isCreateOrEditOpen, onClose]);

  // Tecla F2
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        setEditingBrand(null);
        setBrandFormName('');
        setIsCreateOrEditOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

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

  const deduplicatedBrands = React.useMemo(() => {
    const seen = new Set<string>();
    const list: any[] = [];
    (brands || []).forEach((b) => {
      if (!b) return;
      const name = String(b.name || b.brand || '').trim();
      const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      if (!key) return;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ ...b, name });
      }
    });
    return list;
  }, [brands]);

  const filteredBrands = deduplicatedBrands
    .filter((b) => {
      if (!searchTerm.trim()) return true;
      if (isExactSearch) {
        return (
          matchesSearchTerm(b.code, searchTerm, true) ||
          matchesSearchTerm(String(b.id || ''), searchTerm, true) ||
          matchesSearchTerm(b.name, searchTerm, true)
        );
      }
      return (
        matchesSearchTerm(b.name, searchTerm) ||
        matchesSearchTerm(b.code, searchTerm)
      );
    })
    .sort((a, b) => {
      const nameA = String(a.name || '').trim();
      const nameB = String(b.name || '').trim();
      return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
    });

  const selectedBrand = filteredBrands.find((b) => b.id === selectedBrandId);

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = brandFormName.trim();
    if (!cleanName) return;

    const normNew = cleanName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const duplicate = deduplicatedBrands.find((b) => {
      if (editingBrand && b.id === editingBrand.id) return false;
      const normExisting = String(b.name || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      return normExisting === normNew;
    });

    if (duplicate) {
      alert(`Já existe uma marca cadastrada com o nome "${duplicate.name}" (Código: ${duplicate.code || 'N/D'}).`);
      return;
    }

    const brandPayload = editingBrand
      ? { ...editingBrand, name: cleanName }
      : {
          id: `brand_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          code: String(deduplicatedBrands.reduce((max: number, b: any) => {
            const n = parseInt(String(b.code || '').replace(/\D/g, ''), 10);
            return isNaN(n) ? max : Math.max(max, n);
          }, 0) + 1).padStart(4, '0'),
          name: cleanName,
          createdAt: new Date().toISOString(),
        };

    if (onSaveBrand) {
      onSaveBrand(brandPayload);
    } else {
      // Salva diretamente na store do catálogo e sincroniza
      const current = useCatalogStore.getState().brands || [];
      const exists = current.some((b: any) => b.id === brandPayload.id);
      const nextList = exists
        ? current.map((b: any) => (b.id === brandPayload.id ? brandPayload : b))
        : [...current, brandPayload];
      useCatalogStore.getState().setBrands(nextList);

      import('../services/firebase').then(({ db }) => {
        if (db) {
          import('firebase/firestore').then(({ doc, setDoc }) => {
            setDoc(doc(db, 'brands', brandPayload.id), brandPayload, { merge: true }).catch(() => {});
          });
        }
      }).catch(() => {});
    }

    setIsCreateOrEditOpen(false);
    setEditingBrand(null);
    setBrandFormName('');
  };

  const renderCellContent = (b: any, columnId: string) => {
    switch (columnId) {
      case 'code':
        return <span className="font-mono font-bold text-sky-700">{b.code || '0001'}</span>;
      case 'name':
        return <span className="font-bold text-slate-900">{b.name}</span>;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setContextMenu(null)}
    >
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans relative">
        {/* Header do Modal */}
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Tag className="w-5 h-5 text-sky-700" />
              Central de Marcas Cadastradas
            </h2>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-300/80 border border-slate-300 px-2.5 py-0.5 rounded-full">
              {searchTerm.trim() ? `${filteredBrands.length} de ${deduplicatedBrands.length}` : `${deduplicatedBrands.length}`} {deduplicatedBrands.length === 1 ? 'marca' : 'marcas'}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 p-1 rounded-lg cursor-pointer">
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
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsExactSearch(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setIsExactSearch(true);
                }
              }}
              placeholder="Buscar marca por nome ou código... (Enter para busca exata)"
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-600 shadow-2xs"
            />
          </div>
        </div>

        {/* Tabela de Marcas */}
        <div
          className="flex-1 overflow-x-auto overflow-y-auto bg-slate-50 select-none"
          onContextMenu={handleContextMenu}
        >
          <div style={{ width: '100%', minWidth: '550px' }}>
            <table className="w-full border-collapse text-xs text-left">
              <thead className="bg-slate-200 border-b border-slate-300 text-slate-700 font-bold sticky top-0 z-10 select-none shadow-2xs">
                <tr>
                  {columns
                    .filter((col) => col.visible)
                    .map((col) => (
                      <th
                        key={col.id}
                        draggable={!col.fixed}
                        onDragStart={(e) => handleDragStart(e, col.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                        style={{ width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px` }}
                        className={`p-2.5 border-r border-slate-300 relative group truncate text-xs ${
                          draggedColumnId === col.id ? 'opacity-40 bg-sky-200' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 overflow-hidden">
                          <span className="truncate">{col.label}</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResize(e, col.id)}
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-sky-500 transition-colors z-20"
                        />
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredBrands.map((b) => {
                  const isSelected = b.id === selectedBrandId;
                  return (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedBrandId(b.id)}
                      onDoubleClick={() => {
                        setEditingBrand(b);
                        setBrandFormName(b.name || '');
                        setIsCreateOrEditOpen(true);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-sky-100/90 text-sky-950 font-medium'
                          : 'hover:bg-slate-100 bg-white'
                      }`}
                    >
                      {columns
                        .filter((col) => col.visible)
                        .map((col) => (
                          <td
                            key={col.id}
                            style={{ width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px` }}
                            className="p-2 border-r border-slate-200 truncate"
                          >
                            {renderCellContent(b, col.id)}
                          </td>
                        ))}
                    </tr>
                  );
                })}

                {filteredBrands.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.filter((c) => c.visible).length}
                      className="text-center py-12 text-slate-400 font-semibold"
                    >
                      Nenhuma marca encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Menu de Contexto para Colunas */}
        {contextMenu && (
          <div
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            className="fixed bg-white border border-slate-300 rounded-xl shadow-2xl py-2 min-w-[200px] z-50 text-xs text-slate-800 font-sans"
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
                className={`w-full text-left px-3 py-1.5 hover:bg-sky-50 text-slate-800 flex items-center justify-between transition-colors ${
                  col.fixed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <span>{col.label}</span>
                {col.visible && <Check className="w-3.5 h-3.5 text-sky-600" />}
              </button>
            ))}
          </div>
        )}

        {/* Rodapé com Ações */}
        <div className="p-3 bg-slate-200 border-t border-slate-300 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 truncate min-w-0">
            <span className="font-semibold text-slate-700 truncate">
              {selectedBrand ? (
                <span>
                  Marca Selecionada: <strong className="text-sky-700">{selectedBrand.name}</strong>
                </span>
              ) : (
                'Selecione uma marca na tabela acima'
              )}
            </span>
            <span className="text-[11px] text-slate-500 font-mono bg-slate-300/80 px-2 py-0.5 rounded border border-slate-300 shrink-0">
              [F2] Cadastrar Nova Marca
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingBrand(null);
                setBrandFormName('');
                setIsCreateOrEditOpen(true);
              }}
              disabled={!canManage}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Cadastrar Nova Marca</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!selectedBrand) return alert('Por favor, selecione uma marca na tabela.');
                setEditingBrand(selectedBrand);
                setBrandFormName(selectedBrand.name || '');
                setIsCreateOrEditOpen(true);
              }}
              disabled={!selectedBrandId || !canManage}
              className="h-8 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-4 h-4 shrink-0" />
              <span>Editar Marca</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                if (!selectedBrand) return alert('Por favor, selecione uma marca na tabela.');
                const ok = await dlgConfirm({
                  title: 'Excluir Marca',
                  message: `Deseja realmente EXCLUIR a marca "${selectedBrand.name}"?`,
                  variant: 'danger',
                  confirmText: 'Excluir',
                });
                if (ok) {
                  if (onDeleteBrand) {
                    onDeleteBrand(selectedBrand.id);
                  } else {
                    const current = useCatalogStore.getState().brands || [];
                    const nextList = current.filter((b: any) => b.id !== selectedBrand.id);
                    useCatalogStore.getState().setBrands(nextList);

                    import('../services/firebase').then(({ db }) => {
                      if (db) {
                        import('firebase/firestore').then(({ doc, deleteDoc }) => {
                          deleteDoc(doc(db, 'brands', selectedBrand.id)).catch(() => {});
                        });
                      }
                    }).catch(() => {});
                  }
                  setSelectedBrandId(null);
                }
              }}
              disabled={!selectedBrandId || !canManage}
              className="h-8 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-8 bg-slate-700 hover:bg-slate-800 text-white px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Interno de Cadastro / Edição de Marca */}
      {isCreateOrEditOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans text-xs flex flex-col">
            <div className="px-4 py-3 bg-sky-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-sky-200" />
                <h3 className="text-xs font-bold">{editingBrand ? 'Editar Marca' : 'Cadastrar Nova Marca'}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOrEditOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-4 space-y-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs">
                  Nome da Marca <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={30}
                  value={brandFormName}
                  onChange={(e) => setBrandFormName(e.target.value.slice(0, 30))}
                  placeholder="Ex: Brastemp, Electrolux, Consul, Samsung..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-sky-600 text-xs shadow-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateOrEditOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  {editingBrand ? 'Salvar Alterações' : 'Salvar Marca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
