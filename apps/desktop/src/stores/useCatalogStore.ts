import { create } from 'zustand';

// Intencionalmente usamos any[] para compatibilidade com dados do Firestore
// e localStorage que não passam pela validação de tipos do shared package
interface CatalogState {
  parts: any[];
  services: any[];
  equipments: any[];
  suppliers: any[];
  brands: any[];
  models: any[];
  setParts: (parts: any[] | ((prev: any[]) => any[])) => void;
  setServices: (services: any[] | ((prev: any[]) => any[])) => void;
  setEquipments: (equipments: any[] | ((prev: any[]) => any[])) => void;
  setSuppliers: (suppliers: any[] | ((prev: any[]) => any[])) => void;
  setBrands: (brands: any[] | ((prev: any[]) => any[])) => void;
  setModels: (models: any[] | ((prev: any[]) => any[])) => void;
  addBrandIfNotExists: (brandName: string) => any;
  addModelIfNotExists: (modelName: string, brandName: string) => any;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  parts: typeof window !== 'undefined'
    ? (() => { try { const s = localStorage.getItem('vollen_parts_stock'); return s ? JSON.parse(s) : []; } catch { return []; } })()
    : [],
  services: typeof window !== 'undefined'
    ? (() => { try { const s = localStorage.getItem('vollen_services'); return s ? JSON.parse(s) : []; } catch { return []; } })()
    : [],
  equipments: typeof window !== 'undefined'
    ? (() => { try { const s = localStorage.getItem('vollen_equipments'); return s ? JSON.parse(s) : []; } catch { return []; } })()
    : [],
  suppliers: typeof window !== 'undefined'
    ? (() => { try { const s = localStorage.getItem('vollen_suppliers'); return s ? JSON.parse(s) : []; } catch { return []; } })()
    : [],
  brands: typeof window !== 'undefined'
    ? (() => { try { const s = localStorage.getItem('vollen_brands'); return s ? JSON.parse(s) : []; } catch { return []; } })()
    : [],
  models: typeof window !== 'undefined'
    ? (() => { try { const s = localStorage.getItem('vollen_models'); return s ? JSON.parse(s) : []; } catch { return []; } })()
    : [],
  setParts: (updater) =>
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.parts) : updater;
      try { localStorage.setItem('vollen_parts_stock', JSON.stringify(next)); } catch {}
      return { parts: next };
    }),
  setServices: (updater) =>
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.services) : updater;
      try { localStorage.setItem('vollen_services', JSON.stringify(next)); } catch {}
      return { services: next };
    }),
  setEquipments: (updater) =>
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.equipments) : updater;
      try { localStorage.setItem('vollen_equipments', JSON.stringify(next)); } catch {}
      return { equipments: next };
    }),
  setSuppliers: (updater) =>
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.suppliers) : updater;
      try { localStorage.setItem('vollen_suppliers', JSON.stringify(next)); } catch {}
      return { suppliers: next };
    }),
  setBrands: (updater) =>
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.brands) : updater;
      try { localStorage.setItem('vollen_brands', JSON.stringify(next)); } catch {}
      return { brands: next };
    }),
  setModels: (updater) =>
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.models) : updater;
      try { localStorage.setItem('vollen_models', JSON.stringify(next)); } catch {}
      return { models: next };
    }),
  addBrandIfNotExists: (brandName: string) => {
    const trimmed = (brandName || '').trim();
    if (!trimmed) return null;
    const currentBrands = get().brands || [];
    const normalized = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const existing = currentBrands.find((b: any) => {
      const bName = String(b.name || b.brand || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      return bName === normalized;
    });
    if (existing) return existing;

    const nextNum = currentBrands.reduce((max: number, b: any) => {
      const n = parseInt(String(b.code || '').replace(/\D/g, ''), 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0) + 1;
    const newBrand = {
      id: `brand_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      code: String(nextNum).padStart(4, '0'),
      name: trimmed,
      createdAt: new Date().toISOString(),
    };
    const updated = [...currentBrands, newBrand];
    set({ brands: updated });
    try { localStorage.setItem('vollen_brands', JSON.stringify(updated)); } catch {}
    // Sincroniza com Firebase se disponível
    import('../services/firebase').then(({ db }) => {
      if (db) {
        import('firebase/firestore').then(({ doc, setDoc }) => {
          setDoc(doc(db, 'brands', newBrand.id), newBrand, { merge: true }).catch(() => {});
        });
      }
    }).catch(() => {});
    return newBrand;
  },
  addModelIfNotExists: (modelName: string, brandName: string) => {
    const trimmedModel = (modelName || '').trim();
    const trimmedBrand = (brandName || '').trim();
    if (!trimmedModel) return null;

    // Garante que a marca exista no catálogo
    let brandObj = null;
    if (trimmedBrand) {
      brandObj = get().addBrandIfNotExists(trimmedBrand);
    }

    const currentModels = get().models || [];
    const normModel = trimmedModel.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const normBrand = trimmedBrand ? trimmedBrand.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() : '';

    const existing = currentModels.find((m: any) => {
      const mName = String(m.name || m.model || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      const mBrand = String(m.brandName || m.brand || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      if (normBrand) {
        return mName === normModel && mBrand === normBrand;
      }
      return mName === normModel;
    });
    if (existing) return existing;

    const nextNum = currentModels.reduce((max: number, m: any) => {
      const n = parseInt(String(m.code || '').replace(/\D/g, ''), 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0) + 1;
    const newModel = {
      id: `model_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      code: String(nextNum).padStart(4, '0'),
      name: trimmedModel,
      brandId: brandObj?.id || '',
      brandName: trimmedBrand,
      createdAt: new Date().toISOString(),
    };
    const updated = [...currentModels, newModel];
    set({ models: updated });
    try { localStorage.setItem('vollen_models', JSON.stringify(updated)); } catch {}
    // Sincroniza com Firebase se disponível
    import('../services/firebase').then(({ db }) => {
      if (db) {
        import('firebase/firestore').then(({ doc, setDoc }) => {
          setDoc(doc(db, 'models', newModel.id), newModel, { merge: true }).catch(() => {});
        });
      }
    }).catch(() => {});
    return newModel;
  },
}));
