import { useCallback } from 'react';
import {
  fetchDashboardStats,
  fetchVisits,
  fetchOrders,
  fetchClients,
} from '../services/api';
import { db } from '../services/firebase';
import { collection, onSnapshot, doc, setDoc, getDocs } from 'firebase/firestore';
import { useOrdersStore } from '../stores/useOrdersStore';
import { useCatalogStore } from '../stores/useCatalogStore';
import { useUIStore } from '../stores/useUIStore';
import { CompanyData } from '../components/CompanyModal';
import { formatCanonicalCode } from '../utils/searchUtils';
import { getRegisteredOSStatuses, sanitizeAndNormalizeStatuses } from '../utils/orderStatusUtils';

/** Hook que expõe `loadData()` e `setupFirestoreListeners()`. */
export function useDataLoader() {
  const setOrders = useOrdersStore((s) => s.setOrders);
  const setClients = useOrdersStore((s) => s.setClients);
  const setEstimates = useOrdersStore((s) => s.setEstimates);
  const setMaxEverOrderCode = useOrdersStore((s) => s.setMaxEverOrderCode);
  const setVisits = useOrdersStore((s) => s.setVisits);

  const setParts = useCatalogStore((s) => s.setParts);
  const setServices = useCatalogStore((s) => s.setServices);
  const setEquipments = useCatalogStore((s) => s.setEquipments);
  const setBrands = useCatalogStore((s) => s.setBrands);
  const setModels = useCatalogStore((s) => s.setModels);

  const setCompanyInfoState = useUIStore((s) => s.setCompanyInfoState);
  const setDefaultWarrantyConfig = useUIStore((s) => s.setDefaultWarrantyConfig);

  // ── Carga inicial de dados ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const statsData = await fetchDashboardStats().catch(() => null);
      // stats não tem store próprio; componente Dashboard busca direto via API

      const visitsData = await fetchVisits().catch(() => []);
      if (Array.isArray(visitsData)) setVisits(visitsData);

      const rawOrdersData = await fetchOrders().catch(() => []);
      if (Array.isArray(rawOrdersData)) {
        const ordersData = rawOrdersData.map((o: any) => ({
          ...o,
          code: formatCanonicalCode(o.code),
        }));
        setOrders(ordersData);
        const fetchedMax = ordersData.reduce((max: number, o: any) => {
          const num = parseInt((o.code || '').replace(/\D/g, ''), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        setMaxEverOrderCode(fetchedMax);

        // Garante que todos os status das ordens existam no cadastro de status
        try {
          const currentStatuses = getRegisteredOSStatuses();
          const statusMap = new Map<string, any>();
          currentStatuses.forEach((st) => {
            if (st && st.name) statusMap.set(String(st.name).trim().toUpperCase(), st);
          });
          const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b', '#14b8a6', '#f97316', '#a855f7', '#6366f1'];
          let added = false;
          let pIdx = 0;
          ordersData.forEach((o: any) => {
            const rawStatus = (o?.status || '').trim();
            if (rawStatus && !statusMap.has(rawStatus.toUpperCase())) {
              const isFin = /liberad|conclui|finaliz|execut|entregue|sem condi/i.test(rawStatus);
              const isCanc = /cancel/i.test(rawStatus);
              const newSt = {
                id: `status_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                code: String((currentStatuses.length || 0) + 1).padStart(4, '0'),
                name: rawStatus,
                color: PALETTE[pIdx % PALETTE.length],
                description: `Status da OS (${rawStatus})`,
                isSystemDefault: false,
                deductStock: isFin,
                returnStock: isCanc,
                isFinished: isFin,
                isCanceled: isCanc,
              };
              pIdx++;
              currentStatuses.push(newSt);
              statusMap.set(rawStatus.toUpperCase(), newSt);
              added = true;
            }
          });
          if (added) {
            const normalized = sanitizeAndNormalizeStatuses(currentStatuses);
            localStorage.setItem('custom_os_statuses_v3', JSON.stringify(normalized));
          }
        } catch (e) {
          console.warn('Erro ao sincronizar status dinâmicos das ordens:', e);
        }
      }

      const clientsData = await fetchClients().catch(() => []);
      if (Array.isArray(clientsData)) {
        setClients(clientsData);
      }

      // Sincroniza cadastros locais de peças, serviços, equipamentos, marcas e modelos
      try {
        const rawLocalParts = JSON.parse(localStorage.getItem('vollen_parts_stock') || '[]');
        const localParts = Array.isArray(rawLocalParts) ? rawLocalParts.map((p: any) => ({ ...p, code: formatCanonicalCode(p.code) })) : [];
        const localServices = JSON.parse(localStorage.getItem('vollen_services') || '[]');
        const rawLocalEquipments = JSON.parse(localStorage.getItem('vollen_equipments') || '[]');
        const localEquipments = Array.isArray(rawLocalEquipments) ? rawLocalEquipments.map((e: any) => ({ ...e, code: formatCanonicalCode(e.code) })) : [];
        const rawLocalBrands = JSON.parse(localStorage.getItem('vollen_brands') || '[]');
        const localBrands = Array.isArray(rawLocalBrands) ? rawLocalBrands.map((b: any) => ({ ...b, code: formatCanonicalCode(b.code) })) : [];
        const rawLocalModels = JSON.parse(localStorage.getItem('vollen_models') || '[]');
        const localModels = Array.isArray(rawLocalModels) ? rawLocalModels.map((m: any) => ({ ...m, code: formatCanonicalCode(m.code) })) : [];

        if (Array.isArray(localParts) && localParts.length > 0) {
          setParts(localParts);
        } else {
          setParts((prev: any[]) => {
            if (prev.length > 0) {
              const formatted = prev.map((p: any) => ({ ...p, code: formatCanonicalCode(p.code) }));
              try { localStorage.setItem('vollen_parts_stock', JSON.stringify(formatted)); } catch {}
              return formatted;
            }
            return prev;
          });
        }

        if (Array.isArray(localServices) && localServices.length > 0) {
          setServices(localServices);
        } else {
          setServices((prev: any[]) => {
            if (prev.length > 0) {
              try { localStorage.setItem('vollen_services', JSON.stringify(prev)); } catch {}
            }
            return prev;
          });
        }

        if (Array.isArray(localEquipments) && localEquipments.length > 0) {
          setEquipments(localEquipments);
        } else {
          setEquipments((prev: any[]) => {
            if (prev.length > 0) {
              const formatted = prev.map((e: any) => ({ ...e, code: formatCanonicalCode(e.code) }));
              try { localStorage.setItem('vollen_equipments', JSON.stringify(formatted)); } catch {}
              return formatted;
            }
            return prev;
          });
        }

        if (Array.isArray(localBrands) && localBrands.length > 0) {
          setBrands(localBrands);
        } else {
          setBrands((prev: any[]) => {
            if (prev.length > 0) {
              const formatted = prev.map((b: any) => ({ ...b, code: formatCanonicalCode(b.code) }));
              try { localStorage.setItem('vollen_brands', JSON.stringify(formatted)); } catch {}
              return formatted;
            }
            return prev;
          });
        }

        if (Array.isArray(localModels) && localModels.length > 0) {
          setModels(localModels);
        } else {
          setModels((prev: any[]) => {
            if (prev.length > 0) {
              const formatted = prev.map((m: any) => ({ ...m, code: formatCanonicalCode(m.code) }));
              try { localStorage.setItem('vollen_models', JSON.stringify(formatted)); } catch {}
              return formatted;
            }
            return prev;
          });
        }

        // Busca coleções do Firestore de forma assíncrona sem travar a interface
        Promise.all([
          getDocs(collection(db, 'parts')).catch(() => null),
          getDocs(collection(db, 'services')).catch(() => null),
          getDocs(collection(db, 'equipments')).catch(() => null),
          getDocs(collection(db, 'estimates')).catch(() => null),
          getDocs(collection(db, 'brands')).catch(() => null),
          getDocs(collection(db, 'models')).catch(() => null),
          getDocs(collection(db, 'technicians')).catch(() => null),
          getDocs(collection(db, 'client_debts')).catch(() => null),
          getDocs(collection(db, 'users')).catch(() => null),
        ]).then(([partsSnap, srvSnap, eqSnap, estSnap, brandsSnap, modelsSnap, techSnap, debtsSnap, usersSnap]) => {
          if (srvSnap && !srvSnap.empty) {
            const sList = srvSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
            setServices(sList);
            localStorage.setItem('vollen_services', JSON.stringify(sList));
          }
          if (partsSnap && !partsSnap.empty) {
            const pList = partsSnap.docs.map((d) => ({ id: d.id, ...d.data(), code: formatCanonicalCode((d.data() as any).code) })) as any[];
            setParts(pList);
            localStorage.setItem('vollen_parts_stock', JSON.stringify(pList));
          }
          if (eqSnap && !eqSnap.empty) {
            const eList = eqSnap.docs.map((d) => ({ id: d.id, ...d.data(), code: formatCanonicalCode((d.data() as any).code) })) as any[];
            setEquipments(eList);
            localStorage.setItem('vollen_equipments', JSON.stringify(eList));
          }
          if (estSnap && !estSnap.empty) {
            const estList = estSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
            setEstimates(estList);
            localStorage.setItem('vollen_estimates', JSON.stringify(estList));
          }
          if (brandsSnap && !brandsSnap.empty) {
            const bList = brandsSnap.docs.map((d) => ({ id: d.id, ...d.data(), code: formatCanonicalCode((d.data() as any).code) })) as any[];
            setBrands(bList);
            localStorage.setItem('vollen_brands', JSON.stringify(bList));
          }
          if (modelsSnap && !modelsSnap.empty) {
            const mList = modelsSnap.docs.map((d) => ({ id: d.id, ...d.data(), code: formatCanonicalCode((d.data() as any).code) })) as any[];
            setModels(mList);
            localStorage.setItem('vollen_models', JSON.stringify(mList));
          }
          // Sincroniza débitos / notas promissórias do Firestore
          if (debtsSnap && !debtsSnap.empty) {
            const dList = debtsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
            localStorage.setItem('vollen_client_debts', JSON.stringify(dList));
          } else if (debtsSnap && debtsSnap.empty) {
            localStorage.removeItem('vollen_client_debts');
          }
          // Sincroniza usuários do Firestore
          if (usersSnap && !usersSnap.empty) {
            const uList = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
            localStorage.setItem('vollen_users', JSON.stringify(uList));
          }
          // Sincroniza técnicos do Firestore → vollen_technicians e vollen_users
          if (techSnap && !techSnap.empty) {
            const tList = techSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
            localStorage.setItem('vollen_technicians', JSON.stringify(tList));
            syncTechniciansToUsers(tList);
          }
        }).catch(() => {});
      } catch (err) {
        console.warn('Erro ao carregar cadastros:', err);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  }, [setOrders, setClients, setVisits, setMaxEverOrderCode, setParts, setServices, setEquipments, setBrands, setModels, setEstimates]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  /** Merge technicians from vollen_technicians into vollen_users so they
   *  appear in the Users Management modal. Preserves existing user records
   *  (never overwrites a user that was manually created). */
  const syncTechniciansToUsers = (techList: any[]) => {
    if (!Array.isArray(techList) || techList.length === 0) return;
    try {
      const DEFAULT_TECNICO_PERMISSIONS = {
        createOS: true, editOS: true, cancelOS: false, finalizeOS: true,
        reopenOS: true, deleteOS: false, viewOpenOrders: true, viewFinishedOrders: true,
        viewAuditHistory: true, printOS: true,
        manageEstimates: true, manageSales: true,
        manageCashRegister: false, openCloseCashRegister: false, manageManualCashMovement: false,
        manageAccountsPayable: false, manageAccountsReceivable: false, manageFinancialDRE: false, manageFiscalInvoices: false,
        manageClients: true, manageParts: true, manageQuickStock: true,
        managePurchaseOrders: false, manageSuppliers: false, manageServices: true,
        manageEquipments: true, manageTechnicians: false, manageOrderStatus: false,
        manageOSGeneralConfig: false, manageOrderSequence: false, manageWarrantyTerms: false, managePrinterConfig: true,
        manageShortcuts: true,
        viewGeneralReports: false, viewTechnicianReports: true, manageLabelsGenerator: true,
        manageCompanyData: false, manageMobileLink: false, manageLocalNetwork: false,
        manageWallpaper: true, manageSerialLicense: false, manageUsers: false,
        accessBackup: false, accessFactoryReset: false,
      };

      const savedUsers: any[] = JSON.parse(localStorage.getItem('vollen_users') || '[]');
      const userMap = new Map<string, any>();
      savedUsers.forEach((u: any) => {
        // Index by id, username (lowercase) and name (uppercase)
        if (u.id) userMap.set(String(u.id), u);
        if (u.username) userMap.set((u.username as string).toLowerCase(), u);
        if (u.name) userMap.set((u.name as string).toUpperCase(), u);
      });

      let changed = false;
      techList.forEach((tech: any) => {
        const techName = (tech.name || '').trim();
        if (!techName) return;
        // Skip if already registered as a user
        const alreadyExists =
          (tech.id && userMap.has(String(tech.id))) ||
          (tech.username && userMap.has((tech.username as string).toLowerCase())) ||
          userMap.has(techName.toUpperCase());
        if (alreadyExists) return;

        const isAdmin = tech.role === 'ADMIN' || tech.isAdmin === true;
        const roleLabel = isAdmin ? 'Admin' : (tech.role === 'ATENDENTE' ? 'Atendimento' : 'Técnico');
        const newUser = {
          id: String(tech.id || `tech_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`),
          username: tech.username || techName.toLowerCase().replace(/\s+/g, '.'),
          name: techName,
          role: roleLabel,
          isAdmin,
          isTechnician: !isAdmin && tech.role !== 'ATENDENTE',
          isAttendant: tech.role === 'ATENDENTE',
          permissions: DEFAULT_TECNICO_PERMISSIONS,
          // Keep extra tech fields for reference
          phone: tech.phone || '',
          specialty: tech.specialty || '',
          active: tech.active !== false,
        };
        savedUsers.push(newUser);
        userMap.set(String(newUser.id), newUser);
        userMap.set(newUser.username.toLowerCase(), newUser);
        userMap.set(techName.toUpperCase(), newUser);
        changed = true;
      });

      if (changed) {
        localStorage.setItem('vollen_users', JSON.stringify(savedUsers));
      }
    } catch (err) {
      console.warn('Erro ao sincronizar técnicos → usuários:', err);
    }
  };

  // ── Listeners de tempo real do Firestore ───────────────────────────────────
  const setupFirestoreListeners = useCallback(() => {
    let unsubParts = () => {};
    let unsubServices = () => {};
    let unsubEquipments = () => {};
    let unsubBrands = () => {};
    let unsubModels = () => {};
    let unsubEstimates = () => {};
    let unsubCompany = () => {};
    let unsubStatuses = () => {};
    let unsubConfig = () => {};
    let unsubTechnicians = () => {};
    let unsubDebts = () => {};
    let unsubUsers = () => {};

    try {
      unsubParts = onSnapshot(collection(db, 'parts'), (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        setParts(list);
        try { localStorage.setItem('vollen_parts_stock', JSON.stringify(list)); } catch {}
      });

      unsubServices = onSnapshot(collection(db, 'services'), (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        setServices(list);
        try { localStorage.setItem('vollen_services', JSON.stringify(list)); } catch {}
      });

      unsubEquipments = onSnapshot(collection(db, 'equipments'), (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        setEquipments(list);
        try { localStorage.setItem('vollen_equipments', JSON.stringify(list)); } catch {}
      });

      unsubBrands = onSnapshot(collection(db, 'brands'), (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        setBrands(list);
        try { localStorage.setItem('vollen_brands', JSON.stringify(list)); } catch {}
      });

      unsubModels = onSnapshot(collection(db, 'models'), (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        setModels(list);
        try { localStorage.setItem('vollen_models', JSON.stringify(list)); } catch {}
      });

      unsubEstimates = onSnapshot(collection(db, 'estimates'), (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        setEstimates(list);
        if (list.length > 0) {
          try { localStorage.setItem('vollen_estimates', JSON.stringify(list)); } catch {}
        } else {
          try { localStorage.removeItem('vollen_estimates'); } catch {}
        }
      });

      unsubDebts = onSnapshot(collection(db, 'client_debts'), (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (list.length > 0) {
          try { localStorage.setItem('vollen_client_debts', JSON.stringify(list)); } catch {}
        } else {
          try { localStorage.removeItem('vollen_client_debts'); } catch {}
        }
        window.dispatchEvent(new Event('storage'));
      });

      unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          try { localStorage.setItem('vollen_users', JSON.stringify(list)); } catch {}
        }
      });

      unsubCompany = onSnapshot(doc(db, 'system_config', 'company_data'), (snap) => {
        if (snap.exists()) {
          const comp = snap.data() as CompanyData;
          setCompanyInfoState(comp);
          try { localStorage.setItem('vollen_company_data', JSON.stringify(comp)); } catch {}
        }
      });

      unsubStatuses = onSnapshot(collection(db, 'os_statuses'), (snap) => {
        if (!snap.empty) {
          const cloudList = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
          const localList = getRegisteredOSStatuses();
          const merged = sanitizeAndNormalizeStatuses([...localList, ...cloudList]);
          try { localStorage.setItem('custom_os_statuses_v3', JSON.stringify(merged)); } catch {}
        }
      });

      // Listener de técnicos: sincroniza vollen_technicians e também vollen_users
      unsubTechnicians = onSnapshot(collection(db, 'technicians'), (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
          try { localStorage.setItem('vollen_technicians', JSON.stringify(list)); } catch {}
          syncTechniciansToUsers(list);
        }
      });

      unsubConfig = onSnapshot(doc(db, 'system_config', 'os_preferences'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          try {
            localStorage.setItem('vollen_os_preferences', JSON.stringify(data));
            localStorage.setItem('vollen_os_general_config', JSON.stringify(data));
          } catch {}
        }
      });

      onSnapshot(doc(db, 'system_config', 'warranty_config'), (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setDefaultWarrantyConfig((prev: any) => ({ ...prev, ...data }));
          try { localStorage.setItem('vollen_os_config', JSON.stringify(data)); } catch {}
        }
      });

      // Registra/sincroniza ApiKey da empresa para o APK
      import('../services/licenseService').then(async ({ getMasterFirestore, getSavedTenantFirebaseConfig, MASTER_CATALOG_FIREBASE_CONFIG }) => {
        try {
          const { getDoc, setDoc: fsSetDoc, doc: fsDoc } = await import('firebase/firestore');

          let finalApiKey = '';
          try {
            const firestoreSnap = await getDoc(fsDoc(db, 'system_config', 'company_apikey'));
            if (firestoreSnap.exists() && firestoreSnap.data()?.apiKey) {
              finalApiKey = firestoreSnap.data().apiKey;
            }
          } catch {}

          if (!finalApiKey) {
            finalApiKey = localStorage.getItem('vollen_company_apikey') || '';
          }

          if (!finalApiKey) {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            const block = (n: number) =>
              Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
            finalApiKey = `${block(5)}-${block(5)}-${block(5)}`;
          }

          try { localStorage.setItem('vollen_company_apikey', finalApiKey); } catch {}

          let resolvedCompanyName = '';
          try {
            const compSnap = await getDoc(fsDoc(db, 'system_config', 'company_data'));
            if (compSnap.exists()) {
              const d = compSnap.data() as any;
              resolvedCompanyName = d.tradingName || d.name || d.companyName || '';
            }
          } catch {}
          if (!resolvedCompanyName) {
            try {
              const localComp = JSON.parse(localStorage.getItem('vollen_company_data') || '{}');
              resolvedCompanyName = localComp.tradingName || localComp.name || '';
            } catch {}
          }

          const tenantCfg = getSavedTenantFirebaseConfig();
          // Apenas registra no catálogo se o cliente possuir uma base de dados em nuvem própria configurada
          if (tenantCfg && tenantCfg.projectId && tenantCfg.apiKey) {
            const cleanApiKey = finalApiKey.replace(/[\s-]/g, '').toUpperCase();
            const masterDb = getMasterFirestore();

            fsSetDoc(fsDoc(masterDb, 'mobile_apikeys', cleanApiKey), {
              apiKeyFormatted: finalApiKey,
              companyName: resolvedCompanyName || 'Empresa Vinculada',
              firebaseConfig: tenantCfg,
              updatedAt: new Date().toISOString(),
            }, { merge: true }).catch(() => {});
          }

          if (db) {
            fsSetDoc(fsDoc(db, 'system_config', 'company_apikey'), {
              apiKey: finalApiKey,
              updatedAt: new Date().toISOString(),
            }, { merge: true }).catch(() => {});
          }
        } catch (err) {
          console.warn('Erro ao sincronizar ApiKey:', err);
        }
      });
    } catch (err) {
      console.warn('Erro ao conectar listeners de catálogo:', err);
    }

    return () => {
      unsubParts();
      unsubServices();
      unsubEquipments();
      unsubCompany();
      unsubStatuses();
      unsubConfig();
      unsubEstimates();
      unsubTechnicians();
      unsubDebts();
      unsubUsers();
    };
  }, [setParts, setServices, setEquipments, setEstimates, setCompanyInfoState, setDefaultWarrantyConfig]);

  return { loadData, setupFirestoreListeners };
}
