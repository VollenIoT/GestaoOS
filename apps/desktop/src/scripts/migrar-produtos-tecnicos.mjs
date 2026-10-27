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

export function migrateProductsAndTechnicians() {
  console.log('🚀 Iniciando migração de Produtos/Peças e Técnicos...');
  ensureDir(OUTPUT_DIR);

  // 1. Migrar Produtos / Peças
  const dbfProductsPath = path.join(BACKUP_DIR, 'PRODUTOS.DBF');
  const rawProducts = parseDbf(dbfProductsPath);
  console.log(`📦 Produtos/Peças lidos do DBF: ${rawProducts.length}`);

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
      code: String(p.CODIGO),
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
      updatedAt: new Date().toISOString()
    };
  });

  // 2. Migrar Técnicos
  const dbfTechPath = path.join(BACKUP_DIR, 'TECNICO.DBF');
  const rawTechs = parseDbf(dbfTechPath);
  
  // Mapeia técnicos cadastrados
  const techMap = new Map();
  
  // Se existirem técnicos nas Ordens de Serviço (ex: OTAVIO cod 1), incluímos também para não haver inconsistência
  const dbfOrdersPath = path.join(BACKUP_DIR, 'ORDEM.DBF');
  if (fs.existsSync(dbfOrdersPath)) {
    const orders = parseDbf(dbfOrdersPath);
    orders.forEach((o) => {
      if (o.TECNICO && o.TECNICO.trim()) {
        const name = o.TECNICO.trim();
        const cod = o.CODTEC ? String(o.CODTEC).trim() : '';
        if (name && !techMap.has(name)) {
          techMap.set(name, {
            id: cod && cod !== '0' ? cod : String(techMap.size + 1),
            code: cod && cod !== '0' ? cod : String(techMap.size + 1),
            name: name,
            phone: '',
            whatsapp: '',
            specialty: 'Manutenção Geral',
            active: true,
            role: 'TECNICO'
          });
        }
      }
    });
  }

  rawTechs.forEach((t) => {
    const name = t.NOM ? t.NOM.trim() : (t.USUARIO ? t.USUARIO.trim() : `TÉCNICO ${t.COD}`);
    const phone = cleanPhone(t.FAX) || cleanPhone(t.CEL) || cleanPhone(t.TEL1);
    const cod = String(t.COD);

    techMap.set(name, {
      id: cod,
      code: cod,
      name: name,
      username: t.USUARIO ? t.USUARIO.trim().toLowerCase() : undefined,
      phone: phone,
      whatsapp: phone,
      specialty: 'Técnico Especialista',
      active: t.INATIVO !== 'T',
      role: t.ATENDENTE === 'T' ? 'ATENDENTE' : 'TECNICO'
    });
  });

  const technicians = Array.from(techMap.values());
  console.log(`👨‍🔧 Técnicos mapeados: ${technicians.length} (${technicians.map(t => `${t.name} [ID:${t.id}]`).join(', ')})`);

  // Salvar arquivos específicos
  fs.writeFileSync(path.join(OUTPUT_DIR, 'produtos_migrados.json'), JSON.stringify(parts, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'tecnicos_migrados.json'), JSON.stringify(technicians, null, 2), 'utf-8');

  // Carrega clientes se já existirem para gerar backup consolidado
  let clients = [];
  const clientsFile = path.join(OUTPUT_DIR, 'clientes_migrados.json');
  if (fs.existsSync(clientsFile)) {
    clients = JSON.parse(fs.readFileSync(clientsFile, 'utf-8'));
  }

  // Gera arquivo de backup consolidado para o GestãoOS
  const fullBackupFormat = {
    version: '3.0.0',
    exportedAt: new Date().toISOString(),
    source: 'MIGRAÇÃO_BACKUP_OS4.0',
    clients: clients,
    parts: parts,
    technicians: technicians,
    storage: {
      vollen_clients: clients,
      vollen_parts: parts,
      vollen_parts_stock: parts,
      vollen_technicians: technicians
    }
  };

  const backupJsonPath = path.join(OUTPUT_DIR, 'backup_gestaoos_clientes_produtos_tecnicos.json');
  fs.writeFileSync(backupJsonPath, JSON.stringify(fullBackupFormat, null, 2), 'utf-8');

  console.log(`✅ Migração de Peças/Produtos e Técnicos concluída com sucesso!`);
  console.log(`📁 Arquivos gerados em: ${OUTPUT_DIR}`);
  console.log(`   1. produtos_migrados.json (${parts.length} peças/produtos)`);
  console.log(`   2. tecnicos_migrados.json (${technicians.length} técnicos)`);
  console.log(`   3. backup_gestaoos_clientes_produtos_tecnicos.json (Backup unificado pronto para restaurar)`);

  return { parts, technicians };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrateProductsAndTechnicians();
}
