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
    const name = buffer.toString('latin1', pos, pos + 11).replace(/\0/g, '').trim();
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

function convertDate(dateStr) {
  if (dateStr && dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
    const y = dateStr.substring(0, 4);
    const m = dateStr.substring(4, 6);
    const d = dateStr.substring(6, 8);
    return new Date(`${y}-${m}-${d}T12:00:00.000Z`).toISOString();
  }
  return new Date().toISOString();
}

export function migrateClients() {
  console.log('🚀 Iniciando extração dos clientes do arquivo DBF...');
  const dbfPath = path.join(BACKUP_DIR, 'CLIENTES.DBF');
  const rawRecords = parseDbf(dbfPath);
  console.log(`📦 Registros lidos do DBF: ${rawRecords.length}`);

  const clients = rawRecords.map((rec) => {
    const { address, number, complement } = extractAddressAndNumber(rec.RUA, rec.CPL);

    const phones = [
      cleanPhone(rec.CEL),
      cleanPhone(rec.FAX),
      cleanPhone(rec.TEL1),
      cleanPhone(rec.TEL2),
      cleanPhone(rec.TEL3)
    ].filter(Boolean);

    const mainPhone = phones[0] || '';
    const whatsapp = phones.find((p) => p.replace(/\D/g, '').length >= 10) || mainPhone;

    const obsParts = [
      rec.OBS1,
      rec.OBS2,
      rec.OBS3,
      rec.OBS4,
      rec.OBS5,
      rec.OBS6,
      rec.OBS7,
      rec.RESTRICAO
    ].filter(Boolean);

    const isPJ = !!rec.CGC && rec.CGC.replace(/\D/g, '').length > 11;
    const docNumber = (rec.CGC || rec.CPF || '').trim();
    const createdAt = convertDate(rec.DATA);

    return {
      id: String(rec.COD),
      code: String(rec.COD),
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
      address: address,
      number: number,
      complement: complement,
      neighborhood: rec.BAI ? rec.BAI.trim() : '',
      city: rec.CID ? rec.CID.trim() : '',
      state: rec.UF ? rec.UF.trim() : '',
      additionalNotes: obsParts.join('\n').trim(),
      createdAt: createdAt,
      updatedAt: createdAt
    };
  });

  ensureDir(OUTPUT_DIR);
  
  // Salva apenas os clientes
  const clientsJsonPath = path.join(OUTPUT_DIR, 'clientes_migrados.json');
  fs.writeFileSync(clientsJsonPath, JSON.stringify(clients, null, 2), 'utf-8');

  // Salva no formato de Backup compatível com o GestãoOS (TopMenuBar -> Restaurar Backup)
  const fullBackupFormat = {
    version: '3.0.0',
    exportedAt: new Date().toISOString(),
    source: 'MIGRAÇÃO_BACKUP_OS4.0',
    clients: clients,
    storage: {
      vollen_clients: clients
    }
  };
  const backupJsonPath = path.join(OUTPUT_DIR, 'backup_gestaoos_clientes.json');
  fs.writeFileSync(backupJsonPath, JSON.stringify(fullBackupFormat, null, 2), 'utf-8');

  console.log(`✅ Migração de Clientes concluída com sucesso!`);
  console.log(`📁 Arquivos gerados em: ${OUTPUT_DIR}`);
  console.log(`   1. clientes_migrados.json (${clients.length} clientes)`);
  console.log(`   2. backup_gestaoos_clientes.json (pronto para restaurar no GestãoOS)`);

  return clients;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrateClients();
}
