import { useEffect } from 'react';
import { subscribeOrders, subscribeClients } from '../services/api';
import { fetchSystemTrialStatus, sendTrialHeartbeat } from '../services/trialProtectionService';
import { resolveSyncConflict } from '../services/syncService';
import { useOrdersStore } from '../stores/useOrdersStore';
import { useUIStore } from '../stores/useUIStore';
import { useDataLoader } from './useDataLoader';

/**
 * Hook dedicado para sincronização de dados do GestãoOS:
 * - Carga inicial de dados (Dashboard, Visitas, OS, Clientes, Catálogo)
 * - Subscriptions em tempo real com resolução inteligente de conflitos (syncService)
 * - Listeners do Firestore (Peças, Serviços, Equipamentos, Orçamentos, Configurações)
 * - Trial heartbeat a cada 60s
 */
export function useDataSync() {
  const setOrders = useOrdersStore((s) => s.setOrders);
  const setMaxEverOrderCode = useOrdersStore((s) => s.setMaxEverOrderCode);
  const setClients = useOrdersStore((s) => s.setClients);
  const setTrialStatus = useUIStore((s) => s.setTrialStatus);
  const selectedDate = useUIStore((s) => s.selectedDate);

  const { loadData, setupFirestoreListeners } = useDataLoader();

  useEffect(() => {
    loadData();

    fetchSystemTrialStatus()
      .then((status) => setTrialStatus(status))
      .catch(console.error);

    const trialHeartbeatInterval = setInterval(() => {
      sendTrialHeartbeat()
        .then((status) => setTrialStatus(status))
        .catch(console.error);
    }, 60000);

    // Subscriptions em tempo real com resolução inteligente de conflitos (syncService)
    const unsubOrders = subscribeOrders((realtimeOrders) => {
      setOrders((prevOrders: any[]) => {
        if (!prevOrders || prevOrders.length === 0) return realtimeOrders;
        const merged = [...realtimeOrders];
        prevOrders.forEach((localO) => {
          const remoteIdx = merged.findIndex((r) => r.id === localO.id);
          if (remoteIdx !== -1) {
            const conflict = resolveSyncConflict('orders', localO, merged[remoteIdx]);
            merged[remoteIdx] = conflict.resolvedData;
          }
        });
        return merged;
      });
      const fetchedMax = realtimeOrders.reduce((max: number, o: any) => {
        const num = parseInt((o.code || '').replace(/\D/g, ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      setMaxEverOrderCode(fetchedMax);
    });

    const unsubClients = subscribeClients((realtimeClients) => {
      setClients((prevClients: any[]) => {
        if (!prevClients || prevClients.length === 0) return realtimeClients;
        const merged = [...realtimeClients];
        prevClients.forEach((localC) => {
          const remoteIdx = merged.findIndex((r) => r.id === localC.id);
          if (remoteIdx !== -1) {
            const conflict = resolveSyncConflict('clients', localC, merged[remoteIdx]);
            merged[remoteIdx] = conflict.resolvedData;
          }
        });
        return merged;
      });
    });

    const cleanupFirestore = setupFirestoreListeners();

    return () => {
      unsubOrders();
      unsubClients();
      cleanupFirestore();
      clearInterval(trialHeartbeatInterval);
    };
  }, [selectedDate, loadData, setupFirestoreListeners, setOrders, setClients, setMaxEverOrderCode, setTrialStatus]);

  return { loadData };
}
