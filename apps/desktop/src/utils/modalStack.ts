/**
 * ModalStack — Gerenciador centralizado da pilha de modais abertos.
 *
 * Garante que ao pressionar ESC, apenas o ÚLTIMO modal aberto no topo da pilha
 * seja fechado, evitando que múltiplos modais aninhados fechem juntos.
 */

type CloseHandler = () => void;

interface ModalRegistration {
  id: string;
  onClose: CloseHandler;
}

class ModalStackManager {
  private stack: ModalRegistration[] = [];
  private isListening = false;

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.stack.length > 0) {
      // Interrompe a propagação para que outros listeners não fechem simultaneamente
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();

      // Remove o foco do botão ou elemento ativo para evitar borda preta de seleção
      if (typeof document !== 'undefined' && document.activeElement && 'blur' in document.activeElement) {
        (document.activeElement as HTMLElement).blur();
      }

      const topModal = this.stack[this.stack.length - 1];
      if (topModal && typeof topModal.onClose === 'function') {
        topModal.onClose();
      }
    }
  };

  public register(id: string, onClose: CloseHandler) {
    const existingIndex = this.stack.findIndex((item) => item.id === id);
    if (existingIndex >= 0) {
      this.stack[existingIndex].onClose = onClose;
    } else {
      this.stack.push({ id, onClose });
    }

    if (!this.isListening && typeof window !== 'undefined') {
      // Captura no modo capture (primeiro evento disparado no window)
      window.addEventListener('keydown', this.handleKeyDown, true);
      this.isListening = true;
    }
  }

  public unregister(id: string) {
    this.stack = this.stack.filter((item) => item.id !== id);
    if (this.stack.length === 0 && this.isListening && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown, true);
      this.isListening = false;
    }
  }
}

export const modalStack = new ModalStackManager();
