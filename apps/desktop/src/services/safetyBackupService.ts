import { getCurrentFeatures } from '../config/appFeatures';
import { logAuditEvent } from './auditLogService';

/**
 * Interface com os metadados do Snapshot de Segurança de Reset de Fábrica
 */
export interface FactoryResetSafetyBackup {
  id: string;
  createdAt: string;
  expiresAt: string; // ISO date (+7 dias)
  createdByName: string;
  selectedModules: Record<string, boolean>;
  payload: Record<string, any>;
}

const SAFETY_BACKUP_KEY = 'vollen_factory_reset_safety_backup';
const SAFETY_BACKUP_HISTORY_KEY = 'vollen_factory_reset_safety_backups_history';
const RETENTION_DAYS = 7;

/**
 * Gera e salva um snapshot completo e estruturado de todos os dados do sistema
 * antes de executar a restauração de padrões de fábrica.
 * Salva tanto localmente (com expiração de 7 dias) quanto em arquivo no disco caso seja Tauri.
 */
export async function createFactoryResetSafetyBackup(params: {
  adminName: string;
  selectedModules: Record<string, boolean>;
}): Promise<{ backupPath?: string; expiresAt: string }> {
  const now = new Date();
  const expires = new Date(now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // 1. Coleta 100% de todas as chaves e dados do localStorage
  const allLocalStorageSnapshot: Record<string, any> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const raw = localStorage.getItem(key);
      try {
        allLocalStorageSnapshot[key] = raw ? JSON.parse(raw) : raw;
      } catch {
        allLocalStorageSnapshot[key] = raw;
      }
    }
  }

  // 2. Monta o pacote de dados do backup estruturado
  const fullBackupPayload = {
    system: 'Vollen - Gestão de OS',
    version: getCurrentFeatures().edition || 'universal',
    type: 'SAFETY_BACKUP_PRE_FACTORY_RESET',
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    retentionDays: RETENTION_DAYS,
    createdBy: params.adminName,
    selectedModulesForReset: params.selectedModules,
    storage: allLocalStorageSnapshot,
    clients: (() => {
      try {
        const saved = localStorage.getItem('vollen_clients');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    })(),
    orders: (() => {
      try {
        const saved = localStorage.getItem('vollen_orders');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    })(),
    visits: (() => {
      try {
        const saved = localStorage.getItem('vollen_visits');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    })(),
    users: (() => {
      try {
        const saved = localStorage.getItem('vollen_users');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    })(),
    companyData: (() => {
      try {
        const saved = localStorage.getItem('vollen_company_data');
        return saved ? JSON.parse(saved) : null;
      } catch { return null; }
    })(),
    estimates: (() => {
      try {
        const saved = localStorage.getItem('vollen_estimates');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    })(),
    parts: (() => {
      try {
        const saved = localStorage.getItem('vollen_parts_stock') || localStorage.getItem('vollen_parts');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    })(),
    services: (() => {
      try {
        const saved = localStorage.getItem('vollen_services');
        return saved ? JSON.parse(saved) : null;
      } catch { return null; }
    })(),
    equipments: (() => {
      try {
        const saved = localStorage.getItem('system_equipments') || localStorage.getItem('vollen_equipments');
        return saved ? JSON.parse(saved) : null;
      } catch { return null; }
    })(),
    cashMovements: (() => {
      try {
        const saved = localStorage.getItem('vollen_cash_movements') || localStorage.getItem('cash_transactions');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    })(),
    salesHistory: (() => {
      try {
        const saved = localStorage.getItem('vollen_sales_history');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    })(),
  };

  const safetyBackup: FactoryResetSafetyBackup = {
    id: `safety_backup_${Date.now()}`,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    createdByName: params.adminName,
    selectedModules: params.selectedModules,
    payload: fullBackupPayload,
  };

  // 3. Salva no LocalStorage com chave de proteção
  try {
    localStorage.setItem(SAFETY_BACKUP_KEY, JSON.stringify(safetyBackup));
    
    // Mantém histórico dos backups de reset (limpando os que já passaram de 7 dias)
    const rawHist = localStorage.getItem(SAFETY_BACKUP_HISTORY_KEY);
    const hist: FactoryResetSafetyBackup[] = rawHist ? JSON.parse(rawHist) : [];
    const validHist = hist.filter((b) => new Date(b.expiresAt).getTime() > Date.now());
    validHist.unshift(safetyBackup);
    localStorage.setItem(SAFETY_BACKUP_HISTORY_KEY, JSON.stringify(validHist.slice(0, 5)));
  } catch (err) {
    console.warn('Erro ao salvar safety backup no localStorage:', err);
  }

  // 4. Se estiver rodando no aplicativo Tauri Desktop, tenta gravar também na pasta de Backups do Windows
  let savedDiskPath: string | undefined = undefined;
  if ((window as any).__TAURI_INTERNALS__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const pathApi = await import('@tauri-apps/api/path');
      
      let baseDir = localStorage.getItem('saved_backup_folder_path');
      if (!baseDir) {
        const docs = await pathApi.documentDir().catch(() => null);
        baseDir = docs ? `${docs}\\Backups Sistema OS` : 'C:\\SistemaOS\\Backups';
      }

      const sep = baseDir.includes('/') ? '/' : '\\';
      const cleanBase = baseDir.endsWith(sep) ? baseDir.slice(0, -1) : baseDir;
      const targetFilePath = `${cleanBase}${sep}backup_seguranca_pre_reset_${dateStr}.json`;

      await invoke('save_backup_file', {
        path: targetFilePath,
        content: JSON.stringify(fullBackupPayload, null, 2),
      });

      savedDiskPath = targetFilePath;
      console.log(`[Backup de Segurança] Salvo no disco em: ${targetFilePath}`);
    } catch (diskErr) {
      console.warn('Não foi possível gravar backup pré-reset no disco rígido:', diskErr);
    }
  }

  // 5. Registra log de auditoria
  logAuditEvent({
    userId: params.adminName,
    userName: params.adminName,
    action: 'FACTORY_RESET',
    targetType: 'system',
    details: {
      type: 'SAFETY_BACKUP_CREATED',
      expiresAt: expires.toISOString(),
      retentionDays: RETENTION_DAYS,
      diskPath: savedDiskPath || 'Armazenado no LocalStorage do Sistema',
    },
  });

  return { backupPath: savedDiskPath, expiresAt: expires.toISOString() };
}

/**
 * Retorna o último backup de segurança gerado antes do Reset de Fábrica (se ainda não tiver expirado)
 */
export function getActiveSafetyBackup(): FactoryResetSafetyBackup | null {
  try {
    const raw = localStorage.getItem(SAFETY_BACKUP_KEY);
    if (!raw) return null;
    const backup: FactoryResetSafetyBackup = JSON.parse(raw);
    if (new Date(backup.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(SAFETY_BACKUP_KEY);
      return null;
    }
    return backup;
  } catch {
    return null;
  }
}

/**
 * Limpa automaticamente backups de segurança antigos com mais de 7 dias
 */
export function purgeExpiredSafetyBackups(): void {
  try {
    const rawHist = localStorage.getItem(SAFETY_BACKUP_HISTORY_KEY);
    if (rawHist) {
      const hist: FactoryResetSafetyBackup[] = JSON.parse(rawHist);
      const valid = hist.filter((b) => new Date(b.expiresAt).getTime() > Date.now());
      localStorage.setItem(SAFETY_BACKUP_HISTORY_KEY, JSON.stringify(valid));
    }

    const current = getActiveSafetyBackup();
    if (!current) {
      localStorage.removeItem(SAFETY_BACKUP_KEY);
    }
  } catch {}
}
