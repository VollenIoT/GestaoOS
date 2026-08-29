import React, { useState, useEffect } from 'react';
import { X, Hash, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

interface OrderSequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const OrderSequenceModal: React.FC<OrderSequenceModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [currentOrderNumber, setCurrentOrderNumber] = useState<string>('1');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('vollen_custom_next_os_number');
        if (saved) {
          setCurrentOrderNumber(saved);
        } else {
          // Busca nas preferências anteriores caso exista
          const prefs = localStorage.getItem('vollen_os_preferences');
          if (prefs) {
            const parsed = JSON.parse(prefs);
            if (parsed.initialOrderNumber) setCurrentOrderNumber(parsed.initialOrderNumber);
          }
        }
      } catch {}
      setSaveSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = parseInt(currentOrderNumber.replace(/\D/g, ''), 10);
    if (isNaN(cleanNum) || cleanNum < 1) {
      alert('Por favor, informe um número válido maior ou igual a 1.');
      return;
    }

    try {
      localStorage.setItem('vollen_custom_next_os_number', String(cleanNum));
      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Erro ao salvar numeração de OS:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 select-none font-sans text-xs"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 bg-gradient-to-r from-sky-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <Hash className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Definir Numeração Inicial da OS</h2>
              <p className="text-[10.5px] text-sky-200">
                Ajuste pontual para a sequência das próximas Ordens de Serviço
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <form onSubmit={handleSave} className="p-5 space-y-4 bg-slate-50">
          {saveSuccess && (
            <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 p-2.5 rounded-xl font-bold flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Numeração atualizada com sucesso!</span>
            </div>
          )}

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <label className="block font-bold text-slate-800 text-xs">
              Próxima Ordem de Serviço Iniciará em:
            </label>

            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-600 text-base bg-slate-100 px-3 py-2 rounded-lg border border-slate-300">
                OS-
              </span>
              <input
                type="number"
                min="1"
                required
                value={currentOrderNumber}
                onChange={(e) => setCurrentOrderNumber(e.target.value)}
                placeholder="Ex: 100"
                className="flex-1 bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900 text-base focus:outline-none focus:border-sky-600 text-center"
              />
            </div>

            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-900 text-[11px] leading-tight">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Essa configuração é <strong>isolada e independente</strong>. Ela não será sobrescrita quando você alterar outras preferências ou regras de OS no sistema.
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl flex items-center gap-2 shadow cursor-pointer text-xs"
            >
              <Save className="w-4 h-4" />
              Salvar Numeração
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
