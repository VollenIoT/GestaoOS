import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  PlusCircle,
  Edit3,
  Trash2,
  Wrench,
  Phone,
  UserCheck,
  CheckCircle2,
  Save,
  MessageSquare,
} from 'lucide-react';
import { matchesSearchTerm } from '../utils/searchUtils';

export interface TechnicianItem {
  id: string;
  code: string;
  name: string;
  phone: string;
  whatsapp?: string;
  specialty?: string;
  pixKey?: string;
  active: boolean;
}

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  visible: boolean;
  fixed?: boolean;
}

interface TechniciansModalProps {
  isOpen: boolean;
  currentUser?: any;
  onClose: () => void;
  onSelectTechnician?: (technician: TechnicianItem) => void;
}

const DEFAULT_TECHNICIANS: TechnicianItem[] = [
  {
    id: 'tech-1',
    code: '0001',
    name: 'Técnico de Exemplo',
    phone: '(11) 98888-1010',
    whatsapp: '(11) 98888-1010',
    specialty: 'Manutenção Geral e Diagnóstico',
    pixKey: 'tecnico@email.com',
    active: true,
  },
];

export const TechniciansModal: React.FC<TechniciansModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSelectTechnician,
}) => {
  const [technicians, setTechnicians] = useState<TechnicianItem[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_technicians');
      if (saved) return JSON.parse(saved);
    } catch (err) {}
    return DEFAULT_TECHNICIANS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<TechnicianItem | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    phone: '',
    whatsapp: '',
    specialty: '',
    pixKey: '',
    active: true,
  });

  const canManage = Boolean(
    currentUser?.role === 'Admin' ||
    currentUser?.permissions?.manageTechnicians ||
    currentUser?.permissions?.manageUsers
  );

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    return [
      { id: 'code', label: 'Código', width: 80, visible: true, fixed: true },
      { id: 'name', label: 'Nome do Técnico Responsável', width: 240, visible: true, fixed: true },
      { id: 'phone', label: 'Telefone / WhatsApp', width: 170, visible: true },
      { id: 'specialty', label: 'Especialidade / Área', width: 220, visible: true },
      { id: 'pixKey', label: 'Chave PIX / Repasse', width: 190, visible: true },
      { id: 'status', label: 'Status', width: 100, visible: true },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('vollen_technicians', JSON.stringify(technicians));
    } catch (err) {}
  }, [technicians]);

  if (!isOpen) return null;

  const filteredTechs = technicians.filter((t) => {
    if (!searchTerm.trim()) return true;
    return (
      matchesSearchTerm(t.name, searchTerm) ||
      matchesSearchTerm(t.code, searchTerm) ||
      matchesSearchTerm(t.specialty, searchTerm) ||
      matchesSearchTerm(t.phone, searchTerm) ||
      matchesSearchTerm(t.whatsapp, searchTerm)
    );
  });

  const selectedTech = technicians.find((t) => t.id === selectedTechId);

  const handleOpenCreate = () => {
    const nextNum = technicians.reduce((max, t) => {
      const num = parseInt(t.code.replace(/\D/g, ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0) + 1;

    setEditingTech(null);
    setFormData({
      code: String(nextNum).padStart(4, '0'),
      name: '',
      phone: '',
      whatsapp: '',
      specialty: '',
      pixKey: '',
      active: true,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (tech?: TechnicianItem) => {
    const target = tech || selectedTech;
    if (!target) return alert('Por favor, selecione um técnico na tabela.');
    setEditingTech(target);
    setFormData({
      code: target.code,
      name: target.name,
      phone: target.phone || '',
      whatsapp: target.whatsapp || target.phone || '',
      specialty: target.specialty || '',
      pixKey: target.pixKey || '',
      active: target.active ?? true,
    });
    setIsFormOpen(true);
  };

  const handleDelete = () => {
    if (!selectedTech) return alert('Por favor, selecione um técnico na tabela.');
    if (confirm(`Deseja realmente EXCLUIR o técnico "${selectedTech.name}"?`)) {
      setTechnicians((prev) => prev.filter((t) => t.id !== selectedTech.id));
      setSelectedTechId(null);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return alert('O nome do técnico é obrigatório.');
    }

    if (editingTech) {
      setTechnicians((prev) =>
        prev.map((t) => (t.id === editingTech.id ? { ...t, ...formData } : t))
      );
    } else {
      const newTech: TechnicianItem = {
        id: `tech-${Date.now()}`,
        ...formData,
      };
      setTechnicians((prev) => [...prev, newTech]);
    }

    setIsFormOpen(false);
  };

  const totalPixels = columns.filter((c) => c.visible).reduce((acc, c) => acc + c.width, 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={() => setSelectedTechId(null)}
    >
      <div
        className="bg-white border border-slate-300 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-4 bg-gradient-to-r from-slate-800 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-2 rounded-xl">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                Cadastro de Técnicos Responsáveis
              </h2>
              <p className="text-xs text-indigo-200">
                Gerencie os técnicos para atribuição em Ordens de Serviço e Visitas Técnicas
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
              Novo Técnico (F2)
            </button>

            <button
              type="button"
              disabled={!canManage || !selectedTechId}
              onClick={() => handleOpenEdit()}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              Editar
            </button>

            <button
              type="button"
              disabled={!canManage || !selectedTechId}
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
              placeholder="Buscar técnico por nome ou área..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Tabela de Técnicos */}
        <div
          className="flex-1 overflow-auto p-4 bg-slate-50"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('tr[data-row]') === null) {
              setSelectedTechId(null);
            }
          }}
        >
          <div style={{ width: `${totalPixels}px`, minWidth: '100%' }}>
            <table style={{ tableLayout: 'fixed', width: `${totalPixels}px` }} className="text-left text-[11px] text-slate-800 border-collapse">
              <thead className="bg-slate-200 text-slate-800 font-bold uppercase sticky top-0 z-20 text-[10px]">
                <tr>
                  {columns.filter((c) => c.visible).map((col) => (
                    <th
                      key={col.id}
                      style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}
                      className="p-2 border-b border-r border-slate-300"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredTechs.map((t) => {
                  const isSelected = t.id === selectedTechId;
                  return (
                    <tr
                      key={t.id}
                      data-row="true"
                      onClick={() => setSelectedTechId(t.id)}
                      onDoubleClick={() => {
                        if (onSelectTechnician) {
                          onSelectTechnician(t);
                          onClose();
                        } else if (canManage) {
                          handleOpenEdit(t);
                        }
                      }}
                        className={`cursor-pointer transition-colors ${isSelected
                          ? 'bg-indigo-100/90 text-indigo-950'
                          : 'hover:bg-slate-100 bg-white'
                        }`}
                    >
                      <td className="p-2 border-r border-slate-200 font-mono font-bold text-indigo-700">
                        {t.code}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900 truncate">
                        {t.name}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-700 truncate">
                        {t.whatsapp || t.phone || '-'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-700 truncate">
                        {t.specialty || '-'}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono text-slate-600 truncate">
                        {t.pixKey || '-'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
                            t.active
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-red-100 text-red-800 border border-red-300'
                          }`}
                        >
                          {t.active ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredTechs.length === 0 && (
                  <tr>
                    <td colSpan={columns.filter((c) => c.visible).length} className="text-center py-12 text-slate-400">
                      Nenhum técnico encontrado para a pesquisa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-3 bg-slate-200 border-t border-slate-300 flex items-center justify-between text-xs">
          <span className="text-slate-600 italic">
            Clique 2x em um técnico para editar seus dados ou selecioná-lo.
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

      {/* MODAL DE FORMULÁRIO DE CADASTRO / EDIÇÃO */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsFormOpen(false)}
        >
          <div
            className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans text-xs flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 bg-gradient-to-r from-indigo-700 to-sky-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-white" />
                <h3 className="text-sm font-bold">
                  {editingTech ? 'Editar Técnico Responsável' : 'Cadastrar Novo Técnico Responsável'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-4 space-y-3 bg-slate-50">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-800"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Roberto Carlos da Silva"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone Principal</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1 text-emerald-700">
                    <MessageSquare className="w-3 h-3 text-emerald-600" />
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Especialidade / Área de Atuação</label>
                <input
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="Ex: Lavadoras, Geladeiras, Ar Condicionado, TV..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chave PIX / Dados de Repasse</label>
                <input
                  type="text"
                  value={formData.pixKey}
                  onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                  placeholder="Chave PIX, Banco ou Conta"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="techActiveCheckbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
                <label htmlFor="techActiveCheckbox" className="font-bold text-slate-800 cursor-pointer">
                  Técnico Ativo no Sistema
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Salvar Técnico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
