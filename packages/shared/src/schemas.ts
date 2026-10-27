import { z } from 'zod';
import { VisitStatus, PeriodoVisita, OrderStatus } from './enums';

export const AdditionalContactSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  phone: z.string(),
});

export const UserSchema = z.object({
  id: z.string(),
  username: z.string().optional(),
  name: z.string(),
  role: z.string().default('ADMIN'),
  isAdmin: z.boolean().optional(),
  isTechnician: z.boolean().optional(),
  isAttendant: z.boolean().optional(),
  token: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const ClientSchema = z.object({
  id: z.string().optional(),
  code: z.string().optional(),
  personType: z.enum(['PF', 'PJ']).optional(),
  name: z.string().min(1, 'Nome é obrigatório'),
  tradeName: z.string().optional().nullable().or(z.literal('')),
  cpf: z.string().optional().nullable().or(z.literal('')),
  cnpj: z.string().optional().nullable().or(z.literal('')),
  rg: z.string().optional().nullable().or(z.literal('')),
  ie: z.string().optional().nullable().or(z.literal('')),
  im: z.string().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  whatsapp: z.string().optional().nullable().or(z.literal('')),
  contactName: z.string().optional().nullable().or(z.literal('')),
  contactPhone: z.string().optional().nullable().or(z.literal('')),
  additionalContacts: z.array(AdditionalContactSchema).optional(),
  email: z.string().optional().nullable().or(z.literal('')),
  cep: z.string().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable().or(z.literal('')),
  number: z.string().optional().nullable().or(z.literal('')),
  complement: z.string().optional().nullable().or(z.literal('')),
  neighborhood: z.string().optional().nullable().or(z.literal('')),
  city: z.string().optional().nullable().or(z.literal('')),
  state: z.string().optional().nullable().or(z.literal('')),
  reference: z.string().optional().nullable().or(z.literal('')),
  additionalNotes: z.string().optional().nullable().or(z.literal('')),
  isDeleted: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const EquipmentSchema = z.object({
  id: z.string().optional(),
  code: z.string().optional(),
  type: z.string().optional().nullable().or(z.literal('')),
  brand: z.string().optional().nullable().or(z.literal('')),
  model: z.string().optional().nullable().or(z.literal('')),
  serialNumber: z.string().optional().nullable().or(z.literal('')),
  voltage: z.string().optional().nullable().or(z.literal('')),
  accessories: z.string().optional().nullable().or(z.literal('')),
  condition: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const PartSchema = z.object({
  id: z.string().optional(),
  code: z.string().optional(),
  name: z.string().min(2, 'Nome da peça'),
  manufacturerCode: z.string().optional().nullable().or(z.literal('')),
  brand: z.string().optional().nullable().or(z.literal('')),
  group: z.string().optional().nullable().or(z.literal('')),
  location: z.string().optional().nullable().or(z.literal('')),
  costPrice: z.number().min(0).optional().default(0),
  techPrice: z.number().min(0).optional().default(0),
  finalPrice: z.number().min(0).optional().default(0),
  profitMarginPercent: z.number().optional().default(0),
  unit: z.string().optional().default('UN'),
  stockQuantity: z.number().optional().default(0),
  minStock: z.number().optional().default(0),
  supplierId: z.string().optional().nullable().or(z.literal('')),
  supplierName: z.string().optional().nullable().or(z.literal('')),
  application: z.string().optional().nullable().or(z.literal('')),
  price: z.number().min(0).optional().default(0),
  quantity: z.number().optional().default(1),
  updatedAt: z.string().optional(),
  createdAt: z.string().optional(),
});

export const SupplierSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string().min(1, 'Nome do fornecedor é obrigatório'),
  tradeName: z.string().optional(),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  contactName: z.string().optional(),
  email: z.string().optional(),
  cep: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const ServiceItemSchema = z.object({
  id: z.string().optional(),
  code: z.string().optional(),
  name: z.string().min(1, 'Nome do serviço'),
  price: z.number().min(0).optional().default(0),
  costPrice: z.number().min(0).optional().default(0),
  category: z.string().optional(),
  estimatedHours: z.number().optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const VisitSchema = z.object({
  id: z.string().optional(),
  orderId: z.string().optional(),
  orderCode: z.string().optional(),
  date: z.string(), // YYYY-MM-DD
  scheduledDate: z.string().optional(),
  period: z.string().optional().default('MANHA'),
  technicianName: z.string().optional().nullable().or(z.literal('')),
  status: z.nativeEnum(VisitStatus).default(VisitStatus.AGENDADA),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional(),
  signatureUrl: z.string().optional(),
  partsUsed: z.array(PartSchema).optional(),
});

export const WarrantyTermsDataSchema = z.object({
  periodDays: z.string().optional(),
  startDate: z.string().optional(),
  coverageType: z.string().optional(),
  termsText: z.string().optional(),
  printTerms: z.boolean().optional(),
}).optional();

export const ServiceOrderSchema = z.object({
  id: z.string().optional(),
  code: z.string().optional(),
  clientId: z.string().optional(),
  client: ClientSchema.optional(),
  equipment: EquipmentSchema.optional(),
  problemDescription: z.string().optional().nullable().or(z.literal('')),
  technicalReport: z.string().optional().nullable().or(z.literal('')),
  executedService: z.string().optional().nullable().or(z.literal('')),
  originalExecutedService: z.string().optional().nullable().or(z.literal('')),
  returnExecutedService: z.string().optional().nullable().or(z.literal('')),
  orderObservations: z.string().optional().nullable().or(z.literal('')),
  status: z.nativeEnum(OrderStatus).or(z.string()).default(OrderStatus.ABERTA),
  type: z.string().optional().nullable().or(z.literal('')),
  warrantyType: z.string().optional().nullable().or(z.literal('')),
  warrantyTermsData: WarrantyTermsDataSchema,
  originalOsCode: z.string().optional().nullable().or(z.literal('')),
  originalOsId: z.string().optional().nullable().or(z.literal('')),
  warrantyReturnOsCode: z.string().optional().nullable().or(z.literal('')),
  warrantyReturnOsId: z.string().optional().nullable().or(z.literal('')),
  technician: z.string().optional().nullable().or(z.literal('')),
  technicianName: z.string().optional().nullable().or(z.literal('')),
  technicianId: z.string().optional().nullable().or(z.literal('')),
  attendant: z.string().optional().nullable().or(z.literal('')),
  travelCost: z.union([z.string(), z.number()]).optional(),
  discountCost: z.union([z.string(), z.number()]).optional(),
  partsCost: z.number().optional().default(0),
  servicesCost: z.number().optional().default(0),
  advancePayment: z.union([z.string(), z.number()]).optional(),
  paymentMethod: z.string().optional(),
  nfNumber: z.string().optional().nullable().or(z.literal('')),
  nfValue: z.string().optional().nullable().or(z.literal('')),
  purchaseDate: z.string().optional().nullable().or(z.literal('')),
  retailerName: z.string().optional().nullable().or(z.literal('')),
  cnpj: z.string().optional().nullable().or(z.literal('')),
  authorizedCode: z.string().optional().nullable().or(z.literal('')),
  guarantor: z.string().optional().nullable().or(z.literal('')),
  additionalNotes: z.string().optional().nullable().or(z.literal('')),
  entryDate: z.string().optional(),
  exitDate: z.string().optional().nullable().or(z.literal('')),
  totalAmount: z.number().default(0),
  parts: z.array(PartSchema).optional(),
  partsUsed: z.array(PartSchema).optional(),
  partsList: z.array(PartSchema).optional(),
  services: z.array(ServiceItemSchema).optional(),
  servicesExecuted: z.array(z.union([z.string(), ServiceItemSchema])).optional(),
  servicesList: z.array(ServiceItemSchema).optional(),
  visits: z.array(VisitSchema).optional(),
  isDeleted: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const EstimateSchema = z.object({
  id: z.string(),
  code: z.string(),
  client: ClientSchema.optional(),
  equipment: EquipmentSchema.optional(),
  problemDescription: z.string().optional(),
  technicalReport: z.string().optional(),
  parts: z.array(PartSchema).optional(),
  services: z.array(ServiceItemSchema).optional(),
  totalAmount: z.number().default(0),
  status: z.enum(['PENDENTE', 'APROVADO', 'REPROVADO', 'EXPIRADO']).default('PENDENTE'),
  validityDays: z.number().optional().default(10),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const AccountBillSchema = z.object({
  id: z.string(),
  type: z.enum(['PAGAR', 'RECEBER']),
  description: z.string(),
  entityName: z.string(),
  entityId: z.string().optional(),
  documentNumber: z.string().optional(),
  category: z.string().optional(),
  amount: z.number(),
  amountPaid: z.number().optional(),
  dueDate: z.string(),
  paymentDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  status: z.enum(['PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO']),
  notes: z.string().optional(),
  orderCode: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Role-Based Access Control (RBAC)
export const ModulePermissionSchema = z.object({
  canView: z.boolean().default(true),
  canCreate: z.boolean().default(false),
  canEdit: z.boolean().default(false),
  canDelete: z.boolean().default(false),
});

export const UserPermissionsSchema = z.object({
  orders: ModulePermissionSchema,
  clients: ModulePermissionSchema,
  financial: ModulePermissionSchema,
  stock: ModulePermissionSchema,
  reports: ModulePermissionSchema,
  settings: ModulePermissionSchema,
});

export const RoleDefinitionSchema = z.object({
  role: z.enum(['ADMIN', 'GERENTE', 'TECNICO', 'ATENDENTE']),
  label: z.string(),
  permissions: UserPermissionsSchema,
});

// Gestão de Movimentação de Estoque
export const StockMovementSchema = z.object({
  id: z.string(),
  partId: z.string(),
  partName: z.string(),
  type: z.enum(['ENTRADA', 'SAIDA', 'AJUSTE', 'RESERVA', 'DEVOLUCAO']),
  quantity: z.number(),
  previousStock: z.number(),
  newStock: z.number(),
  unitCost: z.number().optional(),
  orderId: z.string().optional(),
  orderCode: z.string().optional(),
  reason: z.string().optional(),
  responsibleUser: z.string(),
  createdAt: z.string(),
});

// Sincronização e Resolução de Conflitos
export const SyncRecordSchema = z.object({
  id: z.string(),
  entityType: z.enum(['orders', 'clients', 'parts', 'services', 'accounts']),
  entityId: z.string(),
  clientTimestamp: z.number(),
  serverTimestamp: z.number(),
  version: z.number().default(1),
  status: z.enum(['SYNCED', 'PENDING', 'CONFLICT', 'RESOLVED']),
  conflictData: z.record(z.any()).optional(),
  resolvedBy: z.string().optional(),
});

export type AdditionalContact = z.infer<typeof AdditionalContactSchema>;
export type User = z.infer<typeof UserSchema>;
export type AuthUser = z.infer<typeof UserSchema>;
export type Client = z.infer<typeof ClientSchema>;
export type Equipment = z.infer<typeof EquipmentSchema>;
export type Part = z.infer<typeof PartSchema>;
export type Supplier = z.infer<typeof SupplierSchema>;
export type ServiceItem = z.infer<typeof ServiceItemSchema>;
export type Visit = z.infer<typeof VisitSchema>;
export type ServiceOrder = z.infer<typeof ServiceOrderSchema>;
export type Estimate = z.infer<typeof EstimateSchema>;
export type AccountBill = z.infer<typeof AccountBillSchema>;
export type ModulePermission = z.infer<typeof ModulePermissionSchema>;
export type UserPermissions = z.infer<typeof UserPermissionsSchema>;
export type RoleDefinition = z.infer<typeof RoleDefinitionSchema>;
export type StockMovement = z.infer<typeof StockMovementSchema>;
export type SyncRecord = z.infer<typeof SyncRecordSchema>;
