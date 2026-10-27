/**
 * Serviço de Log de Auditoria e Retenção Segura
 * Registra ações críticas (exclusão de OS, exclusão de clientes, alteração de permissão, reset de fábrica)
 * e gerencia Soft-Delete com retenção de segurança.
 */

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'DELETE_OS' | 'DELETE_CLIENT' | 'DELETE_PART' | 'FACTORY_RESET' | 'UPDATE_PERMISSION' | 'RESTORE_ITEM';
  targetType: 'order' | 'client' | 'part' | 'service' | 'system' | 'user';
  targetId?: string;
  details?: Record<string, any>;
  ip?: string;
}

const AUDIT_LOGS_STORAGE_KEY = 'vollen_audit_logs';

/**
 * Registra um evento de auditoria no armazenamento local seguro
 */
export function logAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
  const newLog: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  try {
    const raw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    const logs: AuditLogEntry[] = raw ? JSON.parse(raw) : [];
    // Mantém os últimos 500 registros de auditoria
    const updated = [newLog, ...logs].slice(0, 500);
    localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao gravar log de auditoria:', err);
  }

  return newLog;
}

/**
 * Recupera os logs de auditoria
 */
export function getAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Interface para Itens na Lixeira (Soft-Delete)
 */
export interface SoftDeletedItem<T = any> {
  id: string;
  originalId: string;
  entityType: 'order' | 'client' | 'part' | 'service';
  deletedAt: string;
  deletedBy: string;
  expiresAt: string; // ISO date (ex: +7 dias)
  data: T;
}

const TRASH_STORAGE_KEY = 'vollen_trash_bin';
const RETENTION_DAYS = 7;

/**
 * Move um registro para a lixeira temporária com expiração de 7 dias
 */
export function softDeleteItem<T>(entityType: SoftDeletedItem['entityType'], originalId: string, data: T, deletedBy: string): SoftDeletedItem<T> {
  const now = new Date();
  const expires = new Date(now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const trashItem: SoftDeletedItem<T> = {
    id: `trash_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    originalId,
    entityType,
    deletedAt: now.toISOString(),
    deletedBy,
    expiresAt: expires.toISOString(),
    data,
  };

  try {
    const raw = localStorage.getItem(TRASH_STORAGE_KEY);
    const trashList: SoftDeletedItem[] = raw ? JSON.parse(raw) : [];
    // Purga itens vencidos (> 7 dias)
    const activeTrash = trashList.filter((item) => new Date(item.expiresAt).getTime() > Date.now());
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify([trashItem, ...activeTrash]));

    // Gera log de auditoria
    logAuditEvent({
      userId: deletedBy,
      userName: deletedBy,
      action: entityType === 'order' ? 'DELETE_OS' : entityType === 'client' ? 'DELETE_CLIENT' : 'DELETE_PART',
      targetType: entityType,
      targetId: originalId,
      details: { retainedUntil: expires.toISOString() },
    });
  } catch (err) {
    console.error('Erro ao mover item para a lixeira:', err);
  }

  return trashItem;
}

/**
 * Obtém itens da lixeira ainda válidos
 */
export function getTrashItems(): SoftDeletedItem[] {
  try {
    const raw = localStorage.getItem(TRASH_STORAGE_KEY);
    if (!raw) return [];
    const list: SoftDeletedItem[] = JSON.parse(raw);
    return list.filter((item) => new Date(item.expiresAt).getTime() > Date.now());
  } catch {
    return [];
  }
}
