/**
 * DialogContext — Sistema global de diálogos padronizados
 *
 * Substitui todos os alert() e confirm() nativos do browser por modais
 * consistentes com o design system do Vollen OS.
 *
 * Uso:
 *   const { alert, confirm } = useDialog();
 *   await alert({ title: 'Atenção', message: 'Mensagem aqui' });
 *   const ok = await confirm({ title: 'Excluir?', message: 'Tem certeza?' });
 */

import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import { ConfirmModal } from './ConfirmModal';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Variant = 'danger' | 'warning' | 'info' | 'success';

interface AlertOptions {
  title: string;
  message: string;
  variant?: Variant;
  confirmText?: string;
}

interface ConfirmOptions {
  title: string;
  message: string;
  variant?: Variant;
  confirmText?: string;
  cancelText?: string;
}

interface DialogState {
  isOpen: boolean;
  isAlertMode: boolean;
  title: string;
  message: string;
  variant: Variant;
  confirmText: string;
  cancelText: string;
  resolve: ((value: boolean) => void) | null;
}

interface DialogContextValue {
  alert: (options: AlertOptions | string) => Promise<void>;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const DialogContext = createContext<DialogContextValue | null>(null);

const DEFAULT_STATE: DialogState = {
  isOpen: false,
  isAlertMode: true,
  title: '',
  message: '',
  variant: 'warning',
  confirmText: 'OK',
  cancelText: 'Cancelar',
  resolve: null,
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DialogState>(DEFAULT_STATE);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const openDialog = useCallback((dialogState: Omit<DialogState, 'isOpen' | 'resolve'>): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ ...dialogState, isOpen: true, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    setState(DEFAULT_STATE);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    setState(DEFAULT_STATE);
  }, []);

  const alert = useCallback(async (options: AlertOptions | string): Promise<void> => {
    const opts = typeof options === 'string'
      ? { title: 'Aviso', message: options }
      : options;

    await openDialog({
      isAlertMode: true,
      title: opts.title,
      message: opts.message,
      variant: opts.variant ?? 'info',
      confirmText: opts.confirmText ?? 'OK',
      cancelText: 'Cancelar',
    });
  }, [openDialog]);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const opts = typeof options === 'string'
      ? { title: 'Confirmar', message: options }
      : options;

    return openDialog({
      isAlertMode: false,
      title: opts.title,
      message: opts.message,
      variant: opts.variant ?? 'warning',
      confirmText: opts.confirmText ?? 'Confirmar',
      cancelText: opts.cancelText ?? 'Cancelar',
    });
  }, [openDialog]);

  // Mantém referência global e sobrescreve window.alert / window.confirm automaticamente
  if (typeof window !== 'undefined') {
    (window as any).__vollenDialogContext__ = { alert, confirm };
  }

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      <ConfirmModal
        isOpen={state.isOpen}
        title={state.title}
        message={state.message}
        variant={state.variant}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        isAlertMode={state.isAlertMode}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </DialogContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog deve ser usado dentro de DialogProvider');
  }
  return ctx;
}

// ─── Interceptação Global do window.alert e window.confirm ──────────────────
if (typeof window !== 'undefined') {
  // Salva implementações originais caso necessário
  (window as any).__nativeAlert__ = window.alert;
  (window as any).__nativeConfirm__ = window.confirm;

  window.alert = (message?: any) => {
    const globalCtx = (window as any).__vollenDialogContext__;
    const msgStr = typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message ?? '');
    
    // Título inteligente baseado no conteúdo da mensagem
    let title = 'Aviso do Sistema';
    let variant: Variant = 'info';
    
    const lower = msgStr.toLowerCase();
    if (lower.includes('erro') || lower.includes('falha') || lower.includes('inválid') || lower.includes('não confere')) {
      title = 'Atenção';
      variant = 'danger';
    } else if (lower.includes('sucesso') || lower.includes('gravado') || lower.includes('salv') || lower.includes('cadastrado') || lower.includes('atualizado')) {
      title = 'Sucesso';
      variant = 'success';
    } else if (lower.includes('obrigatório') || lower.includes('preencha') || lower.includes('selecione') || lower.includes('informe') || lower.includes('bloque')) {
      title = 'Atenção';
      variant = 'warning';
    }

    if (globalCtx && globalCtx.alert) {
      globalCtx.alert({ title, message: msgStr, variant });
    } else {
      (window as any).__nativeAlert__(msgStr);
    }
  };

  window.confirm = (message?: any): boolean => {
    const globalCtx = (window as any).__vollenDialogContext__;
    const msgStr = typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message ?? '');
    
    let title = 'Confirmar Ação';
    let variant: Variant = 'warning';
    const lower = msgStr.toLowerCase();
    if (lower.includes('excluir') || lower.includes('apagar') || lower.includes('remover') || lower.includes('deletar')) {
      title = 'Confirmar Exclusão';
      variant = 'danger';
    }

    if (globalCtx && globalCtx.confirm) {
      // Como o ConfirmModal trabalha de forma bonita, chamamos o modal do sistema
      globalCtx.confirm({ title, message: msgStr, variant });
      return true;
    }
    return (window as any).__nativeConfirm__(msgStr);
  };
}

