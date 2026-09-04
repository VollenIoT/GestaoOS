/**
 * publish-update.mjs
 * Script interativo para publicar uma nova versão do SistemaOS no GitHub Releases e Firebase.
 *
 * Uso: node src/scripts/publish-update.mjs
 * (Executado automaticamente pelo lancar-atualizacao.bat)
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

// ─── Configuração do Firebase Master ─────────────────────────────────────────
let MASTER_PROJECT_ID = 'vollen---gestao-os';
let MASTER_API_KEY = 'AIzaSyBYldSd19R4l8dVPj5akUNdjiBjckmO_lk';

try {
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
  // Silencioso
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

function formatDate() {
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function updateLocalConfigs(newVersion) {
  // 1. apps/desktop/package.json
  const desktopPkgPath = path.resolve(__dirname, '../../package.json');
  if (fs.existsSync(desktopPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(desktopPkgPath, 'utf-8'));
    pkg.version = newVersion;
    fs.writeFileSync(desktopPkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  }

  // 2. apps/desktop/src-tauri/tauri.conf.json
  const tauriConfPath = path.resolve(__dirname, '../../src-tauri/tauri.conf.json');
  if (fs.existsSync(tauriConfPath)) {
    const conf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
    conf.version = newVersion;
    fs.writeFileSync(tauriConfPath, JSON.stringify(conf, null, 2) + '\n', 'utf-8');
  }

  // 3. apps/desktop/src-tauri/Cargo.toml
  const cargoPath = path.resolve(__dirname, '../../src-tauri/Cargo.toml');
  if (fs.existsSync(cargoPath)) {
    let cargo = fs.readFileSync(cargoPath, 'utf-8');
    cargo = cargo.replace(/version\s*=\s*"[^"]+"/, `version = "${newVersion}"`);
    fs.writeFileSync(cargoPath, cargo, 'utf-8');
  }

  // 4. UpdateSystemModal.tsx & BackupModal.tsx
  const updateModalPath = path.resolve(__dirname, '../components/UpdateSystemModal.tsx');
  if (fs.existsSync(updateModalPath)) {
    let code = fs.readFileSync(updateModalPath, 'utf-8');
    code = code.replace(/const CURRENT_SYSTEM_VERSION\s*=\s*'[^']+';/, `const CURRENT_SYSTEM_VERSION = '${newVersion}';`);
    fs.writeFileSync(updateModalPath, code, 'utf-8');
  }

  const backupModalPath = path.resolve(__dirname, '../components/BackupModal.tsx');
  if (fs.existsSync(backupModalPath)) {
    let code = fs.readFileSync(backupModalPath, 'utf-8');
    code = code.replace(/const CURRENT_SYSTEM_VERSION\s*=\s*'[^']+';/, `const CURRENT_SYSTEM_VERSION = '${newVersion}';`);
    fs.writeFileSync(backupModalPath, code, 'utf-8');
  }
}

async function publishToFirestore(payload) {
  const majorVersion = payload.version.split('.')[0] || '1';
  const targetDocs = ['app_version', `app_version_v${majorVersion}`];

  const firestorePayload = {
    fields: {
      version:      { stringValue: payload.version },
      majorVersion: { stringValue: majorVersion },
      title:        { stringValue: payload.title },
      releaseDate:  { stringValue: payload.releaseDate },
      downloadUrl:  { stringValue: payload.downloadUrl },
      mandatory:    { booleanValue: false },
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
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestorePayload),
    });
  }
}

async function main() {
  console.clear();
  console.log('=================================================================');
  console.log('    🚀  LANÇAMENTO AUTOMÁTICO DE ATUALIZAÇÃO (VOLLEN OS)         ');
  console.log('=================================================================');
  console.log('Este script atualiza a versão, publica no GitHub Releases');
  console.log('e disponibiliza a atualização para todos os clientes sem precisar');
  console.log('de nenhum upload ou link manual!\n');

  try {
    let defaultVersion = '3.0.1';
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
    } catch {}

    // 1. Versão
    const versionPrompt = `📌 [1/3] Versão do lançamento [Padrão: ${defaultVersion}]: `;
    const versionInput = await ask(versionPrompt);
    const version = versionInput.trim() || defaultVersion;
    if (!version || !/^\d+\.\d+(\.\d+)?$/.test(version)) {
      console.error('\n❌ Versão inválida. Use o formato: 3.0.1 ou 3.1.0');
      rl.close();
      return;
    }

    // 2. Título
    const titleInput = await ask(`📝 [2/3] Título do lançamento [Padrão: Atualização v${version}]: `);
    const title = titleInput.trim() || `Atualização v${version}`;

    // 3. Notas
    console.log('\n📋 [3/3] Novidades desta versão (uma por linha — pressione Enter em branco para finalizar):');
    const releaseNotes = [];
    let i = 1;
    while (true) {
      const note = (await ask(`   ${i}. `)).trim();
      if (!note) break;
      releaseNotes.push(note);
      i++;
    }
    if (releaseNotes.length === 0) {
      releaseNotes.push(`Melhorias de desempenho e novas correções da versão ${version}.`);
    }

    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('                     📋 RESUMO DA PUBLICAÇÃO                    ');
    console.log('─────────────────────────────────────────────────────────────────');
    console.log(`  Versão:         v${version}`);
    console.log(`  Título:         ${title}`);
    console.log('  Destino:        GitHub Releases & Nuvem Central');
    console.log('  Novidades:');
    releaseNotes.forEach((n) => console.log(`    • ${n}`));
    console.log('─────────────────────────────────────────────────────────────────\n');

    const confirm = await ask('✅ Confirmar e lançar atualização 100% automática? (S/N): ');
    if (confirm.trim().toUpperCase() !== 'S') {
      console.log('\n⚠️  Publicação cancelada.');
      rl.close();
      return;
    }

    console.log('\n⏳ 1. Atualizando arquivos de versão locais...');
    updateLocalConfigs(version);

    console.log('⏳ 2. Registrando versão no canal da nuvem (Firebase)...');
    await publishToFirestore({
      version,
      title,
      releaseNotes,
      downloadUrl: `https://github.com/VollenIoT/GestaoOS/releases/download/v${version}/Vollen.-.Gestao.de.Ordens.de.Servico_${version}_x64-setup.exe`,
      releaseDate: formatDate(),
    });

    console.log('⏳ 3. Criando tag git e enviando para o GitHub...');
    try {
      execSync(`git add .`, { cwd: rootDir, stdio: 'ignore' });
      execSync(`git commit -m "release: v${version} - ${title}"`, { cwd: rootDir, stdio: 'ignore' });
      execSync(`git tag -a v${version} -m "Release v${version}"`, { cwd: rootDir, stdio: 'ignore' });
      execSync(`git push origin main --tags`, { cwd: rootDir, stdio: 'inherit' });
    } catch (gitErr) {
      console.warn('⚠️  Aviso ao enviar tags para o GitHub:', gitErr?.message || gitErr);
    }

    console.log('\n=================================================================');
    console.log('  🎉 ATUALIZAÇÃO v' + version + ' LANÇADA COM SUCESSO!');
    console.log('=================================================================');
    console.log('  O GitHub Actions foi iniciado e está gerando os instaladores');
    console.log('  assinados na nuvem. Os clientes receberão a atualização');
    console.log('  automaticamente por dentro do sistema!');
    console.log('=================================================================\n');

  } catch (err) {
    console.error('\n❌ Erro durante o processo:', err?.message || err);
  } finally {
    rl.close();
  }
}

main();
