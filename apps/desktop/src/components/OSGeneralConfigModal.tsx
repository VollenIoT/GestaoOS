import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Save,
  Sliders,
  ShieldCheck,
  Printer,
  Bell,
  CheckCircle2,
  HelpCircle,
  FileText,
  UserCheck,
} from 'lucide-react';

export interface OSPreferences {
  initialOrderNumber?: string;
  defaultType: 'ORCAMENTO' | 'AGENDAMENTO';
  defaultWarrantyType: 'NAO_SE_APLICA' | 'GARANTIA_LOJA' | 'GARANTIA_FABRICA';
  defaultWarrantyDays: string;
  defaultTravelCost: string;
  defaultTechnicianName: string;
  requirePhone: boolean;
  requireProblemDescription: boolean;
  allowEmptyItems: boolean;
  autoCapsLock: boolean;
  printCopies: number;
  showItemPricesOnPrint: boolean;
  showCompanyHeaderOnPrint: boolean;
  customPrintFooter: string;
}

export const defaultOSPreferences: OSPreferences = {
  initialOrderNumber: '1',
  defaultType: 'ORCAMENTO',
  defaultWarrantyType: 'GARANTIA_LOJA',
  defaultWarrantyDays: '90',
  defaultTravelCost: '0,00',
  defaultTechnicianName: '',
  requirePhone: true,
  requireProblemDescription: true,
  allowEmptyItems: true,
  autoCapsLock: true,
  printCopies: 1,
  showItemPricesOnPrint: true,
  showCompanyHeaderOnPrint: true,
  customPrintFooter: 'Obrigado pela preferência! Guarde este comprovante para efeito de garantia.',
};

interface OSGeneralConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (prefs: OSPreferences) => void;
}

export const OSGeneralConfigModal: React.FC<OSGeneralConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [prefs, setPrefs] = useState<OSPreferences>(() => {
    try {
      const saved = localStorage.getItem('vollen_os_preferences');
      if (saved) return { ...defaultOSPreferences, ...JSON.parse(saved) };
    } catch { }
    return defaultOSPreferences;
  });

  const [technicians, setTechnicians] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'geral' | 'bloqueios' | 'impressao'>('geral');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('vollen_os_preferences');
        if (saved) setPrefs({ ...defaultOSPreferences, ...JSON.parse(saved) });

        const techs = localStorage.getItem('vollen_technicians');
        if (techs) setTechnicians(JSON.parse(techs));
      } catch { }
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('vollen_os_preferences', JSON.stringify(prefs));
      if (onSave) onSave(prefs);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Erro ao salvar preferências de OS:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 select-none font-sans text-xs"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-300 rounded-2xl w-full max-w-2xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 bg-gradient-to-r from-sky-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Configurações e Parâmetros de OS</h2>
              <p className="text-[10.5px] text-sky-200">
                Personalize os comportamentos, valores e regras padrão das Ordens de Serviço
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Superiores */}
        <div className="flex border-b border-slate-200 bg-slate-100 px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`px-3.5 py-2 font-bold rounded-t-xl transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
              activeTab === 'geral'
                ? 'bg-white text-sky-700 border-t-2 border-sky-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Padrões da Ficha de OS
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bloqueios')}
            className={`px-3.5 py-2 font-bold rounded-t-xl transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
              activeTab === 'bloqueios'
                ? 'bg-white text-sky-700 border-t-2 border-sky-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Regras & Bloqueios
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('impressao')}
            className={`px-3.5 py-2 font-bold rounded-t-xl transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
              activeTab === 'impressao'
                ? 'bg-white text-sky-700 border-t-2 border-sky-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            Impressão & Comprovante
          </button>
        </div>

        {/* Formulário com Rolagem */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1 bg-slate-50">
          {/* ABA 1: PADRÕES DA FICHA DE OS */}
          {activeTab === 'geral' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                {/* Tipo Padrão de OS */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block font-bold text-slate-700 mb-1">
                    Tipo Inicial ao Abrir Nova OS:
                  </label>
                  <select
                    value={prefs.defaultType}
                    onChange={(e) => setPrefs({ ...prefs, defaultType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-sky-600 cursor-pointer"
                  >
                    <option value="ORCAMENTO">Orçamento (Padrão)</option>
                    <option value="AGENDAMENTO">Agendamento / Visita</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Define qual botão virá marcado automaticamente ao clicar em "Nova OS".
                  </p>
                </div>

                {/* Tipo Padrão de Garantia */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block font-bold text-slate-700 mb-1">
                    Garantia Sugerida na OS:
                  </label>
                  <select
                    value={prefs.defaultWarrantyType}
                    onChange={(e) => setPrefs({ ...prefs, defaultWarrantyType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-sky-600 cursor-pointer"
                  >
                    <option value="GARANTIA_LOJA">Garantia da Loja / Oficina</option>
                    <option value="NAO_SE_APLICA">Não se Aplica (Fora de Garantia)</option>
                    <option value="GARANTIA_FABRICA">Garantia de Fábrica</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Opção pré-selecionada na seção de garantia da ficha de atendimento.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Prazo Padrão de Garantia (Dias) */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block font-bold text-slate-700 mb-1">
                    Prazo Padrão da Garantia:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="3650"
                      value={prefs.defaultWarrantyDays}
                      onChange={(e) => setPrefs({ ...prefs, defaultWarrantyDays: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-sky-600 text-center"
                    />
                    <span className="font-bold text-slate-600 shrink-0">Dias</span>
                  </div>
                </div>

                {/* Deslocamento / Visita Padrão */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block font-bold text-slate-700 mb-1">
                    Taxa Deslocamento (R$):
                  </label>
                  <input
                    type="text"
                    value={prefs.defaultTravelCost}
                    onChange={(e) => setPrefs({ ...prefs, defaultTravelCost: e.target.value })}
                    placeholder="0,00"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-sky-600 text-right"
                  />
                </div>

                {/* Técnico Responsável Inicial */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block font-bold text-slate-700 mb-1">
                    Técnico Padrão Inicial:
                  </label>
                  <select
                    value={prefs.defaultTechnicianName}
                    onChange={(e) => setPrefs({ ...prefs, defaultTechnicianName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-sky-600 cursor-pointer"
                  >
                    <option value="">Nenhum (selecionar na OS)</option>
                    {technicians.map((t) => (
                      <option key={t.id || t.code} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: REGRAS E BLOQUEIOS */}
          {activeTab === 'bloqueios' && (
            <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              {/* Exigir Telefone */}
              <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer border-b border-slate-100">
                <div>
                  <div className="font-bold text-slate-800 text-[11.5px]">
                    Exigir telefone / WhatsApp do cliente
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Impede que uma nova OS seja gravada sem ao menos um telefone de contato informado.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.requirePhone}
                  onChange={(e) => setPrefs({ ...prefs, requirePhone: e.target.checked })}
                  className="w-4 h-4 accent-sky-600 cursor-pointer"
                />
              </label>

              {/* Exigir Descrição do Problema */}
              <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer border-b border-slate-100">
                <div>
                  <div className="font-bold text-slate-800 text-[11.5px]">
                    Exigir defeito / problema relatado
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Obriga o preenchimento da descrição do problema relatado pelo cliente ao salvar.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.requireProblemDescription}
                  onChange={(e) => setPrefs({ ...prefs, requireProblemDescription: e.target.checked })}
                  className="w-4 h-4 accent-sky-600 cursor-pointer"
                />
              </label>

              {/* Permitir Salvar Sem Peças/Serviços */}
              <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer border-b border-slate-100">
                <div>
                  <div className="font-bold text-slate-800 text-[11.5px]">
                    Permitir salvar OS apenas com orçamento / sem peças lançadas
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Permite abrir a OS para avaliação técnica antes de adicionar os itens no financeiro.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.allowEmptyItems}
                  onChange={(e) => setPrefs({ ...prefs, allowEmptyItems: e.target.checked })}
                  className="w-4 h-4 accent-sky-600 cursor-pointer"
                />
              </label>

              {/* Caps Lock Automático */}
              <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800 text-[11.5px]">
                    Ativar trava de maiúsculas (Caps Lock Automático) por padrão
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Transforma automaticamente todos os campos de texto digitados em caixa alta padronizada.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.autoCapsLock}
                  onChange={(e) => setPrefs({ ...prefs, autoCapsLock: e.target.checked })}
                  className="w-4 h-4 accent-sky-600 cursor-pointer"
                />
              </label>
            </div>
          )}

          {/* ABA 3: IMPRESSÃO & COMPROVANTE */}
          {activeTab === 'impressao' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                {/* Número de Vias */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block font-bold text-slate-700 mb-1">
                    Número de Vias na Impressão:
                  </label>
                  <select
                    value={prefs.printCopies}
                    onChange={(e) => setPrefs({ ...prefs, printCopies: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-sky-600 cursor-pointer"
                  >
                    <option value="1">1 Via (Folha Única A4)</option>
                    <option value="2">2 Vias (Via do Cliente + Via da Oficina)</option>
                  </select>
                </div>

                {/* Mostrar Preço das Peças */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block font-bold text-slate-700 mb-1">
                    Detalhamento dos Itens no Recibo:
                  </label>
                  <label className="flex items-center gap-2 p-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.showItemPricesOnPrint}
                      onChange={(e) => setPrefs({ ...prefs, showItemPricesOnPrint: e.target.checked })}
                      className="w-4 h-4 accent-sky-600 cursor-pointer"
                    />
                    <span className="font-bold text-slate-700">
                      Exibir valor unitário de cada peça e serviço
                    </span>
                  </label>
                </div>
              </div>

              {/* Mensagem de Rodapé Personalizada */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <label className="block font-bold text-slate-700 mb-1">
                  Mensagem de Rodapé no Comprovante de OS:
                </label>
                <textarea
                  rows={3}
                  value={prefs.customPrintFooter}
                  onChange={(e) => setPrefs({ ...prefs, customPrintFooter: e.target.value })}
                  placeholder="Digite uma mensagem ou aviso para sair no final do papel impresso..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-sky-600 text-xs"
                />
              </div>
            </div>
          )}

          {/* Rodapé com Salvar */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-700 hover:to-indigo-800 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/20 cursor-pointer transition-all hover:scale-102 active:scale-98"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  Salvo com Sucesso!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Configurações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
