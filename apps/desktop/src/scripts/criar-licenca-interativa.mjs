import readline from 'readline';

const MASTER_PROJECT_ID = "vollen---gestao-os";
const MASTER_API_KEY = "AIzaSyBYldSd19R4l8dVPj5akUNdjiBjckmO_lk";

function generateAutomaticSerial() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem caracteres ambíguos (sem 0, O, 1, I)
  const block = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${block()}-${block()}-${block()}-${block()}`;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.clear();
  console.log('================================================================');
  console.log('       🔑 GERADOR AUTOMÁTICO DE CHAVE SERIAL - VOLLEN OS        ');
  console.log('================================================================\n');

  try {
    const projectIdInput = await askQuestion('👉 Digite ou cole o Project ID do Firebase: ');
    const projectId = projectIdInput.trim();

    if (!projectId) {
      console.log('\n❌ Erro: O Project ID não pode ficar em branco.');
      rl.close();
      return;
    }

    const apiKeyInput = await askQuestion('👉 Digite ou cole a API Key (Web API Key) do Firebase: ');
    const apiKey = apiKeyInput.trim();

    if (!apiKey) {
      console.log('\n❌ Erro: A API Key não pode ficar em branco.');
      rl.close();
      return;
    }

    const tradeNameInput = await askQuestion('👉 Nome Fantasia da empresa (Ex: Vollen Assistência): ');
    const tradeName = tradeNameInput.trim() || 'Vollen Assistência';

    const legalNameInput = await askQuestion('👉 Razão Social da empresa (Ex: Vollen Tecnologia LTDA): ');
    const legalName = legalNameInput.trim() || tradeName;

    console.log('\n⏳ Gerando chave serial e cadastrando no Firebase Central...');

    const serial = generateAutomaticSerial();
    const cleanId = serial.replace(/[\s-]/g, '').toUpperCase();
    const url = `https://firestore.googleapis.com/v1/projects/${MASTER_PROJECT_ID}/databases/(default)/documents/licenses/${cleanId}?key=${MASTER_API_KEY}`;

    const payload = {
      fields: {
        serial: { stringValue: serial },
        companyName: { stringValue: tradeName },
        tradeName: { stringValue: tradeName },
        legalName: { stringValue: legalName },
        active: { booleanValue: true },
        createdAt: { stringValue: new Date().toISOString() },
        firebaseConfig: {
          mapValue: {
            fields: {
              apiKey: { stringValue: apiKey },
              authDomain: { stringValue: `${projectId}.firebaseapp.com` },
              projectId: { stringValue: projectId },
              storageBucket: { stringValue: `${projectId}.firebasestorage.app` },
              appId: { stringValue: `1:000000000000:web:${cleanId}` },
              messagingSenderId: { stringValue: "000000000000" }
            }
          }
        }
      }
    };

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log('\n================================================================');
      console.log('✅ LICENÇA CRIADA COM SUCESSO NO FIREBASE!');
      console.log('================================================================\n');
      console.log(`🔑 CHAVE SERIAL GERADA:  ${serial}\n`);
      console.log(`🏢 Nome Fantasia:         ${tradeName}`);
      console.log(`📜 Razão Social:          ${legalName}`);
      console.log(`📦 Projeto Firebase:      ${projectId}`);
      console.log('================================================================');
      console.log('Basta enviar a Chave Serial acima para o seu cliente inserir no sistema.\n');
    } else {
      const errText = await res.text();
      console.log('\n❌ Erro ao registrar no Firebase:', errText);
    }
  } catch (error) {
    console.log('\n❌ Falha inesperada:', error?.message || error);
  } finally {
    rl.close();
  }
}

main();
