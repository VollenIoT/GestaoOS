import React from 'react';
import { PlusCircle, Search, FileText, Calendar, User, Calculator, ShoppingCart } from 'lucide-react';
import { VollenLogo } from './VollenLogo';
import { getCurrentFeatures } from '../config/appFeatures';

interface DashboardProps {
  onNewOrder: () => void;
  onOpenMenuOS: () => void;
  onSearchOS: () => void;
  onOpenSchedule: () => void;
  onOpenClients: () => void;
  onOpenEstimates?: () => void;
  onOpenSales?: () => void;
  hasCustomWallpaper?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = React.memo(({
  onNewOrder,
  onOpenMenuOS,
  onSearchOS,
  onOpenSchedule,
  onOpenClients,
  onOpenEstimates,
  onOpenSales,
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

        {/* Botão Vendas Balcão / PDV */}
        <button
          onClick={() => {
            if (onOpenSales) onOpenSales();
          }}
          className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95 group cursor-pointer border border-white/20"
          title="Vendas de Peças e PDV de Balcão (F9)"
        >
          <div className="p-1.5 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-bold text-white text-center leading-tight drop-shadow px-1">
            Vendas
          </span>
        </button>

        {/* Botão Orçamento */}
        {getCurrentFeatures().hasHomeEstimateButton && (
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
        )}

        {/* Botão Clientes */}
        {getCurrentFeatures().hasHomeClientsButton && (
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
        )}

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

        {/* Botão Agenda */}
        {getCurrentFeatures().hasHomeScheduleButton && (
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
        )}
      </div>

      {/* Área Central / Marca d'água */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {!hasCustomWallpaper ? (
          <div className="flex flex-col items-center justify-center opacity-40 pointer-events-none text-center">
            <VollenLogo size={110} className="mb-2 transition-transform hover:scale-105" />
            <h1 className="text-2xl font-black text-slate-800 tracking-wider uppercase drop-shadow-xs">
              {getCurrentFeatures().edition === 'v4.0.0' ? 'Vollen - Gestão de OS e Vendas V4' : 'Vollen - Gestão de OS'}
            </h1>
          </div>
        ) : null}

        {/* Rodapé sutil no canto inferior direito */}
        <div className="absolute bottom-1 right-2 text-[10px] text-slate-500 font-mono bg-white/80 px-3 py-0.5 rounded-full backdrop-blur-xs shadow-2xs border border-slate-200">
          {getCurrentFeatures().edition === 'v4.0.0' ? 'Vollen - Gestão de OS e Vendas v4.0.0' : `Vollen - Gestão de OS ${getCurrentFeatures().edition.replace(/^v/, 'v')}`}
        </div>
      </div>
    </div>
  );
});

export const StatusBadge: React.FC<{ status: string }> = React.memo(({ status }) => {
  const normalizedKey = (status || '').toUpperCase().trim();

  // Tenta buscar a configuração de cor dinâmica cadastrada no sistema
  const dynamicStatus = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('custom_os_statuses_v3') || localStorage.getItem('system_os_statuses') || localStorage.getItem('vollen_os_statuses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.find(
            (s: any) =>
              (s.name || '').toUpperCase().trim() === normalizedKey ||
              (s.id || '').toUpperCase().trim() === normalizedKey ||
              (s.label || '').toUpperCase().trim() === normalizedKey
          );
        }
      }
    } catch {}
    return null;
  }, [normalizedKey]);

  if (dynamicStatus) {
    const color = dynamicStatus.color || dynamicStatus.textColor || '#0284c7';
    return (
      <span
        style={{
          backgroundColor: dynamicStatus.bgColor || `${color}18`,
          color: dynamicStatus.textColor || color,
          borderColor: dynamicStatus.borderColor || `${color}40`,
        }}
        className="px-2 py-0.5 rounded text-[10px] whitespace-nowrap inline-block border font-bold shadow-2xs"
      >
        {dynamicStatus.name || dynamicStatus.label || status}
      </span>
    );
  }

  const styles: Record<string, string> = {
    ABERTA: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    EM_ANALISE: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
    'EM ANÁLISE': 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
    'EM ANALISE': 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
    ORCAMENTO_GERADO: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold',
    'ORÇAMENTO GERADO': 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold',
    'ORCAMENTO GERADO': 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold',
    AGUARDANDO_CLIENTE: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
    'AGUARDANDO CLIENTE': 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
    EM_EXECUCAO: 'bg-sky-100 text-sky-800 border-sky-300 font-bold',
    'EM EXECUÇÃO': 'bg-sky-100 text-sky-800 border-sky-300 font-bold',
    'EM EXECUCAO': 'bg-sky-100 text-sky-800 border-sky-300 font-bold',
    AGUARDANDO_PECA: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    'AGUARDANDO PEÇA': 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    'AGUARDANDO PECA': 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    AGUARDANDO_APROVACAO: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
    'AGUARDANDO APROVAÇÃO': 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
    RETORNO_GARANTIA: 'bg-red-200 text-red-900 border-red-400 font-extrabold animate-pulse',
    'RETORNO EM GARANTIA': 'bg-red-200 text-red-900 border-red-400 font-extrabold animate-pulse',
    APARELHO_LIBERADO: 'bg-emerald-200 text-emerald-900 border-emerald-400 font-bold',
    'APARELHO LIBERADO': 'bg-emerald-200 text-emerald-900 border-emerald-400 font-bold',
    FINALIZADA: 'bg-slate-200 text-slate-700 border-slate-300 font-medium',
    CONCLUIDA: 'bg-slate-200 text-slate-700 border-slate-300 font-medium',
    CANCELADA: 'bg-rose-50 text-rose-600 border-rose-200',
    CANCELADO: 'bg-rose-50 text-rose-600 border-rose-200',
    GARANTIA_FINALIZADA: 'bg-slate-200 text-slate-700 border-slate-300 font-medium',
    GARANTIA_FABRICA: 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
    'GARANTIA FÁBRICA': 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
    'GARANTIA FABRICA': 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
    GARANTIA_EMPRESA: 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold',
    'GARANTIA EMPRESA': 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold',
    IRREPARAVEL: 'bg-red-100 text-red-800 border-red-300 font-bold',
    'IRREPARÁVEL': 'bg-red-100 text-red-800 border-red-300 font-bold',
  };

  const labels: Record<string, string> = {
    ABERTA: 'Aberta',
    EM_ANALISE: 'Em Análise',
    'EM ANÁLISE': 'Em Análise',
    'EM ANALISE': 'Em Análise',
    ORCAMENTO_GERADO: 'Orçamento Gerado',
    'ORÇAMENTO GERADO': 'Orçamento Gerado',
    'ORCAMENTO GERADO': 'Orçamento Gerado',
    AGUARDANDO_CLIENTE: 'Aguard. Cliente',
    'AGUARDANDO CLIENTE': 'Aguard. Cliente',
    EM_EXECUCAO: 'Em Execução',
    'EM EXECUÇÃO': 'Em Execução',
    'EM EXECUCAO': 'Em Execução',
    AGUARDANDO_PECA: 'Aguardando Peça',
    'AGUARDANDO PEÇA': 'Aguardando Peça',
    'AGUARDANDO PECA': 'Aguardando Peça',
    AGUARDANDO_APROVACAO: 'Aguard. Aprovação',
    'AGUARDANDO APROVAÇÃO': 'Aguard. Aprovação',
    RETORNO_GARANTIA: 'Retorno Garantia',
    'RETORNO EM GARANTIA': 'Retorno Garantia',
    APARELHO_LIBERADO: 'Liberado / Pronto',
    'APARELHO LIBERADO': 'Liberado / Pronto',
    FINALIZADA: 'Finalizada',
    CONCLUIDA: 'Concluída',
    CANCELADA: 'Cancelada',
    CANCELADO: 'Cancelada',
    GARANTIA_FINALIZADA: 'Garantia Finalizada',
    GARANTIA_FABRICA: 'Garantia Fábrica',
    'GARANTIA FÁBRICA': 'Garantia Fábrica',
    'GARANTIA FABRICA': 'Garantia Fábrica',
    GARANTIA_EMPRESA: 'Garantia Empresa',
    'GARANTIA EMPRESA': 'Garantia Empresa',
    IRREPARAVEL: 'Irreparável',
    'IRREPARÁVEL': 'Irreparável',
  };

  const badgeStyle = styles[normalizedKey] || styles[status] || 'bg-sky-100 text-sky-900 border-sky-300 font-bold';
  const labelText = labels[normalizedKey] || labels[status] || status.replace(/_/g, ' ');

  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap inline-block border ${badgeStyle}`}
    >
      {labelText}
    </span>
  );
});
