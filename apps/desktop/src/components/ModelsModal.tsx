import React, { useState } from 'react';
import { X, Search, PlusCircle, Wrench, Check, Trash2, Edit3, Tag } from 'lucide-react';
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

interface ModelsModalProps {
  isOpen: boolean;
  models: any[];
  brands: any[];
  currentUser?: any;
  onClose: () => void;
  onSaveModel?: (modelData: any) => void;
  onDeleteModel?: (modelId: string) => void;
}

export const ModelsModal: React.FC<ModelsModalProps> = ({
  isOpen,
  models = [],
  brands = [],
  currentUser,
  onClose,
  onSaveModel,
  onDeleteModel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [isExactSearch, setIsExactSearch] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isCreateOrEditOpen, setIsCreateOrEditOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<any | null>(null);
  const [modelFormName, setModelFormName] = useState('');
  const [modelFormBrandName, setModelFormBrandName] = useState('');

  const canManage = Boolean(currentUser?.role === 'Admin' || currentUser?.permissions?.manageEquipments || !currentUser);
  const { alert: dlgAlert, confirm: dlgConfirm } = useDialog();

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem('models_modal_columns_v2');
      if (saved) return JSON.parse(saved);
    } catch (err) { }
    return [
      { id: 'code', label: 'Código', width: 90, visible: true, fixed: true },
      { id: 'name', label: 'Modelo', width: 280, visible: true, fixed: true },
      { id: 'brandName', label: 'Marca', width: 180, visible: true, fixed: true },
    ];
  });

  const saveColumnsToStorage = (newCols: ColumnConfig[]) => {
    try {
      localStorage.setItem('models_modal_columns_v2', JSON.stringify(newCols));
    } catch (err) { }
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setBrandFilter('');
      setIsExactSearch(false);
      setSelectedModelId(null);
      setIsCreateOrEditOpen(false);
      setEditingModel(null);
      setModelFormName('');
      setModelFormBrandName('');
    }
  }, [isOpen]);

  // Pilha de modais ESC
  React.useEffect(() => {
    if (isOpen) {
      modalStack.register('ModelsModal', () => {
        if (isCreateOrEditOpen) {
          setIsCreateOrEditOpen(false);
        } else {
          onClose();
        }
      });
      return () => modalStack.unregister('ModelsModal');
    }
  }, [isOpen, isCreateOrEditOpen, onClose]);

  // Tecla F2
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        setEditingModel(null);
        setModelFormName('');
        setModelFormBrandName(brandFilter || (brands[0]?.name || ''));
        setIsCreateOrEditOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, brandFilter, brands]);

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

  const deduplicatedModels = React.useMemo(() => {
    const seen = new Set<string>();
    const list: any[] = [];
    (models || []).forEach((m) => {
      if (!m) return;
      const name = String(m.name || m.model || '').trim();
      const brand = String(m.brandName || m.brand || '').trim();
      const key = `${brand}|${name}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      if (!key || !name) return;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ ...m, name, brandName: brand });
      }
    });
    return list;
  }, [models]);

  const uniqueBrandOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    (brands || []).forEach((b) => {
      const name = String(b.name || b.brand || '').trim();
      if (name) map.set(name.toUpperCase(), name);
    });
    deduplicatedModels.forEach((m) => {
      const bName = String(m.brandName || '').trim();
      if (bName && !map.has(bName.toUpperCase())) {
        map.set(bName.toUpperCase(), bName);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [brands, deduplicatedModels]);

  const filteredModels = deduplicatedModels
    .filter((m) => {
      if (brandFilter) {
        const mBrand = String(m.brandName || '').trim().toUpperCase();
        if (mBrand !== brandFilter.toUpperCase()) return false;
      }
      if (!searchTerm.trim()) return true;
      if (isExactSearch) {
        return (
          matchesSearchTerm(m.code, searchTerm, true) ||
          matchesSearchTerm(String(m.id || ''), searchTerm, true) ||
          matchesSearchTerm(m.name, searchTerm, true) ||
          matchesSearchTerm(m.brandName, searchTerm, true)
        );
      }
      return (
        matchesSearchTerm(m.name, searchTerm) ||
        matchesSearchTerm(m.brandName, searchTerm) ||
        matchesSearchTerm(m.code, searchTerm)
      );
    })
    .sort((a, b) => {
      const brandComp = String(a.brandName || '').localeCompare(String(b.brandName || ''), 'pt-BR', { sensitivity: 'base' });
      if (brandComp !== 0) return brandComp;
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
    });

  const selectedModel = filteredModels.find((m) => m.id === selectedModelId);

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = modelFormName.trim();
    const cleanBrand = modelFormBrandName.trim();
    if (!cleanName || !cleanBrand) {
      alert('Por favor, informe a Marca e o Modelo.');
      return;
    }

    const normNewModel = cleanName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const normNewBrand = cleanBrand.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

    const duplicate = deduplicatedModels.find((m) => {
      if (editingModel && m.id === editingModel.id) return false;
      const normExModel = String(m.name || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      const normExBrand = String(m.brandName || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      return normExModel === normNewModel && normExBrand === normNewBrand;
    });

    if (duplicate) {
      alert(`Já existe o modelo "${duplicate.name}" cadastrado para a marca "${duplicate.brandName}" (Código: ${duplicate.code || 'N/D'}).`);
      return;
    }

    const modelPayload = editingModel
      ? {
          ...editingModel,
          name: cleanName,
          brandName: cleanBrand,
        }
      : {
          id: `model_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          code: String(deduplicatedModels.reduce((max: number, m: any) => {
            const n = parseInt(String(m.code || '').replace(/\D/g, ''), 10);
            return isNaN(n) ? max : Math.max(max, n);
          }, 0) + 1).padStart(4, '0'),
          name: cleanName,
          brandName: cleanBrand,
          createdAt: new Date().toISOString(),
        };

    if (onSaveModel) {
      onSaveModel(modelPayload);
    } else {
      const current = useCatalogStore.getState().models || [];
      const exists = current.some((m: any) => m.id === modelPayload.id);
      const nextList = exists
        ? current.map((m: any) => (m.id === modelPayload.id ? modelPayload : m))
        : [...current, modelPayload];
      useCatalogStore.getState().setModels(nextList);

      import('../services/firebase').then(({ db }) => {
        if (db) {
          import('firebase/firestore').then(({ doc, setDoc }) => {
            setDoc(doc(db, 'models', modelPayload.id), modelPayload, { merge: true }).catch(() => {});
          });
        }
      }).catch(() => {});
    }

    setIsCreateOrEditOpen(false);
    setEditingModel(null);
    setModelFormName('');
    setModelFormBrandName('');
  };

  const renderCellContent = (m: any, columnId: string) => {
    switch (columnId) {
      case 'code':
        return <span className="font-mono font-bold text-sky-700">{m.code || '0001'}</span>;
      case 'brandName':
        return (
          <span className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
            {m.brandName || 'Geral'}
          </span>
        );
      case 'name':
        return <span className="font-bold text-slate-900">{m.name}</span>;
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
              <Wrench className="w-5 h-5 text-sky-700" />
              Central de Modelos Cadastrados
            </h2>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-300/80 border border-slate-300 px-2.5 py-0.5 rounded-full">
              {searchTerm.trim() || brandFilter ? `${filteredModels.length} de ${deduplicatedModels.length}` : `${deduplicatedModels.length}`} {deduplicatedModels.length === 1 ? 'modelo' : 'modelos'}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra Superior com Filtro de Marca e Busca */}
        <div className="p-3 bg-slate-100 border-b border-slate-300 flex flex-col md:flex-row gap-2.5 items-center">
          <div className="w-full md:w-56 shrink-0 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-sky-600 shadow-2xs cursor-pointer"
            >
              <option value="">TODAS AS MARCAS</option>
              {uniqueBrandOptions.map((brandName) => (
                <option key={brandName} value={brandName}>
                  {brandName}
                </option>
              ))}
            </select>
          </div>

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
              placeholder="Buscar modelo ou código... (Enter para busca exata)"
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-600 shadow-2xs"
            />
          </div>
        </div>

        {/* Tabela de Modelos */}
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
                {filteredModels.map((m) => {
                  const isSelected = m.id === selectedModelId;
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedModelId(m.id)}
                      onDoubleClick={() => {
                        setEditingModel(m);
                        setModelFormName(m.name || '');
                        setModelFormBrandName(m.brandName || '');
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
                            {renderCellContent(m, col.id)}
                          </td>
                        ))}
                    </tr>
                  );
                })}

                {filteredModels.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.filter((c) => c.visible).length}
                      className="text-center py-12 text-slate-400 font-semibold"
                    >
                      Nenhum modelo encontrado.
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
              {selectedModel ? (
                <span>
                  Modelo Selecionado: <strong className="text-sky-700">{selectedModel.name}</strong> ({selectedModel.brandName})
                </span>
              ) : (
                'Selecione um modelo na tabela acima'
              )}
            </span>
            <span className="text-[11px] text-slate-500 font-mono bg-slate-300/80 px-2 py-0.5 rounded border border-slate-300 shrink-0">
              [F2] Cadastrar Novo Modelo
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingModel(null);
                setModelFormName('');
                setModelFormBrandName(brandFilter || uniqueBrandOptions[0] || '');
                setIsCreateOrEditOpen(true);
              }}
              disabled={!canManage}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Cadastrar Novo Modelo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!selectedModel) return alert('Por favor, selecione um modelo na tabela.');
                setEditingModel(selectedModel);
                setModelFormName(selectedModel.name || '');
                setModelFormBrandName(selectedModel.brandName || '');
                setIsCreateOrEditOpen(true);
              }}
              disabled={!selectedModelId || !canManage}
              className="h-8 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-4 h-4 shrink-0" />
              <span>Editar Modelo</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                if (!selectedModel) return alert('Por favor, selecione um modelo na tabela.');
                const ok = await dlgConfirm({
                  title: 'Excluir Modelo',
                  message: `Deseja realmente EXCLUIR o modelo "${selectedModel.name}" da marca "${selectedModel.brandName}"?`,
                  variant: 'danger',
                  confirmText: 'Excluir',
                });
                if (ok) {
                  if (onDeleteModel) {
                    onDeleteModel(selectedModel.id);
                  } else {
                    const current = useCatalogStore.getState().models || [];
                    const nextList = current.filter((m: any) => m.id !== selectedModel.id);
                    useCatalogStore.getState().setModels(nextList);

                    import('../services/firebase').then(({ db }) => {
                      if (db) {
                        import('firebase/firestore').then(({ doc, deleteDoc }) => {
                          deleteDoc(doc(db, 'models', selectedModel.id)).catch(() => {});
                        });
                      }
                    }).catch(() => {});
                  }
                  setSelectedModelId(null);
                }
              }}
              disabled={!selectedModelId || !canManage}
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

      {/* Modal Interno de Cadastro / Edição de Modelo */}
      {isCreateOrEditOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans text-xs flex flex-col">
            <div className="px-4 py-3 bg-sky-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-sky-200" />
                <h3 className="text-xs font-bold">{editingModel ? 'Editar Modelo' : 'Cadastrar Novo Modelo'}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOrEditOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-4 space-y-3.5">
              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs">
                  Marca Correspondente <span className="text-red-500">*</span>
                </label>
                {uniqueBrandOptions.length > 0 ? (
                  <select
                    required
                    value={modelFormBrandName}
                    onChange={(e) => setModelFormBrandName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-sky-600 text-xs shadow-xs uppercase cursor-pointer"
                  >
                    <option value="">Selecione uma Marca...</option>
                    {uniqueBrandOptions.map((b) => (
                      <option key={b} value={b} className="font-bold">
                        {b}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      required
                      value={modelFormBrandName}
                      onChange={(e) => setModelFormBrandName(e.target.value)}
                      placeholder="Digite a marca..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-sky-600 text-xs shadow-xs uppercase"
                    />
                    <p className="text-[10px] text-amber-600 font-medium">
                      ⚠️ Nenhuma marca cadastrada ainda. Digite o nome para criar automaticamente.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs">
                  Nome / Código do Modelo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={30}
                  value={modelFormName}
                  onChange={(e) => setModelFormName(e.target.value.slice(0, 30))}
                  placeholder="Ex: BRM39A, BWH15AB, DF52..."
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
                  {editingModel ? 'Salvar Alterações' : 'Salvar Modelo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
