import React, { useState } from 'react';
import { X, ShieldCheck, Save, Clock, FileText } from 'lucide-react';

interface WarrantyConfigModalProps {
  isOpen: boolean;
  defaultDays: string;
  defaultTerms: string;
  defaultCoverage: string;
  defaultEstimateTerms?: string;
  onClose: () => void;
  onSave: (newConfig: { defaultDays: string; defaultTerms: string; defaultCoverage: string; defaultEstimateTerms: string }) => void;
}

export const WarrantyConfigModal: React.FC<WarrantyConfigModalProps> = ({
  isOpen,
  defaultDays,
  defaultTerms,
  defaultCoverage,
  defaultEstimateTerms = 'O orçamento possui validade de 10 dias. Equipamentos não retirados em até 90 dias após notificação estarão sujeitos a taxas de armazenamento ou descarte nos termos da lei.',
  onClose,
  onSave,
}) => {
  const [days, setDays] = useState(defaultDays);
  const [terms, setTerms] = useState(defaultTerms);
  const [coverage, setCoverage] = useState(defaultCoverage);
  const [estimateTerms, setEstimateTerms] = useState(defaultEstimateTerms);

  React.useEffect(() => {
    if (isOpen) {
      setDays(defaultDays);
      setTerms(defaultTerms);
      setCoverage(defaultCoverage);
      setEstimateTerms(defaultEstimateTerms || 'O orçamento possui validade de 10 dias. Equipamentos não retirados em até 90 dias após notificação estarão sujeitos a taxas de armazenamento ou descarte nos termos da lei.');
    }
  }, [isOpen, defaultDays, defaultTerms, defaultCoverage, defaultEstimateTerms]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      defaultDays: days,
      defaultTerms: terms,
      defaultCoverage: coverage,
      defaultEstimateTerms: estimateTerms,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            Configurações de OS &gt; Termos de Garantia & Orçamento
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário de Configuração Padrão */}
        <form onSubmit={handleSave} className="p-4 space-y-4 text-xs font-sans max-h-[85vh] overflow-y-auto">
          {/* TERMOS DE ORÇAMENTO (EXIBIDO NO COMPROVANTE DE ENTRADA) */}
          <div className="bg-sky-50/80 p-3 rounded-xl border border-sky-200 space-y-1.5">
            <label className="block text-xs font-bold text-sky-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-sky-700" /> Termo de Orçamento Padrão (Exibido no Comprovante de Entrada) *
            </label>
            <p className="text-[10.5px] text-slate-600">
              Este texto será impresso nas vias da empresa e do cliente no Comprovante de Entrada da OS.
            </p>
            <textarea
              rows={3}
              value={estimateTerms}
              onChange={(e) => setEstimateTerms(e.target.value)}
              placeholder="Digite o texto de termos de orçamento para a impressão do comprovante de entrada..."
              className="w-full bg-white border border-sky-300 rounded-lg p-2.5 text-slate-800 font-medium focus:outline-none focus:border-sky-600 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-600" /> Tempo de Garantia Padrão
              </label>
              <select
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-purple-600 cursor-pointer text-xs"
              >
                <option value="30">30 Dias (1 Mês)</option>
                <option value="90">90 Dias (3 Meses - Legal)</option>
                <option value="180">180 Dias (6 Meses)</option>
                <option value="365">365 Dias (1 Ano)</option>
                <option value="CUSTOM">Personalizado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Abrangência de Cobertura Padrão
              </label>
              <select
                value={coverage}
                onChange={(e) => setCoverage(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-purple-600 cursor-pointer text-xs"
              >
                <option value="PECAS_E_MAO_DE_OBRA">Peças Substituídas & Mão de Obra</option>
                <option value="APENAS_MAO_DE_OBRA">Apenas Mão de Obra</option>
                <option value="APENAS_PECAS">Apenas Peças Substituídas</option>
                <option value="SERVICO_ESPECIFICO">Serviço Específico Realizado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-purple-600" /> Cláusulas e Texto Padrão dos Termos de Garantia
            </label>
            <textarea
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Digite o texto padrão dos termos de garantia que será inserido nas novas OS..."
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium focus:outline-none focus:border-purple-600 text-xs"
            />
          </div>

          {/* Rodapé do Modal com Botão Salvar */}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" /> Salvar Configurações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
