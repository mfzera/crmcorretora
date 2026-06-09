#!/usr/bin/env node

const { S3Client, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://localhost:9000',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  forcePathStyle: true,
});

const bucketName = 'ecotech-anexos';

async function createBucket() {
  try {
    // Verificar se o bucket já existe
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`✅ Bucket '${bucketName}' já existe`);
  } catch (error) {
    if (error.name === 'NotFound') {
      // Bucket não existe, criar
      try {
        await client.send(new CreateBucketCommand({ Bucket: bucketName }));
        console.log(`✅ Bucket '${bucketName}' criado com sucesso!`);
      } catch (createError) {
        console.error('❌ Erro ao criar bucket:', createError.message);
        process.exit(1);
      }
    } else {
      console.error('❌ Erro ao verificar bucket:', error.message);
      process.exit(1);
    }
  }
}

createBucket();
