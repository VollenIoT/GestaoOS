import React, { useState } from 'react';
import {
  AlertTriangle,
  KeyRound,
  MessageSquare,
  RefreshCw,
  XCircle,
  ExternalLink,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  X,
  LogOut,
} from 'lucide-react';
import {
  LicenseTenantData,
  validateAndFetchSerialLicense,
  activateLicense,
} from '../services/licenseService';

interface LicenseExpiredModalProps {
  isOpen: boolean;
  licenseInfo: LicenseTenantData | null;
  message?: string;
  isTrial?: boolean;
  onRenewSuccess: () => void;
}

export const LicenseExpiredModal: React.FC<LicenseExpiredModalProps> = ({
  isOpen,
  licenseInfo,
  message,
  isTrial = false,
  onRenewSuccess,
}) => {
  const [newSerialInput, setNewSerialInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCloseApp = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('close_app');
      return;
    } catch {}

    try {
      const { exit } = await import('@tauri-apps/plugin-process');
      await exit(0);
      return;
    } catch {}

    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      if (appWindow) {
        try {
          await appWindow.destroy();
        } catch {
          await appWindow.close();
        }
        return;
      }
    } catch {}

    window.close();
  };

  if (!isOpen) return null;

  const handleFormatSerial = (val: string) => {
    const raw = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    const chunks = raw.match(/.{1,5}/g);
    setNewSerialInput(chunks ? chunks.join('-') : raw);
  };

  const handleActivateNewSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newSerialInput.trim()) {
      setErrorMsg('Por favor, informe a Chave Serial da sua licença.');
      return;
    }

    setLoading(true);
    try {
      const res = await validateAndFetchSerialLicense(newSerialInput);
      if (!res.success || !res.data) {
        setErrorMsg(res.message || 'Falha ao validar chave serial.');
        return;
      }

      activateLicense(res.data);
      setSuccessMsg('Licença ativada e renovada com sucesso! Recarregando sistema...');
      setTimeout(() => {
        onRenewSuccess();
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao conectar ao servidor de licenças.');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSupportWhatsApp = () => {
    const phone = '5511999999999';
    const text = encodeURIComponent(
      `Olá! Gostaria de renovar minha licença do Vollen OS.\nEmpresa: ${
        licenseInfo?.companyName || 'Minha Empresa'
      }\nSerial Atual: ${licenseInfo?.serial || 'N/A'}`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-9999 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-rose-500 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header Vermelho de Alerta */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-red-800 px-6 py-5 text-white flex items-center justify-between gap-3.5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
              <ShieldAlert className="w-7 h-7 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">
                {isTrial ? 'Período de Testes Finalizado' : 'Assinatura Expirada'}
              </h2>
              <p className="text-xs text-rose-100 font-medium">
                Acesso temporariamente bloqueado para renovação
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseApp}
            title="Fechar Sistema"
            className="p-2 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white rounded-xl transition-all cursor-pointer shrink-0"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Corpo do Alerta */}
        <div className="p-6 space-y-4 text-xs text-slate-700">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-900 text-sm">
                {isTrial ? 'Seu período de demonstração de 15 dias encerrou.' : 'Sua licença precisa ser renovada.'}
              </p>
              <p className="text-rose-700 text-xs leading-relaxed">
                {message ||
                  'Para continuar acessando suas ordens de serviço, clientes e relatórios com segurança, insira uma nova chave serial ou renove seu plano.'}
              </p>
            </div>
          </div>

          {/* Dados da Licença Atual */}
          {licenseInfo && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-semibold">Empresa Licenciada:</span>
                <span className="font-bold text-slate-800">{licenseInfo.companyName || 'Empresa'}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-semibold">Serial Anterior:</span>
                <span className="font-mono font-bold text-slate-700">{licenseInfo.serial}</span>
              </div>
              {licenseInfo.expiresAt && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-semibold">Data de Vencimento:</span>
                  <span className="font-bold text-rose-600">
                    {new Date(licenseInfo.expiresAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-rose-800 font-bold flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Formulário de Nova Chave */}
          <form onSubmit={handleActivateNewSerial} className="space-y-2.5 pt-1">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <span>Insira a Nova Chave Serial:</span>
            </label>
            <input
              type="text"
              value={newSerialInput}
              onChange={(e) => handleFormatSerial(e.target.value)}
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
              disabled={loading}
              className="w-full bg-slate-50 border-2 border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl px-4 py-3 font-mono font-bold text-slate-800 text-sm tracking-wider outline-none transition-all"
            />
            <button
              type="submit"
              disabled={loading || !newSerialInput.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando Chave...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Ativar Nova Licença</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Rodapé com Suporte WhatsApp e Sair */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">
              Precisa de ajuda com o pagamento?
            </span>
            <button
              type="button"
              onClick={handleContactSupportWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Falar no WhatsApp</span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleCloseApp}
            className="w-full py-2.5 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-300"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </div>
    </div>
  );
};
