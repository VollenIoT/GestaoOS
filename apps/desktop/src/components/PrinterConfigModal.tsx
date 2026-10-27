import React, { useState, useEffect, useRef } from 'react';
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
  Barcode,
  Volume2,
  Sparkles,
  AlertCircle,
  Cpu,
  Usb,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { modalStack } from '../utils/modalStack';

export interface PrinterConfig {
  selectedPrinterName: string;
  selectedA4PrinterName?: string;
  selectedThermalPrinterName?: string;
  selectedSalesPrinterName?: string;
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
  selectedA4PrinterName: 'Impressora Padrão do Windows',
  selectedThermalPrinterName: 'Impressora Térmica 80mm (POS-80 / Elgin / Bematech)',
  selectedSalesPrinterName: 'Impressora Térmica 80mm (POS-80 / Elgin / Bematech)',
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

const FALLBACK_PRINTERS_LIST = [
  'Impressora Padrão do Windows',
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
      if (savedList) {
        const parsed = JSON.parse(savedList);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { }
    return FALLBACK_PRINTERS_LIST;
  });

  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'selecao' | 'papel' | 'cupom' | 'vendas' | 'leitor'>('selecao');

  // Estados específicos para Teste e Configuração do Leitor de Código de Barras
  const [testScannedCode, setTestScannedCode] = useState('');
  const [scanHistory, setScanHistory] = useState<{ code: string; time: string; type: string }[]>([]);
  const [scannerBeepAudio, setScannerBeepAudio] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vollen_scanner_beep_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const [scannerAutoAddPOS, setScannerAutoAddPOS] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vollen_scanner_auto_add_pos') !== 'false';
    } catch {
      return true;
    }
  });

  const [selectedScannerDevice, setSelectedScannerDevice] = useState<string>(() => {
    try {
      return localStorage.getItem('vollen_selected_scanner_device') || '';
    } catch {
      return '';
    }
  });

  const [hasScannedDeviceActive, setHasScannedDeviceActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vollen_scanner_detected_active') === 'true';
    } catch {
      return false;
    }
  });

  const scannerInputRef = useRef<HTMLInputElement | null>(null);

  // Função para buscar dispositivos instalados no Windows via Tauri
  const fetchInstalledPrinters = async (showLoadingState = false) => {
    if (showLoadingState) setIsLoadingPrinters(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const installedPrinters: string[] = await invoke('get_installed_printers');
      if (installedPrinters && Array.isArray(installedPrinters) && installedPrinters.length > 0) {
        setPrintersList(installedPrinters);
        try {
          localStorage.setItem('vollen_custom_printers_list', JSON.stringify(installedPrinters));
        } catch {}

        // Atualizar se a selecionada não estiver na lista instalada
        setConfig((prev) => {
          const updated = { ...prev };
          if (!installedPrinters.includes(prev.selectedPrinterName) && installedPrinters[0]) {
            updated.selectedPrinterName = installedPrinters[0];
          }
          if (prev.selectedA4PrinterName && !installedPrinters.includes(prev.selectedA4PrinterName) && installedPrinters[0]) {
            updated.selectedA4PrinterName = installedPrinters[0];
          }
          if (prev.selectedThermalPrinterName && !installedPrinters.includes(prev.selectedThermalPrinterName) && installedPrinters[0]) {
            updated.selectedThermalPrinterName = installedPrinters[0];
          }
          if (prev.selectedSalesPrinterName && !installedPrinters.includes(prev.selectedSalesPrinterName) && installedPrinters[0]) {
            updated.selectedSalesPrinterName = installedPrinters[0];
          }
          return updated;
        });
      }
    } catch (err) {
      console.warn('Erro ao consultar impressoras instaladas do Windows via Tauri:', err);
    } finally {
      if (showLoadingState) setIsLoadingPrinters(false);
    }
  };

  // Reproduz som de bip sintetizado quando um código for escaneado com sucesso
  const playBeepSound = () => {
    if (!scannerBeepAudio) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime); // Frequência do bipe do leitor
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {}
  };

  const handleProcessScannedCode = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    let detectedType = 'Code-128 / Livre';
    if (/^\d{13}$/.test(code)) detectedType = 'EAN-13 (Padrão Comercial)';
    else if (/^\d{8}$/.test(code)) detectedType = 'EAN-8 (Embalagens Pequenas)';
    else if (/^\d{12}$/.test(code)) detectedType = 'UPC-A';
    else if (/^\d{14}$/.test(code)) detectedType = 'DUN-14 (Caixas/Fardos)';

    playBeepSound();
    setHasScannedDeviceActive(true);
    setSelectedScannerDevice('Leitor USB / Teclado HID (Ativo)');
    try {
      localStorage.setItem('vollen_scanner_detected_active', 'true');
      localStorage.setItem('vollen_selected_scanner_device', 'Leitor USB / Teclado HID (Ativo)');
    } catch {}
    setScanHistory((prev) => [
      { code, time: new Date().toLocaleTimeString('pt-BR'), type: detectedType },
      ...prev.slice(0, 9),
    ]);
    setTestScannedCode('');
  };

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      modalStack.register('PrinterConfigModal', () => {
        onCloseRef.current();
      });
      return () => modalStack.unregister('PrinterConfigModal');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('vollen_printer_config');
        if (saved) setConfig({ ...defaultPrinterConfig, ...JSON.parse(saved) });
      } catch { }
      fetchInstalledPrinters();
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  const handleTestPrint = (printerTarget?: string, formatType?: string) => {
    const printerName = printerTarget || config.selectedPrinterName || 'Impressora Padrão do Windows';
    const paper = formatType || config.paperType || 'A4';
    const isThermal = paper.includes('THERMAL') || paper.includes('58MM') || paper.includes('80MM');

    const printWindow = window.open('', '_blank', isThermal ? 'width=450,height=600' : 'width=800,height=600');
    if (!printWindow) {
      return alert('Não foi possível abrir a janela de impressão. Verifique se popups estão bloqueados.');
    }

    if (isThermal) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Teste Térmico - Vollen OS</title>
            <style>
              @page { size: 80mm auto; margin: 3mm; }
              body { font-family: 'Courier New', monospace; padding: 4px; color: #000; font-size: 11px; text-align: center; }
              .divider { border-top: 1px dashed #000; margin: 6px 0; }
              .bold { font-weight: bold; }
              .details { text-align: left; margin-top: 8px; font-size: 10px; }
            </style>
          </head>
          <body>
            <div class="bold" style="font-size: 13px;">VOLLEN - GESTÃO DE OS</div>
            <div style="font-size: 10px;">TESTE DE IMPRESSÃO TÉRMICA</div>
            <div class="divider"></div>
            <p>Impressora comunicando com sucesso!</p>
            <div class="details">
              <strong>Dispositivo:</strong> ${printerName}<br/>
              <strong>Modelo:</strong> ${paper}<br/>
              <strong>Emissão:</strong> ${new Date().toLocaleString('pt-BR')}
            </div>
            <div class="divider"></div>
            <div style="font-size: 9px; margin-top: 10px;">Obrigado por utilizar o Gestão OS!</div>
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
      return;
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
              <strong>Impressora Selecionada:</strong> ${printerName}<br/>
              <strong>Formato do Papel:</strong> ${paper}<br/>
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

          <button
            type="button"
            onClick={() => {
              setActiveTab('leitor');
              setTimeout(() => scannerInputRef.current?.focus(), 100);
            }}
            className={`px-3 py-2 font-bold rounded-t-xl transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
              activeTab === 'leitor'
                ? 'bg-white text-amber-800 border-t-2 border-amber-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Barcode className="w-3.5 h-3.5 text-amber-600" />
            Leitor de Código de Barras
          </button>
        </div>

        {/* Formulário com Rolagem */}
        <form onSubmit={handleSave} className="p-4 space-y-4 overflow-y-auto flex-1 bg-slate-50">
          {/* ABA 1: SELEÇÃO DA IMPRESSORA */}
          {activeTab === 'selecao' && (
            <div className="space-y-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <label className="block font-bold text-slate-800 text-[11.5px]">
                    <span>Impressoras Instaladas no Computador (Windows):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fetchInstalledPrinters(true)}
                    disabled={isLoadingPrinters}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 cursor-pointer transition-colors"
                    title="Buscar e atualizar lista de impressoras conectadas no Windows"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingPrinters ? 'animate-spin' : ''}`} />
                    {isLoadingPrinters ? 'Detectando...' : 'Atualizar Dispositivos'}
                  </button>
                </div>

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
                  onClick={() => handleTestPrint(config.selectedPrinterName, 'A4')}
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
              {/* Seleção de Impressora para A4 */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-[11.5px]">
                    <span>Impressora para Folha A4 (Comprovante e Orçamento):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fetchInstalledPrinters(true)}
                    disabled={isLoadingPrinters}
                    className="flex items-center gap-1 text-[10.5px] text-sky-700 hover:text-sky-900 cursor-pointer"
                    title="Atualizar lista de impressoras"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingPrinters ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={config.selectedA4PrinterName || config.selectedPrinterName || printersList[0] || 'Impressora Padrão do Windows'}
                    onChange={(e) => setConfig({ ...config, selectedA4PrinterName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-sky-600 cursor-pointer text-xs"
                  >
                    {printersList.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleTestPrint(config.selectedA4PrinterName || config.selectedPrinterName, 'A4')}
                    className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1 shrink-0 text-xs shadow-xs cursor-pointer"
                    title="Imprimir folha de teste A4"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Testar
                  </button>
                </div>
              </div>

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

              {/* Seleção de Impressora Térmica */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-[11.5px]">
                    <span>Impressora para Cupom Térmico (OS):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fetchInstalledPrinters(true)}
                    disabled={isLoadingPrinters}
                    className="flex items-center gap-1 text-[10.5px] text-amber-700 hover:text-amber-900 cursor-pointer"
                    title="Atualizar lista de impressoras"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingPrinters ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={config.selectedThermalPrinterName || config.selectedPrinterName || printersList[0] || 'Impressora Padrão do Windows'}
                    onChange={(e) => setConfig({ ...config, selectedThermalPrinterName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-sky-600 cursor-pointer text-xs"
                  >
                    {printersList.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleTestPrint(config.selectedThermalPrinterName || config.selectedPrinterName, 'THERMAL_80MM')}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1 shrink-0 text-xs shadow-xs cursor-pointer"
                    title="Imprimir cupom de teste térmico"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Testar
                  </button>
                </div>
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
                  <strong>Formato do Comprovante de Venda (PDV/Balcão):</strong> Escolha a impressora e o modelo de recibo para vendas de balcão e peças.
                </div>
              </div>

              {/* Seleção de Impressora de Vendas */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-[11.5px]">
                    <span>Impressora para Comprovante de Vendas:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fetchInstalledPrinters(true)}
                    disabled={isLoadingPrinters}
                    className="flex items-center gap-1 text-[10.5px] text-emerald-700 hover:text-emerald-900 cursor-pointer"
                    title="Atualizar lista de impressoras"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingPrinters ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={config.selectedSalesPrinterName || config.selectedPrinterName || printersList[0] || 'Impressora Padrão do Windows'}
                    onChange={(e) => setConfig({ ...config, selectedSalesPrinterName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600 cursor-pointer text-xs"
                  >
                    {printersList.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleTestPrint(config.selectedSalesPrinterName || config.selectedPrinterName, config.salesReceiptFormat || 'THERMAL_80MM')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1 shrink-0 text-xs shadow-xs cursor-pointer"
                    title="Imprimir teste de venda"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Testar
                  </button>
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

          {/* ABA 5: LEITOR DE CÓDIGO DE BARRAS */}
          {activeTab === 'leitor' && (
            <div className="space-y-4">
              {/* Box de Teste em Tempo Real */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 rounded-xl border border-amber-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-600 text-white rounded-lg shadow-xs">
                      <Barcode className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-xs">Área de Teste do Leitor (USB / Teclado)</h3>
                      <p className="text-[10.5px] text-slate-500">Bipe ou digite qualquer código de barras para testar a captura instantânea</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10.5px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    Pronto para Bipar
                  </span>
                </div>

                <div className="relative">
                  <input
                    ref={scannerInputRef}
                    type="text"
                    value={testScannedCode}
                    onChange={(e) => setTestScannedCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleProcessScannedCode(testScannedCode);
                      }
                    }}
                    placeholder="Clique aqui e aponte o leitor de código de barras..."
                    className="w-full bg-white border-2 border-amber-400 focus:border-amber-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono font-bold focus:outline-none focus:ring-3 focus:ring-amber-500/20 shadow-inner"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleProcessScannedCode(testScannedCode)}
                    className="absolute right-1.5 top-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Testar
                  </button>
                </div>

                {/* Histórico Recente de Bipagens de Teste */}
                <div className="bg-white rounded-xl border border-amber-200/80 p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700">Leituras Recentes de Teste:</span>
                    {scanHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setScanHistory([])}
                        className="text-red-600 hover:text-red-800 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Limpar histórico
                      </button>
                    )}
                  </div>

                  {scanHistory.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 text-xs italic">
                      Nenhum código bipado ainda. Aponte o leitor de código de barras para testar.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto pr-1">
                      {scanHistory.map((item, idx) => (
                        <div key={idx} className="py-1.5 flex items-center justify-between text-xs animate-fadeIn">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center">
                              ✓
                            </span>
                            <span className="font-mono font-bold text-slate-900">{item.code}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.2 rounded">
                              {item.type}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Seleção / Status do Dispositivo de Leitura */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Usb className="w-4 h-4 text-sky-600" />
                    Dispositivo de Leitura Detectado no Sistema:
                  </label>
                  {hasScannedDeviceActive ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Leitor Conectado e Ativo
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      Aguardando Conexão / Primeiro Bipe
                    </span>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={selectedScannerDevice}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedScannerDevice(val);
                      try { localStorage.setItem('vollen_selected_scanner_device', val); } catch {}
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-600 focus:bg-white shadow-2xs cursor-pointer"
                  >
                    {!hasScannedDeviceActive ? (
                      <option value="">
                        ⚠️ Nenhum Leitor Detectado (Conecte o leitor USB ou bipe na área de teste)
                      </option>
                    ) : (
                      <option value="Leitor USB / Teclado HID (Ativo)">
                        🟢 Leitor USB / Teclado HID (Dispositivo Reconhecido)
                      </option>
                    )}
                  </select>
                </div>

                <div className="flex items-center justify-between text-[10.5px] text-slate-500 pt-0.5">
                  <span>Interface: <strong>USB / Bluetooth (Emulação de Teclado HID)</strong></span>
                  <span className={hasScannedDeviceActive ? 'text-emerald-700 font-semibold' : 'text-slate-500 font-medium'}>
                    {hasScannedDeviceActive ? 'Status: Pronto para Leitura' : 'Status: Conecte o leitor na porta USB'}
                  </span>
                </div>
              </div>

              {/* Configurações de Comportamento do Leitor */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <span className="font-bold text-slate-800 block text-xs">
                  Preferências e Comportamento do Leitor:
                </span>

                <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl cursor-pointer border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <Volume2 className="w-4 h-4 text-sky-600" />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Som de Confirmação (Bipe no Sistema)</span>
                      <span className="text-[10.5px] text-slate-500">Emitir um som sonoro curto ao bipar com sucesso</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={scannerBeepAudio}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setScannerBeepAudio(val);
                      try { localStorage.setItem('vollen_scanner_beep_enabled', String(val)); } catch {}
                    }}
                    className="w-4 h-4 accent-amber-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl cursor-pointer border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Inserção Direta no PDV / Vendas Rápidas</span>
                      <span className="text-[10.5px] text-slate-500">Ao bipar no PDV, adiciona 1 unidade do produto instantaneamente ao carrinho</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={scannerAutoAddPOS}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setScannerAutoAddPOS(val);
                      try { localStorage.setItem('vollen_scanner_auto_add_pos', String(val)); } catch {}
                    }}
                    className="w-4 h-4 accent-amber-600 cursor-pointer"
                  />
                </label>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-start gap-2 text-[11px] text-slate-600">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">Dica de Compatibilidade:</strong> Leitores USB e sem fio funcionam como teclados virtuais (HID). Certifique-se de que o leitor esteja configurado com o sufixo <code>ENTER</code> (padrão de fábrica na maioria das marcas como Honeywell, Elgin, Zebra e Bematech).
                  </div>
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
