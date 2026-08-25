import React from 'react';
import { X, Package, Edit3, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Part } from './PartsModal';

interface PartViewModalProps {
  isOpen: boolean;
  part: Part | null;
  currentUser: any;
  onClose: () => void;
  onEdit: (part: Part) => void;
}

export const PartViewModal: React.FC<PartViewModalProps> = ({
  isOpen,
  part,
  currentUser,
  onClose,
  onEdit,
}) => {
  if (!isOpen || !part) return null;

  const canEdit = Boolean(
    currentUser?.role === 'Admin' ||
    currentUser?.permissions?.manageParts
  );

  const qty = part.stockQuantity !== undefined ? part.stockQuantity : 0;
  const minQty = part.minStock !== undefined ? part.minStock : 0;
  const isLowStock = qty <= minQty || qty <= 0;

  const inp = "w-full bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 font-semibold text-sm focus:outline-none cursor-default select-none";
  const lbl = "block font-semibold text-slate-600 mb-0.5 text-xs";

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-4xl flex flex-col shadow-2xl overflow-hidden font-sans">

        <div className="px-4 py-3 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-800">Ficha da Peça</h2>
          </div>
          <div className="flex items-center gap-2">
            {isLowStock ? (
              <span className="flex items-center gap-1 bg-red-100 border border-red-300 text-red-700 px-2 py-0.5 rounded-md text-xs font-bold">
                <AlertTriangle className="w-3 h-3" />
                Estoque Baixo: {qty} un
              </span>
            ) : (
              <span className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-md text-xs font-bold">
                <CheckCircle className="w-3 h-3" />
                Em Estoque: {qty} un
              </span>
            )}
            <button onClick={onClose} className="text-slate-500 hover:text-slate-900 p-1 rounded cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 bg-white">
          <div className="bg-white border border-slate-200 rounded-xl p-3">

            <div className="grid grid-cols-4 gap-2 mb-2">
              <div className="col-span-3">
                <label className={lbl}>Nome da Peça</label>
                <input type="text" readOnly value={part.name || ''} className={inp} />
              </div>
              <div>
                <label className={lbl}>Marca / Fabricante</label>
                <input type="text" readOnly value={part.brand || ''} placeholder="--" className={inp} />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-2">
              <div>
                <label className={lbl}>Código do Fabricante</label>
                <input type="text" readOnly value={part.manufacturerCode || ''} placeholder="--" className={`${inp} font-mono`} />
              </div>
              <div>
                <label className="block font-semibold text-sky-800 mb-0.5 text-xs">Grupo (Tipo de Equip.)</label>
                <input type="text" readOnly value={part.group || ''} placeholder="--" className="w-full bg-sky-50 border border-sky-200 rounded-md px-2.5 py-1.5 text-sky-800 font-semibold text-sm cursor-default select-none uppercase" />
              </div>
              <div>
                <label className="block font-semibold text-purple-800 mb-0.5 text-xs">Localização no Estoque</label>
                <input type="text" readOnly value={part.location || ''} placeholder="--" className="w-full bg-purple-50 border border-purple-200 rounded-md px-2.5 py-1.5 text-purple-800 font-semibold text-sm cursor-default select-none uppercase" />
              </div>
              <div>
                <label className={lbl}>Qtd. em Estoque</label>
                <input type="text" readOnly value={qty} className={`${inp} font-mono`} />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-2">
              <div>
                <label className={lbl}>Valor para Técnico (R$)</label>
                <input type="text" readOnly value={part.techPrice || ''} placeholder="--" className={inp} />
              </div>
              <div>
                <label className="block font-semibold text-emerald-800 mb-0.5 text-xs">Valor Consumidor Final (R$)</label>
                <input type="text" readOnly value={part.finalPrice || ''} placeholder="--" className="w-full bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5 text-emerald-800 font-semibold text-sm cursor-default select-none" />
              </div>
              <div>
                <label className={lbl}>Estoque Mínimo (Alerta)</label>
                <input type="text" readOnly value={minQty} className={`${inp} font-mono`} />
              </div>
              <div />
            </div>

            <div>
              <label className={lbl}>Referência / Aplicação</label>
              <textarea
                readOnly
                rows={2}
                value={part.application || ''}
                placeholder="Não informado"
                className="w-full bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 text-sm focus:outline-none cursor-default select-none resize-none"
              />
            </div>

          </div>
        </div>

        <div className="px-4 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-400 italic">
            {canEdit ? 'Você tem permissão para editar esta peça.' : 'Modo somente visualização.'}
          </span>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => { onClose(); onEdit(part); }}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center gap-1.5 shadow cursor-pointer transition-all text-sm"
              >
                <Edit3 className="w-4 h-4" />
                Editar Peça
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer transition-all text-sm"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
