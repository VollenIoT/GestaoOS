import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Settings,
  Save,
  CheckCircle2,
  FileText,
  Receipt,
  Sliders,
  Check,
  Plus,
  Trash2,
  HelpCircle,
  QrCode,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export interface PrinterConfig {
  selectedPrinterName: string;
  paperType: 'A4' | 'THERMAL_80MM' | 'THERMAL_58MM' | 'LETTER' | 'A5';
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  margins: 'DEFAULT' | 'NARROW' | 'NONE';
  defaultCopies: number;
  printCompanyHeader: boolean;
  printCompanyLogo: boolean;
  printClientSignatureLine: boolean;
  printWarrantyTerms: boolean;
  printQrCode: boolean;
  thermalHeaderTitle: string;
  thermalFooterMessage: string;
  // Configuração específica para Comprovante de Venda
  salesReceiptFormat: 'THERMAL_80MM' | 'THERMAL_58MM' | 'A4_FULL' | 'A4_HALF' | 'A5';
  printSaleWarrantyTerms: boolean;
  printSaleSignatureLine: boolean;
}

export const defaultPrinterConfig: PrinterConfig = {
  selectedPrinterName: 'Impressora Padrão do Windows',
  paperType: 'A4',
  orientation: 'PORTRAIT',
  margins: 'DEFAULT',
  defaultCopies: 1,
  printCompanyHeader: true,
  printCompanyLogo: true,
  printClientSignatureLine: true,
  printWarrantyTerms: true,
  printQrCode: true,
  thermalHeaderTitle: 'VOLLEN - ASSISTÊNCIA TÉCNICA',
  thermalFooterMessage: 'Obrigado pela preferência! Guarde este cupom.',
  salesReceiptFormat: 'THERMAL_80MM',
  printSaleWarrantyTerms: true,
  printSaleSignatureLine: true,
};

const SYSTEM_PRINTERS_LIST = [
  'Impressora Padrão do Windows',
  'Microsoft Print to PDF',
  'EPSON EcoTank L3250 / L3150 Series',
  'HP LaserJet Pro M404-M405',
  'Brother HL-1212W series',
  'Impressora Térmica 80mm (POS-80 / Elgin / Bematech)',
  'Impressora Térmica 58mm (Mini POS)',
];

interface PrinterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (config: PrinterConfig) => void;
}

export const PrinterConfigModal: React.FC<PrinterConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [config, setConfig] = useState<PrinterConfig>(() => {
    try {
      const saved = localStorage.getItem('vollen_printer_config');
      if (saved) return { ...defaultPrinterConfig, ...JSON.parse(saved) };
    } catch { }
    return defaultPrinterConfig;
  });

  const [printersList, setPrintersList] = useState<string[]>(() => {
    try {
      const savedList = localStorage.getItem('vollen_custom_printers_list');
      if (savedList) return JSON.parse(savedList);
    } catch { }
    return SYSTEM_PRINTERS_LIST;
  });

  const [newPrinterName, setNewPrinterName] = useState('');
  const [isAddingPrinter, setIsAddingPrinter] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'selecao' | 'papel' | 'cupom' | 'vendas'>('selecao');

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('vollen_printer_config');
        if (saved) setConfig({ ...defaultPrinterConfig, ...JSON.parse(saved) });

        const savedList = localStorage.getItem('vollen_custom_printers_list');
        if (savedList) setPrintersList(JSON.parse(savedList));
      } catch { }
      setSaveSuccess(false);
      setIsAddingPrinter(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddPrinter = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPrinterName.trim();
    if (!trimmed) return;
    if (printersList.includes(trimmed)) {
      alert('Esta impressora já está na lista.');
      return;
    }
    const updated = [...printersList, trimmed];
    setPrintersList(updated);
    setConfig((prev) => ({ ...prev, selectedPrinterName: trimmed }));
    try {
      localStorage.setItem('vollen_custom_printers_list', JSON.stringify(updated));
    } catch { }
    setNewPrinterName('');
    setIsAddingPrinter(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('vollen_printer_config', JSON.stringify(config));
      if (onSave) onSave(config);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Erro ao salvar configuração de impressora:', err);
    }
  };

  const handleTestPrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      return alert('Não foi possível abrir a janela de impressão. Verifique se popups estão bloqueados.');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Página de Teste - Vollen OS</title>
          <style>
            body { font-family: sans-serif; padding: 30px; color: #1e293b; text-align: center; }
            .box { border: 2px dashed #0284c7; border-radius: 12px; padding: 25px; max-width: 500px; margin: 0 auto; background: #f8fafc; }
            h1 { color: #0369a1; font-size: 20px; margin-bottom: 5px; }
            p { font-size: 13px; color: #475569; margin: 6px 0; }
            .badge { display: inline-block; background: #0284c7; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 12px; margin: 10px 0; }
            .details { text-align: left; background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-top: 15px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>🔧 VOLLEN - GESTÃO DE OS</h1>
            <div class="badge">PÁGINA DE TESTE DE IMPRESSÃO</div>
            <p>Se você está lendo esta página, sua impressora está configurada e comunicando perfeitamente com o sistema!</p>
            <div class="details">
              <strong>Impressora Selecionada:</strong> ${config.selectedPrinterName}<br/>
              <strong>Formato do Papel:</strong> ${config.paperType}<br/>
              <strong>Orientação:</strong> ${config.orientation === 'PORTRAIT' ? 'Retrato (Vertical)' : 'Paisagem (Horizontal)'}<br/>
              <strong>Data / Hora do Teste:</strong> ${new Date().toLocaleString('pt-BR')}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 select-none font-sans text-xs">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-2xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="p-3.5 bg-gradient-to-r from-sky-700 via-indigo-800 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-2 rounded-xl text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Configurações de Impressão</h2>
              <p className="text-[11px] text-sky-200">
                Preferências de impressora, comprovante de OS, vendas (cupom/A4) e formatos térmicos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex items-center bg-slate-100 border-b border-slate-300 px-3 pt-2 gap-1 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('selecao')}
            className={`px-3 py-2 font-bold rounded-t-xl transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
              activeTab === 'selecao'
                ? 'bg-white text-sky-700 border-t-2 border-sky-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            Impressora Padrão
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('papel')}
            className={`px-3 py-2 font-bold rounded-t-xl transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
              activeTab === 'papel'
                ? 'bg-white text-sky-700 border-t-2 border-sky-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Layout OS (A4)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cupom')}
            className={`px-3 py-2 font-bold rounded-t-xl transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
              activeTab === 'cupom'
                ? 'bg-white text-sky-700 border-t-2 border-sky-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Cupom Térmico (OS)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vendas')}
            className={`px-3 py-2 font-bold rounded-t-xl transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
              activeTab === 'vendas'
                ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            Comprovante de Vendas
          </button>
        </div>

        {/* Formulário com Rolagem */}
        <form onSubmit={handleSave} className="p-4 space-y-4 overflow-y-auto flex-1 bg-slate-50">
          {/* ABA 1: SELEÇÃO DA IMPRESSORA */}
          {activeTab === 'selecao' && (
            <div className="space-y-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <label className="block font-bold text-slate-800 text-[11.5px]">
                  <span>Selecione a Impressora Padrão:</span>
                </label>



                {/* Lista de Seleção de Impressoras com Checkmark */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {printersList.map((printerName) => {
                    const isSelected = config.selectedPrinterName === printerName;
                    return (
                      <div
                        key={printerName}
                        onClick={() => setConfig({ ...config, selectedPrinterName: printerName })}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-sky-50/80 border-sky-500 shadow-xs text-sky-900 font-bold'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Printer className={`w-4 h-4 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                          <span className="text-xs">{printerName}</span>
                        </div>
                        {isSelected && (
                          <span className="bg-sky-600 text-white p-1 rounded-full">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botão de Teste de Impressão */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sky-900 text-xs">Testar Comunicação da Impressora</div>
                  <p className="text-[10.5px] text-sky-700">
                    Envia uma folha de teste com os dados do sistema para a impressora selecionada.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestPrint}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-transform active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Teste
                </button>
              </div>
            </div>
          )}

          {/* ABA 2: FORMATO E LAYOUT (A4) */}
          {activeTab === 'papel' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Formato de Papel */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block font-bold text-slate-800 mb-1">
                    Formato de Papel Padrão:
                  </label>
                  <select
                    value={config.paperType}
                    onChange={(e) => setConfig({ ...config, paperType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-sky-600 cursor-pointer"
                  >
                    <option value="A4">A4 (210 x 297 mm) - Padrão</option>
                    <option value="LETTER">Carta / Letter (216 x 279 mm)</option>
                    <option value="A5">A5 (148 x 210 mm - Meia Folha)</option>
                    <option value="THERMAL_80MM">Bobina Térmica 80mm</option>
                    <option value="THERMAL_58MM">Bobina Térmica 58mm</option>
                  </select>
                </div>

                {/* Orientação */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block font-bold text-slate-800 mb-1">
                    Orientação da Página:
                  </label>
                  <select
                    value={config.orientation}
                    onChange={(e) => setConfig({ ...config, orientation: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-sky-600 cursor-pointer"
                  >
                    <option value="PORTRAIT">Retrato (Vertical - Padrão)</option>
                    <option value="LANDSCAPE">Paisagem (Horizontal)</option>
                  </select>
                </div>
              </div>

              {/* Elementos a Imprimir na Folha */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <span className="font-bold text-slate-800 block text-xs border-b border-slate-100 pb-1">
                  Elementos Visuais do Comprovante de OS:
                </span>

                <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <span className="font-medium text-slate-700">Imprimir cabeçalho e dados da empresa</span>
                  <input
                    type="checkbox"
                    checked={config.printCompanyHeader}
                    onChange={(e) => setConfig({ ...config, printCompanyHeader: e.target.checked })}
                    className="w-4 h-4 accent-sky-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <span className="font-medium text-slate-700">Imprimir logotipo da empresa (se houver)</span>
                  <input
                    type="checkbox"
                    checked={config.printCompanyLogo}
                    onChange={(e) => setConfig({ ...config, printCompanyLogo: e.target.checked })}
                    className="w-4 h-4 accent-sky-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <span className="font-medium text-slate-700">Imprimir linha de assinatura do cliente</span>
                  <input
                    type="checkbox"
                    checked={config.printClientSignatureLine}
                    onChange={(e) => setConfig({ ...config, printClientSignatureLine: e.target.checked })}
                    className="w-4 h-4 accent-sky-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <span className="font-medium text-slate-700">Imprimir termos de garantia e orçamento</span>
                  <input
                    type="checkbox"
                    checked={config.printWarrantyTerms}
                    onChange={(e) => setConfig({ ...config, printWarrantyTerms: e.target.checked })}
                    className="w-4 h-4 accent-sky-600 cursor-pointer"
                  />
                </label>


              </div>
            </div>
          )}

          {/* ABA 3: CUPOM TÉRMICO (BOBINA) */}
          {activeTab === 'cupom' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-amber-900 text-[11px] leading-tight">
                <strong>Modo Cupom / Bobina:</strong> Ideal para impressoras térmicas não fiscais (80mm ou 58mm), gerando comprovantes compactos e rápidos para entrega ao cliente.
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Título no Topo do Cupom:
                  </label>
                  <input
                    type="text"
                    value={config.thermalHeaderTitle}
                    onChange={(e) => setConfig({ ...config, thermalHeaderTitle: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-sky-600 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Mensagem de Rodapé do Cupom:
                  </label>
                  <textarea
                    rows={2}
                    value={config.thermalFooterMessage}
                    onChange={(e) => setConfig({ ...config, thermalFooterMessage: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-sky-600 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: COMPROVANTE DE VENDAS */}
          {activeTab === 'vendas' && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-emerald-950 text-[11px] leading-tight flex items-start gap-2">
                <Receipt className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Formato do Comprovante de Venda (PDV/Balcão):</strong> Escolha como o comprovante de venda de peças será emitido e impresso pelo sistema.
                </div>
              </div>

              {/* Formato do Comprovante de Vendas */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5 text-xs">
                    Modelo de Impressão da Venda:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, salesReceiptFormat: 'THERMAL_80MM' })}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        config.salesReceiptFormat === 'THERMAL_80MM'
                          ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-950 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>Cupom Térmico 80mm</span>
                        {config.salesReceiptFormat === 'THERMAL_80MM' && (
                          <Check className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Bobina padrão de impressoras não fiscais (Bematech, Elgin, EPSON TM)</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, salesReceiptFormat: 'THERMAL_58MM' })}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        config.salesReceiptFormat === 'THERMAL_58MM'
                          ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-950 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>Cupom Térmico 58mm</span>
                        {config.salesReceiptFormat === 'THERMAL_58MM' && (
                          <Check className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Bobina compacta para mini impressoras térmicas e terminais portáteis</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, salesReceiptFormat: 'A4_FULL' })}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        config.salesReceiptFormat === 'A4_FULL'
                          ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-950 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>Folha A4 Completa</span>
                        {config.salesReceiptFormat === 'A4_FULL' && (
                          <Check className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Documento comercial detalhado em folha inteira A4 padrão</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, salesReceiptFormat: 'A4_HALF' })}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        config.salesReceiptFormat === 'A4_HALF'
                          ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-950 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>Meia Folha (1/2 A4 / A5)</span>
                        {config.salesReceiptFormat === 'A4_HALF' && (
                          <Check className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Economia de papel: cabe 2 comprovantes ou impressão na metade da folha</p>
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 space-y-2">
                  <span className="font-bold text-slate-800 block text-xs">
                    Opções Adicionais do Comprovante de Venda:
                  </span>

                  <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <span className="font-medium text-slate-700">Imprimir termo de garantia das peças (90 dias)</span>
                    <input
                      type="checkbox"
                      checked={config.printSaleWarrantyTerms}
                      onChange={(e) => setConfig({ ...config, printSaleWarrantyTerms: e.target.checked })}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <span className="font-medium text-slate-700">Imprimir linha de assinatura do responsável / balcão</span>
                    <input
                      type="checkbox"
                      checked={config.printSaleSignatureLine}
                      onChange={(e) => setConfig({ ...config, printSaleSignatureLine: e.target.checked })}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Rodapé de Ações */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-700 hover:to-indigo-800 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/20 cursor-pointer transition-all hover:scale-102 active:scale-98"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  Configurações Salvas!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Preferências
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
