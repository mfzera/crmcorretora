import 'dotenv/config';
import { db } from './connection.js';
import { corretoras, usuarios, planos } from './schema/index.js';
import bcryptjs from 'bcryptjs';
const { hash } = bcryptjs;
import { eq } from 'drizzle-orm';

async function seedUser() {
  console.log('🌱 Criando usuário e corretora...');

  try {
    // 1. Buscar ou criar plano Professional
    console.log('📋 Verificando plano...');
    let plano = await db.query.planos.findFirst({
      where: eq(planos.nomePlano, 'Professional'),
    });

    if (!plano) {
      console.log('📋 Criando plano Professional...');
      const [novoPlano] = await db
        .insert(planos)
        .values({
          nomePlano: 'Professional',
          descricao: 'Plano para corretoras em crescimento',
          limiteUsuarios: 20,
          limiteVendedores: 15,
          limiteClientes: 2000,
          limiteVendasMes: 500,
          valorMensal: '499.00',
          valorAnual: '4990.00',
          features: {
            api_access: true,
            relatorios_avancados: true,
            suporte_prioritario: false,
          },
          ativo: true,
        })
        .returning();
      plano = novoPlano;
    }

    // 2. Criar Corretora
    console.log('🏢 Criando corretora Ecosistema Seguros...');
    const [corretora] = await db
      .insert(corretoras)
      .values({
        razaoSocial: 'Ecosistema Seguros Ltda',
        nomeFantasia: 'Ecosistema Seguros',
        cnpj: '12345678000190', // CNPJ fictício válido
        subdominio: 'ecosistema',
        emailContato: 'contato@grupoecosistema.com.br',
        telefone: '11999999999',
        planoId: plano.id,
        status: 'ATIVO',
        coresTema: {
          primary: '#3fb353',
          secondary: '#00733b',
        },
      })
      .returning()
      .onConflictDoUpdate({
        target: corretoras.cnpj,
        set: {
          razaoSocial: 'Ecosistema Seguros Ltda',
          nomeFantasia: 'Ecosistema Seguros',
          emailContato: 'contato@grupoecosistema.com.br',
        },
      });

    console.log(
      `✅ Corretora criada: ${corretora.nomeFantasia} (ID: ${corretora.id})`,
    );

    // 3. Hash da senha
    console.log('🔐 Gerando hash da senha...');
    const senhaHash = await hash('senha123', 10);

    // 4. Criar Usuário
    console.log('👤 Criando usuário Miguel Caetano...');
    const [usuario] = await db
      .insert(usuarios)
      .values({
        nome: 'Miguel Caetano',
        email: 'ecotech@grupoecosistema.com.br',
        passwordHash: senhaHash,
        corretoraId: corretora.id,
        cargoId: null,
        ativo: true,
        primeiroAcesso: false,
      })
      .returning()
      .onConflictDoUpdate({
        target: usuarios.email,
        set: {
          nome: 'Miguel Caetano',
          passwordHash: senhaHash,
          ativo: true,
        },
      });

    console.log(`✅ Usuário criado: ${usuario.nome} (${usuario.email})`);
    console.log('');
    console.log('🎉 Setup completo!');
    console.log('');
    console.log('📝 Credenciais de acesso:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email:      ${usuario.email}`);
    console.log(`Senha:      senha123`);
    console.log(`Empresa:    ${corretora.nomeFantasia}`);
    console.log(`CNPJ:       ${corretora.cnpj}`);
    console.log(`Subdomínio: ${corretora.subdominio}`);
    console.log(`Status:     ${usuario.ativo ? 'Ativo' : 'Inativo'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🚀 Você já pode fazer login na aplicação!');
    console.log('');
    console.log('⚠️  IMPORTANTE: Este usuário ainda NÃO tem permissões.');
    console.log(
      '   Você precisa criar um CARGO com permissões e atribuir ao usuário.',
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    process.exit(1);
  }
}

seedUser();
