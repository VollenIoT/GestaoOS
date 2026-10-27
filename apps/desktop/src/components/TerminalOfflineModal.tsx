import React, { useState } from 'react';
import { ServerOff, Power, RefreshCw, AlertTriangle, ShieldAlert, Sliders, Cloud, HardDrive } from 'lucide-react';
import { getLocalNetworkConfig, saveLocalNetworkConfig, testServerConnection } from '../services/localNetworkService';
import { getCurrentFeatures } from '../config/appFeatures';
import { LocalNetworkModal } from './LocalNetworkModal';
import { SerialLicenseModal } from './SerialLicenseModal';

interface TerminalOfflineModalProps {
  isOffline: boolean;
  serverIp?: string;
  serverPort?: number;
  onRetryConnection?: () => void;
  onOpenNetworkConfig?: () => void;
}

export const TerminalOfflineModal: React.FC<TerminalOfflineModalProps> = ({
  isOffline,
  serverIp,
  serverPort,
  onRetryConnection,
  onOpenNetworkConfig,
}) => {
  const features = getCurrentFeatures();
  const [retrying, setRetrying] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isNetModalOpen, setIsNetModalOpen] = useState(false);
  const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);

  if (!isOffline) return null;

  const cfg = getLocalNetworkConfig();
  const displayIp = serverIp || cfg.serverIp || '192.168.1.100';
  const displayPort = serverPort || cfg.serverPort || 3333;

  const handleManualRetry = async () => {
    setRetrying(true);
    setStatusMsg(null);
    try {
      const res = await testServerConnection(displayIp, displayPort);
      if (res.success) {
        if (onRetryConnection) onRetryConnection();
      } else {
        setStatusMsg('Computador Servidor continua desligado ou inacessível.');
      }
    } catch {
      setStatusMsg('Computador Servidor continua desligado ou inacessível.');
    } finally {
      setRetrying(false);
    }
  };

  const handleCloseApplication = async () => {
    // 1. Encerramento do aplicativo no Tauri v2
    try {
      const { exit } = await import('@tauri-apps/plugin-process');
      await exit(0);
      return;
    } catch (e) {
      console.warn('Erro ao chamar plugin-process exit:', e);
    }

    // 2. Destruição / Fechamento da janela do Tauri
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      if (appWindow) {
        await appWindow.destroy();
        return;
      }
    } catch (e) {
      console.warn('Erro ao destruir janela:', e);
    }

    // 3. Fallback web
    window.close();
  };

  return (
    <div
      className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
      style={{ cursor: 'default' }}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-red-200 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Header com Alerta Chamativo */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-6 flex items-center gap-4">
          <div className="p-3.5 bg-white/20 rounded-2xl shrink-0 backdrop-blur-sm shadow-inner">
            <ServerOff className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-white/25 text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full text-white">
                Terminal Bloqueado
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight mt-0.5">
              Computador Servidor Offline
            </h2>
            <p className="text-red-100 text-xs mt-0.5 leading-relaxed">
              O sistema pausou as operações para proteger a integridade dos seus dados.
            </p>
          </div>
        </div>

        {/* Corpo com Detalhes e Instruções */}
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-950 text-xs">
                  Aguardando reconexão com o Servidor Principal:
                </p>
                <p className="font-mono bg-white/80 border border-amber-200 px-2.5 py-1 rounded-lg text-[12px] font-bold text-slate-800 inline-block">
                  {displayIp}:{displayPort}
                </p>
              </div>
            </div>
            <p className="text-amber-800 leading-relaxed text-[11px] pt-1">
              Para evitar perda de dados, duplicidade de ordens de serviço e divergências cadastrais, este terminal não pode continuar enquanto o Computador Servidor estiver <strong>desligado, fechado ou fora da rede</strong>.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>O que fazer agora?</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 ml-1">
              <li>Ligue ou abra o GestãoOS no <strong>Computador Servidor Principal</strong>.</li>
              <li>Se você estava digitando algo, <strong>não se preocupe</strong>: sua tela e dados continuam preservados ao fundo.</li>
              <li>Assim que o Servidor iniciar, esta tela <strong>desbloqueará automaticamente</strong>.</li>
            </ul>
          </div>

          {statusMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2 rounded-xl text-xs font-semibold text-center animate-in fade-in">
              {statusMsg}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleManualRetry}
                disabled={retrying}
                className="flex-1 bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white py-3 px-4 rounded-xl font-bold text-xs shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                <span>{retrying ? 'Testando Conexão...' : 'Verificar Servidor Agora'}</span>
              </button>

              <button
                type="button"
                onClick={handleCloseApplication}
                className="bg-slate-100 hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-slate-700 border border-slate-200 py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                title="Fechar e sair do sistema"
              >
                <Power className="w-4 h-4 text-red-500" />
                <span>Fechar Sistema</span>
              </button>
            </div>

            {/* Opção para alterar modo de operação (IP / Rede Local, Standalone ou Nuvem se suportado) */}
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onOpenNetworkConfig) {
                    onOpenNetworkConfig();
                  } else {
                    setIsNetModalOpen(true);
                  }
                }}
                className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                title="Trocar para Computador Único, Servidor Principal ou alterar IP"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>Trocar Modo / Configurar Rede e IP</span>
              </button>

              {features.hasCloud && (
                <button
                  type="button"
                  onClick={() => setIsSerialModalOpen(true)}
                  className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Conectar à Nuvem (Serial)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé informativo discreto */}
        <div className="bg-slate-100 px-6 py-2.5 border-t border-slate-200 text-center">
          <span className="text-[10px] text-slate-500 font-medium">
            Tentando reconectar automaticamente a cada 2 segundos...
          </span>
        </div>
      </div>

      {/* Modal de Configurações de Rede */}
      <LocalNetworkModal
        isOpen={isNetModalOpen}
        onClose={() => {
          setIsNetModalOpen(false);
          const currentCfg = getLocalNetworkConfig();
          if (currentCfg.mode !== 'client' || currentCfg.syncStrategy === 'cloud') {
            if (onRetryConnection) onRetryConnection();
          }
        }}
      />

      {/* Modal de Serial / Nuvem (Apenas se tiver suporte a Nuvem) */}
      {features.hasCloud && (
        <SerialLicenseModal
          isOpen={isSerialModalOpen}
          onClose={() => {
            setIsSerialModalOpen(false);
            const currentCfg = getLocalNetworkConfig();
            if (currentCfg.syncStrategy === 'cloud') {
              if (onRetryConnection) onRetryConnection();
            }
          }}
        />
      )}
    </div>
  );
};
