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
} from 'lucide-react';

export interface OSStatusItem {
  id: string;
  code: string;
  name: string;
  color: string;
  description?: string;
  isSystemDefault?: boolean;
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
}

export const ALLOWED_COLORS = [
  { name: 'Azul (Aberta)', value: '#0284c7' },
  { name: 'Laranja (Em Atendimento / Aguardando Peça)', value: '#f97316' },
  { name: 'Creme / Amarelo Claro (Aparelho Liberado)', value: '#fef08a' },
  { name: 'Verde (Finalizada)', value: '#16a34a' },
  { name: 'Vermelho (Cancelada)', value: '#dc2626' },
];

const DEFAULT_STATUSES: OSStatusItem[] = [
  { id: '1', code: '0001', name: 'ABERTA', color: '#0284c7', description: 'Ordem de serviço aberta aguardando avaliação', isSystemDefault: true },
  { id: '2', code: '0002', name: 'EM_ATENDIMENTO', color: '#f97316', description: 'Técnico trabalhando no equipamento', isSystemDefault: true },
  { id: '3', code: '0003', name: 'AGUARDANDO_PECA', color: '#f97316', description: 'Aguardando chegada de peças para conclusão', isSystemDefault: true },
  { id: '4', code: '0004', name: 'APARELHO_LIBERADO', color: '#fef08a', description: 'Aparelho pronto e liberado para retirada pelo cliente', isSystemDefault: true },
  { id: '5', code: '0005', name: 'FINALIZADA', color: '#16a34a', description: 'Serviço concluído e entregue ao cliente', isSystemDefault: true },
  { id: '6', code: '0006', name: 'CANCELADA', color: '#dc2626', description: 'Ordem de serviço cancelada', isSystemDefault: true },
];

export const OrderStatusModal: React.FC<OrderStatusModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<OSStatusItem | null>(null);

  const [statuses, setStatuses] = useState<OSStatusItem[]>(() => {
    try {
      const saved = localStorage.getItem('custom_os_statuses_v3');
      if (saved) return JSON.parse(saved);
    } catch (err) {}
    return DEFAULT_STATUSES;
  });

  const saveStatusesToStorage = (newStatuses: OSStatusItem[]) => {
    try {
      localStorage.setItem('custom_os_statuses_v3', JSON.stringify(newStatuses));
    } catch (err) {}
  };

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem('order_status_modal_columns');
      if (saved) return JSON.parse(saved);
    } catch (err) {}
    return [
      { id: 'code', label: 'Código', width: 95, visible: true, fixed: true },
      { id: 'color', label: 'Cor', width: 80, visible: true, fixed: true },
      { id: 'name', label: 'Nome do Status', width: 220, visible: true, fixed: true },
      { id: 'description', label: 'Descrição / Finalidade', width: 350, visible: true },
    ];
  });

  const saveColumnsToStorage = (newCols: ColumnConfig[]) => {
    try {
      localStorage.setItem('order_status_modal_columns', JSON.stringify(newCols));
    } catch (err) {}
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  // Form local state
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#0284c7');
  const [formDescription, setFormDescription] = useState('');

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
    setFormDescription('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (st: OSStatusItem) => {
    setEditingStatus(st);
    setFormName(st.name);
    setFormColor(st.color);
    setFormDescription(st.description || '');
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return alert('Por favor, informe o nome do Status.');

    const formattedName = formName.trim().toUpperCase().replace(/\s+/g, '_');

    if (editingStatus) {
      const updated = statuses.map((s) =>
        s.id === editingStatus.id
          ? { ...s, name: formattedName, color: formColor, description: formDescription }
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
        description: formDescription,
        isSystemDefault: false,
      };
      const updated = [...statuses, newStatus];
      setStatuses(updated);
      saveStatusesToStorage(updated);
    }

    setIsFormOpen(false);
  };

  const handleDeleteStatus = () => {
    if (!selectedStatus) return alert('Por favor, selecione um status na tabela.');
    if (selectedStatus.isSystemDefault) return alert('Status padrão do sistema não pode ser excluído.');

    if (confirm(`Deseja realmente EXCLUIR o status "${selectedStatus.name}"?`)) {
      const updated = statuses.filter((s) => s.id !== selectedStatus.id);
      setStatuses(updated);
      saveStatusesToStorage(updated);
      setSelectedStatusId(null);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Deseja restaurar os status padrão do sistema?')) {
      setStatuses(DEFAULT_STATUSES);
      saveStatusesToStorage(DEFAULT_STATUSES);
      setSelectedStatusId(null);
    }
  };

  const renderCellContent = (st: OSStatusItem, columnId: string) => {
    switch (columnId) {
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
                        draggable={!col.fixed}
                        onDragStart={(e) => handleDragStart(e, col.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                        style={{ width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px` }}
                        className={`p-1.5 border-b border-r border-slate-300 relative group transition-colors ${
                          col.fixed ? 'cursor-default' : 'cursor-grab active:cursor-grabbing hover:bg-slate-300/80'
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
                {filteredStatuses.map((st) => {
                  const isSelected = st.id === selectedStatusId;
                  return (
                    <tr
                      key={st.id}
                      onClick={() => setSelectedStatusId(st.id)}
                      onDoubleClick={() => {
                        setSelectedStatusId(st.id);
                        handleOpenEditForm(st);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-100/90 font-semibold text-amber-950 border-l-4 border-amber-600'
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
                  placeholder="Ex: EM_ORCAMENTO, AGUARDANDO_APROVACAO..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-sky-600 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Cor de Identificação</label>
                <div className="flex flex-wrap items-center gap-2">
                  {ALLOWED_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormColor(c.value)}
                      title={c.name}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        formColor === c.value
                          ? 'border-slate-800 ring-2 ring-sky-500/50 bg-white text-slate-900 shadow-sm'
                          : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-xs inline-block"
                        style={{ backgroundColor: c.value }}
                      />
                      <span>{c.name.split(' (')[0]}</span>
                    </button>
                  ))}
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
