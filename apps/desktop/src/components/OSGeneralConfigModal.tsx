import React, { useState, useEffect } from 'react';
import { X, Settings, Sliders, CheckSquare, Save, MessageSquare, RotateCcw } from 'lucide-react';

export interface OSGeneralConfigData {
  autoAssignTechnicianOnStatus?: boolean;
  notifyClientOnStatusChange?: boolean;
  requireEquipmentSerialNumber?: boolean;
  requireDefectDescription?: boolean;
  blockFinalizeWithoutExecutedService?: boolean;
  defaultEntryReceiptTemplate?: string;
  defaultExitReceiptTemplate?: string;
  whatsappMessageStatusGeneral?: string;
  whatsappMessageStatusLiberado?: string;
}

interface OSGeneralConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (config: OSGeneralConfigData) => void;
}

export const DEFAULT_WHATSAPP_STATUS_GENERAL = `Olá, *{cliente}*! Tudo bem?

Informamos que a sua Ordem de Serviço *#{numero_os}* (*{equipamento}*) teve o status atualizado para: *{status}*.

💰 *Valor Total:* {valor_total}

Qualquer dúvida estamos à disposição!`;

export const DEFAULT_WHATSAPP_STATUS_LIBERADO = `Olá, *{cliente}*! Tudo bem?

Passando para informar que a sua Ordem de Serviço *#{numero_os}* (*{equipamento}*) está com status *APARELHO LIBERADO* e o aparelho já se encontra pronto e disponível para retirada!

💰 *Valor Total:* {valor_total}

Ficamos à disposição!`;

export const OSGeneralConfigModal: React.FC<OSGeneralConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'regras' | 'whatsapp'>('geral');

  const [config, setConfig] = useState<OSGeneralConfigData>(() => {
    try {
      const saved = localStorage.getItem('vollen_os_general_config');
      if (saved) return JSON.parse(saved);
    } catch { }
    return {
      autoAssignTechnicianOnStatus: true,
      notifyClientOnStatusChange: true,
      requireEquipmentSerialNumber: false,
      requireDefectDescription: true,
      blockFinalizeWithoutExecutedService: true,
      defaultEntryReceiptTemplate: 'DEFAULT_2VIAS',
      defaultExitReceiptTemplate: 'MODERN_DETAILED',
      whatsappMessageStatusGeneral: DEFAULT_WHATSAPP_STATUS_GENERAL,
      whatsappMessageStatusLiberado: DEFAULT_WHATSAPP_STATUS_LIBERADO,
    };
  });

  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem('vollen_os_general_config');
      if (saved) setConfig(JSON.parse(saved));
    } catch { }
  }, [isOpen]);

  useEffect(() => {
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

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('vollen_os_general_config', JSON.stringify(config));
      // Sincroniza também com as preferências gerais do sistema para compatibilidade global
      const prefsPayload = {
        entryReceiptTemplate: config.defaultEntryReceiptTemplate || 'DEFAULT_2VIAS',
        exitReceiptTemplate: config.defaultExitReceiptTemplate || 'MODERN_DETAILED',
        autoAssignTechnicianOnStatus: config.autoAssignTechnicianOnStatus ?? true,
        notifyClientOnStatusChange: config.notifyClientOnStatusChange ?? true,
        requireEquipmentSerialNumber: config.requireEquipmentSerialNumber ?? false,
        requireDefectDescription: config.requireDefectDescription ?? true,
        blockFinalizeWithoutExecutedService: config.blockFinalizeWithoutExecutedService ?? true,
        whatsappMessageStatusGeneral: config.whatsappMessageStatusGeneral ?? DEFAULT_WHATSAPP_STATUS_GENERAL,
        whatsappMessageStatusLiberado: config.whatsappMessageStatusLiberado ?? DEFAULT_WHATSAPP_STATUS_LIBERADO,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('vollen_os_preferences', JSON.stringify(prefsPayload));
      window.dispatchEvent(new Event('storage'));

      // Salva no Firestore para que todos os computadores e o APK mobile utilizem o mesmo modelo e mensagens
      const { setDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');
      await setDoc(doc(db, 'system_config', 'os_preferences'), prefsPayload, { merge: true }).catch(() => null);
    } catch (err) {
      console.warn('Erro ao salvar preferências gerais de OS:', err);
    }
    if (onSave) onSave(config);
    onClose();
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
        <div className="p-3.5 bg-gradient-to-r from-sky-700 via-sky-800 to-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Configurações e Parâmetros Gerais de OS</h2>
              <p className="text-[10.5px] text-sky-200">
                Ajuste os fluxos, regras obrigatórias e modelos padrão de impressão de OS
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

        {/* Abas */}
        <div className="flex border-b border-slate-200 bg-slate-100 px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`px-3.5 py-2 font-bold rounded-t-xl transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${activeTab === 'geral'
                ? 'bg-white text-sky-700 border-t-2 border-sky-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Parâmetros Gerais
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('regras')}
            className={`px-3.5 py-2 font-bold rounded-t-xl transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${activeTab === 'regras'
                ? 'bg-white text-sky-700 border-t-2 border-sky-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Regras & Bloqueios
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`px-3.5 py-2 font-bold rounded-t-xl transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${activeTab === 'whatsapp'
                ? 'bg-white text-emerald-700 border-t-2 border-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            Mensagens WhatsApp
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="p-4 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {activeTab === 'geral' && (
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={config.autoAssignTechnicianOnStatus ?? true}
                  onChange={(e) => setConfig((prev) => ({ ...prev, autoAssignTechnicianOnStatus: e.target.checked }))}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <div>
                  <span className="font-bold block text-slate-900">Vincular técnico logado automaticamente ao alterar status</span>
                  <span className="text-[11px] text-slate-500">Ao assumir ou alterar o status de uma OS, o usuário atual será registrado como responsável.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={config.notifyClientOnStatusChange ?? true}
                  onChange={(e) => setConfig((prev) => ({ ...prev, notifyClientOnStatusChange: e.target.checked }))}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <div>
                  <span className="font-bold block text-slate-900">Habilitar botão de notificação via WhatsApp nos status</span>
                  <span className="text-[11px] text-slate-500">Oferece atalho rápido para enviar mensagem padronizada no WhatsApp do cliente quando a OS mudar de status.</span>
                </div>
              </label>
            </div>
          )}

          {activeTab === 'regras' && (
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={config.requireDefectDescription ?? true}
                  onChange={(e) => setConfig((prev) => ({ ...prev, requireDefectDescription: e.target.checked }))}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <div>
                  <span className="font-bold block text-slate-900">Exigir Defeito / Problema Relatado para abrir OS</span>
                  <span className="text-[11px] text-slate-500">Impede que uma nova OS seja criada sem o preenchimento do problema informado pelo cliente.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={config.blockFinalizeWithoutExecutedService ?? true}
                  onChange={(e) => setConfig((prev) => ({ ...prev, blockFinalizeWithoutExecutedService: e.target.checked }))}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <div>
                  <span className="font-bold block text-slate-900">Exigir Serviço Executado para Finalizar OS</span>
                  <span className="text-[11px] text-slate-500">Obrigatório descrever o que foi realizado antes de marcar a OS como Finalizada / Entregue.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={config.requireEquipmentSerialNumber ?? false}
                  onChange={(e) => setConfig((prev) => ({ ...prev, requireEquipmentSerialNumber: e.target.checked }))}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <div>
                  <span className="font-bold block text-slate-900">Exigir Número de Série no Equipamento</span>
                  <span className="text-[11px] text-slate-500">Torna o campo de número de série ou IMEI obrigatório na entrada do aparelho.</span>
                </div>
              </label>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-emerald-950 text-[11px] leading-relaxed">
                <strong>Tags disponíveis para usar no texto:</strong>
                <div className="flex flex-wrap gap-1.5 mt-1 font-mono text-[10px] text-emerald-800 font-bold">
                  <span className="bg-white px-1.5 py-0.5 rounded border border-emerald-300">{'{cliente}'}</span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-emerald-300">{'{numero_os}'}</span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-emerald-300">{'{equipamento}'}</span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-emerald-300">{'{status}'}</span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-emerald-300">{'{valor_total}'}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Mensagem Pronta Geral (Outros Status)
                  </label>
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, whatsappMessageStatusGeneral: DEFAULT_WHATSAPP_STATUS_GENERAL }))}
                    className="text-[10px] text-slate-500 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
                    title="Restaurar texto padrão"
                  >
                    <RotateCcw className="w-3 h-3" /> Restaurar Padrão
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={config.whatsappMessageStatusGeneral ?? DEFAULT_WHATSAPP_STATUS_GENERAL}
                  onChange={(e) => setConfig((prev) => ({ ...prev, whatsappMessageStatusGeneral: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-sans text-xs text-slate-900 focus:border-emerald-500 focus:outline-none shadow-2xs leading-relaxed"
                  placeholder="Digite a mensagem para os status gerais..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Mensagem de Aparelho Liberado (Pronto para Retirada)
                  </label>
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, whatsappMessageStatusLiberado: DEFAULT_WHATSAPP_STATUS_LIBERADO }))}
                    className="text-[10px] text-slate-500 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
                    title="Restaurar texto padrão"
                  >
                    <RotateCcw className="w-3 h-3" /> Restaurar Padrão
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={config.whatsappMessageStatusLiberado ?? DEFAULT_WHATSAPP_STATUS_LIBERADO}
                  onChange={(e) => setConfig((prev) => ({ ...prev, whatsappMessageStatusLiberado: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-sans text-xs text-slate-900 focus:border-emerald-500 focus:outline-none shadow-2xs leading-relaxed"
                  placeholder="Digite a mensagem para aparelho liberado..."
                />
              </div>
            </div>
          )}

          {/* Rodapé com botões */}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" /> Salvar Configurações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};