import { getMasterFirestore } from './licenseService';
import { doc, getDoc } from 'firebase/firestore';
import { check as checkTauriUpdate } from '@tauri-apps/plugin-updater';
import { getCurrentEdition } from '../config/appFeatures';

export const CURRENT_SYSTEM_VERSION = getCurrentEdition().replace(/^v/, '');

export interface AppVersionInfo {
  version: string;
  releaseDate?: string;
  title?: string;
  releaseNotes?: string[];
  downloadUrl?: string;
  mandatory?: boolean;
}

export interface CheckUpdateResult {
  hasUpdate: boolean;
  latestVersionInfo: AppVersionInfo | null;
  error?: string;
}

export const isVersionNewer = (remote: string, current: string): boolean => {
  try {
    const rParts = remote.replace(/[^0-9.]/g, '').split('.').map(Number);
    const cParts = current.replace(/[^0-9.]/g, '').split('.').map(Number);

    const rMajor = rParts[0] || 0;
    const cMajor = cParts[0] || 0;

    // Apenas atualiza dentro da mesma linha de produto (major identico: v1->v1, v2->v2, v3->v3, v4->v4)
    if (rMajor !== cMajor) {
      return false;
    }

    for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
      const r = rParts[i] || 0;
      const c = cParts[i] || 0;
      if (r > c) return true;
      if (r < c) return false;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Consulta se há atualizações disponíveis no Firebase Firestore e/ou Tauri Updater.
 * Não lança exceções, falhando de forma silenciosa para não interromper a interface.
 */
export async function checkSystemUpdate(): Promise<CheckUpdateResult> {
  try {
    const currentMajor = CURRENT_SYSTEM_VERSION.split('.')[0] || '1';
    let cloudInfo: AppVersionInfo | null = null;

    // 1. Consulta metadados da versão no canal da nuvem (app_version_v1, v2, v3, v4)
    try {
      const masterDb = getMasterFirestore();
      const docRef = doc(masterDb, 'system_config', `app_version_v${currentMajor}`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        cloudInfo = docSnap.data() as AppVersionInfo;
      }
    } catch (cloudErr) {
      console.warn('Aviso ao consultar metadados do Firebase:', cloudErr);
    }

    // 2. Tenta verificar pelo Atualizador Nativo Tauri / GitHub
    try {
      const tauriUpdate = await checkTauriUpdate();
      if (tauriUpdate?.available && isVersionNewer(tauriUpdate.version, CURRENT_SYSTEM_VERSION)) {
        return {
          hasUpdate: true,
          latestVersionInfo: {
            version: tauriUpdate.version,
            title: cloudInfo?.title || `Atualização v${tauriUpdate.version}`,
            releaseDate: cloudInfo?.releaseDate || new Date().toLocaleDateString('pt-BR'),
            releaseNotes: (cloudInfo?.releaseNotes && cloudInfo.releaseNotes.length > 0)
              ? cloudInfo.releaseNotes
              : (tauriUpdate.body ? tauriUpdate.body.split('\n').filter(Boolean) : ['Melhorias de desempenho e novas correções.']),
          },
        };
      }
    } catch (tauriErr) {
      console.warn('Verificação nativa Tauri:', tauriErr);
    }

    // 3. Se houver versão mais recente no Firestore
    if (cloudInfo && cloudInfo.version && isVersionNewer(cloudInfo.version, CURRENT_SYSTEM_VERSION)) {
      return {
        hasUpdate: true,
        latestVersionInfo: cloudInfo,
      };
    }

    return {
      hasUpdate: false,
      latestVersionInfo: null,
    };
  } catch (err: any) {
    console.warn('Verificação de atualizações falhou de forma silenciosa:', err);
    return {
      hasUpdate: false,
      latestVersionInfo: null,
      error: err?.message,
    };
  }
}
