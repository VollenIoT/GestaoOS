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

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const rawInput = inputVal.trim();
    if (!rawInput) {
      setErrorMessage('Por favor, digite o número da OS ou o nome do cliente.');
      return;
    }

    // Extrai os dígitos do input (ex: "OS-0001" ou "0001" ou "1" -> 1)
    const digitsOnly = rawInput.replace(/\D/g, '');
    const searchNum = parseInt(digitsOnly, 10);

    // Encontra a OS ignorando zeros à esquerda, prefixos e acentos no nome
    const foundOrder = orders.find((os) => {
      if (!os) return false;

      // Se comparando por código (ex: OS-0001)
      if (os.code) {
        const codeDigits = (os.code || '').replace(/\D/g, '');
        if (codeDigits && !isNaN(searchNum) && parseInt(codeDigits, 10) === searchNum) {
          return true;
        }
        if (matchesSearchTerm(os.code, rawInput)) {
          return true;
        }
      }

      // Se comparando por ID numérico ou string
      if (os.id) {
        const idDigits = String(os.id).replace(/\D/g, '');
        if (idDigits && !isNaN(searchNum) && parseInt(idDigits, 10) === searchNum) {
          return true;
        }
        if (matchesSearchTerm(String(os.id), rawInput)) {
          return true;
        }
      }

      // Se comparando por nome do cliente (com suporte a busca sem acentos)
      if (os.client?.name && matchesSearchTerm(os.client.name, rawInput)) {
        return true;
      }

      return false;
    });

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
