import React, { useEffect, useId, useState, useRef, useCallback } from 'react';
import { AlertTriangle, HelpCircle, Info, CheckCircle2, X } from 'lucide-react';
import { modalStack } from '../utils/modalStack';

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
  const modalId = useId();

  // Botão atualmente selecionado
  const [focusedButton, setFocusedButton] = useState<'confirm' | 'cancel'>(
    isAlertMode ? 'confirm' : 'cancel'
  );
  // Flag para exibir anel de foco suave apenas quando a navegação é feita pelo teclado
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);

  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  const handleClose = useCallback(() => {
    if (onCancel) onCancel();
    else onConfirm();
  }, [onCancel, onConfirm]);

  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  // Registro na pilha de modais para ESC fechar
  useEffect(() => {
    if (isOpen) {
      modalStack.register(modalId, () => handleCloseRef.current());
      return () => {
        modalStack.unregister(modalId);
      };
    }
  }, [isOpen, modalId]);

  // Reseta seleção inicial ao abrir
  useEffect(() => {
    if (isOpen) {
      const initial = isAlertMode ? 'confirm' : 'cancel';
      setFocusedButton(initial);
      setIsKeyboardNav(false);
    }
  }, [isOpen, isAlertMode]);

  // Navegação por Teclado: Setas (Esquerda / Direita / Cima / Baixo), Tab e Enter
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAlertMode) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onConfirm();
        }
        return;
      }

      if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'Tab'
      ) {
        e.preventDefault();
        e.stopPropagation();
        setIsKeyboardNav(true);
        setFocusedButton((prev) => (prev === 'confirm' ? 'cancel' : 'confirm'));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (focusedButton === 'confirm') {
          onConfirm();
        } else {
          handleClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isAlertMode, focusedButton, onConfirm, handleClose]);

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

  const keyFocusRings = {
    danger: 'ring-2 ring-red-400 shadow-md font-black scale-102',
    warning: 'ring-2 ring-amber-400 shadow-md font-black scale-102',
    info: 'ring-2 ring-sky-400 shadow-md font-black scale-102',
    success: 'ring-2 ring-emerald-400 shadow-md font-black scale-102',
  };

  const IconComponent =
    variant === 'danger'
      ? AlertTriangle
      : variant === 'warning'
      ? HelpCircle
      : variant === 'success'
      ? CheckCircle2
      : Info;

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
            className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer outline-none focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensagem do Modal */}
        <div className="p-5 space-y-4 bg-slate-50 text-slate-800">
          <p className="text-xs leading-relaxed font-medium whitespace-pre-wrap">{message}</p>

          {/* Botões de Ação com Navegação Limpa */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            {!isAlertMode && (
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={handleClose}
                onMouseEnter={() => {
                  setIsKeyboardNav(false);
                  setFocusedButton('cancel');
                }}
                className={`px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-all cursor-pointer text-xs outline-none focus:outline-none focus:ring-0 select-none ${
                  isKeyboardNav && focusedButton === 'cancel'
                    ? 'ring-2 ring-slate-400 bg-slate-300 shadow-md font-black scale-102'
                    : 'shadow-xs hover:shadow-sm'
                }`}
              >
                {cancelText}
              </button>
            )}
            <button
              ref={confirmBtnRef}
              type="button"
              onClick={onConfirm}
              onMouseEnter={() => {
                setIsKeyboardNav(false);
                setFocusedButton('confirm');
              }}
              className={`px-4 py-2 font-bold rounded-xl transition-all cursor-pointer text-xs outline-none focus:outline-none focus:ring-0 select-none ${
                buttonColors[variant]
              } ${
                isKeyboardNav && focusedButton === 'confirm'
                  ? keyFocusRings[variant]
                  : 'shadow-xs hover:shadow-md'
              }`}
            >
              {isAlertMode ? 'Entendi' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
