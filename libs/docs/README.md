# 🌿 EcoTech - Sistema de Gestão para Seguradoras

Sistema SaaS Multi-Tenant completo para gestão de vendas e operações de seguradoras, desenvolvido com as mais modernas tecnologias do mercado.

---

## 📋 Sobre o Projeto

O **EcoTech** é uma plataforma robusta e escalável projetada para otimizar toda a operação de seguradoras, desde a cotação até a renovação de apólices. Com arquitetura multi-tenant, cada seguradora possui seu ambiente isolado e seguro, garantindo privacidade e personalização completa.

---

## ✨ Principais Funcionalidades

### 🔐 Autenticação e Autorização
- Sistema completo de autenticação com JWT
- Controle de acesso baseado em funções (RBAC)
- Gestão de usuários e permissões por seguradora
- Isolamento total entre tenants (seguradoras)

### 💼 Gestão de Clientes
- Cadastro completo de clientes
- Histórico de interações e vendas
- Gerenciamento de documentos e anexos
- Visualização de apólices ativas e histórico

### 📊 Cotações e Propostas
- Sistema inteligente de cotações
- Comparação entre diferentes produtos
- Geração automática de propostas
- Acompanhamento do status em tempo real

### 📝 Gestão de Produtos
- Catálogo completo de produtos de seguro
- Configuração de coberturas e valores
- Gestão de parceiros e seguradoras
- Regras de negócio personalizáveis

### 🔄 Endossos e Renovações
- Processamento automático de renovações
- Gestão de endossos e alterações de apólices
- Notificações automáticas de vencimento
- Acompanhamento de documentação

### 📁 Gestão Documental
- Upload e armazenamento seguro de documentos
- Organização por tipo e categoria
- Geração automática de documentos de venda
- Integração com armazenamento em nuvem (AWS S3/Cloudflare R2)

### 📈 Dashboard e Relatórios
- Visão geral de vendas e desempenho
- Métricas em tempo real
- Gráficos interativos
- Exportação de dados em múltiplos formatos

### 💬 Chat em Tempo Real
- Comunicação instantânea via WebSocket
- Histórico de conversas
- Notificações em tempo real
- Suporte a múltiplas conversas simultâneas

### 🎯 Sistema de Cotas e Limites
- Controle de limites por seguradora
- Gestão de cotas de usuários e recursos
- Validação automática de limites
- Alertas de uso

### 💳 Integração de Pagamentos
- Integração com Stripe
- Processamento seguro de pagamentos
- Gestão de assinaturas
- Histórico de transações

---

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript de alta performance
- **Fastify** - Framework web extremamente rápido e eficiente
- **TypeScript** - Tipagem estática para maior segurança
- **Drizzle ORM** - ORM moderno e type-safe
- **PostgreSQL** - Banco de dados relacional robusto
- **Redis & BullMQ** - Gerenciamento de filas e cache
- **WebSocket (ws)** - Comunicação em tempo real
- **JWT** - Autenticação segura

### Frontend
- **Next.js 16** - Framework React de última geração
- **React 19** - Biblioteca para interfaces modernas
- **TypeScript** - Desenvolvimento type-safe
- **Tailwind CSS** - Estilização utilitária e responsiva
- **Framer Motion** - Animações fluidas
- **Lucide Icons** - Ícones modernos e elegantes
- **Vercel Analytics** - Análise de performance

### Infraestrutura e DevOps
- **Nx Monorepo** - Gerenciamento de monorepo inteligente
- **AWS S3 / Cloudflare R2** - Armazenamento de arquivos
- **pnpm** - Gerenciador de pacotes eficiente
- **ESLint & Prettier** - Qualidade e padronização de código
- **Vitest** - Testes unitários rápidos

### Integrações
- **Stripe** - Processamento de pagamentos
- **AWS SDK** - Serviços em nuvem
- **PDF Parse** - Processamento de documentos
- **XLSX** - Manipulação de planilhas

---

## 🏗️ Arquitetura

O projeto utiliza uma arquitetura de **monorepo** organizada com Nx, dividida em:

### 📱 Aplicações
- **API** - Backend Fastify com todas as funcionalidades
- **Web** - Frontend Next.js para interface do usuário
- **Worker** - Processamento de tarefas em background

### 📦 Bibliotecas Compartilhadas

#### Features (Funcionalidades)
- Autenticação
- Gestão de Clientes
- Cotações e Propostas
- Produtos e Cargos
- Endossos e Renovações
- Documentos e Anexos
- Dashboard e Relatórios
- Seguradoras Parceiras

#### Plugins
- Autenticação JWT
- Autorização e RBAC
- Isolamento de Tenant
- Rate Limiting
- Chat em Tempo Real
- Validação de Cotas
- Tratamento de Erros

#### Shared (Compartilhado)
- Configurações
- Tipos TypeScript
- Componentes UI
- Utilitários
- Domínio
- Database (Schemas Drizzle)
- Storage (Gerenciamento de arquivos)

---

## 🚀 Características Técnicas

- ✅ **Multi-tenant** com isolamento completo de dados
- ✅ **Type-safe** em todo o stack (TypeScript)
- ✅ **Monorepo** organizado e escalável
- ✅ **API RESTful** documentada com Swagger
- ✅ **Real-time** com WebSocket
- ✅ **Cache** inteligente com Redis
- ✅ **Filas** de processamento assíncrono
- ✅ **Upload** de arquivos para nuvem
- ✅ **Segurança** com rate limiting e helmet
- ✅ **Performance** otimizada com lazy loading
- ✅ **Responsivo** e mobile-friendly
- ✅ **Escalável** horizontalmente

---

## 📄 Licença

Este projeto está sob a licença MIT.

---

## 🤝 Suporte

Para dúvidas ou suporte, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com 💚 pela equipe EcoTech**
