import Fastify from 'fastify';
import cors from '@fastify/cors';
import { clientRoutes } from './routes/clients';
import { authRoutes } from './routes/auth';
import { backupRoutes } from './routes/backup';
import { orderRoutes } from './routes/orders';
import { visitRoutes } from './routes/visits';
import { initSocketIO } from './socket';

const app = Fastify({ logger: true });

async function main() {
  await app.register(cors, { origin: '*' });

  app.get('/', async () => ({
    app: 'Sistema OS Server API',
    status: 'online',
    version: '1.0.0',
    endpoints: ['/api/auth/login', '/api/clients', '/api/orders', '/api/visits', '/api/backup', '/health'],
  }));

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  await app.register(authRoutes, { prefix: '/api' });
  await app.register(backupRoutes, { prefix: '/api' });
  await app.register(clientRoutes, { prefix: '/api' });
  await app.register(orderRoutes, { prefix: '/api' });
  await app.register(visitRoutes, { prefix: '/api' });

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3333;

  app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }

    // Initialize Socket.io attached to Fastify's HTTP server
    initSocketIO(app.server);
    console.log(`🚀 Servidor rodando em ${address}`);
    console.log(`⚡ WebSocket Socket.io ativo na porta ${PORT}`);
  });
}

main();
