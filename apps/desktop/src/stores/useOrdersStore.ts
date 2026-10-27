import { create } from 'zustand';

// Intencionalmente usamos any[] para compatibilidade com dados do Firestore
// e localStorage que não passam pela validação de tipos do shared package
interface OrdersState {
  orders: any[];
  clients: any[];
  estimates: any[];
  visits: any[];
  maxEverOrderCode: number;
  setOrders: (orders: any[] | ((prev: any[]) => any[])) => void;
  setClients: (clients: any[] | ((prev: any[]) => any[])) => void;
  setEstimates: (estimates: any[] | ((prev: any[]) => any[])) => void;
  setVisits: (visits: any[] | ((prev: any[]) => any[])) => void;
  setMaxEverOrderCode: (code: number | ((prev: number) => number)) => void;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  orders: typeof window !== 'undefined'
    ? (() => { try { const s = localStorage.getItem('vollen_orders'); return s ? JSON.parse(s) : []; } catch { return []; } })()
    : [],
  clients: typeof window !== 'undefined'
    ? (() => { try { const s = localStorage.getItem('vollen_clients'); return s ? JSON.parse(s) : []; } catch { return []; } })()
    : [],
  estimates: typeof window !== 'undefined'
    ? (() => { try { const s = localStorage.getItem('vollen_estimates'); return s ? JSON.parse(s) : []; } catch { return []; } })()
    : [],
  visits: [],
  maxEverOrderCode: 0,
  setOrders: (updater) =>
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.orders) : updater;
      return { orders: next };
    }),
  setClients: (updater) =>
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.clients) : updater;
      return { clients: next };
    }),
  setEstimates: (updater) =>
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.estimates) : updater;
      return { estimates: next };
    }),
  setVisits: (updater) =>
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.visits) : updater;
      return { visits: next };
    }),
  setMaxEverOrderCode: (updater) =>
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.maxEverOrderCode) : updater;
      return { maxEverOrderCode: next };
    }),
}));
