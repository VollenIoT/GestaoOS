/**
 * Helpers de sugestões de Marcas e Modelos baseados ESTRITAMENTE
 * no cadastro da Central de Marcas e Central de Modelos.
 */

export interface BrandSuggestionItem {
  id: string;
  name: string;
}

export interface ModelSuggestionItem {
  id: string;
  name: string;
  brandName?: string;
}

/**
 * Retorna ESTRITAMENTE as marcas cadastradas na Central de Marcas
 */
export function getAllAggregatedBrands(
  catalogBrands: any[] = []
): BrandSuggestionItem[] {
  const map = new Map<string, BrandSuggestionItem>();

  (catalogBrands || []).forEach((b: any) => {
    const name = String(b.name || b.brand || '').trim();
    if (name) {
      map.set(name.toUpperCase(), { id: b.id || `brand_${name}`, name });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/**
 * Retorna ESTRITAMENTE os modelos cadastrados na Central de Modelos
 */
export function getAllAggregatedModels(
  catalogModels: any[] = []
): ModelSuggestionItem[] {
  const list: ModelSuggestionItem[] = [];
  const seen = new Set<string>();

  (catalogModels || []).forEach((m: any) => {
    const name = String(m.name || m.model || '').trim();
    const brandName = String(m.brandName || m.brand || '').trim();
    if (name) {
      const key = `${name}|${brandName}`.toUpperCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ id: m.id || `mod_${name}`, name, brandName });
      }
    }
  });

  return list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
