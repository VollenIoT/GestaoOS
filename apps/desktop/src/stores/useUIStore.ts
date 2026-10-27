import { create } from 'zustand';
import { CompanyData, defaultCompanyData } from '../components/CompanyModal';
import { TrialStatus } from '../services/trialProtectionService';

interface UIState {
  // Aba ativa
  activeTab: 'dashboard' | 'schedule';
  setActiveTab: (tab: 'dashboard' | 'schedule') => void;

  // Barra de status
  statusMessage: string;
  setStatusMessage: (msg: string) => void;

  // CapsLock virtual
  isCapsLockActive: boolean;
  setIsCapsLockActive: (v: boolean) => void;
  toggleCapsLock: () => void;

  // Wallpaper personalizado
  customWallpaper: string | null;
  wallpaperOpacity: number;
  wallpaperPosX: number;
  wallpaperPosY: number;
  wallpaperScale: number;
  setCustomWallpaper: (url: string | null) => void;
  setWallpaperOpacity: (v: number) => void;
  setWallpaperPosX: (v: number) => void;
  setWallpaperPosY: (v: number) => void;
  setWallpaperScale: (v: number) => void;

  // Dados da empresa
  companyInfoState: CompanyData;
  setCompanyInfoState: (data: CompanyData | ((prev: CompanyData) => CompanyData)) => void;

  // Configuração padrão de termos de OS / garantia
  defaultWarrantyConfig: any;
  setDefaultWarrantyConfig: (cfg: any | ((prev: any) => any)) => void;

  // Status do período de demonstração (trial)
  trialStatus: TrialStatus | null;
  setTrialStatus: (status: TrialStatus | null) => void;

  // Data selecionada na agenda
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),

  statusMessage: (() => {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('backup_restored_success_msg')) {
      sessionStorage.removeItem('backup_restored_success_msg');
      return 'Backup restaurado com sucesso! Todos os dados e cadastros foram recarregados no sistema.';
    }
    return 'Vollen - Gestão de OS pronto e operando normalmente.';
  })(),
  setStatusMessage: (statusMessage) => set({ statusMessage }),

  isCapsLockActive: true,
  setIsCapsLockActive: (isCapsLockActive) => set({ isCapsLockActive }),
  toggleCapsLock: () => set((state) => ({ isCapsLockActive: !state.isCapsLockActive })),

  customWallpaper: typeof localStorage !== 'undefined'
    ? (localStorage.getItem('system_wallpaper_url') || null)
    : null,
  wallpaperOpacity: typeof localStorage !== 'undefined'
    ? Number(localStorage.getItem('system_wallpaper_opacity') || '25')
    : 25,
  wallpaperPosX: typeof localStorage !== 'undefined'
    ? Number(localStorage.getItem('system_wallpaper_pos_x') || '50')
    : 50,
  wallpaperPosY: typeof localStorage !== 'undefined'
    ? Number(localStorage.getItem('system_wallpaper_pos_y') || '50')
    : 50,
  wallpaperScale: typeof localStorage !== 'undefined'
    ? Number(localStorage.getItem('system_wallpaper_scale') || '100')
    : 100,
  setCustomWallpaper: (customWallpaper) => set({ customWallpaper }),
  setWallpaperOpacity: (wallpaperOpacity) => set({ wallpaperOpacity }),
  setWallpaperPosX: (wallpaperPosX) => set({ wallpaperPosX }),
  setWallpaperPosY: (wallpaperPosY) => set({ wallpaperPosY }),
  setWallpaperScale: (wallpaperScale) => set({ wallpaperScale }),

  companyInfoState: (() => {
    let baseData: CompanyData = defaultCompanyData;
    try {
      const saved = localStorage.getItem('vollen_company_data');
      if (saved) baseData = { ...defaultCompanyData, ...JSON.parse(saved) };
    } catch {}
    try {
      const savedTenantInfo = localStorage.getItem('system_tenant_info');
      if (savedTenantInfo) {
        const parsed = JSON.parse(savedTenantInfo);
        if (parsed.tradeName || parsed.companyName) {
          baseData.tradingName = parsed.tradeName || parsed.companyName;
        }
        if (parsed.legalName || parsed.companyName) {
          baseData.name = parsed.legalName || parsed.companyName;
        }
      } else {
        baseData.tradingName = 'Vollen Assistência Técnica';
        baseData.name = 'Vollen Assistência Técnica';
      }
    } catch {}
    return baseData;
  })(),
  setCompanyInfoState: (updater) =>
    set((state) => ({
      companyInfoState:
        typeof updater === 'function' ? updater(state.companyInfoState) : updater,
    })),

  defaultWarrantyConfig: (() => {
    try {
      const saved = localStorage.getItem('vollen_os_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      defaultDays: '90',
      defaultTerms:
        'A garantia cobre exclusivamente os serviços executados e as peças substituídas identificadas neste documento pelo período estabelecido. Não cobre danos causados por mau uso, quedas, oscilações elétricas, umidade ou intervenção de terceiros.',
      defaultCoverage: 'PECAS_E_MAO_DE_OBRA',
      defaultEntryTerms:
        'O cliente autoriza a realização da avaliação e diagnóstico técnico no equipamento descrito neste comprovante. Equipamentos não retirados em até 90 dias após notificação de conclusão/orçamento estarão sujeitos a taxas de guarda/armazenamento ou descarte conforme a legislação vigente.',
      defaultEstimateTerms:
        'O orçamento possui validade de 10 dias úteis a contar da data de emissão. Os serviços e peças discriminados estão sujeitos à aprovação prévia do cliente.',
      defaultExitTerms:
        'A garantia cobre exclusivamente os serviços executados e as peças substituídas identificadas neste documento pelo período estabelecido. Não cobre danos causados por mau uso, quedas, oscilações elétricas, umidade ou intervenção de terceiros.',
    };
  })(),
  setDefaultWarrantyConfig: (updater) =>
    set((state) => ({
      defaultWarrantyConfig:
        typeof updater === 'function' ? updater(state.defaultWarrantyConfig) : updater,
    })),

  trialStatus: null,
  setTrialStatus: (trialStatus) => set({ trialStatus }),

  selectedDate: new Date().toISOString().split('T')[0],
  setSelectedDate: (selectedDate) => set({ selectedDate }),
}));
