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

    console.log('\n📱 ESCOLHA A VERSÃO COMPATÍVEL DO SISTEMA:');
    console.log('  1) v1.0.0 (100% Local)');
    console.log('  2) v2.0.0 (Rede Local + APK + WhatsApp)');
    console.log('  3) v3.0.0 (Nuvem / Cloud)');
    const versionChoice = (await askQuestion('👉 Opção [1-3] (Padrão 1): ')).trim() || '1';

    let appVersion = 'v1.0.0';
    let appMajorVersion = 1;
    if (versionChoice === '2') {
      appVersion = 'v2.0.0';
      appMajorVersion = 2;
    } else if (versionChoice === '3') {
      appVersion = 'v3.0.0';
      appMajorVersion = 3;
    }

    console.log('\n📦 ESCOLHA O TIPO DE PLANO / LICENCIAMENTO:');
    console.log('  1) Mensal (30 dias)');
    console.log('  2) Semestral (180 dias)');
    console.log('  3) Anual (365 dias)');
    console.log('  4) Vitalício (Sem data de expiração)');
    console.log('  5) Demonstração / Trial (15 dias)');
    const planChoice = (await askQuestion('👉 Opção [1-5] (Padrão 1): ')).trim() || '1';

    let planType = 'MENSAL';
    let expiresAt = null;
    const now = new Date();

    if (planChoice === '2') {
      planType = 'SEMESTRAL';
      const exp = new Date(now);
      exp.setDate(exp.getDate() + 180);
      expiresAt = exp.toISOString();
    } else if (planChoice === '3') {
      planType = 'ANUAL';
      const exp = new Date(now);
      exp.setDate(exp.getDate() + 365);
      expiresAt = exp.toISOString();
    } else if (planChoice === '4') {
      planType = 'VITALICIO';
      expiresAt = null;
    } else if (planChoice === '5') {
      planType = 'TRIAL';
      const exp = new Date(now);
      exp.setDate(exp.getDate() + 15);
      expiresAt = exp.toISOString();
    } else {
      planType = 'MENSAL';
      const exp = new Date(now);
      exp.setDate(exp.getDate() + 30);
      expiresAt = exp.toISOString();
    }

    console.log('\n⏳ Gerando chave serial e cadastrando no Firebase Central...');

    const serial = generateAutomaticSerial();
    const cleanId = serial.replace(/[\s-]/g, '').toUpperCase();
    const url = `https://firestore.googleapis.com/v1/projects/${MASTER_PROJECT_ID}/databases/(default)/documents/licenses/${cleanId}?key=${MASTER_API_KEY}`;

    const fieldsPayload = {
      serial: { stringValue: serial },
      companyName: { stringValue: tradeName },
      tradeName: { stringValue: tradeName },
      legalName: { stringValue: legalName },
      active: { booleanValue: true },
      appVersion: { stringValue: appVersion },
      appMajorVersion: { integerValue: String(appMajorVersion) },
      planType: { stringValue: planType },
      status: { stringValue: 'ACTIVE' },
      createdAt: { stringValue: now.toISOString() },
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
    };

    if (expiresAt) {
      fieldsPayload.expiresAt = { stringValue: expiresAt };
    }

    const payload = { fields: fieldsPayload };

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
      console.log(`🏷️  Plano:                 ${planType}`);
      console.log(`📅 Validade:              ${expiresAt ? new Date(expiresAt).toLocaleDateString('pt-BR') : 'Vitalício (Ilimitado)'}`);
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
