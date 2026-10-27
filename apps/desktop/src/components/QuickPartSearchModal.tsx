import React, { useState, useEffect, useRef } from 'react';
import { X, Search, AlertTriangle } from 'lucide-react';
import { modalStack } from '../utils/modalStack';
import { Part } from './PartsModal';
import { useCatalogStore } from '../stores/useCatalogStore';
import { matchesSearchTerm, normalizeSearchText } from '../utils/searchUtils';

interface QuickPartSearchModalProps {
  isOpen: boolean;
  parts: Part[];
  currentUser?: any;
  onClose: () => void;
  onViewPart: (part: Part) => void;
}

export const QuickPartSearchModal: React.FC<QuickPartSearchModalProps> = ({
  isOpen,
  parts,
  currentUser,
  onClose,
  onViewPart,
}) => {
  const catalogParts = useCatalogStore((s) => s.parts);
  const effectiveParts: Part[] = (parts && parts.length > 0) ? parts : (catalogParts || []);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Registrar na pilha de modais para tecla ESC
  useEffect(() => {
    if (isOpen) {
      modalStack.register('QuickPartSearchModal', () => onCloseRef.current?.());
      return () => {
        modalStack.unregister('QuickPartSearchModal');
      };
    }
  }, [isOpen]);

  // Limpa e foca no campo de busca ao abrir
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setErrorMessage(null);
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Verificação universal em qualquer campo da peça
  const matchPart = (part: Part, query: string): boolean => {
    const term = query.trim();
    if (!term) return false;

    // 1. Código local (com ou sem zeros à esquerda: "1" encontra "0001", "25" encontra "0025")
    if (matchesSearchTerm(part.code, term)) return true;

    // 2. Código de fabricante, código de barras e ID
    if (matchesSearchTerm(part.manufacturerCode, term)) return true;
    if (matchesSearchTerm(part.barcode, term)) return true;
    if (matchesSearchTerm(String(part.id || ''), term)) return true;

    // 3. Nome, marca, grupo, aplicação/compatibilidade, localização, fornecedor
    if (matchesSearchTerm(part.name, term)) return true;
    if (matchesSearchTerm(part.brand, term)) return true;
    if (matchesSearchTerm(part.group, term)) return true;
    if (matchesSearchTerm(part.application, term)) return true;
    if (matchesSearchTerm(part.compatibleModels, term)) return true;
    if (matchesSearchTerm(part.oemCrossReference, term)) return true;
    if (matchesSearchTerm(part.location, term)) return true;
    if (matchesSearchTerm(part.supplierName, term)) return true;

    // 4. Especificações técnicas (tensão, potência, corrente, material, rosca, etc.)
    if (matchesSearchTerm(part.voltage, term)) return true;
    if (matchesSearchTerm(part.power, term)) return true;
    if (matchesSearchTerm(part.current, term)) return true;
    if (matchesSearchTerm(part.capacitance, term)) return true;
    if (matchesSearchTerm(part.frequency, term)) return true;
    if (matchesSearchTerm(part.resistance, term)) return true;
    if (matchesSearchTerm(part.material, term)) return true;
    if (matchesSearchTerm(part.threadFitting, term)) return true;

    // 5. Atributos customizados extras
    if (Array.isArray(part.customAttributes)) {
      for (const attr of part.customAttributes) {
        if (attr && (matchesSearchTerm(attr.name, term) || matchesSearchTerm(attr.value, term))) {
          return true;
        }
      }
    }

    return false;
  };

  // Ao teclar Enter: busca a peça e abre diretamente a Ficha da Peça
  const handleSearchAndOpen = () => {
    const term = searchTerm.trim();
    if (!term) {
      setErrorMessage('Digite o nome, código ou aplicação da peça.');
      return;
    }

    const found = effectiveParts.find((p) => matchPart(p, term));

    if (found) {
      setErrorMessage(null);
      onClose();
      onViewPart(found); // Abre a Ficha da Peça (PartViewModal)
    } else {
      setErrorMessage(`Nenhuma peça encontrada com o termo "${term}".`);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchAndOpen();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[75] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-fadeIn">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-sky-600 to-indigo-700 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold leading-tight">
                  Buscar Ficha da Peça
                </h2>
                <span className="bg-white/20 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  F10
                </span>
              </div>
              <p className="text-[11px] text-sky-100 font-medium">
                Pressione Enter para abrir a ficha da peça
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificação de Erro / Não Encontrado */}
        {errorMessage && (
          <div className="bg-amber-500 text-white px-4 py-2 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-inner">
            <AlertTriangle className="w-4 h-4 text-amber-100 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Campo de Busca Simples */}
        <div className="p-5 space-y-4">
          <label className="block text-xs font-bold text-slate-700">
            Digite nome, código, código de barras, marca ou aplicação:
          </label>
          <div className="relative">
            <Search className="w-5 h-5 text-sky-600 absolute left-3.5 top-3" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setErrorMessage(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ex: 0001, compressor, 1/4, brastemp, bico, gaveta..."
              className="w-full bg-white border-2 border-sky-400 rounded-xl pl-11 pr-24 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 shadow-sm transition-all"
            />
            <button
              type="button"
              onClick={handleSearchAndOpen}
              className="absolute right-2 top-1.5 bottom-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <span>Buscar</span>
              <kbd className="bg-sky-800/60 px-1.5 py-0.5 rounded text-[10px] font-mono">↵</kbd>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            💡 <strong>Dica:</strong> Ao teclar <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] font-bold">Enter</kbd>, a ficha completa da peça correspondente será exibida diretamente.
          </p>
        </div>

        {/* Rodapé Simples */}
        <div className="px-5 py-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-sans">
          <span>Pressione <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-700 text-[10px] shadow-2xs">Esc</kbd> para cancelar</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
