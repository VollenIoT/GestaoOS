import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Tag,
  Printer,
  Sliders,
  Package,
  Wrench,
  Search,
  Barcode,
} from 'lucide-react';
import { modalStack } from '../utils/modalStack';
import { Part, PartsModal } from './PartsModal';
import { CompanyData } from './CompanyModal';
import { generateBarcodeSvgElements } from '../utils/barcodeUtils';

export type LabelType = 'EQUIPMENT_OS' | 'PART_STOCK';

export interface A4LayoutConfig {
  id: string;
  name: string;
  cols: number;
  rows: number;
  totalPerSheet: number;
  labelWidthMm: number;
  labelHeightMm: number;
  topMarginMm: number;
  sideMarginMm: number;
  gapHorizontalMm: number;
  gapVerticalMm: number;
  description: string;
}

export const A4_STANDARD_LAYOUTS: A4LayoutConfig[] = [
  {
    id: 'A4_2_COL_10',
    name: '2 por linha (10 etiq. - 99x55 mm)',
    cols: 2,
    rows: 5,
    totalPerSheet: 10,
    labelWidthMm: 99.1,
    labelHeightMm: 55.8,
    topMarginMm: 8.5,
    sideMarginMm: 4.6,
    gapHorizontalMm: 3.6,
    gapVerticalMm: 0,
    description: 'Padrão Pimaco 6182 / 6282 - Etiquetas Grandes',
  },
  {
    id: 'A4_2_COL_14',
    name: '2 por linha (14 etiq. - 101x38 mm)',
    cols: 2,
    rows: 7,
    totalPerSheet: 14,
    labelWidthMm: 101.6,
    labelHeightMm: 38.1,
    topMarginMm: 15.1,
    sideMarginMm: 3.4,
    gapHorizontalMm: 0,
    gapVerticalMm: 0,
    description: 'Padrão Pimaco 6181 / 6081 - Médio/Largo',
  },
  {
    id: 'A4_3_COL_24',
    name: '3 por linha (24 etiq. - 63.5x33.9 mm)',
    cols: 3,
    rows: 8,
    totalPerSheet: 24,
    labelWidthMm: 63.5,
    labelHeightMm: 33.9,
    topMarginMm: 13.1,
    sideMarginMm: 7.2,
    gapHorizontalMm: 2.5,
    gapVerticalMm: 0,
    description: 'Padrão Pimaco 6089 / 6189 - Mais comum para gôndolas',
  },
  {
    id: 'A4_3_COL_30',
    name: '3 por linha (30 etiq. - 66.7x25.4 mm)',
    cols: 3,
    rows: 10,
    totalPerSheet: 30,
    labelWidthMm: 66.7,
    labelHeightMm: 25.4,
    topMarginMm: 21.2,
    sideMarginMm: 4.8,
    gapHorizontalMm: 0,
    gapVerticalMm: 0,
    description: 'Padrão Pimaco 6080 / 6180 - Gôndola compacta',
  },
  {
    id: 'A4_4_COL_44',
    name: '4 por linha (44 etiq. - 48.5x25.4 mm)',
    cols: 4,
    rows: 11,
    totalPerSheet: 44,
    labelWidthMm: 48.5,
    labelHeightMm: 25.4,
    topMarginMm: 8.8,
    sideMarginMm: 7.0,
    gapHorizontalMm: 0,
    gapVerticalMm: 0,
    description: 'Padrão Pimaco 6087 / 6187 - Gavetas e gaveteiros',
  },
  {
    id: 'A4_5_COL_65',
    name: '5 por linha (65 etiq. - 38.1x21.2 mm)',
    cols: 5,
    rows: 13,
    totalPerSheet: 65,
    labelWidthMm: 38.1,
    labelHeightMm: 21.2,
    topMarginMm: 10.7,
    sideMarginMm: 9.7,
    gapHorizontalMm: 0,
    gapVerticalMm: 0,
    description: 'Padrão Pimaco 6083 / 6183 - Mini peças e componentes',
  },
  {
    id: 'A4_6_COL_84',
    name: '6 por linha (84 etiq. - 31.7x19.0 mm)',
    cols: 6,
    rows: 14,
    totalPerSheet: 84,
    labelWidthMm: 31.7,
    labelHeightMm: 19.0,
    topMarginMm: 15.5,
    sideMarginMm: 9.9,
    gapHorizontalMm: 0,
    gapVerticalMm: 0,
    description: 'Padrão 84 etiquetas por folha - Micro etiquetas',
  },
  {
    id: 'A4_7_COL_105',
    name: '7 por linha (105 etiq. - 27.0x18.0 mm)',
    cols: 7,
    rows: 15,
    totalPerSheet: 105,
    labelWidthMm: 27.0,
    labelHeightMm: 18.0,
    topMarginMm: 13.5,
    sideMarginMm: 10.5,
    gapHorizontalMm: 0,
    gapVerticalMm: 0,
    description: 'Padrão 105 etiquetas por folha - Nano peças/eletrônica',
  },
];

interface LabelsGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem?: any | null; // Pode ser uma OS ou uma Peça
  initialLabelType?: LabelType;
  allOrders?: any[];
  allParts?: Part[];
  companyInfo?: CompanyData;
  onOpenPartsModal?: () => void;
}

export const LabelsGeneratorModal: React.FC<LabelsGeneratorModalProps> = ({
  isOpen,
  onClose,
  targetItem,
  initialLabelType = 'EQUIPMENT_OS',
  allOrders = [],
  allParts = [],
  companyInfo,
  onOpenPartsModal,
}) => {
  const [labelType, setLabelType] = useState<LabelType>(initialLabelType);

  // Formato de Papel para OS
  const [paperFormatOS, setPaperFormatOS] = useState<'THERMAL_50X30' | 'THERMAL_40X25' | 'THERMAL_60X40' | 'A4_SHEET'>(() => {
    try {
      const saved = localStorage.getItem('vollen_label_paper_format_os');
      if (saved) return saved as any;
    } catch (e) {}
    return 'THERMAL_50X30';
  });

  // Formato de Papel para Peças
  const [paperFormatParts, setPaperFormatParts] = useState<'THERMAL_50X30' | 'THERMAL_40X25' | 'THERMAL_60X40' | 'A4_SHEET'>(() => {
    try {
      const saved = localStorage.getItem('vollen_label_paper_format_parts');
      if (saved) return saved as any;
    } catch (e) {}
    return 'THERMAL_50X30';
  });

  // Formato de papel ativo baseado na aba selecionada
  const paperFormat = labelType === 'EQUIPMENT_OS' ? paperFormatOS : paperFormatParts;
  const setPaperFormat = (fmt: 'THERMAL_50X30' | 'THERMAL_40X25' | 'THERMAL_60X40' | 'A4_SHEET') => {
    if (labelType === 'EQUIPMENT_OS') {
      setPaperFormatOS(fmt);
    } else {
      setPaperFormatParts(fmt);
    }
  };

  // Gabarito A4 para OS
  const [selectedA4LayoutIdOS, setSelectedA4LayoutIdOS] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('vollen_label_a4_layout_os');
      if (saved) return saved;
    } catch (e) {}
    return 'A4_3_COL_24';
  });

  // Gabarito A4 para Peças
  const [selectedA4LayoutIdParts, setSelectedA4LayoutIdParts] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('vollen_label_a4_layout_parts');
      if (saved) return saved;
    } catch (e) {}
    return 'A4_3_COL_24';
  });

  const selectedA4LayoutId = labelType === 'EQUIPMENT_OS' ? selectedA4LayoutIdOS : selectedA4LayoutIdParts;
  const setSelectedA4LayoutId = (id: string) => {
    if (labelType === 'EQUIPMENT_OS') {
      setSelectedA4LayoutIdOS(id);
    } else {
      setSelectedA4LayoutIdParts(id);
    }
  };

  const currentA4Layout = A4_STANDARD_LAYOUTS.find((l) => l.id === selectedA4LayoutId) || A4_STANDARD_LAYOUTS[2];

  // Preencher folha inteira para OS
  const [fillFullA4SheetOS, setFillFullA4SheetOS] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vollen_label_a4_fill_sheet_os');
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    return false;
  });

  // Preencher folha inteira para Peças
  const [fillFullA4SheetParts, setFillFullA4SheetParts] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vollen_label_a4_fill_sheet_parts');
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    return false;
  });

  const fillFullA4Sheet = labelType === 'EQUIPMENT_OS' ? fillFullA4SheetOS : fillFullA4SheetParts;
  const setFillFullA4Sheet = (fill: boolean) => {
    if (labelType === 'EQUIPMENT_OS') {
      setFillFullA4SheetOS(fill);
    } else {
      setFillFullA4SheetParts(fill);
    }
  };

  const [copiesCount, setCopiesCount] = useState<number>(1);
  const [selectedItem, setSelectedItem] = useState<any>(targetItem || null);
  const [isPartsSelectorOpen, setIsPartsSelectorOpen] = useState<boolean>(false);

  // Seleção de Impressora
  const [selectedPrinter, setSelectedPrinter] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('vollen_label_printer');
      if (saved) return saved;
      const globalConfig = localStorage.getItem('vollen_printer_config');
      if (globalConfig) {
        const parsed = JSON.parse(globalConfig);
        if (parsed.selectedPrinterName) return parsed.selectedPrinterName;
      }
    } catch (e) {}
    return 'Impressora Padrão do Windows';
  });

  const [availablePrinters, setAvailablePrinters] = useState<string[]>(() => {
    try {
      const savedList = localStorage.getItem('vollen_custom_printers_list');
      if (savedList) {
        const parsed = JSON.parse(savedList);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return ['Impressora Padrão do Windows'];
  });

  // Atualizar impressoras instaladas reais do Windows ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      const fetchPrinters = async () => {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const installed: string[] = await invoke('get_installed_printers');
          if (installed && Array.isArray(installed) && installed.length > 0) {
            setAvailablePrinters(installed);
            try {
              localStorage.setItem('vollen_custom_printers_list', JSON.stringify(installed));
            } catch {}
          }
        } catch (err) {
          console.warn('Erro ao obter impressoras reais em LabelsGeneratorModal:', err);
        }
      };
      fetchPrinters();
    }
  }, [isOpen]);

  // Salvar impressora selecionada
  const handleSelectPrinter = (printerName: string) => {
    setSelectedPrinter(printerName);
    try {
      localStorage.setItem('vollen_label_printer', printerName);
    } catch (e) {}
  };

  // Carregar preferências salvas de elementos visíveis
  const getSavedOption = (key: string, defaultValue: boolean): boolean => {
    try {
      const saved = localStorage.getItem(`vollen_label_opt_${key}`);
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    return defaultValue;
  };

  // Opções de personalização visual (OS)
  const [includeCompanyHeader, setIncludeCompanyHeader] = useState<boolean>(() => getSavedOption('includeCompanyHeader', true));
  const [includeAddress, setIncludeAddress] = useState<boolean>(() => getSavedOption('includeAddress', true));
  const [includePhone, setIncludePhone] = useState<boolean>(() => getSavedOption('includePhone', true));
  const [includeEquipment, setIncludeEquipment] = useState<boolean>(() => getSavedOption('includeEquipment', true));
  const [includeDefect, setIncludeDefect] = useState<boolean>(() => getSavedOption('includeDefect', true));

  // Opções de personalização visual (Peças / Estoque)
  const [includePartPrice, setIncludePartPrice] = useState<boolean>(() => getSavedOption('includePartPrice', true));
  const [includePartBarcode, setIncludePartBarcode] = useState<boolean>(() => getSavedOption('includePartBarcode', true));
  const [includePartManufacturerCode, setIncludePartManufacturerCode] = useState<boolean>(() => getSavedOption('includePartManufacturerCode', true));
  const [includePartApplication, setIncludePartApplication] = useState<boolean>(() => getSavedOption('includePartApplication', true));
  const [includePartLocation, setIncludePartLocation] = useState<boolean>(() => getSavedOption('includePartLocation', true));
  const [includePartGroup, setIncludePartGroup] = useState<boolean>(() => getSavedOption('includePartGroup', true));

  // Persistir preferências de formato e elementos visíveis
  useEffect(() => {
    try {
      localStorage.setItem('vollen_label_paper_format_os', paperFormatOS);
      localStorage.setItem('vollen_label_paper_format_parts', paperFormatParts);
      localStorage.setItem('vollen_label_a4_layout_os', selectedA4LayoutIdOS);
      localStorage.setItem('vollen_label_a4_layout_parts', selectedA4LayoutIdParts);
      localStorage.setItem('vollen_label_a4_fill_sheet_os', String(fillFullA4SheetOS));
      localStorage.setItem('vollen_label_a4_fill_sheet_parts', String(fillFullA4SheetParts));
      localStorage.setItem('vollen_label_opt_includeCompanyHeader', String(includeCompanyHeader));
      localStorage.setItem('vollen_label_opt_includeAddress', String(includeAddress));
      localStorage.setItem('vollen_label_opt_includePhone', String(includePhone));
      localStorage.setItem('vollen_label_opt_includeEquipment', String(includeEquipment));
      localStorage.setItem('vollen_label_opt_includeDefect', String(includeDefect));
      localStorage.setItem('vollen_label_opt_includePartPrice', String(includePartPrice));
      localStorage.setItem('vollen_label_opt_includePartBarcode', String(includePartBarcode));
      localStorage.setItem('vollen_label_opt_includePartManufacturerCode', String(includePartManufacturerCode));
      localStorage.setItem('vollen_label_opt_includePartApplication', String(includePartApplication));
      localStorage.setItem('vollen_label_opt_includePartLocation', String(includePartLocation));
      localStorage.setItem('vollen_label_opt_includePartGroup', String(includePartGroup));
    } catch (e) {}
  }, [
    paperFormatOS,
    paperFormatParts,
    selectedA4LayoutIdOS,
    selectedA4LayoutIdParts,
    fillFullA4SheetOS,
    fillFullA4SheetParts,
    includeCompanyHeader,
    includeAddress,
    includePhone,
    includeEquipment,
    includeDefect,
    includePartPrice,
    includePartBarcode,
    includePartManufacturerCode,
    includePartApplication,
    includePartLocation,
    includePartGroup,
  ]);

  // Campo de busca rápida
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchNotFound, setSearchNotFound] = useState<boolean>(false);

  // Executar busca por OS apenas sob demanda (ESTRITAMENTE POR NÚMERO DA OS)
  const executeSearchOrder = () => {
    const raw = searchQuery.trim();
    if (!raw) return;

    setSearchNotFound(false);
    const cleanVal = raw.toLowerCase().replace(/^os\s*#?|^#/, '');

    // 1. Busca exata por código da OS ou ID (ex: "0001", "1", "os-0001")
    let found = allOrders.find(
      (o) =>
        String(o.code || '').toLowerCase() === cleanVal ||
        String(o.code || '').toLowerCase() === `os-${cleanVal}` ||
        String(o.id || '').toLowerCase() === cleanVal
    );

    // 2. Busca de código contendo o número digitado
    if (!found) {
      found = allOrders.find((o) => {
        const c = String(o.code || '').toLowerCase().replace(/^os\s*#?|^#/, '');
        return c === cleanVal || c.includes(cleanVal);
      });
    }

    if (found) {
      setSelectedItem(found);
      setSearchNotFound(false);
    } else {
      setSearchNotFound(true);
    }
  };

  // Executar busca por Peça apenas sob demanda (ESTRITAMENTE POR CÓDIGO DA PEÇA)
  const executeSearchPart = () => {
    const raw = searchQuery.trim();
    if (!raw) return;

    setSearchNotFound(false);
    const q = raw.toLowerCase();
    const cleanNum = q.replace(/^0+/, ''); // Ex: "001" -> "1"

    // 1. Busca exata por código de barras, código do sistema, ID ou código do fabricante
    let found = allParts.find((p) => {
      const pCode = String(p.code || '').toLowerCase();
      const pBarcode = String(p.barcode || '').toLowerCase();
      const pId = String(p.id || '').toLowerCase();
      const pMfg = String(p.manufacturerCode || '').toLowerCase();
      const pCodeClean = pCode.replace(/^0+/, '');

      return (
        pBarcode === q ||
        pCode === q ||
        (cleanNum && pCodeClean === cleanNum) ||
        pId === q ||
        pMfg === q
      );
    });

    // 2. Se não achou exato, busca contendo no código de barras, código do sistema ou código do fabricante
    if (!found) {
      found = allParts.find((p) => {
        const b = String(p.barcode || '').toLowerCase();
        const c = String(p.code || '').toLowerCase();
        const m = String(p.manufacturerCode || '').toLowerCase();
        return b.includes(q) || c.includes(q) || m.includes(q);
      });
    }

    if (found) {
      setSelectedItem(found);
      setSearchNotFound(false);
    } else {
      setSearchNotFound(true);
    }
  };

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Gerenciamento na pilha de modais (ESC / navegação)
  useEffect(() => {
    if (isOpen) {
      modalStack.register('LabelsGeneratorModal', () => onCloseRef.current());
      return () => {
        modalStack.unregister('LabelsGeneratorModal');
      };
    } else {
      modalStack.unregister('LabelsGeneratorModal');
    }
  }, [isOpen]);

  // Inicialização / Reset somente quando o modal abrir ou quando targetItem mudar explicitamente
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // Modal acabou de abrir
      setSearchQuery('');
      setSearchNotFound(false);
      if (targetItem) {
        setSelectedItem(targetItem);
        if (targetItem.partsUsed || targetItem.code?.startsWith('OS-') || targetItem.status) {
          setLabelType('EQUIPMENT_OS');
        } else if (targetItem.stockQuantity !== undefined || targetItem.finalPrice) {
          setLabelType('PART_STOCK');
        }
      } else {
        setSelectedItem(null);
        setLabelType(initialLabelType);
      }
    } else if (isOpen && targetItem) {
      // Se targetItem foi fornecido/alterado enquanto aberto
      setSelectedItem(targetItem);
      if (targetItem.partsUsed || targetItem.code?.startsWith('OS-') || targetItem.status) {
        setLabelType('EQUIPMENT_OS');
      } else if (targetItem.stockQuantity !== undefined || targetItem.finalPrice) {
        setLabelType('PART_STOCK');
      }
    } else if (!isOpen && prevIsOpenRef.current) {
      // Modal fechou
      setSelectedItem(null);
      setSearchQuery('');
      setSearchNotFound(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, targetItem, initialLabelType]);

  if (!isOpen) return null;

  const handlePrint = () => {
    const isA4 = paperFormat === 'A4_SHEET';
    const printArea = document.getElementById(isA4 ? 'printable-a4-sheet-container' : 'printable-labels-container');
    if (!printArea) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      window.print();
      return;
    }

    const a4Styles = isA4
      ? `
        @page {
          size: A4 portrait;
          margin: 0;
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .a4-print-sheet {
          width: 210mm;
          height: 297mm;
          box-sizing: border-box;
          padding-top: ${currentA4Layout.topMarginMm}mm;
          padding-left: ${currentA4Layout.sideMarginMm}mm;
          padding-right: ${currentA4Layout.sideMarginMm}mm;
          display: grid;
          grid-template-columns: repeat(${currentA4Layout.cols}, ${currentA4Layout.labelWidthMm}mm);
          grid-template-rows: repeat(${currentA4Layout.rows}, ${currentA4Layout.labelHeightMm}mm);
          column-gap: ${currentA4Layout.gapHorizontalMm}mm;
          row-gap: ${currentA4Layout.gapVerticalMm}mm;
          page-break-after: always;
          overflow: hidden;
        }
        .a4-label-cell {
          width: ${currentA4Layout.labelWidthMm}mm;
          height: ${currentA4Layout.labelHeightMm}mm;
          box-sizing: border-box;
          padding: 2mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          border: 0.1mm dotted #bbb;
        }
        .a4-label-cell.empty {
          border: none;
          visibility: hidden;
        }
      `
      : `
        @page {
          margin: 0;
          size: auto;
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 2px;
          background: #fff;
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .label-item {
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          border: 1px dashed #ccc;
          padding: 4px 6px;
          margin-bottom: 4px;
          overflow: hidden;
        }
        .thermal-50x30 { width: 50mm; height: 30mm; }
        .thermal-40x25 { width: 40mm; height: 25mm; }
        .thermal-60x40 { width: 60mm; height: 40mm; }
      `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Impressão de Etiquetas - Vollen Gestão OS</title>
          <style>
            ${a4Styles}
            .bold { font-weight: bold; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body>
          ${printArea.innerHTML}
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-800">
        {/* Header */}
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl border border-amber-300 shadow-xs">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 tracking-tight">
                  Central de Impressão de Etiquetas
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300 shadow-2xs">
                  v4.0.0 Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Gere etiquetas térmicas para identificação de aparelhos na OS e gôndolas/peças de estoque.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-300 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas de Tipos de Etiqueta */}
        <div className="flex items-center gap-2 px-6 pt-2.5 bg-slate-100 border-b border-slate-300 text-xs">
          <button
            onClick={() => setLabelType('EQUIPMENT_OS')}
            className={`px-4 py-2 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              labelType === 'EQUIPMENT_OS'
                ? 'bg-white text-amber-700 border-t border-x border-slate-300 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-sky-600" />
            Etiqueta de Aparelho (OS)
          </button>
          <button
            onClick={() => setLabelType('PART_STOCK')}
            className={`px-4 py-2 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              labelType === 'PART_STOCK'
                ? 'bg-white text-amber-700 border-t border-x border-slate-300 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-amber-600" />
            Etiqueta de Peça / Gôndola
          </button>
        </div>

        {/* Corpo Principal: Configuração à Esquerda, Preview à Direita */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-12 gap-5 bg-slate-50">
          {/* Coluna Esquerda: Parâmetros (5 cols) */}
          <div className="md:col-span-5 space-y-3.5 bg-white p-4 rounded-xl border border-slate-300 text-xs shadow-xs">
            {/* Seletor de Item por Campo de Busca Direto */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                {labelType === 'EQUIPMENT_OS' ? 'Digite o Número da Ordem de Serviço:' : 'Digite o Código da Peça:'}
              </label>

              {labelType === 'EQUIPMENT_OS' ? (
                <div className="space-y-2">
                  {/* Campo de Busca Rápida por Número da OS */}
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Digite o nº da OS e tecle Enter..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (searchNotFound) setSearchNotFound(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            executeSearchOrder();
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-600 focus:bg-white shadow-2xs"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedItem(null);
                            setSearchNotFound(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-bold text-xs cursor-pointer"
                          title="Limpar busca"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={executeSearchOrder}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1 shrink-0"
                      title="Buscar Ordem de Serviço"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Buscar</span>
                    </button>
                  </div>

                  {/* Mensagem se não encontrar */}
                  {searchNotFound && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-xl text-center text-red-600 font-bold text-[11px]">
                      Nenhuma OS encontrada com o número "{searchQuery}".
                    </div>
                  )}

                  {selectedItem ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs shadow-2xs">
                      <div className="overflow-hidden pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black bg-black text-white px-1.5 py-0.5 rounded text-[10px]">
                            OS {selectedItem.code}
                          </span>
                          <strong className="text-slate-900 truncate block">
                            {selectedItem.client?.name || 'Cliente Balcão'}
                          </strong>
                        </div>
                        <span className="text-[10px] text-slate-600 truncate block mt-0.5">
                          {selectedItem.equipment?.type || ''} {selectedItem.equipment?.brand || ''} {selectedItem.equipment?.model || ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItem(null);
                          setSearchQuery('');
                          setSearchNotFound(false);
                        }}
                        className="text-[11px] font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                        title="Desmarcar / Escolher outra OS"
                      >
                        ✕ Desmarcar
                      </button>
                    </div>
                  ) : (
                    !searchNotFound && (
                      <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-center text-slate-500 text-[11px]">
                        Digite o número da OS e clique em <strong>Buscar</strong> ou tecle <strong>Enter</strong>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Digite o código da peça e tecle Enter..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (searchNotFound) setSearchNotFound(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            executeSearchPart();
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-600 focus:bg-white shadow-2xs"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedItem(null);
                            setSearchNotFound(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-bold text-xs cursor-pointer"
                          title="Limpar busca"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (searchQuery.trim()) {
                          executeSearchPart();
                        } else {
                          setIsPartsSelectorOpen(true);
                        }
                      }}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1 shrink-0"
                      title="Abrir Central de Peças para Selecionar"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Buscar Peça</span>
                    </button>
                  </div>

                  {/* Mensagem se não encontrar */}
                  {searchNotFound && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-xl text-center text-red-600 font-bold text-[11px]">
                      Nenhuma peça encontrada para "{searchQuery}".
                    </div>
                  )}

                  {selectedItem ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs shadow-2xs">
                      <div className="overflow-hidden pr-2">
                        <strong className="text-slate-900 truncate block">[{selectedItem.code}] {selectedItem.name}</strong>
                        <span className="text-[10px] text-slate-600 block">Saldo: {selectedItem.stockQuantity ?? 0} un</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItem(null);
                          setSearchQuery('');
                          setSearchNotFound(false);
                        }}
                        className="text-[11px] font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                        title="Desmarcar peça"
                      >
                        ✕ Desmarcar
                      </button>
                    </div>
                  ) : (
                    !searchNotFound && (
                      <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-center text-slate-500 text-[11px]">
                        Digite o código ou nome da peça e clique em <strong>Buscar</strong> ou tecle <strong>Enter</strong>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Seleção de Impressora */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-amber-600" />
                <span>Impressora de Destino:</span>
              </label>
              <select
                value={selectedPrinter}
                onChange={(e) => handleSelectPrinter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:border-amber-600 focus:outline-none focus:bg-white shadow-2xs cursor-pointer"
              >
                {availablePrinters.map((pr) => (
                  <option key={pr} value={pr}>
                    {pr}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                A impressora selecionada fica salva para as próximas impressões.
              </span>
            </div>

            {/* Formato de Papel */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Formato do Papel / Etiqueta:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'THERMAL_50X30', label: 'Térmica 50x30 mm' },
                  { id: 'THERMAL_40X25', label: 'Térmica 40x25 mm' },
                  { id: 'THERMAL_60X40', label: 'Térmica 60x40 mm' },
                  { id: 'A4_SHEET', label: 'Folha A4 Adesiva' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPaperFormat(f.id as any)}
                    className={`p-2 rounded-lg border text-left font-bold transition-all cursor-pointer ${
                      paperFormat === f.id
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-300 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Configuração de Gabarito de Folha A4 (Aparece quando Folha A4 está selecionada) */}
            {paperFormat === 'A4_SHEET' && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
                <div>
                  <label className="block text-amber-950 font-bold mb-1 flex items-center justify-between">
                    <span>Modelo de Folha A4 / Gabarito:</span>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 font-black px-1.5 py-0.5 rounded">
                      {currentA4Layout.cols} por linha
                    </span>
                  </label>
                  <select
                    value={selectedA4LayoutId}
                    onChange={(e) => setSelectedA4LayoutId(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:border-amber-600 focus:outline-none shadow-2xs cursor-pointer"
                  >
                    {A4_STANDARD_LAYOUTS.map((lay) => (
                      <option key={lay.id} value={lay.id}>
                        {lay.name} ({lay.totalPerSheet} etiq/folha)
                      </option>
                    ))}
                  </select>
                  <span className="text-[10.5px] text-amber-900/80 font-medium block mt-1">
                    {currentA4Layout.description}
                  </span>
                </div>

                <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-amber-950 font-bold cursor-pointer text-xs select-none">
                    <input
                      type="checkbox"
                      checked={fillFullA4Sheet}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFillFullA4Sheet(checked);
                        if (checked) {
                          setCopiesCount(currentA4Layout.totalPerSheet);
                        }
                      }}
                      className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Preencher Folha Inteira ({currentA4Layout.totalPerSheet} etiquetas)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Quantidade de Cópias */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">
                  {paperFormat === 'A4_SHEET' ? 'Etiquetas a Imprimir na Folha:' : 'Quantidade de Etiquetas a Imprimir:'}
                </label>
                {paperFormat === 'A4_SHEET' && (
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Capacidade da folha: {currentA4Layout.totalPerSheet} un
                  </span>
                )}
              </div>
              <input
                type="number"
                min="1"
                max={paperFormat === 'A4_SHEET' ? currentA4Layout.totalPerSheet * 10 : 500}
                value={copiesCount}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value));
                  setCopiesCount(val);
                  if (paperFormat === 'A4_SHEET' && val !== currentA4Layout.totalPerSheet) {
                    setFillFullA4Sheet(false);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-bold focus:border-amber-600 focus:outline-none focus:bg-white shadow-2xs"
              />
            </div>

            {/* Opções de Elementos na Etiqueta */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <span className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                Elementos Visíveis na Impressão:
              </span>
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={includeCompanyHeader}
                  onChange={(e) => setIncludeCompanyHeader(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                />
                <span>Nome da Empresa</span>
              </label>

              {labelType === 'EQUIPMENT_OS' && (
                <>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={includeAddress}
                      onChange={(e) => setIncludeAddress(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Endereço Completo do Cliente</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={includePhone}
                      onChange={(e) => setIncludePhone(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Telefone / WhatsApp do Cliente</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={includeEquipment}
                      onChange={(e) => setIncludeEquipment(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Dados do Aparelho (Tipo/Marca/Modelo)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={includeDefect}
                      onChange={(e) => setIncludeDefect(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Descrição Resumida do Defeito</span>
                  </label>
                </>
              )}

              {labelType === 'PART_STOCK' && (
                <>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={includePartPrice}
                      onChange={(e) => setIncludePartPrice(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Preço de Venda (R$)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={includePartBarcode}
                      onChange={(e) => setIncludePartBarcode(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="flex items-center gap-1">
                      <Barcode className="w-3.5 h-3.5 text-amber-700" />
                      Código de Barras (Gráfico / Leitor)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={includePartManufacturerCode}
                      onChange={(e) => setIncludePartManufacturerCode(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Código do Fabricante / Referência</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={includePartApplication}
                      onChange={(e) => setIncludePartApplication(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Aplicação / Compatibilidade</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={includePartLocation}
                      onChange={(e) => setIncludePartLocation(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Localização no Estoque (Gaveta/Prateleira)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={includePartGroup}
                      onChange={(e) => setIncludePartGroup(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Grupo da Peça / Categoria</span>
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Coluna Direita: Pré-visualização da Etiqueta (7 cols) */}
          <div className="md:col-span-7 flex flex-col items-center justify-start bg-slate-200/60 p-4 rounded-2xl border border-slate-300 overflow-y-auto max-h-[75vh]">
            <div className="w-full flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                {paperFormat === 'A4_SHEET'
                  ? `Folha A4: ${currentA4Layout.name} (${copiesCount} de ${currentA4Layout.totalPerSheet} posições)`
                  : `Pré-visualização (${paperFormat.replace('THERMAL_', '').replace('_', ' ')})`}
              </span>
              {paperFormat === 'A4_SHEET' && (
                <span className="text-[10px] bg-white text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-300 shadow-2xs">
                  Gabarito {currentA4Layout.cols} colunas × {currentA4Layout.rows} linhas
                </span>
              )}
            </div>

            {/* PREVIEW EM FOLHA A4 (Dimensão Real Proporcional 520px de largura com scroll suave) */}
            {paperFormat === 'A4_SHEET' ? (
              <div className="w-full flex flex-col items-center py-2">
                <div
                  id="printable-a4-sheet-container"
                  className="a4-print-sheet bg-white text-black shadow-2xl rounded border border-slate-400 select-none overflow-hidden"
                  style={{
                    width: '500px',
                    height: '707px', // Proporção exata 1 : 1.4142 (A4 210 x 297 mm)
                    paddingTop: `${(currentA4Layout.topMarginMm / 297) * 707}px`,
                    paddingBottom: `${(currentA4Layout.topMarginMm / 297) * 707}px`,
                    paddingLeft: `${(currentA4Layout.sideMarginMm / 210) * 500}px`,
                    paddingRight: `${(currentA4Layout.sideMarginMm / 210) * 500}px`,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${currentA4Layout.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${currentA4Layout.rows}, 1fr)`,
                    columnGap: `${Math.max(1, (currentA4Layout.gapHorizontalMm / 210) * 500)}px`,
                    rowGap: `${Math.max(1, (currentA4Layout.gapVerticalMm / 297) * 707)}px`,
                    boxSizing: 'border-box',
                  }}
                >
                  {Array.from({ length: currentA4Layout.totalPerSheet }).map((_, idx) => {
                    const isFilled = idx < copiesCount;
                    const cols = currentA4Layout.cols;

                    // Tipografia e espaçamentos calculados para NUNCA estourar a célula
                    const titleTextSize =
                      cols <= 2 ? 'text-[9.5px]' : cols === 3 ? 'text-[8px]' : cols === 4 ? 'text-[6.5px]' : cols === 5 ? 'text-[5.5px]' : 'text-[5px]';
                    const badgeTextSize =
                      cols <= 2 ? 'text-[8px] px-1' : cols === 3 ? 'text-[6.5px] px-0.8' : cols === 4 ? 'text-[5.5px] px-0.5' : 'text-[4.8px] px-0.5';
                    const mainTextSize =
                      cols <= 2 ? 'text-[7.5px]' : cols === 3 ? 'text-[6.5px]' : cols === 4 ? 'text-[5.5px]' : cols === 5 ? 'text-[4.8px]' : 'text-[4.2px]';
                    const subTextSize =
                      cols <= 2 ? 'text-[7px]' : cols === 3 ? 'text-[6px]' : cols === 4 ? 'text-[5px]' : cols === 5 ? 'text-[4.5px]' : 'text-[4px]';
                    const footerTextSize =
                      cols <= 2 ? 'text-[7px]' : cols === 3 ? 'text-[6px]' : cols === 4 ? 'text-[5px]' : 'text-[4.2px]';

                    if (!isFilled) {
                      return (
                        <div
                          key={idx}
                          className="a4-label-cell empty border border-dashed border-slate-200 rounded-[2px] flex items-center justify-center text-[7.5px] text-slate-300 font-bold bg-slate-50/50"
                        >
                          {idx + 1}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={idx}
                        className="a4-label-cell bg-white border border-dashed border-slate-300 rounded-[2px] p-[2px] flex flex-col justify-between overflow-hidden box-border leading-tight"
                      >
                        {/* Conteúdo OS */}
                        {labelType === 'EQUIPMENT_OS' && (() => {
                          const client = selectedItem?.client || {};
                          const clientName = client.name || 'Cliente Balcão';
                          const street = client.address || client.street || '';
                          const num = client.number ? `nº ${client.number}` : '';
                          const neighborhood = client.neighborhood || client.bairro || '';
                          const fullAddress = [street ? `${street} ${num}`.trim() : '', neighborhood].filter(Boolean).join(' - ');
                          const phone = client.phone || client.whatsapp || client.mobile || client.tel || '';

                          return (
                            <div className="flex-1 flex flex-col justify-around overflow-hidden leading-tight py-[0.5px]">
                              {/* Código OS e Nome do Cliente */}
                              <div className="flex items-center justify-between gap-1 overflow-hidden">
                                <span className={`${badgeTextSize} font-black bg-black text-white rounded shrink-0 leading-none`}>
                                  {selectedItem?.code || '0000'}
                                </span>
                                <span className={`${mainTextSize} font-black text-slate-900 truncate flex-1 text-right leading-none`}>
                                  {clientName}
                                </span>
                              </div>

                              {/* Endereço */}
                              {includeAddress && fullAddress && cols <= 4 && (
                                <div className={`${subTextSize} text-slate-800 truncate leading-none`}>
                                  <span className="font-bold text-black">End:</span> {fullAddress}
                                </div>
                              )}

                              {/* Telefone */}
                              {includePhone && phone && (
                                <div className={`${subTextSize} font-bold text-slate-900 truncate leading-none`}>
                                  <span className="font-bold text-black">Tel:</span> {phone}
                                </div>
                              )}

                              {/* Aparelho */}
                              {includeEquipment && (
                                <div className={`${subTextSize} text-slate-900 font-semibold truncate leading-none`}>
                                  <span className="font-bold text-black">Apar:</span> {selectedItem?.equipment?.type || ''} {selectedItem?.equipment?.brand || ''} {selectedItem?.equipment?.model || ''}
                                </div>
                              )}

                              {/* Defeito */}
                              {includeDefect && selectedItem?.problemDescription && cols <= 3 && (
                                <div className={`${subTextSize} text-slate-700 truncate leading-none`}>
                                  <span className="font-bold text-black">Def:</span> {selectedItem?.problemDescription}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Conteúdo Peça */}
                        {labelType === 'PART_STOCK' && (
                          <div className="flex-1 flex flex-col justify-between py-[0.5px]">
                            {/* Bloco Superior: Descrição com 100% da largura no topo e sem corte */}
                            <div className="w-full">
                              <span
                                className={`${mainTextSize} font-black text-slate-900 leading-[1.15] block break-words`}
                                title={selectedItem?.name}
                              >
                                {selectedItem?.name || 'NOME DA PEÇA'}
                              </span>
                            </div>

                            {/* Bloco Intermediário: Código da peça compacto + Fabricante, Aplicação, Localização, Grupo */}
                            <div className="my-auto space-y-[1px] py-[0.5px]">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className={`${badgeTextSize} font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded px-0.5 leading-none`}>
                                  Cód: {selectedItem?.code || '000'}
                                </span>

                                {includePartManufacturerCode && (
                                  selectedItem?.manufacturerCode ||
                                  selectedItem?.manufacturer_code ||
                                  selectedItem?.codFabricante ||
                                  selectedItem?.brand
                                ) && (
                                  <span className={`${subTextSize} text-slate-800 truncate leading-none`}>
                                    <span className="font-bold text-black">Fab:</span>{' '}
                                    {selectedItem?.manufacturerCode ||
                                      selectedItem?.manufacturer_code ||
                                      selectedItem?.codFabricante ||
                                      selectedItem?.brand}
                                  </span>
                                )}
                              </div>

                              {includePartApplication && selectedItem?.application && cols <= 4 && (
                                <div className={`${subTextSize} text-slate-700 truncate leading-none`}>
                                  <span className="font-bold text-black">Apli:</span> {selectedItem.application}
                                </div>
                              )}

                              {((includePartLocation && selectedItem?.location) || (includePartGroup && selectedItem?.group)) && cols <= 4 && (
                                <div className={`${subTextSize} text-slate-600 truncate leading-none`}>
                                  {includePartLocation && selectedItem?.location ? (
                                    <span>Loc: <strong>{selectedItem.location}</strong></span>
                                  ) : null}
                                  {includePartLocation && selectedItem?.location && includePartGroup && selectedItem?.group ? ' • ' : ''}
                                  {includePartGroup && selectedItem?.group ? (
                                    <span>Grp: {selectedItem.group}</span>
                                  ) : null}
                                </div>
                              )}
                            </div>

                            {/* Bloco Inferior: Código de Barras e Preço */}
                            <div className="space-y-[1px] mt-auto">
                              {/* CÓDIGO DE BARRAS GRÁFICO (VETORIAL SVG) NA PARTE INFERIOR */}
                              {includePartBarcode && (selectedItem?.barcode || selectedItem?.code) && cols <= 4 && (
                                <div className="py-[0.5px] flex flex-col items-center justify-center">
                                  {(() => {
                                    const codeToRender = String(selectedItem?.barcode || selectedItem?.code || '');
                                    const bcHeight = cols <= 2 ? 22 : cols === 3 ? 17 : 14;
                                    const bcFontSize = cols <= 2 ? 8 : cols === 3 ? 7 : 6;
                                    const bcWidth = cols <= 2 ? 1.2 : cols === 3 ? 0.95 : 0.8;
                                    const { svgContent } = generateBarcodeSvgElements(codeToRender, {
                                      height: bcHeight,
                                      barWidth: bcWidth,
                                      showText: true,
                                      fontSize: bcFontSize,
                                    });
                                    return (
                                      <div
                                        className="w-full flex items-center justify-center"
                                        dangerouslySetInnerHTML={{ __html: svgContent }}
                                      />
                                    );
                                  })()}
                                </div>
                              )}

                              {includePartPrice && (
                                <div className="flex items-center justify-end border-t border-dashed border-slate-300 pt-[0.5px]">
                                  <span className={`${mainTextSize} font-black text-emerald-800 bg-emerald-100/90 px-0.5 rounded leading-none`}>
                                    R$ {selectedItem?.finalPrice || '0,00'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Rodapé: Nome da Empresa (se ativado) + Telefone + Data */}
                        <div className={`${footerTextSize} flex items-center justify-between text-slate-600 border-t border-black/20 pt-[1px] font-mono leading-none overflow-hidden`}>
                          <span className="truncate max-w-[70%]">
                            {includeCompanyHeader
                              ? (companyInfo?.tradingName || companyInfo?.name || 'ASSISTÊNCIA TÉCNICA')
                              : (companyInfo?.phone ? `Tel: ${companyInfo.phone}` : '')}
                          </span>
                          {labelType !== 'PART_STOCK' && cols <= 3 && (
                            <span className="font-bold text-black ml-auto shrink-0">{new Date().toLocaleDateString('pt-BR')}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* PREVIEW EM ETIQUETA TÉRMICA */
              <div id="printable-labels-container" className="flex flex-wrap gap-4 justify-center">
                {Array.from({ length: 1 }).map((_, idx) => {
                  const isMini = paperFormat === 'THERMAL_40X25';
                  const isLarge = paperFormat === 'THERMAL_60X40';

                  const containerSize = isMini
                    ? 'w-[185px] h-[115px] p-2'
                    : isLarge
                    ? 'w-[260px] h-[170px] p-3'
                    : 'w-[220px] h-[132px] p-2.5';

                  const osBadgeSize = isMini ? 'text-[9px] px-1 py-0.2' : isLarge ? 'text-[11px] px-2 py-0.5' : 'text-[10px] px-1.5 py-0.5';
                  const clientNameSize = isMini ? 'text-[8.5px]' : isLarge ? 'text-[10.5px]' : 'text-[9.5px]';
                  const mainInfoTextSize = isMini ? 'text-[7.5px]' : isLarge ? 'text-[9.5px]' : 'text-[8.5px]';
                  const footerTextSize = isMini ? 'text-[6.5px]' : isLarge ? 'text-[8.5px]' : 'text-[7px]';

                  return (
                    <div
                      key={idx}
                      className={`bg-white text-black rounded-lg shadow-xl border border-slate-400 flex flex-col justify-between overflow-hidden select-none box-border ${containerSize}`}
                    >
                      {/* Conteúdo Conforme Tipo (OS) */}
                      {labelType === 'EQUIPMENT_OS' && (() => {
                        const client = selectedItem?.client || {};
                        const clientName = client.name || 'Cliente Balcão';
                        const street = client.address || client.street || '';
                        const num = client.number ? `nº ${client.number}` : '';
                        const neighborhood = client.neighborhood || client.bairro || '';
                        const city = client.city || '';
                        const state = client.state || '';
                        
                        const addressParts: string[] = [];
                        if (street) addressParts.push(num ? `${street}, ${num}` : street);
                        if (neighborhood) addressParts.push(neighborhood);
                        if (city) addressParts.push(state ? `${city}/${state}` : city);
                        const fullAddress = addressParts.join(' - ');
                        const phone = client.phone || client.whatsapp || client.mobile || client.tel || '';

                        return (
                          <div className="flex-1 flex flex-col justify-around overflow-hidden py-0.5 leading-tight">
                            <div className="flex items-center justify-between gap-1 overflow-hidden">
                              <span className={`${osBadgeSize} font-black bg-black text-white rounded shrink-0 tracking-wide`}>
                                {selectedItem?.code || '0000'}
                              </span>
                              <span className={`${clientNameSize} font-black text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-right`}>
                                {clientName}
                              </span>
                            </div>

                            {includeAddress && fullAddress && (
                              <div className={`${mainInfoTextSize} text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis`}>
                                <span className="font-bold text-black">End:</span> {fullAddress}
                              </div>
                            )}

                            {includePhone && phone && (
                              <div className={`${mainInfoTextSize} font-bold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis`}>
                                <span className="font-bold text-black">Tel:</span> {phone}
                              </div>
                            )}

                            {includeEquipment && (
                              <div className={`${mainInfoTextSize} text-slate-900 font-semibold whitespace-nowrap overflow-hidden text-ellipsis`}>
                                <span className="font-bold text-black">Apar:</span> {selectedItem?.equipment?.type || ''} {selectedItem?.equipment?.brand || ''} {selectedItem?.equipment?.model || ''}
                              </div>
                            )}

                            {includeDefect && selectedItem?.problemDescription && (
                              <div className={`${mainInfoTextSize} text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis`}>
                                <span className="font-bold text-black">Def:</span> {selectedItem?.problemDescription}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Conteúdo Conforme Tipo (Peça) */}
                      {labelType === 'PART_STOCK' && (
                        <div className="flex-1 flex flex-col justify-between py-0.5 leading-tight">
                          {/* Bloco Superior: Descrição com 100% da largura no topo */}
                          <div className="w-full">
                            <span className={`${clientNameSize} font-black text-slate-900 leading-[1.15] block break-words`} title={selectedItem?.name}>
                              {selectedItem?.name || 'NOME DA PEÇA'}
                            </span>
                          </div>

                          {/* Bloco Intermediário: Código compacto + Fabricante, Aplicação, Localização, Grupo */}
                          <div className="space-y-0.5 my-auto py-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`${footerTextSize} font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded px-1 leading-none`}>
                                Cód: {selectedItem?.code || '000'}
                              </span>

                              {includePartManufacturerCode && (
                                selectedItem?.manufacturerCode ||
                                selectedItem?.manufacturer_code ||
                                selectedItem?.codFabricante ||
                                selectedItem?.brand
                              ) && (
                                <span className={`${mainInfoTextSize} text-slate-800 truncate leading-none`}>
                                  <span className="font-bold text-black">Fab:</span>{' '}
                                  {selectedItem?.manufacturerCode ||
                                    selectedItem?.manufacturer_code ||
                                    selectedItem?.codFabricante ||
                                    selectedItem?.brand}
                                </span>
                              )}
                            </div>

                            {includePartApplication && selectedItem?.application && (
                              <div className={`${mainInfoTextSize} text-slate-700 truncate leading-tight`}>
                                <span className="font-bold text-black">Apli:</span> {selectedItem.application}
                              </div>
                            )}

                            {((includePartLocation && selectedItem?.location) || (includePartGroup && selectedItem?.group)) && (
                              <div className={`${footerTextSize} text-slate-600 truncate leading-tight`}>
                                {includePartLocation && selectedItem?.location ? (
                                  <span>Loc: <strong>{selectedItem.location}</strong></span>
                                ) : null}
                                {includePartLocation && selectedItem?.location && includePartGroup && selectedItem?.group ? ' • ' : ''}
                                {includePartGroup && selectedItem?.group ? (
                                  <span>Grp: {selectedItem.group}</span>
                                ) : null}
                              </div>
                            )}
                          </div>

                          {/* Bloco Inferior: Código de Barras e Preço */}
                          <div className="space-y-1 mt-auto">
                            {/* CÓDIGO DE BARRAS GRÁFICO (VETORIAL SVG) NA PARTE INFERIOR */}
                            {includePartBarcode && (selectedItem?.barcode || selectedItem?.code) && (
                              <div className="py-0.5 flex flex-col items-center justify-center overflow-hidden">
                                {(() => {
                                  const codeToRender = String(selectedItem?.barcode || selectedItem?.code || '');
                                  const hasIntermediates = Boolean(
                                    (includePartManufacturerCode && (selectedItem?.manufacturerCode || selectedItem?.brand)) ||
                                    (includePartApplication && selectedItem?.application) ||
                                    (includePartLocation && selectedItem?.location) ||
                                    (includePartGroup && selectedItem?.group)
                                  );
                                  // Se tiver poucos campos, expande o código de barras para preencher harmoniosamente
                                  const bcHeight = isMini ? (hasIntermediates ? 19 : 26) : isLarge ? (hasIntermediates ? 32 : 44) : (hasIntermediates ? 24 : 34);
                                  const bcFontSize = isMini ? 7.5 : isLarge ? 10 : 8.5;
                                  const bcWidth = isMini ? 1.05 : isLarge ? 1.75 : 1.3;
                                  const { svgContent } = generateBarcodeSvgElements(codeToRender, {
                                    height: bcHeight,
                                    barWidth: bcWidth,
                                    showText: true,
                                    fontSize: bcFontSize,
                                  });
                                  return (
                                    <div
                                      className="w-full flex items-center justify-center"
                                      dangerouslySetInnerHTML={{ __html: svgContent }}
                                    />
                                  );
                                })()}
                              </div>
                            )}

                            {includePartPrice && (
                              <div className="flex items-center justify-end pt-0.5 border-t border-dashed border-slate-300 overflow-hidden">
                                <span className={`${clientNameSize} font-black text-emerald-800 bg-emerald-100/90 px-1 py-0.2 rounded leading-none`}>
                                  R$ {selectedItem?.finalPrice || '0,00'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Rodapé da Etiqueta: Nome da Empresa discreto + Telefone */}
                      <div className={`${footerTextSize} flex items-center justify-between text-slate-600 border-t border-black/20 pt-0.5 mt-0.5 font-mono`}>
                        <span className="truncate max-w-[70%]">
                          {includeCompanyHeader
                            ? (companyInfo?.tradingName || companyInfo?.name || 'ASSISTÊNCIA TÉCNICA')
                            : (companyInfo?.phone ? `Tel: ${companyInfo.phone}` : '')}
                        </span>
                        {labelType !== 'PART_STOCK' && (
                          <span className="font-bold text-black ml-auto">{new Date().toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-200 border-t border-slate-300">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-bold text-slate-700">Destino:</span>
            <span className="font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300 shadow-2xs truncate max-w-[240px]">
              {selectedPrinter}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Fechar
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir {copiesCount} Etiqueta(s)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Seleção de Peças */}
      {isPartsSelectorOpen && (
        <PartsModal
          isOpen={isPartsSelectorOpen}
          parts={allParts}
          allOrders={allOrders}
          onClose={() => setIsPartsSelectorOpen(false)}
          onSelectPart={(part) => {
            setSelectedItem(part);
            setSearchQuery(part.code || '');
            setIsPartsSelectorOpen(false);
            setSearchNotFound(false);
          }}
          onOpenCreatePart={() => {}}
        />
      )}
    </div>
  );
};
