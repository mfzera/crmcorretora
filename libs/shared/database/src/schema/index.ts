// Enums
export * from './enums';
export * from './oportunidade';

// Governance Layer
export * from './plano';
export * from './corretora';
export * from './permissao';

// Billing & Subscription Layer
export * from './subscription';
export * from './invoice';
export * from './seat-usage-history';

// Sellers Layer
export * from './vendedor';

// Users and Access Layer
export * from './cargo';
export * from './cargo-template';
export * from './equipe';
export * from './usuario';
export * from './usuario-corretora';
export * from './usuario-subvendedor';
export * from './password-reset-token';
export * from './portal-segurado-token';
export * from './portal-cotacao-solicitacao';

// Products and Clients Layer
export * from './produto';
export * from './cliente';
export * from './seguradora-parceira';

// Commission Config Layer
export * from './corretora-comissao-config';
export * from './cargo-comissao-config';
export * from './usuario-comissao-config';
export * from './comissao-config-historico';
export * from './comissao-lancamento';

// Sales Layer (Core Business)
export * from './cotacao';
export * from './cotacao-vendedor';
export * from './cotacao-tag';
export * from './proposta';
export * from './documento-venda';

// Post-Sale Layer
export * from './endosso';
export * from './sinistro';
export * from './renovacao';
export * from './transferencia-renovacoes';

// Comments Layer (unified)
export * from './comentario';
export * from './importacao-renovacoes';
export * from './solicitacao-exclusao-renovacao';
export * from './solicitacao-exclusao-venda';
export * from './solicitacao-troca-vendedor';

// Audit Layer
export * from './audit-log';
export * from './consent-log';

// Notifications Layer
export * from './notificacao';

// Tasks Layer
export * from './tarefa';

// Integrations Layer
export * from './google-calendar-token';

// Chat Layer
export * from './chat';

// Storage Layer
export * from './anexo';
export * from './documentos-apolice';

// Admin Layer
export * from './admin';
export * from './storage-metrics';
export * from './backup';
export * from './changelog';
export * from './roadmap';
export * from './blog';

// Export tables explicitly for compatibility
export { storageLimits, storageMetrics } from './storage-metrics';
export { adminAuditLogs, admins } from './admin';
export { backups, backupSchedules } from './backup';
export { changelogs, changelogItems } from './changelog';
export { roadmapPhases, roadmapItems } from './roadmap';
export { blogPosts } from './blog';

// Workspace2 User Preferences Layer
export * from './workspace2-prefs';

// Kanban Config Layer
export * from './kanban-config';

// Gamification Layer
export * from './meta';
export * from './badge';
export * from './missao';
export * from './campanha';

// Cross-schema relations (exported last to avoid circular imports)
export * from './relations';
