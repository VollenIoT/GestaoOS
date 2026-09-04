import Fastify from 'fastify';
import cors from '@fastify/cors';
import { clientRoutes } from './routes/clients';
import { authRoutes } from './routes/auth';
import { backupRoutes } from './routes/backup';
import { orderRoutes } from './routes/orders';
import { visitRoutes } from './routes/visits';
import { initSocketIO } from './socket';
import { internalAuthMiddleware } from './middleware/authMiddleware';

const app = Fastify({ logger: true });

async function main() {
  // ✅ Segurança: CORS restrito — aceita apenas requisições do localhost e do Electron.
  // Antes estava origin: '*', permitindo que qualquer site acessasse a API local.
  await app.register(cors, {
    origin: [
      'http://localhost',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173',
      'app://',          // Protocolo do Electron em produção
      'file://',         // Electron em desenvolvimento
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Rotas públicas (sem autenticação) — apenas status e saúde do servidor
  app.get('/', async () => ({
    app: 'Sistema OS Server API',
    status: 'online',
    version: '1.0.0',
    endpoints: ['/api/auth/login', '/api/clients', '/api/orders', '/api/visits', '/api/backup', '/health'],
  }));

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

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

  app.listen({ port: PORT, host: '127.0.0.1' }, (err, address) => {
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
