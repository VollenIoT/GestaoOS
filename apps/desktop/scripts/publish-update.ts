import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as readline from 'readline';

// Configuração do Firebase do seu projeto Vollen OS
const firebaseConfig = {
  apiKey: "AIzaSyBYldSd19R4l8dVPj5akUNdjiBjckmO_lk",
  authDomain: "sistema-os-829d6.firebaseapp.com",
  projectId: "sistema-os-829d6",
  storageBucket: "sistema-os-829d6.firebasestorage.app",
  messagingSenderId: "374249112521",
  appId: "1:374249112521:web:2f8bc5b89a803927d6d3d9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  console.log('=======================================================');
  console.log('    LANÇADOR DE ATUALIZAÇÃO - SISTEMA OS VOLLEN        ');
  console.log('=======================================================');
  console.log('Envie atualizações direto da sua máquina para todos os sistemas!\n');

  try {
    const version = await ask('1. Digite o número da nova versão (ex: 1.0.1): ');
    if (!version.trim()) {
      console.log('\n[AVISO] Versão não informada. Operação cancelada.');
      rl.close();
      return;
    }

    const title = await ask('2. Título do lançamento (ou Enter p/ padrão): ');
    const downloadUrl = await ask('3. Link de Download do Instalador (.exe ou drive): ');
    
    console.log('4. Novidades / Notas da versão (digite os itens separados por vírgula):');
    const notesInput = await ask('   Novidades: ');

    const releaseNotes = notesInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      version: version.trim(),
      releaseDate: new Date().toLocaleDateString('pt-BR'),
      title: title.trim() || 'Nova Atualização do Sistema OS',
      releaseNotes: releaseNotes.length > 0 ? releaseNotes : [
        'Melhorias de desempenho e correções gerais.',
        'Atualização de estabilidade do sistema.'
      ],
      downloadUrl: downloadUrl.trim(),
      mandatory: false,
      updatedAt: new Date().toISOString()
    };

    console.log('\nPublicando na nuvem...');
    const versionDocRef = doc(db, 'system_config', 'app_version');
    await setDoc(versionDocRef, payload, { merge: true });

    console.log('\n=======================================================');
    console.log(` ✅ SUCESSO! A versão v${version.trim()} foi publicada na Nuvem!`);
    console.log(' Todos os clientes instalados receberão o aviso de atualização.');
    console.log('=======================================================\n');
  } catch (error: any) {
    console.error('\n[ERRO] Falha ao publicar atualização:', error?.message || error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

main();
