import React, { useState } from 'react';
import { X, Save, User, Phone, Wrench, Clock, Eye, PlusCircle } from 'lucide-react';

interface EditOrderModalProps {
  isOpen: boolean;
  order: any;
  clients: any[];
  onClose: () => void;
  onSave: (updatedOrder: any) => void;
  onOpenCreateClient: () => void;
  onViewClientProfile: (client: any) => void;
  onOpenClientsModal: () => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  order,
  clients,
  onClose,
  onSave,
  onOpenCreateClient,
  onViewClientProfile,
  onOpenClientsModal,
}) => {
  if (!isOpen || !order) return null;

  const selectedClient =
    clients.find((c) => c.id === order.clientId) || order.client;

  // Estados dos Equipamentos e OS
  const [equipmentData, setEquipmentData] = useState({
    type: order.equipment?.type || '',
    brand: order.equipment?.brand || 'Brastemp',
    model: order.equipment?.model || '',
    serialNumber: order.equipment?.serialNumber || '',
  });

  const [problemDescription, setProblemDescription] = useState(order.problemDescription || '');
  const [status, setStatus] = useState(order.status || 'ABERTA');
  const [totalAmount, setTotalAmount] = useState(order.totalAmount || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedOrder = {
      ...order,
      clientId: selectedClient?.id || order.clientId,
      client: selectedClient,
      equipment: { ...order.equipment, ...equipmentData },
      problemDescription,
      status,
      totalAmount: parseFloat(String(totalAmount)),
    };

    onSave(updatedOrder);
    alert(`Ordem de Serviço ${order.code} atualizada com sucesso!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header do Modal */}
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold bg-sky-600 text-white px-3 py-1 rounded-lg">
              {order.code}
            </span>
            <h2 className="text-base font-bold text-slate-800">
              Edição da Ordem de Serviço
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form de Edição */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50 text-xs">
          {/* Seção Cliente Limpa sem Lista Exposta */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4" /> Cliente da Ordem de Serviço
              </h3>

              <div className="flex items-center gap-2">
                {/* Botão para Abrir o Modal Clientes */}
                <button
                  type="button"
                  onClick={onOpenClientsModal}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  Selecionar / Buscar Cliente
                </button>

                {/* Botão para ir para Cadastro de Cliente */}
                <button
                  type="button"
                  onClick={onOpenCreateClient}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Cadastrar Cliente
                </button>
              </div>
            </div>

            {/* Exibição Resumida de Nome, Telefone e Botão Consultar Ficha */}
            {selectedClient ? (
              <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Nome do Cliente</span>
                    <p className="text-sm font-bold text-slate-900">{selectedClient.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Telefone / Whats</span>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {selectedClient.phone}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onViewClientProfile(selectedClient)}
                  className="bg-white hover:bg-sky-100 text-sky-700 border border-sky-300 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-sky-600" />
                  Consultar Ficha do Cliente
                </button>
              </div>
            ) : (
              <div className="text-center py-4 text-slate-400">
                Nenhum cliente associado. Clique no botão acima para selecionar um cliente.
              </div>
            )}
          </div>

          {/* Seção Equipamento e Defeito */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Wrench className="w-4 h-4" /> Equipamento & Defeito Relatado
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Aparelho</label>
                <select
                  value={equipmentData.type}
                  onChange={(e) => setEquipmentData({ ...equipmentData, type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-sky-600"
                >
                  <option value="Geladeira Frost Free">Geladeira Frost Free</option>
                  <option value="Lava e Seca">Lava e Seca</option>
                  <option value="Máquina de Lavar">Máquina de Lavar</option>
                  <option value="Micro-ondas">Micro-ondas</option>
                  <option value="Fogão / Cooktop">Fogão / Cooktop</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Marca</label>
                <select
                  value={equipmentData.brand}
                  onChange={(e) => setEquipmentData({ ...equipmentData, brand: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-sky-600"
                >
                  <option value="Brastemp">Brastemp</option>
                  <option value="Electrolux">Electrolux</option>
                  <option value="Samsung">Samsung</option>
                  <option value="LG">LG</option>
                  <option value="Consul">Consul</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Modelo</label>
                <input
                  type="text"
                  value={equipmentData.model}
                  onChange={(e) => setEquipmentData({ ...equipmentData, model: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-sky-600"
                />
              </div>

              <div className="col-span-3">
                <label className="block font-bold text-slate-700 mb-1">Descrição do Defeito</label>
                <textarea
                  rows={3}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-sky-600"
                />
              </div>
            </div>
          </div>

          {/* Seção Status e Valores */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Clock className="w-4 h-4" /> Status & Valor Total
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status da Ordem</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-sky-600"
                >
                  <option value="ABERTA">ABERTA</option>
                  <option value="EM_ATENDIMENTO">EM ATENDIMENTO</option>
                  <option value="AGUARDANDO_APROVACAO">AGUARDANDO APROVAÇÃO</option>
                  <option value="FINALIZADA">FINALIZADA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Valor Total R$</label>
                <input
                  type="number"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-sky-600"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Salvar Alterações da OS
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
