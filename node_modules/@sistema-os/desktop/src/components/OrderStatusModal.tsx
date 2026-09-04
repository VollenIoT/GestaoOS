import React, { useState } from 'react';
import {
  X,
  Search,
  PlusCircle,
  ShieldCheck,
  Check,
  LogOut,
  Edit3,
  Trash2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from 'lucide-react';
import { useDialog } from './DialogContext';
import { modalStack } from '../utils/modalStack';

export interface OSStatusItem {
  id: string;
  code: string;
  name: string;
  color: string;
  description?: string;
  isSystemDefault?: boolean;
  deductStock?: boolean;
  returnStock?: boolean;
  orderIndex?: number;
}

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  visible: boolean;
  fixed?: boolean;
}

interface OrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
}

export const ALLOWED_COLORS = [
  { name: 'Amarelo (Aberta)', value: '#eab308' },
  { name: 'Roxo / Violeta (Orçamento Aprovado)', value: '#8b5cf6' },
  { name: 'Azul Cobalto (Em Atendimento / Visita Técnica)', value: '#0284c7' },
  { name: 'Verde Esmeralda (Aprovado)', value: '#059669' },
  { name: 'Laranja (Aguardando Peça)', value: '#f97316' },
  { name: 'Verde Claro / Menta (Aparelho Liberado e Pronto)', value: '#10b981' },
  { name: 'Verde Escuro / Floresta (Finalizada / Concluída)', value: '#047857' },
  { name: 'Vermelho (Cancelada)', value: '#dc2626' },
];

const DEFAULT_STATUSES: OSStatusItem[] = [
  { id: '1', code: '0001', name: 'ABERTA', color: '#eab308', description: 'Ordem de serviço aberta aguardando avaliação', isSystemDefault: true, deductStock: false, returnStock: false },
  { id: '7', code: '0002', name: 'ORCAMENTO_APROVADO', color: '#8b5cf6', description: 'Orçamento aprovado pelo cliente com reserva de peças', isSystemDefault: true, deductStock: true, returnStock: false },
  { id: '2', code: '0003', name: 'EM_ATENDIMENTO', color: '#0284c7', description: 'Técnico trabalhando no equipamento / Visita Técnica', isSystemDefault: true, deductStock: false, returnStock: false },
  { id: '8', code: '0004', name: 'APROVADO', color: '#059669', description: 'Serviço e orçamento aprovados pelo cliente', isSystemDefault: true, deductStock: true, returnStock: false },
  { id: '3', code: '0005', name: 'AGUARDANDO_PECA', color: '#f97316', description: 'Aguardando chegada de peças para conclusão', isSystemDefault: true, deductStock: false, returnStock: false },
  { id: '4', code: '0006', name: 'APARELHO_LIBERADO', color: '#10b981', description: 'Aparelho pronto e liberado para retirada pelo cliente', isSystemDefault: true, deductStock: false, returnStock: false },
  { id: '5', code: '0007', name: 'FINALIZADA', color: '#047857', description: 'Serviço concluído e entregue ao cliente', isSystemDefault: true, deductStock: false, returnStock: false },
  { id: '6', code: '0008', name: 'CANCELADA', color: '#dc2626', description: 'Ordem de serviço cancelada', isSystemDefault: true, deductStock: false, returnStock: true },
];

export const OrderStatusModal: React.FC<OrderStatusModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<OSStatusItem | null>(null);

  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<OSStatusItem[]>(() => {
    try {
      const saved = localStorage.getItem('custom_os_statuses_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a: any, b: any) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
        }
      }
    } catch (err) {}
    return DEFAULT_STATUSES.map((s, idx) => ({ ...s, orderIndex: idx }));
  });

  // Garante que os status estejam sempre sincronizados com o Firestore ao abrir o modal
  React.useEffect(() => {
    import('../services/firebase').then(({ db }) => {
      import('firebase/firestore').then(({ collection, getDocs, setDoc, doc }) => {
        getDocs(collection(db, 'os_statuses')).then((snap) => {
          if (snap.empty) {
            // Se o Firestore estiver vazio, sobe todos os status cadastrados com seus índices de ordem
            for (let i = 0; i < statuses.length; i++) {
              const st = { ...statuses[i], orderIndex: i };
              setDoc(doc(db, 'os_statuses', st.id), st, { merge: true }).catch(() => null);
            }
          } else {
            const list = snap.docs
              .map((d) => ({ id: d.id, ...d.data() } as OSStatusItem & { orderIndex?: number }))
              .sort((a: any, b: any) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
            setStatuses(list);
            localStorage.setItem('custom_os_statuses_v3', JSON.stringify(list));
          }
        });
      });
    });
  }, [isOpen]);

  const saveStatusesToStorage = async (newStatuses: OSStatusItem[]) => {
    try {
      const ordered = newStatuses.map((st, idx) => ({ ...st, orderIndex: idx }));
      localStorage.setItem('custom_os_statuses_v3', JSON.stringify(ordered));
      // Sincroniza com o Firestore para o aplicativo mobile e outras telas
      const { setDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');
      for (const st of ordered) {
        await setDoc(doc(db, 'os_statuses', st.id), st, { merge: true }).catch(() => null);
      }
    } catch (err) {}
  };

  const handleMoveRow = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= statuses.length) return;

    const updated = [...statuses];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, movedItem);

    setStatuses(updated);
    saveStatusesToStorage(updated);
  };

  const handleRowDrop = (targetStatusId: string) => {
    if (!draggedRowId || draggedRowId === targetStatusId) {
      setDraggedRowId(null);
      setDragOverTargetId(null);
      return;
    }

    const sourceIdx = statuses.findIndex((s) => s.id === draggedRowId);
    const targetIdx = statuses.findIndex((s) => s.id === targetStatusId);
    if (sourceIdx < 0 || targetIdx < 0) {
      setDraggedRowId(null);
      setDragOverTargetId(null);
      return;
    }

    const updated = [...statuses];
    const [removed] = updated.splice(sourceIdx, 1);
    updated.splice(targetIdx, 0, removed);

    setStatuses(updated);
    saveStatusesToStorage(updated);
    setDraggedRowId(null);
    setDragOverTargetId(null);
  };

  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem('order_status_modal_columns');
      if (saved) return JSON.parse(saved);
    } catch (err) {}
    return [
      { id: 'dragHandle', label: '☰', width: 42, visible: true, fixed: true },
      { id: 'code', label: 'Código', width: 85, visible: true },
      { id: 'color', label: 'Cor', width: 65, visible: true },
      { id: 'name', label: 'Nome do Status', width: 220, visible: true },
      { id: 'deductStock', label: 'Baixa Estoque', width: 105, visible: true },
      { id: 'returnStock', label: 'Retorna Peças', width: 105, visible: true },
      { id: 'description', label: 'Descrição / Finalidade', width: 330, visible: true },
    ];
  });

  const saveColumnsToStorage = (newCols: ColumnConfig[]) => {
    try {
      localStorage.setItem('order_status_modal_columns', JSON.stringify(newCols));
    } catch (err) {}
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedStatusId(null);
    } else {
      setSearchTerm('');
      setSelectedStatusId(null);
    }
  }, [isOpen]);

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

  // Form local state
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#0284c7');
  const [formDeductStock, setFormDeductStock] = useState(false);
  const [formReturnStock, setFormReturnStock] = useState(false);
  const [formDescription, setFormDescription] = useState('');

  const { alert: dlgAlert, confirm: dlgConfirm } = useDialog();

  // Registro na pilha de modais para ESC fechar apenas o último modal aberto
  React.useEffect(() => {
    if (isOpen) {
      const handleClose = () => {
        if (isFormOpen) {
          setIsFormOpen(false);
          setEditingStatus(null);
        } else {
          onClose();
        }
      };
      modalStack.register('OrderStatusModal', handleClose);
      return () => modalStack.unregister('OrderStatusModal');
    }
  }, [isOpen, isFormOpen, onClose]);

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

  const filteredStatuses = statuses.filter((st) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (st.name || '').toLowerCase().includes(term) ||
      (st.description || '').toLowerCase().includes(term) ||
      (st.code || '').toLowerCase().includes(term)
    );
  });

  const selectedStatus = statuses.find((s) => s.id === selectedStatusId);

  const handleOpenCreateForm = () => {
    setEditingStatus(null);
    setFormName('');
    setFormColor('#0284c7');
    setFormDeductStock(false);
    setFormReturnStock(false);
    setFormDescription('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (st: OSStatusItem) => {
    if (st.isSystemDefault && !isAdmin) {
      return alert('Apenas Administradores podem editar status padrão do sistema.');
    }
    setEditingStatus(st);
    setFormName(st.name);
    setFormColor(st.color);
    setFormDeductStock(Boolean(st.deductStock));
    setFormReturnStock(Boolean(st.returnStock));
    setFormDescription(st.description || '');
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return alert('Por favor, informe o nome do Status.');

    const formattedName = formName.trim();

    if (editingStatus) {
      if (editingStatus.isSystemDefault && !isAdmin) {
        return alert('Apenas Administradores podem salvar alterações em status padrão do sistema.');
      }
      const updated = statuses.map((s) =>
        s.id === editingStatus.id
          ? {
              ...s,
              name: formattedName,
              color: formColor,
              deductStock: formDeductStock,
              returnStock: formReturnStock,
              description: formDescription,
            }
          : s
      );
      setStatuses(updated);
      saveStatusesToStorage(updated);
    } else {
      const maxNum = statuses.reduce((max, s) => {
        const num = parseInt(String(s.code || '').replace(/\D/g, ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      const nextCode = String(maxNum + 1).padStart(4, '0');

      const newStatus: OSStatusItem = {
        id: String(Date.now()),
        code: nextCode,
        name: formattedName,
        color: formColor,
        deductStock: formDeductStock,
        returnStock: formReturnStock,
        description: formDescription,
        isSystemDefault: false,
      };
      const updated = [...statuses, newStatus];
      setStatuses(updated);
      saveStatusesToStorage(updated);
    }

    setIsFormOpen(false);
  };

  const handleDeleteStatus = async () => {
    if (!selectedStatus) return alert('Por favor, selecione um status na tabela.');
    if (selectedStatus.isSystemDefault && !isAdmin) {
      return alert('Apenas Administradores podem excluir status padrão do sistema.');
    }

    const ok = await dlgConfirm({
      title: 'Excluir Status',
      message: `Deseja realmente EXCLUIR o status "${selectedStatus.name}"?`,
      variant: 'danger',
      confirmText: 'Excluir',
    });

    if (ok) {
      const idToDelete = selectedStatus.id;
      const updated = statuses.filter((s) => s.id !== idToDelete);
      setStatuses(updated);
      setSelectedStatusId(null);
      await saveStatusesToStorage(updated);
      try {
        const { doc, deleteDoc } = await import('firebase/firestore');
        const { db } = await import('../services/firebase');
        await deleteDoc(doc(db, 'os_statuses', idToDelete));
      } catch (err) {}
    }
  };

  const handleResetDefaults = async () => {
    if (!isAdmin) {
      return alert('Apenas Administradores podem restaurar os status padrão do sistema.');
    }
    const ok = await dlgConfirm({
      title: 'Restaurar Padrões',
      message: 'Deseja restaurar os status padrão do sistema?',
      variant: 'warning',
      confirmText: 'Restaurar',
    });
    if (ok) {
      setStatuses(DEFAULT_STATUSES);
      setSelectedStatusId(null);
      await saveStatusesToStorage(DEFAULT_STATUSES);
    }
  };

  const renderCellContent = (st: OSStatusItem, columnId: string) => {
    switch (columnId) {
      case 'dragHandle':
        return (
          <div className="flex items-center justify-center text-slate-400 hover:text-amber-600 transition-colors p-0.5 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        );
      case 'deductStock':
        return (
          <div className="flex items-center justify-center">
            {st.deductStock ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                <Check className="w-3 h-3" /> Sim
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                Não
              </span>
            )}
          </div>
        );
      case 'returnStock':
        return (
          <div className="flex items-center justify-center">
            {st.returnStock ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
                <RefreshCw className="w-3 h-3" /> Sim
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                Não
              </span>
            )}
          </div>
        );
      case 'code':
        return (
          <span className="font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            {st.code || '0001'}
          </span>
        );
      case 'color':
        return (
          <div className="flex items-center justify-center">
            <span
              className="w-4 h-4 rounded-full border border-slate-300 shadow-xs inline-block"
              style={{ backgroundColor: st.color }}
            />
          </div>
        );
      case 'name':
        return (
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 font-mono">{st.name}</span>
            {st.isSystemDefault && (
              <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-sans font-normal">
                Padrão
              </span>
            )}
          </div>
        );
      case 'description':
        return <span className="truncate">{st.description || '-'}</span>;
      default:
        return null;
    }
  };

  const totalPixels = columns
    .filter((c) => c.visible)
    .reduce((acc, col) => acc + col.width, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-5xl h-[88vh] shadow-2xl flex flex-col font-sans overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-700" />
            <h2 className="text-sm font-bold text-slate-800">
              Central de Status de Ordens de Serviço Cadastrados
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Pesquisa e Ação */}
        <div className="p-4 bg-slate-100 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar status por nome ou descrição..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Restaura os status padrão do sistema"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Restaurar Padrão
            </button>
            <button
              onClick={handleOpenCreateForm}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Cadastrar Novo Status
            </button>
          </div>
        </div>

        {/* Tabela de Status */}
        <div
          className="flex-1 overflow-x-auto overflow-y-auto p-4 bg-slate-50 select-none"
          onContextMenu={handleContextMenu}
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
                {filteredStatuses.map((st) => {
                  const isSelected = st.id === selectedStatusId;
                  const isBeingDragged = draggedRowId === st.id;
                  const isDragOver = dragOverTargetId === st.id && !isBeingDragged;

                  return (
                    <tr
                      key={st.id}
                      draggable="true"
                      onDragStart={(e) => {
                        setDraggedRowId(st.id);
                        e.dataTransfer.setData('text/plain', st.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        if (draggedRowId && draggedRowId !== st.id) {
                          setDragOverTargetId(st.id);
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const fromId = e.dataTransfer.getData('text/plain') || draggedRowId;
                        if (fromId && fromId !== st.id) {
                          const sourceIdx = statuses.findIndex((s) => s.id === fromId);
                          const targetIdx = statuses.findIndex((s) => s.id === st.id);
                          if (sourceIdx >= 0 && targetIdx >= 0) {
                            const updated = [...statuses];
                            const [removed] = updated.splice(sourceIdx, 1);
                            updated.splice(targetIdx, 0, removed);
                            setStatuses(updated);
                            saveStatusesToStorage(updated);
                          }
                        }
                        setDraggedRowId(null);
                        setDragOverTargetId(null);
                      }}
                      onDragEnd={() => {
                        setDraggedRowId(null);
                        setDragOverTargetId(null);
                      }}
                      onClick={() => setSelectedStatusId(st.id)}
                      onDoubleClick={() => {
                        setSelectedStatusId(st.id);
                        handleOpenEditForm(st);
                      }}
                      className={`cursor-grab active:cursor-grabbing transition-all select-none ${
                        isBeingDragged ? 'opacity-30 bg-sky-100 border-2 border-dashed border-sky-500' : ''
                      } ${
                        isDragOver ? 'bg-amber-100/90 border-t-4 border-t-amber-600' : ''
                      } ${
                        isSelected && !isBeingDragged && !isDragOver
                          ? 'bg-amber-100 font-semibold text-amber-950 border-l-4 border-amber-600'
                          : !isBeingDragged && !isDragOver
                          ? 'hover:bg-slate-100 bg-white'
                          : ''
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
                            {renderCellContent(st, col.id)}
                          </td>
                        ))}
                    </tr>
                  );
                })}

                {filteredStatuses.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.filter((c) => c.visible).length}
                      className="text-center py-12 text-slate-400"
                    >
                      Nenhum status cadastrado ou encontrado para a pesquisa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Context Menu de Colunas */}
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

        {/* Rodapé com Botões de Ação Completa */}
        <div className="p-4 bg-slate-200 border-t border-slate-300 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs font-semibold text-slate-700">
            {selectedStatus ? (
              <span>
                Status Selecionado: <strong className="text-amber-800 font-mono">{selectedStatus.name}</strong>
              </span>
            ) : (
              'Selecione um status na tabela acima'
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!selectedStatus) return alert('Por favor, selecione um status na tabela.');
                handleOpenEditForm(selectedStatus);
              }}
              disabled={!selectedStatusId}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              Editar Status
            </button>

            <button
              onClick={handleDeleteStatus}
              disabled={!selectedStatusId || selectedStatus?.isSystemDefault}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>

            <button
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* MODAL SECUNDÁRIO: FORMULÁRIO DE CADASTRO / EDIÇÃO DE STATUS */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans text-xs">
            <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                {editingStatus ? 'Editar Status de OS' : 'Cadastrar Novo Status de OS'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-600 hover:text-slate-900 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 bg-slate-50">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Nome do Status <span className="text-red-500 font-extrabold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Em Orçamento, Aguardando Aprovação..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Cor de Identificação</label>
                <div className="flex flex-wrap items-center gap-2.5 p-2 bg-white border border-slate-200 rounded-xl">
                  {ALLOWED_COLORS.map((c) => {
                    const isSelected = formColor === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setFormColor(c.value)}
                        title={c.name}
                        className={`w-7 h-7 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? 'ring-2 ring-offset-2 ring-slate-800 scale-110 shadow-sm'
                            : 'hover:scale-105 opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.value }}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descrição / Finalidade</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Utilizado para equipamentos em bancada..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-sky-600"
                />
              </div>

              {/* OPÇÃO DE BAIXA AUTOMÁTICA DE ESTOQUE */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formDeductStock}
                    onChange={(e) => {
                      setFormDeductStock(e.target.checked);
                      if (e.target.checked) setFormReturnStock(false);
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 text-xs block">
                      Dar baixa nas peças no estoque
                    </span>
                    <span className="text-[11px] text-slate-600 leading-tight block mt-0.5">
                      Quando este status for selecionado na Ordem de Serviço, o sistema efetuará a baixa automática das peças do estoque vinculadas à OS (sem duplicidades).
                    </span>
                  </div>
                </label>
              </div>

              {/* OPÇÃO DE DEVOLUÇÃO/ESTORNO DE PEÇAS AO ESTOQUE */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formReturnStock}
                    onChange={(e) => {
                      setFormReturnStock(e.target.checked);
                      if (e.target.checked) setFormDeductStock(false);
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 text-xs block">
                      Retornar / Devolver peças ao estoque (se estiverem separadas)
                    </span>
                    <span className="text-[11px] text-slate-600 leading-tight block mt-0.5">
                      Quando este status for selecionado (ex: Cancelada / Desistência), o sistema devolverá automaticamente ao estoque apenas as peças que já haviam sido separadas/baixadas anteriormente. Se a peça não tiver sido separada, o estoque não sofrerá alteração.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  {editingStatus ? 'Salvar Alterações' : 'Cadastrar Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
