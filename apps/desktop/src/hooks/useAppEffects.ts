import { useEffect } from 'react';
import { useUIStore } from '../stores/useUIStore';
import { useModalStore, checkIsAnyModalOpen } from '../stores/useModalStore';
import { modalStack } from '../utils/modalStack';

import { getShortcutsConfig, CustomShortcutsConfig } from '../services/shortcutService';

interface UseAppEffectsOptions {
  dlgConfirm: (opts: { title: string; message: string; variant?: string; confirmText?: string; cancelText?: string }) => Promise<boolean>;
  isAnyModalOpen: boolean;
}

/**
 * Centraliza os efeitos globais de SO / UI / Atalhos de teclado customizáveis:
 * - Maximizar janela Tauri na inicialização
 * - CapsLock virtual listener
 * - Interceptação de teclas globais configuráveis (F2, F5, F6, F7, F8, F9, F10, etc.)
 * - Navegação por Enter entre campos de formulário
 * - Fechar app com confirmação (Tauri window close)
 */
export function useAppEffects({ dlgConfirm, isAnyModalOpen }: UseAppEffectsOptions) {
  const isCapsLockActive = useUIStore((s) => s.isCapsLockActive);
  const setIsCapsLockActive = useUIStore((s) => s.setIsCapsLockActive);

  const setIsModalOpen = useModalStore((s) => s.setIsModalOpen);
  const setOrderToEdit = useModalStore((s) => s.setOrderToEdit);
  const setSelectedClientForNewOS = useModalStore((s) => s.setSelectedClientForNewOS);
  const setCameFromOpenOrders = useModalStore((s) => s.setCameFromOpenOrders);
  const setCameFromFinishedOrders = useModalStore((s) => s.setCameFromFinishedOrders);
  const setCreateOSOpenedFromMenuOS = useModalStore((s) => s.setCreateOSOpenedFromMenuOS);
  const setIsOpenOrdersModalOpen = useModalStore((s) => s.setIsOpenOrdersModalOpen);
  const setOpenOrdersOpenedFromMenuOS = useModalStore((s) => s.setOpenOrdersOpenedFromMenuOS);
  const setIsFinishedOrdersModalOpen = useModalStore((s) => s.setIsFinishedOrdersModalOpen);
  const setFinishedOrdersOpenedFromMenuOS = useModalStore((s) => s.setFinishedOrdersOpenedFromMenuOS);
  const setIsSearchOSModalOpen = useModalStore((s) => s.setIsSearchOSModalOpen);
  const setIsPartsModalOpen = useModalStore((s) => s.setIsPartsModalOpen);
  const setIsSalesModalOpen = useModalStore((s) => s.setIsSalesModalOpen);
  const setIsQuickPartSearchModalOpen = useModalStore((s) => s.setIsQuickPartSearchModalOpen);

  // ── 1. Maximizar janela Tauri ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();
        if (appWindow) await appWindow.maximize();
      } catch {}
    })();
  }, []);

  // ── 3. CapsLock virtual — aplica classe CSS no body ───────────────────────
  useEffect(() => {
    if (isCapsLockActive) {
      document.body.classList.add('app-caps-active');
    } else {
      document.body.classList.remove('app-caps-active');
    }

    const handleBeforeInput = (e: any) => {
      if (!isCapsLockActive) return;
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!target || !['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      const type = (target.getAttribute('type') || '').toLowerCase();
      if (['password', 'email', 'file', 'date', 'time', 'number', 'color', 'range', 'checkbox', 'radio'].includes(type)) return;
      if (e.data && typeof e.data === 'string' && e.data !== e.data.toUpperCase()) {
        e.preventDefault();
        const upperChar = e.data.toUpperCase();
        const start = target.selectionStart ?? target.value.length;
        const end = target.selectionEnd ?? target.value.length;
        const newVal = target.value.substring(0, start) + upperChar + target.value.substring(end);
        const prototype = Object.getPrototypeOf(target);
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        if (descriptor?.set) {
          descriptor.set.call(target, newVal);
        } else {
          target.value = newVal;
        }
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.setSelectionRange(start + upperChar.length, start + upperChar.length);
      }
    };

    const handleInputUppercase = (e: Event) => {
      if (!isCapsLockActive) return;
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!target || !['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      const type = (target.getAttribute('type') || '').toLowerCase();
      if (['password', 'email', 'file', 'date', 'time', 'number', 'color', 'range', 'checkbox', 'radio'].includes(type)) return;
      const upper = target.value.toUpperCase();
      if (target.value !== upper) {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const prototype = Object.getPrototypeOf(target);
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        if (descriptor?.set) {
          descriptor.set.call(target, upper);
        } else {
          target.value = upper;
        }
        target.dispatchEvent(new Event('input', { bubbles: true }));
        if (start !== null && end !== null) target.setSelectionRange(start, end);
      }
    };

    document.addEventListener('beforeinput', handleBeforeInput, true);
    document.addEventListener('input', handleInputUppercase, true);
    return () => {
      document.removeEventListener('beforeinput', handleBeforeInput, true);
      document.removeEventListener('input', handleInputUppercase, true);
    };
  }, [isCapsLockActive]);

  // ── 4. Listener de CapsLock físico → alterna o virtual ───────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'CapsLock' || e.code === 'CapsLock') {
        setIsCapsLockActive(!isCapsLockActive);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCapsLockActive, setIsCapsLockActive]);

  // ── 5. Teclas globais configuráveis (F2, F5, F6, F7, F8, F9, F10...) ───────
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const shortcuts = getShortcutsConfig();
      const pressedKey = (e.key || '').toUpperCase();

      // Previne F5 padrão do navegador se estiver mapeado para Ordens Abertas
      if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r')) {
        e.preventDefault();
      }
      if (isAnyModalOpen || checkIsAnyModalOpen(useModalStore.getState()) || modalStack.hasOpenModals()) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement?.tagName || ''))) return;

      if (pressedKey === (shortcuts.newOrder || 'F2').toUpperCase()) {
        e.preventDefault();
        setOrderToEdit(null);
        setSelectedClientForNewOS(null);
        setCameFromOpenOrders(false);
        setCameFromFinishedOrders(false);
        setCreateOSOpenedFromMenuOS(false);
        setIsModalOpen(true);
      } else if (pressedKey === (shortcuts.openOrders || 'F5').toUpperCase()) {
        e.preventDefault();
        setOpenOrdersOpenedFromMenuOS(false);
        setIsOpenOrdersModalOpen(true);
      } else if (pressedKey === (shortcuts.finishedOrders || 'F6').toUpperCase()) {
        e.preventDefault();
        setFinishedOrdersOpenedFromMenuOS(false);
        setIsFinishedOrdersModalOpen(true);
      } else if (pressedKey === (shortcuts.searchOS || 'F7').toUpperCase()) {
        e.preventDefault();
        setIsSearchOSModalOpen(true);
      } else if (pressedKey === (shortcuts.partsModal || 'F8').toUpperCase()) {
        e.preventDefault();
        setIsPartsModalOpen(true);
      } else if (pressedKey === (shortcuts.salesModal || 'F9').toUpperCase()) {
        e.preventDefault();
        setIsSalesModalOpen(true);
      } else if (pressedKey === (shortcuts.quickStock || 'F10').toUpperCase()) {
        e.preventDefault();
        setIsQuickPartSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [isAnyModalOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 6. Navegação por Enter entre campos de formulário ─────────────────────
  useEffect(() => {
    const handleEnterNavigation = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const activeEl = document.activeElement as HTMLElement | null;
      if (!activeEl) return;
      const tagName = activeEl.tagName;
      if (tagName === 'BUTTON' || (tagName === 'TEXTAREA' && !e.ctrlKey)) return;

      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tagName)) {
        if (activeEl.getAttribute('data-ignore-enter-navigation') === 'true') return;
        const form = activeEl.closest('form');
        const container = form || activeEl.closest('.fixed') || document.body;
        const focusables = Array.from(
          container.querySelectorAll<HTMLElement>(
            'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled])'
          )
        ).filter((el) => el.offsetWidth > 0 && el.offsetHeight > 0 && window.getComputedStyle(el).visibility !== 'hidden');

        const currentIndex = focusables.indexOf(activeEl);
        if (currentIndex !== -1) {
          e.preventDefault();
          const nextFocusable = focusables.slice(currentIndex + 1).find((el) =>
            ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(el.tagName)
          );
          if (nextFocusable && nextFocusable.tagName !== 'BUTTON') {
            nextFocusable.focus();
          } else {
            const submitBtn =
              focusables.find(
                (el) =>
                  el.tagName === 'BUTTON' &&
                  (el.getAttribute('type') === 'submit' ||
                    el.textContent?.toLowerCase().includes('salvar') ||
                    el.textContent?.toLowerCase().includes('confirmar') ||
                    el.textContent?.toLowerCase().includes('cadastrar') ||
                    el.textContent?.toLowerCase().includes('entrar'))
              ) || form?.querySelector<HTMLButtonElement>('button[type="submit"]');
            if (submitBtn) {
              submitBtn.click();
            } else if (form) {
              form.requestSubmit();
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleEnterNavigation);
    return () => window.removeEventListener('keydown', handleEnterNavigation);
  }, []);

  // ── 7. Fechar app com confirmação (Tauri close handler) ───────────────────
  useEffect(() => {
    let unlistenClose: (() => void) | undefined;
    let isExiting = false;

    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      const appWindow = getCurrentWindow();
      if (!appWindow) return;

      appWindow
        .onCloseRequested(async (event) => {
          if (isExiting) return;
          event.preventDefault();

          // Se estiver na tela de demonstração expirada/bloqueio, fecha diretamente sem modal de confirmação
          const currentTrial = useUIStore.getState().trialStatus;
          if (currentTrial && currentTrial.is_expired && !currentTrial.is_licensed) {
            isExiting = true;
            try {
              const { invoke } = await import('@tauri-apps/api/core');
              await invoke('close_app');
              return;
            } catch {
              try {
                const { exit } = await import('@tauri-apps/plugin-process');
                await exit(0);
                return;
              } catch {
                try { await appWindow.destroy(); } catch { await appWindow.close(); }
                return;
              }
            }
          }

          const ok = await dlgConfirm({
            title: 'Fechar Sistema OS',
            message: 'Tem certeza de que deseja fechar todo o sistema?',
            variant: 'warning',
            confirmText: 'Sim, Fechar',
            cancelText: 'Cancelar',
          });

          if (ok) {
            isExiting = true;
            try {
              const { invoke } = await import('@tauri-apps/api/core');
              await invoke('close_app');
            } catch {
              try {
                const { exit } = await import('@tauri-apps/plugin-process');
                await exit(0);
              } catch {
                try { await appWindow.destroy(); } catch { await appWindow.close(); }
              }
            }
          }
        })
        .then((unlisten) => { unlistenClose = unlisten; })
        .catch(() => {});
    }).catch(() => {});

    return () => { if (unlistenClose) unlistenClose(); };
  }, [dlgConfirm]);
}
