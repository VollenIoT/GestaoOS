import React, { useState } from 'react';
import { X, ShieldCheck, Save, Clock, FileText, ArrowDownLeft, ArrowUpRight, Calculator } from 'lucide-react';

export interface WarrantyConfigData {
  defaultDays: string;
  defaultTerms: string;
  defaultCoverage: string;
  defaultEntryTerms?: string;
  defaultEstimateTerms?: string;
  defaultExitTerms?: string;
}

interface WarrantyConfigModalProps {
  isOpen: boolean;
  defaultDays: string;
  defaultTerms: string;
  defaultCoverage: string;
  defaultEntryTerms?: string;
  defaultEstimateTerms?: string;
  defaultExitTerms?: string;
  initialTab?: 'ENTRY' | 'ESTIMATE' | 'EXIT';
  onClose: () => void;
  onSave: (newConfig: WarrantyConfigData) => void;
}

export const WarrantyConfigModal: React.FC<WarrantyConfigModalProps> = ({
  isOpen,
  defaultDays,
  defaultTerms,
  defaultCoverage,
  defaultEntryTerms = 'O cliente autoriza a realização da avaliação e diagnóstico técnico no equipamento descrito neste comprovante. Equipamentos não retirados em até 90 dias após notificação de conclusão/orçamento estarão sujeitos a taxas de guarda/armazenamento ou descarte conforme a legislação vigente.',
  defaultEstimateTerms = 'O orçamento possui validade de 10 dias úteis a contar da data de emissão. Os serviços e peças discriminados estão sujeitos à aprovação prévia do cliente.',
  defaultExitTerms = 'A garantia cobre exclusivamente os serviços executados e as peças substituídas identificadas neste documento pelo período estabelecido. Não cobre danos causados por mau uso, quedas, oscilações elétricas, umidade ou intervenção de terceiros.',
  initialTab = 'ENTRY',
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'ENTRY' | 'ESTIMATE' | 'EXIT'>(initialTab);
  const [days, setDays] = useState(defaultDays);
  const [terms, setTerms] = useState(defaultTerms);
  const [coverage, setCoverage] = useState(defaultCoverage);
  const [entryTerms, setEntryTerms] = useState(defaultEntryTerms);
  const [estimateTerms, setEstimateTerms] = useState(defaultEstimateTerms);
  const [exitTerms, setExitTerms] = useState(defaultExitTerms);

  React.useEffect(() => {
    if (isOpen) {
      setDays(defaultDays);
      setTerms(defaultTerms);
      setCoverage(defaultCoverage);
      setEntryTerms(defaultEntryTerms || 'O cliente autoriza a realização da avaliação e diagnóstico técnico no equipamento descrito neste comprovante. Equipamentos não retirados em até 90 dias após notificação de conclusão/orçamento estarão sujeitos a taxas de guarda/armazenamento ou descarte conforme a legislação vigente.');
      setEstimateTerms(defaultEstimateTerms || 'O orçamento possui validade de 10 dias úteis a contar da data de emissão. Os serviços e peças discriminados estão sujeitos à aprovação prévia do cliente.');
      setExitTerms(defaultExitTerms || defaultTerms || 'A garantia cobre exclusivamente os serviços executados e as peças substituídas identificadas neste documento pelo período estabelecido. Não cobre danos causados por mau uso, quedas, oscilações elétricas, umidade ou intervenção de terceiros.');
      if (initialTab) setActiveTab(initialTab);
    }
  }, [isOpen, defaultDays, defaultTerms, defaultCoverage, defaultEntryTerms, defaultEstimateTerms, defaultExitTerms, initialTab]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const configPayload = {
      defaultDays: days,
      defaultTerms: terms,
      defaultCoverage: coverage,
      defaultEntryTerms: entryTerms,
      defaultEstimateTerms: estimateTerms,
      defaultExitTerms: exitTerms,
      updatedAt: new Date().toISOString(),
    };

    try {
      const { setDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');
      await setDoc(doc(db, 'system_config', 'warranty_config'), configPayload, { merge: true }).catch(() => null);
    } catch (err) {
      console.warn('Erro ao salvar termos no Firestore:', err);
    }

    onSave(configPayload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-700" />
            Configurações de OS &gt; Termos dos Comprovantes
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Superiores de Seleção de Termo */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('ENTRY')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all cursor-pointer ${
              activeTab === 'ENTRY'
                ? 'bg-white border-slate-300 text-sky-700 shadow-xs -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-sky-600" />
            Termos de Entrada (Comprovante de Entrada)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ESTIMATE')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all cursor-pointer ${
              activeTab === 'ESTIMATE'
                ? 'bg-white border-slate-300 text-indigo-700 shadow-xs -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calculator className="w-4 h-4 text-indigo-600" />
            Termos de Orçamento (Proposta)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EXIT')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all cursor-pointer ${
              activeTab === 'EXIT'
                ? 'bg-white border-slate-300 text-emerald-700 shadow-xs -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            Termos de Saída / Garantia
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="p-4 space-y-4 text-xs font-sans max-h-[80vh] overflow-y-auto">
          {/* ABA 1: TERMOS DE ENTRADA */}
          {activeTab === 'ENTRY' && (
            <div className="bg-sky-50/80 p-3.5 rounded-xl border border-sky-200 space-y-2">
              <label className="block text-xs font-bold text-sky-950 flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4 text-sky-700" /> Cláusulas e Termos do Comprovante de Entrada *
              </label>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Este texto será impresso nas <strong>duas vias</strong> (via da empresa e via do cliente) no <strong>Comprovante de Entrada da OS</strong> quando o aparelho for recebido.
              </p>
              <textarea
                rows={5}
                value={entryTerms}
                onChange={(e) => setEntryTerms(e.target.value)}
                placeholder="Digite o texto de termos e condições que deve sair no Comprovante de Entrada..."
                className="w-full bg-white border border-sky-300 rounded-lg p-2.5 text-slate-800 font-medium focus:outline-none focus:border-sky-600 text-xs"
              />
            </div>
          )}

          {/* ABA 2: TERMOS DE ORÇAMENTO */}
          {activeTab === 'ESTIMATE' && (
            <div className="bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-200 space-y-2">
              <label className="block text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-indigo-700" /> Cláusulas e Validade da Proposta de Orçamento *
              </label>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Este texto será impresso no rodapé da folha de <strong>Proposta de Orçamento Comercial</strong> entregue ou enviada para aprovação do cliente.
              </p>
              <textarea
                rows={5}
                value={estimateTerms}
                onChange={(e) => setEstimateTerms(e.target.value)}
                placeholder="Digite o texto padrão de validade e condições comerciais da proposta de orçamento..."
                className="w-full bg-white border border-indigo-300 rounded-lg p-2.5 text-slate-800 font-medium focus:outline-none focus:border-indigo-600 text-xs"
              />
            </div>
          )}

          {/* ABA 3: TERMOS DE SAÍDA / GARANTIA */}
          {activeTab === 'EXIT' && (
            <div className="space-y-3">
              <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 space-y-2">
                <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-emerald-700" /> Termo de Garantia e Entrega (Comprovante de Saída) *
                </label>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Este texto será impresso no <strong>Comprovante de Saída / Entrega</strong> quando a OS for finalizada e o aparelho for entregue ao cliente.
                </p>
                <textarea
                  rows={6}
                  value={exitTerms}
                  onChange={(e) => {
                    setExitTerms(e.target.value);
                    setTerms(e.target.value);
                  }}
                  placeholder="Digite o texto padrão dos termos de garantia e entrega..."
                  className="w-full bg-white border border-emerald-300 rounded-lg p-2.5 text-slate-800 font-medium focus:outline-none focus:border-emerald-600 text-xs"
                />
              </div>
            </div>
          )}

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
              className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" /> Salvar Termos de OS
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
