/**
 * Utilitários de hashing de senha — usa Web Crypto API (browser-native, sem dependências).
 * Compatível com Vite/Electron. Para o servidor Node, use o módulo `crypto` nativo.
 */

/**
 * Gera o hash SHA-256 de uma string e retorna como hex.
 * É assíncrona pois usa a Web Crypto API.
 */
export async function hashPassword(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compara uma senha em texto puro com um hash já armazenado.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(plain);
  return computedHash === hash;
}

/**
 * Verifica se uma string parece ser um hash SHA-256 (64 caracteres hex).
 * Usado para migração progressiva: distingue senhas antigas (texto puro) de novas (hashed).
 */
export function isHashed(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

/**
 * Verifica a senha com suporte à migração progressiva:
 * - Se a senha armazenada já é um hash SHA-256, compara via hash.
 * - Se ainda está em texto puro (legado), compara diretamente.
 * Retorna { valid, needsUpgrade } — se needsUpgrade = true, o caller deve
 * persistir o hash da senha para concluir a migração.
 */
export async function verifyPasswordWithMigration(
  plain: string,
  stored: string
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (isHashed(stored)) {
    // Senha já está hasheada — comparação segura
    const valid = await verifyPassword(plain, stored);
    return { valid, needsUpgrade: false };
  } else {
    // Senha ainda em texto puro (legado) — compara diretamente e sinaliza upgrade
    const valid = plain === stored;
    return { valid, needsUpgrade: valid }; // só faz upgrade se a senha estiver correta
  }
}
