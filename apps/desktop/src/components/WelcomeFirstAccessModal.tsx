import React, { useState } from 'react';
import {
  Sparkles,
  KeyRound,
  ShieldAlert,
  Play,
  Copy,
  Check,
  ArrowRight,
  Info,
} from 'lucide-react';

interface WelcomeFirstAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSerialModal: () => void;
  onStartTrial: () => void;
}

export const WelcomeFirstAccessModal: React.FC<WelcomeFirstAccessModalProps> = ({
  isOpen,
  onClose,
  onOpenSerialModal,
  onStartTrial,
}) => {
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: 'USER' | 'PASS') => {
    try {
      navigator.clipboard.writeText(text);
      if (type === 'USER') {
        setCopiedUser(true);
        setTimeout(() => setCopiedUser(false), 2000);
      } else {
        setCopiedPass(true);
        setTimeout(() => setCopiedPass(false), 2000);
      }
    } catch {}
  };

  const handleChooseTrial = () => {
    try {
      localStorage.setItem('system_first_access_dismissed', 'true');
    } catch {}
    onStartTrial();
    onClose();
  };

  const handleChooseSerial = () => {
    try {
      localStorage.setItem('system_first_access_dismissed', 'true');
    } catch {}
    onOpenSerialModal();
    onClose();
  };

  const handleContinueDefault = () => {
    try {
      localStorage.setItem('system_first_access_dismissed', 'true');
    } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho Premium */}
        <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 p-6 text-white text-center relative overflow-hidden">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-inner">
            <Sparkles className="w-8 h-8 text-sky-200 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Bem-vindo ao Vollen OS</h2>
          <p className="text-sky-100 text-xs mt-1 font-medium">
            Primeiro acesso identificado! Veja as informações iniciais para começar:
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Card de Senha Padrão */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4.5 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Credenciais Padrão do Administrador</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Usuário Padrão */}
              <div className="bg-white border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Usuário</span>
                  <span className="font-mono font-black text-slate-800 text-sm">admin</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('admin', 'USER')}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Copiar Usuário"
                >
                  {copiedUser ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Senha Padrão */}
              <div className="bg-white border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Senha Padrão</span>
                  <span className="font-mono font-black text-amber-600 text-sm">1234</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('1234', 'PASS')}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Copiar Senha"
                >
                  {copiedPass ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-amber-800 leading-snug flex items-center gap-1.5 font-medium">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Você poderá alterar essa senha a qualquer momento em <b>Gestão de Usuários</b>.
            </p>
          </div>

          {/* Opções de Início */}
          <div className="space-y-3">
            <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Como deseja começar?
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Botão Registrar com Serial */}
              <button
                type="button"
                onClick={handleChooseSerial}
                className="bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white p-4 rounded-2xl text-left border border-indigo-500/30 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-indigo-200" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-300 group-hover:translate-x-1 transition-transform" />
                </div>
                <h4 className="font-black text-sm text-white">Tenho um Serial</h4>
                <p className="text-[11px] text-indigo-100/80 mt-1 leading-snug">
                  Inserir chave de ativação oficial da sua licença.
                </p>
              </button>

              {/* Botão Iniciar em Modo Teste */}
              <button
                type="button"
                onClick={handleChooseTrial}
                className="bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white p-4 rounded-2xl text-left border border-emerald-500/30 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                    <Play className="w-5 h-5 text-emerald-200 fill-current" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-300 group-hover:translate-x-1 transition-transform" />
                </div>
                <h4 className="font-black text-sm text-white">Iniciar Modo Teste</h4>
                <p className="text-[11px] text-emerald-100/80 mt-1 leading-snug">
                  Experimentar o sistema gratuitamente com recursos liberados.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Vollen - Gestão de Ordens de Serviço
          </span>
          <button
            type="button"
            onClick={handleContinueDefault}
            className="text-xs font-bold text-sky-700 hover:text-sky-900 px-3 py-1.5 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer"
          >
            Ir para Tela de Login →
          </button>
        </div>
      </div>
    </div>
  );
};
