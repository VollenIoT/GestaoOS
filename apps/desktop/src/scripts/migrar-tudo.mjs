import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.resolve('D:/GestaoOS-producao/Nova pasta/BACKUP_OS4.0_000001');
const OUTPUT_DIR = path.resolve(__dirname, '../../../../migracao_dados');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseDbf(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
  const buffer = fs.readFileSync(filePath);
  const numRecords = buffer.readUInt32LE(4);
  const headerLen = buffer.readUInt16LE(8);
  const recordLen = buffer.readUInt16LE(10);

  const fields = [];
  let pos = 32;
  while (pos < headerLen - 1) {
    if (buffer[pos] === 0x0D) break;
    let name = buffer.toString('latin1', pos, pos + 11).split('\0')[0].trim();
    name = name.replace(/[^A-Za-z0-9_]/g, '');
    const type = String.fromCharCode(buffer[pos + 11]);
    const length = buffer[pos + 16];
    fields.push({ name, type, length });
    pos += 32;
  }

  const records = [];
  let offset = headerLen;
  for (let i = 0; i < numRecords; i++) {
    const isDeleted = buffer[offset] === 0x2A;
    let recOffset = offset + 1;
    const rec = {};
    for (const f of fields) {
      const val = buffer.toString('latin1', recOffset, recOffset + f.length).trim();
      rec[f.name] = val;
      recOffset += f.length;
    }
    if (!isDeleted) {
      records.push(rec);
    }
    offset += recordLen;
  }
  return records;
}

function createDbtReader(dbtPath) {
  if (!fs.existsSync(dbtPath)) return () => '';
  const dbtBuffer = fs.readFileSync(dbtPath);
  const blockSize = 512;

  return function readMemo(blockNumber) {
    if (!blockNumber || blockNumber <= 0) return '';
    const offset = blockNumber * blockSize;
    if (offset >= dbtBuffer.length) return '';
    let end = offset;
    while (end < dbtBuffer.length && dbtBuffer[end] !== 0x1A && end - offset < 4096) {
      end++;
    }
    return dbtBuffer.toString('latin1', offset, end).trim();
  };
}

function convertDateIso(d) {
  if (d && d.length === 8 && /^\d{8}$/.test(d)) {
    const y = d.substring(0, 4);
    const m = d.substring(4, 6);
    const day = d.substring(6, 8);
    return `${y}-${m}-${day}T12:00:00.000Z`;
  }
  return new Date().toISOString();
}

function convertDateYmd(d) {
  if (d && d.length === 8 && /^\d{8}$/.test(d)) {
    const y = d.substring(0, 4);
    const m = d.substring(4, 6);
    const day = d.substring(6, 8);
    return `${y}-${m}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}

function cleanPhone(p) {
  if (!p) return '';
  const c = p.replace(/\s+/g, ' ').trim();
  if (c === '(  )     -' || c === '( ) -' || c === '()' || c === '-') return '';
  return c;
}

function extractAddressAndNumber(rawAddress, rawCpl) {
  let address = (rawAddress || '').trim();
  let number = '';
  let complement = (rawCpl || '').trim();

  const match = address.match(/^(.*?)[,\s]+(?:N[ºo.]*\s*|NÚMERO\s*)?(\d+[A-Za-z0-9\-\/]*)(.*)$/i);
  if (match) {
    address = match[1].trim();
    number = match[2].trim();
    if (match[3] && match[3].trim()) {
      complement = (complement ? complement + ' ' : '') + match[3].trim();
    }
  }
  return { address, number, complement };
}

function formatCanonicalCode(val, minDigits = 4) {
  if (val === undefined || val === null) return '0001';
  const str = String(val).trim();
  if (!str) return '0001';
  const numMatch = str.match(/^([A-Za-z\-_]*)(\d+)$/);
  if (numMatch) {
    const prefix = numMatch[1] || '';
    const numStr = numMatch[2];
    if (numStr.length < minDigits) {
      return `${prefix}${numStr.padStart(minDigits, '0')}`;
    }
    return `${prefix}${numStr}`;
  }
  return str;
}

const STATUS_UNIFICATION_MAP = {
  'EM ORÇAMENTO': 'ABERTA',
  'EM ORCAMENTO': 'ABERTA',
  'ORÇAMENTO CONCLUIDO': 'ORCAMENTO_CONCLUIDO',
  'ORCAMENTO CONCLUIDO': 'ORCAMENTO_CONCLUIDO',
  'AUTORIZADO': 'APROVADO',
  'AG. PEÇA': 'AGUARDANDO_PECA',
  'AG. PECA': 'AGUARDANDO_PECA',
  'CANCELADO': 'CANCELADA',
  'SERVIÇO EXECUTADO': 'FINALIZADA',
  'SERVICO EXECUTADO': 'FINALIZADA',
  'GARANTIA DO SERVIÇO': 'RETORNO_GARANTIA',
  'GARANTIA DO SERVICO': 'RETORNO_GARANTIA',
};

const DEFAULT_STATUSES = [
  { id: '1', code: '0001', name: 'ABERTA', color: '#eab308', description: 'Ordem de serviço aberta aguardando avaliação', isSystemDefault: true, deductStock: false, returnStock: false },
  { id: '9', code: '0002', name: 'ORCAMENTO_CONCLUIDO', color: '#6366f1', description: 'Orçamento concluído e aguardando resposta do cliente', isSystemDefault: true, deductStock: false, returnStock: false },
  { id: '2', code: '0003', name: 'EM_ATENDIMENTO', color: '#0284c7', description: 'Técnico trabalhando no equipamento / Visita Técnica', isSystemDefault: true, deductStock: false, returnStock: false },
  { id: '8', code: '0004', name: 'APROVADO', color: '#059669', description: 'Serviço e orçamento aprovados pelo cliente', isSystemDefault: true, deductStock: true, returnStock: false },
  { id: '3', code: '0005', name: 'AGUARDANDO_PECA', color: '#f97316', description: 'Aguardando chegada de peças para conclusão', isSystemDefault: true, deductStock: false, returnStock: false },
  { id: '4', code: '0006', name: 'APARELHO_LIBERADO', color: '#10b981', description: 'Aparelho pronto e liberado para retirada pelo cliente', isSystemDefault: true, deductStock: false, returnStock: false },
  { id: 'retorno', code: '0007', name: 'RETORNO_GARANTIA', color: '#8b5cf6', description: 'Retorno do aparelho em garantia', isSystemDefault: true, deductStock: false, returnStock: false },
  { id: '5', code: '0008', name: 'FINALIZADA', color: '#047857', description: 'Serviço concluído e entregue ao cliente', isSystemDefault: true, deductStock: true, returnStock: false },
  { id: '6', code: '0009', name: 'CANCELADA', color: '#dc2626', description: 'Ordem de serviço cancelada', isSystemDefault: true, deductStock: false, returnStock: true },
];

function normalizeCanonicalStatus(rawStatus) {
  if (!rawStatus) return 'ABERTA';
  const trimmed = rawStatus.trim();
  const upper = trimmed.toUpperCase();
  if (STATUS_UNIFICATION_MAP[upper]) {
    return STATUS_UNIFICATION_MAP[upper];
  }
  return trimmed;
}

export function migrateCompleteDatabase() {
  console.log('🚀 Iniciando MIGRAÇÃO COMPLETA de todas as tabelas...');
  ensureDir(OUTPUT_DIR);

  // 1. CLIENTES (CLIENTES.DBF)
  console.log('📦 Processando CLIENTES.DBF...');
  const rawClients = parseDbf(path.join(BACKUP_DIR, 'CLIENTES.DBF'));
  const clients = rawClients.map((rec) => {
    const { address, number, complement } = extractAddressAndNumber(rec.RUA, rec.CPL);
    const phones = [cleanPhone(rec.CEL), cleanPhone(rec.FAX), cleanPhone(rec.TEL1), cleanPhone(rec.TEL2), cleanPhone(rec.TEL3)].filter(Boolean);
    const mainPhone = phones[0] || '';
    const whatsapp = phones.find((p) => p.replace(/\D/g, '').length >= 10) || mainPhone;
    const isPJ = !!rec.CGC && rec.CGC.replace(/\D/g, '').length > 11;
    const docNumber = (rec.CGC || rec.CPF || '').trim();
    const createdAt = convertDateIso(rec.DATA);

    return {
      id: String(rec.COD),
      code: formatCanonicalCode(rec.COD),
      name: rec.NOM ? rec.NOM.trim() : `CLIENTE ${rec.COD}`,
      personType: isPJ ? 'PJ' : 'PF',
      cpf: isPJ ? '' : docNumber,
      cnpj: isPJ ? docNumber : '',
      rg: rec.RG ? rec.RG.trim() : '',
      ie: rec.IE ? rec.IE.trim() : '',
      im: rec.IM ? rec.IM.trim() : '',
      phone: mainPhone,
      whatsapp: whatsapp,
      contactName: rec.CTO ? rec.CTO.trim() : '',
      email: rec.EMAIL ? rec.EMAIL.trim().toLowerCase() : '',
      cep: rec.CEP ? rec.CEP.trim() : '',
      address,
      number,
      complement,
      neighborhood: rec.BAI ? rec.BAI.trim() : '',
      city: rec.CID ? rec.CID.trim() : '',
      state: rec.UF ? rec.UF.trim() : '',
      additionalNotes: [rec.OBS1, rec.OBS2, rec.OBS3, rec.OBS4, rec.OBS5, rec.OBS6, rec.OBS7, rec.RESTRICAO].filter(Boolean).join('\n').trim(),
      createdAt,
      updatedAt: createdAt,
    };
  });
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  // 2. PRODUTOS / PEÇAS (PRODUTOS.DBF)
  console.log('📦 Processando PRODUTOS.DBF...');
  const rawProducts = parseDbf(path.join(BACKUP_DIR, 'PRODUTOS.DBF'));
  const parts = rawProducts.map((p) => {
    const cost = parseFloat(p.P_CUSTO || '0') || 0;
    const price = parseFloat(p.P_VENDA || '0') || 0;
    const stock = parseFloat(p.QUANT_ATUA || '0') || 0;
    const minStock = parseFloat(p.QUANT_MINI || '0') || 0;
    let margin = 0;
    if (cost > 0 && price > cost) {
      margin = Math.round(((price - cost) / cost) * 100);
    }
    return {
      id: String(p.CODIGO),
      code: formatCanonicalCode(p.CODIGO),
      name: p.DESCRICAO ? p.DESCRICAO.trim() : `ITEM ${p.CODIGO}`,
      manufacturerCode: p.REFERENCIA ? p.REFERENCIA.trim() : '',
      brand: p.MARCA ? p.MARCA.trim() : '',
      group: p.CATEGORIA ? p.CATEGORIA.trim() : '',
      costPrice: cost,
      techPrice: cost,
      finalPrice: price,
      price: price,
      profitMarginPercent: margin,
      unit: p.UNIDADE ? p.UNIDADE.trim().toUpperCase() : 'UN',
      stockQuantity: stock,
      minStock: minStock,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // 3. TÉCNICOS (TECNICO.DBF + ORDEM.DBF)
  console.log('📦 Processando TECNICO.DBF...');
  const techMap = new Map();
  techMap.set('OTAVIO', {
    id: '1',
    code: '1',
    name: 'OTAVIO',
    phone: '',
    whatsapp: '',
    specialty: 'Manutenção Geral',
    active: true,
    role: 'TECNICO',
  });

  const rawTechs = parseDbf(path.join(BACKUP_DIR, 'TECNICO.DBF'));
  rawTechs.forEach((t) => {
    const name = t.NOM ? t.NOM.trim() : (t.USUARIO ? t.USUARIO.trim() : `TÉCNICO ${t.COD}`);
    const phone = cleanPhone(t.FAX) || cleanPhone(t.CEL) || cleanPhone(t.TEL1);
    techMap.set(name, {
      id: String(t.COD),
      code: String(t.COD),
      name: name,
      username: t.USUARIO ? t.USUARIO.trim().toLowerCase() : undefined,
      phone: phone,
      whatsapp: phone,
      specialty: 'Técnico Especialista',
      active: t.INATIVO !== 'T',
      role: t.ATENDENTE === 'T' ? 'ATENDENTE' : 'TECNICO',
    });
  });
  const technicians = Array.from(techMap.values());

  // 4. EQUIPAMENTOS
  console.log('📦 Processando EQUIPAMENTOS...');
  const equipmentMap = new Map();

  // 5. ORDENS DE SERVIÇO (ORDEM.DBF + ORDEM3.DBF + ORDEM3.DBT)
  console.log('📦 Processando ORDENS DE SERVIÇO (ORDEM.DBF / ORDEM3.DBF / ORDEM3.DBT)...');
  const readMemo = createDbtReader(path.join(BACKUP_DIR, 'ORDEM3.DBT'));
  const rawOrders3 = parseDbf(path.join(BACKUP_DIR, 'ORDEM3.DBF'));
  const o3Map = new Map();
  rawOrders3.forEach((o3) => {
    const num = o3.NUMERO;
    if (num) {
      o3Map.set(String(num), {
        defeito: readMemo(parseInt(o3.DEFEITO, 10)),
        laudo: readMemo(parseInt(o3.CONSTA, 10)),
        servico: readMemo(parseInt(o3.SERVICO, 10)),
        obsGeral: readMemo(parseInt(o3.OBSGERALr, 10)),
      });
    }
  });

  const rawOrders = parseDbf(path.join(BACKUP_DIR, 'ORDEM.DBF'));

  const orders = rawOrders.map((o) => {
    const oId = String(o.NUMERO);
    const oCode = String(o.NUMERO);
    const o3 = o3Map.get(oId) || {};

    const cliId = String(o.CODCLI);
    const matchedClient = clientMap.get(cliId) || {
      id: cliId,
      code: cliId,
      name: o.CLIENTE ? o.CLIENTE.trim() : `CLIENTE ${cliId}`,
      phone: cleanPhone(o.TELEFONE),
      whatsapp: cleanPhone(o.TELEFONE),
    };

    const eqType = (o.EQUIPA || '').trim().toUpperCase();
    const eqBrand = (o.MARCA || '').trim();
    const eqModel = (o.MODELO || '').trim();
    const eqSerial = (o.SERIE || '').trim();

    if (eqType) {
      if (!equipmentMap.has(eqType)) {
        const nextEqNum = equipmentMap.size + 1;
        equipmentMap.set(eqType, {
          id: String(nextEqNum),
          code: formatCanonicalCode(nextEqNum),
          type: eqType,
          name: eqType,
          brand: '',
          model: '',
          serialNumber: '',
          accessories: '',
        });
      }
    }

    const equipment = {
      type: eqType,
      brand: eqBrand,
      model: eqModel,
      serialNumber: eqSerial,
      accessories: (o.ACESSORIOS || '').trim(),
    };

    // Mapeamento canônico do status
    const rawStatus = (o.SITUACAO || 'ABERTA').trim();
    const canonicalStatus = normalizeCanonicalStatus(rawStatus);

    // Defeito, Laudo e Serviços
    const defectParts = [
      o3.defeito,
      o.DEFEITO1,
      o.DEFEITO2
    ].filter(Boolean);
    const problemDescription = defectParts.join('\n').trim();

    const reportParts = [
      o3.laudo,
      o.MOTIVO
    ].filter(Boolean);
    const technicalReport = reportParts.join('\n').trim();

    const serviceLines = [
      o3.servico,
      o.SERVICO1,
      o.SERVICO2,
      o.SERVICO3,
      o.SERVICO4,
      o.SERVICO5
    ].filter(Boolean);
    const executedService = serviceLines.join('\n').trim();

    const obsLines = [
      o3.obsGeral,
      o.OBS1,
      o.OBS2,
      o.OBS3,
      o.OBS4,
      o.OBS5,
      o.OBS6,
      o.OBS7,
      o.OBS8,
      o.OBSERVA
    ].filter(Boolean);
    const orderObservations = obsLines.join('\n').trim();

    const totalAmount = parseFloat(o.TOTAL || '0') || 0;
    const partsCost = parseFloat(o.VLRPROD || '0') || 0;
    const servicesCost = parseFloat(o.VLRSERV || o.MAO_OBRA || '0') || (totalAmount > 0 && partsCost === 0 ? totalAmount : 0);
    const travelCost = parseFloat(o.DESLOCA || '0') || 0;
    const discountCost = parseFloat(o.DESCONTO || '0') || 0;

    const entryDate = convertDateIso(o.DATAENT);
    const exitDate = o.DATASAI ? convertDateIso(o.DATASAI) : undefined;

    return {
      id: oId,
      code: formatCanonicalCode(o.NUMERO),
      clientId: matchedClient.id,
      client: {
        id: matchedClient.id,
        code: matchedClient.code,
        name: matchedClient.name,
        phone: matchedClient.phone,
        whatsapp: matchedClient.whatsapp,
        address: matchedClient.address || '',
        number: matchedClient.number || '',
        neighborhood: matchedClient.neighborhood || '',
        city: matchedClient.city || '',
        state: matchedClient.state || '',
      },
      equipment,
      problemDescription,
      technicalReport,
      executedService,
      orderObservations,
      status: canonicalStatus,
      originalStatus: rawStatus,
      technician: (o.TECNICO || 'OTAVIO').trim(),
      technicianName: (o.TECNICO || 'OTAVIO').trim(),
      technicianId: o.CODTEC ? String(o.CODTEC) : '1',
      attendant: (o.USUARIO || '').trim(),
      partsCost,
      servicesCost,
      travelCost,
      discountCost,
      totalAmount,
      entryDate,
      exitDate,
      paymentMethod: o.FORMA ? o.FORMA.trim() : 'Dinheiro',
      createdAt: entryDate,
      updatedAt: exitDate || entryDate,
    };
  });

  // 6. CONTAS A RECEBER (RECEBER.DBF)
  console.log('📦 Processando CONTAS A RECEBER (RECEBER.DBF)...');
  const rawBills = parseDbf(path.join(BACKUP_DIR, 'RECEBER.DBF'));
  const accountBills = rawBills.map((b) => {
    const amount = parseFloat(b.VALOR || b.TOTAL || '0') || 0;
    const amountPaid = parseFloat(b.VALORP || '0') || 0;
    const isPaid = b.SITUACAO === 'P' || (amountPaid >= amount && amount > 0);
    const dueDate = convertDateYmd(b.DATAV || b.DATA || b.DATAOS);
    const paymentDate = b.DATAP ? convertDateYmd(b.DATAP) : undefined;

    return {
      id: String(b.REGISTRO),
      type: 'RECEBER',
      description: (b.HISTORICO || b.TITULO || `RECEBER OS ${b.ORDEM}`).trim(),
      entityName: (b.CLIENTE || 'CLIENTE').trim(),
      entityId: b.CODCLI ? String(b.CODCLI) : undefined,
      documentNumber: b.TITULO ? b.TITULO.trim() : (b.ORDEM ? `OS${formatCanonicalCode(b.ORDEM)}` : ''),
      category: (b.NOMECTA || b.DESNIV || 'VENDAS DIVERSAS').trim(),
      amount: amount,
      amountPaid: isPaid ? amountPaid || amount : 0,
      dueDate: dueDate,
      paymentDate: isPaid ? paymentDate || dueDate : undefined,
      paymentMethod: b.FORMA ? b.FORMA.trim() : 'Dinheiro',
      status: isPaid ? 'PAGO' : 'PENDENTE',
      orderCode: b.ORDEM ? formatCanonicalCode(b.ORDEM) : undefined,
      notes: [b.HISTORICO2, b.HISTORICO3, b.OBS].filter(Boolean).join(' - ').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // 7. MOVIMENTAÇÕES DE CAIXA (CAIXA.DBF)
  console.log('📦 Processando MOVIMENTAÇÕES DE CAIXA (CAIXA.DBF)...');
  const rawCash = parseDbf(path.join(BACKUP_DIR, 'CAIXA.DBF'));
  const cashMovements = rawCash.map((c) => {
    const isIncome = c.TIPO === 'R' || parseFloat(c.RECEITA || '0') > 0;
    const amount = isIncome ? parseFloat(c.RECEITA || '0') || 0 : parseFloat(c.DESPESA || '0') || 0;
    const date = convertDateYmd(c.DATA);

    return {
      id: String(c.REGISTRO),
      type: isIncome ? 'INCOME' : 'EXPENSE',
      description: (c.HISTORICO || c.TITULO || c.CAIXA || 'Movimentação de Caixa').trim(),
      amount: amount,
      date: date,
      category: (c.DESNIV || c.NOMECTA || 'Geral').trim(),
      account: (c.CAIXA || 'Caixa Geral').trim(),
      paymentMethod: c.FORMA ? c.FORMA.trim() : 'Dinheiro',
      notes: [c.HISTORICO2, c.HISTORICO3, c.OBS, c.CLIENTE ? `Cliente: ${c.CLIENTE}` : ''].filter(Boolean).join(' - ').trim(),
      createdAt: new Date(`${date}T12:00:00.000Z`).toISOString(),
    };
  });

  const equipments = Array.from(equipmentMap.values());

  // 7.5. STATUS DE OS (SITUA.DBF + STATUS PRESENTES NAS ORDENS)
  console.log('📦 Processando STATUS DE OS (SITUA.DBF / ORDEM.DBF)...');
  const statusMap = new Map();
  DEFAULT_STATUSES.forEach((st) => statusMap.set(st.name.toUpperCase(), { ...st }));

  const rawSitua = parseDbf(path.join(BACKUP_DIR, 'SITUA.DBF'));
  const PALETTE = ['#0284c7', '#6366f1', '#8b5cf6', '#d946ef', '#059669', '#10b981', '#f59e0b', '#f97316', '#dc2626', '#475569', '#0891b2', '#7c3aed'];

  rawSitua.forEach((rec) => {
    const kName = Object.keys(rec).find((k) => k.toUpperCase().includes('SITUA')) || '';
    const rawVal = (rec[kName] || '').trim();
    if (!rawVal) return;
    const val = normalizeCanonicalStatus(rawVal);
    if (val && !statusMap.has(val.toUpperCase())) {
      const u = val.toUpperCase();
      const isCancel = u.includes('CANCEL');
      const isFinished = u.includes('LIBERADO') || u.includes('EXECUTADO') || u.includes('FINALIZADA') || u.includes('CONCLUIDA');
      const isApproved = u.includes('APROVADO') || u.includes('AUTORIZADO');
      const color = isCancel ? '#dc2626' : (isFinished ? '#047857' : (isApproved ? '#059669' : PALETTE[statusMap.size % PALETTE.length]));
      
      statusMap.set(u, {
        id: String(statusMap.size + 1),
        code: String(statusMap.size + 1).padStart(4, '0'),
        name: val,
        color,
        description: `Status importado do backup: ${val}`,
        isSystemDefault: false,
        deductStock: isFinished || isApproved,
        returnStock: isCancel,
        orderIndex: statusMap.size + 1,
      });
    }
  });

  // Garante que todo e qualquer status presente nas ordens migradas seja registrado
  orders.forEach((o) => {
    const stVal = (o.status || '').trim();
    if (stVal && !statusMap.has(stVal.toUpperCase())) {
      const u = stVal.toUpperCase();
      const isCancel = u.includes('CANCEL');
      const isFinished = u.includes('LIBERADO') || u.includes('EXECUTADO') || u.includes('FINALIZADA') || u.includes('CONCLUIDA');
      const isApproved = u.includes('APROVADO') || u.includes('AUTORIZADO');
      const color = isCancel ? '#dc2626' : (isFinished ? '#047857' : (isApproved ? '#059669' : PALETTE[statusMap.size % PALETTE.length]));

      statusMap.set(u, {
        id: String(statusMap.size + 1),
        code: String(statusMap.size + 1).padStart(4, '0'),
        name: stVal,
        color,
        description: `Status importado do backup: ${stVal}`,
        isSystemDefault: false,
        deductStock: isFinished || isApproved,
        returnStock: isCancel,
        orderIndex: statusMap.size + 1,
      });
    }
  });

  const osStatuses = Array.from(statusMap.values());

  // 8. PACOTE DE BACKUP CONSOLIDADO COMPLETO
  const completeBackup = {
    version: '3.0.0',
    exportedAt: new Date().toISOString(),
    system: 'Vollen - Gestão de OS',
    source: 'MIGRAÇÃO_COMPLETA_BACKUP_OS4.0',
    clients: clients,
    orders: orders,
    parts: parts,
    technicians: technicians,
    equipments: equipments,
    osStatuses: osStatuses,
    cashMovements: cashMovements,
    accountBills: accountBills,
    storage: {
      vollen_clients: clients,
      vollen_orders: orders,
      local_orders: orders,
      vollen_parts: parts,
      vollen_parts_stock: parts,
      vollen_technicians: technicians,
      vollen_equipments: equipments,
      custom_os_statuses_v3: osStatuses,
      system_os_statuses: osStatuses,
      vollen_cash_movements: cashMovements,
      vollen_accounts_bills: accountBills,
    },
  };

  // Salvar arquivos individuais
  fs.writeFileSync(path.join(OUTPUT_DIR, 'clientes_migrados.json'), JSON.stringify(clients, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'produtos_migrados.json'), JSON.stringify(parts, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'tecnicos_migrados.json'), JSON.stringify(technicians, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'status_migrados.json'), JSON.stringify(osStatuses, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ordens_migradas.json'), JSON.stringify(orders, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'equipamentos_migrados.json'), JSON.stringify(equipments, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'contas_receber_migradas.json'), JSON.stringify(accountBills, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'caixa_migrado.json'), JSON.stringify(cashMovements, null, 2), 'utf-8');

  // Salvar o arquivo de Backup Universal Completo
  const backupFilePath = path.join(OUTPUT_DIR, 'BACKUP_COMPLETO_GESTAO_OS.json');
  fs.writeFileSync(backupFilePath, JSON.stringify(completeBackup), 'utf-8');

  console.log('\n======================================================');
  console.log('🎉 MIGRAÇÃO COMPLETA DE TODAS AS TABELAS FINALIZADA!');
  console.log('======================================================');
  console.log(`👤 Clientes:               ${clients.length}`);
  console.log(`📋 Ordens de Serviço (OS):  ${orders.length}`);
  console.log(`🔩 Peças / Produtos:       ${parts.length}`);
  console.log(`👨‍🔧 Técnicos:               ${technicians.length}`);
  console.log(`🔌 Equipamentos:           ${equipments.length}`);
  console.log(`💰 Contas a Receber:       ${accountBills.length}`);
  console.log(`💵 Movimentações de Caixa: ${cashMovements.length}`);
  console.log('------------------------------------------------------');
  console.log(`📁 Arquivo de Backup Final Gerado:`);
  console.log(`   👉 ${backupFilePath}`);
  console.log('======================================================\n');

  return completeBackup;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrateCompleteDatabase();
}
