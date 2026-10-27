/**
 * Utilitários de Sanitização e Prevenção de XSS
 * Sanitiza entradas de texto livre antes de salvar no Firestore / LocalStorage / Backend.
 */

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escapa caracteres HTML perigosos de uma string de texto livre.
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') {
    if (input === null || input === undefined) return '';
    return String(input);
  }
  return input
    .trim()
    .replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitiza recursivamente strings dentro de um objeto ou array de dados.
 */
export function sanitizeObject<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeString(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeObject(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      // Ignora chaves com senhas/tokens que não devem ter formatação alterada
      if (['password', 'token', 'apiKey', 'firebaseConfig'].includes(key)) {
        sanitizedObj[key] = value;
      } else {
        sanitizedObj[key] = sanitizeObject(value);
      }
    }
    return sanitizedObj as T;
  }

  return data;
}

/**
 * Validador para garantir que campos não ultrapassem comprimentos seguros
 */
export function validateLength(str: string, maxLength: number = 255): string {
  const sanitized = sanitizeString(str);
  return sanitized.slice(0, maxLength);
}
