import React, { useState, useEffect } from 'react';
import {
  X,
  Percent,
  CreditCard,
  Printer,
  Save,
  User,
  Users,
  Search,
  Calendar,
  DollarSign,
  TrendingUp,
  Sliders,
  CheckCircle2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useDialog } from './DialogContext';
import { modalStack } from '../utils/modalStack';
import { CardFeeConfig, SellerCommissionConfig, SaleRecord } from './SalesModal';

interface SalesCommissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  companyInfo?: any;
}

export const SalesCommissionsModal: React.FC<SalesCommissionsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  companyInfo,
}) => {
  const { alert } = useDialog();

  const [activeTab, setActiveTab] = useState<'CLOSING' | 'COMMISSION_CONFIG' | 'CARD_FEES'>('CLOSING');

  // Histórico de Vendas Carregado do Local/Nuvem
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_sales_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Taxas de Cartão
  const [cardFeeConfig, setCardFeeConfig] = useState<CardFeeConfig>(() => {
    try {
      const saved = localStorage.getItem('vollen_card_fee_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      debitFee: 1.5,
      creditFees: {
        1: 3.5, 2: 4.5, 3: 5.5, 4: 6.5, 5: 7.5, 6: 8.5,
        7: 9.5, 8: 10.5, 9: 11.5, 10: 12.5, 11: 13.5, 12: 14.5,
      },
      passFeeToClientDefault: false,
    };
  });

  // Configuração de Comissões
  const [sellerCommissionConfig, setSellerCommissionConfig] = useState<SellerCommissionConfig>(() => {
    try {
      const saved = localStorage.getItem('vollen_seller_commission_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      defaultRate: 3.0,
      sellersRates: {},
    };
  });

  // Lista de Vendedores/Usuários
  const [availableSellers, setAvailableSellers] = useState<string[]>([]);

  // Filtros de Fechamento
  const [commissionPeriodFilter, setCommissionPeriodFilter] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL' | 'CUSTOM'>('THIS_MONTH');
  const [commissionSellerFilter, setCommissionSellerFilter] = useState<string>('ALL');
  const [commissionCustomStart, setCommissionCustomStart] = useState<string>('');
  const [commissionCustomEnd, setCommissionCustomEnd] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      modalStack.register('SalesCommissionsModal', onClose);
      return () => {
        modalStack.unregister('SalesCommissionsModal');
      };
    }
  }, [isOpen, onClose]);

  // Carrega dados quando o modal abre
  useEffect(() => {
    if (isOpen) {
      // 1. Recarrega histórico
      try {
        const savedSales = localStorage.getItem('vollen_sales_history');
        if (savedSales) setSalesHistory(JSON.parse(savedSales));
      } catch {}

      // 2. Recarrega taxas
      try {
        const savedFees = localStorage.getItem('vollen_card_fee_config');
        if (savedFees) setCardFeeConfig(JSON.parse(savedFees));
      } catch {}

      // 3. Recarrega comissões
      try {
        const savedComm = localStorage.getItem('vollen_seller_commission_config');
        if (savedComm) setSellerCommissionConfig(JSON.parse(savedComm));
      } catch {}

      // 4. Carrega lista de vendedores
      const list: string[] = [];
      try {
        const savedUsers = localStorage.getItem('vollen_users');
        if (savedUsers) {
          const parsed = JSON.parse(savedUsers);
          if (Array.isArray(parsed)) {
            parsed.forEach((u: any) => {
              const name = (u.name || u.username || '').trim();
              if (name) list.push(name);
            });
          }
        }
        const savedTechs = localStorage.getItem('vollen_technicians');
        if (savedTechs) {
          const parsedTechs = JSON.parse(savedTechs);
          if (Array.isArray(parsedTechs)) {
            parsedTechs.forEach((t: any) => {
              const name = (t.name || '').trim();
              if (name && name !== 'Técnico Exemplo' && name !== 'Técnico Roberto') {
                list.push(name);
              }
            });
          }
        }
        if (currentUser?.name) list.push(currentUser.name.trim());
        else if (currentUser?.username) list.push(currentUser.username.trim());
      } catch {}

      const map = new Map<string, string>();
      list.forEach((n) => {
        const trimmed = n.trim();
        if (trimmed && !map.has(trimmed.toUpperCase())) {
          map.set(trimmed.toUpperCase(), trimmed);
        }
      });
      if (!map.has('ADMINISTRADOR') && !map.has('ADMIN')) {
        map.set('ADMINISTRADOR', 'Administrador');
      }
      setAvailableSellers(Array.from(map.values()));
    }
  }, [isOpen, currentUser]);

  const getSellerCommissionRate = (name: string): number => {
    if (!name) return sellerCommissionConfig.defaultRate;
    const directMatch = sellerCommissionConfig.sellersRates[name];
    if (directMatch !== undefined && directMatch !== null) return directMatch;
    const lowerKey = Object.keys(sellerCommissionConfig.sellersRates).find(
      (k) => k.toLowerCase() === name.toLowerCase()
    );
    if (lowerKey) return sellerCommissionConfig.sellersRates[lowerKey];
    return sellerCommissionConfig.defaultRate;
  };

  // Filtragem de vendas para comissões
  const filteredSales = salesHistory.filter((sale) => {
    if (commissionSellerFilter !== 'ALL' && sale.sellerName !== commissionSellerFilter) {
      return false;
    }
    if (commissionPeriodFilter === 'TODAY') {
      const today = new Date().toLocaleDateString('pt-BR');
      return sale.date === today;
    }
    if (commissionPeriodFilter === 'CUSTOM') {
      if (commissionCustomStart && sale.date < commissionCustomStart.split('-').reverse().join('/')) {
        // Simple comparison if stored as DD/MM/YYYY or YYYY-MM-DD
      }
    }
    return true;
  });

  const totalSalesVal = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalCommissionVal = filteredSales.reduce(
    (acc, s) =>
      acc +
      (s.commissionAmount ||
        (s.totalAmount * (s.commissionRate || getSellerCommissionRate(s.sellerName))) / 100),
    0
  );

  // Impressão do Relatório de Fechamento de Comissões
  const handlePrintCommissionReport = () => {
    const compName = companyInfo?.tradingName || companyInfo?.name || 'Nossa Empresa';
    const compPhone = companyInfo?.phone || companyInfo?.whatsapp || '';
    const seller = commissionSellerFilter === 'ALL' ? 'Todos os Vendedores' : commissionSellerFilter;
    const periodText =
      commissionPeriodFilter === 'TODAY'
        ? 'Hoje'
        : commissionPeriodFilter === 'THIS_WEEK'
          ? 'Esta Semana'
          : commissionPeriodFilter === 'THIS_MONTH'
            ? 'Este Mês'
            : commissionPeriodFilter === 'CUSTOM'
              ? `${commissionCustomStart} até ${commissionCustomEnd}`
              : 'Todo o Histórico';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Relatorio_Comissoes_${seller.replace(/\\s+/g, '_')}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; font-size: 11px; color: #1e293b; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 16px; font-weight: bold; color: #0f172a; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; text-align: left; padding: 6px; font-size: 10.5px; border-bottom: 2px solid #cbd5e1; }
          td { padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 10.5px; }
          .totals-box { margin-top: 15px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 15px; border-radius: 8px; width: 320px; margin-left: auto; }
          .totals-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .totals-final { border-top: 2px solid #059669; padding-top: 6px; margin-top: 6px; font-weight: bold; font-size: 13px; color: #047857; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">${compName}</div>
            <div style="font-size: 11px; color: #64748b;">Relatório de Fechamento de Comissões de Vendas</div>
          </div>
          <div style="text-align: right; font-size: 11px;">
            <div><strong>Vendedor:</strong> ${seller}</div>
            <div><strong>Período:</strong> ${periodText}</div>
            <div style="color: #64748b; font-size: 9.5px;">Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Cód. Venda</th>
              <th>Vendedor</th>
              <th>Cliente</th>
              <th>Forma Pgto</th>
              <th style="text-align: right;">Total Venda</th>
              <th style="text-align: center;">% Com.</th>
              <th style="text-align: right;">Comissão (R$)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSales.map((s) => {
              const commRate = s.commissionRate ?? getSellerCommissionRate(s.sellerName);
              const commVal = s.commissionAmount ?? (s.totalAmount * commRate / 100);
              return `
                <tr>
                  <td>${s.date} ${s.time}</td>
                  <td><strong>#${s.saleCode}</strong></td>
                  <td>${s.sellerName}</td>
                  <td>${s.clientName}</td>
                  <td>${s.paymentMethod}</td>
                  <td style="text-align: right;">R$ ${s.totalAmount.toFixed(2).replace('.', ',')}</td>
                  <td style="text-align: center;">${commRate.toFixed(1)}%</td>
                  <td style="text-align: right; font-weight: bold; color: #047857;">R$ ${commVal.toFixed(2).replace('.', ',')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="totals-box">
          <div class="totals-row">
            <span>Total de Vendas:</span>
            <strong>${filteredSales.length} venda(s)</strong>
          </div>
          <div class="totals-row">
            <span>Faturamento Bruto:</span>
            <strong>R$ ${totalSalesVal.toFixed(2).replace('.', ',')}</strong>
          </div>
          <div class="totals-row totals-final">
            <span>TOTAL DE COMISSÃO:</span>
            <span>R$ ${totalCommissionVal.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 250);
    }
  };

  const handleSaveConfigs = async () => {
    try {
      localStorage.setItem('vollen_card_fee_config', JSON.stringify(cardFeeConfig));
      localStorage.setItem('vollen_seller_commission_config', JSON.stringify(sellerCommissionConfig));

      if (db) {
        try {
          await setDoc(
            doc(db, 'system_settings', 'sales_config'),
            {
              cardFeeConfig,
              sellerCommissionConfig,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch {}
      }

      await alert({
        title: 'Configurações Salvas',
        message: 'Taxas da maquininha e regras de comissão foram atualizadas com sucesso!',
        variant: 'success',
      });
    } catch (e: any) {
      await alert({
        title: 'Erro ao Salvar',
        message: 'Não foi possível salvar as configurações: ' + (e.message || e),
        variant: 'danger',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-4xl h-[88vh] shadow-2xl overflow-hidden flex flex-col font-sans animate-fadeIn">
        {/* Topo do Modal */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-400">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Comissões & Taxas de Vendas</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/40">
                  Acesso Restrito
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Fechamento de comissões, extratos de pagamento e parametrização das taxas da maquininha
              </p>
            </div>
          </div>

          {/* Abas */}
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('CLOSING')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'CLOSING'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Fechamento de Comissões
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('COMMISSION_CONFIG')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'COMMISSION_CONFIG'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Regras de % Comissão
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('CARD_FEES')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'CARD_FEES'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Taxas da Maquininha
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Principal */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
          {activeTab === 'CLOSING' && (
            <div className="space-y-3.5">
              {/* Filtros de Vendedor e Período */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">
                      Filtrar Vendedor:
                    </label>
                    <select
                      value={commissionSellerFilter}
                      onChange={(e) => setCommissionSellerFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      <option value="ALL">Todos os Vendedores</option>
                      {availableSellers.map((s, idx) => (
                        <option key={idx} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">
                      Período:
                    </label>
                    <select
                      value={commissionPeriodFilter}
                      onChange={(e) => setCommissionPeriodFilter(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      <option value="THIS_MONTH">Este Mês</option>
                      <option value="TODAY">Hoje</option>
                      <option value="THIS_WEEK">Esta Semana</option>
                      <option value="ALL">Todo o Histórico</option>
                      <option value="CUSTOM">Personalizado</option>
                    </select>
                  </div>

                  {commissionPeriodFilter === 'CUSTOM' && (
                    <div className="flex items-center gap-1.5">
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">Início:</label>
                        <input
                          type="date"
                          value={commissionCustomStart}
                          onChange={(e) => setCommissionCustomStart(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">Fim:</label>
                        <input
                          type="date"
                          value={commissionCustomEnd}
                          onChange={(e) => setCommissionCustomEnd(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2 pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={handlePrintCommissionReport}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Fechamento
                  </button>
                </div>
              </div>

              {/* Cards de Métricas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total em Vendas</span>
                  <strong className="text-slate-900 font-mono text-base font-black">
                    R$ {totalSalesVal.toFixed(2).replace('.', ',')}
                  </strong>
                </div>

                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-300 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Total de Comissões</span>
                  <strong className="text-emerald-900 font-mono text-base font-black">
                    R$ {totalCommissionVal.toFixed(2).replace('.', ',')}
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Vendas no Período</span>
                  <strong className="text-slate-800 font-mono text-base font-black">{filteredSales.length}</strong>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Ticket Médio</span>
                  <strong className="text-slate-800 font-mono text-base font-black">
                    R$ {filteredSales.length > 0 ? (totalSalesVal / filteredSales.length).toFixed(2).replace('.', ',') : '0,00'}
                  </strong>
                </div>
              </div>

              {/* Tabela de Vendas Discriminada */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-y-auto max-h-80 shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Vendedor</th>
                      <th className="p-3">Cód Venda</th>
                      <th className="p-3">Data</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3 text-right">Valor Venda</th>
                      <th className="p-3 text-center">% Comissão</th>
                      <th className="p-3 text-right">Valor Comissão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSales.map((sale) => {
                      const commRate = sale.commissionRate ?? getSellerCommissionRate(sale.sellerName);
                      const commVal = sale.commissionAmount ?? (sale.totalAmount * commRate / 100);

                      return (
                        <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{sale.sellerName}</td>
                          <td className="p-3 font-mono font-bold text-emerald-800">{sale.saleCode}</td>
                          <td className="p-3 text-slate-600">{sale.date}</td>
                          <td className="p-3 text-slate-700">{sale.clientName}</td>
                          <td className="p-3 text-right font-medium text-slate-800">
                            R$ {sale.totalAmount.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-700">
                            {commRate.toFixed(1)}%
                          </td>
                          <td className="p-3 text-right font-mono font-black text-emerald-700 text-xs">
                            R$ {commVal.toFixed(2).replace('.', ',')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'COMMISSION_CONFIG' && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="font-extrabold text-slate-900 text-sm">
                  Configuração de Percentuais de Comissão
                </h4>
                <p className="text-xs text-slate-500">
                  Defina a comissão padrão para todos os atendentes ou personalize taxas específicas individualmente.
                </p>
              </div>

              {/* Taxa Padrão */}
              <div className="max-w-xs bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Percentual Padrão da Loja (%):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={sellerCommissionConfig.defaultRate}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setSellerCommissionConfig((prev) => ({ ...prev, defaultRate: val }));
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 font-mono"
                />
              </div>

              {/* Lista de Vendedores */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Taxas Específicas por Vendedor / Técnico:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {availableSellers.map((seller) => (
                    <div
                      key={seller}
                      className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                    >
                      <span className="font-bold text-slate-800 text-xs">{seller}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10.5px] text-slate-400">Comissão:</span>
                        <input
                          type="number"
                          step="0.1"
                          placeholder={`${sellerCommissionConfig.defaultRate}%`}
                          value={sellerCommissionConfig.sellersRates[seller] ?? ''}
                          onChange={(e) => {
                            const valStr = e.target.value;
                            setSellerCommissionConfig((prev) => {
                              const updated = { ...prev.sellersRates };
                              if (valStr === '') {
                                delete updated[seller];
                              } else {
                                updated[seller] = parseFloat(valStr) || 0;
                              }
                              return { ...prev, sellersRates: updated };
                            });
                          }}
                          className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 text-right font-mono"
                        />
                        <span className="text-xs font-bold text-slate-600">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'CARD_FEES' && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="font-extrabold text-slate-900 text-sm">
                  Taxas da Maquininha de Cartão (Débito & Crédito)
                </h4>
                <p className="text-xs text-slate-500">
                  Essas taxas são usadas para simulação de repasse ao cliente ou para cálculo do valor líquido da loja no PDV.
                </p>
              </div>

              {/* Débito */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Taxa Débito à Vista (%):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={cardFeeConfig.debitFee}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setCardFeeConfig((prev) => ({ ...prev, debitFee: val }));
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800"
                  />
                </div>

                <div className="pt-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-800 font-bold text-xs">
                    <input
                      type="checkbox"
                      checked={cardFeeConfig.passFeeToClientDefault || false}
                      onChange={(e) => {
                        setCardFeeConfig((prev) => ({
                          ...prev,
                          passFeeToClientDefault: e.target.checked,
                        }));
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Repassar taxa da maquininha por padrão nas vendas de cartão</span>
                  </label>
                </div>
              </div>

              {/* Crédito 1x a 12x */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Taxas Crédito Parcelado (1x até 12x %):
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                    <div
                      key={num}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center"
                    >
                      <span className="text-[10.5px] font-bold text-slate-600 block mb-1">{num}x</span>
                      <input
                        type="number"
                        step="0.1"
                        value={cardFeeConfig.creditFees[num] ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setCardFeeConfig((prev) => ({
                            ...prev,
                            creditFees: {
                              ...prev.creditFees,
                              [num]: val,
                            },
                          }));
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-1 py-1 text-xs font-bold text-slate-800 text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Salvar */}
        <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-500">
            * As alterações nas taxas e regras de comissão entram em vigor imediatamente nas novas vendas.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer text-xs"
            >
              Fechar
            </button>

            {(activeTab === 'COMMISSION_CONFIG' || activeTab === 'CARD_FEES') && (
              <button
                type="button"
                onClick={handleSaveConfigs}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center gap-1.5 shadow-md cursor-pointer text-xs"
              >
                <Save className="w-4 h-4" />
                Salvar Alterações
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
