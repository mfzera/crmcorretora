/**
 * Postbuild SEO prerender script.
 *
 * For each public static route, copies dist/client/index.html and injects
 * route-specific <title>, <meta name="description">, <link rel="canonical">
 * and a <noscript> block with the page H1 so non-JS crawlers can read them.
 *
 * Run after `vite build`:  node scripts/prerender-seo.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = join(__dirname, '../dist/client');
const template = readFileSync(join(distDir, 'index.html'), 'utf-8');

const BASE_URL = 'https://ecotechts.com.br';

/** @type {Array<{path: string, title: string, description: string, h1: string}>} */
const routes = [
  {
    path: '/',
    title: 'Ecotech CRM - CRM para Corretoras de Seguros',
    description:
      'Sistema CRM completo para corretoras de seguros. Gerencie cotações, propostas, renovações e sua equipe em um único lugar. Teste grátis por 7 dias.',
    h1: 'CRM completo para sua corretora de seguros',
  },
  {
    path: '/sobre',
    title: 'Sobre a Ecotech - Nossa História e Missão',
    description:
      'Conheça a Ecotech e nossa missão de modernizar a gestão de corretoras de seguros no Brasil com tecnologia simples e eficiente.',
    h1: 'Sobre a Ecotech',
  },
  {
    path: '/precos',
    title: 'Preços e Planos - Ecotech CRM',
    description:
      'Planos acessíveis para corretoras de todos os tamanhos. Plano único com preço por usuário ativo. Teste grátis por 7 dias, sem cartão de crédito.',
    h1: 'Plano único, simples e justo',
  },
  {
    path: '/funcionalidades',
    title: 'Funcionalidades - Ecotech CRM',
    description:
      'Gestão de clientes PF e PJ, cotações, propostas, renovações automáticas, kanban de oportunidades, métricas e chat em uma única plataforma.',
    h1: 'Funcionalidades Completas',
  },
  {
    path: '/treinamentos',
    title: 'Treinamentos - Plataforma de Capacitação - Ecotech CRM',
    description:
      'Plataforma de e-learning integrada ao Ecotech CRM. Treine sua equipe com vídeos, quizzes e certificados digitais.',
    h1: 'Capacite sua equipe',
  },
  {
    path: '/roadmap',
    title: 'Roadmap - Próximas Funcionalidades - Ecotech CRM',
    description:
      'Acompanhe o que está por vir na Ecotech CRM. Veja nossas prioridades de desenvolvimento e as funcionalidades planejadas para os próximos meses.',
    h1: 'Roadmap',
  },
  {
    path: '/changelog',
    title: 'Changelog - Atualizações e Melhorias - Ecotech CRM',
    description:
      'Acompanhe todas as novidades, correções e melhorias lançadas na plataforma Ecotech CRM. Histórico completo de versões.',
    h1: 'Atualizações',
  },
  {
    path: '/contato',
    title: 'Contato - Fale com a Ecotech CRM',
    description:
      'Entre em contato com o time da Ecotech CRM. Suporte por email e WhatsApp, atendimento de segunda a sexta das 9h às 18h.',
    h1: 'Entre em Contato',
  },
  {
    path: '/blog',
    title: 'Blog - Ecotech CRM',
    description:
      'Artigos, dicas e novidades sobre CRM para corretoras de seguros. Aprenda a otimizar seu processo de vendas e gestão de clientes.',
    h1: 'Blog',
  },
  {
    path: '/checkout',
    title: 'Criar Conta - Ecotech CRM',
    description:
      'Comece seu teste gratuito de 7 dias no Ecotech CRM. Configure sua conta e comece a gerenciar sua corretora de seguros agora.',
    h1: 'Criar sua Conta',
  },
  {
    path: '/termos',
    title: 'Termos de Serviço - Ecotech CRM',
    description: 'Leia os termos de uso da plataforma Ecotech CRM.',
    h1: 'Termos de Uso',
  },
  {
    path: '/privacidade',
    title: 'Política de Privacidade - Ecotech CRM',
    description:
      'Como a Ecotech trata seus dados pessoais em conformidade com a LGPD. Política de privacidade completa e transparente.',
    h1: 'Política de Privacidade',
  },
  {
    path: '/lgpd',
    title: 'LGPD - Lei Geral de Proteção de Dados - Ecotech CRM',
    description:
      'Saiba como a Ecotech CRM cumpre a Lei Geral de Proteção de Dados (Lei n. 13.709/2018). Seus direitos e como exercê-los.',
    h1: 'Lei Geral de Proteção de Dados',
  },
  {
    path: '/cookies',
    title: 'Política de Cookies - Ecotech CRM',
    description:
      'Entenda como a Ecotech CRM utiliza cookies para melhorar sua experiência na plataforma. Quais cookies usamos e como gerenciá-los.',
    h1: 'Política de Cookies',
  },
  {
    path: '/docs',
    title: 'Documentação - Central de Ajuda - Ecotech CRM',
    description:
      'Central de ajuda e documentação da Ecotech CRM. Guias de primeiros passos, tutoriais de clientes, cotações, kanban, métricas e muito mais.',
    h1: 'Documentação',
  },
  {
    path: '/docs/primeiros-passos',
    title: 'Primeiros Passos - Guia de Início - Ecotech CRM',
    description:
      'Aprenda a criar sua conta, configurar sua corretora e começar a usar o Ecotech CRM em minutos. Guia completo para novos usuários.',
    h1: 'Primeiros Passos',
  },
  {
    path: '/docs/overview',
    title: 'Overview do Sistema - Ecotech CRM',
    description:
      'Conheça todos os módulos e funcionalidades do Ecotech CRM. Visão geral completa do sistema de gestão para corretoras de seguros.',
    h1: 'Overview do Sistema',
  },
  {
    path: '/docs/agenda',
    title: 'Agenda - Calendário e Tarefas - Ecotech CRM',
    description:
      'Guia do módulo de Agenda do Ecotech CRM. Gerencie tarefas, renovações e vencimentos em um calendário integrado.',
    h1: 'Agenda',
  },
  {
    path: '/docs/clientes',
    title: 'Gestão de Clientes - Ecotech CRM',
    description:
      'Guia completo para gerenciar clientes PF e PJ no Ecotech CRM. Cadastro, pesquisa, controle de vendedores e histórico de seguros.',
    h1: 'Gestão de Clientes',
  },
  {
    path: '/docs/cotacoes',
    title: 'Gestão de Cotações - Ecotech CRM',
    description:
      'Aprenda a criar e gerenciar cotações, propostas e documentos de venda no Ecotech CRM. Controle completo do processo comercial.',
    h1: 'Gestão de Cotações',
  },
  {
    path: '/docs/kanban',
    title: 'Kanban de Oportunidades - Ecotech CRM',
    description:
      'Como usar o board Kanban do Ecotech CRM para gerenciar seu pipeline de vendas. Da prospecção ao fechamento.',
    h1: 'Kanban de Oportunidades',
  },
  {
    path: '/docs/metricas',
    title: 'Métricas e Relatórios - Ecotech CRM',
    description:
      'Guia do módulo de métricas do Ecotech CRM. Acompanhe KPIs de vendas, conversão, receita e performance da sua corretora.',
    h1: 'Métricas e Relatórios',
  },
  {
    path: '/docs/performance',
    title: 'Performance de Vendedores - Ecotech CRM',
    description:
      'Como analisar a performance individual dos vendedores no Ecotech CRM. Rankings, metas e relatórios por consultor.',
    h1: 'Performance de Vendedores',
  },
  {
    path: '/docs/dashboard',
    title: 'Dashboard e Análises - Ecotech CRM',
    description:
      'Guia completo do Dashboard do Ecotech CRM. Visão em tempo real de pipeline, renovações, tarefas e indicadores da corretora.',
    h1: 'Dashboard e Análises',
  },
  {
    path: '/docs/configuracoes',
    title: 'Configurações do Sistema - Ecotech CRM',
    description:
      'Como configurar sua conta, equipe, permissões e preferências no Ecotech CRM. Guia completo de configurações do sistema.',
    h1: 'Configurações do Sistema',
  },
];

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml(route) {
  const canonical = `${BASE_URL}${route.path}`;
  let html = template;

  // Update <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(route.title)}</title>`);

  // Update meta description
  html = html.replace(
    /(<meta name="description" content=")[^"]*(")/,
    `$1${escapeHtml(route.description)}$2`,
  );

  // Inject canonical (or replace existing)
  if (/<link rel="canonical"/.test(html)) {
    html = html.replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${canonical}" />`,
    );
  } else {
    html = html.replace('</head>', `  <link rel="canonical" href="${canonical}" />\n  </head>`);
  }

  // Inject noscript block with H1 and description for non-JS crawlers
  const noscript = `<noscript><h1>${escapeHtml(route.h1)}</h1><p>${escapeHtml(route.description)}</p></noscript>`;
  html = html.replace('<div id="root"></div>', `${noscript}\n    <div id="root"></div>`);

  return html;
}

let count = 0;
for (const route of routes) {
  const html = buildHtml(route);
  const segments = route.path.replace(/^\//, '').split('/').filter(Boolean);

  let outPath;
  if (segments.length === 0) {
    // Root: overwrite index.html in place
    outPath = join(distDir, 'index.html');
  } else {
    const dir = join(distDir, ...segments);
    mkdirSync(dir, { recursive: true });
    outPath = join(dir, 'index.html');
  }

  writeFileSync(outPath, html, 'utf-8');
  count++;
}

console.log(`✓ SEO prerender: ${count} routes written to dist/client`);
