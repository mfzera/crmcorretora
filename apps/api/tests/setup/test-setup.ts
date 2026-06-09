import { db } from '@ecotech/shared/database';
import { sql } from 'drizzle-orm';

/**
 * Trunca todas as tabelas mutáveis entre testes.
 * NÃO trunca: plano, permissao_global, cargo_template, cargo_template_permissao
 * (dados de referência inseridos pelas migrations).
 */
export async function cleanDatabase() {
  await db.execute(sql`
    TRUNCATE TABLE
      admin,
      admin_audit_log,
      anexo,
      audit_log,
      auditoria_permissao,
      backup,
      backup_schedule,
      canal_chat,
      canal_membro,
      cargo_permissao,
      cargo,
      chat_digitando,
      cliente_contato,
      cliente_endereco,
      cliente,
      cotacao_vendedor,
      cotacao,
      documento_venda,
      endosso,
      equipe,
      historico_documento_venda,
      invoice,
      mensagem_chat,
      mensagem_leitura,
      mensagem_mencao,
      mensagem_reacao,
      notificacao,
      oportunidade_transferencia,
      oportunidade,
      transferencia_renovacao_itens,
      transferencia_renovacoes,
      password_reset_token,
      produto,
      proposta_comercial,
      renovacao_comercial,
      seat_usage_history,
      seguradoras_parceiras,
      storage_limit,
      storage_metric,
      subscription,
      tarefa,
      usuario_corretora,
      usuario,
      corretora,
      changelog_items,
      changelogs,
      consent_log,
      portal_segurado_token,
      portal_cotacao_solicitacoes,
      documentos_apolice,
      roadmap_items,
      roadmap_phases,
      plano
    RESTART IDENTITY CASCADE
  `);
}
