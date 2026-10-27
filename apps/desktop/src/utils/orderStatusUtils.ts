export interface OSStatusItem {
  id: string;
  code: string;
  name: string;
  color: string;
  description?: string;
  isSystemDefault?: boolean;
  deductStock?: boolean;
  returnStock?: boolean;
  isFinished?: boolean;
  isCanceled?: boolean;
  orderIndex?: number;
}

export const DEFAULT_STATUSES: OSStatusItem[] = [
  { id: '1', code: '0001', name: 'ABERTA', color: '#eab308', description: 'Ordem de serviço aberta aguardando avaliação', isSystemDefault: true, deductStock: false, returnStock: false, orderIndex: 0 },
  { id: '9', code: '0002', name: 'ORCAMENTO_CONCLUIDO', color: '#6366f1', description: 'Orçamento concluído e aguardando resposta do cliente', isSystemDefault: true, deductStock: false, returnStock: false, orderIndex: 1 },
  { id: '2', code: '0003', name: 'EM_ATENDIMENTO', color: '#0284c7', description: 'Técnico trabalhando no equipamento / Visita Técnica', isSystemDefault: true, deductStock: false, returnStock: false, orderIndex: 2 },
  { id: '8', code: '0004', name: 'APROVADO', color: '#059669', description: 'Serviço e orçamento aprovados pelo cliente', isSystemDefault: true, deductStock: true, returnStock: false, orderIndex: 3 },
  { id: '3', code: '0005', name: 'AGUARDANDO_PECA', color: '#f97316', description: 'Aguardando chegada de peças para conclusão', isSystemDefault: true, deductStock: false, returnStock: false, orderIndex: 4 },
  { id: '4', code: '0006', name: 'APARELHO_LIBERADO', color: '#10b981', description: 'Aparelho pronto e liberado para retirada pelo cliente', isSystemDefault: true, deductStock: false, returnStock: false, orderIndex: 5 },
  { id: '5', code: '0007', name: 'FINALIZADA', color: '#047857', description: 'Serviço concluído e entregue ao cliente', isSystemDefault: true, deductStock: true, returnStock: false, isFinished: true, orderIndex: 6 },
  { id: '6', code: '0008', name: 'CANCELADA', color: '#dc2626', description: 'Ordem de serviço cancelada', isSystemDefault: true, deductStock: false, returnStock: true, isCanceled: true, orderIndex: 7 },
  { id: '17', code: '0009', name: 'RETORNO_GARANTIA', color: '#ec4899', description: 'Retorno de aparelho em garantia do serviço', isSystemDefault: true, deductStock: false, returnStock: false, orderIndex: 8 },
];

export const CANONICAL_DEFAULT_CODES: Record<string, string> = {
  'ABERTA': '0001',
  'ORCAMENTO_CONCLUIDO': '0002',
  'EM_ATENDIMENTO': '0003',
  'APROVADO': '0004',
  'AGUARDANDO_PECA': '0005',
  'APARELHO_LIBERADO': '0006',
  'FINALIZADA': '0007',
  'CANCELADA': '0008',
  'RETORNO_GARANTIA': '0009',
};

export const STATUS_UNIFICATION_MAP: Record<string, string> = {
  'EM ORÇAMENTO': 'ABERTA',
  'EM ORCAMENTO': 'ABERTA',
  'ORÇAMENTO CONCLUIDO': 'ORCAMENTO_CONCLUIDO',
  'ORCAMENTO CONCLUIDO': 'ORCAMENTO_CONCLUIDO',
  'AUTORIZADO': 'APROVADO',
  'AG. PEÇA': 'AGUARDANDO_PECA',
  'AG. PECA': 'AGUARDANDO_PECA',
  'CANCELADO': 'CANCELADA',
  'SERVIÇO EXECUTADO': 'FINALIZADA',
  'SERVICO EXECUTADO': 'FINALIZADA',
  'GARANTIA DO SERVIÇO': 'RETORNO_GARANTIA',
  'GARANTIA DO SERVICO': 'RETORNO_GARANTIA',
};

const CANONICAL_LABELS: Record<string, string> = {
  ABERTA: 'Aberta',
  EM_ORCAMENTO: 'Em Orçamento',
  'EM ORÇAMENTO': 'Em Orçamento',
  'EM ORCAMENTO': 'Em Orçamento',
  ORCAMENTO_CONCLUIDO: 'Orçamento Concluído',
  'ORÇAMENTO CONCLUIDO': 'Orçamento Concluído',
  'ORCAMENTO CONCLUIDO': 'Orçamento Concluído',
  EM_ATENDIMENTO: 'Em Atendimento',
  'EM ATENDIMENTO': 'Em Atendimento',
  APROVADO: 'Aprovado',
  ORCAMENTO_APROVADO: 'Orçamento Aprovado',
  'ORÇAMENTO APROVADO': 'Orçamento Aprovado',
  AGUARDANDO_PECA: 'Aguardando Peça',
  'AGUARDANDO PEÇA': 'Aguardando Peça',
  'AGUARDANDO PECA': 'Aguardando Peça',
  'AG. PEÇA': 'Aguardando Peça',
  'AG. PECA': 'Aguardando Peça',
  APARELHO_LIBERADO: 'Aparelho Liberado',
  'APARELHO LIBERADO': 'Aparelho Liberado',
  FINALIZADA: 'Finalizada',
  FINALIZADO: 'Finalizada',
  'SERVIÇO EXECUTADO': 'Finalizada',
  'SERVICO EXECUTADO': 'Finalizada',
  CANCELADA: 'Cancelada',
  CANCELADO: 'Cancelada',
  RETORNO_GARANTIA: 'Retorno em Garantia',
  'RETORNO EM GARANTIA': 'Retorno em Garantia',
  'GARANTIA DO SERVIÇO': 'Retorno em Garantia',
  'GARANTIA DO SERVICO': 'Retorno em Garantia',
  GARANTIA_FINALIZADA: 'Garantia Finalizada',
  GARANTIA_FABRICA: 'Garantia Fábrica',
  GARANTIA_EMPRESA: 'Garantia Empresa',
  IRREPARAVEL: 'Irreparável',
  'IRREPARÁVEL': 'Irreparável',
};

export function formatStatusLabel(status: string): string {
  if (!status) return 'Aberta';
  const clean = String(status).trim();
  const upper = clean.toUpperCase();
  if (CANONICAL_LABELS[upper]) {
    return CANONICAL_LABELS[upper];
  }
  if (CANONICAL_LABELS[clean]) {
    return CANONICAL_LABELS[clean];
  }
  // Se for nome personalizado com sublinhados, substitui por espaços
  if (clean.includes('_')) {
    return clean.replace(/_/g, ' ');
  }
  return clean;
}

/**
 * Sanitiza, normaliza códigos canônicos e desduplica a lista de status mantendo todos os defaults e personalizados.
 */
export function sanitizeAndNormalizeStatuses(rawList: OSStatusItem[]): OSStatusItem[] {
  const uniqueByName = new Map<string, OSStatusItem>();

  if (Array.isArray(rawList)) {
    rawList.forEach((item) => {
      if (!item) return;
      let nameUpper = String(item.name || item.id || '').trim().toUpperCase();
      if (STATUS_UNIFICATION_MAP[nameUpper]) {
        nameUpper = STATUS_UNIFICATION_MAP[nameUpper];
      }
      if (!nameUpper) return;

      if (!uniqueByName.has(nameUpper)) {
        uniqueByName.set(nameUpper, {
          ...item,
          name: nameUpper,
        });
      }
    });
  }

  // Garante que todos os defaults existam
  DEFAULT_STATUSES.forEach((d) => {
    const upper = d.name.toUpperCase();
    if (!uniqueByName.has(upper)) {
      uniqueByName.set(upper, { ...d });
    }
  });

  const combined = Array.from(uniqueByName.values());
  const usedCodes = new Set<string>();

  // 2º passo: fixa os códigos dos status padrão do sistema
  const normalized = combined.map((item) => {
    const upper = String(item.name || '').toUpperCase();
    if (CANONICAL_DEFAULT_CODES[upper]) {
      const canonicalCode = CANONICAL_DEFAULT_CODES[upper];
      usedCodes.add(canonicalCode);
      const defaultItem = DEFAULT_STATUSES.find((d) => d.name.toUpperCase() === upper);
      return {
        ...item,
        name: upper,
        isSystemDefault: true,
        code: canonicalCode,
        id: defaultItem ? defaultItem.id : item.id,
        color: defaultItem ? defaultItem.color : item.color,
        description: defaultItem?.description || item.description,
        deductStock: defaultItem ? defaultItem.deductStock : item.deductStock,
        returnStock: defaultItem ? defaultItem.returnStock : item.returnStock,
      };
    }
    return { ...item };
  });

  // 3º passo: garante códigos formatados com 4 dígitos únicos para status personalizados
  let nextCustomCodeNum = 10;
  return normalized.map((item) => {
    const upper = String(item.name || '').toUpperCase();
    if (CANONICAL_DEFAULT_CODES[upper]) {
      return item;
    }
    let code = String(item.code || '').trim();
    if (code && !isNaN(parseInt(code, 10))) {
      code = String(parseInt(code, 10)).padStart(4, '0');
    }
    if (!code || usedCodes.has(code) || code === '0000') {
      while (usedCodes.has(String(nextCustomCodeNum).padStart(4, '0'))) {
        nextCustomCodeNum++;
      }
      code = String(nextCustomCodeNum).padStart(4, '0');
      nextCustomCodeNum++;
    }
    usedCodes.add(code);
    return { ...item, code };
  });
}

/**
 * Carrega todos os status de OS cadastrados no localStorage / sistema,
 * garantindo ordenação e integridade dos status padrão e personalizados.
 */
export function getRegisteredOSStatuses(): OSStatusItem[] {
  try {
    const saved =
      localStorage.getItem('custom_os_statuses_v3') ||
      localStorage.getItem('system_os_statuses') ||
      localStorage.getItem('vollen_os_statuses');

    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sanitized = sanitizeAndNormalizeStatuses(parsed);
        const sorted = sanitized.sort((a: any, b: any) => {
          const numA = parseInt(String(a.code || '').replace(/\D/g, ''), 10) || 999;
          const numB = parseInt(String(b.code || '').replace(/\D/g, ''), 10) || 999;
          return (a.orderIndex ?? numA) - (b.orderIndex ?? numB);
        });
        try {
          localStorage.setItem('custom_os_statuses_v3', JSON.stringify(sorted));
        } catch {}
        return sorted;
      }
    }
  } catch (err) {}

  const defaults = DEFAULT_STATUSES.map((s, idx) => ({ ...s, orderIndex: idx }));
  try {
    localStorage.setItem('custom_os_statuses_v3', JSON.stringify(defaults));
  } catch {}
  return defaults;
}

/**
 * Verifica se a Ordem de Serviço ou status representa uma OS Cancelada / Excluída / Recusada.
 */
export function isOrderStatusCanceled(osOrStatus: any): boolean {
  if (!osOrStatus) return false;
  if (typeof osOrStatus === 'object') {
    if (osOrStatus.isCanceled === true || osOrStatus.canceled === true || Boolean(osOrStatus.canceledAt)) {
      return true;
    }
    return isOrderStatusCanceled(osOrStatus.status);
  }
  const upper = String(osOrStatus).trim().toUpperCase();
  if (!upper) return false;
  return /cancel|recusad|devolv|excluid/i.test(upper);
}

/**
 * Verifica se a Ordem de Serviço ou status representa uma OS Finalizada / Concluída / Entregue / Sem Condições.
 * Não importa qual o nome do status customizado, se a OS foi finalizada deve retornar true.
 * Canceladas NUNCA são consideradas finalizadas.
 */
export function isOrderStatusFinished(osOrStatus: any): boolean {
  if (!osOrStatus) return false;
  if (typeof osOrStatus === 'object') {
    if (isOrderStatusCanceled(osOrStatus)) return false;
    if (
      osOrStatus.isFinished === true ||
      osOrStatus.finished === true ||
      Boolean(osOrStatus.finishedAt) ||
      Boolean(osOrStatus.exitDate)
    ) {
      return true;
    }
    return isOrderStatusFinished(osOrStatus.status);
  }
  const upper = String(osOrStatus).trim().toUpperCase();
  if (!upper) return false;
  if (isOrderStatusCanceled(upper)) return false;

  // Reconhece palavras-chave e variações de finalização (inclusive 'liberado', 'sem condições de raparo/reparo', etc.)
  if (
    /liberad|conclui|finaliz|execut|entregue|sem condi|raparo|reparo|garantia|faturad|pront|irrepar/i.test(
      upper
    )
  ) {
    return true;
  }

  // Consulta custom_os_statuses_v3 / system_os_statuses para verificar flags configuradas no status
  try {
    const rawStatuses =
      localStorage.getItem('custom_os_statuses_v3') || localStorage.getItem('system_os_statuses');
    if (rawStatuses) {
      const parsed = JSON.parse(rawStatuses);
      if (Array.isArray(parsed)) {
        const found = parsed.find(
          (s: any) => String(s.name || '').trim().toUpperCase() === upper
        );
        if (found && (found.isFinished || found.deductStock)) {
          return true;
        }
      }
    }
  } catch {}

  return false;
}

/**
 * Verifica se a Ordem de Serviço está Aberta (Em Andamento / Em Atendimento).
 * Abertas NÃO incluem finalizadas e NÃO incluem canceladas.
 */
export function isOrderStatusOpen(osOrStatus: any): boolean {
  if (!osOrStatus) return true;
  return !isOrderStatusCanceled(osOrStatus) && !isOrderStatusFinished(osOrStatus);
}
