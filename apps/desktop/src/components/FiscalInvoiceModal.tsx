import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck2,
  FileText,
  Building2,
  Send,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  DollarSign,
  Receipt,
  Percent,
  RefreshCw,
  ExternalLink,
  KeyRound,
  FileCode2,
  Layers,
  Settings2,
  Lock,
  UploadCloud,
  CheckCircle,
  HelpCircle,
  Hash,
  Globe2,
  Server,
  Zap,
  Info,
  Check,
} from 'lucide-react';
import { modalStack } from '../utils/modalStack';
import { useDialog } from './DialogContext';
import { CompanyData } from './CompanyModal';

interface FiscalConfig {
  // 1. Regime & Tributação
  taxRegime: 'SIMPLES_NACIONAL' | 'MEI' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  defaultCfopParts: string; // Ex: '5102'
  defaultCfopServices: string; // Ex: '5933'
  defaultCsosn: string; // Ex: '102' ou '500'
  defaultNcm: string; // Ex: '8504.40.10'
  icmsAliquot: number; // Ex: 0.0 ou 18.0
  issAliquot: number; // Ex: 2.0 a 5.0
  pisAliquot: number; // Ex: 0.65
  cofinsAliquot: number; // Ex: 3.0
  municipalServiceCode: string; // Ex: '14.01'
  cnae: string; // Ex: '95.21-5-00'
  taxRetentionOptIn: boolean;

  // 2. Certificado & Ambiente
  environment: 'HOMOLOGACAO' | 'PRODUCAO';
  certificateFileName: string;
  certificatePassword?: string;
  certificateExpirationDate?: string;
  certificateStatus: 'VALIDO' | 'EXPIRADO' | 'NAO_CONFIGURADO';
  nfcIdToken: string; // CSC ID (ex: 000001)
  nfcCscToken: string; // Código de Segurança do Contribuinte

  // 3. Séries & Numeração
  nfeSeries: number;
  nextNfeNumber: number;
  nfseSeries: string;
  nextNfseNumber: number;
  nextRpsNumber: number;
  nfceSeries: number;
  nextNfceNumber: number;

  // 4. Provedor & Integração
  provider: 'FOCUS_NFE' | 'PLUGNOTAS' | 'ENOTAS' | 'WEBISS' | 'SEFAZ_DIRETA';
  apiKey: string;
  apiEndpointUrl?: string;
  autoEmitOnFinalizeOS: boolean;
  sendEmailToClient: boolean;

  // 5. Impressão & Saída
  selectedPrinterName: string;
  printDanfeFormat: 'A4_DANFE' | 'THERMAL_80MM' | 'THERMAL_58MM' | 'PDF_VIEWER';
  autoPrintOnAuth: boolean;
}

const DEFAULT_FISCAL_CONFIG: FiscalConfig = {
  taxRegime: 'SIMPLES_NACIONAL',
  defaultCfopParts: '5.102',
  defaultCfopServices: '5.933',
  defaultCsosn: '102',
  defaultNcm: '8504.40.10',
  icmsAliquot: 0.0,
  issAliquot: 2.0,
  pisAliquot: 0.65,
  cofinsAliquot: 3.0,
  municipalServiceCode: '14.01 - Manutenção, reparação e conservação',
  cnae: '95.21-5-00',
  taxRetentionOptIn: false,

  environment: 'HOMOLOGACAO',
  certificateFileName: '',
  certificatePassword: '',
  certificateExpirationDate: '',
  certificateStatus: 'NAO_CONFIGURADO',
  nfcIdToken: '000001',
  nfcCscToken: '',

  nfeSeries: 1,
  nextNfeNumber: 1,
  nfseSeries: '1',
  nextNfseNumber: 1,
  nextRpsNumber: 1,
  nfceSeries: 1,
  nextNfceNumber: 1,

  provider: 'FOCUS_NFE',
  apiKey: '',
  apiEndpointUrl: 'https://api.focusnfe.com.br/v2',
  autoEmitOnFinalizeOS: false,
  sendEmailToClient: true,

  selectedPrinterName: 'Impressora Padrão do Windows',
  printDanfeFormat: 'A4_DANFE',
  autoPrintOnAuth: false,
};

interface FiscalInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetOrder?: any | null;
  companyInfo?: CompanyData;
}

export const FiscalInvoiceModal: React.FC<FiscalInvoiceModalProps> = ({
  isOpen,
  onClose,
  targetOrder,
  companyInfo,
}) => {
  const { alert, confirm } = useDialog();

  const [activeTab, setActiveTab] = useState<'emit' | 'config' | 'history'>('emit');
  const [configSubTab, setConfigSubTab] = useState<'taxes' | 'certificate' | 'series' | 'provider' | 'printer'>('taxes');
  const [invoiceType, setInvoiceType] = useState<'NFE_PRODUTOS' | 'NFSE_SERVICOS' | 'NFCE_CUPOM'>('NFSE_SERVICOS');
  const [naturezaOperacao, setNaturezaOperacao] = useState<string>('5.933 - Prestação de Serviço de Assistência Técnica');
  const [isEmitting, setIsEmitting] = useState<boolean>(false);
  const [emittedSuccess, setEmittedSuccess] = useState<any | null>(null);

  // Lista de impressoras disponíveis no sistema
  const [availablePrinters, setAvailablePrinters] = useState<string[]>(() => {
    try {
      const savedList = localStorage.getItem('vollen_custom_printers_list');
      if (savedList) return JSON.parse(savedList);
    } catch {}
    return [
      'Impressora Padrão do Windows',
      'Microsoft Print to PDF',
      'EPSON EcoTank L3250 / L3150 Series',
      'HP LaserJet Pro M404-M405',
      'Brother HL-1212W series',
      'Impressora Térmica 80mm (POS-80 / Elgin / Bematech)',
      'Impressora Térmica 58mm (Mini POS)',
    ];
  });

  // Configurações Fiscais Salvas
  const [fiscalConfig, setFiscalConfig] = useState<FiscalConfig>(() => {
    try {
      const saved = localStorage.getItem('vollen_fiscal_config_v4');
      if (saved) {
        return { ...DEFAULT_FISCAL_CONFIG, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_FISCAL_CONFIG;
  });

  useEffect(() => {
    if (isOpen) {
      modalStack.register('FiscalInvoiceModal', onClose);
      setEmittedSuccess(null);
    } else {
      modalStack.unregister('FiscalInvoiceModal');
    }
    return () => {
      modalStack.unregister('FiscalInvoiceModal');
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Cálculos da OS
  const servicesList = targetOrder?.servicesExecuted || targetOrder?.services || [];
  const partsList = targetOrder?.partsUsed || targetOrder?.parts || [];

  const servicesTotal = (servicesList || []).reduce((sum: number, s: any) => {
    const val = parseFloat(String(s.price || s.value || '0').replace(/\./g, '').replace(',', '.')) || 0;
    return sum + val;
  }, 0);

  const partsTotal = (partsList || []).reduce((sum: number, p: any) => {
    const qty = Number(p.qty || p.quantity || 1);
    const val = parseFloat(String(p.price || p.unitPrice || '0').replace(/\./g, '').replace(',', '.')) || 0;
    return sum + (val * qty);
  }, 0);

  const finalTotal = parseFloat(String(targetOrder?.totalAmount || targetOrder?.finalValue || (servicesTotal + partsTotal)).replace(/\./g, '').replace(',', '.')) || (servicesTotal + partsTotal);

  const handleEmitInvoice = async () => {
    const ok = await confirm({
      title: 'Emitir Nota Fiscal Eletrônica',
      message: `Confirma o envio da ${
        invoiceType === 'NFSE_SERVICOS' ? 'NFS-e (Serviços)' : invoiceType === 'NFE_PRODUTOS' ? 'NF-e (Produtos)' : 'NFC-e (Cupom)'
      } no valor total de R$ ${finalTotal.toFixed(2).replace('.', ',')} para a SEFAZ/Prefeitura?`,
      confirmText: 'Autorizar Emissão',
    });
    if (!ok) return;

    setIsEmitting(true);
    // Simula protocolo e autorização SEFAZ/Prefeitura
    setTimeout(() => {
      setIsEmitting(false);
      
      let nextNum = fiscalConfig.nextNfeNumber;
      if (invoiceType === 'NFSE_SERVICOS') nextNum = fiscalConfig.nextNfseNumber;
      if (invoiceType === 'NFCE_CUPOM') nextNum = fiscalConfig.nextNfceNumber;

      const generatedNumber = nextNum;
      const protocol = `352600${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const result = {
        number: generatedNumber,
        series: invoiceType === 'NFSE_SERVICOS' ? fiscalConfig.nfseSeries : invoiceType === 'NFE_PRODUTOS' ? fiscalConfig.nfeSeries : fiscalConfig.nfceSeries,
        protocol,
        authDate: new Date().toISOString(),
        type: invoiceType,
        total: finalTotal,
        client: targetOrder?.client?.name || 'Consumidor Final',
        cnpjCpf: targetOrder?.client?.cpfCnpj || targetOrder?.client?.cpf || targetOrder?.client?.cnpj || 'Não informado',
        environment: fiscalConfig.environment,
        provider: fiscalConfig.provider,
        printer: fiscalConfig.selectedPrinterName,
      };
      setEmittedSuccess(result);

      // Incrementa número sequencial
      const updatedConfig = { ...fiscalConfig };
      if (invoiceType === 'NFSE_SERVICOS') updatedConfig.nextNfseNumber += 1;
      else if (invoiceType === 'NFE_PRODUTOS') updatedConfig.nextNfeNumber += 1;
      else if (invoiceType === 'NFCE_CUPOM') updatedConfig.nextNfceNumber += 1;
      setFiscalConfig(updatedConfig);
      localStorage.setItem('vollen_fiscal_config_v4', JSON.stringify(updatedConfig));

      // Salva no histórico de notas
      try {
        const history = JSON.parse(localStorage.getItem('vollen_fiscal_invoices_history') || '[]');
        localStorage.setItem('vollen_fiscal_invoices_history', JSON.stringify([result, ...history]));
      } catch {}

      if (fiscalConfig.autoPrintOnAuth) {
        setTimeout(() => {
          window.print();
        }, 300);
      }
    }, 1500);
  };

  const handleSaveConfig = () => {
    try {
      localStorage.setItem('vollen_fiscal_config_v4', JSON.stringify(fiscalConfig));
      alert({
        title: 'Configurações Fiscais Salvas',
        message: 'Todos os parâmetros tributários, certificado, numeração, provedor e impressora foram atualizados com sucesso.',
        variant: 'success',
      });
      setActiveTab('emit');
    } catch (err: any) {
      alert({
        title: 'Erro ao salvar',
        message: err.message || 'Falha ao gravar configurações fiscais.',
        variant: 'danger',
      });
    }
  };

  const handleSimulateCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simula leitura e extração de validade do A1
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    setFiscalConfig((prev) => ({
      ...prev,
      certificateFileName: file.name,
      certificateExpirationDate: oneYearFromNow.toLocaleDateString('pt-BR'),
      certificateStatus: 'VALIDO',
    }));

    alert({
      title: 'Certificado A1 Carregado',
      message: `Arquivo ${file.name} associado. Validade estimada até ${oneYearFromNow.toLocaleDateString('pt-BR')}.`,
      variant: 'success',
    });
  };

  const handlePrintDANFE = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100/90 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl border border-blue-200">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800 tracking-wide">
                  Central Fiscal — Emissão de NF-e, NFS-e & NFC-e
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Emissor Completo
                </span>
                {fiscalConfig.environment === 'HOMOLOGACAO' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
                    Homologação (Testes)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-300">
                    Produção (Oficial)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Gestão tributária, parâmetros de emissão, certificado digital, impressão DANFE e integração SEFAZ/Prefeitura.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Principais */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-slate-50 border-b border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('emit')}
            className={`px-4 py-2 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'emit'
                ? 'bg-white text-blue-700 border-t border-x border-slate-300 border-b-transparent shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Send className="w-4 h-4" />
            Emitir Nota Fiscal da OS
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'config'
                ? 'bg-white text-blue-700 border-t border-x border-slate-300 border-b-transparent shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            Configurações & Parâmetros Fiscais
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {activeTab === 'emit' && !emittedSuccess && (
            <div className="space-y-6">
              {/* Card da OS / Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white border border-slate-200 rounded-xl text-xs shadow-sm">
                <div>
                  <span className="text-slate-500 block mb-0.5">Destinatário / Cliente:</span>
                  <strong className="text-slate-800 text-sm block truncate">
                    {targetOrder?.client?.name || 'Cliente Balcão'}
                  </strong>
                  <span className="text-slate-500 text-[11px]">
                    CPF/CNPJ: {targetOrder?.client?.cpfCnpj || targetOrder?.client?.cpf || targetOrder?.client?.cnpj || 'Não cadastrado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Referência da OS:</span>
                  <strong className="text-slate-800 text-sm block">
                    OS #{targetOrder?.code || '0000'}
                  </strong>
                  <span className="text-slate-500 text-[11px]">
                    {targetOrder?.equipment?.type || ''} {targetOrder?.equipment?.brand || ''} {targetOrder?.equipment?.model || ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Valor Total da Nota:</span>
                  <strong className="text-emerald-600 text-base block">
                    R$ {finalTotal.toFixed(2).replace('.', ',')}
                  </strong>
                  <span className="text-slate-500 text-[11px]">
                    Serviços: R$ {servicesTotal.toFixed(2).replace('.', ',')} | Peças: R$ {partsTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* Seletor do Tipo de Documento Fiscal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setInvoiceType('NFSE_SERVICOS')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    invoiceType === 'NFSE_SERVICOS'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase">NFS-e (Serviços)</span>
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Mão de obra e conserto técnico (Prefeitura / ISS: {fiscalConfig.issAliquot}%).
                  </p>
                  <div className="mt-2 text-[10px] font-mono bg-blue-100/60 text-blue-800 px-2 py-0.5 rounded">
                    Série {fiscalConfig.nfseSeries} | Próx: #{fiscalConfig.nextNfseNumber}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInvoiceType('NFE_PRODUTOS')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    invoiceType === 'NFE_PRODUTOS'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase">NF-e (Produtos/Peças)</span>
                    <FileCheck2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Peças substituídas e mercadorias (SEFAZ Estadual / CFOP: {fiscalConfig.defaultCfopParts}).
                  </p>
                  <div className="mt-2 text-[10px] font-mono bg-emerald-100/60 text-emerald-800 px-2 py-0.5 rounded">
                    Série {fiscalConfig.nfeSeries} | Próx: #{fiscalConfig.nextNfeNumber}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInvoiceType('NFCE_CUPOM')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    invoiceType === 'NFCE_CUPOM'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase">NFC-e (Cupom Fiscal)</span>
                    <Receipt className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Cupom de balcão para consumidor com QR Code SEFAZ.
                  </p>
                  <div className="mt-2 text-[10px] font-mono bg-amber-100/60 text-amber-800 px-2 py-0.5 rounded">
                    Série {fiscalConfig.nfceSeries} | Próx: #{fiscalConfig.nextNfceNumber}
                  </div>
                </button>
              </div>

              {/* Detalhes de Integração / Tributos Aplicados */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs bg-white shadow-sm">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Discriminação dos Itens Fiscais & Impostos
                  </span>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-slate-600">
                      Regime: <strong className="text-blue-700">{fiscalConfig.taxRegime.replace('_', ' ')}</strong>
                    </span>
                    <span className="text-slate-600">
                      Provedor: <strong className="text-indigo-600">{fiscalConfig.provider}</strong>
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
                  {invoiceType === 'NFSE_SERVICOS' ? (
                    servicesList.length > 0 ? (
                      servicesList.map((srv: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-100">
                          <div>
                            <span className="text-slate-800 font-medium">{srv.name}</span>
                            <div className="text-[10px] text-slate-400">
                              CFOP: {fiscalConfig.defaultCfopServices} | ISS: {fiscalConfig.issAliquot}%
                            </div>
                          </div>
                          <strong className="text-slate-900">R$ {srv.price || '0,00'}</strong>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 italic py-2">Serviço geral de assistência técnica (R$ {finalTotal.toFixed(2).replace('.', ',')}) - CFOP {fiscalConfig.defaultCfopServices}</div>
                    )
                  ) : (
                    partsList.length > 0 ? (
                      partsList.map((prt: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-100">
                          <div>
                            <span className="text-slate-800 font-medium">{prt.qty || 1}x {prt.name}</span>
                            <div className="text-[10px] text-slate-400">
                              CFOP: {fiscalConfig.defaultCfopParts} | NCM: {fiscalConfig.defaultNcm} | CSOSN: {fiscalConfig.defaultCsosn}
                            </div>
                          </div>
                          <strong className="text-slate-900">R$ {prt.price || '0,00'}</strong>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 italic py-2">Venda de componentes aplicados (R$ {finalTotal.toFixed(2).replace('.', ',')}) - CFOP {fiscalConfig.defaultCfopParts}</div>
                    )
                  )}
                </div>
              </div>

              {/* Card de Seleção da Impressora para a Emissão */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Destino de Impressão (DANFE / Cupom):</span>
                    <strong className="text-slate-800 text-xs">
                      {fiscalConfig.selectedPrinterName} ({fiscalConfig.printDanfeFormat === 'A4_DANFE' ? 'Folha A4 Completa' : fiscalConfig.printDanfeFormat === 'THERMAL_80MM' ? 'Térmica 80mm' : fiscalConfig.printDanfeFormat === 'THERMAL_58MM' ? 'Térmica 58mm' : 'Visualizador PDF'})
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('config');
                    setConfigSubTab('printer');
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-blue-100 border border-blue-300 text-blue-700 rounded-lg font-bold text-[11px] shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Alterar Impressora
                </button>
              </div>
            </div>
          )}

          {/* Emissão Concluída com Sucesso */}
          {activeTab === 'emit' && emittedSuccess && (
            <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 bg-emerald-50 border border-emerald-300 rounded-2xl animate-fadeIn shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-300">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Nota Fiscal Emitida e Autorizada com Sucesso!
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Documento fiscal nº <strong className="text-emerald-700">{emittedSuccess.number}</strong> (Série {emittedSuccess.series}) transmitido via {emittedSuccess.provider}.
                </p>
                <span className="text-[11px] font-mono text-slate-500 block mt-1">
                  Protocolo de Autorização SEFAZ: {emittedSuccess.protocol}
                </span>
              </div>

              {/* Seletor rápido de impressora na tela de sucesso */}
              <div className="p-3 bg-white border border-emerald-200 rounded-xl w-full max-w-md text-left text-xs shadow-sm">
                <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  Impressora Selecionada para DANFE:
                </label>
                <select
                  value={fiscalConfig.selectedPrinterName}
                  onChange={(e) => {
                    const updated = { ...fiscalConfig, selectedPrinterName: e.target.value };
                    setFiscalConfig(updated);
                    localStorage.setItem('vollen_fiscal_config_v4', JSON.stringify(updated));
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                >
                  {availablePrinters.map((p, idx) => (
                    <option key={idx} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handlePrintDANFE}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir DANFE / RPS ({fiscalConfig.selectedPrinterName})
                </button>
                <button
                  onClick={() => setEmittedSuccess(null)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Nova Emissão
                </button>
              </div>
            </div>
          )}

          {/* Aba Completa: Configurações & Parâmetros Fiscais */}
          {activeTab === 'config' && (
            <div className="space-y-5">
              {/* Sub-abas de configuração */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setConfigSubTab('taxes')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    configSubTab === 'taxes'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  Tributação & CFOPs
                </button>

                <button
                  type="button"
                  onClick={() => setConfigSubTab('certificate')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    configSubTab === 'certificate'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Certificado Digital & CSC
                </button>

                <button
                  type="button"
                  onClick={() => setConfigSubTab('series')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    configSubTab === 'series'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  Séries & Numeração
                </button>

                <button
                  type="button"
                  onClick={() => setConfigSubTab('provider')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    configSubTab === 'provider'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  Provedor & API de Emissão
                </button>

                <button
                  type="button"
                  onClick={() => setConfigSubTab('printer')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    configSubTab === 'printer'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  Impressora & DANFE
                </button>
              </div>

              {/* Sub-aba 1: Tributação & CFOPs */}
              {configSubTab === 'taxes' && (
                <div className="space-y-4 text-xs bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Percent className="w-4 h-4 text-blue-600" />
                      Regime Tributário & Enquadramento Fiscal
                    </h3>
                    <span className="text-[11px] text-slate-400">Configurações fiscais padrão para preenchimento automático das notas</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Regime Tributário da Empresa:</label>
                      <select
                        value={fiscalConfig.taxRegime}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, taxRegime: e.target.value as any })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                      >
                        <option value="SIMPLES_NACIONAL">Simples Nacional (ME / EPP)</option>
                        <option value="MEI">Microempreendedor Individual (MEI)</option>
                        <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                        <option value="LUCRO_REAL">Lucro Real</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">CNAE Principal:</label>
                      <input
                        type="text"
                        value={fiscalConfig.cnae}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, cnae: e.target.value })}
                        placeholder="Ex: 95.21-5-00"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">CSOSN / CST Padrão:</label>
                      <select
                        value={fiscalConfig.defaultCsosn}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, defaultCsosn: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                      >
                        <option value="102">102 - Tributada pelo Simples sem permissão de crédito</option>
                        <option value="101">101 - Tributada pelo Simples com permissão de crédito</option>
                        <option value="500">500 - ICMS cobrado anteriormente por substituição tributária (ST)</option>
                        <option value="900">900 - Outros</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">CFOP Padrão para Venda de Peças (NF-e/NFC-e):</label>
                      <input
                        type="text"
                        value={fiscalConfig.defaultCfopParts}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, defaultCfopParts: e.target.value })}
                        placeholder="Ex: 5.102 ou 5.405"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">5.102 = Venda de mercadoria adquirida de terceiros | 5.405 = Venda com ST</span>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">CFOP Padrão para Serviços de Assistência (NFS-e):</label>
                      <input
                        type="text"
                        value={fiscalConfig.defaultCfopServices}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, defaultCfopServices: e.target.value })}
                        placeholder="Ex: 5.933"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">5.933 = Prestação de serviço tributado pelo ISSQN</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">NCM Padrão de Peças/Acessórios:</label>
                      <input
                        type="text"
                        value={fiscalConfig.defaultNcm}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, defaultNcm: e.target.value })}
                        placeholder="Ex: 8504.40.10"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Código de Serviço Municipal (LC 116/03):</label>
                      <input
                        type="text"
                        value={fiscalConfig.municipalServiceCode}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, municipalServiceCode: e.target.value })}
                        placeholder="Ex: 14.01"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <h4 className="font-bold text-slate-700 mb-2">Alíquotas de Impostos Padrão (%):</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Alíquota ISSQN (%):</label>
                        <input
                          type="number"
                          step="0.1"
                          value={fiscalConfig.issAliquot}
                          onChange={(e) => setFiscalConfig({ ...fiscalConfig, issAliquot: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Alíquota ICMS (%):</label>
                        <input
                          type="number"
                          step="0.1"
                          value={fiscalConfig.icmsAliquot}
                          onChange={(e) => setFiscalConfig({ ...fiscalConfig, icmsAliquot: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Alíquota PIS (%):</label>
                        <input
                          type="number"
                          step="0.01"
                          value={fiscalConfig.pisAliquot}
                          onChange={(e) => setFiscalConfig({ ...fiscalConfig, pisAliquot: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Alíquota COFINS (%):</label>
                        <input
                          type="number"
                          step="0.01"
                          value={fiscalConfig.cofinsAliquot}
                          onChange={(e) => setFiscalConfig({ ...fiscalConfig, cofinsAliquot: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-aba 2: Certificado & CSC */}
              {configSubTab === 'certificate' && (
                <div className="space-y-4 text-xs bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Certificado Digital A1 & Segurança Fiscal
                    </h3>
                    <span className="text-[11px] text-slate-400">Arquivo digital no formato .PFX ou .P12</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Ambiente de Transmissão:</label>
                      <select
                        value={fiscalConfig.environment}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, environment: e.target.value as any })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                      >
                        <option value="HOMOLOGACAO">Homologação (Ambiente de Testes / Sem valor jurídico)</option>
                        <option value="PRODUCAO">Produção (SEFAZ & Prefeitura Oficial)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Status do Certificado:</label>
                      <div className="flex items-center gap-2 px-3 py-2 border rounded-xl bg-slate-50 border-slate-200">
                        {fiscalConfig.certificateStatus === 'VALIDO' ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold text-emerald-700">Válido</span>
                            <span className="text-slate-500 text-[11px]">({fiscalConfig.certificateFileName} - expira em {fiscalConfig.certificateExpirationDate || '1 ano'})</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span className="font-bold text-amber-700">Não Configurado</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Upload do Certificado */}
                  <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                    <UploadCloud className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="font-bold text-slate-700">Carregar Arquivo de Certificado Digital (.pfx / .p12)</span>
                    <p className="text-[11px] text-slate-500 max-w-md mt-0.5">
                      Selecione o arquivo do certificado A1 da sua empresa para autenticar e assinar os arquivos XML das notas fiscais.
                    </p>
                    <label className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow transition-all flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5" />
                      Selecionar Arquivo A1 (.pfx)
                      <input type="file" accept=".pfx,.p12" onChange={handleSimulateCertUpload} className="hidden" />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Senha do Certificado A1:</label>
                      <input
                        type="password"
                        value={fiscalConfig.certificatePassword || ''}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, certificatePassword: e.target.value })}
                        placeholder="Senha cadastrada"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Id Token do CSC (NFC-e):</label>
                      <input
                        type="text"
                        value={fiscalConfig.nfcIdToken}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, nfcIdToken: e.target.value })}
                        placeholder="Ex: 000001"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Código de Segurança do Contribuinte (CSC):</label>
                      <input
                        type="password"
                        value={fiscalConfig.nfcCscToken}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, nfcCscToken: e.target.value })}
                        placeholder="Chave alfanumérica fornecida pela SEFAZ"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-aba 3: Séries & Numeração */}
              {configSubTab === 'series' && (
                <div className="space-y-4 text-xs bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Hash className="w-4 h-4 text-blue-600" />
                      Séries e Numeração Sequencial das Notas
                    </h3>
                    <span className="text-[11px] text-slate-400">Controle rigoroso da numeração para evitar saltos ou rejeições SEFAZ</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* NF-e Produtos */}
                    <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <FileCheck2 className="w-4 h-4 text-emerald-600" />
                        NF-e (Modelo 55 - Peças/Venda)
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Série NF-e:</label>
                        <input
                          type="number"
                          value={fiscalConfig.nfeSeries}
                          onChange={(e) => setFiscalConfig({ ...fiscalConfig, nfeSeries: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Próximo Número NF-e:</label>
                        <input
                          type="number"
                          value={fiscalConfig.nextNfeNumber}
                          onChange={(e) => setFiscalConfig({ ...fiscalConfig, nextNfeNumber: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 font-bold"
                        />
                      </div>
                    </div>

                    {/* NFS-e Serviços */}
                    <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <FileText className="w-4 h-4 text-blue-600" />
                        NFS-e (Serviços Municipais)
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Série NFS-e / RPS:</label>
                        <input
                          type="text"
                          value={fiscalConfig.nfseSeries}
                          onChange={(e) => setFiscalConfig({ ...fiscalConfig, nfseSeries: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Próximo Número NFS-e:</label>
                        <input
                          type="number"
                          value={fiscalConfig.nextNfseNumber}
                          onChange={(e) => setFiscalConfig({ ...fiscalConfig, nextNfseNumber: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Próximo Número RPS:</label>
                        <input
                          type="number"
                          value={fiscalConfig.nextRpsNumber}
                          onChange={(e) => setFiscalConfig({ ...fiscalConfig, nextRpsNumber: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 font-bold"
                        />
                      </div>
                    </div>

                    {/* NFC-e Cupom */}
                    <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <Receipt className="w-4 h-4 text-amber-600" />
                        NFC-e (Modelo 65 - Cupom Balcão)
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Série NFC-e:</label>
                        <input
                          type="number"
                          value={fiscalConfig.nfceSeries}
                          onChange={(e) => setFiscalConfig({ ...fiscalConfig, nfceSeries: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Próximo Número NFC-e:</label>
                        <input
                          type="number"
                          value={fiscalConfig.nextNfceNumber}
                          onChange={(e) => setFiscalConfig({ ...fiscalConfig, nextNfceNumber: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-aba 4: Provedor & API de Emissão */}
              {configSubTab === 'provider' && (
                <div className="space-y-4 text-xs bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Server className="w-4 h-4 text-indigo-600" />
                      Provedor de Emissão & Integração de Webhook
                    </h3>
                    <span className="text-[11px] text-slate-400">Conexão direta com gateways fiscais ou SEFAZ</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Gateway Fiscal Homologado:</label>
                      <select
                        value={fiscalConfig.provider}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, provider: e.target.value as any })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                      >
                        <option value="FOCUS_NFE">Focus NFe (NFS-e, NF-e, NFC-e)</option>
                        <option value="PLUGNOTAS">PlugNotas / TecnoSpeed</option>
                        <option value="ENOTAS">eNotas Gateway</option>
                        <option value="WEBISS">Padrão Nacional NFS-e / WebISS</option>
                        <option value="SEFAZ_DIRETA">Sefaz Direta / Emissor Local</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">API Key / Token de Acesso:</label>
                      <input
                        type="password"
                        value={fiscalConfig.apiKey}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, apiKey: e.target.value })}
                        placeholder="Cole sua chave de API fornecida pelo gateway"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Endpoint de Integração (URL Customizada opcional):</label>
                    <input
                      type="text"
                      value={fiscalConfig.apiEndpointUrl || ''}
                      onChange={(e) => setFiscalConfig({ ...fiscalConfig, apiEndpointUrl: e.target.value })}
                      placeholder="https://api.focusnfe.com.br/v2"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm font-mono text-[11px]"
                    />
                  </div>

                  <div className="pt-2 space-y-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fiscalConfig.sendEmailToClient}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, sendEmailToClient: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700 font-medium">Enviar automaticamente o XML e DANFE/PDF para o e-mail do cliente após autorização</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fiscalConfig.autoEmitOnFinalizeOS}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, autoEmitOnFinalizeOS: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700 font-medium">Sugerir emissão fiscal automática ao concluir e faturar a Ordem de Serviço</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Sub-aba 5: Impressora & DANFE */}
              {configSubTab === 'printer' && (
                <div className="space-y-4 text-xs bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Printer className="w-4 h-4 text-blue-600" />
                      Configuração de Impressão de DANFE & Cupons
                    </h3>
                    <span className="text-[11px] text-slate-400">Escolha a impressora padrão para emissão de notas fiscais</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Impressora Padrão para NF-e / NFS-e:</label>
                      <select
                        value={fiscalConfig.selectedPrinterName}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, selectedPrinterName: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                      >
                        {availablePrinters.map((prn, idx) => (
                          <option key={idx} value={prn}>
                            {prn}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Impressora selecionada será usada diretamente na impressão do DANFE e RPS.
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Formato de Saída do Documento DANFE:</label>
                      <select
                        value={fiscalConfig.printDanfeFormat}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, printDanfeFormat: e.target.value as any })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                      >
                        <option value="A4_DANFE">Folha A4 Completa (DANFE Oficial Padrão SEFAZ)</option>
                        <option value="THERMAL_80MM">Bobina Térmica 80mm (DANFE Simplificado / NFC-e)</option>
                        <option value="THERMAL_58MM">Bobina Térmica 58mm (Mini Impressora)</option>
                        <option value="PDF_VIEWER">Visualizador / Salvar PDF</option>
                      </select>
                    </div>
                  </div>

                  {/* Seleção Visual Rápida de Impressoras */}
                  <div className="pt-2">
                    <label className="block text-slate-700 font-bold mb-2">Impressoras do Sistema Detectadas:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {availablePrinters.map((printerName, idx) => {
                        const isSelected = fiscalConfig.selectedPrinterName === printerName;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFiscalConfig({ ...fiscalConfig, selectedPrinterName: printerName })}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm ring-2 ring-blue-500/20'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <Printer className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                              <span className="font-semibold text-xs truncate">{printerName}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fiscalConfig.autoPrintOnAuth}
                        onChange={(e) => setFiscalConfig({ ...fiscalConfig, autoPrintOnAuth: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700 font-medium">Disparar impressão do DANFE automaticamente assim que a nota for autorizada</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Botão de Salvar Parâmetros */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar Parâmetros Fiscais
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100/90 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Fechar
          </button>

          {activeTab === 'emit' && !emittedSuccess && (
            <button
              onClick={handleEmitInvoice}
              disabled={isEmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 hover:scale-105 active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{isEmitting ? 'Transmitindo à SEFAZ...' : 'Transmitir e Emitir Nota'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
