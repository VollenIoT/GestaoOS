import React from 'react';
import { AlertTriangle, Clock, KeyRound, ArrowRight } from 'lucide-react';
import { TrialStatus } from '../services/trialProtectionService';

interface TrialExpirationBannerProps {
  trialStatus: TrialStatus | null;
  onOpenSerialModal: () => void;
}

export const TrialExpirationBanner: React.FC<TrialExpirationBannerProps> = ({
  trialStatus,
  onOpenSerialModal,
}) => {
  if (!trialStatus || !trialStatus.is_trial || trialStatus.is_expired || trialStatus.is_licensed) {
    return null;
  }

  const daysLeft = trialStatus.days_left;

  // Alerta especial e proeminente quando restar 3 dias ou menos
  const isUrgent = daysLeft <= 3;

  return (
    <div
      className={`w-full px-4 py-1.5 flex items-center justify-between text-xs font-semibold select-none shadow-xs border-b z-40 transition-colors ${
        isUrgent
          ? 'bg-amber-500 text-amber-950 border-amber-600 animate-pulse'
          : 'bg-sky-700 text-sky-50 border-sky-800'
      }`}
    >
      <div className="flex items-center gap-2 truncate">
        {isUrgent ? (
          <AlertTriangle className="w-4 h-4 text-amber-950 shrink-0" />
        ) : (
          <Clock className="w-4 h-4 text-sky-200 shrink-0" />
        )}
        <span>
          {isUrgent ? (
            <>
              <strong>ATENÇÃO:</strong> Seu período de testes de 10 dias está expirando! Restam apenas{' '}
              <strong className="underline text-amber-950 font-black">
                {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
              </strong>
              . Ative sua chave para não perder o acesso.
            </>
          ) : (
            <>
              <strong>Modo Demonstração (Trial):</strong> Restam {daysLeft} dias de uso gratuito para avaliação.
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenSerialModal}
          className={`flex items-center gap-1.5 px-3 py-1 rounded font-bold transition-all shadow-xs cursor-pointer ${
            isUrgent
              ? 'bg-amber-950 text-white hover:bg-black'
              : 'bg-white text-sky-800 hover:bg-sky-100'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Ativar Chave Serial</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
