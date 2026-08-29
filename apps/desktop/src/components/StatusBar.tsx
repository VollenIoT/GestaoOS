import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, CheckCircle2, DatabaseBackup, AlertTriangle } from 'lucide-react';

interface StatusBarProps {
  statusMessage?: string;
  isCapsLockActive?: boolean;
  onToggleCapsLock?: () => void;
  onOpenBackupModal?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  statusMessage = 'Sistema OS pronto e operando normalmente.',
  isCapsLockActive = true,
  onToggleCapsLock,
  onOpenBackupModal,
}) => {
  const [isNumLock, setIsNumLock] = useState<boolean>(true);
  const [isCloudOnline, setIsCloudOnline] = useState<boolean>(true);

  // Verificação de último backup gerado (aviso após 7 dias sem backup)
  const lastBackupStr = localStorage.getItem('last_backup_date');
  const needsBackup = (() => {
    if (!lastBackupStr) return true;
    const diffDays = (Date.now() - new Date(lastBackupStr).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 7;
  })();

  useEffect(() => {
    const handleModifiers = (e: KeyboardEvent | MouseEvent) => {
      if ('getModifierState' in e && typeof e.getModifierState === 'function') {
        setIsNumLock(e.getModifierState('NumLock'));
      }
    };

    window.addEventListener('keydown', handleModifiers);
    window.addEventListener('keyup', handleModifiers);
    window.addEventListener('click', handleModifiers);

    return () => {
      window.removeEventListener('keydown', handleModifiers);
      window.removeEventListener('keyup', handleModifiers);
      window.removeEventListener('click', handleModifiers);
    };
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

        {/* Alerta de Backup Pendente */}
        {needsBackup && onOpenBackupModal && (
          <button
            type="button"
            onClick={onOpenBackupModal}
            className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold px-2 py-0.5 rounded text-[9.5px] cursor-pointer shadow-xs animate-pulse ml-2"
            title="Clique para realizar uma cópia de segurança do banco de dados"
          >
            <AlertTriangle className="w-3 h-3 text-amber-100" />
            <span>BACKUP RECOMENDADO</span>
          </button>
        )}
      </div>

      {/* Direita: Indicadores (CAPS LOCK, NUM LOCK, NUVEM) */}
      <div className="flex items-center gap-2 font-bold text-[10px]">
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

        <div className="h-3.5 w-px bg-slate-400 my-auto" />

        {/* Indicador STATUS DA NUVEM */}
        <div
          onClick={() => setIsCloudOnline(!isCloudOnline)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded border cursor-pointer ${
            isCloudOnline
              ? 'bg-sky-700 text-white border-sky-800'
              : 'bg-amber-100 text-amber-900 border-amber-300'
          }`}
          title="Status de sincronização com o banco na nuvem"
        >
          {isCloudOnline ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300/30" />
              <span>NUVEM: CONECTADO</span>
            </>
          ) : (
            <>
              <CloudOff className="w-3.5 h-3.5 text-amber-700" />
              <span>NUVEM: OFFLINE</span>
            </>
          )}
        </div>
      </div>
    </footer>
  );
};
