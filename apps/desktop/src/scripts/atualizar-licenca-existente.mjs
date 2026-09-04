import readline from 'readline';

const MASTER_PROJECT_ID = "vollen---gestao-os";
const MASTER_API_KEY = "AIzaSyBYldSd19R4l8dVPj5akUNdjiBjckmO_lk";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.clear();
  console.log('================================================================');
  console.log('    ✏️  ATUALIZAR RAZÃO SOCIAL E NOME FANTASIA DE SERIAL EXISTENTE');
  console.log('================================================================\n');

  try {
    const serialInput = await askQuestion('👉 Digite ou cole a Chave Serial existente: ');
    const rawSerial = serialInput.trim().toUpperCase();

    if (!rawSerial) {
      console.log('\n❌ Chave serial não pode ficar em branco.');
      rl.close();
      return;
    }

    const cleanId = rawSerial.replace(/[\s-]/g, '');
    const getUrl = `https://firestore.googleapis.com/v1/projects/${MASTER_PROJECT_ID}/databases/(default)/documents/licenses/${cleanId}?key=${MASTER_API_KEY}`;

    console.log('\n🔍 Consultando serial no Catálogo Central do Firebase...');
    const getRes = await fetch(getUrl);

    if (!getRes.ok) {
      console.log(`\n❌ Chave serial "${rawSerial}" não foi encontrada no catálogo central.`);
      rl.close();
      return;
    }

    const docData = await getRes.json();
    const currentTrade = docData.fields?.tradeName?.stringValue || docData.fields?.companyName?.stringValue || '(Não definido)';
    const currentLegal = docData.fields?.legalName?.stringValue || docData.fields?.companyName?.stringValue || '(Não definido)';

    console.log('\n----------------------------------------------------------------');
    console.log(`🔑 Serial:        ${rawSerial}`);
    console.log(`🏢 Nome Fantasia atual: ${currentTrade}`);
    console.log(`📜 Razão Social atual:  ${currentLegal}`);
    console.log('----------------------------------------------------------------\n');

    const newTradeInput = await askQuestion(`👉 Novo Nome Fantasia [Enter para manter "${currentTrade}"]: `);
    const newTradeName = newTradeInput.trim() || (currentTrade !== '(Não definido)' ? currentTrade : 'Vollen Assistência Técnica');

    const newLegalInput = await askQuestion(`👉 Nova Razão Social [Enter para manter "${currentLegal}"]: `);
    const newLegalName = newLegalInput.trim() || (currentLegal !== '(Não definido)' ? currentLegal : newTradeName);

    console.log('\n⏳ Atualizando dados no Firebase Central...');

    // Mantém as configurações originais do Firebase do cliente
    const existingFirebaseConfig = docData.fields?.firebaseConfig || {
      mapValue: {
        fields: {
          apiKey: { stringValue: "" },
          projectId: { stringValue: "" },
          authDomain: { stringValue: "" },
          storageBucket: { stringValue: "" }
        }
      }
    };

    const patchUrl = `https://firestore.googleapis.com/v1/projects/${MASTER_PROJECT_ID}/databases/(default)/documents/licenses/${cleanId}?key=${MASTER_API_KEY}&updateMask.fieldPaths=companyName&updateMask.fieldPaths=tradeName&updateMask.fieldPaths=legalName&updateMask.fieldPaths=updatedAt`;

    const payload = {
      fields: {
        companyName: { stringValue: newTradeName },
        tradeName: { stringValue: newTradeName },
        legalName: { stringValue: newLegalName },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    };

    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (patchRes.ok) {
      console.log('\n================================================================');
      console.log('✅ SERIAL ATUALIZADA COM SUCESSO NO CATÁLOGO!');
      console.log('================================================================\n');
      console.log(`🔑 Chave Serial:  ${rawSerial}`);
      console.log(`🏢 Nome Fantasia: ${newTradeName}`);
      console.log(`📜 Razão Social:  ${newLegalName}`);
      console.log('================================================================');
      console.log('Quando o cliente abrir o sistema ou sincronizar a serial, os novos nomes');
      console.log('serão carregados e fixados automaticamente!\n');
    } else {
      const errText = await patchRes.text();
      console.log('\n❌ Erro ao atualizar no Firebase:', errText);
    }
  } catch (err) {
    console.log('\n❌ Erro inesperado:', err?.message || err);
  } finally {
    rl.close();
  }
}

main();
