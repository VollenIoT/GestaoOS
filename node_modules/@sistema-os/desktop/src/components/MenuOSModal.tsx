import React, { useState, useEffect } from 'react';
import { X, PlusCircle, FileText, CheckCircle2, Search, Wrench, User, MapPin } from 'lucide-react';
import { matchesSearchTerm } from '../utils/searchUtils';

interface MenuOSModalProps {
  isOpen: boolean;
  orders: any[];
  onClose: () => void;
  onOpenCreateOS: () => void;
  onOpenOpenOrdersModal: () => void;
  onOpenFinishedOrdersModal: () => void;
  onOpenSearchOS?: () => void;
}

export const MenuOSModal: React.FC<MenuOSModalProps> = ({
  isOpen,
  orders,
  onClose,
  onOpenCreateOS,
  onOpenOpenOrdersModal,
  onOpenFinishedOrdersModal,
  onOpenSearchOS,
}) => {
  const [selectedView, setSelectedView] = useState<'FINALIZED' | 'SEARCH' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fechar com a tecla ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredOrders = orders.filter((os) => {
    const matchesSearch =
      matchesSearchTerm(os.code, searchTerm) ||
      matchesSearchTerm(os.client?.name, searchTerm) ||
      matchesSearchTerm(os.equipment?.type, searchTerm);

    if (selectedView === 'FINALIZED') {
      return matchesSearch && (os.status === 'FINALIZADA' || os.status === 'CONCLUIDA');
    }
    return matchesSearch;
  });

  const handleCloseModal = () => {
    setSelectedView(null);
    setSearchTerm('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header do Modal */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-sky-600" />
            Menu de Ordens de Serviço
          </h2>
          <button onClick={handleCloseModal} className="text-slate-500 hover:text-slate-800 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Botões GRANDES para Escolha Inicial */}
        <div className="p-6 bg-slate-50 grid grid-cols-2 gap-4">
          {/* 1. Criar Nova OS */}
          <button
            onClick={() => {
              handleCloseModal();
              onOpenCreateOS();
            }}
            className="h-28 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-2xl p-4 font-bold text-sm flex flex-col items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-7 h-7" />
            Criar Nova OS
          </button>

          {/* 2. OS em Aberto (Abre o Modal Dedicado de OS em Aberto) */}
          <button
            onClick={() => {
              handleCloseModal();
              onOpenOpenOrdersModal();
            }}
            className="h-28 bg-gradient-to-br from-sky-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 text-white rounded-2xl p-4 font-bold text-sm flex flex-col items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <FileText className="w-7 h-7" />
            OS em Aberto
          </button>

          {/* 3. OS Finalizadas */}
          <button
            onClick={() => {
              handleCloseModal();
              onOpenFinishedOrdersModal();
            }}
            className="h-28 rounded-2xl p-4 font-bold text-sm flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-emerald-600/20"
          >
            <CheckCircle2 className="w-7 h-7" />
            OS Finalizadas
          </button>

          {/* 4. Buscar OS (Abre o Campo direto de Busca da OS) */}
          <button
            onClick={() => {
              handleCloseModal();
              if (onOpenSearchOS) onOpenSearchOS();
            }}
            className="h-28 rounded-2xl p-4 font-bold text-sm flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-purple-500/20"
          >
            <Search className="w-7 h-7" />
            Buscar OS
          </button>
        </div>

        {/* Exibe a lista SOMENTE APÓS uma das opções ser clicada pelo usuário */}
        {selectedView && (
          <div className="border-t border-slate-200">
            {/* Campo de Pesquisa em Tempo Real */}
            <div className="p-3 bg-white border-b border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digitar filtro de busca (ex: código OS-0001, cliente ou aparelho)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Lista Filtrada */}
            <div className="p-4 max-h-[300px] overflow-y-auto space-y-3 bg-slate-100/50">
              {filteredOrders.map((os) => (
                <div
                  key={os.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-sky-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                      {os.code}
                    </span>

                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${os.status === 'FINALIZADA' || os.status === 'CONCLUIDA'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                    >
                      {os.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs text-slate-700">
                    <p className="flex items-center gap-1.5 font-bold text-slate-900">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {os.client?.name} ({os.client?.phone})
                    </p>

                    <p className="flex items-center gap-1.5 text-slate-600">
                      <Wrench className="w-3.5 h-3.5 text-slate-400" />
                      {os.equipment?.type} - {os.equipment?.brand}
                    </p>
                  </div>
                </div>
              ))}

              {filteredOrders.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhuma Ordem de Serviço encontrada para esta opção.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
