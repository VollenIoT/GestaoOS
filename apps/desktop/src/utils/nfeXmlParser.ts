/**
 * Utilitário de Leitura e Parsing de arquivos XML de NF-e (Nota Fiscal Eletrônica - SEFAZ)
 * Suporta modelos 55 (NF-e) e 65 (NFC-e)
 */

export interface NfeParsedProduct {
  code: string;           // cProd
  barcode?: string;       // cEAN
  name: string;           // xProd
  ncm?: string;           // NCM
  cfop?: string;          // CFOP
  unit: string;           // uCom (UN, PC, KG, etc)
  quantity: number;       // qCom
  unitCost: number;       // vUnCom
  totalCost: number;      // vProd
  freightCost?: number;   // vFrete rateado
  otherCosts?: number;    // vOutro rateado
  discount?: number;      // vDesc rateado
  finalUnitCost: number;  // Custo unitário efetivo (com frete/outros rateados)
}

export interface NfeParsedData {
  accessKey?: string;     // Chave de Acesso da NF-e (44 dígitos)
  number: string;         // nNF
  series: string;         // serie
  issueDate: string;      // dhEmi ou dEmi
  supplier: {
    cnpj: string;         // CNPJ
    name: string;         // xNome
    tradeName?: string;   // xFant
    ie?: string;          // IE
    phone?: string;       // fone
    address: {
      street?: string;    // xLgr
      number?: string;    // nro
      neighborhood?: string; // xBairro
      city?: string;      // xMun
      state?: string;     // UF
      zipCode?: string;   // CEP
    };
  };
  totalProducts: number;  // vProd total
  totalNF: number;        // vNF total
  products: NfeParsedProduct[];
}

export function parseNfeXml(xmlString: string): NfeParsedData {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Verifica erros de parsing do XML
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('O arquivo XML fornecido está corrompido ou não é um XML válido.');
  }

  // Verifica se é uma NF-e / NFC-e válida
  const infNFe = xmlDoc.querySelector('infNFe');
  if (!infNFe) {
    throw new Error('O arquivo selecionado não é uma Nota Fiscal Eletrônica (tag <infNFe> não encontrada).');
  }

  // Chave de Acesso
  const rawId = infNFe.getAttribute('Id') || '';
  const accessKey = rawId.replace(/\D/g, '');

  // Dados de Identificação da Nota
  const ide = infNFe.querySelector('ide');
  const number = ide?.querySelector('nNF')?.textContent?.trim() || '';
  const series = ide?.querySelector('serie')?.textContent?.trim() || '';
  const issueDate = ide?.querySelector('dhEmi')?.textContent?.trim() || ide?.querySelector('dEmi')?.textContent?.trim() || '';

  // Dados do Emitente (Fornecedor)
  const emit = infNFe.querySelector('emit');
  const cnpj = emit?.querySelector('CNPJ')?.textContent?.trim() || emit?.querySelector('CPF')?.textContent?.trim() || '';
  const name = emit?.querySelector('xNome')?.textContent?.trim() || 'Fornecedor';
  const tradeName = emit?.querySelector('xFant')?.textContent?.trim() || name;
  const ie = emit?.querySelector('IE')?.textContent?.trim() || '';
  
  const enderEmit = emit?.querySelector('enderEmit');
  const street = enderEmit?.querySelector('xLgr')?.textContent?.trim() || '';
  const nro = enderEmit?.querySelector('nro')?.textContent?.trim() || '';
  const neighborhood = enderEmit?.querySelector('xBairro')?.textContent?.trim() || '';
  const city = enderEmit?.querySelector('xMun')?.textContent?.trim() || '';
  const state = enderEmit?.querySelector('UF')?.textContent?.trim() || '';
  const zipCode = enderEmit?.querySelector('CEP')?.textContent?.trim() || '';
  const phone = enderEmit?.querySelector('fone')?.textContent?.trim() || '';

  // Dados de Totais
  const total = infNFe.querySelector('total > ICMSTot');
  const totalProducts = parseFloat(total?.querySelector('vProd')?.textContent || '0');
  const totalNF = parseFloat(total?.querySelector('vNF')?.textContent || '0');
  const totalFrete = parseFloat(total?.querySelector('vFrete')?.textContent || '0');
  const totalOutros = parseFloat(total?.querySelector('vOutro')?.textContent || '0');
  const totalDesc = parseFloat(total?.querySelector('vDesc')?.textContent || '0');

  // Itens da Nota
  const detList = Array.from(infNFe.querySelectorAll('det'));
  const products: NfeParsedProduct[] = [];

  detList.forEach((det) => {
    const prod = det.querySelector('prod');
    if (!prod) return;

    const code = prod.querySelector('cProd')?.textContent?.trim() || '';
    const barcode = prod.querySelector('cEAN')?.textContent?.trim() || '';
    const prodName = prod.querySelector('xProd')?.textContent?.trim() || '';
    const ncm = prod.querySelector('NCM')?.textContent?.trim() || '';
    const cfop = prod.querySelector('CFOP')?.textContent?.trim() || '';
    const unit = prod.querySelector('uCom')?.textContent?.trim()?.toUpperCase() || 'UN';
    const quantity = parseFloat(prod.querySelector('qCom')?.textContent || '1') || 1;
    const unitCost = parseFloat(prod.querySelector('vUnCom')?.textContent || '0') || 0;
    const totalCost = parseFloat(prod.querySelector('vProd')?.textContent || '0') || (quantity * unitCost);

    const vFreteItem = parseFloat(prod.querySelector('vFrete')?.textContent || '0');
    const vOutroItem = parseFloat(prod.querySelector('vOutro')?.textContent || '0');
    const vDescItem = parseFloat(prod.querySelector('vDesc')?.textContent || '0');

    // Custo final ponderado por unidade
    const effectiveTotal = totalCost + vFreteItem + vOutroItem - vDescItem;
    const finalUnitCost = quantity > 0 ? (effectiveTotal / quantity) : unitCost;

    products.push({
      code,
      barcode: barcode !== 'SEM GTIN' ? barcode : undefined,
      name: prodName,
      ncm,
      cfop,
      unit,
      quantity,
      unitCost,
      totalCost,
      freightCost: vFreteItem,
      otherCosts: vOutroItem,
      discount: vDescItem,
      finalUnitCost,
    });
  });

  return {
    accessKey,
    number,
    series,
    issueDate,
    supplier: {
      cnpj,
      name,
      tradeName,
      ie,
      phone,
      address: {
        street,
        number: nro,
        neighborhood,
        city,
        state,
        zipCode,
      },
    },
    totalProducts,
    totalNF,
    products,
  };
}
