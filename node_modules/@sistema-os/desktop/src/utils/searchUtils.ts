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
 * Verifica se o texto alvo contém o termo de busca, ignorando maiúsculas/minúsculas e acentos.
 */
export function matchesSearchTerm(target: string | null | undefined, search: string | null | undefined): boolean {
  if (!search || !search.trim()) return true;
  if (!target) return false;
  return normalizeSearchText(target).includes(normalizeSearchText(search));
}
