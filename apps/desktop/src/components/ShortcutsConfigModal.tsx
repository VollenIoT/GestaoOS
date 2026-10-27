import React, { useState, useEffect, useRef } from 'react';
import { X, Keyboard, RotateCcw, Save, Check, PlusCircle, FileText, CheckCircle2, Search, Package, ShoppingCart, Tag, AlertTriangle } from 'lucide-react';
import { modalStack } from '../utils/modalStack';
import { useDialog } from './DialogContext';
import {
  CustomShortcutsConfig,
  DEFAULT_SHORTCUTS_CONFIG,
  getShortcutsConfig,
  saveShortcutsConfig,
  resetShortcutsConfig
} from '../services/shortcutService';

interface ShortcutsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

interface ShortcutActionDef {
  id: keyof CustomShortcutsConfig;
  title: string;
  description: string;
  defaultKey: string;
  icon: React.ReactNode;
  colorClass: string;
}

const SHORTCUT_ACTIONS: ShortcutActionDef[] = [
  {
    id: 'newOrder',
    title: 'Nova Ordem de Serviço (OS)',
    description: 'Abre a janela de criação de uma nova Ordem de Serviço',
    defaultKey: 'F2',
    icon: <PlusCircle className="w-4 h-4 text-emerald-600" />,
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'openOrders',
    title: 'Ordens de Serviço Abertas',
    description: 'Abre a lista de Ordens de Serviço em andamento / pendentes',
    defaultKey: 'F5',
    icon: <FileText className="w-4 h-4 text-sky-600" />,
    colorClass: 'text-sky-700 bg-sky-50 border-sky-200',
  },
  {
    id: 'finishedOrders',
    title: 'Ordens de Serviço Finalizadas',
    description: 'Abre o histórico de Ordens de Serviço concluídas e entregues',
    defaultKey: 'F6',
    icon: <CheckCircle2 className="w-4 h-4 text-teal-600" />,
    colorClass: 'text-teal-700 bg-teal-50 border-teal-200',
  },
  {
    id: 'searchOS',
    title: 'Consultar / Buscar OS',
    description: 'Abre a busca avançada e detalhada de Ordens de Serviço',
    defaultKey: 'F7',
    icon: <Search className="w-4 h-4 text-purple-600" />,
    colorClass: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  {
    id: 'partsModal',
    title: 'Central de Peças / Estoque',
    description: 'Abre a Central com o catálogo completo de peças e produtos',
    defaultKey: 'F8',
    icon: <Package className="w-4 h-4 text-amber-600" />,
    colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  {
    id: 'salesModal',
    title: 'Vendas de Balcão / PDV',
    description: 'Abre o PDV para registrar vendas diretas de peças e acessórios',
    defaultKey: 'F9',
    icon: <ShoppingCart className="w-4 h-4 text-green-600" />,
    colorClass: 'text-green-700 bg-green-50 border-green-200',
  },
  {
    id: 'quickStock',
    title: 'Busca Rápida de Peça / Estoque',
    description: 'Abre o modal de consulta rápida e ajuste imediato de preço e quantidade por código ou código de barras',
    defaultKey: 'F10',
    icon: <Tag className="w-4 h-4 text-amber-600" />,
    colorClass: 'text-amber-800 bg-amber-50 border-amber-300',
  },
];

// Teclas disponíveis para seleção pelo usuário
const AVAILABLE_KEYS = [
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
];

export const ShortcutsConfigModal: React.FC<ShortcutsConfigModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const { alert, confirm } = useDialog();
  const [config, setConfig] = useState<CustomShortcutsConfig>(getShortcutsConfig);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getShortcutsConfig());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      modalStack.register('ShortcutsConfigModal', () => onCloseRef.current?.());
      return () => modalStack.unregister('ShortcutsConfigModal');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Verifica duplicidades
  const findDuplicates = (): { key: string; actions: string[] }[] => {
    const keyMap: Record<string, string[]> = {};
    SHORTCUT_ACTIONS.forEach((action) => {
      const keyVal = config[action.id]?.toUpperCase();
      if (keyVal && keyVal !== 'NENHUM' && keyVal !== 'NONE') {
        if (!keyMap[keyVal]) keyMap[keyVal] = [];
        keyMap[keyVal].push(action.title);
      }
    });

    return Object.entries(keyMap)
      .filter(([_, actions]) => actions.length > 1)
      .map(([key, actions]) => ({ key, actions }));
  };

  const duplicates = findDuplicates();

  const handleChangeKey = (actionId: keyof CustomShortcutsConfig, newKey: string) => {
    setConfig((prev) => {
      const updated = { ...prev };
      // Se a nova tecla for uma tecla válida e diferente de 'NONE',
      // qualquer outra função que estivesse usando esta mesma tecla é desativada ('NONE')
      if (newKey && newKey !== 'NONE') {
        (Object.keys(updated) as (keyof CustomShortcutsConfig)[]).forEach((key) => {
          if (key !== actionId && updated[key]?.toUpperCase() === newKey.toUpperCase()) {
            updated[key] = 'NONE';
          }
        });
      }
      updated[actionId] = newKey;
      return updated;
    });
  };

  const handleSave = () => {
    if (duplicates.length > 0) {
      alert({
        title: 'Teclas Duplicadas',
        message: `Existem funções configuradas com a mesma tecla de atalho (${duplicates.map((d) => `${d.key}: ${d.actions.join(', ')}`).join(' | ')}). Por favor, configure teclas diferentes para cada ação antes de salvar.`,
        variant: 'warning',
      });
      return;
    }

    saveShortcutsConfig(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    if (onSaveSuccess) onSaveSuccess();
    onClose();
  };

  const handleResetDefaults = async () => {
    const ok = await confirm({
      title: 'Restaurar Atalhos Padrão?',
      message: 'Deseja redefinir todos os atalhos para os valores de fábrica (F2, F5, F6, F7, F8, F9, F10)?',
      variant: 'warning',
      confirmText: 'Restaurar Padrão',
    });
    if (!ok) return;

    const def = resetShortcutsConfig();
    setConfig(def);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-fadeIn">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-sky-600 to-indigo-700 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Keyboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                Configuração de Teclas de Atalho
              </h2>
              <p className="text-[11px] text-sky-100 font-medium">
                Personalize as teclas de função do teclado para acessar as principais telas do sistema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificação de sucesso */}
        {savedSuccess && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-inner">
            <Check className="w-4 h-4 text-emerald-200" />
            <span>Atalhos de teclado atualizados e aplicados com sucesso!</span>
          </div>
        )}

        {/* Notificação de alerta de duplicidade */}
        {duplicates.length > 0 && (
          <div className="bg-amber-500 text-white px-4 py-2 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-inner">
            <AlertTriangle className="w-4 h-4 text-amber-100 shrink-0" />
            <span>
              Atenção: Há conflito de teclas para {duplicates.map((d) => d.key).join(', ')}. Cada ação deve ter uma tecla exclusiva.
            </span>
          </div>
        )}

        {/* Conteúdo com Lista de Atalhos */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50">
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-900 leading-relaxed">
            💡 <strong>Como funciona:</strong> Escolha a tecla desejada no menu suspenso ao lado de cada função. Os atalhos funcionam em qualquer tela quando você não estiver digitando em campos de texto.
          </div>

          <div className="space-y-2.5">
            {SHORTCUT_ACTIONS.map((action) => {
              const currentKey = config[action.id] || action.defaultKey;
              const isDuplicated = duplicates.some((d) => d.actions.includes(action.title));

              return (
                <div
                  key={action.id}
                  className={`bg-white border rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-2xs transition-all ${
                    isDuplicated ? 'border-amber-400 bg-amber-50/40' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
                      {action.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-800 truncate">
                          {action.title}
                        </h3>
                        {action.defaultKey !== currentKey && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            (Padrão: {action.defaultKey})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {action.description}
                      </p>
                    </div>
                  </div>

                  {/* Seletor de Tecla */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-slate-600">Tecla:</span>
                    <select
                      value={currentKey}
                      onChange={(e) => handleChangeKey(action.id, e.target.value)}
                      className={`font-mono font-bold text-xs px-3 py-1.5 rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs transition-colors ${
                        isDuplicated
                          ? 'bg-amber-100 text-amber-900 border-amber-400'
                          : currentKey === 'NONE'
                          ? 'bg-slate-100 text-slate-500 border-slate-300 italic'
                          : 'bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100 font-extrabold'
                      }`}
                    >
                      {AVAILABLE_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                      <option value="NONE">Desativado</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            title="Restaurar teclas de atalho padrão de fábrica"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Restaurar Padrão</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-white" />
              <span>Salvar Atalhos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
