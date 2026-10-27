import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { clientRoutes } from '../routes/clients';
import { orderRoutes } from '../routes/orders';
import { visitRoutes } from '../routes/visits';
import { authRoutes } from '../routes/auth';

describe('Fastify Server Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(clientRoutes, { prefix: '/api' });
    await app.register(orderRoutes, { prefix: '/api' });
    await app.register(visitRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/users retorna lista de usuários cadastrados ou fallback', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/users',
    });

    expect(response.statusCode).toBe(200);
    const users = JSON.parse(response.payload);
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
    expect(users[0]).toHaveProperty('id');
    expect(users[0]).toHaveProperty('name');
    expect(users[0]).not.toHaveProperty('password');
  });

  it('POST /api/login com credenciais inválidas retorna 401 ou 404', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/login',
      payload: {
        userId: '99999999',
        password: 'senha_incorreta_teste',
      },
    });

    expect([401, 404]).toContain(response.statusCode);
  });

  it('GET /api/clients lista os clientes cadastrados', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/clients',
    });

    expect(response.statusCode).toBe(200);
    const clients = JSON.parse(response.payload);
    expect(Array.isArray(clients)).toBe(true);
  });

  it('POST /api/clients valida schema Zod rejeitando cliente sem nome obrigatório', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/clients',
      payload: {
        name: '', // Nome inválido (min: 1)
        phone: '11999999999',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('GET /api/orders lista as ordens de serviço', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/orders',
    });

    expect(response.statusCode).toBe(200);
    const orders = JSON.parse(response.payload);
    expect(Array.isArray(orders)).toBe(true);
  });

  it('GET /api/visits lista agendamentos de visitas técnicas', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/visits',
    });

    expect(response.statusCode).toBe(200);
    const visits = JSON.parse(response.payload);
    expect(Array.isArray(visits)).toBe(true);
  });
});
