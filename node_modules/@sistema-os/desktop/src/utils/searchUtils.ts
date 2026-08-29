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

export function matchesSearchTerm(target: string | null | undefined, search: string | null | undefined): boolean {
  if (!search || !search.trim()) return true;
  if (!target) return false;

  // 1. Comparação normal textual com remoção de acentos e case-insensitive
  const normTarget = normalizeSearchText(target);
  const normSearch = normalizeSearchText(search);
  if (normTarget.includes(normSearch)) return true;

  // 2. Comparação de números: ignora parênteses, traços, pontos, espaços e outros símbolos
  // Qualquer parte da sequência do número pesquisado deve casar com o número registrado
  const digitsSearch = String(search).replace(/\D/g, '');
  const digitsTarget = String(target).replace(/\D/g, '');
  
  if (digitsSearch.length >= 1 && digitsTarget.includes(digitsSearch)) {
    return true;
  }

  return false;
}

