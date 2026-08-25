import { z } from 'zod';
import { VisitStatus, PeriodoVisita, OrderStatus } from './enums';

export const ClientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().optional().nullable().or(z.literal('')),
  email: z.string().optional().nullable().or(z.literal('')),
  cep: z.string().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable().or(z.literal('')),
  number: z.string().optional().nullable().or(z.literal('')),
  neighborhood: z.string().optional().nullable().or(z.literal('')),
  city: z.string().optional().nullable().or(z.literal('')),
  state: z.string().optional().nullable().or(z.literal('')),
  createdAt: z.string().optional(),
});

export const EquipmentSchema = z.object({
  id: z.string().optional(),
  type: z.string().optional().nullable().or(z.literal('')),
  brand: z.string().optional().nullable().or(z.literal('')),
  model: z.string().optional().nullable().or(z.literal('')),
  serialNumber: z.string().optional().nullable().or(z.literal('')),
});

export const PartSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Nome da peça'),
  code: z.string().optional(),
  price: z.number().min(0, 'Preço deve ser maior ou igual a zero'),
  quantity: z.number().int().positive().default(1),
});

export const VisitSchema = z.object({
  id: z.string().optional(),
  orderId: z.string().optional(),
  date: z.string(), // YYYY-MM-DD
  period: z.string().optional().default('MANHA'),
  technicianName: z.string().optional().nullable().or(z.literal('')),
  status: z.nativeEnum(VisitStatus).default(VisitStatus.AGENDADA),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional(),
  signatureUrl: z.string().optional(),
  partsUsed: z.array(PartSchema).optional(),
});

export const ServiceOrderSchema = z.object({
  id: z.string().optional(),
  code: z.string().optional(),
  clientId: z.string(),
  client: ClientSchema.optional(),
  equipment: EquipmentSchema,
  problemDescription: z.string().optional().nullable().or(z.literal('')),
  status: z.nativeEnum(OrderStatus).default(OrderStatus.ABERTA),
  type: z.string().optional().nullable().or(z.literal('')),
  warrantyType: z.string().optional().nullable().or(z.literal('')),
  travelCost: z.string().optional().nullable().or(z.literal('')),
  discountCost: z.string().optional().nullable().or(z.literal('')),
  nfNumber: z.string().optional().nullable().or(z.literal('')),
  nfValue: z.string().optional().nullable().or(z.literal('')),
  purchaseDate: z.string().optional().nullable().or(z.literal('')),
  retailerName: z.string().optional().nullable().or(z.literal('')),
  cnpj: z.string().optional().nullable().or(z.literal('')),
  authorizedCode: z.string().optional().nullable().or(z.literal('')),
  guarantor: z.string().optional().nullable().or(z.literal('')),
  additionalNotes: z.string().optional().nullable().or(z.literal('')),
  exitDate: z.string().optional().nullable().or(z.literal('')),
  totalAmount: z.number().default(0),
  visits: z.array(VisitSchema).optional(),
  createdAt: z.string().optional(),
});

export type Client = z.infer<typeof ClientSchema>;
export type Equipment = z.infer<typeof EquipmentSchema>;
export type Part = z.infer<typeof PartSchema>;
export type Visit = z.infer<typeof VisitSchema>;
export type ServiceOrder = z.infer<typeof ServiceOrderSchema>;
