/**
 * publish-update.mjs
 * Script interativo para publicar uma nova versão do SistemaOS no Firebase.
 *
 * Uso: node src/scripts/publish-update.mjs
 * (Executado automaticamente pelo lancar-atualizacao.bat)
 *
 * Publica no Firestore: system_config / app_version
 * O UpdateSystemModal.tsx consome este documento para alertar os clientes.
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Configuração do Firebase Master ─────────────────────────────────────────
// Tenta ler do .env local; se não encontrar, usa os valores hardcoded como fallback.
let MASTER_PROJECT_ID = 'vollen---gestao-os';
let MASTER_API_KEY = '';

try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // Caminho: apps/desktop/.env (dois níveis acima de src/scripts/)
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      const value = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key === 'VITE_FIREBASE_PROJECT_ID') MASTER_PROJECT_ID = value;
      if (key === 'VITE_FIREBASE_API_KEY')    MASTER_API_KEY    = value;
    }
  }
} catch {
  // Silencioso — usa os valores padrão
}

// Fallback caso o .env não esteja configurado
if (!MASTER_API_KEY) {
  MASTER_API_KEY = 'AIzaSyBYldSd19R4l8dVPj5akUNdjiBjckmO_lk';
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

function formatDate() {
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

/** Publica o documento app_version no Firestore via REST API (sem Firebase SDK). */
async function publishVersion(payload) {
  const majorVersion = payload.version.split('.')[0] || '1';
  
  // Salva no canal global (app_version) e no canal específico da versão principal (app_version_v3, app_version_v2, etc.)
  const targetDocs = ['app_version', `app_version_v${majorVersion}`];

  const firestorePayload = {
    fields: {
      version:      { stringValue: payload.version },
      majorVersion: { stringValue: majorVersion },
      title:        { stringValue: payload.title },
      releaseDate:  { stringValue: payload.releaseDate },
      downloadUrl:  { stringValue: payload.downloadUrl },
      mandatory:    { booleanValue: payload.mandatory },
      publishedAt:  { stringValue: new Date().toISOString() },
      releaseNotes: {
        arrayValue: {
          values: payload.releaseNotes.map((note) => ({ stringValue: note })),
        },
      },
    },
  };

  for (const docName of targetDocs) {
    const url = `https://firestore.googleapis.com/v1/projects/${MASTER_PROJECT_ID}/databases/(default)/documents/system_config/${docName}?key=${MASTER_API_KEY}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestorePayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Firebase respondeu com erro ao salvar ${docName} (${res.status}): ${errText}`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.clear();
  console.log('=================================================================');
  console.log('        \uD83D\uDE80  LANÇAR ATUALIZAÇÃO DO SISTEMA OS (VOLLEN)           ');
  console.log('=================================================================');
  console.log('Este script publica uma nova versão para TODOS os clientes.');
  console.log('Os clientes serão notificados automaticamente ao abrir o sistema.\n');

  try {
    // Lê a versão configurada no tauri.conf.json / package.json para sugerir por padrão
    let defaultVersion = '3.0.1';
    let localExeFound = null;
    try {
      const tauriConfPath = path.resolve(__dirname, '../../src-tauri/tauri.conf.json');
      if (fs.existsSync(tauriConfPath)) {
        const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
        if (tauriConf.version) {
          const parts = tauriConf.version.split('.');
          if (parts.length === 3) {
            defaultVersion = `${parts[0]}.${parts[1]}.${parseInt(parts[2], 10) + 1}`;
          } else {
            defaultVersion = tauriConf.version;
          }
        }
      }
      
      const nsisDir = path.resolve(__dirname, '../../src-tauri/target/release/bundle/nsis');
      if (fs.existsSync(nsisDir)) {
        const files = fs.readdirSync(nsisDir).filter(f => f.endsWith('.exe'));
        if (files.length > 0) {
          // Pega o arquivo mais recente
          files.sort((a, b) => {
            const statA = fs.statSync(path.join(nsisDir, a));
            const statB = fs.statSync(path.join(nsisDir, b));
            return statB.mtimeMs - statA.mtimeMs;
          });
          localExeFound = path.join(nsisDir, files[0]);
        }
      }
    } catch {
      // Ignora erro de leitura
    }

    if (localExeFound) {
      console.log(`📦 Instalador local detectado:\n   ${localExeFound}\n`);
    }

    // 1. Número da versão
    const versionPrompt = defaultVersion 
      ? `📌 [1/4] Número da nova versão [Padrão: ${defaultVersion}]: ` 
      : '📌 [1/4] Número da nova versão (ex: 3.0.1): ';
    const versionInput = await ask(versionPrompt);
    const version = versionInput.trim() || defaultVersion;
    if (!version || !/^\d+\.\d+(\.\d+)?$/.test(version)) {
      console.error('\n❌ Versão inválida. Use o formato: 3.0.1 ou 3.1.0');
      rl.close();
      return;
    }

    // 2. Título do lançamento
    const titleInput = await ask(`📝 [2/4] Título do lançamento [Padrão: Atualização v${version}]: `);
    const title = titleInput.trim() || `Atualização v${version}`;

    // 3. Link de download
    console.log('\n💡 DICA DO LINK: Cole o link de download direto do arquivo .exe (Google Drive público, Dropbox, seu servidor, etc.)');
    const downloadInput = await ask('🔗 [3/4] Link de download do instalador (.exe): ');
    const downloadUrl = downloadInput.trim();
    if (!downloadUrl) {
      console.error('\n❌ O link de download é obrigatório.');
      rl.close();
      return;
    }

    // 4. Notas da versão (múltiplas linhas — linha em branco para terminar)
    console.log('\n📋 [4/4] Novidades desta versão (uma por linha — pressione Enter em branco para finalizar):');
    const releaseNotes = [];
    let i = 1;
    while (true) {
      const note = (await ask(`   ${i}. `)).trim();
      if (!note) break;
      releaseNotes.push(note);
      i++;
    }
    if (releaseNotes.length === 0) {
      releaseNotes.push(`Melhorias de estabilidade e novas funcionalidades da versão ${version}.`);
    }

    // Confirmação
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('                     📋 RESUMO DA PUBLICAÇÃO                    ');
    console.log('─────────────────────────────────────────────────────────────────');
    console.log(`  Versão:         v${version}`);
    console.log(`  Título:         ${title}`);
    console.log(`  Download:       ${downloadUrl}`);
    console.log('  Novidades:');
    releaseNotes.forEach((n) => console.log(`    • ${n}`));
    console.log('─────────────────────────────────────────────────────────────────\n');

    const confirm = await ask('✅ Confirmar e publicar para todos os clientes? (S/N): ');
    if (confirm.trim().toUpperCase() !== 'S') {
      console.log('\n⚠️  Publicação cancelada pelo usuário.');
      rl.close();
      return;
    }

    // Publicar
    console.log('\n⏳ Publicando no Firebase...');
    await publishVersion({
      version,
      title,
      releaseNotes,
      downloadUrl,
      releaseDate: formatDate(),
      mandatory: false,
    });

    console.log('\n=================================================================');
    console.log('  ✅ ATUALIZAÇÃO PUBLICADA COM SUCESSO!');
    console.log('=================================================================');
    console.log(`  Versão v${version} agora está disponível para todos os clientes.`);
    console.log('  Eles serão notificados ao abrir o sistema ou ao clicar em');
    console.log('  "Menu Opções → Verificar Atualizações do Sistema".');
    console.log('=================================================================\n');

  } catch (err) {
    console.error('\n❌ Erro ao publicar atualização:', err?.message || err);
    console.error('   Verifique sua conexão com a internet e tente novamente.\n');
  } finally {
    rl.close();
  }
}

main();
