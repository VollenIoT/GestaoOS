import React, { useState } from 'react';
import { X, FileText, ChevronRight, Wrench } from 'lucide-react';
import { StatusBadge } from './Dashboard';

interface ClientOrdersHistoryModalProps {
  isOpen: boolean;
  clientName: string;
  orders: any[];
  onClose: () => void;
  onSelectOrder: (order: any) => void;
}

export const ClientOrdersHistoryModal: React.FC<ClientOrdersHistoryModalProps> = ({
  isOpen,
  clientName,
  orders,
  onClose,
  onSelectOrder,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header do Modal */}
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-700" />
            Histórico de OS do Cliente: <strong className="text-sky-800">{clientName}</strong>
          </h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Ordens de Serviço (Abertas e Finalizadas) */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3 bg-slate-50">
          <p className="text-xs font-semibold text-slate-600 mb-2">
            Clique em qualquer Ordem de Serviço para abri-la diretamente:
          </p>

          {orders.map((os) => (
            <div
              key={os.id}
              onClick={() => {
                onSelectOrder(os);
                onClose();
              }}
              className="bg-white border border-slate-200 hover:border-sky-500 p-4 rounded-xl flex items-center justify-between cursor-pointer shadow-sm hover:shadow-md transition-all hover:bg-sky-50/50"
            >
              <div className="flex items-start gap-3">
                <span className="font-mono font-bold text-sky-700 bg-sky-100 border border-sky-200 px-2.5 py-1 rounded text-xs">
                  {os.code}
                </span>

                <div className="space-y-0.5">
                  <p className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-slate-400" />
                    {os.equipment?.type} - {os.equipment?.brand} ({os.equipment?.model || 'Modelo N/A'})
                  </p>
                  <p className="text-xs text-slate-600 truncate max-w-md">
                    Problema: {os.problemDescription}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={os.status} />
                <button
                  type="button"
                  className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"
                >
                  Abrir OS
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {orders.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs">
              Nenhuma Ordem de Serviço (Aberta ou Finalizada) foi encontrada para este cliente.
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};
