import { z } from 'zod';
import {
  ClientSchema,
  Client,
  EquipmentSchema,
  Equipment,
  PartSchema,
  Part,
  SupplierSchema,
  Supplier,
  ServiceItemSchema,
  ServiceItem,
  ServiceOrderSchema,
  ServiceOrder,
  EstimateSchema,
  Estimate,
  AccountBillSchema,
  AccountBill,
} from '@sistema-os/shared';

/**
 * Utilitário de persistência tipada para o localStorage com validação segura de schemas via Zod.
 * Garante que se o localStorage contiver dados corrompidos ou incompletos, o sistema
 * filtre com segurança ou recupere os dados sem quebrar a interface.
 */

export function getValidatedStorage<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return fallback;
    }
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const validation = schema.safeParse(parsed);
    if (validation.success) {
      return validation.data;
    }
    console.warn(`[TypedStorage] Dados divergentes para a chave "${key}". Retornando fallback seguro.`, validation.error);
    return fallback;
  } catch (err) {
    console.error(`[TypedStorage] Erro de parsing no localStorage para "${key}":`, err);
    return fallback;
  }
}

export function setValidatedStorage<T>(key: string, value: T, schema?: z.ZodType<T>): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    if (schema) {
      const validation = schema.safeParse(value);
      if (!validation.success) {
        console.error(`[TypedStorage] Tentativa de salvar dados inválidos para "${key}":`, validation.error);
        return;
      }
    }
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[TypedStorage] Erro ao gravar no localStorage para "${key}":`, err);
  }
}

// Schemas para listas
export const ClientsListSchema = z.array(ClientSchema);
export const EquipmentsListSchema = z.array(EquipmentSchema);
export const PartsListSchema = z.array(PartSchema);
export const SuppliersListSchema = z.array(SupplierSchema);
export const ServicesListSchema = z.array(ServiceItemSchema);
export const ServiceOrdersListSchema = z.array(ServiceOrderSchema);
export const EstimatesListSchema = z.array(EstimateSchema);
export const AccountBillsListSchema = z.array(AccountBillSchema);

export const TypedStorage = {
  getClients: (): Client[] => getValidatedStorage('vollen_clients', ClientsListSchema, []) as Client[],
  setClients: (clients: Client[]) => setValidatedStorage('vollen_clients', clients, ClientsListSchema),

  getParts: (): Part[] => getValidatedStorage('vollen_parts_stock', PartsListSchema, []) as Part[],
  setParts: (parts: Part[]) => {
    setValidatedStorage('vollen_parts_stock', parts, PartsListSchema);
    setValidatedStorage('vollen_parts', parts, PartsListSchema);
  },

  getServices: (): ServiceItem[] => getValidatedStorage('vollen_services', ServicesListSchema, []) as ServiceItem[],
  setServices: (services: ServiceItem[]) => setValidatedStorage('vollen_services', services, ServicesListSchema),

  getEquipments: (): Equipment[] => getValidatedStorage('vollen_equipments', EquipmentsListSchema, []) as Equipment[],
  setEquipments: (equipments: Equipment[]) => {
    setValidatedStorage('vollen_equipments', equipments, EquipmentsListSchema);
    setValidatedStorage('system_equipments', equipments, EquipmentsListSchema);
  },

  getSuppliers: (): Supplier[] => getValidatedStorage('vollen_suppliers', SuppliersListSchema, []) as Supplier[],
  setSuppliers: (suppliers: Supplier[]) => setValidatedStorage('vollen_suppliers', suppliers, SuppliersListSchema),

  getOrders: (): ServiceOrder[] => getValidatedStorage('vollen_orders', ServiceOrdersListSchema, []) as ServiceOrder[],
  setOrders: (orders: ServiceOrder[]) => {
    setValidatedStorage('vollen_orders', orders, ServiceOrdersListSchema);
    setValidatedStorage('local_orders', orders, ServiceOrdersListSchema);
  },

  getEstimates: (): Estimate[] => getValidatedStorage('vollen_estimates', EstimatesListSchema, []) as Estimate[],
  setEstimates: (estimates: Estimate[]) => setValidatedStorage('vollen_estimates', estimates, EstimatesListSchema),

  getAccounts: (): AccountBill[] => getValidatedStorage('vollen_accounts_bills', AccountBillsListSchema, []) as AccountBill[],
  setAccounts: (bills: AccountBill[]) => setValidatedStorage('vollen_accounts_bills', bills, AccountBillsListSchema),
};
