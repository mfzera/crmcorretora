# Relatório LGPD — EcoTech Sys

> Gerado em: 2026-03-13

---

## 1. Mapeamento de Dados Pessoais

### Tabela de Dados Coletados

| Dado | Tabela | Categoria | Base Legal Sugerida |
|------|--------|-----------|---------------------|
| Nome completo | `usuario`, `cliente`, `oportunidade` | Pessoal | Contrato / Legítimo interesse |
| E-mail | `usuario`, `cliente`, `admin`, `oportunidade` | Pessoal | Contrato |
| Senha (hash bcrypt) | `usuario`, `admin` | Pessoal | Contrato |
| Telefone / Celular | `usuario`, `cliente`, `corretora`, `oportunidade` | Pessoal | Contrato |
| **CPF** | `cliente` | **Pessoal** | Contrato / Obrigação legal |
| **CNPJ** | `cliente`, `corretora` | Pessoal (PJ) | Contrato / Obrigação legal |
| **Data de nascimento** | `cliente` | **Pessoal** | Contrato / Obrigação legal |
| Endereço completo | `cliente_endereco`, `corretora` | Pessoal | Contrato / Obrigação legal |
| Foto de perfil (avatar) | `usuario` (chave R2) | Pessoal | Consentimento |
| **Endereço IP** | `audit_log`, `admin_audit_log` | Pessoal | Legítimo interesse (segurança) |
| User-Agent (browser) | `audit_log`, `admin_audit_log` | Operacional | Legítimo interesse (segurança) |
| Tokens Google OAuth | `google_calendar_token` | Pessoal | Consentimento |
| Tokens de sessão/portal | `portal_segurado_token`, `password_reset_token` | Operacional | Contrato |
| Conteúdo de mensagens | `mensagensChat` | Pessoal | Contrato |
| Texto extraído de PDFs | `anexo.textoExtraido` | **Potencialmente sensível** | Contrato |
| Dados de eventos do Google | Via API Calendar | Pessoal | Consentimento |
| Dados de pagamento | Stripe (terceiro) | Pessoal (financeiro) | Contrato |
| Logs de acesso/alteração | `audit_log` (dadosAnteriores/dadosNovos JSONB) | Pessoal | Legítimo interesse (segurança) |

### Classificação

**Dados Pessoais Simples:** nome, e-mail, telefone, endereço
**Dados Pessoais Qualificados:** CPF, CNPJ, data de nascimento, IP, foto
**Dados Sensíveis potenciais:** texto extraído de documentos/PDFs (pode conter saúde, documentos, etc.)
**Dados Operacionais:** tokens de sessão, hashes de senha, user-agent, permissões
**Dados de Terceiros (suboperadores):** Stripe (pagamento), SendGrid (e-mail), Google (calendar/reCAPTCHA), Cloudflare R2, Neon, Railway

---

## 2. Mapa de Fluxo de Dados

```
ENTRADAS
├── Formulário de cadastro corretora → POST /api/auth/register-corretora
│   └── DB: corretora + usuario (admin inicial)
├── Login → POST /api/auth/login
│   ├── reCAPTCHA token → Google API (IP incluído implicitamente)
│   └── JWT (nome, e-mail, permissões) → localStorage do browser
├── Cadastro de cliente → POST /api/clientes
│   └── DB: cliente + cliente_endereco + cliente_contato
├── Portal Segurado → POST /api/portal/auth/login
│   └── CPF/CNPJ + data nasc. → DB: portal_segurado_token
├── Upload de arquivo → POST /api/anexos
│   └── R2/MinIO (binário) + DB: anexo (metadados + texto extraído)
└── Google Calendar → OAuth callback
    └── DB: google_calendar_token (accessToken + refreshToken)

ARMAZENAMENTO
├── PostgreSQL (Neon) — todos os dados estruturados
├── Cloudflare R2 — avatares e anexos (acesso via signed URL)
└── Browser localStorage — JWT tokens de autenticação

PROCESSAMENTO
├── bcrypt — hash de senhas (custo 10)
├── PDF text extraction — textoExtraido armazenado em anexo
├── audit_log — captura ip+userAgent+dados anteriores/novos em toda modificação
└── Google Calendar API — leitura de eventos/tarefas do usuário

SAÍDAS (terceiros)
├── SendGrid — recebe nome + e-mail + link para e-mails transacionais
├── Stripe — recebe dados da empresa + pagamento
├── Google reCAPTCHA — recebe token + IP do usuário
├── Google Calendar API — recebe/envia dados de calendário
├── Cloudflare, Neon, Railway, Vercel — métricas operacionais (sem dados de usuários)
└── APIs de consulta FIPE/CEP — recebem apenas dados não pessoais
```

---

## 3. Riscos de Não Conformidade Identificados

### Críticos

| # | Risco | Local | Detalhe |
|---|-------|-------|---------|
| C1 | **CPF armazenado em plaintext** | `cliente.cpf` | CPF sem criptografia em repouso |
| C2 | **Sem endpoint de exclusão de conta/dados** | Toda a API | Política cita direito à exclusão, mas não há `DELETE /usuarios/:id` ou `DELETE /clientes/:id` funcional |
| C3 | **IP e nome/e-mail retidos indefinidamente no audit_log** | `audit_log` | Sem política de purge — retém IP + nome + e-mail indefinidamente |
| C4 | **Texto extraído de PDFs sem controle** | `anexo.textoExtraido` | Pode conter dados sensíveis (saúde, financeiro) sem tratamento diferenciado |
| C5 | **JWT em localStorage vulnerável a XSS** | Browser | httpOnly cookies resistiriam a XSS; localStorage não |

### Médios

| # | Risco | Local | Detalhe |
|---|-------|-------|---------|
| M1 | **Consentimento explícito não registrado** | Cadastro | Nenhuma tabela registra aceite de termos/cookies com timestamp |
| M2 | **Tokens Google OAuth sem rotação documentada** | `google_calendar_token` | Refresh tokens armazenados sem política de revogação |
| M3 | **Tokens de reset expirados não removidos** | `password_reset_token` | Sem job de limpeza, acumula dados desnecessários |
| M4 | **Nenhum DPA com suboperadores** | Stripe, SendGrid, Google | LGPD exige contrato formal com operadores de dados |
| M5 | **Portal Segurado autentica com CPF + data nasc.** | `portal-segurado` | Combo fraco para autenticação — sem 2FA |
| M6 | **Dados de oportunidades (prospects) sem base legal explícita** | `oportunidade` | Dados de não-clientes com nome, e-mail, telefone |

### Positivos (já conforme)

- Senhas com bcrypt (custo 10)
- JWT com expiração (8h) + refresh token (7d)
- Soft delete com `deletedAt` preserva histórico para auditoria
- Audit log abrangente de todas as alterações
- reCAPTCHA v3 contra força bruta
- RBAC com permissões granulares
- Isolamento multi-tenant por `corretoraId`
- Signed URLs para acesso a arquivos privados
- Política de Privacidade e Cookies já existem

---

## 4. Plano de Adequação LGPD

### Etapa 1 — Documentação Jurídica

1. **Revisar a Política de Privacidade** para incluir:
   - DPO (Encarregado de Dados) com nome e contato
   - Lista explícita de suboperadores (Stripe, SendGrid, Google, Cloudflare, Neon, Railway)
   - Base legal para cada categoria de dado
   - Tempo de retenção específico por tipo de dado
   - Procedimento para exercício de direitos (resposta em até 15 dias)

2. **Revisar os Termos de Uso** para incluir:
   - Descrição do serviço como tratamento de dados de seguros
   - Responsabilidade do usuário (corretora) pelos dados de clientes inseridos
   - Modelo de responsabilidade: EcoTech = **operador**, corretora = **controlador**

3. **Atualizar Política de Cookies** para incluir:
   - Mencionar localStorage como mecanismo equivalente a cookie funcional
   - Banner de consentimento com opt-out real

4. **Nomear um DPO (Encarregado)** — obrigatório pela LGPD para SaaS B2B

5. **Elaborar DPA** com Stripe, SendGrid, Google (verificar se já possuem contratos padrão LGPD/GDPR)

### Etapa 2 — Adequação Técnica

**Prioridade Alta:**

```
[ ] C2 — Implementar endpoint DELETE /api/usuarios/:id (exclusão real ou anonimização)
[ ] C2 — Implementar endpoint DELETE /api/clientes/:id com anonimização de dados
[ ] C3 — Implementar job de purge de audit_log (IPs e PII após 90 dias)
[ ] M1 — Criar tabela consent_log para registrar aceite de termos com timestamp + IP + versão
[ ] M3 — Criar job de cleanup de tokens expirados (password_reset_token, portal_segurado_token)
```

**Prioridade Média:**

```
[ ] C1 — Avaliar criptografia de CPF/CNPJ em repouso (AES-256 no campo ou column encryption)
[ ] C4 — Implementar política de retenção para textoExtraido em anexos
[ ] C5 — Migrar autenticação de localStorage para httpOnly cookies
[ ] M2 — Implementar revogação de tokens Google Calendar na exclusão de conta
[ ] M5 — Adicionar 2FA ou PIN para Portal Segurado
```

**Prioridade Baixa:**

```
[ ] Implementar endpoint GET /api/usuarios/:id/exportar-dados (portabilidade LGPD Art. 18)
[ ] Adicionar rate limiting específico para endpoints com CPF/CNPJ
[ ] Implementar data masking nos logs de aplicação
```

### Etapa 3 — Governança de Dados

**Registro de Operações de Tratamento (ROPA):**

| Operação | Controlador | Operador | Base Legal | Retenção |
|----------|-------------|----------|------------|----------|
| Cadastro de usuário | Corretora | EcoTech | Contrato | Duração do contrato + 5 anos |
| Cadastro de cliente (segurado) | Corretora | EcoTech | Contrato / Obrigação legal | 10 anos (legislação de seguros) |
| Autenticação / logs de acesso | Corretora | EcoTech | Legítimo interesse | 90 dias |
| Envio de e-mail transacional | EcoTech | SendGrid | Contrato | Não armazenado |
| Processamento de pagamento | EcoTech | Stripe | Contrato | Conforme regulação financeira |
| Google Calendar (opt-in) | Usuário | Google / EcoTech | Consentimento | Até revogação |
| Texto extraído de PDF | Corretora | EcoTech | Contrato | Duração do documento |

---

## 5. Checklist Técnico para Desenvolvedores

### Banco de Dados
```
[ ] Adicionar tabela consent_log (userId, tipo, versao, ip, timestamp, aceito)
[ ] Adicionar campo retencaoAte (data de expiração) em audit_log
[ ] Adicionar campo anonimizadoEm em usuario e cliente
[ ] Criar migration com índice em audit_log.createdAt para purge eficiente
[ ] Avaliar pg_crypto (pgcrypto) para criptografia de CPF em repouso
```

### API / Backend
```
[ ] DELETE /api/usuarios/:id → anonimiza nome/email/telefone/avatar, mantém IDs relacionais
[ ] DELETE /api/clientes/:id → verifica obrigação legal (apólices ativas?), anonimiza ou bloqueia
[ ] GET /api/usuarios/:id/dados → exporta todos os dados do usuário (portabilidade)
[ ] POST /api/consentimentos → registra aceite de termos/cookies
[ ] Cron job: purge audit_log WHERE createdAt < NOW() - INTERVAL '90 days'
[ ] Cron job: DELETE password_reset_token WHERE expiresAt < NOW()
[ ] Cron job: DELETE portal_segurado_token WHERE expiresAt < NOW()
[ ] Adicionar header X-Request-ID em todas as responses para rastreabilidade
[ ] Não logar CPF/CNPJ em application logs
[ ] Validar que GET /clientes aplica filtro de corretoraId em TODAS as queries
```

### Frontend
```
[ ] Banner de consentimento de cookies com opções granulares (essencial/funcional/analytics)
[ ] Tela "Meus Dados" para usuário ver, exportar e solicitar exclusão
[ ] Checkbox de aceite de Termos + Política na tela de cadastro (não pré-marcado)
[ ] Tela no Portal Segurado com opção de solicitar exclusão de dados
[ ] Considerar migração de localStorage para httpOnly cookies
```

### DevOps / Segurança
```
[ ] Configurar backup criptografado com retenção máxima de 30 dias
[ ] Habilitar SSL/TLS 1.3 em todos os endpoints
[ ] Configurar alertas para tentativas de acesso massivo a dados de clientes
[ ] Documentar quais secrets estão no Railway e quem tem acesso
[ ] Garantir que R2 bucket não é público (verificar ACL)
[ ] Scan automático de secrets em CI (git-secrets ou trufflehog)
```

---

## 6. Estrutura das Páginas Legais

### Política de Privacidade (`/privacidade`)
```
1. Quem somos (Controlador vs. Operador)
2. Quais dados coletamos e por quê
3. Base legal para cada tratamento
4. Com quem compartilhamos (suboperadores com links para políticas deles)
5. Por quanto tempo armazenamos (tabela de retenção)
6. Seus direitos (LGPD Art. 18)
7. Como exercer seus direitos (formulário/e-mail, prazo de 15 dias)
8. Cookies e tecnologias similares (link para Política de Cookies)
9. Segurança dos dados
10. Transferência internacional (Stripe/SendGrid/Google — EUA)
11. Encarregado (DPO) — nome e contato obrigatórios
12. Data de vigência e histórico de versões
```

### Termos de Uso (`/termos`)
```
1. Aceitação dos termos
2. Descrição do serviço
3. Cadastro e responsabilidades do usuário
4. Responsabilidade pelos dados inseridos (corretora é controladora dos dados dos clientes)
5. Uso aceitável
6. Propriedade intelectual
7. Disponibilidade e SLA
8. Pagamento e planos
9. Suspensão e cancelamento
10. Exportação de dados ao cancelar
11. Limitação de responsabilidade
12. Lei aplicável (Brasil) e foro (definir cidade)
```

### Política de Cookies (`/cookies`)
```
1. O que são cookies e tecnologias similares (incluir localStorage)
2. Tabela de cookies por categoria:
   - Essenciais (necessários para funcionamento)
   - Funcionais (preferências, como tema)
   - Analytics (métricas anônimas)
3. Cookies de terceiros (Google reCAPTCHA, analytics)
4. Como gerenciar cookies
5. Contato para dúvidas
```

---

## 7. Roadmap de Implementação

### Sprint 1 — Fundação Legal (imediato, sem código)
- [ ] Nomear DPO (Encarregado de Dados)
- [ ] Atualizar Política de Privacidade com DPO, suboperadores e bases legais
- [ ] Verificar/assinar DPA com Stripe, SendGrid, Google Workspace
- [ ] Criar ROPA (Registro de Operações de Tratamento) — planilha interna

### Sprint 2 — Consentimento e Direitos (1-2 semanas)
- [ ] Tabela `consent_log` + endpoint POST /api/consentimentos
- [ ] Checkbox de aceite no cadastro (não pré-marcado)
- [ ] Banner de cookies no frontend
- [ ] Endpoint GET /api/usuarios/:id/dados (portabilidade)

### Sprint 3 — Exclusão e Anonimização (2-3 semanas)
- [ ] Endpoint DELETE /api/usuarios/:id com anonimização
- [ ] Endpoint DELETE /api/clientes/:id com verificação de obrigação legal
- [ ] Tela "Meus Dados" no perfil do usuário
- [ ] Tela de solicitação de exclusão no Portal Segurado

### Sprint 4 — Retenção e Limpeza (1-2 semanas)
- [ ] Cron jobs de purge: audit_log (90 dias), tokens expirados
- [ ] Campo `retencaoAte` em audit_log
- [ ] Job de anonimização de IPs em logs após 45 dias

### Sprint 5 — Segurança Avançada (3-4 semanas)
- [ ] Avaliar criptografia de CPF/CNPJ (impacto em performance/busca)
- [ ] Migrar auth para httpOnly cookies
- [ ] 2FA / PIN reforçado no Portal Segurado
- [ ] Rate limiting em endpoints sensíveis (CPF, login portal)

---

## 8. Sugestões de Segurança Adicionais

| Sugestão | Impacto | Esforço |
|----------|---------|---------|
| Migrar tokens para httpOnly cookies | Alto (reduz XSS) | Médio |
| Criptografar CPF com AES-256 em repouso | Alto (protege breach) | Médio-Alto |
| Implementar SIEM/alertas de acesso anômalo | Médio | Médio |
| Content Security Policy (CSP) no frontend | Médio (reduz XSS) | Baixo |
| Habilitar `Strict-Transport-Security` header | Médio | Baixo |
| `SameSite=Strict` em cookies futuros | Médio (CSRF) | Baixo |
| Auditoria periódica de permissões por corretora | Alto (governança) | Baixo |
| Mascarar CPF/e-mail nos logs de aplicação | Alto (compliance) | Baixo |
| Scan automático de secrets em CI (git-secrets, trufflehog) | Alto | Baixo |

---

## Resumo Executivo

O sistema está **bem arquitetado do ponto de vista de segurança** (bcrypt, JWT, RBAC, audit log, multi-tenant), mas tem **lacunas importantes para LGPD**.

**Os 3 itens mais críticos para resolver primeiro:**

1. **Implementar exclusão/anonimização de dados** — direito garantido pela LGPD e prometido na política, mas sem implementação técnica
2. **Registrar consentimento formalmente** — criar `consent_log` para provar que o titular aceitou os termos
3. **Definir e implementar política de retenção** — especialmente para `audit_log` que retém IP + PII indefinidamente

O modelo **EcoTech como operador / corretora como controladora** é tecnicamente correto e deve ser formalizado nos Termos de Uso e no contrato com as corretoras.
