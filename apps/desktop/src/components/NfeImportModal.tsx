import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Building2,
  PackagePlus,
  ArrowRight,
  RefreshCw,
  Plus,
  Search,
  DollarSign,
  Layers,
} from 'lucide-react';
import { parseNfeXml, NfeParsedData, NfeParsedProduct } from '../utils/nfeXmlParser';
import { Part } from './PartsModal';
import { SupplierItem } from './SuppliersModal';
import { modalStack } from '../utils/modalStack';
import { useDialog } from './DialogContext';

interface ConciliatedItem {
  parsed: NfeParsedProduct;
  action: 'match' | 'create' | 'ignore';
  matchedPartId?: string;
  matchedPartName?: string;
  newFinalPrice?: string;
  profitMargin?: number;
  newStockQuantity: number;
}

interface NfeImportModalProps {
  isOpen: boolean;
  parts: Part[];
  suppliers: SupplierItem[];
  onClose: () => void;
  onSaveParts: (updatedParts: Part[]) => Promise<void>;
  onSaveSuppliers: (updatedSuppliers: SupplierItem[]) => Promise<void>;
}

export const NfeImportModal: React.FC<NfeImportModalProps> = ({
  isOpen,
  parts,
  suppliers,
  onClose,
  onSaveParts,
  onSaveSuppliers,
}) => {
  const { alert, confirm } = useDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nfeData, setNfeData] = useState<NfeParsedData | null>(null);
  const [items, setItems] = useState<ConciliatedItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [defaultMarkup, setDefaultMarkup] = useState<number>(100); // 100% de margem padrão

  useEffect(() => {
    if (isOpen) {
      modalStack.register('NfeImportModal', onClose);
    } else {
      modalStack.unregister('NfeImportModal');
      setNfeData(null);
      setItems([]);
      setSelectedSupplierId('');
    }
    return () => {
      modalStack.unregister('NfeImportModal');
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Processa o arquivo XML selecionado
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = parseNfeXml(content);
        setNfeData(parsed);

        // Tenta achar fornecedor pelo CNPJ
        const cleanCnpj = parsed.supplier.cnpj.replace(/\D/g, '');
        const matchedSup = suppliers.find(
          (s) => (s.cnpj || '').replace(/\D/g, '') === cleanCnpj
        );
        if (matchedSup) {
          setSelectedSupplierId(matchedSup.id);
        }

        // Conciliação automática de itens com o catálogo existente
        const conciliated: ConciliatedItem[] = parsed.products.map((p) => {
          // Busca correspondência por código de barras, código de fabricante ou nome exato
          const matched = parts.find((part) => {
            if (p.barcode && part.barcode && part.barcode === p.barcode) return true;
            if (p.barcode && part.manufacturerCode && part.manufacturerCode === p.barcode) return true;
            if (p.code && part.manufacturerCode && part.manufacturerCode === p.code) return true;
            if (p.code && part.code && part.code === p.code) return true;
            if (part.name.trim().toLowerCase() === p.name.trim().toLowerCase()) return true;
            return false;
          });

          if (matched) {
            const currentCost = p.finalUnitCost;
            const currentStock = Number(matched.stockQuantity || 0);
            return {
              parsed: p,
              action: 'match',
              matchedPartId: matched.id,
              matchedPartName: matched.name,
              newFinalPrice: matched.finalPrice,
              profitMargin: defaultMarkup,
              newStockQuantity: currentStock + p.quantity,
            };
          } else {
            const markup = defaultMarkup;
            const finalVal = p.finalUnitCost * (1 + markup / 100);
            return {
              parsed: p,
              action: 'create',
              profitMargin: markup,
              newFinalPrice: finalVal.toFixed(2).replace('.', ','),
              newStockQuantity: p.quantity,
            };
          }
        });

        setItems(conciliated);
      } catch (err: any) {
        alert({
          title: 'Erro ao importar XML',
          message: err.message || 'Não foi possível ler a nota fiscal.',
          variant: 'danger',
        });
      }
    };
    reader.readAsText(file, 'UTF-8');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApplyGlobalMarkup = (markup: number) => {
    setDefaultMarkup(markup);
    setItems((prev) =>
      prev.map((item) => {
        const cost = item.parsed.finalUnitCost;
        const finalVal = cost * (1 + markup / 100);
        return {
          ...item,
          profitMargin: markup,
          newFinalPrice: finalVal.toFixed(2).replace('.', ','),
        };
      })
    );
  };

  const handleUpdateItem = (index: number, patch: Partial<ConciliatedItem>) => {
    setItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], ...patch };
      
      // Se recalcular margem ou preço
      if (patch.profitMargin !== undefined) {
        const cost = target.parsed.finalUnitCost;
        const val = cost * (1 + (patch.profitMargin || 0) / 100);
        target.newFinalPrice = val.toFixed(2).replace('.', ',');
      }

      updated[index] = target;
      return updated;
    });
  };

  // Conclui a importação e grava no banco/estoque
  const handleConfirmImport = async () => {
    if (!nfeData) return;

    const validItems = items.filter((i) => i.action !== 'ignore');
    if (validItems.length === 0) {
      alert({
        title: 'Nenhum item selecionado',
        message: 'Selecione ou vincule ao menos um item da nota fiscal para importar.',
        variant: 'warning',
      });
      return;
    }

    const ok = await confirm({
      title: 'Confirmar Entrada de Estoque',
      message: `Deseja dar entrada em ${validItems.length} item(ns) da NF-e nº ${nfeData.number}? O saldo em estoque e custos serão atualizados.`,
      confirmText: 'Confirmar e Atualizar',
    });
    if (!ok) return;

    setIsProcessing(true);
    try {
      // 1. Cadastra fornecedor se não existir
      let finalSupplierId = selectedSupplierId;
      let updatedSuppliers = [...suppliers];
      if (!finalSupplierId && nfeData.supplier.cnpj) {
        const newSup: SupplierItem = {
          id: `sup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          code: String(suppliers.length + 1).padStart(4, '0'),
          name: nfeData.supplier.name,
          tradeName: nfeData.supplier.tradeName,
          cnpj: nfeData.supplier.cnpj,
          phone: nfeData.supplier.phone,
          address: nfeData.supplier.address.street,
          number: nfeData.supplier.address.number,
          neighborhood: nfeData.supplier.address.neighborhood,
          city: nfeData.supplier.address.city,
          state: nfeData.supplier.address.state,
          cep: nfeData.supplier.address.zipCode,
          createdAt: new Date().toISOString(),
        };
        updatedSuppliers = [newSup, ...updatedSuppliers];
        await onSaveSuppliers(updatedSuppliers);
        finalSupplierId = newSup.id;
      }

      const activeSupplierName =
        updatedSuppliers.find((s) => s.id === finalSupplierId)?.tradeName ||
        updatedSuppliers.find((s) => s.id === finalSupplierId)?.name ||
        nfeData.supplier.tradeName ||
        nfeData.supplier.name;

      // 2. Atualiza ou cria as peças
      let updatedParts = [...parts];

      for (const item of validItems) {
        const costPriceFormatted = item.parsed.finalUnitCost.toFixed(2).replace('.', ',');
        const finalPriceFormatted = item.newFinalPrice || costPriceFormatted;

        if (item.action === 'match' && item.matchedPartId) {
          const pIndex = updatedParts.findIndex((p) => p.id === item.matchedPartId);
          if (pIndex >= 0) {
            const currentPart = updatedParts[pIndex];
            const currentStock = Number(currentPart.stockQuantity || 0);
            updatedParts[pIndex] = {
              ...currentPart,
              costPrice: costPriceFormatted,
              profitMarginPercent: String(item.profitMargin || defaultMarkup),
              finalPrice: finalPriceFormatted,
              stockQuantity: currentStock + item.parsed.quantity,
              supplierId: finalSupplierId || currentPart.supplierId,
              supplierName: activeSupplierName || currentPart.supplierName,
              updatedAt: new Date().toISOString(),
            };
          }
        } else if (item.action === 'create') {
          // Gerar código único
          const maxNum = updatedParts.reduce((max, p) => {
            const num = parseInt((p.code || '').replace(/\D/g, ''), 10);
            return isNaN(num) ? max : Math.max(max, num);
          }, 0);
          const newCode = String(maxNum + 1).padStart(4, '0');

          const newPart: Part = {
            id: `part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            code: newCode,
            manufacturerCode: item.parsed.code !== item.parsed.barcode ? item.parsed.code : (item.parsed.code || ''),
            barcode: item.parsed.barcode || '',
            name: item.parsed.name.toUpperCase(),
            unit: item.parsed.unit || 'UN',
            costPrice: costPriceFormatted,
            profitMarginPercent: String(item.profitMargin || defaultMarkup),
            finalPrice: finalPriceFormatted,
            stockQuantity: item.parsed.quantity,
            minStock: 2,
            supplierId: finalSupplierId,
            supplierName: activeSupplierName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          updatedParts = [newPart, ...updatedParts];
        }
      }

      await onSaveParts(updatedParts);

      alert({
        title: 'Estoque Atualizado com Sucesso!',
        message: `Foram importados ${validItems.length} produto(s) da NF-e nº ${nfeData.number}. O saldo das peças e preços foram devidamente registrados.`,
        variant: 'success',
      });
      onClose();
    } catch (err: any) {
      alert({
        title: 'Erro ao salvar importação',
        message: err.message || 'Ocorreu um erro ao atualizar os registros.',
        variant: 'danger',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[75] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-800">
        {/* Cabeçalho */}
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-300 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 tracking-tight">
                  Entrada de Estoque via XML de NF-e
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300 shadow-2xs">
                  v4.0.0 Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Importe notas fiscais eletrônicas de fornecedores para cadastrar e atualizar estoque automaticamente.
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

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
          {!nfeData ? (
            /* Área de Upload */
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-12 transition-all bg-white hover:bg-emerald-50/40 group shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xs">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                Selecione o arquivo XML da Nota Fiscal
              </h3>
              <p className="text-xs text-slate-500 mb-6 text-center max-w-md">
                Suporta arquivos padrão SEFAZ (NF-e modelo 55 e NFC-e modelo 65) enviados pelo seu fornecedor de peças.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                onChange={handleFileUpload}
                className="hidden"
                id="nfe-upload-input"
              />
              <label
                htmlFor="nfe-upload-input"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Carregar Arquivo XML
              </label>
            </div>
          ) : (
            /* Visualizador e Conciliador de Itens */
            <div className="space-y-4">
              {/* Card Dados da Nota */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3.5 bg-white border border-slate-300 rounded-xl text-xs shadow-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5 font-bold">Fornecedor (Emitente):</span>
                  <strong className="text-slate-900 text-sm block truncate font-bold">
                    {nfeData.supplier.tradeName || nfeData.supplier.name}
                  </strong>
                  <span className="text-slate-500 text-[11px] font-mono">
                    CNPJ: {nfeData.supplier.cnpj}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-bold">Nota Fiscal:</span>
                  <strong className="text-slate-900 text-sm block font-bold font-mono">
                    Nº {nfeData.number} (Série {nfeData.series})
                  </strong>
                  <span className="text-slate-500 text-[11px] font-mono">
                    {nfeData.issueDate ? new Date(nfeData.issueDate).toLocaleDateString('pt-BR') : 'Data não informada'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-bold">Valor Total dos Produtos:</span>
                  <strong className="text-emerald-700 text-sm block font-black font-mono">
                    R$ {nfeData.totalProducts.toFixed(2).replace('.', ',')}
                  </strong>
                  <span className="text-slate-500 text-[11px] font-mono">
                    Total NF: R$ {nfeData.totalNF.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-bold">Margem de Lucro Padrão (%):</span>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={defaultMarkup}
                      onChange={(e) => handleApplyGlobalMarkup(Number(e.target.value))}
                      className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-bold text-xs text-center focus:border-amber-600 focus:outline-none font-mono"
                    />
                    <span className="text-slate-500 text-[11px] font-bold">% em todos</span>
                  </div>
                </div>
              </div>

              {/* Tabela de Conciliação */}
              <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-slate-200/90 border-b border-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Itens Identificados na Nota ({items.length})
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setNfeData(null);
                      setItems([]);
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Carregar Outro XML
                  </button>
                </div>

                <div className="overflow-x-auto max-h-[42vh]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-200/90 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5">Ação</th>
                        <th className="p-2.5">Item da Nota (NF-e)</th>
                        <th className="p-2.5 text-center">Qtd</th>
                        <th className="p-2.5 text-right">Custo Unit.</th>
                        <th className="p-2.5 text-center">Margem</th>
                        <th className="p-2.5 text-right">Preço Venda</th>
                        <th className="p-2.5">Destino no Catálogo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {items.map((item, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-100/70 transition-colors ${
                            item.action === 'ignore' ? 'opacity-40 line-through bg-slate-100/50' : ''
                          }`}
                        >
                          {/* Seletor de Ação */}
                          <td className="p-2.5">
                            <select
                              value={item.action}
                              onChange={(e) =>
                                handleUpdateItem(idx, {
                                  action: e.target.value as any,
                                })
                              }
                              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:border-amber-600 focus:outline-none cursor-pointer"
                            >
                              <option value="create">➕ Cadastrar Novo</option>
                              <option value="match">🔗 Vincular Existente</option>
                              <option value="ignore">❌ Ignorar</option>
                            </select>
                          </td>

                          {/* Nome do Item */}
                          <td className="p-2.5 max-w-xs">
                            <strong className="text-slate-900 block truncate">
                              {item.parsed.name}
                            </strong>
                            <span className="text-[11px] text-slate-500 font-mono">
                              Cód: {item.parsed.code} {item.parsed.barcode ? `| EAN: ${item.parsed.barcode}` : ''} ({item.parsed.unit})
                            </span>
                          </td>

                          {/* Quantidade */}
                          <td className="p-2.5 text-center font-bold text-slate-800 font-mono">
                            {item.parsed.quantity}
                          </td>

                          {/* Custo */}
                          <td className="p-2.5 text-right font-medium text-slate-700 font-mono">
                            R$ {item.parsed.finalUnitCost.toFixed(2).replace('.', ',')}
                          </td>

                          {/* Margem */}
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              disabled={item.action === 'ignore'}
                              value={item.profitMargin ?? defaultMarkup}
                              onChange={(e) =>
                                handleUpdateItem(idx, { profitMargin: Number(e.target.value) })
                              }
                              className="w-14 px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-xs text-amber-800 font-bold focus:border-amber-600 focus:outline-none font-mono"
                            />
                            <span className="text-slate-500 text-[10px] ml-1 font-bold">%</span>
                          </td>

                          {/* Preço de Venda */}
                          <td className="p-2.5 text-right">
                            <input
                              type="text"
                              disabled={item.action === 'ignore'}
                              value={item.newFinalPrice || ''}
                              onChange={(e) =>
                                handleUpdateItem(idx, { newFinalPrice: e.target.value })
                              }
                              className="w-20 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-right text-xs text-slate-900 font-black focus:border-amber-600 focus:outline-none font-mono"
                            />
                          </td>

                          {/* Correspondência no Catálogo */}
                          <td className="p-2.5">
                            {item.action === 'match' ? (
                              <select
                                value={item.matchedPartId || ''}
                                onChange={(e) => {
                                  const targetPart = parts.find((p) => p.id === e.target.value);
                                  handleUpdateItem(idx, {
                                    matchedPartId: e.target.value,
                                    matchedPartName: targetPart?.name,
                                  });
                                }}
                                className="w-full max-w-[220px] px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs truncate focus:border-amber-600 focus:outline-none text-emerald-800 font-bold"
                              >
                                <option value="">-- Selecione a peça --</option>
                                {parts.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    [{p.code}] {p.name}
                                  </option>
                                ))}
                              </select>
                            ) : item.action === 'create' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                <PackagePlus className="w-3 h-3 text-emerald-700" />
                                Será cadastrado no catálogo
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Ignorado na entrada</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-200 border-t border-slate-300">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cancelar
          </button>

          {nfeData && (
            <button
              onClick={handleConfirmImport}
              disabled={isProcessing || items.filter((i) => i.action !== 'ignore').length === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isProcessing ? 'Atualizando Estoque...' : 'Confirmar e Atualizar Estoque'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
