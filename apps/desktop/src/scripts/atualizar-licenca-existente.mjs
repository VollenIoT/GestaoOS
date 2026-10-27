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
  console.log('  ✏️  ATUALIZAR / RENOVAR PLANO E DADOS DE SERIAL EXISTENTE     ');
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
    const currentPlan = docData.fields?.planType?.stringValue || 'MENSAL';
    const currentExpiry = docData.fields?.expiresAt?.stringValue || 'Vitalício / Sem expiração';
    const currentStatus = docData.fields?.status?.stringValue || 'ACTIVE';

    console.log('\n----------------------------------------------------------------');
    console.log(`🔑 Serial:              ${rawSerial}`);
    console.log(`🏢 Nome Fantasia atual: ${currentTrade}`);
    console.log(`📜 Razão Social atual:  ${currentLegal}`);
    console.log(`🏷️  Plano atual:         ${currentPlan}`);
    console.log(`📅 Validade atual:      ${currentExpiry}`);
    console.log(`⚡ Status atual:        ${currentStatus}`);
    console.log('----------------------------------------------------------------\n');

    console.log('O que você deseja fazer?');
    console.log('  1) Renovar assinatura / Mudar plano');
    console.log('  2) Alterar Nome Fantasia e Razão Social');
    console.log('  3) Bloquear / Desativar licença');
    console.log('  4) Desbloquear / Reativar licença');
    const option = (await askQuestion('👉 Escolha a opção [1-4]: ')).trim();

    let fieldsPayload = {
      updatedAt: { stringValue: new Date().toISOString() }
    };
    let updateMaskPaths = ['updatedAt'];

    if (option === '1') {
      console.log('\n📦 ESCOLHA O NOVO PLANO / PERÍODO DE RENOVAÇÃO:');
      console.log('  1) +30 dias (Mensal)');
      console.log('  2) +180 dias (Semestral)');
      console.log('  3) +365 dias (Anual)');
      console.log('  4) Vitalício (Sem expiração)');
      console.log('  5) +15 dias (Trial)');
      const planOpt = (await askQuestion('👉 Opção [1-5]: ')).trim();

      const now = new Date();
      let exp = new Date(now);
      let newPlan = 'MENSAL';

      if (planOpt === '2') {
        newPlan = 'SEMESTRAL';
        exp.setDate(exp.getDate() + 180);
      } else if (planOpt === '3') {
        newPlan = 'ANUAL';
        exp.setDate(exp.getDate() + 365);
      } else if (planOpt === '4') {
        newPlan = 'VITALICIO';
      } else if (planOpt === '5') {
        newPlan = 'TRIAL';
        exp.setDate(exp.getDate() + 15);
      } else {
        newPlan = 'MENSAL';
        exp.setDate(exp.getDate() + 30);
      }

      fieldsPayload.planType = { stringValue: newPlan };
      fieldsPayload.status = { stringValue: 'ACTIVE' };
      fieldsPayload.active = { booleanValue: true };
      updateMaskPaths.push('planType', 'status', 'active');

      if (newPlan !== 'VITALICIO') {
        fieldsPayload.expiresAt = { stringValue: exp.toISOString() };
        updateMaskPaths.push('expiresAt');
      }
    } else if (option === '2') {
      const newTradeInput = await askQuestion(`👉 Novo Nome Fantasia [Enter para manter "${currentTrade}"]: `);
      const newTradeName = newTradeInput.trim() || currentTrade;

      const newLegalInput = await askQuestion(`👉 Nova Razão Social [Enter para manter "${currentLegal}"]: `);
      const newLegalName = newLegalInput.trim() || currentLegal;

      fieldsPayload.tradeName = { stringValue: newTradeName };
      fieldsPayload.companyName = { stringValue: newTradeName };
      fieldsPayload.legalName = { stringValue: newLegalName };
      updateMaskPaths.push('tradeName', 'companyName', 'legalName');
    } else if (option === '3') {
      fieldsPayload.status = { stringValue: 'BLOCKED' };
      fieldsPayload.active = { booleanValue: false };
      updateMaskPaths.push('status', 'active');
    } else if (option === '4') {
      fieldsPayload.status = { stringValue: 'ACTIVE' };
      fieldsPayload.active = { booleanValue: true };
      updateMaskPaths.push('status', 'active');
    } else {
      console.log('\n❌ Opção inválida.');
      rl.close();
      return;
    }

    console.log('\n⏳ Atualizando dados no Firebase Central...');

    const maskQuery = updateMaskPaths.map(p => `updateMask.fieldPaths=${p}`).join('&');
    const patchUrl = `https://firestore.googleapis.com/v1/projects/${MASTER_PROJECT_ID}/databases/(default)/documents/licenses/${cleanId}?key=${MASTER_API_KEY}&${maskQuery}`;

    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: fieldsPayload })
    });

    if (patchRes.ok) {
      console.log('\n================================================================');
      console.log('✅ LICENÇA ATUALIZADA COM SUCESSO NO FIREBASE!');
      console.log('================================================================\n');
      console.log(`🔑 Chave Serial:  ${rawSerial}`);
      console.log('================================================================\n');
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
