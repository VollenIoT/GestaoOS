/**
 * Script para gerar e cadastrar uma nova Chave Serial no padrão XXXXX-XXXXX-XXXXX-XXXXX
 * 
 * USO:
 * node apps/desktop/src/scripts/gerarSerial.mjs "Nome do Cliente" "cliente-firebase-project-id" "AIzaSyApiKeyDoCliente..." "[APP_ID]" "[SERIAL_OPCIONAL]"
 */

const PROJECT_ID = "vollen---gestao-os";
const MASTER_API_KEY = "AIzaSyBYldSd19R4l8dVPj5akUNdjiBjckmO_lk";

function generateAutomaticSerial() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem caracteres ambíguos
  const block = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${block()}-${block()}-${block()}-${block()}`;
}

const [,, companyName, tenantProjectId, tenantApiKey, tenantAppId, customSerial] = process.argv;

if (!companyName || !tenantProjectId || !tenantApiKey) {
  console.log(`
📋 Como gerar e cadastrar chaves seriais automáticas:
--------------------------------------------------------------------------------------------------
node apps/desktop/src/scripts/gerarSerial.mjs "<NOME_EMPRESA>" "<PROJECT_ID>" "<API_KEY>" "[APP_ID]"

Exemplo:
node apps/desktop/src/scripts/gerarSerial.mjs "Oficina Mecânica Silva" "oficina-silva-os" "AIzaSy..."

A chave serial será gerada automaticamente no formato XXXXX-XXXXX-XXXXX-XXXXX.
--------------------------------------------------------------------------------------------------
`);
  process.exit(0);
}

const serial = (customSerial || generateAutomaticSerial()).toUpperCase();

async function cadastrarSerial() {
  const cleanId = serial.replace(/[\s-]/g, '').toUpperCase();
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/licenses/${cleanId}?key=${MASTER_API_KEY}`;

  const payload = {
    fields: {
      serial: { stringValue: serial.toUpperCase() },
      companyName: { stringValue: companyName },
      active: { booleanValue: true },
      createdAt: { stringValue: new Date().toISOString() },
      firebaseConfig: {
        mapValue: {
          fields: {
            apiKey: { stringValue: tenantApiKey },
            authDomain: { stringValue: `${tenantProjectId}.firebaseapp.com` },
            projectId: { stringValue: tenantProjectId },
            storageBucket: { stringValue: `${tenantProjectId}.firebasestorage.app` },
            appId: { stringValue: tenantAppId || `1:00000000:web:${cleanId}` },
            messagingSenderId: { stringValue: "00000000" }
          }
        }
      }
    }
  };

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log(`✅ Chave Serial "${serial}" cadastrada com sucesso no Firebase Central!`);
      console.log(`🏢 Empresa: ${companyName}`);
      console.log(`📦 Projeto Firestore: ${tenantProjectId}`);
    } else {
      const err = await res.text();
      console.error('❌ Erro:', err);
    }
  } catch (e) {
    console.error('❌ Falha:', e);
  }
}

cadastrarSerial();
