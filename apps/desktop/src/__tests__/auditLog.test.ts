import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logAuditEvent, getAuditLogs, softDeleteItem, getTrashItems } from '../services/auditLogService';

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

describe('Audit Log & Soft Delete Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('registra evento de auditoria no log com timestamp e ID', () => {
    const entry = logAuditEvent({
      userId: '1',
      userName: 'Administrador',
      action: 'DELETE_OS',
      targetType: 'order',
      targetId: 'os-123',
    });

    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeDefined();

    const logs = getAuditLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('DELETE_OS');
    expect(logs[0].targetId).toBe('os-123');
  });

  it('move item para a lixeira com retenção de 7 dias e gera log de auditoria correspondente', () => {
    const deletedOrder = { id: 'os-999', code: 'OS-999', total: 500 };
    const trashItem = softDeleteItem('order', 'os-999', deletedOrder, 'admin');

    expect(trashItem.id).toBeDefined();
    expect(trashItem.originalId).toBe('os-999');
    expect(new Date(trashItem.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const trashList = getTrashItems();
    expect(trashList.length).toBe(1);
    expect(trashList[0].originalId).toBe('os-999');

    const logs = getAuditLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('DELETE_OS');
  });
});
