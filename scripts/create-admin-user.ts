import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const ADMIN_EMAIL = 'miguel@ecotech.com';
const ADMIN_PASSWORD = 'EcoTech@2024!Admin';
const ADMIN_NAME = 'Miguel - Administrador';

// Todas as permissões de admin disponíveis
const ALL_ADMIN_PERMISSIONS = [
  'view_usage',
  'manage_limits',
  'view_all_tenants',
  'manage_backups',
  'manage_admins',
  'view_audit_logs',
  'cleanup_files',
];

async function createAdminUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔐 Criando usuário administrador...');
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔑 Senha: ${ADMIN_PASSWORD}`);
    console.log('');

    // Verificar se já existe um admin com este email
    const checkResult = await pool.query(
      'SELECT id FROM admin WHERE email = $1',
      [ADMIN_EMAIL],
    );

    if (checkResult.rows.length > 0) {
      console.log('⚠️  Usuário admin já existe com este email!');
      console.log('');
      console.log('Se deseja redefinir a senha, execute:');
      console.log(
        `UPDATE admin SET senha = '${await bcrypt.hash(ADMIN_PASSWORD, 10)}' WHERE email = '${ADMIN_EMAIL}';`,
      );
      return;
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Criar o admin
    const adminId = uuidv4();
    const now = new Date();

    await pool.query(
      `INSERT INTO admin (id, email, senha, nome, permissoes, ativo, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        adminId,
        ADMIN_EMAIL,
        senhaHash,
        ADMIN_NAME,
        JSON.stringify(ALL_ADMIN_PERMISSIONS),
        true,
        now,
        now,
      ],
    );

    console.log('✅ Usuário administrador criado com sucesso!');
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('           CREDENCIAIS DE ADMINISTRADOR        ');
    console.log('═══════════════════════════════════════════════');
    console.log(`Email:    ${ADMIN_EMAIL}`);
    console.log(`Senha:    ${ADMIN_PASSWORD}`);
    console.log('');
    console.log('⚠️  IMPORTANTE: Guarde estas credenciais em local seguro!');
    console.log('');
    console.log('Permissões concedidas:');
    ALL_ADMIN_PERMISSIONS.forEach((perm) => {
      console.log(`  ✓ ${perm}`);
    });
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log(
      '🌐 Acesse o painel admin em: http://localhost:3000/admin/login',
    );
    console.log('');
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createAdminUser();
