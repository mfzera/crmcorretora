# Melhorias do Kanban

## 1. Modal "Retrabalhar Lead" ao mover para Perdido

**Trigger:** Quando um card é arrastado para a coluna "Perdida" (ou ao clicar em "Perder"), em vez de executar imediatamente, abre um modal com dois passos.

**Passo 1 — Modal de confirmação de perda:**
- Campos obrigatórios já existentes: `motivoPerda` + `detalhesPerda`
- Nova pergunta no final: **"Deseja agendar recontato futuro?"** (sim/não)
- Se sim → avança para o passo 2
- Se não → confirma a perda normalmente

**Passo 2 — Agendamento de recontato:**
- Campo `dataRecontato` (date picker)
- Campo opcional de observação: "O que mudou / por que tentar novamente?"
- Ao confirmar: salva a perda E cria um evento na agenda do tipo `"tarefa"` para aquela data

**Impacto no backend:**
- Endpoint `POST /oportunidades/:id/perder` recebe campo novo opcional: `dataRecontato`
- Se `dataRecontato` presente → cria entrada na tabela de tarefas/eventos do calendário vinculada ao `oportunidadeId`
- O card fica na coluna Perdida, mas aparece no calendário na data escolhida

---

## 2. Datas nos Cards (para exibição na Agenda)

**O que falta:** O model `Oportunidade` já tem `dataVencimento` e `dataUltimoContato` no banco, mas não aparece nos cards nem no calendário.

**Cards no Kanban:**
- Exibir badge de data em cards que têm `dataVencimento` próxima (ex: ≤7 dias → amarelo, vencida → vermelho)
- Exibir "Último contato: X dias atrás" em tooltip ou rodapé do card

**Calendário (`GET /calendario`):**
- Adicionar um novo tipo de evento `"oportunidade"` nas categorias
- Fonte: oportunidades com `dataVencimento` no mês filtrado (status ≠ `ganha` e ≠ `perdida`)
- Também incluir as recontatos agendadas (do item 1)
- Filtro de categoria "Oportunidades" adicionado no sidebar do calendário

**Campos no card (visual):**
```
[ícone calendário] Vence em 3 dias   ← badge de alerta
[ícone relógio]  Contato há 5 dias   ← info discreta
```

---

## 3. Vincular "Ganho" ao Sistema de Renovações

**Fluxo atual:** `POST /oportunidades/:id/fechar` salva `status='ganha'`, `valorFechado`, `dataFechamento` — e para por aí.

**Fluxo proposto:**

Ao fechar como "Ganha", o modal de fechamento ganha uma seção extra:

- **"Gerar apólice/documento de venda?"** (checkbox, marcado por padrão)
  - Se sim: campos `numeroProposta`, `seguradora`, `dataVigenciaInicio`, `dataVigenciaFim`, `premioFinal`
  - Isso cria um `DocumentoVenda` vinculado ao cliente

- **"Criar renovação automática?"** (checkbox, aparece se gerou documento)
  - Se sim: calcula `dataVencimento = dataVigenciaFim` e cria automaticamente uma `RenovacaoComercial` com:
    - `documentoVendaAnteriorId` = o documento recém criado
    - `status = 'NAO_TRABALHADO'`
    - `premioAnterior`, `vendedorId`, `clienteId` herdados
    - A renovação aparece no kanban de renovações e no calendário na data de vencimento

**Backend:**
- `POST /oportunidades/:id/fechar` passa a aceitar payload expandido
- Internamente: cria `DocumentoVenda` → cria `RenovacaoComercial` → retorna IDs criados
- Tudo em uma única transação de banco (rollback seguro)

**Visibilidade:**
- No card "Ganho" exibir badge "Apólice gerada" ou "Renovação em YYYY-MM"
- O gestor vê no dashboard de renovações a entrada já agendada

---

## Resumo de impacto por camada

| Camada | Item 1 (Perdido + Recontato) | Item 2 (Datas nos cards) | Item 3 (Ganho → Renovação) |
|--------|------------------------------|--------------------------|----------------------------|
| Banco | + `dataRecontato` em oportunidades | sem mudança (campos já existem) | já existe `RenovacaoComercial` |
| API | `/perder` + criação de tarefa | `/calendario` + tipo oportunidade | `/fechar` expandido |
| Frontend | Novo modal 2-passos | Badge datas no card + filtro agenda | Modal fechamento expandido |
