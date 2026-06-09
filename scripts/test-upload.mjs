import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Criar um arquivo de teste
const testFile = '/tmp/test-anexo.txt';
fs.writeFileSync(testFile, 'Teste de upload com MinIO - ' + new Date().toISOString());

// Fazer upload
async function testUpload() {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(testFile));
    form.append('entidadeTipo', 'cotacao');
    form.append('entidadeId', 'test-cotacao-123');
    
    console.log('📤 Enviando arquivo para API...');
    
    const response = await fetch('http://localhost:3001/api/anexos/upload', {
      method: 'POST',
      body: form,
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test', // Token de teste
        ...form.getHeaders(),
      },
    });
    
    const data = await response.json();
    
    console.log('📊 Status:', response.status);
    console.log('📦 Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Upload realizado com sucesso!');
      console.log('   ID:', data.data?.id);
      console.log('   Nome:', data.data?.nomeOriginal);
      console.log('   Tamanho:', data.data?.tamanho, 'bytes');
    } else {
      console.log('❌ Erro no upload');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testUpload();
