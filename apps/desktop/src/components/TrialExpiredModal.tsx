import React, { useState, useRef } from 'react';
import { Lock, ShieldAlert, KeyRound, CheckCircle2, AlertCircle, Loader2, X, LogOut } from 'lucide-react';
import { TrialStatus, activatePermanentLicense } from '../services/trialProtectionService';
import { validateAndFetchSerialLicense, activateLicense } from '../services/licenseService';

interface TrialExpiredModalProps {
  trialStatus: TrialStatus | null;
  onActivated: () => void;
}

export const TrialExpiredModal: React.FC<TrialExpiredModalProps> = ({
  trialStatus,
  onActivated,
}) => {
  const [serialInput, setSerialInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const serialInputRef = useRef<HTMLInputElement>(null);

  const handleCloseApp = async () => {
    // 1. Encerramento através do comando Tauri customizado se houver
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('close_app');
      return;
    } catch {}

    // 2. Encerramento através do plugin-process
    try {
      const { exit } = await import('@tauri-apps/plugin-process');
      await exit(0);
      return;
    } catch {}

    // 3. Destruição / Fechamento da janela do Tauri
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

    // 4. Fallback web
    window.close();
  };

  if (!trialStatus || !trialStatus.is_expired || trialStatus.is_licensed) {
    return null;
  }

  const handleFormatSerial = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const val = input.value;
    const oldCursor = input.selectionStart || 0;

    const rawBeforeCursor = val.slice(0, oldCursor).replace(/[^A-Z0-9a-z]/g, '').length;
    const raw = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    const chunks = raw.match(/.{1,5}/g);
    const formatted = chunks ? chunks.join('-') : raw;

    setSerialInput(formatted);

    let newCursor = 0;
    let countedChars = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (countedChars >= rawBeforeCursor) {
        newCursor = i;
        break;
      }
      if (formatted[i] !== '-') {
        countedChars++;
      }
      newCursor = i + 1;
    }

    requestAnimationFrame(() => {
      if (serialInputRef.current) {
        serialInputRef.current.setSelectionRange(newCursor, newCursor);
      }
    });
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const clean = serialInput.trim().toUpperCase();
    if (!clean) {
      setErrorMsg('Por favor, informe a Chave Serial da sua licença.');
      return;
    }

    setLoading(true);
    try {
      // Valida via nuvem se houver internet ou valida padrão de formato
      let validData: any = null;
      try {
        const cloudRes = await validateAndFetchSerialLicense(clean);
        if (cloudRes.success && cloudRes.data) {
          validData = cloudRes.data;
        }
      } catch {}

      if (!validData) {
        // Validação local de integridade da chave
        if (clean.replace(/-/g, '').length < 16) {
          setErrorMsg('Chave serial inválida. Verifique os caracteres informados.');
          setLoading(false);
          return;
        }
      }

      // Grava no nível de hardware do sistema (Rust / Âncoras do OS)
      await activatePermanentLicense(clean);

      // Grava no serviço de licença do aplicativo
      if (validData) {
        activateLicense(validData);
      } else {
        localStorage.setItem('system_serial_license_key', clean);
        localStorage.setItem(
          'system_tenant_info',
          JSON.stringify({
            serial: clean,
            active: true,
            planType: 'VITALICIO',
            status: 'ACTIVE',
            companyName: 'Vollen Assistência Técnica',
          })
        );
      }

      setSuccessMsg('Sistema ativado e desbloqueado com sucesso!');
      setTimeout(() => {
        onActivated();
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao processar ativação da licença.');
    } finally {
      setLoading(false);
    }
  };

  const isTampered = trialStatus.is_tampered;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 select-none"
      style={{ cursor: 'default' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Vermelho */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              {isTampered ? <ShieldAlert className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                {isTampered ? 'Alerta de Segurança do Sistema' : 'Período de Demonstração Expirado'}
              </h2>
              <p className="text-red-100 text-xs mt-0.5">
                {isTampered
                  ? 'Detectada alteração indevida na data/relógio do computador.'
                  : 'Os 10 dias de teste gratuito desta máquina foram concluídos.'}
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

        {/* Corpo com Informações e Formulário de Ativação */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1.5">
            <div className="flex justify-between items-center text-slate-500">
              <span>Identificador do Computador (Machine ID):</span>
              <span className="font-mono font-bold text-slate-800">{trialStatus.machine_id}</span>
            </div>
            <p className="text-slate-600">
              Para continuar utilizando todas as funcionalidades do sistema, insira abaixo a sua{' '}
              <strong>Chave Serial Definitiva</strong>.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleActivate} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                Chave Serial de Ativação:
              </label>
              <input
                ref={serialInputRef}
                type="text"
                value={serialInput}
                onChange={handleFormatSerial}
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                maxLength={23}
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono text-center font-bold tracking-wider text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando e Desbloqueando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Desbloquear e Ativar Sistema</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={handleCloseApp}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-300"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>Sair do Sistema</span>
            </button>
            <span className="text-[11px] text-slate-500 text-center">
              Dúvidas ou suporte? Entre em contato com a equipe comercial para adquirir sua licença.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
