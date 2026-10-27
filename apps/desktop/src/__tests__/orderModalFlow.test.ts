import { describe, it, expect } from 'vitest';
import {
  ClientSchema,
  ServiceOrderSchema,
  PartSchema,
  ServiceItemSchema,
  VisitSchema,
  EstimateSchema,
  AccountBillSchema,
} from '@sistema-os/shared';

describe('CreateOrderModal & Shared Schemas Integration', () => {
  it('valida uma Ordem de Serviço completa e íntegra', () => {
    const validOrder = {
      code: 'OS-0042',
      status: 'ABERTA',
      type: 'ORCAMENTO',
      client: {
        name: 'Roberto Carlos',
        phone: '11987654321',
        whatsapp: '11987654321',
        personType: 'PF' as const,
        cpf: '123.456.789-00',
        city: 'São Paulo',
        state: 'SP',
      },
      equipment: {
        type: 'Notebook',
        brand: 'Dell',
        model: 'Inspiron 15',
        serialNumber: 'SN-987654',
      },
      problemDescription: 'Aparelho não liga após queda de energia',
      technicalReport: 'Curto-circuito identificado no circuito primário da placa-mãe',
      warrantyType: 'GARANTIA_LOJA',
      warrantyTermsData: {
        periodDays: '90',
        startDate: '2026-09-09',
        coverageType: 'PECAS_E_MAO_DE_OBRA',
        termsText: 'Garantia legal de 90 dias cobrindo peças e serviços.',
        printTerms: true,
      },
      partsUsed: [
        {
          name: 'Mosfet de Entrada 30V',
          code: 'PEC-010',
          price: 45.0,
          quantity: 2,
        },
      ],
      servicesExecuted: [
        {
          name: 'Reparo de Circuito de Alimentação (Placa-mãe)',
          price: 250.0,
        },
      ],
      partsCost: 90.0,
      servicesCost: 250.0,
      totalAmount: 340.0,
    };

    const parsed = ServiceOrderSchema.parse(validOrder);
    expect(parsed.code).toBe('OS-0042');
    expect(parsed.client?.name).toBe('Roberto Carlos');
    expect(parsed.equipment?.model).toBe('Inspiron 15');
    expect(parsed.partsUsed).toHaveLength(1);
    expect(parsed.servicesExecuted).toHaveLength(1);
    expect(parsed.totalAmount).toBe(340.0);
    expect(parsed.warrantyTermsData?.periodDays).toBe('90');
  });

  it('valida uma Ordem de Retorno em Garantia vinculada à OS original', () => {
    const warrantyReturnOrder = {
      code: 'OS-0043',
      status: 'RETORNO_GARANTIA',
      originalOsCode: 'OS-0042',
      originalOsId: 'order_uuid_0042',
      originalExecutedService: 'Reparo de Circuito de Alimentação (Placa-mãe)',
      warrantyType: 'GARANTIA_LOJA',
      client: {
        name: 'Roberto Carlos',
      },
      equipment: {
        type: 'Notebook',
        brand: 'Dell',
        model: 'Inspiron 15',
      },
      problemDescription: 'Notebook voltou a desligar sozinho',
      totalAmount: 0,
      partsCost: 0,
      servicesCost: 0,
    };

    const parsed = ServiceOrderSchema.parse(warrantyReturnOrder);
    expect(parsed.status).toBe('RETORNO_GARANTIA');
    expect(parsed.originalOsCode).toBe('OS-0042');
    expect(parsed.originalOsId).toBe('order_uuid_0042');
    expect(parsed.originalExecutedService).toBe('Reparo de Circuito de Alimentação (Placa-mãe)');
  });

  it('rejeita cliente sem nome ao submeter formulário de ordem de serviço', () => {
    const invalidClient = {
      name: '',
      phone: '11999999999',
    };

    expect(() => ClientSchema.parse(invalidClient)).toThrow();
  });

  it('calcula e valida totais financeiros corretamente em orçamentos e contas a pagar', () => {
    const estimate = {
      id: 'est-1',
      code: 'ORC-0001',
      totalAmount: 500,
      status: 'PENDENTE' as const,
      validityDays: 10,
    };

    const parsedEstimate = EstimateSchema.parse(estimate);
    expect(parsedEstimate.totalAmount).toBe(500);
    expect(parsedEstimate.validityDays).toBe(10);

    const bill = {
      id: 'bill-1',
      type: 'PAGAR' as const,
      description: 'Compra de peças - Fornecedor Alpha',
      entityName: 'Alpha Distribuidora',
      amount: 1200.5,
      dueDate: '2026-09-20',
      status: 'PENDENTE' as const,
    };

    const parsedBill = AccountBillSchema.parse(bill);
    expect(parsedBill.amount).toBe(1200.5);
    expect(parsedBill.type).toBe('PAGAR');
  });
});
