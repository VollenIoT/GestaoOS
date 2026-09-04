import React from 'react';
import { PlusCircle, Search, FileText, Calendar, User, Calculator, ShoppingCart } from 'lucide-react';
import { VollenLogo } from './VollenLogo';

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

export const Dashboard: React.FC<DashboardProps> = ({
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
  const normalizedKey = (status || '').toUpperCase().trim();

  // Tenta buscar a configuração de cor dinâmica cadastrada no sistema
  const dynamicStatus = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('system_os_statuses') || localStorage.getItem('vollen_os_statuses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.find(
            (s: any) =>
              (s.name || '').toUpperCase().trim() === normalizedKey ||
              (s.id || '').toUpperCase().trim() === normalizedKey ||
              (s.code || '').toUpperCase().trim() === normalizedKey
          );
        }
      }
    } catch {}
    return null;
  }, [normalizedKey]);

  // Se houver uma cor personalizada configurada (HEX/RGB)
  if (dynamicStatus && dynamicStatus.color) {
    const customHex = dynamicStatus.color;
    const labelText = dynamicStatus.name ? String(dynamicStatus.name).replace(/_/g, ' ') : status.replace(/_/g, ' ');
    return (
      <span
        style={{
          backgroundColor: `${customHex}1A`, // ~10% de opacidade para o fundo
          color: customHex,
          borderColor: `${customHex}66`, // ~40% de opacidade para a borda
        }}
        className="px-2 py-0.5 rounded text-[10px] whitespace-nowrap inline-block border font-bold shadow-2xs"
      >
        {labelText}
      </span>
    );
  }

  const styles: Record<string, string> = {
    ABERTA: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    ABERTO: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    ORCAMENTO_APROVADO: 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
    'ORÇAMENTO APROVADO': 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
    EM_ATENDIMENTO: 'bg-sky-100 text-sky-900 border-sky-300 font-bold',
    'EM ATENDIMENTO': 'bg-sky-100 text-sky-900 border-sky-300 font-bold',
    APROVADO: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
    VISITA_TECNICA: 'bg-sky-100 text-sky-900 border-sky-300 font-bold',
    'VISITA TÉCNICA': 'bg-sky-100 text-sky-900 border-sky-300 font-bold',
    AGUARDANDO_PECA: 'bg-orange-100 text-orange-900 border-orange-300 font-bold',
    'AGUARDANDO PEÇA': 'bg-orange-100 text-orange-900 border-orange-300 font-bold',
    'AGUARDANDO PECA': 'bg-orange-100 text-orange-900 border-orange-300 font-bold',
    AGUARDANDO_APROVACAO: 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold',
    'AGUARDANDO APROVAÇÃO': 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold',
    RETORNO_GARANTIA: 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold shadow-2xs',
    'RETORNO EM GARANTIA': 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold shadow-2xs',
    APARELHO_LIBERADO: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
    'APARELHO LIBERADO': 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
    FINALIZADA: 'bg-teal-100 text-teal-900 border-teal-400 font-bold',
    CONCLUIDA: 'bg-teal-100 text-teal-900 border-teal-400 font-bold',
    CANCELADA: 'bg-red-100 text-red-900 border-red-300 font-bold',
    CANCELADO: 'bg-red-100 text-red-900 border-red-300 font-bold',
    GARANTIA_FINALIZADA: 'bg-teal-100 text-teal-900 border-teal-400 font-bold',
  };

  const labels: Record<string, string> = {
    ABERTA: 'Aberta',
    ABERTO: 'Aberta',
    ORCAMENTO_APROVADO: 'Orçamento Aprovado',
    'ORÇAMENTO APROVADO': 'Orçamento Aprovado',
    EM_ATENDIMENTO: 'Em Atendimento',
    'EM ATENDIMENTO': 'Em Atendimento',
    APROVADO: 'Aprovado',
    VISITA_TECNICA: 'Visita Técnica',
    'VISITA TÉCNICA': 'Visita Técnica',
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
};
