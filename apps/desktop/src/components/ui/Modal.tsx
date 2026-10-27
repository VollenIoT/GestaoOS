import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { modalStack } from '../../utils/modalStack';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | 'full';
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  modalKey?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = '2xl',
  headerActions,
  footer,
  modalKey = 'BaseModal',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    modalStack.register(modalKey, onClose);
    return () => modalStack.unregister(modalKey);
  }, [isOpen, onClose, modalKey]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-[95vw]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full ${maxWidthStyles[maxWidth]} bg-slate-50 rounded-2xl shadow-2xl border border-white/20 flex flex-col max-h-[90vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || icon) && (
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shrink-0 border-b border-slate-700">
            <div className="flex items-center gap-3">
              {icon && <div className="p-2 bg-white/10 rounded-xl">{icon}</div>}
              <div>
                <h3 className="text-base font-bold tracking-wide">{title}</h3>
                {subtitle && <p className="text-xs text-slate-300">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {headerActions}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Fechar (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white border-t border-slate-200 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
