import React, { useEffect, useState, useRef } from 'react';
import { Copy, Clipboard, CheckSquare, Undo2 } from 'lucide-react';

interface TextContextMenuState {
  x: number;
  y: number;
  target: HTMLInputElement | HTMLTextAreaElement;
}

export const GlobalInputContextMenu: React.FC = () => {
  const [menu, setMenu] = useState<TextContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.getAttribute('contenteditable') === 'true';

      // Se não for campo de digitação, bloqueia menu de contexto padrão do WebView
      if (!isInput) {
        e.preventDefault();
        setMenu(null);
        return;
      }

      // Se for campo de digitação, impede o menu do navegador WebView e abre o menu customizado
      e.preventDefault();

      let x = e.clientX;
      let y = e.clientY;

      // Ajusta para não vazar da janela
      const menuWidth = 180;
      const menuHeight = 160;
      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 8;
      }
      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 8;
      }

      setMenu({
        x: Math.max(8, x),
        y: Math.max(8, y),
        target: target as HTMLInputElement | HTMLTextAreaElement,
      });
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(null);
      }
    };

    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!menu) return null;

  const target = menu.target;

  const handleCopy = async () => {
    try {
      const el = target as HTMLInputElement | HTMLTextAreaElement;
      let selectedText = '';
      if (typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number') {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        selectedText = el.value.substring(start, end);
      } else {
        selectedText = window.getSelection()?.toString() || '';
      }

      if (!selectedText && typeof el.value === 'string') {
        selectedText = el.value;
      }

      if (selectedText) {
        await navigator.clipboard.writeText(selectedText);
      }
    } catch (err) {
      document.execCommand('copy');
    }
    setMenu(null);
  };

  const handlePaste = async () => {
    try {
      const el = target as HTMLInputElement | HTMLTextAreaElement;
      el.focus();
      // 1. Tenta execCommand('paste') que não aciona o prompt do navegador em navegadores desktop/WebView
      const success = document.execCommand('paste');
      if (!success) {
        // 2. Se não funcionar via execCommand, tenta ler texto da área de transferência
        const text = await navigator.clipboard.readText();
        if (text) {
          if (typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number') {
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const val = el.value || '';
            el.value = val.substring(0, start) + text + val.substring(end);
            el.selectionStart = el.selectionEnd = start + text.length;
          } else {
            el.value = (el.value || '') + text;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    } catch (err) {
      try {
        (target as HTMLElement).focus();
        document.execCommand('paste');
      } catch (e) {}
    }
    setMenu(null);
  };

  const handleSelectAll = () => {
    const el = target as HTMLInputElement | HTMLTextAreaElement;
    el.focus();
    if (typeof el.select === 'function') {
      el.select();
    } else {
      document.execCommand('selectAll');
    }
    setMenu(null);
  };

  const handleUndo = () => {
    target.focus();
    document.execCommand('undo');
    setMenu(null);
  };

  return (
    <div
      ref={menuRef}
      style={{ top: `${menu.y}px`, left: `${menu.x}px` }}
      className="fixed z-[99999] bg-white border border-slate-300 rounded-xl shadow-2xl py-1.5 min-w-[170px] text-xs text-slate-800 font-sans select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleCopy}
        className="w-full text-left px-3 py-1.5 hover:bg-amber-50 hover:text-amber-950 flex items-center justify-between transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 font-semibold">
          <Copy className="w-3.5 h-3.5 text-slate-500" /> Copiar
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Ctrl+C</span>
      </button>

      <button
        type="button"
        onClick={handlePaste}
        className="w-full text-left px-3 py-1.5 hover:bg-amber-50 hover:text-amber-950 flex items-center justify-between transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 font-semibold">
          <Clipboard className="w-3.5 h-3.5 text-slate-500" /> Colar
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Ctrl+V</span>
      </button>

      <div className="h-px bg-slate-200 my-1 mx-2" />

      <button
        type="button"
        onClick={handleSelectAll}
        className="w-full text-left px-3 py-1.5 hover:bg-amber-50 hover:text-amber-950 flex items-center justify-between transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 font-semibold">
          <CheckSquare className="w-3.5 h-3.5 text-slate-500" /> Selecionar tudo
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Ctrl+A</span>
      </button>

      <button
        type="button"
        onClick={handleUndo}
        className="w-full text-left px-3 py-1.5 hover:bg-amber-50 hover:text-amber-950 flex items-center justify-between transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 font-semibold">
          <Undo2 className="w-3.5 h-3.5 text-slate-500" /> Desfazer
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Ctrl+Z</span>
      </button>
    </div>
  );
};
