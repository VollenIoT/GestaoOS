import { StockMovement } from '@sistema-os/shared';

const STOCK_MOVEMENTS_KEY = 'vollen_stock_movements';

/**
 * Registra uma movimentação de estoque com rastreabilidade completa
 */
export function recordStockMovement(
  movement: Omit<StockMovement, 'id' | 'createdAt'>
): StockMovement {
  const newRecord: StockMovement = {
    id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
    createdAt: new Date().toISOString(),
    ...movement,
  };

  try {
    const raw = localStorage.getItem(STOCK_MOVEMENTS_KEY);
    const list: StockMovement[] = raw ? JSON.parse(raw) : [];
    const updated = [newRecord, ...list].slice(0, 1000);
    localStorage.setItem(STOCK_MOVEMENTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao salvar movimentação de estoque:', err);
  }

  return newRecord;
}

/**
 * Retorna o histórico de movimentações de uma peça ou geral
 */
export function getStockMovements(partId?: string): StockMovement[] {
  try {
    const raw = localStorage.getItem(STOCK_MOVEMENTS_KEY);
    const list: StockMovement[] = raw ? JSON.parse(raw) : [];
    if (partId) {
      return list.filter((m) => m.partId === partId);
    }
    return list;
  } catch {
    return [];
  }
}

/**
 * Calcula o custo médio ponderado de uma peça
 */
export function calculateWeightedAverageCost(
  currentStock: number,
  currentUnitCost: number,
  addedStock: number,
  addedUnitCost: number
): number {
  const totalQty = currentStock + addedStock;
  if (totalQty <= 0) return 0;
  const totalValue = (currentStock * currentUnitCost) + (addedStock * addedUnitCost);
  return Number((totalValue / totalQty).toFixed(2));
}
