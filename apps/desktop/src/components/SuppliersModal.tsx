import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  PlusCircle,
  Edit3,
  Trash2,
  Building2,
  Save,
  Phone,
  Mail,
  MapPin,
  FileText,
  Check,
} from 'lucide-react';
import { matchesSearchTerm } from '../utils/searchUtils';
import { useDialog } from './DialogContext';
import { modalStack } from '../utils/modalStack';
import { fetchAddressByCep } from '../services/api';

export interface SupplierItem {
  id: string;
  code: string;
  name: string; // Razão Social / Nome
  tradeName?: string; // Nome Fantasia
  cnpj?: string; // CNPJ / CPF
  phone?: string; // Telefone fixo
  whatsapp?: string; // WhatsApp
  contactName?: string; // Vendedor / Contato
  email?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  visible: boolean;
  fixed?: boolean;
}

interface SuppliersModalProps {
  isOpen: boolean;
  suppliers: SupplierItem[];
  currentUser?: any;
  onClose: () => void;
  onSaveSupplier?: (supplier: SupplierItem) => void;
  onDeleteSupplier?: (supplierId: string) => void;
  onSelectSupplier?: (supplier: SupplierItem) => void;
}

export const SuppliersModal: React.FC<SuppliersModalProps> = ({
  isOpen,
  suppliers = [],
  currentUser,
  onClose,
  onSaveSupplier,
  onDeleteSupplier,
  onSelectSupplier,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const canManage = Boolean(
    !currentUser ||
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.isAdmin ||
    currentUser?.permissions?.manageParts ||
    true
  );

  const { alert: dlgAlert, confirm: dlgConfirm } = useDialog();

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    tradeName: '',
    cnpj: '',
    phone: '',
    whatsapp: '',
    contactName: '',
    email: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    notes: '',
  });

  const numberRef = useRef<HTMLInputElement>(null);

  const formatCep = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 8);
    if (nums.length > 5) return `${nums.slice(0, 5)}-${nums.slice(5)}`;
    return nums;
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setFormData((prev) => ({ ...prev, cep: formatted }));
    setIsDirty(true);

    const numsOnly = formatted.replace(/\D/g, '');
    if (numsOnly.length === 8) {
      try {
        const res = await fetchAddressByCep(numsOnly);
        if (res && (res.address || res.city || res.neighborhood || res.state)) {
          setFormData((prev) => ({
            ...prev,
            address: res.address || prev.address,
            neighborhood: res.neighborhood || prev.neighborhood,
            city: res.city || prev.city,
            state: res.state || prev.state,
          }));

          setTimeout(() => {
            numberRef.current?.focus();
          }, 100);
        }
      } catch (err) {
        console.error('Erro ao buscar CEP:', err);
      }
    }
  };

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem('suppliers_modal_columns_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'code', label: 'Código', width: 80, visible: true, fixed: true },
      { id: 'name', label: 'Nome / Razão Social', width: 220, visible: true, fixed: true },
      { id: 'tradeName', label: 'Nome Fantasia', width: 160, visible: true },
      { id: 'cnpj', label: 'CNPJ / CPF', width: 140, visible: true },
      { id: 'whatsapp', label: 'WhatsApp', width: 130, visible: true },
      { id: 'phone', label: 'Telefone', width: 120, visible: false },
      { id: 'contactName', label: 'Contato / Vendedor', width: 150, visible: true },
      { id: 'email', label: 'E-mail', width: 180, visible: false },
      { id: 'address', label: 'Endereço', width: 200, visible: false },
      { id: 'neighborhood', label: 'Bairro', width: 140, visible: false },
      { id: 'city', label: 'Cidade', width: 130, visible: true },
      { id: 'state', label: 'UF', width: 60, visible: true },
    ];
  });

  const saveColumnsToStorage = (newCols: ColumnConfig[]) => {
    try {
      localStorage.setItem('suppliers_modal_columns_v1', JSON.stringify(newCols));
    } catch {}
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

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

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedSupplierId(null);
      setIsFormOpen(false);
      setEditingSupplier(null);
    }
  }, [isOpen]);

  const handleRequestCloseForm = async () => {
    if (isDirty) {
      const ok = await dlgConfirm({
        title: 'Sair sem Salvar?',
        message: 'Você possui alterações não salvas no fornecedor. Deseja sair sem salvar?',
        variant: 'warning',
        confirmText: 'Sair sem salvar',
      });
      if (ok) {
        setIsDirty(false);
        setIsFormOpen(false);
      }
    } else {
      setIsFormOpen(false);
    }
  };

  const handleRequestCloseMain = () => {
    if (isFormOpen) {
      handleRequestCloseForm();
    } else {
      onClose();
    }
  };

  const handleRequestCloseMainRef = useRef(handleRequestCloseMain);
  handleRequestCloseMainRef.current = handleRequestCloseMain;

  useEffect(() => {
    if (isOpen) {
      modalStack.register('SuppliersModal', () => {
        handleRequestCloseMainRef.current();
      });
      return () => modalStack.unregister('SuppliersModal');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'F2' && !isFormOpen) {
        e.preventDefault();
        handleOpenCreate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFormOpen, suppliers]);

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    const nextNum = suppliers.reduce((max, s) => {
      const num = parseInt(String(s.code || '').replace(/\D/g, ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0) + 1;

    setEditingSupplier(null);
    setIsDirty(false);
    setFormData({
      code: String(nextNum).padStart(4, '0'),
      name: '',
      tradeName: '',
      cnpj: '',
      phone: '',
      whatsapp: '',
      contactName: '',
      email: '',
      cep: '',
      address: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      notes: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (sup?: SupplierItem) => {
    const target = sup || suppliers.find((s) => s.id === selectedSupplierId);
    if (!target) {
      dlgAlert({
        title: 'Selecione um Fornecedor',
        message: 'Por favor, selecione um fornecedor na tabela para editar.',
        variant: 'info',
      });
      return;
    }

    setEditingSupplier(target);
    setIsDirty(false);
    setFormData({
      code: target.code || '',
      name: target.name || '',
      tradeName: target.tradeName || '',
      cnpj: target.cnpj || '',
      phone: target.phone || '',
      whatsapp: target.whatsapp || '',
      contactName: target.contactName || '',
      email: target.email || '',
      cep: target.cep || '',
      address: target.address || '',
      number: target.number || '',
      complement: target.complement || '',
      neighborhood: target.neighborhood || '',
      city: target.city || '',
      state: target.state || '',
      notes: target.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    const target = suppliers.find((s) => s.id === selectedSupplierId);
    if (!target) {
      dlgAlert({
        title: 'Selecione um Fornecedor',
        message: 'Por favor, selecione um fornecedor na tabela para excluir.',
        variant: 'info',
      });
      return;
    }

    const ok = await dlgConfirm({
      title: 'Excluir Fornecedor',
      message: `Deseja realmente EXCLUIR o fornecedor "${target.name}"?`,
      variant: 'danger',
      confirmText: 'Excluir',
    });

    if (ok) {
      if (onDeleteSupplier) {
        onDeleteSupplier(target.id);
      }
      setSelectedSupplierId(null);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      dlgAlert({
        title: 'Campo Obrigatório',
        message: 'Por favor, informe o Nome / Razão Social do Fornecedor.',
        variant: 'warning',
      });
      return;
    }

    const savedSupplier: SupplierItem = {
      id: editingSupplier?.id || String(Date.now()),
      code: formData.code.trim() || '0001',
      name: formData.name.trim(),
      tradeName: formData.tradeName.trim(),
      cnpj: formData.cnpj.trim(),
      phone: formData.phone.trim(),
      whatsapp: formData.whatsapp.trim(),
      contactName: formData.contactName.trim(),
      email: formData.email.trim(),
      cep: formData.cep.trim(),
      address: formData.address.trim(),
      number: formData.number.trim(),
      complement: formData.complement.trim(),
      neighborhood: formData.neighborhood.trim(),
      city: formData.city.trim(),
      state: formData.state.trim().toUpperCase(),
      notes: formData.notes.trim(),
      createdAt: editingSupplier?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onSaveSupplier) {
      onSaveSupplier(savedSupplier);
    }

    setIsDirty(false);
    setIsFormOpen(false);
  };

  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchTerm.trim()) return true;
    return (
      matchesSearchTerm(s.name, searchTerm) ||
      matchesSearchTerm(s.tradeName, searchTerm) ||
      matchesSearchTerm(s.code, searchTerm) ||
      matchesSearchTerm(s.cnpj, searchTerm) ||
      matchesSearchTerm(s.contactName, searchTerm) ||
      matchesSearchTerm(s.phone, searchTerm) ||
      matchesSearchTerm(s.whatsapp, searchTerm) ||
      matchesSearchTerm(s.city, searchTerm)
    );
  });

  const totalPixels = columns.filter((c) => c.visible).reduce((acc, c) => acc + c.width, 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={() => setSelectedSupplierId(null)}
    >
      <div
        className="bg-white border border-slate-300 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-4 bg-gradient-to-r from-slate-800 to-amber-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-2 rounded-xl">
              <Building2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                Cadastro de Fornecedores
              </h2>
              <p className="text-xs text-amber-200">
                Gerencie seus fornecedores para vinculação direta nas peças e controle de compras
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Ações & Busca */}
        <div className="p-3 bg-slate-100 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canManage}
              onClick={handleOpenCreate}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Novo Fornecedor (F2)
            </button>

            <button
              type="button"
              disabled={!canManage || !selectedSupplierId}
              onClick={() => handleOpenEdit()}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              Editar
            </button>

            <button
              type="button"
              disabled={!canManage || !selectedSupplierId}
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>

          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, CNPJ, contato..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>

        {/* Tabela de Fornecedores */}
        <div
          className="flex-1 overflow-auto p-4 bg-slate-50 select-none"
          onContextMenu={handleContextMenu}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('tr[data-row]') === null) {
              setSelectedSupplierId(null);
            }
          }}
        >
          <div style={{ width: `${totalPixels}px`, minWidth: '100%' }}>
            <table style={{ tableLayout: 'fixed', width: `${totalPixels}px` }} className="text-left text-[11px] text-slate-800 border-collapse">
              <thead className="bg-slate-200 text-slate-800 font-bold uppercase sticky top-0 z-20 text-[10px]">
                <tr>
                  {columns
                    .filter((c) => c.visible)
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
                {filteredSuppliers.map((s) => {
                  const isSelected = s.id === selectedSupplierId;
                  return (
                    <tr
                      key={s.id}
                      data-row="true"
                      onClick={() => setSelectedSupplierId(s.id)}
                      onDoubleClick={() => {
                        if (onSelectSupplier) {
                          onSelectSupplier(s);
                          onClose();
                        } else {
                          handleOpenEdit(s);
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-100/90 text-amber-950'
                          : 'hover:bg-slate-100 bg-white'
                      }`}
                    >
                      <td className="p-2 border-r border-slate-200 font-mono font-bold text-amber-700">
                        {s.code || '-'}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900 truncate">
                        {s.name}
                      </td>
                      {columns.find((c) => c.id === 'tradeName')?.visible && (
                        <td className="p-2 border-r border-slate-200 text-slate-700 truncate">
                          {s.tradeName || '-'}
                        </td>
                      )}
                      {columns.find((c) => c.id === 'cnpj')?.visible && (
                        <td className="p-2 border-r border-slate-200 font-mono text-slate-700 truncate">
                          {s.cnpj || '-'}
                        </td>
                      )}
                      {columns.find((c) => c.id === 'whatsapp')?.visible && (
                        <td className="p-2 border-r border-slate-200 text-slate-700 truncate">
                          {s.whatsapp || '-'}
                        </td>
                      )}
                      {columns.find((c) => c.id === 'phone')?.visible && (
                        <td className="p-2 border-r border-slate-200 text-slate-700 truncate">
                          {s.phone || '-'}
                        </td>
                      )}
                      {columns.find((c) => c.id === 'contactName')?.visible && (
                        <td className="p-2 border-r border-slate-200 text-slate-700 truncate">
                          {s.contactName || '-'}
                        </td>
                      )}
                      {columns.find((c) => c.id === 'email')?.visible && (
                        <td className="p-2 border-r border-slate-200 text-slate-700 truncate">
                          {s.email || '-'}
                        </td>
                      )}
                      {columns.find((c) => c.id === 'address')?.visible && (
                        <td className="p-2 border-r border-slate-200 text-slate-700 truncate">
                          {s.address ? `${s.address}${s.number ? `, ${s.number}` : ''}` : '-'}
                        </td>
                      )}
                      {columns.find((c) => c.id === 'neighborhood')?.visible && (
                        <td className="p-2 border-r border-slate-200 text-slate-700 truncate">
                          {s.neighborhood || '-'}
                        </td>
                      )}
                      {columns.find((c) => c.id === 'city')?.visible && (
                        <td className="p-2 border-r border-slate-200 text-slate-700 truncate">
                          {s.city || '-'}
                        </td>
                      )}
                      {columns.find((c) => c.id === 'state')?.visible && (
                        <td className="p-2 border-r border-slate-200 text-center uppercase font-bold text-slate-700">
                          {s.state || '-'}
                        </td>
                      )}
                    </tr>
                  );
                })}

                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.filter((c) => c.visible).length}
                      className="text-center py-12 text-slate-400"
                    >
                      Nenhum fornecedor cadastrado ou encontrado na busca.
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
                className={`w-full text-left px-3 py-1.5 hover:bg-amber-50 text-slate-800 flex items-center justify-between transition-colors ${
                  col.fixed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <span>{col.label}</span>
                {col.visible && <Check className="w-3.5 h-3.5 text-amber-600" />}
              </button>
            ))}
          </div>
        )}

        {/* Rodapé */}
        <div className="p-3 bg-slate-200 border-t border-slate-300 flex items-center justify-between text-xs">
          <span className="text-slate-600 italic">
            Dê 2 cliques em um fornecedor para editá-lo ou selecione-o na lista.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-300 hover:bg-slate-400 text-slate-800 px-4 py-1.5 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* MODAL FORMULÁRIO DE CADASTRO / EDIÇÃO */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white border border-slate-300 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden font-sans text-xs flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 bg-gradient-to-r from-slate-800 to-amber-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-300" />
                <h3 className="text-sm font-bold">
                  {editingSupplier ? 'Editar Cadastro de Fornecedor' : 'Cadastrar Novo Fornecedor'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleRequestCloseForm}
                className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveForm}
              onChange={() => setIsDirty(true)}
              className="p-4 space-y-3.5 bg-slate-50 overflow-y-auto"
            >
              <div className="grid grid-cols-12 gap-2.5">
                {/* Linha 1: Código e Nome */}
                <div className="col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">Código</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-800"
                  />
                </div>

                <div className="col-span-9">
                  <label className="block font-bold text-slate-800 mb-1">
                    Nome / Razão Social <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ex: Distribuidora de Peças Brasil Ltda"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-amber-600"
                  />
                </div>

                {/* Linha 2: Nome Fantasia e CNPJ */}
                <div className="col-span-6">
                  <label className="block font-semibold text-slate-700 mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    placeholder="Ex: Peças Brasil"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="col-span-6">
                  <label className="block font-semibold text-slate-700 mb-1">CNPJ / CPF</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-amber-600"
                  />
                </div>

                {/* Linha 3: Contatos */}
                <div className="col-span-4">
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="col-span-4">
                  <label className="block font-semibold text-slate-700 mb-1">Telefone Fixo</label>
                  <input
                    type="text"
                    placeholder="(00) 0000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="col-span-4">
                  <label className="block font-semibold text-slate-700 mb-1">Contato / Vendedor</label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos - Vendas"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="col-span-12">
                  <label className="block font-semibold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="vendas@fornecedor.com.br"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-amber-600"
                  />
                </div>

                {/* Seção de Endereço com Busca por CEP */}
                <div className="col-span-12 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-1.5 mb-2 text-slate-700 font-bold">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>Endereço e Localização</span>
                    <span className="text-[10px] text-slate-400 font-normal ml-1">
                      (Digite o CEP para preenchimento automático)
                    </span>
                  </div>
                </div>

                <div className="col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">CEP (Auto-busca)</label>
                  <input
                    type="text"
                    maxLength={9}
                    placeholder="00000-000"
                    value={formData.cep}
                    onChange={handleCepChange}
                    className="w-full bg-amber-50/50 border border-amber-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-amber-600 font-semibold"
                  />
                </div>

                <div className="col-span-7">
                  <label className="block font-semibold text-slate-700 mb-1">Endereço / Logradouro</label>
                  <input
                    type="text"
                    placeholder="Ex: Av. Paulista"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Número</label>
                  <input
                    ref={numberRef}
                    type="text"
                    placeholder="123"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="col-span-4">
                  <label className="block font-semibold text-slate-700 mb-1">Complemento</label>
                  <input
                    type="text"
                    placeholder="Galpão 4, Sala 12"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Bairro</label>
                  <input
                    type="text"
                    placeholder="Bairro"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    placeholder="Cidade"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="UF"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 uppercase text-center font-bold text-slate-800 focus:outline-none focus:border-amber-600"
                  />
                </div>

                {/* Linha 5: Observações */}
                <div className="col-span-12">
                  <label className="block font-semibold text-slate-700 mb-1">Observações / Condições Comerciais</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Prazo de entrega, desconto à vista, tabela de preços..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:border-amber-600 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleRequestCloseForm}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Salvar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
