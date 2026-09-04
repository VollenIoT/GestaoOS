import fs from 'fs';
import path from 'path';

async function testUpload() {
  const nsisDir = 'd:/SistemaOS/apps/desktop/src-tauri/target/release/bundle/nsis';
  const files = fs.readdirSync(nsisDir).filter(f => f.endsWith('.exe'));
  if (files.length === 0) {
    console.log('Nenhum exe encontrado');
    return;
  }
  const filePath = path.join(nsisDir, files[0]);
  const stats = fs.statSync(filePath);
  console.log(`Lendo arquivo: ${files[0]} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

  const fileData = fs.readFileSync(filePath);
  const blob = new Blob([fileData], { type: 'application/octet-stream' });
  const formData = new FormData();
  formData.append('file', blob, files[0]);

  console.log('Enviando para tmpfiles.org...');
  try {
    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    console.log('Upload status:', res.status, json);
    if (json.data && json.data.url) {
      // tmpfiles URL is https://tmpfiles.org/123456/name.exe -> direct is https://tmpfiles.org/dl/123456/name.exe
      const directUrl = json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      console.log('Direct download URL:', directUrl);
    }
  } catch (err) {
    console.error('Upload falhou:', err);
  }
}

testUpload();
