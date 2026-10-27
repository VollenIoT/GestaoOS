import { describe, it, expect, beforeEach } from 'vitest';
import { useCatalogStore } from '../stores/useCatalogStore';
import { useOrdersStore } from '../stores/useOrdersStore';
import { useUIStore } from '../stores/useUIStore';
import { Part, ServiceItem, ServiceOrder, Client } from '@sistema-os/shared';

describe('Desktop Zustand Stores & Complex State Flows', () => {
  beforeEach(() => {
    useCatalogStore.setState({ parts: [], services: [], equipments: [] });
    useOrdersStore.setState({ orders: [], clients: [], estimates: [], visits: [], maxEverOrderCode: 0 });
    useUIStore.setState({ activeTab: 'dashboard', statusMessage: '', isCapsLockActive: true });
  });

  it('gerencia estado do catálogo (parts e services) com tipagem estrita', () => {
    const testPart: Part = {
      id: 'p1',
      code: 'PEC-001',
      name: 'SSD NVMe 1TB Kingston',
      costPrice: 200,
      techPrice: 280,
      finalPrice: 350,
      profitMarginPercent: 75,
      unit: 'UN',
      stockQuantity: 12,
      minStock: 2,
      price: 350,
      quantity: 1,
    };

    const testService: ServiceItem = {
      id: 's1',
      code: 'SRV-001',
      name: 'Formatação e Instalação de Sistema Operacional',
      price: 150,
      costPrice: 0,
      category: 'Software',
      estimatedHours: 2,
    };

    useCatalogStore.getState().setParts([testPart]);
    useCatalogStore.getState().setServices([testService]);

    expect(useCatalogStore.getState().parts).toHaveLength(1);
    expect(useCatalogStore.getState().parts[0].name).toBe('SSD NVMe 1TB Kingston');
    expect(useCatalogStore.getState().parts[0].finalPrice).toBe(350);

    expect(useCatalogStore.getState().services).toHaveLength(1);
    expect(useCatalogStore.getState().services[0].name).toContain('Formatação');
  });

  it('suporta atualizações funcionais prev => next em useOrdersStore', () => {
    const order1: ServiceOrder = {
      id: 'o1',
      code: 'OS-0001',
      status: 'ABERTA',
      totalAmount: 150,
      partsCost: 0,
      servicesCost: 150,
    };

    const order2: ServiceOrder = {
      id: 'o2',
      code: 'OS-0002',
      status: 'CONCLUIDA',
      totalAmount: 450,
      partsCost: 300,
      servicesCost: 150,
    };

    useOrdersStore.getState().setOrders([order1]);
    expect(useOrdersStore.getState().orders).toHaveLength(1);

    // Atualizador funcional (prev => [order2, ...prev])
    useOrdersStore.getState().setOrders((prev: ServiceOrder[]) => [order2, ...prev]);
    expect(useOrdersStore.getState().orders).toHaveLength(2);
    expect(useOrdersStore.getState().orders[0].code).toBe('OS-0002');
    expect(useOrdersStore.getState().orders[1].code).toBe('OS-0001');
  });

  it('gerencia clientes e calcula maxEverOrderCode dinamicamente', () => {
    const client: Client = {
      id: 'c1',
      name: 'Maria Oliveira',
      phone: '11988887777',
      whatsapp: '11988887777',
      city: 'São Paulo',
      state: 'SP',
    };

    useOrdersStore.getState().setClients([client]);
    useOrdersStore.getState().setMaxEverOrderCode(120);

    expect(useOrdersStore.getState().clients).toHaveLength(1);
    expect(useOrdersStore.getState().clients[0].name).toBe('Maria Oliveira');
    expect(useOrdersStore.getState().maxEverOrderCode).toBe(120);
  });

  it('controla abas, maiúsculas (Caps Lock) e mensagens de status no UIStore', () => {
    const { setActiveTab, setStatusMessage, toggleCapsLock } = useUIStore.getState();

    setActiveTab('schedule');
    expect(useUIStore.getState().activeTab).toBe('schedule');

    setStatusMessage('Ordem de serviço salva com sucesso!');
    expect(useUIStore.getState().statusMessage).toBe('Ordem de serviço salva com sucesso!');

    const initialCaps = useUIStore.getState().isCapsLockActive;
    toggleCapsLock();
    expect(useUIStore.getState().isCapsLockActive).toBe(!initialCaps);
  });
});
