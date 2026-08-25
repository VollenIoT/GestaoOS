import { z } from 'zod';
import { VisitStatus, OrderStatus } from './enums';
export declare const ClientSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    phone: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    email: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    cep: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    address: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    number: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    neighborhood: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    city: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    state: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    number?: string | null | undefined;
    id?: string | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
    cep?: string | null | undefined;
    address?: string | null | undefined;
    neighborhood?: string | null | undefined;
    city?: string | null | undefined;
    state?: string | null | undefined;
    createdAt?: string | undefined;
}, {
    name: string;
    number?: string | null | undefined;
    id?: string | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
    cep?: string | null | undefined;
    address?: string | null | undefined;
    neighborhood?: string | null | undefined;
    city?: string | null | undefined;
    state?: string | null | undefined;
    createdAt?: string | undefined;
}>;
export declare const EquipmentSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    type: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    brand: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    model: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    serialNumber: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    id?: string | undefined;
    type?: string | null | undefined;
    brand?: string | null | undefined;
    model?: string | null | undefined;
    serialNumber?: string | null | undefined;
}, {
    id?: string | undefined;
    type?: string | null | undefined;
    brand?: string | null | undefined;
    model?: string | null | undefined;
    serialNumber?: string | null | undefined;
}>;
export declare const PartSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    price: z.ZodNumber;
    quantity: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    price: number;
    quantity: number;
    id?: string | undefined;
    code?: string | undefined;
}, {
    name: string;
    price: number;
    id?: string | undefined;
    code?: string | undefined;
    quantity?: number | undefined;
}>;
export declare const VisitSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    orderId: z.ZodOptional<z.ZodString>;
    date: z.ZodString;
    period: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    technicianName: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    status: z.ZodDefault<z.ZodNativeEnum<typeof VisitStatus>>;
    notes: z.ZodOptional<z.ZodString>;
    photos: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    signatureUrl: z.ZodOptional<z.ZodString>;
    partsUsed: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
        price: z.ZodNumber;
        quantity: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        price: number;
        quantity: number;
        id?: string | undefined;
        code?: string | undefined;
    }, {
        name: string;
        price: number;
        id?: string | undefined;
        code?: string | undefined;
        quantity?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    status: VisitStatus;
    date: string;
    period: string;
    id?: string | undefined;
    orderId?: string | undefined;
    technicianName?: string | null | undefined;
    notes?: string | undefined;
    photos?: string[] | undefined;
    signatureUrl?: string | undefined;
    partsUsed?: {
        name: string;
        price: number;
        quantity: number;
        id?: string | undefined;
        code?: string | undefined;
    }[] | undefined;
}, {
    date: string;
    id?: string | undefined;
    status?: VisitStatus | undefined;
    orderId?: string | undefined;
    period?: string | undefined;
    technicianName?: string | null | undefined;
    notes?: string | undefined;
    photos?: string[] | undefined;
    signatureUrl?: string | undefined;
    partsUsed?: {
        name: string;
        price: number;
        id?: string | undefined;
        code?: string | undefined;
        quantity?: number | undefined;
    }[] | undefined;
}>;
export declare const ServiceOrderSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    clientId: z.ZodString;
    client: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        phone: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
        email: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
        cep: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
        address: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
        number: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
        neighborhood: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
        city: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
        state: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
        createdAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        number?: string | null | undefined;
        id?: string | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        cep?: string | null | undefined;
        address?: string | null | undefined;
        neighborhood?: string | null | undefined;
        city?: string | null | undefined;
        state?: string | null | undefined;
        createdAt?: string | undefined;
    }, {
        name: string;
        number?: string | null | undefined;
        id?: string | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        cep?: string | null | undefined;
        address?: string | null | undefined;
        neighborhood?: string | null | undefined;
        city?: string | null | undefined;
        state?: string | null | undefined;
        createdAt?: string | undefined;
    }>>;
    equipment: z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        type: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
        brand: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
        model: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
        serialNumber: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    }, "strip", z.ZodTypeAny, {
        id?: string | undefined;
        type?: string | null | undefined;
        brand?: string | null | undefined;
        model?: string | null | undefined;
        serialNumber?: string | null | undefined;
    }, {
        id?: string | undefined;
        type?: string | null | undefined;
        brand?: string | null | undefined;
        model?: string | null | undefined;
        serialNumber?: string | null | undefined;
    }>;
    problemDescription: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    status: z.ZodDefault<z.ZodNativeEnum<typeof OrderStatus>>;
    type: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    warrantyType: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    travelCost: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    discountCost: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    nfNumber: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    nfValue: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    purchaseDate: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    retailerName: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    cnpj: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    authorizedCode: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    guarantor: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    additionalNotes: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    exitDate: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    totalAmount: z.ZodDefault<z.ZodNumber>;
    visits: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        orderId: z.ZodOptional<z.ZodString>;
        date: z.ZodString;
        period: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        technicianName: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
        status: z.ZodDefault<z.ZodNativeEnum<typeof VisitStatus>>;
        notes: z.ZodOptional<z.ZodString>;
        photos: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        signatureUrl: z.ZodOptional<z.ZodString>;
        partsUsed: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
            code: z.ZodOptional<z.ZodString>;
            price: z.ZodNumber;
            quantity: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            price: number;
            quantity: number;
            id?: string | undefined;
            code?: string | undefined;
        }, {
            name: string;
            price: number;
            id?: string | undefined;
            code?: string | undefined;
            quantity?: number | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        status: VisitStatus;
        date: string;
        period: string;
        id?: string | undefined;
        orderId?: string | undefined;
        technicianName?: string | null | undefined;
        notes?: string | undefined;
        photos?: string[] | undefined;
        signatureUrl?: string | undefined;
        partsUsed?: {
            name: string;
            price: number;
            quantity: number;
            id?: string | undefined;
            code?: string | undefined;
        }[] | undefined;
    }, {
        date: string;
        id?: string | undefined;
        status?: VisitStatus | undefined;
        orderId?: string | undefined;
        period?: string | undefined;
        technicianName?: string | null | undefined;
        notes?: string | undefined;
        photos?: string[] | undefined;
        signatureUrl?: string | undefined;
        partsUsed?: {
            name: string;
            price: number;
            id?: string | undefined;
            code?: string | undefined;
            quantity?: number | undefined;
        }[] | undefined;
    }>, "many">>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: OrderStatus;
    clientId: string;
    equipment: {
        id?: string | undefined;
        type?: string | null | undefined;
        brand?: string | null | undefined;
        model?: string | null | undefined;
        serialNumber?: string | null | undefined;
    };
    totalAmount: number;
    id?: string | undefined;
    code?: string | undefined;
    type?: string | null | undefined;
    createdAt?: string | undefined;
    client?: {
        name: string;
        number?: string | null | undefined;
        id?: string | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        cep?: string | null | undefined;
        address?: string | null | undefined;
        neighborhood?: string | null | undefined;
        city?: string | null | undefined;
        state?: string | null | undefined;
        createdAt?: string | undefined;
    } | undefined;
    problemDescription?: string | null | undefined;
    warrantyType?: string | null | undefined;
    travelCost?: string | null | undefined;
    discountCost?: string | null | undefined;
    nfNumber?: string | null | undefined;
    nfValue?: string | null | undefined;
    purchaseDate?: string | null | undefined;
    retailerName?: string | null | undefined;
    cnpj?: string | null | undefined;
    authorizedCode?: string | null | undefined;
    guarantor?: string | null | undefined;
    additionalNotes?: string | null | undefined;
    exitDate?: string | null | undefined;
    visits?: {
        status: VisitStatus;
        date: string;
        period: string;
        id?: string | undefined;
        orderId?: string | undefined;
        technicianName?: string | null | undefined;
        notes?: string | undefined;
        photos?: string[] | undefined;
        signatureUrl?: string | undefined;
        partsUsed?: {
            name: string;
            price: number;
            quantity: number;
            id?: string | undefined;
            code?: string | undefined;
        }[] | undefined;
    }[] | undefined;
}, {
    clientId: string;
    equipment: {
        id?: string | undefined;
        type?: string | null | undefined;
        brand?: string | null | undefined;
        model?: string | null | undefined;
        serialNumber?: string | null | undefined;
    };
    id?: string | undefined;
    status?: OrderStatus | undefined;
    code?: string | undefined;
    type?: string | null | undefined;
    createdAt?: string | undefined;
    client?: {
        name: string;
        number?: string | null | undefined;
        id?: string | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        cep?: string | null | undefined;
        address?: string | null | undefined;
        neighborhood?: string | null | undefined;
        city?: string | null | undefined;
        state?: string | null | undefined;
        createdAt?: string | undefined;
    } | undefined;
    problemDescription?: string | null | undefined;
    warrantyType?: string | null | undefined;
    travelCost?: string | null | undefined;
    discountCost?: string | null | undefined;
    nfNumber?: string | null | undefined;
    nfValue?: string | null | undefined;
    purchaseDate?: string | null | undefined;
    retailerName?: string | null | undefined;
    cnpj?: string | null | undefined;
    authorizedCode?: string | null | undefined;
    guarantor?: string | null | undefined;
    additionalNotes?: string | null | undefined;
    exitDate?: string | null | undefined;
    totalAmount?: number | undefined;
    visits?: {
        date: string;
        id?: string | undefined;
        status?: VisitStatus | undefined;
        orderId?: string | undefined;
        period?: string | undefined;
        technicianName?: string | null | undefined;
        notes?: string | undefined;
        photos?: string[] | undefined;
        signatureUrl?: string | undefined;
        partsUsed?: {
            name: string;
            price: number;
            id?: string | undefined;
            code?: string | undefined;
            quantity?: number | undefined;
        }[] | undefined;
    }[] | undefined;
}>;
export type Client = z.infer<typeof ClientSchema>;
export type Equipment = z.infer<typeof EquipmentSchema>;
export type Part = z.infer<typeof PartSchema>;
export type Visit = z.infer<typeof VisitSchema>;
export type ServiceOrder = z.infer<typeof ServiceOrderSchema>;
