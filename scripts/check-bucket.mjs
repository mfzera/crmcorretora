import { S3Client, ListBucketsCommand, CreateBucketCommand } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://localhost:9000',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin123',
  },
  forcePathStyle: true,
});

const bucketName = 'ecotech-anexos';

async function main() {
  try {
    console.log('Verificando buckets...');
    const listResult = await client.send(new ListBucketsCommand({}));
    console.log('Buckets:', listResult.Buckets?.map(b => b.Name).join(', ') || 'nenhum');
    
    const exists = listResult.Buckets?.some(b => b.Name === bucketName);
    
    if (exists) {
      console.log('✅ Bucket ecotech-anexos ja existe');
    } else {
      console.log('⚠️  Criando bucket...');
      await client.send(new CreateBucketCommand({ Bucket: bucketName }));
      console.log('✅ Bucket criado com sucesso!');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
