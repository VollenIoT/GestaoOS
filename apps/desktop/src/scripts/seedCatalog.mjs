const PROJECT_ID = "vollen---gestao-os";
const API_KEY = "AIzaSyBYldSd19R4l8dVPj5akUNdjiBjckmO_lk";

async function createCatalogViaREST() {
  console.log('🚀 Criando coleção `licenses` no Firebase Master via Firestore REST API...');

  const demoSerial = 'VOLL-TEST-0001-DEMO';
  const cleanId = demoSerial.replace(/[\s-]/g, '').toUpperCase(); // 'VOLLTEST0001DEMO'

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/licenses/${cleanId}?key=${API_KEY}`;

  const payload = {
    fields: {
      serial: { stringValue: demoSerial },
      companyName: { stringValue: "Empresa Demonstração Vollen" },
      active: { booleanValue: true },
      createdAt: { stringValue: new Date().toISOString() },
      notes: { stringValue: "Chave serial modelo de teste/demonstração criada no Firestore" },
      firebaseConfig: {
        mapValue: {
          fields: {
            apiKey: { stringValue: "AIzaSyBYldSd19R4l8dVPj5akUNdjiBjckmO_lk" },
            authDomain: { stringValue: "vollen---gestao-os.firebaseapp.com" },
            projectId: { stringValue: "vollen---gestao-os" },
            storageBucket: { stringValue: "vollen---gestao-os.firebasestorage.app" },
            messagingSenderId: { stringValue: "436401191883" },
            appId: { stringValue: "1:436401191883:web:cfa2281a25dca4f81f944e" },
            measurementId: { stringValue: "G-YRPSCPSBVC" }
          }
        }
      }
    }
  };

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      console.log('✅ Catálogo `licenses` criado com sucesso no Firestore!');
      console.log(`🔑 Chave de teste ativada: ${demoSerial}`);
      console.log('📄 Documento Firestore criado:', data.name);
    } else {
      const errText = await res.text();
      console.error('❌ Resposta de erro do Firebase:', res.status, errText);
    }
  } catch (err) {
    console.error('❌ Falha na requisição REST para o Firestore:', err);
  }
}

createCatalogViaREST();
