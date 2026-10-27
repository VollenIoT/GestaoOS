/**
 * Normaliza um texto removendo acentos, diacríticos e convertendo para minúsculas.
 * Exemplo: "José da Conceição Órgão" -> "jose da conceicao orgao"
 */
export function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Remove zeros à esquerda mantendo pelo menos '0' se todos forem zero.
 */
export function removeLeadingZeros(val: string | null | undefined): string {
  if (!val) return '';
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/^0+/, '') || '0';
}

/**
 * Formata um código garantindo pelo menos 4 dígitos numéricos (ex: 501 -> 0501, 1 -> 0001, OS-501 -> OS-0501).
 */
export function formatCanonicalCode(val: string | number | null | undefined, minDigits: number = 4): string {
  if (val === undefined || val === null) return '0001';
  const str = String(val).trim();
  if (!str) return '0001';
  const numMatch = str.match(/^([A-Za-z\-_]*)(\d+)$/);
  if (numMatch) {
    const prefix = numMatch[1] || '';
    const numStr = numMatch[2];
    if (numStr.length < minDigits) {
      return `${prefix}${numStr.padStart(minDigits, '0')}`;
    }
    return `${prefix}${numStr}`;
  }
  return str;
}

export function matchesCodeExactOrPartial(
  code: string | null | undefined,
  searchTerm: string | null | undefined,
  isExact: boolean
): boolean {
  if (!searchTerm || !searchTerm.trim()) return true;
  if (!code) return false;

  const rawCode = String(code).trim();
  const rawSearch = String(searchTerm).trim();

  // Zeros à esquerda removidos dos dígitos
  const codeDigits = rawCode.replace(/\D/g, '');
  const searchDigits = rawSearch.replace(/\D/g, '');
  const codeStripped = removeLeadingZeros(rawCode);
  const searchStripped = removeLeadingZeros(rawSearch);

  if (isExact) {
    // Se a busca for numérica, compara numericamente ignorando zeros à esquerda
    if (searchDigits.length > 0 && codeDigits.length > 0) {
      return codeStripped === searchStripped;
    }
    // Comparação textual exata normalizada
    return normalizeSearchText(rawCode) === normalizeSearchText(rawSearch);
  }

  // Busca parcial (enquanto digita)
  // 1. Textual normalizada
  const normCode = normalizeSearchText(rawCode);
  const normSearch = normalizeSearchText(rawSearch);
  if (normCode.includes(normSearch)) return true;

  // 2. Numérica parcial (qualquer substring de dígitos ou correspondência desconsiderando zeros)
  if (searchDigits.length >= 1) {
    if (codeDigits.includes(searchDigits)) return true;
    if (codeStripped.includes(searchStripped)) return true;
  }

  return false;
}

export function matchesSearchTerm(
  target: string | null | undefined,
  search: string | null | undefined,
  isExact: boolean = false
): boolean {
  if (!search || !search.trim()) return true;
  if (!target) return false;

  if (isExact) {
    return matchesCodeExactOrPartial(target, search, true);
  }

  const rawSearch = String(search).trim();
  const rawTarget = String(target).trim();

  // 1. Comparação normal textual com remoção de acentos e case-insensitive (preserva a sequência digitada pelo usuário, ex: "1/4", "m6", "brastemp")
  const normTarget = normalizeSearchText(rawTarget);
  const normSearch = normalizeSearchText(rawSearch);
  if (normTarget.includes(normSearch)) return true;

  // 2. Comparação de código com zeros à esquerda (ex: busca "77" encontra código "0077")
  const digitsSearch = rawSearch.replace(/\D/g, '');
  const digitsTarget = rawTarget.replace(/\D/g, '');
  
  // Se o usuário digitou apenas números (ou código com prefixo numérico puro) e o target é um número/código com zeros à esquerda
  const isPureNumberSearch = /^\d+$/.test(rawSearch);
  const isCodeLikeTarget = /^[A-Za-z\-_]*\d+$/.test(rawTarget);

  if (isPureNumberSearch && isCodeLikeTarget && digitsSearch.length >= 1) {
    const strippedSearch = removeLeadingZeros(rawSearch);
    const strippedTarget = removeLeadingZeros(rawTarget);
    if (strippedSearch && strippedTarget && strippedTarget === strippedSearch) {
      return true;
    }
  }

  // 3. Comparação de números de telefone / CPF / CNPJ formatados (quando busca contém apenas dígitos ou formatação telefônica/fiscal padrão)
  const isPhoneOrDocumentSearch = /^[\d\s().\-/]+$/.test(rawSearch) && digitsSearch.length >= 4;
  const isPhoneOrDocumentTarget = /^[\d\s().\-/]+$/.test(rawTarget) && digitsTarget.length >= 4;

  if (isPhoneOrDocumentSearch && isPhoneOrDocumentTarget && !rawSearch.includes('/') && digitsSearch.length >= 4) {
    if (digitsTarget.includes(digitsSearch)) {
      return true;
    }
  }

  return false;
}

