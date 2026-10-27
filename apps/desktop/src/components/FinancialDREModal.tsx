import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Calendar,
  Users,
  Wrench,
  Percent,
  Download,
  Printer,
  FileSpreadsheet,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import { modalStack } from '../utils/modalStack';
import { AccountBill } from './AccountsModal';
import { Part } from './PartsModal';

interface FinancialDREModalProps {
  isOpen: boolean;
  orders: any[];
  parts: Part[];
  accounts?: AccountBill[];
  onClose: () => void;
}

export const FinancialDREModal: React.FC<FinancialDREModalProps> = ({
  isOpen,
  orders,
  parts,
  accounts = [],
  onClose,
}) => {
  // Período de análise
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [activeTab, setActiveTab] = useState<'dre' | 'technicians' | 'orders'>('dre');

  useEffect(() => {
    if (isOpen) {
      modalStack.register('FinancialDREModal', onClose);
    } else {
      modalStack.unregister('FinancialDREModal');
    }
    return () => {
      modalStack.unregister('FinancialDREModal');
    };
  }, [isOpen, onClose]);

  // Mapa de custo de peças para busca rápida
  const partsCostMap = useMemo(() => {
    const map = new Map<string, number>();
    parts.forEach((p) => {
      const cleanCost = parseFloat(String(p.costPrice || '0').replace(/\./g, '').replace(',', '.')) || 0;
      map.set(p.name.trim().toLowerCase(), cleanCost);
      if (p.code) map.set(p.code.trim().toLowerCase(), cleanCost);
      if (p.id) map.set(p.id, cleanCost);
    });
    return map;
  }, [parts]);

  // Filtra OS finalizadas/concluídas no período selecionado
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!o) return false;
      const st = String(o.status || '').toUpperCase().trim();
      if (st !== 'FINALIZADA' && st !== 'CONCLUIDA' && st !== 'ENTREGUE') return false;

      const dateStr = o.finishedAt || o.deliveryDate || o.updatedAt || o.createdAt || '';
      if (!dateStr) return false;

      return dateStr.startsWith(selectedMonth);
    });
  }, [orders, selectedMonth]);

  // Cálculos DRE e Lucro Real por OS
  const analysisData = useMemo(() => {
    let grossRevenue = 0;           // Receita Bruta (Faturamento)
    let totalPartsCost = 0;         // Custo Direto de Peças
    let totalServicesRevenue = 0;   // Receita de Mão de Obra
    let totalPartsRevenue = 0;      // Receita de Peças Cobradas
    let totalCommissions = 0;       // Comissões Provisionadas / Pagas

    // Desempenho e Lucro por Técnico
    const techStats = new Map<string, {
      count: number;
      revenue: number;
      partsCost: number;
      grossProfit: number;
    }>();

    const ordersAnalysis = filteredOrders.map((o) => {
      const totalAmount = parseFloat(String(o.totalAmount || o.finalValue || '0').replace(/\./g, '').replace(',', '.')) || 0;
      grossRevenue += totalAmount;

      // Extrai peças usadas
      const rawParts = o.partsUsed || o.parts || o.partsList || [];
      let orderPartsCost = 0;
      let orderPartsSold = 0;

      if (Array.isArray(rawParts)) {
        rawParts.forEach((prt: any) => {
          const qty = Number(prt.qty || prt.quantity || 1);
          const pSold = parseFloat(String(prt.price || prt.unitPrice || '0').replace(/\./g, '').replace(',', '.')) || 0;
          orderPartsSold += pSold * qty;

          // Custo da peça
          const pCostGiven = parseFloat(String(prt.costPrice || '0').replace(/\./g, '').replace(',', '.'));
          let unitCost = pCostGiven > 0 ? pCostGiven : 0;
          if (!unitCost) {
            const byName = partsCostMap.get(String(prt.name || '').trim().toLowerCase()) || 0;
            unitCost = byName;
          }
          orderPartsCost += unitCost * qty;
        });
      }

      totalPartsCost += orderPartsCost;
      totalPartsRevenue += orderPartsSold;

      // Serviços executados
      const rawServices = o.servicesExecuted || o.services || o.servicesList || [];
      let orderServicesSold = 0;
      if (Array.isArray(rawServices)) {
        rawServices.forEach((srv: any) => {
          const sPrice = parseFloat(String(srv.price || srv.value || '0').replace(/\./g, '').replace(',', '.')) || 0;
          orderServicesSold += sPrice;
        });
      }
      totalServicesRevenue += orderServicesSold;

      // Lucro Líquido Real desta OS
      const orderRealProfit = totalAmount - orderPartsCost;
      const profitMarginPercent = totalAmount > 0 ? (orderRealProfit / totalAmount) * 100 : 0;

      // Agrupa por técnico
      const techName = o.technician?.name || o.technicianName || 'Técnico Não Definido';
      const currentTech = techStats.get(techName) || { count: 0, revenue: 0, partsCost: 0, grossProfit: 0 };
      techStats.set(techName, {
        count: currentTech.count + 1,
        revenue: currentTech.revenue + totalAmount,
        partsCost: currentTech.partsCost + orderPartsCost,
        grossProfit: currentTech.grossProfit + orderRealProfit,
      });

      return {
        id: o.id,
        code: o.code || 'S/N',
        clientName: o.client?.name || 'Cliente Balcão',
        equipment: `${o.equipment?.type || ''} ${o.equipment?.brand || ''} ${o.equipment?.model || ''}`.trim(),
        totalAmount,
        partsCost: orderPartsCost,
        realProfit: orderRealProfit,
        profitMarginPercent,
        techName,
      };
    });

    // Despesas Operacionais pagas no período via Contas a Pagar
    const periodExpenses = accounts
      .filter((acc) => {
        if (acc.type !== 'PAGAR' || acc.status !== 'PAGO') return false;
        const paidDate = acc.paymentDate || acc.dueDate || '';
        return paidDate.startsWith(selectedMonth);
      })
      .reduce((sum, acc) => sum + (acc.amountPaid || acc.amount || 0), 0);

    // Lucro Bruto Operacional
    const grossProfit = grossRevenue - totalPartsCost;
    // Lucro Líquido Real Final
    const netProfit = grossProfit - periodExpenses;
    const netMarginPercent = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    // Ticket Médio
    const averageTicket = filteredOrders.length > 0 ? (grossRevenue / filteredOrders.length) : 0;
    const averageProfitPerOrder = filteredOrders.length > 0 ? (grossProfit / filteredOrders.length) : 0;

    // Array de técnicos ordenado por maior lucro gerado
    const techniciansRanking = Array.from(techStats.entries())
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        revenue: stats.revenue,
        partsCost: stats.partsCost,
        grossProfit: stats.grossProfit,
        marginPercent: stats.revenue > 0 ? (stats.grossProfit / stats.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.grossProfit - a.grossProfit);

    return {
      grossRevenue,
      totalPartsCost,
      totalPartsRevenue,
      totalServicesRevenue,
      grossProfit,
      periodExpenses,
      netProfit,
      netMarginPercent,
      ordersCount: filteredOrders.length,
      averageTicket,
      averageProfitPerOrder,
      ordersAnalysis,
      techniciansRanking,
    };
  }, [filteredOrders, partsCostMap, accounts, selectedMonth]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100/90 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800 tracking-wide">
                  DRE & Dashboard de Lucro Real (Visão do Dono)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                  v4.0.0 Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Demonstrativo financeiro completo, margem real por OS e produtividade lucrativa da equipe.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Seletor de Mês */}
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-sm">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-bold focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Abas Superiores */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-slate-50 border-b border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('dre')}
            className={`px-4 py-2 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'dre'
                ? 'bg-white text-emerald-700 border-t border-x border-slate-300 border-b-transparent shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Demonstrativo de Resultado (DRE)
          </button>
          <button
            onClick={() => setActiveTab('technicians')}
            className={`px-4 py-2 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'technicians'
                ? 'bg-white text-emerald-700 border-t border-x border-slate-300 border-b-transparent shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4" />
            Ranking de Lucro por Técnico ({analysisData.techniciansRanking.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-white text-emerald-700 border-t border-x border-slate-300 border-b-transparent shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Lucro Individual por OS ({analysisData.ordersAnalysis.length})
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {/* Cards KPI Rápidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Faturamento Bruto */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>Faturamento Bruto</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-slate-800">
                R$ {analysisData.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-500">
                {analysisData.ordersCount} Ordens de Serviço finalizadas
              </span>
            </div>

            {/* Card 2: Custo das Peças (CPV) */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>Custo de Peças (CPV)</span>
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-xl font-black text-red-600">
                R$ {analysisData.totalPartsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-500">
                {analysisData.grossRevenue > 0
                  ? `${((analysisData.totalPartsCost / analysisData.grossRevenue) * 100).toFixed(1)}% do faturamento`
                  : '0% do faturamento'}
              </span>
            </div>

            {/* Card 3: Lucro Líquido Real */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-emerald-800 text-xs mb-1">
                <span>Lucro Líquido Real</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-emerald-700">
                R$ {analysisData.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-emerald-600 font-bold">
                Margem Líquida: {analysisData.netMarginPercent.toFixed(1)}%
              </span>
            </div>

            {/* Card 4: Ticket Médio */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>Ticket Médio por OS</span>
                <Percent className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-black text-slate-800">
                R$ {analysisData.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-blue-600 font-semibold">
                Lucro médio: R$ {analysisData.averageProfitPerOrder.toFixed(2).replace('.', ',')} / OS
              </span>
            </div>
          </div>

          {/* TAB 1: DRE Estruturado */}
          {activeTab === 'dre' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-xs shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Estrutura do DRE — Mês {selectedMonth}
                </h3>
                <span className="text-slate-500 text-[11px]">
                  Regime de Competência / Finalização de Serviços
                </span>
              </div>

              <div className="space-y-3 font-mono">
                {/* 1. Receita Bruta */}
                <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-600">(+) 1.</span>
                    <strong className="text-slate-800 text-sm">RECEITA BRUTA OPERACIONAL</strong>
                  </div>
                  <strong className="text-emerald-600 text-sm">
                    R$ {analysisData.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                {/* Subdivisão da Receita */}
                <div className="pl-6 space-y-1.5 text-slate-600 text-[11px]">
                  <div className="flex justify-between">
                    <span>• Receita de Mão de Obra e Serviços:</span>
                    <span>R$ {analysisData.totalServicesRevenue.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Receita de Peças Cobradas ao Cliente:</span>
                    <span>R$ {analysisData.totalPartsRevenue.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                {/* 2. Custos Diretos */}
                <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-600">(-) 2.</span>
                    <strong className="text-slate-800 text-sm">CUSTO DAS MERCADORIAS E PEÇAS (CPV)</strong>
                  </div>
                  <strong className="text-red-600 text-sm">
                    - R$ {analysisData.totalPartsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                {/* 3. Lucro Bruto */}
                <div className="flex items-center justify-between py-2.5 px-3 bg-blue-50/60 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-700">(=) 3.</span>
                    <strong className="text-slate-800 text-sm">LUCRO BRUTO OPERACIONAL</strong>
                  </div>
                  <strong className="text-blue-700 text-sm">
                    R$ {analysisData.grossProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                {/* 4. Despesas Operacionais */}
                <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-600">(-) 4.</span>
                    <strong className="text-slate-800 text-sm">DESPESAS OPERACIONAIS FIXAS/VARIÁVEIS</strong>
                  </div>
                  <strong className="text-amber-600 text-sm">
                    - R$ {analysisData.periodExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                {/* 5. Lucro Líquido Final */}
                <div className="flex items-center justify-between py-3 px-4 bg-emerald-50 border-2 border-emerald-500 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-800 text-base">(=) 5.</span>
                    <strong className="text-slate-800 text-base">LUCRO LÍQUIDO REAL DO PERÍODO</strong>
                  </div>
                  <div className="text-right">
                    <strong className="text-emerald-700 text-base block">
                      R$ {analysisData.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      Margem Líquida Efetiva: {analysisData.netMarginPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Ranking por Técnico */}
          {activeTab === 'technicians' && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Lucratividade Real Gerada por Técnico
                </span>
                <span className="text-xs text-slate-500">
                  Ordenado por maior lucro real deixado na assistência
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Posição</th>
                      <th className="p-3">Técnico</th>
                      <th className="p-3 text-center">OSs Feitas</th>
                      <th className="p-3 text-right">Faturamento Total</th>
                      <th className="p-3 text-right">Custo de Peças</th>
                      <th className="p-3 text-right">Lucro Líquido Gerado</th>
                      <th className="p-3 text-center">Margem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {analysisData.techniciansRanking.map((tech, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-emerald-600">
                          #{idx + 1}
                        </td>
                        <td className="p-3 font-bold text-slate-800 flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-500" />
                          {tech.name}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800">
                          {tech.count}
                        </td>
                        <td className="p-3 text-right text-slate-700">
                          R$ {tech.revenue.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-3 text-right text-red-600 font-medium">
                          R$ {tech.partsCost.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-700">
                          R$ {tech.grossProfit.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                            {tech.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Lucro Individual por OS */}
          {activeTab === 'orders' && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Detalhamento de Lucro Real por Ordem de Serviço
                </span>
                <span className="text-xs text-slate-500">
                  {analysisData.ordersAnalysis.length} Ordens no período
                </span>
              </div>
              <div className="overflow-x-auto max-h-[50vh]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 backdrop-blur-sm z-10">
                    <tr>
                      <th className="p-3">Nº OS</th>
                      <th className="p-3">Cliente / Aparelho</th>
                      <th className="p-3">Técnico</th>
                      <th className="p-3 text-right">Valor Pago</th>
                      <th className="p-3 text-right">Custo Peças</th>
                      <th className="p-3 text-right">Lucro Líquido</th>
                      <th className="p-3 text-center">Margem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {analysisData.ordersAnalysis.map((ord, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-amber-700">
                          #{ord.code}
                        </td>
                        <td className="p-3">
                          <strong className="text-slate-800 block truncate max-w-xs">{ord.clientName}</strong>
                          <span className="text-[11px] text-slate-500 truncate block max-w-xs">{ord.equipment || 'Equipamento'}</span>
                        </td>
                        <td className="p-3 text-slate-700">
                          {ord.techName}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800">
                          R$ {ord.totalAmount.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-3 text-right font-medium text-red-600">
                          R$ {ord.partsCost.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-700">
                          R$ {ord.realProfit.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.profitMarginPercent >= 50
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : 'bg-amber-100 text-amber-700 border border-amber-300'
                          }`}>
                            {ord.profitMarginPercent.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100/90 border-t border-slate-200">
          <span className="text-xs text-slate-500">
            * O cálculo considera o custo de aquisição cadastrado nas peças e despesas quitadas nas Contas a Pagar.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            Fechar Relatório
          </button>
        </div>
      </div>
    </div>
  );
};
