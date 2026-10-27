import React, { useState, useEffect, useRef } from 'react';
import { X, Package, Edit3, AlertTriangle, CheckCircle, ShoppingCart, Tag, Image as ImageIcon, Ruler, Zap, Cpu, Layers } from 'lucide-react';
import type { Part } from './PartsModal';
import { modalStack } from '../utils/modalStack';
import { getCurrentFeatures } from '../config/appFeatures';
import { useImageSource } from '../utils/imageUtils';

const PartViewPhoto: React.FC<{ imageUrl?: string; name?: string }> = ({ imageUrl, name }) => {
  const { displaySrc, hasError, setHasError } = useImageSource(imageUrl);

  if (!imageUrl || !imageUrl.trim() || hasError || !displaySrc) {
    return (
      <div className="flex flex-col items-center justify-center text-slate-300 select-none p-2 text-center">
        <ImageIcon className="w-10 h-10 stroke-[1.5] mb-1.5 text-slate-300" />
        <span className="text-xs font-semibold text-slate-400">Sem foto</span>
      </div>
    );
  }

  return (
    <img
      src={displaySrc}
      alt={name || 'Foto da Peça'}
      onError={() => setHasError(true)}
      className="w-full h-full aspect-square object-cover"
    />
  );
};

interface PartViewModalProps {
  isOpen: boolean;
  part: Part | null;
  currentUser: any;
  onClose: () => void;
  onEdit: (part: Part) => void;
  onAddToSales?: (part: Part) => void;
  onOpenLabelsGenerator?: (part: Part) => void;
}

export const PartViewModal: React.FC<PartViewModalProps> = ({
  isOpen,
  part,
  currentUser,
  onClose,
  onEdit,
  onAddToSales,
  onOpenLabelsGenerator,
}) => {
  const [activeTab, setActiveTab] = useState<'DATA' | 'DIMENSIONS' | 'SPECS' | 'ATTRIBUTES'>('DATA');
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      setActiveTab('DATA');
      modalStack.register('PartViewModal', () => {
        onCloseRef.current();
      });
      return () => modalStack.unregister('PartViewModal');
    }
  }, [isOpen]);

  if (!isOpen || !part) return null;

  const canEdit = Boolean(
    currentUser?.role === 'Admin' ||
    currentUser?.permissions?.manageParts
  );

  const qty = part.stockQuantity !== undefined ? part.stockQuantity : 0;
  const minQty = part.minStock !== undefined ? part.minStock : 0;
  const isZeroStock = Number(qty) <= 0;
  const isLowStock = qty <= minQty || qty <= 0;

  const inp = "w-full bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 font-semibold text-xs focus:outline-none cursor-default select-none";
  const lbl = "block font-semibold text-slate-600 mb-0.5 text-xs";

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-4xl flex flex-col shadow-2xl overflow-hidden font-sans">

        {/* HEADER */}
        <div className="px-4 py-3 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-800">Ficha Técnica da Peça</h2>
          </div>
          <div className="flex items-center gap-2">
            {isLowStock ? (
              <span className="flex items-center gap-1 bg-red-100 border border-red-300 text-red-700 px-2 py-0.5 rounded-md text-xs font-bold">
                <AlertTriangle className="w-3 h-3" />
                Estoque Baixo: {qty} un
              </span>
            ) : (
              <span className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-md text-xs font-bold">
                <CheckCircle className="w-3 h-3" />
                Em Estoque: {qty} un
              </span>
            )}
            <button onClick={onClose} className="text-slate-500 hover:text-slate-900 p-1 rounded cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SUB-ABAS DE NAVEGAÇÃO DA FICHA */}
        <div className="px-4 pt-2.5 bg-slate-100/70 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('DATA')}
              className={`px-3 py-1.5 rounded-t-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border-t border-x ${
                activeTab === 'DATA'
                  ? 'bg-white text-sky-700 border-slate-200 shadow-xs'
                  : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Dados Gerais & Estoque
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DIMENSIONS')}
              className={`px-3 py-1.5 rounded-t-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border-t border-x ${
                activeTab === 'DIMENSIONS'
                  ? 'bg-white text-indigo-700 border-slate-200 shadow-xs'
                  : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Ruler className="w-3.5 h-3.5 text-indigo-500" />
              Medidas & Dimensões
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SPECS')}
              className={`px-3 py-1.5 rounded-t-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border-t border-x ${
                activeTab === 'SPECS'
                  ? 'bg-white text-amber-700 border-slate-200 shadow-xs'
                  : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Elétrica & Técnica
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ATTRIBUTES')}
              className={`px-3 py-1.5 rounded-t-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border-t border-x ${
                activeTab === 'ATTRIBUTES'
                  ? 'bg-white text-purple-700 border-slate-200 shadow-xs'
                  : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              Atributos Extras
            </button>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL DAS ABAS */}
        <div className="p-4 bg-white min-h-[300px] flex flex-col justify-start">
          {/* ABA DADOS GERAIS */}
          {activeTab === 'DATA' && (
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <div className="col-span-3">
                      <label className={lbl}>Nome da Peça</label>
                      <input type="text" readOnly value={part.name || ''} className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Marca / Fabricante</label>
                      <input type="text" readOnly value={part.brand || ''} placeholder="--" className={inp} />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <div>
                      <label className={lbl}>Código do Fabricante</label>
                      <input type="text" readOnly value={part.manufacturerCode || ''} placeholder="--" className={`${inp} font-mono`} />
                    </div>
                    <div>
                      <label className={lbl}>Código de Barras</label>
                      <input type="text" readOnly value={part.barcode || ''} placeholder="--" className={`${inp} font-mono font-bold`} />
                    </div>
                    <div>
                      <label className={lbl}>Grupo (Tipo de Equip.)</label>
                      <input type="text" readOnly value={part.group || ''} placeholder="--" className={`${inp} uppercase`} />
                    </div>
                    <div>
                      <label className={lbl}>Localização no Estoque</label>
                      <input type="text" readOnly value={part.location || ''} placeholder="--" className={`${inp} uppercase`} />
                    </div>
                  </div>

                  <div className={`grid ${getCurrentFeatures().hasPartsTechPrice ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mb-2`}>
                    <div>
                      <label className={isZeroStock ? "block font-bold text-red-600 mb-0.5 text-xs" : lbl}>Qtd. em Estoque</label>
                      <input
                        type="text"
                        readOnly
                        value={qty}
                        className={
                          isZeroStock
                            ? "w-full bg-red-50 border border-red-300 rounded-md px-2.5 py-1.5 text-red-600 font-mono font-bold text-sm focus:outline-none cursor-default select-none"
                            : `${inp} font-mono font-bold`
                        }
                      />
                    </div>
                    {getCurrentFeatures().hasPartsTechPrice && (
                      <div>
                        <label className="block font-semibold text-blue-800 mb-0.5 text-xs">Valor Revenda (R$)</label>
                        <input
                          type="text"
                          readOnly
                          value={part.techPrice || ''}
                          placeholder="--"
                          className="w-full bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1.5 text-blue-800 font-semibold text-xs cursor-default select-none"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block font-semibold text-emerald-800 mb-0.5 text-xs">Valor Consumidor (R$)</label>
                      <input
                        type="text"
                        readOnly
                        value={part.finalPrice || ''}
                        placeholder="--"
                        className="w-full bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5 text-emerald-800 font-semibold text-xs cursor-default select-none"
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className={lbl}>Fornecedor</label>
                    <input type="text" readOnly value={part.supplierName || 'Não informado'} className={inp} />
                  </div>

                  <div>
                    <label className={lbl}>Referência / Aplicação Básica</label>
                    <textarea
                      readOnly
                      rows={2}
                      value={part.application || ''}
                      placeholder="Não informado"
                      className="w-full bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 text-xs focus:outline-none cursor-default select-none resize-none"
                    />
                  </div>
                </div>

                {/* Square Photo Area */}
                <div className="w-full md:w-48 flex flex-col items-center justify-start shrink-0">
                  <label className="block font-semibold text-slate-600 mb-0.5 text-xs w-full text-left">Foto da Peça</label>
                  <div className="w-44 h-44 md:w-48 md:h-48 aspect-square rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-inner flex items-center justify-center relative">
                    <PartViewPhoto imageUrl={part.imageUrl} name={part.name} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA MEDIDAS & DIMENSÕES */}
          {activeTab === 'DIMENSIONS' && (
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Ruler className="w-4 h-4 text-indigo-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Medidas & Dimensões Físicas</h4>
                  <p className="text-[11px] text-slate-500">Parâmetros físicos e dimensionais registrados para conferência</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={lbl}>Comprimento</label>
                  <input type="text" readOnly value={part.length || 'Não informado'} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Largura</label>
                  <input type="text" readOnly value={part.width || 'Não informado'} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Altura / Espessura</label>
                  <input type="text" readOnly value={part.height || 'Não informado'} className={inp} />
                </div>

                <div>
                  <label className={lbl}>Diâmetro Interno</label>
                  <input type="text" readOnly value={part.innerDiameter || 'Não informado'} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Diâmetro Externo</label>
                  <input type="text" readOnly value={part.outerDiameter || 'Não informado'} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Rosca / Encaixe / Bitola</label>
                  <input type="text" readOnly value={part.threadFitting || 'Não informado'} className={inp} />
                </div>

                <div>
                  <label className={lbl}>Peso Líquido</label>
                  <input type="text" readOnly value={part.weight || 'Não informado'} className={inp} />
                </div>
              </div>
            </div>
          )}

          {/* ABA ESPECIFICAÇÕES ELÉTRICAS & TÉCNICAS */}
          {activeTab === 'SPECS' && (
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Especificações Elétricas & Técnicas</h4>
                  <p className="text-[11px] text-slate-500">Voltagem, potência, corrente e propriedades operacionais</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={lbl}>Tensão / Voltagem</label>
                  <input type="text" readOnly value={part.voltage || 'Não informado'} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Potência</label>
                  <input type="text" readOnly value={part.power || 'Não informado'} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Corrente Elétrica</label>
                  <input type="text" readOnly value={part.current || 'Não informado'} className={inp} />
                </div>

                <div>
                  <label className={lbl}>Capacitância</label>
                  <input type="text" readOnly value={part.capacitance || 'Não informado'} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Frequência</label>
                  <input type="text" readOnly value={part.frequency || 'Não informado'} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Resistência Ôhmica</label>
                  <input type="text" readOnly value={part.resistance || 'Não informado'} className={inp} />
                </div>

                <div>
                  <label className={lbl}>Material / Composição</label>
                  <input type="text" readOnly value={part.material || 'Não informado'} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Cor / Acabamento</label>
                  <input type="text" readOnly value={part.colorFinish || 'Não informado'} className={inp} />
                </div>
              </div>
            </div>
          )}



          {/* ABA ATRIBUTOS EXTRAS */}
          {activeTab === 'ATTRIBUTES' && (
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Atributos Personalizados Extras</h4>
                  <p className="text-[11px] text-slate-500">Campos dinâmicos e propriedades específicas desta peça</p>
                </div>
              </div>

              {(!part.customAttributes || part.customAttributes.length === 0) ? (
                <div className="flex flex-col items-center justify-center p-6 text-slate-400 border border-dashed border-slate-300 rounded-xl bg-white">
                  <Layers className="w-8 h-8 text-slate-300 mb-1" />
                  <p className="text-xs font-medium">Nenhum atributo personalizado cadastrado nesta peça.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {part.customAttributes.map((attr, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs">
                      <span className="block text-[10px] font-bold text-purple-700 uppercase tracking-wider">{attr.name || 'Propriedade'}</span>
                      <span className="text-xs font-semibold text-slate-800 break-words">{attr.value || '--'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-400 italic">
            {canEdit ? 'Você tem permissão para editar esta peça.' : 'Modo somente visualização.'}
          </span>
          <div className="flex items-center gap-2">
            {onOpenLabelsGenerator && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLabelsGenerator(part);
                }}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow cursor-pointer transition-all text-sm"
                title="Imprimir etiqueta térmica desta peça"
              >
                <Tag className="w-4 h-4" />
                Imprimir Etiqueta
              </button>
            )}
            {onAddToSales && (
              <button
                onClick={() => {
                  onClose();
                  onAddToSales(part);
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow cursor-pointer transition-all text-sm"
                title="Inserir esta peça diretamente no módulo de Vendas Balcão"
              >
                <ShoppingCart className="w-4 h-4" />
                Adicionar a Vendas
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => { onClose(); onEdit(part); }}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center gap-1.5 shadow cursor-pointer transition-all text-sm"
              >
                <Edit3 className="w-4 h-4" />
                Editar Peça
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer transition-all text-sm"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
