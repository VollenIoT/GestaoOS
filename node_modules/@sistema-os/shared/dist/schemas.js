"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceOrderSchema = exports.VisitSchema = exports.PartSchema = exports.EquipmentSchema = exports.ClientSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
exports.ClientSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1, 'Nome é obrigatório'),
    phone: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    email: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    cep: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    address: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    number: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    neighborhood: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    city: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    state: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    createdAt: zod_1.z.string().optional(),
});
exports.EquipmentSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    type: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    brand: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    model: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    serialNumber: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
});
exports.PartSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(2, 'Nome da peça'),
    code: zod_1.z.string().optional(),
    price: zod_1.z.number().min(0, 'Preço deve ser maior ou igual a zero'),
    quantity: zod_1.z.number().int().positive().default(1),
});
exports.VisitSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    orderId: zod_1.z.string().optional(),
    date: zod_1.z.string(), // YYYY-MM-DD
    period: zod_1.z.string().optional().default('MANHA'),
    technicianName: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    status: zod_1.z.nativeEnum(enums_1.VisitStatus).default(enums_1.VisitStatus.AGENDADA),
    notes: zod_1.z.string().optional(),
    photos: zod_1.z.array(zod_1.z.string()).optional(),
    signatureUrl: zod_1.z.string().optional(),
    partsUsed: zod_1.z.array(exports.PartSchema).optional(),
});
exports.ServiceOrderSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    code: zod_1.z.string().optional(),
    clientId: zod_1.z.string(),
    client: exports.ClientSchema.optional(),
    equipment: exports.EquipmentSchema,
    problemDescription: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    status: zod_1.z.nativeEnum(enums_1.OrderStatus).default(enums_1.OrderStatus.ABERTA),
    type: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    warrantyType: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    travelCost: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    discountCost: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    nfNumber: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    nfValue: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    purchaseDate: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    retailerName: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    cnpj: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    authorizedCode: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    guarantor: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    additionalNotes: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    exitDate: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    totalAmount: zod_1.z.number().default(0),
    visits: zod_1.z.array(exports.VisitSchema).optional(),
    createdAt: zod_1.z.string().optional(),
});
