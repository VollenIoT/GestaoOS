import React from 'react';
import { PlusCircle, Search, FileText, Calendar, User, Calculator } from 'lucide-react';
import { VollenLogo } from './VollenLogo';

interface DashboardProps {
  onNewOrder: () => void;
  onOpenMenuOS: () => void;
  onSearchOS: () => void;
  onOpenSchedule: () => void;
  onOpenClients: () => void;
  onOpenEstimates?: () => void;
  hasCustomWallpaper?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNewOrder,
  onOpenMenuOS,
  onSearchOS,
  onOpenSchedule,
  onOpenClients,
  onOpenEstimates,
  hasCustomWallpaper = false,
}) => {
  return (
    <div className="relative h-full w-full flex font-sans select-none overflow-hidden p-4">
      {/* Botões de Ação Rápida em Coluna Vertical no Lado Esquerdo */}
      <div className="flex flex-col justify-center gap-2.5 z-10 shrink-0">
        <button
          onClick={onNewOrder}
          className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 group cursor-pointer border border-white/20"
          title="Abrir Nova Ordem de Serviço"
        >
          <div className="p-1.5 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
            <PlusCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-bold text-white text-center leading-tight drop-shadow px-1">
            Nova OS
          </span>
        </button>

        <button
          onClick={onOpenMenuOS}
          className="w-20 h-20 bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-sky-500/25 transition-all hover:scale-105 active:scale-95 group cursor-pointer border border-white/20"
          title="Menu de Ordens de Serviço"
        >
          <div className="p-1.5 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-bold text-white text-center leading-tight drop-shadow px-1">
            Menu OS
          </span>
        </button>

        {/* Botão Orçamento */}
        <button
          onClick={() => {
            if (onOpenEstimates) onOpenEstimates();
          }}
          className="w-20 h-20 bg-gradient-to-br from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 group cursor-pointer border border-white/20"
          title="Orçamentos e Propostas Comerciais"
        >
          <div className="p-1.5 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-bold text-white text-center leading-tight drop-shadow px-1">
            Orçamento
          </span>
        </button>

        <button
          onClick={onOpenClients}
          className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 group cursor-pointer border border-white/20"
          title="Cadastro e Lista de Clientes"
        >
          <div className="p-1.5 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
            <User className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-bold text-white text-center leading-tight drop-shadow px-1">
            Clientes
          </span>
        </button>

        <button
          onClick={onSearchOS}
          className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 group cursor-pointer border border-white/20"
          title="Buscar e Consultar OS"
        >
          <div className="p-1.5 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
            <Search className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-bold text-white text-center leading-tight drop-shadow px-1">
            Buscar OS
          </span>
        </button>

        <button
          onClick={onOpenSchedule}
          className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95 group cursor-pointer border border-white/20"
          title="Agenda e Visitas Técnicas"
        >
          <div className="p-1.5 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-bold text-white text-center leading-tight drop-shadow px-1">
            Agenda
          </span>
        </button>
      </div>

      {/* Área Central / Marca d'água */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {!hasCustomWallpaper ? (
          <div className="flex flex-col items-center justify-center opacity-40 pointer-events-none text-center">
            <VollenLogo size={110} className="mb-2 transition-transform hover:scale-105" />
            <h1 className="text-2xl font-black text-slate-800 tracking-wider uppercase drop-shadow-xs">
              Vollen - Gestão de OS
            </h1>
          </div>
        ) : null}

        {/* Rodapé sutil no canto inferior direito */}
        <div className="absolute bottom-1 right-2 text-[10px] text-slate-500 font-mono bg-white/80 px-3 py-0.5 rounded-full backdrop-blur-xs shadow-2xs border border-slate-200">
          Vollen - Gestão de OS v1.0
        </div>
      </div>
    </div>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    ABERTA: 'bg-sky-50 text-sky-700 border-sky-200',
    EM_ATENDIMENTO: 'bg-amber-50 text-amber-700 border-amber-200',
    AGUARDANDO_APROVACAO: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    AGUARDANDO_PECA: 'bg-orange-50 text-orange-700 border-orange-200',
    RETORNO_GARANTIA: 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold shadow-xs',
    FINALIZADA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CONCLUIDA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELADA: 'bg-red-50 text-red-700 border-red-200',
  };

  const labels: Record<string, string> = {
    RETORNO_GARANTIA: 'RETORNO EM GARANTIA',
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status] || 'bg-slate-100 text-slate-700'
        }`}
    >
      {labels[status] || status.replace('_', ' ')}
    </span>
  );
};
