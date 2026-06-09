/**
 * Campos internos que jamais devem sair em respostas de API.
 * Adicione aqui se novos campos sensíveis forem criados na tabela usuarios.
 */
const INTERNAL_FIELDS = ['avatarR2Key', 'senha', 'passwordHash'] as const;

type UserLike = Record<string, unknown>;

/**
 * Remove campos internos de um objeto de usuário e injeta avatarUrl
 * (já deve ter sido resolvida antes de chamar esta função).
 *
 * Uso:
 *   const { avatarR2Key, ...userClean } = rawUser;
 *   return sanitizeUser({ ...userClean, avatarUrl: await getAvatarUrl(avatarR2Key) });
 *
 * Ou para garantia extra num objeto já mapeado:
 *   return sanitizeUser(alreadyMappedUser);
 */
export function sanitizeUser<T extends UserLike>(user: T): Omit<T, (typeof INTERNAL_FIELDS)[number]> {
  const result = { ...user };
  for (const field of INTERNAL_FIELDS) {
    delete (result as any)[field];
  }
  return result as Omit<T, (typeof INTERNAL_FIELDS)[number]>;
}

/**
 * Aplica sanitizeUser a todos os itens de um array (null-safe).
 */
export function sanitizeUsers<T extends UserLike>(users: T[]): Omit<T, (typeof INTERNAL_FIELDS)[number]>[] {
  return users.map(sanitizeUser);
}
