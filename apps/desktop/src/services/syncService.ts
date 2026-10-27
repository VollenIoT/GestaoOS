import { SyncRecord } from '@sistema-os/shared';

const SYNC_LOG_KEY = 'vollen_sync_log';

export interface ConflictResolution<T> {
  winner: 'local' | 'remote' | 'merged';
  resolvedData: T;
  hasConflict: boolean;
}

/**
 * Resolve conflitos de sincronização entre registros local e remoto via Last-Write-Wins (LWW)
 * e registra no log de auditoria / sincronização se houve divergência relevante.
 */
export function resolveSyncConflict<T extends { updatedAt?: string; [key: string]: any }>(
  entityType: SyncRecord['entityType'],
  localData: T,
  remoteData: T
): ConflictResolution<T> {
  const localTime = new Date(localData.updatedAt || 0).getTime();
  const remoteTime = new Date(remoteData.updatedAt || 0).getTime();

  const isIdentical = JSON.stringify(localData) === JSON.stringify(remoteData);
  if (isIdentical) {
    return { winner: 'local', resolvedData: localData, hasConflict: false };
  }

  const winner: 'local' | 'remote' = remoteTime >= localTime ? 'remote' : 'local';
  const resolvedData = winner === 'remote' ? remoteData : localData;

  // Registra no histórico de resolução
  try {
    const raw = localStorage.getItem(SYNC_LOG_KEY);
    const logs: SyncRecord[] = raw ? JSON.parse(raw) : [];
    const newLog: SyncRecord = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      entityType,
      entityId: String(localData.id || remoteData.id || 'unknown'),
      clientTimestamp: localTime,
      serverTimestamp: remoteTime,
      version: 1,
      status: 'RESOLVED',
      resolvedBy: `LWW (${winner})`,
    };
    localStorage.setItem(SYNC_LOG_KEY, JSON.stringify([newLog, ...logs].slice(0, 300)));
  } catch {}

  return { winner, resolvedData, hasConflict: true };
}

/**
 * Função utilitária para retry com backoff exponencial
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 500,
  factor: number = 2
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 1) throw err;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return retryWithBackoff(fn, retries - 1, delayMs * factor, factor);
  }
}
