import React from 'react';
import { AlertTriangle, HelpCircle, Info, CheckCircle2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isAlertMode?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning',
  isAlertMode = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const headerColors = {
    danger: 'bg-red-700 text-white',
    warning: 'bg-amber-600 text-white',
    info: 'bg-sky-700 text-white',
    success: 'bg-emerald-700 text-white',
  };

  const buttonColors = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    info: 'bg-sky-600 hover:bg-sky-700 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  };

  const IconComponent =
    variant === 'danger'
      ? AlertTriangle
      : variant === 'warning'
      ? HelpCircle
      : variant === 'success'
      ? CheckCircle2
      : Info;

  const handleClose = () => {
    if (onCancel) onCancel();
    else onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans text-xs animate-fadeIn">
        {/* Cabeçalho */}
        <div className={`p-3.5 flex items-center justify-between ${headerColors[variant]}`}>
          <h3 className="text-xs font-bold flex items-center gap-2">
            <IconComponent className="w-4 h-4" />
            {title}
          </h3>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensagem do Modal */}
        <div className="p-5 space-y-4 bg-slate-50 text-slate-800">
          <p className="text-xs leading-relaxed font-medium whitespace-pre-wrap">{message}</p>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            {!isAlertMode && (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-all cursor-pointer text-xs"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-1.5 font-bold rounded-xl shadow-xs transition-all cursor-pointer text-xs ${buttonColors[variant]}`}
            >
              {isAlertMode ? 'Entendi' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
