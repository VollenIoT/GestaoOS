import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, CheckCircle2, DatabaseBackup, AlertTriangle, User, HardDrive, Network, Server, Wifi, WifiOff } from 'lucide-react';
import { isCloudModeActive, getSavedSerial, getSavedTenantInfo } from '../services/licenseService';
import { getCurrentFeatures } from '../config/appFeatures';
import { subscribeNetworkStatus, getLocalNetworkConfig } from '../services/localNetworkService';

interface StatusBarProps {
  statusMessage?: string;
  isCapsLockActive?: boolean;
  onToggleCapsLock?: () => void;
  onOpenBackupModal?: () => void;
  onOpenSerialLicenseModal?: () => void;
  onOpenLocalNetworkModal?: () => void;
  currentUser?: any;
}

export const StatusBar: React.FC<StatusBarProps> = React.memo(({
  statusMessage = 'Sistema OS pronto e operando normalmente.',
  isCapsLockActive = true,
  onToggleCapsLock,
  onOpenBackupModal,
  onOpenSerialLicenseModal,
  onOpenLocalNetworkModal,
  currentUser,
}) => {
  const [isNumLock, setIsNumLock] = useState<boolean>(true);
  const isCloudOnline = isCloudModeActive();
  const serialKey = getSavedSerial();
  const tenantInfo = getSavedTenantInfo();
  
  // Nome Fantasia da empresa ativa na licença
  const tradeName = tenantInfo?.tradeName || tenantInfo?.companyName || 'ATIVO';

  useEffect(() => {
    const handleModifiers = (e: KeyboardEvent) => {
      if ('getModifierState' in e && typeof e.getModifierState === 'function') {
        setIsNumLock(e.getModifierState('NumLock'));
      }
    };

    window.addEventListener('keydown', handleModifiers);
    window.addEventListener('keyup', handleModifiers);

    return () => {
      window.removeEventListener('keydown', handleModifiers);
      window.removeEventListener('keyup', handleModifiers);
    };
  }, []);

  const [localNetConfig, setLocalNetConfig] = useState<any>(getLocalNetworkConfig);
  const [networkStatus, setNetworkStatus] = useState<{
    connected: boolean;
    mode: 'standalone' | 'server' | 'client';
    serverIp: string;
    serverPort: number;
  }>(() => {
    const cfg = getLocalNetworkConfig();
    return { connected: false, mode: cfg.mode, serverIp: cfg.serverIp, serverPort: cfg.serverPort };
  });

  useEffect(() => {
    const unsub = subscribeNetworkStatus((s) => {
      setNetworkStatus(s);
      setLocalNetConfig(getLocalNetworkConfig());
    });
    return unsub;
  }, []);

  return (
    <footer className="w-full bg-slate-300 border-t border-slate-400 text-slate-800 text-[11px] font-sans h-7 px-3 flex items-center justify-between select-none shrink-0 shadow-md z-40">
      {/* Esquerda: Mensagem de Status Ativa do Sistema */}
      <div className="flex items-center gap-2 truncate">
        <span className="flex items-center gap-1.5 font-bold text-sky-800 bg-sky-100/90 border border-sky-300 px-2 py-0.5 rounded text-[10px]">
          <CheckCircle2 className="w-3 h-3 text-sky-700" />
          STATUS:
        </span>
        <span className="font-semibold text-slate-800 truncate">{statusMessage}</span>
      </div>

      {/* Direita: Indicadores (USUÁRIO, CAPS LOCK, NUM LOCK, NUVEM / REDE LOCAL) */}
      <div className="flex items-center gap-2 font-bold text-[10px]">
        {/* Indicador de Usuário Logado */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-indigo-300 bg-indigo-50 text-indigo-950 font-bold shadow-2xs"
          title={`Usuário conectado: ${currentUser?.name || currentUser?.username || 'Administrador'} (${currentUser?.role || 'Admin'})`}
        >
          <User className="w-3.5 h-3.5 text-indigo-600" />
          <span>USUÁRIO:</span>
          <span className="text-indigo-900 font-extrabold truncate max-w-[150px]">
            {currentUser?.name || currentUser?.username || 'Administrador'}
          </span>
        </div>

        <div className="h-3.5 w-px bg-slate-400 my-auto" />

        {/* Indicador CAPS LOCK */}
        <button
          type="button"
          onClick={onToggleCapsLock}
          className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
            isCapsLockActive
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs font-black'
              : 'bg-slate-200 text-slate-500 border-slate-300'
          }`}
          title="Clique para ativar/desativar a digitação automática em caixa alta (MAIÚSCULA)"
        >
          CAPS: {isCapsLockActive ? 'ON' : 'OFF'}
        </button>

        {/* Indicador NUM LOCK */}
        <button
          type="button"
          onClick={() => setIsNumLock(!isNumLock)}
          className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
            isNumLock
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs font-black'
              : 'bg-slate-200 text-slate-500 border-slate-300'
          }`}
          title="Clique para alternar o estado do NUM LOCK"
        >
          NUM: {isNumLock ? 'ON' : 'OFF'}
        </button>

        {/* Indicador de Rede Local / Nuvem */}
        {getCurrentFeatures().isLocalServer && (
          <>
            <div className="h-3.5 w-px bg-slate-400 my-auto" />

            <button
              type="button"
              onClick={() => {
                if (onOpenLocalNetworkModal) onOpenLocalNetworkModal();
              }}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer shadow-2xs font-bold ${
                localNetConfig.syncStrategy === 'cloud'
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800'
                  : networkStatus.mode === 'server'
                  ? 'bg-indigo-700 hover:bg-indigo-800 text-white border-indigo-800'
                  : networkStatus.mode === 'client' && networkStatus.connected
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800'
                  : networkStatus.mode === 'client' && !networkStatus.connected
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-400'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
              }`}
              title={
                localNetConfig.syncStrategy === 'cloud'
                  ? 'Sincronização em Nuvem Ativa (Clique para gerenciar rede e sincronização)'
                  : 'Configurações de Rede Local Offline (Clique para configurar IP Fixo e modo Servidor/Terminal)'
              }
            >
              {localNetConfig.syncStrategy === 'cloud' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300/30 shrink-0" />
                  <span>REDE: NUVEM (ONLINE)</span>
                </>
              ) : networkStatus.mode === 'server' ? (
                <>
                  <Server className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                  <span>REDE: SERVIDOR PRINCIPAL</span>
                </>
              ) : networkStatus.mode === 'client' ? (
                <>
                  {networkStatus.connected ? (
                    <Wifi className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  )}
                  <span>
                    REDE: {networkStatus.connected ? 'CONECTADO' : 'OFFLINE'} ({networkStatus.serverIp})
                  </span>
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>REDE: LOCAL (OFFLINE)</span>
                </>
              )}
            </button>
          </>
        )}

        {getCurrentFeatures().hasCloudDatabaseIndicator && (
          <>
            <div className="h-3.5 w-px bg-slate-400 my-auto" />

            {/* Indicador STATUS DO BANCO DE DADOS (NUVEM / MODO LOCAL) */}
            <button
              type="button"
              onClick={() => {
                if (onOpenSerialLicenseModal) onOpenSerialLicenseModal();
              }}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer shadow-2xs font-bold ${
                isCloudOnline
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
              }`}
              title={
                isCloudOnline
                  ? `Banco Conectado na Nuvem via Chave Serial: ${serialKey || ''} (Clique para gerenciar)`
                  : 'Sistema operando em Modo Local Autônomo (Clique para inserir Chave Serial e conectar na Nuvem)'
              }
            >
              {isCloudOnline ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300/30 shrink-0" />
                  <span className="truncate max-w-[200px]">BANCO: NUVEM ({tradeName})</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>BANCO: LOCAL (OFFLINE)</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </footer>
  );
});
