import React, { useState } from 'react';
import { X, Search, CheckCircle2, Clock, FileText, Wrench, User, Calendar, MapPin } from 'lucide-react';

interface OrderListModalProps {
  isOpen: boolean;
  mode: 'SEARCH' | 'OPEN' | 'FINALIZED';
  orders: any[];
  onClose: () => void;
}

export const OrderListModal: React.FC<OrderListModalProps> = ({
  isOpen,
  mode,
  orders,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Filtragem conforme o modo solicitado
  const filteredOrders = orders.filter((os) => {
    // Filtro por termo de busca (Código, Nome do Cliente ou Equipamento)
    const matchesSearch =
      os.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.equipment?.type.toLowerCase().includes(searchTerm.toLowerCase());

    if (mode === 'OPEN') {
      return matchesSearch && (os.status === 'ABERTA' || os.status === 'EM_ATENDIMENTO');
    }
    if (mode === 'FINALIZED') {
      return matchesSearch && (os.status === 'FINALIZADA' || os.status === 'CONCLUIDA');
    }
    return matchesSearch; // Modo 'SEARCH' busca em todas
  });

  const getTitle = () => {
    switch (mode) {
      case 'SEARCH':
        return '🔍 Consultar e Buscar Ordem de Serviço';
      case 'OPEN':
        return '📋 Relatório de Ordens de Serviço em Aberto';
      case 'FINALIZED':
        return '✅ Relatório de Ordens de Serviço Finalizadas';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header do Modal */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {getTitle()}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Busca de OS */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o código da OS (ex: OS-0001), nome do cliente ou equipamento..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Lista de Ordens de Serviço */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {filteredOrders.map((os) => (
            <div
              key={os.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950/60 border border-sky-800/50 px-2.5 py-1 rounded-md">
                  {os.code}
                </span>

                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border ${os.status === 'FINALIZADA' || os.status === 'CONCLUIDA'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                >
                  {os.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-300 mt-2">
                <p className="flex items-center gap-1.5 font-medium text-white">
                  <User className="w-4 h-4 text-slate-400" />
                  {os.client?.name} ({os.client?.phone})
                </p>

                <p className="flex items-center gap-1.5 text-slate-400">
                  <Wrench className="w-4 h-4 text-slate-400" />
                  {os.equipment?.type} - {os.equipment?.brand} ({os.equipment?.model})
                </p>

                <p className="flex items-center gap-1.5 text-xs text-slate-400 col-span-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {os.client?.address}, {os.client?.number} - {os.client?.neighborhood} ({os.client?.city})
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Problema: <strong className="text-slate-300">{os.problemDescription}</strong></span>
                <span className="font-bold text-sky-400">
                  Valor Total: R$ {os.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          ))}

          {filteredOrders.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">
              Nenhuma Ordem de Serviço encontrada para o filtro selecionado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
