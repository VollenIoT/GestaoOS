/**
 * Utilitários de hashing e verificação de senha — compatível com browser / desktop (Web Crypto API).
 * Suporta migração progressiva: bcrypt (do servidor), SHA-256 local e texto puro legado.
 */

/**
 * Gera o hash SHA-256 de uma string e retorna como hex.
 * É assíncrona pois usa a Web Crypto API nativa do navegador/desktop.
 */
export async function hashPassword(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifica se uma string possui o formato de um hash bcrypt ($2a$, $2b$, $2y$).
 */
export function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

/**
 * Verifica se uma string parece ser um hash SHA-256 (64 caracteres hex).
 */
export function isSha256Hash(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}

/**
 * Alias compatível com versões legadas.
 */
export function isHashed(value: string): boolean {
  return isSha256Hash(value) || isBcryptHash(value);
}

/**
 * Compara uma senha em texto puro com um hash SHA-256 já armazenado.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (isSha256Hash(hash)) {
    const computedHash = await hashPassword(plain);
    return computedHash.toLowerCase() === hash.toLowerCase();
  }
  return plain === hash;
}

/**
 * Verifica a senha com suporte à migração progressiva:
 * - Se a senha armazenada for SHA-256, valida o hash.
 * - Se for bcrypt ($2a$), o servidor realiza a validação primária (ou validação remota).
 * - Se ainda estiver em texto puro legado, compara diretamente e sinaliza upgrade (needsUpgrade: true).
 * Retorna { valid, needsUpgrade } — se needsUpgrade = true, o caller persiste o novo hash SHA-256.
 */
export async function verifyPasswordWithMigration(
  plain: string,
  stored: string
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (isSha256Hash(stored)) {
    const valid = await verifyPassword(plain, stored);
    return { valid, needsUpgrade: false };
  }

  // Se já for um hash bcrypt (do servidor ou sincronizado)
  if (isBcryptHash(stored)) {
    return { valid: false, needsUpgrade: false };
  }

  // Senha ainda em texto puro (legado) — compara diretamente e sinaliza upgrade se correta
  const valid = plain === stored;
  return { valid, needsUpgrade: valid };
}
