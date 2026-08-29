import React, { useState } from 'react';
import { X, Search, AlertCircle, ArrowRight } from 'lucide-react';
import { matchesSearchTerm } from '../utils/searchUtils';

interface SearchOSModalProps {
  isOpen: boolean;
  orders: any[];
  onClose: () => void;
  onSelectOrder: (order: any) => void;
}

export const SearchOSModal: React.FC<SearchOSModalProps> = ({
  isOpen,
  orders,
  onClose,
  onSelectOrder,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setInputVal('');
        setErrorMessage('');
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const rawInput = inputVal.trim();
    if (!rawInput) {
      setErrorMessage('Por favor, digite o número da OS ou o nome do cliente.');
      return;
    }

    // Extrai os dígitos do input (ex: "OS-0002" ou "0002" ou "2" -> searchNum = 2)
    const digitsOnly = rawInput.replace(/\D/g, '');
    const hasDigits = digitsOnly.length > 0;
    const searchNum = hasDigits ? parseInt(digitsOnly, 10) : NaN;
    const inputUpper = rawInput.toUpperCase().trim();

    // 1. PRIORIDADE MÁXIMA: Busca por número / código de OS
    let foundOrder = null;

    if (hasDigits && !isNaN(searchNum)) {
      // 1.1 Tenta casamento exato pelo número sequencial do código (ex: "OS-0002" vs 2)
      foundOrder = orders.find((os) => {
        if (!os || !os.code) return false;
        const codeDigits = String(os.code).replace(/\D/g, '');
        return codeDigits && parseInt(codeDigits, 10) === searchNum;
      });

      // 1.2 Tenta casamento de código direto como string (ex: "OS-0002" ou "0002")
      if (!foundOrder) {
        foundOrder = orders.find((os) => {
          if (!os || !os.code) return false;
          const codeUpper = String(os.code).toUpperCase().trim();
          return codeUpper === inputUpper || codeUpper === `OS-${digitsOnly.padStart(4, '0')}`;
        });
      }
    }

    // 2. Tenta casamento por nome do cliente
    if (!foundOrder) {
      foundOrder = orders.find((os) => {
        if (!os || !os.client?.name) return false;
        return matchesSearchTerm(os.client.name, rawInput);
      });
    }

    // 3. Tenta casamento por telefone ou WhatsApp
    if (!foundOrder && hasDigits) {
      foundOrder = orders.find((os) => {
        if (!os || !os.client) return false;
        const phoneDigits = String(os.client.phone || '').replace(/\D/g, '');
        const wppDigits = String(os.client.whatsapp || '').replace(/\D/g, '');
        return (digitsOnly.length >= 4 && (phoneDigits.includes(digitsOnly) || wppDigits.includes(digitsOnly)));
      });
    }

    // 4. Tenta casamento por ID específico caso seja digitado
    if (!foundOrder) {
      foundOrder = orders.find((os) => os && String(os.id).trim() === rawInput);
    }

    if (foundOrder) {
      onSelectOrder(foundOrder);
      setInputVal('');
      setErrorMessage('');
      onClose();
    } else {
      setErrorMessage(`A Ordem de Serviço "${rawInput}" não foi encontrada no sistema.`);
    }
  };

  const handleClose = () => {
    setInputVal('');
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans text-xs flex flex-col animate-fadeIn">
        {/* Cabeçalho */}
        <div className="p-3.5 bg-sky-700 text-white flex items-center justify-between">
          <h3 className="font-bold text-xs flex items-center gap-2">
            <Search className="w-4 h-4 text-sky-200" />
            <span>Buscar e Abrir Ordem de Serviço</span>
            <span className="text-[10px] bg-sky-800/80 text-sky-100 border border-sky-600 font-mono font-semibold px-1.5 py-0.5 rounded ml-1 shadow-2xs">
              F7
            </span>
          </h3>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo com Campo de Busca */}
        <form onSubmit={handleSearch} className="p-5 bg-slate-50 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Digite o Número da OS e pressione ENTER:
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 font-mono font-bold text-slate-400 text-xs select-none">
                OS #
              </span>
              <input
                type="text"
                autoFocus
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Ex: 1, 0001, OS-0001..."
                className="w-full bg-white border-2 border-sky-600 rounded-xl pl-12 pr-10 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
              />
              <button
                type="submit"
                className="absolute right-2 p-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-all cursor-pointer shadow-xs"
                title="Buscar OS"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-medium pt-0.5">
              Dica: Digite apenas o número (ex: 1 para OS-0001). Zeros à esquerda são ignorados automaticamente.
            </p>
          </div>

          {/* Mensagem de Erro (OS Não Encontrada) */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-bold flex items-center gap-2 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Botões do Rodapé */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-all cursor-pointer text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer text-xs flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              Abrir OS
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
