import { describe, it, expect } from 'vitest';
import {
  ClientSchema,
  PartSchema,
  ServiceItemSchema,
  VisitSchema,
  ServiceOrderSchema,
  OrderStatus,
  sanitizeString,
  sanitizeObject,
} from '../index';

describe('Shared Schemas & Validation', () => {
  it('valida cliente válido com sucesso', () => {
    const validClient = {
      name: 'João Silva',
      phone: '11999998888',
      email: 'joao@email.com',
      address: 'Rua das Flores',
      number: '123',
    };

    const parsed = ClientSchema.safeParse(validClient);
    expect(parsed.success).toBe(true);
  });

  it('rejeita cliente sem nome', () => {
    const invalidClient = {
      name: '',
      phone: '11999998888',
    };

    const parsed = ClientSchema.safeParse(invalidClient);
    expect(parsed.success).toBe(false);
  });

  it('valida e preenche defaults para Peça', () => {
    const rawPart = {
      name: 'Tela LCD 15.6',
      price: 250,
    };

    const parsed = PartSchema.safeParse(rawPart);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.stockQuantity).toBe(0);
      expect(parsed.data.unit).toBe('UN');
    }
  });

  it('valida Ordem de Serviço completa com status e totais', () => {
    const rawOrder = {
      code: 'OS-0001',
      problemDescription: 'Não liga',
      status: OrderStatus.ABERTA,
      totalAmount: 350.0,
      parts: [
        { name: 'Fonte ATX', price: 150, costPrice: 90 },
      ],
      services: [
        { name: 'Troca de fonte e limpeza', price: 200 },
      ],
    };

    const parsed = ServiceOrderSchema.safeParse(rawOrder);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe(OrderStatus.ABERTA);
      expect(parsed.data.parts?.length).toBe(1);
    }
  });
});

describe('Sanitizer & XSS Prevention', () => {
  it('escapa tags HTML perigosas em strings', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const sanitized = sanitizeString(maliciousInput);
    expect(sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  });

  it('sanitiza recursivamente campos de um objeto preservando campos seguros', () => {
    const payload = {
      name: 'Empresa <b>Teste</b>',
      notes: '<img src="x" onerror="alert(1)">',
      password: 'my<secure>pass',
    };

    const sanitized = sanitizeObject(payload);
    expect(sanitized.name).toBe('Empresa &lt;b&gt;Teste&lt;&#x2F;b&gt;');
    expect(sanitized.notes).toBe('&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;');
    // senha não deve ser alterada
    expect(sanitized.password).toBe('my<secure>pass');
  });
});
