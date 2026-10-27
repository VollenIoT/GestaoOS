import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from './db';
import { clientRoutes } from './routes/clients';
import { authRoutes } from './routes/auth';
import { backupRoutes } from './routes/backup';
import { orderRoutes } from './routes/orders';
import { visitRoutes } from './routes/visits';
import { initSocketIO } from './socket';
import { internalAuthMiddleware } from './middleware/authMiddleware';

const app = Fastify({ logger: true });

async function main() {
  // Rate limiting simples por IP em memória (100 requisições por minuto por IP)
  const ipRateMap = new Map<string, { count: number; resetTime: number }>();
  app.addHook('onRequest', async (request, reply) => {
    const ip = request.ip || '127.0.0.1';
    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxRequests = 120;

    const rate = ipRateMap.get(ip) || { count: 0, resetTime: now + windowMs };
    if (now > rate.resetTime) {
      rate.count = 1;
      rate.resetTime = now + windowMs;
    } else {
      rate.count += 1;
    }
    ipRateMap.set(ip, rate);

    if (rate.count > maxRequests) {
      return reply.status(429).send({
        error: 'Too Many Requests',
        message: 'Limite de requisições excedido. Tente novamente em alguns segundos.',
      });
    }
  });

  // CORS configurável via variável de ambiente (permite rede local ou domínios específicos)
  const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true;
  await app.register(cors, {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Rotas públicas (sem autenticação) — status e saúde detalhada do servidor
  app.get('/', async () => ({
    app: 'Sistema OS Server API',
    status: 'online',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: ['/api/auth/login', '/api/clients', '/api/orders', '/api/visits', '/api/backup', '/health'],
  }));

  // Health check completo com tempo de atividade (uptime), memória e status do banco de dados
  app.get('/health', async (request, reply) => {
    let dbStatus = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    const memoryUsage = process.memoryUsage();
    return reply.send({
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbStatus,
      memory: {
        rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      },
    });
  });

  // ✅ Segurança: registra o middleware de token interno para TODAS as rotas /api/*.
  // O desktop envia o header 'x-internal-token' em cada requisição.
  app.addHook('preHandler', async (request, reply) => {
    // Ignora verificação apenas para rotas públicas
    const publicPaths = ['/', '/health'];
    if (publicPaths.includes(request.url)) return;

    await internalAuthMiddleware(request, reply);
  });

  await app.register(authRoutes, { prefix: '/api' });
  await app.register(backupRoutes, { prefix: '/api' });
  await app.register(clientRoutes, { prefix: '/api' });
  await app.register(orderRoutes, { prefix: '/api' });
  await app.register(visitRoutes, { prefix: '/api' });

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3333;

  // Escuta em 0.0.0.0 para aceitar conexões de todos os computadores da rede local
  app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }

    // Initialize Socket.io attached to Fastify's HTTP server
    initSocketIO(app.server);
    console.log(`🚀 Servidor rodando em ${address}`);
    console.log(`⚡ WebSocket Socket.io ativo na porta ${PORT}`);
    console.log(`🔒 Token de API interno ativo — apenas o desktop app pode acessar a API.`);
  });
}

main();
