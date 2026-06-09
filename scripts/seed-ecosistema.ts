import 'dotenv/config';
import { db } from '../libs/shared/database/src/connection.js';
import {
  corretoras,
  usuarios,
  usuarioCorretora,
  planos,
  cargos,
  cargoPermissoes,
  permissoesGlobais,
} from '../libs/shared/database/src/schema/index.js';
import bcryptjs from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function seedEcosistema() {
  console.log('🌱 Criando Corretora Ecosistema e Usuário Dono...');
  console.log('');

  try {
    // 1. Buscar ou criar plano Enterprise
    console.log('📋 Verificando plano Enterprise...');
    let plano = await db.query.planos.findFirst({
      where: eq(planos.nomePlano, 'Enterprise'),
    });

    if (!plano) {
      console.log('📋 Criando plano Enterprise...');
      const [novoPlano] = await db
        .insert(planos)
        .values({
          nomePlano: 'Enterprise',
          descricao: 'Plano ilimitado para grandes operações',
          limiteUsuarios: null,
          limiteVendedores: null,
          limiteClientes: null,
          limiteVendasMes: null,
          valorMensal: '1999.00',
          valorAnual: '19990.00',
          features: {
            api_access: true,
            relatorios_avancados: true,
            suporte_prioritario: true,
            integracao_customizada: true,
          },
          ativo: true,
        })
        .returning();
      plano = novoPlano;
      console.log('✅ Plano Enterprise criado!');
    } else {
      console.log('✅ Plano Enterprise encontrado!');
    }

    // 2. Criar Corretora Ecosistema
    console.log('');
    console.log('🏢 Criando corretora Ecosistema...');
    const [corretora] = await db
      .insert(corretoras)
      .values({
        razaoSocial: 'Ecosistema Gestao e Corretagem de Seguros Ltda.',
        nomeFantasia: 'Ecosistema Seguros',
        cnpj: '09209036000154',
        subdominio: 'grupoecosistema',
        emailContato: 'ecotech@grupoecosistema.com.br',
        telefone: null,
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
          razaoSocial: 'Ecosistema Gestao e Corretagem de Seguros Ltda.',
          nomeFantasia: 'Ecosistema Seguros',
          emailContato: 'ecotech@grupoecosistema.com.br',
          subdominio: 'grupoecosistema',
          status: 'ATIVO',
        },
      });

    console.log(`✅ Corretora criada: ${corretora.nomeFantasia}`);
    console.log(`   ID: ${corretora.id}`);
    console.log(`   CNPJ: ${corretora.cnpj}`);
    console.log(`   Subdomínio: ${corretora.subdominio}`);

    // 3. Criar cargo de Dono/Administrador com TODAS as permissões
    console.log('');
    console.log('👑 Criando cargo "Dono da Corretora"...');

    // Buscar todas as permissões globais
    const todasPermissoes = await db.query.permissoesGlobais.findMany();
    console.log(`   Encontradas ${todasPermissoes.length} permissões globais`);

    const [cargoDono] = await db
      .insert(cargos)
      .values({
        corretoraId: corretora.id,
        nomeCargo: 'Dono da Corretora',
        descricao: 'Acesso total ao sistema. Todas as permissões habilitadas.',
        cor: '#dc2626',
        isAdmin: true,
        isGestor: true,
        isVendedor: false,
      })
      .returning()
      .onConflictDoUpdate({
        target: [cargos.corretoraId, cargos.nomeCargo],
        set: {
          descricao:
            'Acesso total ao sistema. Todas as permissões habilitadas.',
          isAdmin: true,
          isGestor: true,
        },
      });

    console.log(
      `✅ Cargo criado: ${cargoDono.nomeCargo} (ID: ${cargoDono.id})`,
    );

    // Associar todas as permissões ao cargo de Dono
    console.log('   Associando todas as permissões ao cargo...');
    for (const permissao of todasPermissoes) {
      await db
        .insert(cargoPermissoes)
        .values({
          cargoId: cargoDono.id,
          permissaoGlobalId: permissao.id,
        })
        .onConflictDoNothing();
    }
    console.log(`✅ ${todasPermissoes.length} permissões associadas ao cargo!`);

    // 4. Hash da senha
    console.log('');
    console.log('🔐 Gerando hash da senha...');
    const senhaHash = await bcryptjs.hash('Eco@2026', 10);

    // 5. Criar Usuário Dono
    console.log('');
    console.log('👤 Criando usuário Ivandor Alves de Lima...');
    const [usuario] = await db
      .insert(usuarios)
      .values({
        nome: 'Ivandor Alves de Lima',
        email: 'ivandro@grupoecosistema.com.br',
        passwordHash: senhaHash,
        corretoraId: corretora.id,
        corretoraAtivaId: corretora.id,
        cargoId: cargoDono.id,
        ativo: true,
        primeiroAcesso: false,
      })
      .returning()
      .onConflictDoUpdate({
        target: [usuarios.corretoraId, usuarios.email],
        set: {
          nome: 'Ivandor Alves de Lima',
          passwordHash: senhaHash,
          cargoId: cargoDono.id,
          corretoraAtivaId: corretora.id,
          ativo: true,
        },
      });

    console.log(`✅ Usuário criado: ${usuario.nome}`);
    console.log(`   ID: ${usuario.id}`);
    console.log(`   Email: ${usuario.email}`);

    // 6. Criar vínculo usuario_corretora
    console.log('');
    console.log('🔗 Criando vínculo usuario_corretora...');
    await db
      .insert(usuarioCorretora)
      .values({
        usuarioId: usuario.id,
        corretoraId: corretora.id,
        cargoId: cargoDono.id,
        ativo: true,
      })
      .onConflictDoNothing();
    console.log('✅ Vínculo criado!');

    // 6. Resumo final
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 SETUP COMPLETO - ECOSISTEMA SEGUROS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('🏢 CORRETORA:');
    console.log(`   Razão Social:  ${corretora.razaoSocial}`);
    console.log(`   Nome Fantasia: ${corretora.nomeFantasia}`);
    console.log(`   CNPJ:          ${corretora.cnpj}`);
    console.log(`   Subdomínio:    ${corretora.subdominio}.ecotech.com.br`);
    console.log(`   Email:         ${corretora.emailContato}`);
    console.log(`   Plano:         ${plano.nomePlano}`);
    console.log(`   Status:        ${corretora.status}`);
    console.log('');
    console.log('👤 USUÁRIO DONO:');
    console.log(`   Nome:          ${usuario.nome}`);
    console.log(`   Email:         ${usuario.email}`);
    console.log(`   Senha:         Eco@2026`);
    console.log(`   Cargo:         ${cargoDono.nomeCargo}`);
    console.log(
      `   Permissões:    TODAS (${todasPermissoes.length} permissões)`,
    );
    console.log(`   Status:        ${usuario.ativo ? 'Ativo' : 'Inativo'}`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('🚀 PRÓXIMOS PASSOS:');
    console.log(
      '   1. Acesse o sistema em: https://grupoecosistema.ecotech.com.br',
    );
    console.log('   2. Faça login com as credenciais acima');
    console.log('   3. Crie cargos e usuários adicionais conforme necessário');
    console.log('   4. Configure produtos e seguradoras parceiras');
    console.log('');
    console.log('✅ Sistema pronto para uso!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ ERRO ao criar corretora e usuário:');
    console.error(error);
    console.error('');
    process.exit(1);
  }
}

seedEcosistema();
