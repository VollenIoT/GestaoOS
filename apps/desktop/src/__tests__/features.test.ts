import { describe, it, expect, beforeEach } from 'vitest';
import { hasPermission, getPermissionsForRole } from '../services/rbacService';
import { recordStockMovement, getStockMovements, calculateWeightedAverageCost } from '../services/stockService';
import { resolveSyncConflict } from '../services/syncService';

const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
});

describe('E. Novas Funcionalidades - RBAC, Estoque & Sincronização', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('RBAC Granular', () => {
    it('permite todas as ações para ADMIN', () => {
      expect(hasPermission('ADMIN', 'orders', 'canDelete')).toBe(true);
      expect(hasPermission('ADMIN', 'financial', 'canCreate')).toBe(true);
      expect(hasPermission('ADMIN', 'settings', 'canEdit')).toBe(true);
    });

    it('bloqueia exclusão e financeiro para TECNICO', () => {
      expect(hasPermission('TECNICO', 'orders', 'canView')).toBe(true);
      expect(hasPermission('TECNICO', 'orders', 'canDelete')).toBe(false);
      expect(hasPermission('TECNICO', 'financial', 'canView')).toBe(false);
    });
  });

  describe('Gestão de Estoque Completo', () => {
    it('registra movimentação e calcula custo médio ponderado', () => {
      const mov = recordStockMovement({
        partId: 'p1',
        partName: 'Bateria 4000mAh',
        type: 'ENTRADA',
        quantity: 10,
        previousStock: 5,
        newStock: 15,
        unitCost: 50,
        responsibleUser: 'Admin',
      });

      expect(mov.id).toBeDefined();
      const list = getStockMovements('p1');
      expect(list.length).toBe(1);

      // Custo médio: 5 un a R$ 40 + 10 un a R$ 50 = (200 + 500) / 15 = 46.67
      const avgCost = calculateWeightedAverageCost(5, 40, 10, 50);
      expect(avgCost).toBe(46.67);
    });
  });

  describe('Sincronização Bidirecional & Conflitos (LWW)', () => {
    it('resolve conflito escolhendo o registro mais recente (Last-Write-Wins)', () => {
      const local = { id: 'os-1', code: 'OS-1', updatedAt: '2026-09-09T10:00:00Z', notes: 'Local' };
      const remote = { id: 'os-1', code: 'OS-1', updatedAt: '2026-09-09T10:05:00Z', notes: 'Remote' };

      const resolution = resolveSyncConflict('orders', local, remote);
      expect(resolution.hasConflict).toBe(true);
      expect(resolution.winner).toBe('remote');
      expect(resolution.resolvedData.notes).toBe('Remote');
    });
  });
});
