-- Script para verificar dados do CRM

-- 1. Verificar usuários com cargos
SELECT
    u.id,
    u.nome,
    u.email,
    c.nome_cargo,
    c.is_vendedor,
    c.is_gestor,
    c.is_admin
FROM usuario u
LEFT JOIN cargo c ON u.cargo_id = c.id
WHERE u.deleted_at IS NULL
ORDER BY c.is_gestor DESC, c.is_vendedor DESC;

-- 2. Verificar total de oportunidades
SELECT
    COUNT(*) as total_oportunidades,
    status,
    COUNT(DISTINCT vendedor_id) as vendedores_diferentes
FROM oportunidade
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY status;

-- 3. Verificar oportunidades por vendedor
SELECT
    u.nome as vendedor,
    u.email,
    COUNT(o.id) as total_oportunidades,
    COUNT(CASE WHEN o.status = 'lead' THEN 1 END) as leads,
    COUNT(CASE WHEN o.status = 'qualificada' THEN 1 END) as qualificadas,
    COUNT(CASE WHEN o.status = 'ganha' THEN 1 END) as ganhas
FROM usuario u
LEFT JOIN oportunidade o ON u.id = o.vendedor_id AND o.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.nome, u.email
HAVING COUNT(o.id) > 0
ORDER BY total_oportunidades DESC;

-- 4. Verificar se há vendedores sem oportunidades
SELECT
    u.nome,
    u.email,
    c.nome_cargo,
    c.is_vendedor,
    c.is_gestor
FROM usuario u
LEFT JOIN cargo c ON u.cargo_id = c.id
LEFT JOIN oportunidade o ON u.id = o.vendedor_id AND o.deleted_at IS NULL
WHERE u.deleted_at IS NULL
    AND (c.is_vendedor = true OR c.is_gestor = true)
    AND o.id IS NULL
ORDER BY u.nome;
