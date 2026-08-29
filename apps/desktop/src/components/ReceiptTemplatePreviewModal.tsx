import React from 'react';
import { X, Eye, Check, Printer, FileText } from 'lucide-react';

interface ReceiptTemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'ENTRY' | 'EXIT';
  templateId: string;
}

export const ReceiptTemplatePreviewModal: React.FC<ReceiptTemplatePreviewModalProps> = ({
  isOpen,
  onClose,
  type,
  templateId,
}) => {
  if (!isOpen) return null;

  let savedCompany: any = {};
  try {
    const raw = localStorage.getItem('vollen_company_info') || localStorage.getItem('vollen_company_data');
    if (raw) savedCompany = JSON.parse(raw);
  } catch {}

  const mockCompany = {
    tradingName: savedCompany.tradingName || savedCompany.name || 'VOLLEN REFRIGERAÇÃO & TECNOLOGIA',
    slogan: savedCompany.slogan || 'Assistência Técnica Especializada em Eletrodomésticos & Informática',
    cnpj: savedCompany.cnpj || '28.934.120/0001-85',
    phone: savedCompany.phone || '(11) 3456-7890',
    whatsapp: savedCompany.whatsapp || '(11) 98765-4321',
    email: savedCompany.email || 'contato@vollensistemas.com.br',
    address: savedCompany.address || 'Av. Paulista',
    number: savedCompany.number || '1500',
    neighborhood: savedCompany.neighborhood || 'Bela Vista',
    city: savedCompany.city || 'São Paulo',
    state: savedCompany.state || 'SP',
    cep: savedCompany.cep || '01310-200',
    logoUrl: savedCompany.logoUrl || '',
  };

  const mockOrder = {
    code: '0142',
    entryDate: '27/08/2026',
    exitDate: '27/08/2026',
    client: {
      name: 'Carlos Eduardo Ferreira da Silva',
      phone: '(11) 3322-4455',
      whatsapp: '(11) 99887-1122',
      email: 'carlos.eduardo@email.com',
      address: 'Rua das Flores, 120 - Apto 42B',
      neighborhood: 'Jardim Primavera',
      city: 'São Paulo',
      state: 'SP',
      cep: '04571-000',
      reference: 'Próximo à Padaria Central e ao lado do Supermercado',
    },
    equipment: {
      type: 'Lava e Seca 11kg',
      brand: 'Samsung',
      model: 'WD11M44530W',
      serialNumber: 'BRG-8874102-X90',
      code: 'EQP-0042',
      accessories: 'Mangueira original de entrada de água + Cabo de força com adaptador bipolar',
      observations: 'Gabinete frontal com leve arranhão no canto superior direito. Botão seletor e painel touch íntegros.',
    },
    technician: 'Marcos Silva (Técnico Sênior)',
    attendant: 'Juliana Mendes',
    problemDescription: 'Aparelho não centrifuga e apresenta código de erro 4E no visor digital durante a drenagem. Cliente relata barulho metálico forte.',
    technicalReport: 'Bomba de drenagem travada por resíduo e pressostato de nível descalibrado. Foi realizada a desmontagem, substituição dos componentes danificados e calibração de nível de água.',
    executedService: 'Substituição da eletrobomba de drenagem magnética, troca e calibração do sensor de pressão (pressostato) + higienização completa da cuba e desobstrução das mangueiras.',
    services: [
      { code: 'SRV-01', name: 'Higienização Completa de Dutos e Cuba', qty: 1, price: '120,00' },
      { code: 'SRV-02', name: 'Mão de Obra Especializada em Desmontagem e Reparo', qty: 1, price: '180,00' },
    ],
    parts: [
      { code: 'PEC-88', name: 'Eletrobomba de Drenagem Universal 110V/220V', qty: 1, price: '145,00' },
      { code: 'PEC-12', name: 'Sensor Pressostato Eletrônico Linear', qty: 1, price: '85,00' },
    ],
    travelCost: '30,00',
    discountCost: '10,00',
    totalAmount: '550,00',
    warrantyType: 'Garantia da Loja',
    warrantyPeriod: '90 Dias (3 Meses)',
    warrantyDays: '90',
    paymentMethod: 'PIX / Cartão de Crédito 3x',
    warrantyTerms:
      'A garantia cobre exclusivamente os serviços executados e as peças substituídas descritas nesta Ordem de Serviço pelo prazo de 90 dias a contar da data de entrega. Não cobre avarias decorrentes de quedas, oscilações severas na rede elétrica, intervenções de terceiros não autorizados ou uso em desacordo com as instruções do fabricante.',
    entryTerms:
      'O cliente autoriza a execução da perícia e orçamento técnico no equipamento acima identificado. Equipamentos prontos ou com orçamento recusado que não forem retirados no prazo máximo de 90 dias estarão sujeitos a cobrança de taxa de guarda diária e posterior destinação legal conforme art. 1.275 do Código Civil Brasileiro.',
  };

  // Renderizador do Comprovante de Entrada
  const renderEntryReceipt = () => {
    switch (templateId) {
      case 'MINIMAL_1VIA':
        return (
          <div className="bg-white border-2 border-slate-800 rounded-xl p-5 space-y-3 text-slate-900 font-sans text-xs">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                {mockCompany.logoUrl ? (
                  <img src={mockCompany.logoUrl} alt="Logo" className="h-11 w-auto object-contain max-w-[90px]" />
                ) : (
                  <div className="w-11 h-11 bg-slate-100 border border-slate-400 rounded-lg flex items-center justify-center font-bold text-slate-700 text-xs">
                    LOGO
                  </div>
                )}
                <div>
                  <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">{mockCompany.tradingName}</h1>
                  <p className="text-[10px] text-slate-600 font-medium">{mockCompany.slogan}</p>
                  <p className="text-[9px] text-slate-500">CNPJ: {mockCompany.cnpj} • Tel: {mockCompany.phone} | Whats: {mockCompany.whatsapp}</p>
                  <p className="text-[8.5px] text-slate-500">{mockCompany.address}, {mockCompany.number} - {mockCompany.neighborhood}, {mockCompany.city}-{mockCompany.state}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black uppercase text-sky-900 bg-sky-100 px-2 py-0.5 rounded border border-sky-300">
                  COMPROVANTE DE ENTRADA (1 VIA)
                </span>
                <div className="text-lg font-black font-mono text-slate-950 mt-0.5">OS #{mockOrder.code}</div>
                <div className="text-[9.5px] font-bold text-slate-700">Entrada: {mockOrder.entryDate}</div>
              </div>
            </div>

            {/* Grid Cliente & Equipamento */}
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300 space-y-1">
                <span className="font-black text-slate-900 uppercase text-[9px] block border-b border-slate-200 pb-0.5">DADOS DO CLIENTE</span>
                <p><strong>Nome:</strong> {mockOrder.client.name}</p>
                <p><strong>Telefone:</strong> {mockOrder.client.phone} | <strong>Whats:</strong> {mockOrder.client.whatsapp}</p>
                <p><strong>Endereço:</strong> {mockOrder.client.address} - {mockOrder.client.neighborhood}, {mockOrder.client.city}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300 space-y-1">
                <span className="font-black text-slate-900 uppercase text-[9px] block border-b border-slate-200 pb-0.5">DADOS DO EQUIPAMENTO</span>
                <p><strong>Tipo/Aparelho:</strong> {mockOrder.equipment.type} - {mockOrder.equipment.brand}</p>
                <p><strong>Modelo:</strong> {mockOrder.equipment.model}</p>
                <p><strong>Nº Série:</strong> {mockOrder.equipment.serialNumber}</p>
                <p><strong>Modalidade:</strong> {mockOrder.warrantyType}</p>
              </div>
            </div>

            {/* Responsáveis */}
            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div className="bg-sky-50/70 p-2 rounded-lg border border-sky-200">
                <span className="font-bold text-sky-950 uppercase text-[8.5px] block border-b border-sky-200 pb-0.5 mb-0.5">Atendente:</span>
                <span className="font-semibold text-slate-800">{mockOrder.attendant}</span>
              </div>
              <div className="bg-indigo-50/70 p-2 rounded-lg border border-indigo-200">
                <span className="font-bold text-indigo-950 uppercase text-[8.5px] block border-b border-indigo-200 pb-0.5 mb-0.5">Técnico Responsável:</span>
                <span className="font-semibold text-slate-800">{mockOrder.technician}</span>
              </div>
            </div>

            {/* Dados da Nota Fiscal (Exemplo) */}
            <div className="bg-amber-50/80 p-2 rounded-lg border border-amber-300 text-[9.5px] space-y-0.5">
              <p className="font-extrabold text-amber-950 uppercase border-b border-amber-200 pb-0.5 text-[8px]">
                📄 Dados da Nota Fiscal (Garantia de Fábrica) • Aut: 884210
              </p>
              <div className="grid grid-cols-2 gap-2">
                <p><strong>Nº NF:</strong> 004.892</p>
                <p><strong>Data de Compra:</strong> 15/02/2026</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <p><strong>Revenda:</strong> Magazine Luiza S/A</p>
                <p><strong>CNPJ:</strong> 47.960.950/0001-21</p>
              </div>
            </div>

            {/* Relatos (3 linhas) */}
            <div className="space-y-1.5 text-[10.5px]">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-300">
                <span className="font-black text-slate-900 uppercase text-[8.5px] block border-b border-slate-200 pb-0.5 mb-0.5">Defeito Reclamado:</span>
                <div className="leading-snug text-slate-800 line-clamp-3">{mockOrder.problemDescription}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-300">
                <span className="font-black text-slate-900 uppercase text-[8.5px] block border-b border-slate-200 pb-0.5 mb-0.5">Diagnóstico / Laudo Preliminar:</span>
                <div className="leading-snug text-slate-800 line-clamp-3">{mockOrder.technicalReport}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-300">
                <span className="font-black text-slate-900 uppercase text-[8.5px] block border-b border-slate-200 pb-0.5 mb-0.5">Observações do Equipamento:</span>
                <div className="leading-snug text-slate-800 line-clamp-3">{mockOrder.equipment.observations}</div>
              </div>
            </div>

            <p className="text-[8px] text-slate-500 leading-tight">
              * {mockOrder.entryTerms}
            </p>

            <div className="grid grid-cols-2 gap-8 pt-4 text-center text-[10px]">
              <div><div className="border-b border-slate-600 w-3/4 mx-auto mb-1"></div><p className="font-bold">Assinatura da Empresa</p></div>
              <div><div className="border-b border-slate-600 w-3/4 mx-auto mb-1"></div><p className="font-bold">Assinatura do Cliente</p></div>
            </div>
          </div>
        );

      case 'THERMAL_80MM':
        return (
          <div className="max-w-[290px] mx-auto font-mono text-[10.5px] text-black bg-white p-3 space-y-2 border border-slate-300">
            <div className="text-center border-b border-dashed border-black pb-2">
              <div className="font-bold uppercase text-xs">{mockCompany.tradingName}</div>
              <div className="text-[9px]">{mockCompany.cnpj} • {mockCompany.phone}</div>
              <div className="mt-1 font-bold border border-black inline-block px-2 py-0.5 text-xs">
                ENTRADA OS #{mockOrder.code}
              </div>
            </div>
            <div className="border-b border-dashed border-black pb-2 space-y-0.5 text-[10px]">
              <p><strong>Entrada:</strong> {mockOrder.entryDate}</p>
              <p><strong>Cliente:</strong> {mockOrder.client.name}</p>
              <p><strong>Fone:</strong> {mockOrder.client.phone}</p>
              <p><strong>Atendente:</strong> {mockOrder.attendant}</p>
              <p><strong>Aparelho:</strong> {mockOrder.equipment.type} {mockOrder.equipment.brand}</p>
              <p><strong>Modelo:</strong> {mockOrder.equipment.model}</p>
              <p><strong>Série:</strong> {mockOrder.equipment.serialNumber}</p>
              <p><strong>Técnico:</strong> {mockOrder.technician}</p>
            </div>
            <div className="border-b border-dashed border-black pb-2 text-[10px]">
              <p className="font-bold">Defeito Relatado:</p>
              <p>{mockOrder.problemDescription}</p>
            </div>
            <div className="border-b border-dashed border-black pb-2 text-[8px] text-justify">
              * {mockOrder.entryTerms}
            </div>
            <div className="text-center pt-3 text-[9px]">
              <div className="border-b border-black w-4/5 mx-auto mb-1"></div>
              <p className="font-bold">Assinatura do Cliente</p>
            </div>
          </div>
        );

      case 'COMPACT_1VIA':
        return (
          <div className="bg-white border border-slate-300 rounded-xl p-4 space-y-2 text-slate-800 text-[10.5px]">
            <div className="flex justify-between items-center border-b pb-2 border-slate-200">
              <div>
                <h3 className="font-black text-xs uppercase">{mockCompany.tradingName}</h3>
                <p className="text-[9px] text-slate-500">Tel: {mockCompany.phone}</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-[9px] bg-slate-100 px-1.5 py-0.5 rounded">1 VIA ECONÔMICA</span>
                <p className="font-black font-mono text-xs">OS #{mockOrder.code}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div><strong>Cliente:</strong> {mockOrder.client.name}</div>
              <div><strong>Equipamento:</strong> {mockOrder.equipment.type} {mockOrder.equipment.brand}</div>
              <div><strong>Atendente:</strong> {mockOrder.attendant}</div>
              <div><strong>Técnico:</strong> {mockOrder.technician}</div>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[10px]">
              <strong>Defeito:</strong> {mockOrder.problemDescription}
            </div>
            <p className="text-[8px] text-slate-500 leading-tight">* {mockOrder.entryTerms}</p>
          </div>
        );

      case 'MODERN_BOXES':
        return (
          <div className="bg-slate-50 border-2 border-sky-800 rounded-xl p-4 space-y-3 text-slate-800 text-[10.5px]">
            <div className="bg-sky-800 text-white p-2.5 rounded-lg flex justify-between items-center">
              <div>
                <h3 className="font-black text-xs uppercase">{mockCompany.tradingName}</h3>
                <p className="text-[9px] text-sky-200">CNPJ: {mockCompany.cnpj}</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded font-bold">MODERNO EM BLOCOS</span>
                <p className="font-black text-xs">OS #{mockOrder.code}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <p className="font-bold text-sky-900 border-b pb-0.5 mb-1 text-[9px]">CLIENTE</p>
                <p>{mockOrder.client.name}</p>
                <p className="text-[9px] text-slate-500">{mockOrder.client.phone}</p>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <p className="font-bold text-sky-900 border-b pb-0.5 mb-1 text-[9px]">APARELHO</p>
                <p>{mockOrder.equipment.type} {mockOrder.equipment.brand}</p>
                <p className="text-[9px] text-slate-500">{mockOrder.equipment.serialNumber}</p>
              </div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <p className="font-bold text-slate-700 text-[9px]">PROBLEMA INFORMADO</p>
              <p>{mockOrder.problemDescription}</p>
            </div>
            <p className="text-[8px] text-slate-500">* {mockOrder.entryTerms}</p>
          </div>
        );

      case 'MINIMAL_BORDER':
        return (
          <div className="bg-white border-4 border-double border-slate-900 p-4 space-y-2 text-slate-900 text-[10.5px]">
            <div className="text-center border-b-2 border-slate-900 pb-2">
              <h2 className="font-black text-sm uppercase">{mockCompany.tradingName}</h2>
              <p className="text-[9px]">{mockCompany.slogan}</p>
              <div className="text-xs font-bold font-mono mt-1">COMPROVANTE DE ENTRADA • OS #{mockOrder.code}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] py-1 border-b border-slate-300">
              <p><strong>Cliente:</strong> {mockOrder.client.name}</p>
              <p><strong>Telefone:</strong> {mockOrder.client.phone}</p>
              <p><strong>Equipamento:</strong> {mockOrder.equipment.type} {mockOrder.equipment.brand}</p>
              <p><strong>Técnico:</strong> {mockOrder.technician}</p>
            </div>
            <div className="text-[10px]">
              <p><strong>Defeito Relatado:</strong> {mockOrder.problemDescription}</p>
            </div>
            <p className="text-[8px] text-justify pt-1 leading-tight">* {mockOrder.entryTerms}</p>
          </div>
        );

      case 'DEFAULT_2VIAS':
      default:
        return (
          <div className="flex flex-col space-y-3 text-slate-900 font-sans text-xs">
            {[1, 2].map((via) => (
              <div key={via} className="border-2 border-slate-800 p-3 rounded-xl space-y-2 bg-white text-[10px]">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-2.5">
                    {mockCompany.logoUrl ? (
                      <img src={mockCompany.logoUrl} alt="Logo" className="h-9 w-auto object-contain max-w-[80px]" />
                    ) : (
                      <div className="w-9 h-9 bg-slate-100 border border-slate-400 rounded-lg flex items-center justify-center font-bold text-slate-700 text-[9px]">
                        LOGO
                      </div>
                    )}
                    <div>
                      <h1 className="text-xs font-black text-slate-900 uppercase">{mockCompany.tradingName}</h1>
                      <p className="text-[8px] text-slate-600 font-medium">{mockCompany.slogan}</p>
                      <p className="text-[7.5px] text-slate-500">CNPJ: {mockCompany.cnpj} • Tel: {mockCompany.phone} | Whats: {mockCompany.whatsapp}</p>
                    </div>
                  </div>
                  <div className="text-right border border-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">
                    <div className="text-[8px] font-black uppercase text-slate-900">
                      COMPROVANTE ({via}ª VIA - {via === 1 ? 'EMPRESA' : 'CLIENTE'})
                    </div>
                    <div className="text-sm font-black font-mono text-slate-900">OS #{mockOrder.code}</div>
                    <div className="text-[7.5px] font-bold text-slate-700">Entrada: {mockOrder.entryDate}</div>
                  </div>
                </div>

                {/* Cliente & Equipamento */}
                <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-300 space-y-0.5">
                    <p className="font-black text-slate-900 uppercase border-b border-slate-200 pb-0.5 text-[8px]">Cliente</p>
                    <p><strong>Nome:</strong> {mockOrder.client.name}</p>
                    <p><strong>Telefone:</strong> {mockOrder.client.phone} | Whats: {mockOrder.client.whatsapp}</p>
                    <p><strong>Endereço:</strong> {mockOrder.client.address}</p>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-300 space-y-0.5">
                    <p className="font-black text-slate-900 uppercase border-b border-slate-200 pb-0.5 text-[8px]">Equipamento</p>
                    <p><strong>Aparelho:</strong> {mockOrder.equipment.type} {mockOrder.equipment.brand}</p>
                    <p><strong>Modelo:</strong> {mockOrder.equipment.model}</p>
                    <p><strong>Nº Série:</strong> {mockOrder.equipment.serialNumber}</p>
                    <p><strong>Modalidade:</strong> {mockOrder.warrantyType}</p>
                  </div>
                </div>

                {/* Atendente e Técnico */}
                <div className="grid grid-cols-2 gap-2 text-[9px]">
                  <div className="bg-sky-50/60 p-1 rounded-lg border border-sky-200">
                    <span className="font-bold text-sky-950 uppercase text-[7.5px] block">Atendente Responsável:</span>
                    <span className="text-slate-800 font-semibold">{mockOrder.attendant}</span>
                  </div>
                  <div className="bg-indigo-50/60 p-1 rounded-lg border border-indigo-200">
                    <span className="font-bold text-indigo-950 uppercase text-[7.5px] block">Técnico Responsável:</span>
                    <span className="text-slate-800 font-semibold">{mockOrder.technician}</span>
                  </div>
                </div>

                {/* Dados da Nota Fiscal (Exemplo no 2 Vias) */}
                <div className="bg-amber-50/80 p-1.5 rounded-lg border border-amber-300 text-[8.5px] space-y-0.5">
                  <p className="font-extrabold text-amber-950 uppercase border-b border-amber-200 pb-0.5 text-[7.5px]">
                    📄 Dados da Nota Fiscal (Garantia de Fábrica) • Aut: 884210
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <p><strong>Nº NF:</strong> 004.892</p>
                    <p><strong>Data de Compra:</strong> 15/02/2026</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <p><strong>Revenda:</strong> Magazine Luiza S/A</p>
                    <p><strong>CNPJ:</strong> 47.960.950/0001-21</p>
                  </div>
                </div>

                {/* Defeito, Laudo e Observações (3 linhas) */}
                <div className="space-y-1.5 text-[9.5px]">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-300">
                    <span className="font-extrabold text-slate-900 uppercase text-[8px] block border-b border-slate-200 pb-0.5 mb-1">Defeito Reclamado:</span>
                    <div className="leading-relaxed text-slate-800 line-clamp-3 min-h-[3.4em]">{mockOrder.problemDescription}</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-300">
                    <span className="font-extrabold text-slate-900 uppercase text-[8px] block border-b border-slate-200 pb-0.5 mb-1">Laudo Técnico / Diagnóstico:</span>
                    <div className="leading-relaxed text-slate-800 line-clamp-3 min-h-[3.4em]">{mockOrder.technicalReport}</div>
                  </div>
                </div>

                <div className="text-[7.5px] text-slate-600 border-t border-slate-200 pt-1 leading-normal">
                  * {mockOrder.entryTerms}
                </div>

                {/* Assinaturas */}
                <div className="grid grid-cols-2 gap-6 pt-3 pb-1 text-center text-[8.5px]">
                  <div><div className="border-b border-slate-600 w-4/5 mx-auto mb-1"></div><p className="font-bold text-slate-800">Assinatura da Empresa</p></div>
                  <div><div className="border-b border-slate-600 w-4/5 mx-auto mb-1"></div><p className="font-bold text-slate-800">Assinatura do Cliente</p></div>
                </div>
              </div>
            ))}
          </div>
        );
    }
  };

  // Renderizador do Comprovante de Saída
  const renderExitReceipt = () => {
    switch (templateId) {
      case 'THERMAL_80MM':
        return (
          <div className="max-w-[300px] mx-auto bg-white p-3 border border-slate-400 font-mono text-[11px] text-slate-900 rounded-lg shadow-sm">
            <div className="text-center border-b border-dashed border-slate-400 pb-2 mb-2">
              {mockCompany.logoUrl && (
                <img src={mockCompany.logoUrl} alt="Logo" className="h-8 w-auto mx-auto mb-1 object-contain" />
              )}
              <h2 className="font-bold uppercase text-xs">{mockCompany.tradingName}</h2>
              <p className="text-[8.5px]">CNPJ: {mockCompany.cnpj} • Tel: {mockCompany.phone}</p>
              <div className="mt-1 font-bold text-xs border border-slate-900 px-2 py-0.5 inline-block">
                COMPROVANTE SAÍDA #{mockOrder.code}
              </div>
            </div>
            <div className="border-b border-dashed border-slate-400 pb-2 mb-2 space-y-0.5">
              <p><strong>Saída:</strong> {mockOrder.exitDate}</p>
              <p><strong>Cliente:</strong> {mockOrder.client.name}</p>
              <p><strong>Atendente:</strong> {mockOrder.attendant}</p>
              <p><strong>Aparelho:</strong> {mockOrder.equipment.type} {mockOrder.equipment.brand}</p>
              <p><strong>Modelo:</strong> {mockOrder.equipment.model}</p>
              <p><strong>Técnico:</strong> {mockOrder.technician}</p>
              <p><strong>Serviço:</strong> {mockOrder.executedService}</p>
            </div>
            {mockOrder.warrantyType !== 'Garantia de Fábrica' && (
              <div className="border-b border-dashed border-slate-400 pb-2 mb-2 flex justify-between font-bold text-xs">
                <span>TOTAL PAGO:</span>
                <span>R$ {mockOrder.totalAmount}</span>
              </div>
            )}
            <p className="text-[8.5px] text-justify mb-2 leading-tight">
              * {mockOrder.warrantyTerms}
            </p>
            <div className="text-center pt-2">
              <div className="border-b border-slate-900 w-3/4 mx-auto mb-1"></div>
              <p className="text-[9px] font-bold">Responsável Técnico</p>
            </div>
          </div>
        );

      case 'MINIMAL_1VIA':
        return (
          <div className="bg-white border-2 border-slate-800 rounded-xl p-5 space-y-3 text-slate-900 font-sans text-xs">
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                {mockCompany.logoUrl && (
                  <img src={mockCompany.logoUrl} alt="Logo" className="h-11 w-auto max-w-[90px] object-contain shrink-0" />
                )}
                <div>
                  <span className="text-[9px] bg-slate-900 text-white px-2 py-0.5 font-bold uppercase rounded">Comprovante de Saída</span>
                  <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight mt-0.5">{mockCompany.tradingName}</h1>
                  <p className="text-[9.5px] text-slate-600 font-medium">{mockCompany.slogan}</p>
                  <p className="text-[9px] text-slate-500">CNPJ: {mockCompany.cnpj} • Tel: {mockCompany.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black font-mono text-slate-950">OS #{mockOrder.code}</div>
                <div className="text-[9.5px] font-bold text-slate-700">Saída: {mockOrder.exitDate}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300 space-y-1">
                <span className="font-black text-slate-900 uppercase text-[9px] block border-b border-slate-200 pb-0.5">DADOS DO CLIENTE</span>
                <p><strong>Nome:</strong> {mockOrder.client.name}</p>
                <p><strong>Telefone:</strong> {mockOrder.client.phone}</p>
                <p><strong>Endereço:</strong> {mockOrder.client.address}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300 space-y-1">
                <span className="font-black text-slate-900 uppercase text-[9px] block border-b border-slate-200 pb-0.5">DADOS DO EQUIPAMENTO</span>
                <p><strong>Tipo/Aparelho:</strong> {mockOrder.equipment.type} - {mockOrder.equipment.brand}</p>
                <p><strong>Modelo:</strong> {mockOrder.equipment.model}</p>
                <p><strong>Nº Série:</strong> {mockOrder.equipment.serialNumber}</p>
                <p><strong>Modalidade:</strong> {mockOrder.warrantyType}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div className="bg-sky-50/70 p-2 rounded-lg border border-sky-200">
                <span className="font-bold text-sky-950 uppercase text-[8.5px] block border-b border-sky-200 pb-0.5 mb-0.5">Atendente:</span>
                <span className="font-semibold text-slate-800">{mockOrder.attendant}</span>
              </div>
              <div className="bg-indigo-50/70 p-2 rounded-lg border border-indigo-200">
                <span className="font-bold text-indigo-950 uppercase text-[8.5px] block border-b border-indigo-200 pb-0.5 mb-0.5">Técnico Responsável:</span>
                <span className="font-semibold text-slate-800">{mockOrder.technician}</span>
              </div>
            </div>

            <div className="space-y-1.5 text-[10.5px]">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-300">
                <span className="font-black text-slate-900 uppercase text-[8.5px] block border-b border-slate-200 pb-0.5 mb-0.5">Defeito Reclamado:</span>
                <div className="leading-snug text-slate-800 line-clamp-3 min-h-[3.2em]">{mockOrder.problemDescription}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-300">
                <span className="font-black text-slate-900 uppercase text-[8.5px] block border-b border-slate-200 pb-0.5 mb-0.5">Diagnóstico / Laudo Técnico:</span>
                <div className="leading-snug text-slate-800 line-clamp-3 min-h-[3.2em]">{mockOrder.technicalReport}</div>
              </div>
              <div className="bg-emerald-50/80 p-2 rounded-lg border border-emerald-200 text-emerald-950">
                <span className="font-black text-emerald-950 uppercase text-[8.5px] block border-b border-emerald-200 pb-0.5 mb-0.5">Serviço Executado:</span>
                <div className="leading-snug font-bold line-clamp-3 min-h-[3.2em]">{mockOrder.executedService}</div>
              </div>
            </div>

            {mockOrder.warrantyType !== 'Garantia de Fábrica' && (
              <div className="border border-slate-300 p-2.5 rounded-lg bg-slate-50 text-xs">
                <div className="flex justify-between items-center text-sm font-black text-slate-900">
                  <span>VALOR TOTAL DA OS:</span>
                  <span className="text-base font-black font-mono">R$ {mockOrder.totalAmount}</span>
                </div>
                <div className="text-[10.5px] text-slate-600 pt-1 border-t border-slate-200 mt-1">
                  Forma de Pagamento: <strong>PIX</strong>
                </div>
              </div>
            )}

            <div className="border border-slate-300 p-2.5 rounded-lg bg-slate-50 text-[10px] space-y-1">
              <div className="flex justify-between font-bold border-b border-slate-200 pb-0.5">
                <span>Termo de Garantia: {mockOrder.warrantyPeriod}</span>
                <span>Entrega: {mockOrder.exitDate}</span>
              </div>
              <p className="text-slate-600 leading-tight">* {mockOrder.warrantyTerms}</p>
            </div>

            <div className="pt-4 text-center text-xs">
              <div className="max-w-xs mx-auto">
                <div className="border-b border-slate-400 mb-1 w-full mx-auto"></div>
                <p className="font-bold text-slate-800">Assinatura da Empresa / Técnico</p>
                <p className="text-[10px] text-slate-500">{mockCompany.tradingName}</p>
              </div>
            </div>
          </div>
        );

      case 'EXECUTIVE_REPORT':
        return (
          <div className="border-2 border-teal-700 rounded-2xl p-6 space-y-4 bg-white text-xs">
            <div className="bg-teal-700 text-white p-4 -m-6 mb-3 flex justify-between items-center rounded-t-2xl">
              <div className="flex items-center gap-3">
                {mockCompany.logoUrl ? (
                  <img src={mockCompany.logoUrl} alt="Logo" className="h-10 w-auto object-contain max-w-[80px]" />
                ) : (
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold text-white text-xs">
                    LOGO
                  </div>
                )}
                <div>
                  <h1 className="text-base font-black uppercase tracking-tight">{mockCompany.tradingName}</h1>
                  <p className="text-[10.5px] text-teal-100">{mockCompany.slogan}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded font-bold uppercase">FINALIZADA</span>
                <div className="text-xl font-black font-mono">OS #{mockOrder.code}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[11px] pt-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold uppercase text-[10px] text-slate-800 border-b pb-0.5">Cliente</p>
                <p><strong>Nome:</strong> {mockOrder.client.name}</p>
                <p><strong>Telefone:</strong> {mockOrder.client.phone}</p>
                <p><strong>Atendente:</strong> {mockOrder.attendant}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold uppercase text-[10px] text-slate-800 border-b pb-0.5">Equipamento</p>
                <p><strong>Aparelho:</strong> {mockOrder.equipment.type} {mockOrder.equipment.brand}</p>
                <p><strong>Data de Entrega:</strong> {mockOrder.exitDate}</p>
                <p><strong>Técnico:</strong> {mockOrder.technician}</p>
              </div>
            </div>

            <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-200 text-[11px] space-y-1">
              <p><strong>Defeito:</strong> {mockOrder.problemDescription}</p>
              <p><strong>Serviço Realizado:</strong> {mockOrder.executedService}</p>
              <p className="text-teal-950 font-bold"><strong>Modalidade:</strong> {mockOrder.warrantyType} • <strong>Garantia:</strong> {mockOrder.warrantyPeriod}</p>
            </div>

            {mockOrder.warrantyType !== 'Garantia de Fábrica' && (
              <div className="flex justify-between items-center p-3 bg-slate-900 text-white rounded-xl font-bold font-mono text-sm">
                <span>VALOR TOTAL QUITADO:</span>
                <span className="text-teal-400 text-base">R$ {mockOrder.totalAmount}</span>
              </div>
            )}

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[9px] text-slate-600">
              <strong>Termos e Garantia:</strong> {mockOrder.warrantyTerms}
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4 text-center text-xs">
              <div><div className="border-b border-slate-400 mb-1 w-3/4 mx-auto"></div><p className="font-bold">Responsável Técnico</p></div>
              <div><div className="border-b border-slate-400 mb-1 w-3/4 mx-auto"></div><p className="font-bold">Assinatura do Cliente</p></div>
            </div>
          </div>
        );

      default:
        // MODERN_DETAILED (Executivo / Técnico Moderno A4)
        return (
          <div className="bg-white border-2 border-slate-800 rounded-xl p-5 space-y-3 text-slate-900 font-sans text-xs">
            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3">
              <div className="flex items-center gap-3">
                {mockCompany.logoUrl && (
                  <img src={mockCompany.logoUrl} alt="Logo" className="h-12 w-auto object-contain max-w-[90px] shrink-0" />
                )}
                <div>
                  <span className="text-[9px] bg-slate-900 text-white px-2 py-0.5 font-bold uppercase rounded tracking-wider">
                    Comprovante de Saída
                  </span>
                  <h1 className="text-base font-black text-slate-900 uppercase tracking-tight mt-0.5">
                    {mockCompany.tradingName}
                  </h1>
                  <p className="text-[10px] text-slate-600 font-medium">{mockCompany.slogan}</p>
                  <p className="text-[9px] text-slate-500">
                    CNPJ: {mockCompany.cnpj} • Tel: {mockCompany.phone}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black font-mono text-slate-900">
                  OS #{mockOrder.code}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  Saída: {mockOrder.exitDate}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="border border-slate-300 p-2.5 rounded-xl bg-slate-50 space-y-0.5">
                <h3 className="font-black text-slate-900 uppercase text-[9px] border-b border-slate-200 pb-0.5 mb-1">
                  Dados do Cliente
                </h3>
                <p><strong>Nome:</strong> {mockOrder.client.name}</p>
                <p><strong>Telefone:</strong> {mockOrder.client.phone}</p>
                <p><strong>Endereço:</strong> {mockOrder.client.address}</p>
              </div>
              <div className="border border-slate-300 p-2.5 rounded-xl bg-slate-50 space-y-0.5">
                <h3 className="font-black text-slate-900 uppercase text-[9px] border-b border-slate-200 pb-0.5 mb-1">
                  Dados do Equipamento
                </h3>
                <p><strong>Tipo/Aparelho:</strong> {mockOrder.equipment.type} - {mockOrder.equipment.brand}</p>
                <p><strong>Modelo:</strong> {mockOrder.equipment.model}</p>
                <p><strong>Nº de Série:</strong> {mockOrder.equipment.serialNumber}</p>
                <p><strong>Modalidade:</strong> {mockOrder.warrantyType}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[10.5px]">
              <div className="border border-sky-200 bg-sky-50/60 p-2 rounded-xl">
                <span className="font-bold text-sky-900 uppercase text-[8.5px] block border-b border-sky-200 pb-0.5 mb-0.5">Atendente Responsável</span>
                <p className="font-semibold text-slate-800">{mockOrder.attendant}</p>
              </div>
              <div className="border border-indigo-200 bg-indigo-50/60 p-2 rounded-xl">
                <span className="font-bold text-indigo-900 uppercase text-[8.5px] block border-b border-indigo-200 pb-0.5 mb-0.5">Técnico Responsável</span>
                <p className="font-semibold text-slate-800">{mockOrder.technician}</p>
              </div>
            </div>

            <div className="space-y-1.5 text-[10.5px]">
              <div className="border border-slate-300 p-2 rounded-lg bg-slate-50">
                <span className="font-black text-slate-900 uppercase text-[8.5px] block border-b border-slate-200 pb-0.5 mb-0.5">Defeito / Problema Relatado:</span>
                <div className="leading-snug text-slate-800 line-clamp-3 min-h-[3.2em]">{mockOrder.problemDescription}</div>
              </div>
              <div className="border border-slate-300 p-2 rounded-lg bg-slate-50">
                <span className="font-black text-slate-900 uppercase text-[8.5px] block border-b border-slate-200 pb-0.5 mb-0.5">Diagnóstico / Laudo Técnico:</span>
                <div className="leading-snug text-slate-800 line-clamp-3 min-h-[3.2em]">{mockOrder.technicalReport}</div>
              </div>
              <div className="bg-emerald-50/80 p-2 rounded-lg border border-emerald-200 text-emerald-950">
                <span className="font-black text-emerald-950 uppercase text-[8.5px] block border-b border-emerald-200 pb-0.5 mb-0.5">Serviço Executado / Realizado:</span>
                <div className="leading-snug font-bold line-clamp-3 min-h-[3.2em]">{mockOrder.executedService}</div>
              </div>
            </div>

            {mockOrder.warrantyType !== 'Garantia de Fábrica' && (
              <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                <div className="p-2.5 space-y-1 bg-slate-50">
                  <div className="flex justify-between items-center text-sm font-black text-slate-900">
                    <span>VALOR TOTAL DA OS:</span>
                    <span className="text-base font-black font-mono">R$ {mockOrder.totalAmount}</span>
                  </div>
                  <div className="text-[10.5px] text-slate-600 flex justify-between pt-1 border-t border-slate-200">
                    <span>Forma de Pagamento: <strong>PIX</strong></span>
                  </div>
                </div>
              </div>
            )}

            <div className="border border-slate-300 p-2.5 rounded-xl text-xs bg-slate-50 space-y-1">
              <h3 className="font-bold text-slate-900 uppercase text-[9.5px] border-b border-slate-200 pb-0.5">
                Termo de Garantia e Entrega
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                <p><strong>Data de Entrada:</strong> 25/08/2026</p>
                <p><strong>Data de Saída / Entrega:</strong> {mockOrder.exitDate}</p>
                <p><strong>Modalidade de Garantia:</strong> {mockOrder.warrantyType}</p>
                <p><strong>Prazo de Cobertura:</strong> {mockOrder.warrantyPeriod}</p>
              </div>
              <p className="text-[9px] text-slate-600 pt-1 leading-tight border-t border-slate-200">
                * {mockOrder.warrantyTerms}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-300 text-center text-xs">
              <div className="max-w-xs mx-auto">
                <div className="border-b border-slate-400 mb-1 w-full mx-auto"></div>
                <p className="font-bold text-slate-800">Assinatura da Empresa / Técnico</p>
                <p className="text-[10px] text-slate-500">{mockCompany.tradingName}</p>
              </div>
            </div>
          </div>
        );
    }
  };

  const getTemplateTitle = () => {
    if (type === 'ENTRY') {
      const titles: Record<string, string> = {
        DEFAULT_2VIAS: 'Padrão 2 Vias Compacto A4',
        LINE_CLEAN_2VIAS: '2 Vias Linhas Limpas (Sem Caixas)',
        LINE_CLEAN_MODERN_2VIAS: '2 Vias Minimal Blue',
        LINE_CLEAN_BOLD_2VIAS: '2 Vias Bold Corporativo',
        LINE_CLEAN_ACCENT_2VIAS: '2 Vias Grid / Tags',
        EDITORIAL_MINIMAL_2VIAS: '2 Vias Editorial',
        COMPACT_LINES_2VIAS: '2 Vias Pontilhadas Compactas',
        COMPACT_1VIA: '1 Via Econômica (Folha Única)',
        MODERN_BOXES: 'Moderno em Blocos',
        MINIMAL_BORDER: 'Minimalista Borda Dupla',
        THERMAL_80MM: 'Cupom Térmico 80mm',
      };
      return titles[templateId] || templateId;
    } else {
      const titles: Record<string, string> = {
        MODERN_DETAILED: 'Moderno Detalhado (Padrão)',
        CLASSIC_BORDER: 'Clássico Formal com Bordas',
        COMPACT_CLEAN: 'Compacto Clean',
        CERTIFICATE_STYLE: 'Certificado Oficial de Garantia',
        EXECUTIVE_REPORT: 'Relatório Executivo de Conclusão',
        THERMAL_80MM: 'Cupom Térmico 80mm',
      };
      return titles[templateId] || templateId;
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 select-none font-sans"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[95vh] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-4 py-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-sky-500/20 p-2 rounded-lg border border-sky-400/30">
              <Eye className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight text-white flex items-center gap-2">
                Pré-visualização: {type === 'ENTRY' ? 'Comprovante de Entrada' : 'Comprovante de Saída'}
                <span className="text-[11px] font-normal bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded-md font-mono">
                  {templateId === 'THERMAL_80MM' ? 'Bobina Térmica 80mm' : 'Tamanho Folha A4 (210mm × 297mm)'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Layout Selecionado: <strong className="text-sky-300">{getTemplateTitle()}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
            title="Fechar Visualizador"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Scrollable Body - Renderizado no formato exato de folha A4 */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-slate-950/90 flex justify-center items-start">
          <div
            className={`w-full bg-white shadow-2xl border border-slate-300 transition-all ${
              templateId === 'THERMAL_80MM'
                ? 'max-w-[340px] p-4 rounded-xl'
                : 'max-w-[794px] min-h-[1123px] p-8 rounded-sm'
            }`}
            style={{
              aspectRatio: templateId === 'THERMAL_80MM' ? 'auto' : '1 / 1.414',
            }}
          >
            {type === 'ENTRY' ? renderEntryReceipt() : renderExitReceipt()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-sky-400" /> Exemplo completo com 100% dos dados preenchidos na proporção real da folha A4.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" /> Concluir Visualização
          </button>
        </div>
      </div>
    </div>
  );
};
