export interface CustomShortcutsConfig {
  newOrder: string;      // Padrão: 'F2'
  openOrders: string;    // Padrão: 'F5'
  finishedOrders: string;// Padrão: 'F6'
  searchOS: string;      // Padrão: 'F7'
  partsModal: string;    // Padrão: 'F8'
  salesModal: string;    // Padrão: 'F9'
  quickStock: string;    // Padrão: 'F10'
}

export const DEFAULT_SHORTCUTS_CONFIG: CustomShortcutsConfig = {
  newOrder: 'F2',
  openOrders: 'F5',
  finishedOrders: 'F6',
  searchOS: 'F7',
  partsModal: 'F8',
  salesModal: 'F9',
  quickStock: 'F10',
};

const STORAGE_KEY = 'vollen_system_shortcuts_config';

export function getShortcutsConfig(): CustomShortcutsConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_SHORTCUTS_CONFIG,
        ...parsed,
      };
    }
  } catch (err) {
    console.warn('Erro ao carregar atalhos personalizados:', err);
  }
  return { ...DEFAULT_SHORTCUTS_CONFIG };
}

export function saveShortcutsConfig(config: CustomShortcutsConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('vollen_shortcuts_changed', { detail: config }));
  } catch (err) {
    console.warn('Erro ao salvar atalhos:', err);
  }
}

export function resetShortcutsConfig(): CustomShortcutsConfig {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SHORTCUTS_CONFIG));
    window.dispatchEvent(new CustomEvent('vollen_shortcuts_changed', { detail: DEFAULT_SHORTCUTS_CONFIG }));
  } catch (err) {
    console.warn('Erro ao redefinir atalhos:', err);
  }
  return { ...DEFAULT_SHORTCUTS_CONFIG };
}
