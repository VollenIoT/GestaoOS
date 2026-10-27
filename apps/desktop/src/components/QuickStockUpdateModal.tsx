import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Search,
  Save,
  Check,
  AlertTriangle,
  Package,
  DollarSign,
  Percent,
  Layers,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Pencil,
} from 'lucide-react';
import { modalStack } from '../utils/modalStack';
import { useDialog } from './DialogContext';
import { Part } from './PartsModal';
import { formatCurrencyInput, formatPercentInput } from '../utils/formatters';
import { useCatalogStore } from '../stores/useCatalogStore';
import { matchesCodeExactOrPartial, normalizeSearchText } from '../utils/searchUtils';

interface QuickStockUpdateModalProps {
  isOpen: boolean;
  parts: Part[];
  onClose: () => void;
  onSavePart: (updatedPart: Part) => void;
}

export const QuickStockUpdateModal: React.FC<QuickStockUpdateModalProps> = ({
  isOpen,
  parts,
  onClose,
  onSavePart,
}) => {
  const { alert, confirm } = useDialog();

  // Garante acesso à lista mais recente de peças mesmo se houver delay nas props
  const catalogParts = useCatalogStore((s) => s.parts);
  const effectiveParts = (parts && parts.length > 0) ? parts : (catalogParts || []);

  // Campo de busca por código
  const [searchCode, setSearchCode] = useState<string>('');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);

  // Formulário editável da peça carregada
  const [formData, setFormData] = useState<{
    name: string;
    costPrice: string;
    profitMarginPercent: string;
    techPrice: string;
    finalPrice: string;
    stockQuantity: string;
    minStock: string;
  }>({
    name: '',
    costPrice: '',
    profitMarginPercent: '',
    techPrice: '',
    finalPrice: '',
    stockQuantity: '0',
    minStock: '0',
  });

  // Flag para detectar alterações não salvas
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const costInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Obtém lista consolidada de peças de todas as fontes disponíveis
  const getAllParts = (): Part[] => {
    if (Array.isArray(parts) && parts.length > 0) return parts;
    const storeParts = useCatalogStore.getState().parts;
    if (Array.isArray(storeParts) && storeParts.length > 0) return storeParts;
    try {
      const p1 = localStorage.getItem('vollen_parts_stock');
      if (p1) {
        const parsed = JSON.parse(p1);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const p2 = localStorage.getItem('vollen_parts');
      if (p2) {
        const parsed = JSON.parse(p2);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  };

  // Formata valor que pode ser number ou string para formato de moeda brasileira (ex: 26.41 -> "26,41")
  const formatPriceForInput = (val: any): string => {
    if (val === undefined || val === null || val === '') return '';
    if (typeof val === 'number') {
      return val.toFixed(2).replace('.', ',');
    }
    const str = String(val).trim();
    if (!str) return '';
    if (/^\d+\.\d+$/.test(str)) {
      return parseFloat(str).toFixed(2).replace('.', ',');
    }
    return str;
  };

  // Carrega os dados da peça no formulário quando selecionada com segurança de tipos
  const loadPartToForm = (part: Part) => {
    try {
      const rawCost = String(part.costPrice ?? '0').replace(',', '.');
      const rawFinal = String(part.finalPrice ?? '0').replace(',', '.');
      const costVal = parseFloat(rawCost) || 0;
      const finalVal = parseFloat(rawFinal) || 0;

      let marginStr = String(part.profitMarginPercent ?? '');
      if (!marginStr && costVal > 0 && finalVal > 0) {
        const pct = ((finalVal - costVal) / costVal) * 100;
        marginStr = pct.toFixed(1).replace('.0', '');
      }

      setIsEditingName(false);
      setSelectedPart(part);
      setFormData({
        name: part.name || '',
        costPrice: formatPriceForInput(part.costPrice),
        profitMarginPercent: marginStr,
        techPrice: formatPriceForInput(part.techPrice),
        finalPrice: formatPriceForInput(part.finalPrice),
        stockQuantity: String(part.stockQuantity !== undefined ? part.stockQuantity : 0),
        minStock: String(part.minStock !== undefined ? part.minStock : 0),
      });
      setIsDirty(false);

      // Foca no primeiro campo de edição após buscar
      setTimeout(() => {
        costInputRef.current?.focus();
        costInputRef.current?.select();
      }, 80);
    } catch (err) {
      console.error('Erro ao carregar dados da peça:', err);
    }
  };

  // Busca peça por código local, código de fabricante, código de barras ou id
  // Ao digitar qualquer número (ex: "1" ou "02"), ignora os zeros à esquerda e carrega diretamente a peça correspondente ("0001" ou "0002")
  const handleSearchByCode = (codeToSearch?: string) => {
    const rawVal = codeToSearch !== undefined ? codeToSearch : (searchInputRef.current?.value || searchCode);
    const term = (rawVal || '').trim();
    if (!term) return;

    setSearchCode(term);

    const allPartsList = getAllParts();
    const termNorm = normalizeSearchText(term);
    const cleanDigits = term.replace(/\D/g, '');
    const searchNum = cleanDigits.length > 0 ? parseInt(cleanDigits, 10) : NaN;
    const termStripped = cleanDigits.replace(/^0+/, '') || (cleanDigits.length > 0 ? '0' : '');

    let found: Part | undefined;

    // 1. Busca Numérica Direta (ignora zeros à esquerda: "1" encontra "0001", "02" encontra "0002")
    if (!isNaN(searchNum)) {
      // Prioridade A: Código local (numérico, padStart, stripped ou replace)
      found = allPartsList.find((p) => {
        if (!p) return false;
        const rawPCode = String(p.code || '').trim();
        const codeDigits = rawPCode.replace(/\D/g, '');
        if (codeDigits) {
          const codeNum = parseInt(codeDigits, 10);
          if (!isNaN(codeNum) && codeNum === searchNum) return true;
          const codeStripped = codeDigits.replace(/^0+/, '') || '0';
          if (codeStripped === termStripped) return true;
        }
        if (rawPCode.padStart(4, '0') === term.padStart(4, '0')) return true;
        return false;
      });

      // Prioridade B: Código de fabricante numérico
      if (!found) {
        found = allPartsList.find((p) => {
          if (!p) return false;
          const mfgDigits = String(p.manufacturerCode || '').replace(/\D/g, '');
          if (!mfgDigits) return false;
          return parseInt(mfgDigits, 10) === searchNum;
        });
      }

      // Prioridade C: Código de barras ou ID numérico
      if (!found) {
        found = allPartsList.find((p) => {
          if (!p) return false;
          const barcodeDigits = String(p.barcode || '').replace(/\D/g, '');
          if (barcodeDigits && parseInt(barcodeDigits, 10) === searchNum) return true;
          const idDigits = String(p.id || '').replace(/\D/g, '');
          if (idDigits && parseInt(idDigits, 10) === searchNum) return true;
          return false;
        });
      }
    }

    // 2. Busca Exata Textual / Código com Letras (ex: "FAB-123", "PEC-001", "7891234567890")
    if (!found) {
      found = allPartsList.find((p) => {
        if (!p) return false;
        const pCode = normalizeSearchText(p.code);
        const pMfg = normalizeSearchText(p.manufacturerCode);
        const pBarcode = normalizeSearchText(p.barcode);
        const pId = normalizeSearchText(String(p.id || ''));

        if (pCode === termNorm) return true;
        if (pMfg === termNorm) return true;
        if (pBarcode === termNorm) return true;
        if (pId === termNorm) return true;

        if (matchesCodeExactOrPartial(p.code, term, true)) return true;
        if (matchesCodeExactOrPartial(p.manufacturerCode, term, true)) return true;
        if (matchesCodeExactOrPartial(p.barcode, term, true)) return true;

        return false;
      });
    }

    // 3. Fallback: Busca por nome exato ou contido
    if (!found) {
      found = allPartsList.find((p) => p && normalizeSearchText(p.name).includes(termNorm));
    }

    if (found) {
      setErrorMessage(null);
      loadPartToForm(found);
    } else {
      const sampleCodes = allPartsList.slice(0, 6).map((p) => p.code).filter(Boolean).join(', ');
      const msg = `Nenhuma peça encontrada com o código "${term}". Peças disponíveis no sistema (${allPartsList.length}): [${sampleCodes || 'nenhuma'}]`;
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 8000);
      alert({
        title: 'Peça não encontrada',
        message: msg,
        variant: 'warning',
      });
    }
  };

  // Função para limpar campo e estado
  const handleClear = () => {
    setSearchCode('');
    setSelectedPart(null);
    setIsEditingName(false);
    setIsDirty(false);
    setSuccessToast(null);
    setErrorMessage(null);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  // Solicita fechamento com confirmação se houver dados não salvos
  const handleRequestClose = async () => {
    if (isDirty) {
      const ok = await confirm({
        title: 'Sair sem Salvar?',
        message: 'Existem alterações nesta peça que ainda não foram salvas. Deseja realmente sair e descartar as alterações?',
        variant: 'warning',
        confirmText: 'Sair sem salvar',
      });
      if (!ok) return;
    }
    setIsDirty(false);
    setSelectedPart(null);
    setSearchCode('');
    onClose();
  };

  const handleRequestCloseRef = useRef(handleRequestClose);
  handleRequestCloseRef.current = handleRequestClose;

  // Registro na pilha de modais para tecla ESC
  useEffect(() => {
    if (isOpen) {
      modalStack.register('QuickStockUpdateModal', () => handleRequestCloseRef.current());
      return () => {
        modalStack.unregister('QuickStockUpdateModal');
      };
    }
  }, [isOpen]);

  // Reseta campos SOMENTE na transição de fechado -> aberto
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setIsDirty(false);
      setSelectedPart(null);
      setSearchCode('');
      setSuccessToast(null);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  if (!isOpen) return null;

  // Recálculo dinâmico de Custo -> Margem -> Preço Final
  const handleCostChange = (val: string) => {
    setIsDirty(true);
    const costVal = parseFloat(String(val || '').replace(',', '.')) || 0;
    const pctVal = parseFloat(String(formData.profitMarginPercent || '').replace(',', '.')) || 0;

    let newFinal = formData.finalPrice;
    if (costVal > 0 && pctVal > 0) {
      const calcFinal = costVal * (1 + pctVal / 100);
      newFinal = calcFinal.toFixed(2).replace('.', ',');
    }

    setFormData((prev) => ({
      ...prev,
      costPrice: val,
      finalPrice: newFinal,
    }));
  };

  const handleMarginChange = (val: string) => {
    setIsDirty(true);
    const pctVal = parseFloat(String(val || '').replace(',', '.')) || 0;
    const costVal = parseFloat(String(formData.costPrice || '').replace(',', '.')) || 0;

    let newFinal = formData.finalPrice;
    if (costVal > 0 && pctVal > 0) {
      const calcFinal = costVal * (1 + pctVal / 100);
      newFinal = calcFinal.toFixed(2).replace('.', ',');
    }

    setFormData((prev) => ({
      ...prev,
      profitMarginPercent: val,
      finalPrice: newFinal,
    }));
  };

  const handleFinalPriceChange = (val: string) => {
    setIsDirty(true);
    const finalVal = parseFloat(String(val || '').replace(',', '.')) || 0;
    const costVal = parseFloat(String(formData.costPrice || '').replace(',', '.')) || 0;

    let newMargin = formData.profitMarginPercent;
    if (costVal > 0 && finalVal > 0) {
      const pct = ((finalVal - costVal) / costVal) * 100;
      newMargin = pct.toFixed(1).replace('.0', '');
    }

    setFormData((prev) => ({
      ...prev,
      finalPrice: val,
      profitMarginPercent: newMargin,
    }));
  };

  // Salvar peça e manter o modal aberto para a próxima busca
  const handleSave = () => {
    if (!selectedPart) return;

    if (!formData.finalPrice.trim()) {
      alert({
        title: 'Preço Obrigatório',
        message: 'O preço de venda para o consumidor final não pode ficar em branco.',
        variant: 'warning',
      });
      return;
    }

    const partNameSaved = (formData.name || '').trim() || selectedPart.name;
    const updatedPart: Part = {
      ...selectedPart,
      name: partNameSaved,
      costPrice: formatCurrencyInput(formData.costPrice),
      profitMarginPercent: formatPercentInput(formData.profitMarginPercent),
      techPrice: formData.techPrice ? formatCurrencyInput(formData.techPrice) : '',
      finalPrice: formatCurrencyInput(formData.finalPrice),
      stockQuantity: Number(formData.stockQuantity) || 0,
      minStock: Number(formData.minStock) || 0,
      updatedAt: new Date().toISOString(),
    };

    onSavePart(updatedPart);
    setIsDirty(false);
    setIsEditingName(false);

    // Toast visual de sucesso e reset para buscar a próxima peça
    setSuccessToast(`Peça "${partNameSaved}" atualizada com sucesso!`);
    setTimeout(() => setSuccessToast(null), 3500);

    // Limpa a peça selecionada e foca novamente no campo de busca de código
    setSelectedPart(null);
    setSearchCode('');
    setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-[75] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-fadeIn">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                Atualização Rápida de Estoque e Preços
              </h2>
              <p className="text-[11px] text-amber-100 font-medium">
                Altere estoque, custo e valores por código com fluxo contínuo
              </p>
            </div>
          </div>
          <button
            onClick={handleRequestClose}
            className="p-1.5 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificação Toast Flutuante de Sucesso */}
        {successToast && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn shadow-inner">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-200" />
              <span>{successToast}</span>
            </div>
            <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded text-emerald-100">
              Pronto para a próxima peça
            </span>
          </div>
        )}

        {/* Notificação de Peça Não Encontrada */}
        {errorMessage && (
          <div className="bg-amber-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn shadow-inner">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-200 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-[10px] bg-amber-700 hover:bg-amber-800 px-2 py-0.5 rounded text-amber-100 cursor-pointer shrink-0"
            >
              Fechar
            </button>
          </div>
        )}

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* 1. Barra de Busca por Código */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-amber-600" />
              Digite ou Bipe o Código / Cód. Barras da Peça e pressione Enter:
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  data-ignore-enter-navigation="true"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSearchByCode(e.currentTarget.value);
                    }
                  }}
                  placeholder="Ex: 1, 0001, 7891234567890 ou FAB-9982 (Enter ou Leitor)..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-amber-600 shadow-2xs font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSearchByCode(searchInputRef.current?.value || searchCode)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>Buscar</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                title="Limpar pesquisa e peça selecionada"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>Limpar</span>
              </button>
            </div>
            <span className="text-[10px] text-slate-500 block">
              Ao salvar, este campo limpa automaticamente para você bipar ou digitar a próxima peça sem fechar o modal.
            </span>
          </div>

          {/* 2. Detalhes da Peça Carregada & Campos Editáveis */}
          {selectedPart ? (
            <div className="space-y-4 border border-amber-200 bg-amber-50/40 p-4 rounded-xl">
              {/* Cabeçalho da Peça */}
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2.5">
                <div className="flex-1 pr-3">
                  <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider block">
                    Peça Identificada
                  </span>
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setIsDirty(true);
                          setFormData((prev) => ({ ...prev, name: e.target.value }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setIsEditingName(false);
                          }
                        }}
                        placeholder="Nome da peça..."
                        className="bg-white border-2 border-amber-500 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none shadow-xs w-full max-w-md uppercase font-sans"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
                        title="Confirmar alteração de nome"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {formData.name || selectedPart.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingName(true);
                          setTimeout(() => {
                            nameInputRef.current?.focus();
                            nameInputRef.current?.select();
                          }, 50);
                        }}
                        className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs hover:border-amber-300 border border-transparent"
                        title="Alterar nome da peça"
                      >
                        <Pencil className="w-3.5 h-3.5 text-amber-600" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                    <span>
                      Cód. Local: <strong className="font-mono text-amber-800">{selectedPart.code}</strong>
                    </span>
                    {selectedPart.manufacturerCode && (
                      <span>
                        Fabricante: <strong className="font-mono text-slate-700">{selectedPart.manufacturerCode}</strong>
                      </span>
                    )}
                    {selectedPart.brand && (
                      <span>Marca: <strong>{selectedPart.brand}</strong></span>
                    )}
                  </div>
                </div>
                {selectedPart.location && (
                  <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold font-mono shrink-0">
                    Local: {selectedPart.location}
                  </span>
                )}
              </div>

              {/* Grid de Edição Rápida */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                {/* Preço de Custo */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Preço de Custo (R$):
                  </label>
                  <input
                    ref={costInputRef}
                    type="text"
                    value={formData.costPrice}
                    onChange={(e) => handleCostChange(e.target.value)}
                    onBlur={(e) => {
                      const formatted = formatCurrencyInput(e.target.value);
                      setFormData((prev) => ({ ...prev, costPrice: formatted }));
                    }}
                    placeholder="0,00"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-amber-600 shadow-2xs"
                  />
                </div>

                {/* Margem de Lucro */}
                <div>
                  <label className="block text-indigo-900 font-bold mb-1">
                    Margem (%):
                  </label>
                  <input
                    type="text"
                    value={formData.profitMarginPercent}
                    onChange={(e) => handleMarginChange(e.target.value)}
                    onBlur={(e) => {
                      const formatted = formatPercentInput(e.target.value);
                      setFormData((prev) => ({ ...prev, profitMarginPercent: formatted }));
                    }}
                    placeholder="Ex: 50%"
                    className="w-full bg-indigo-50 border border-indigo-300 rounded-xl px-3 py-2 text-indigo-950 font-bold focus:outline-none focus:border-indigo-600 shadow-2xs font-mono"
                  />
                </div>

                {/* Preço Técnico */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Preço Técnico (R$):
                  </label>
                  <input
                    type="text"
                    value={formData.techPrice}
                    onChange={(e) => {
                      setIsDirty(true);
                      setFormData({ ...formData, techPrice: e.target.value });
                    }}
                    onBlur={(e) => {
                      const formatted = formatCurrencyInput(e.target.value);
                      setFormData((prev) => ({ ...prev, techPrice: formatted }));
                    }}
                    placeholder="0,00"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-amber-600 shadow-2xs"
                  />
                </div>

                {/* Preço Consumidor Final (Venda) */}
                <div>
                  <label className="block text-emerald-900 font-extrabold mb-1">
                    Preço Venda Final (R$) *:
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.finalPrice}
                    onChange={(e) => handleFinalPriceChange(e.target.value)}
                    onBlur={(e) => {
                      const formatted = formatCurrencyInput(e.target.value);
                      setFormData((prev) => ({ ...prev, finalPrice: formatted }));
                    }}
                    placeholder="0,00"
                    className="w-full bg-emerald-50 border border-emerald-400 rounded-xl px-3 py-2 text-emerald-950 font-black focus:outline-none focus:border-emerald-600 shadow-2xs text-sm"
                  />
                </div>

                {/* Quantidade em Estoque */}
                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    Estoque Atual ({selectedPart.unit || 'UN'}):
                  </label>
                  <input
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => {
                      setIsDirty(true);
                      setFormData({ ...formData, stockQuantity: e.target.value });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-extrabold focus:outline-none focus:border-amber-600 shadow-2xs text-sm"
                  />
                </div>

                {/* Estoque Mínimo */}
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Estoque Mínimo:
                  </label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => {
                      setIsDirty(true);
                      setFormData({ ...formData, minStock: e.target.value });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-amber-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* Botões de Ação da Peça Carregada */}
              <div className="pt-2 flex items-center justify-between border-t border-amber-200/80">
                <button
                  type="button"
                  onClick={() => {
                    if (isDirty) {
                      loadPartToForm(selectedPart);
                    }
                  }}
                  disabled={!isDirty}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reverter Alterações</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Peça e Buscar Próxima</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50 space-y-2">
              <Package className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Nenhuma peça em edição no momento</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Digite ou bipe o código da peça no campo acima e pressione <strong className="text-slate-700">Enter</strong> para carregar seus dados e atualizar o estoque e preços.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {isDirty ? (
              <span className="text-amber-700 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Existem alterações não salvas
              </span>
            ) : (
              'Nenhuma alteração pendente'
            )}
          </span>

          <button
            type="button"
            onClick={handleRequestClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
