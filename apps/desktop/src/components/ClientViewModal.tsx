import React, { useState } from 'react';
import { X, UserCheck, Eye, PlusCircle, User } from 'lucide-react';

interface ClientViewModalProps {
  isOpen: boolean;
  client: any;
  onClose: () => void;
}

export const ClientViewModal: React.FC<ClientViewModalProps> = ({
  isOpen,
  client,
  onClose,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans">
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <User className="w-4 h-4 text-sky-700" />
            Ficha de Cadastro do Cliente
          </h3>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs text-slate-700">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Nome do Cliente</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{client.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Telefone / Whats</p>
              <p className="font-semibold text-slate-800 mt-0.5">{client.phone || 'N/A'}</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">E-mail</p>
              <p className="font-semibold text-slate-800 truncate mt-0.5">{client.email || 'N/A'}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Endereço Completo</p>
            <p className="font-medium text-slate-800">
              {client.address}, nº {client.number}
            </p>
            <p className="text-slate-600">
              Bairro: {client.neighborhood} • CEP: {client.cep}
            </p>
            <p className="text-slate-600">
              Cidade: {client.city} - {client.state}
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold"
          >
            Fechar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
