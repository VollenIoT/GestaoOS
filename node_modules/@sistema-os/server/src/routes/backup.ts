import { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db';
import { USERS } from './auth';

export async function backupRoutes(fastify: FastifyInstance) {
  // Download do arquivo de backup do banco de dados SQLite
  fastify.get('/backup', async (request, reply) => {
    const dbPath = path.resolve(__dirname, '../../prisma/dev.db');
    if (!fs.existsSync(dbPath)) {
      return reply.status(404).send({ error: 'Arquivo de banco de dados não encontrado.' });
    }
    const dbBuffer = fs.readFileSync(dbPath);
    const dateStr = new Date().toISOString().split('T')[0];
    reply.header('Content-Type', 'application/x-sqlite3');
    reply.header('Content-Disposition', `attachment; filename=backup-os-${dateStr}.db`);
    return reply.send(dbBuffer);
  });

  // Notificação de Restauração de Backup
  fastify.post('/restore', async (request, reply) => {
    return reply.send({ success: true, message: 'Backup restaurado com sucesso!' });
  });

  // Rota de Restauração de Padrão de Fábrica (Exclusiva para Administrador com validação de senha)
  fastify.post('/factory-reset', async (request, reply) => {
    const {
      userId,
      password,
      resetClients,
      resetOrders,
    } = request.body as {
      userId: string;
      password?: string;
      resetClients?: boolean;
      resetOrders?: boolean;
    };

    const user = USERS.find((u) => u.id === userId || u.name === userId || u.role === 'ADMIN');
    if (!user) {
      return reply.status(404).send({ error: 'Usuário administrador não encontrado.' });
    }

    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Apenas o Administrador pode executar a restauração de fábrica.' });
    }

    if (user.pass !== password) {
      return reply.status(401).send({ error: 'Senha de administrador incorreta.' });
    }

    try {
      // 1. Reset de Ordens de Serviço e Visitas
      if (resetOrders) {
        await prisma.partUsed.deleteMany({});
        await prisma.visit.deleteMany({});
        await prisma.serviceOrder.deleteMany({});
        await prisma.counter.deleteMany({ where: { id: 'os_counter' } });
      }

      // 2. Reset de Clientes
      if (resetClients) {
        // Se não resetou as ordens, é necessário limpar dependências antes
        if (!resetOrders) {
          await prisma.partUsed.deleteMany({});
          await prisma.visit.deleteMany({});
          await prisma.serviceOrder.deleteMany({});
          await prisma.counter.deleteMany({ where: { id: 'os_counter' } });
        }
        await prisma.client.deleteMany({});
      }

      return reply.send({
        success: true,
        message: 'Restauração de padrão de fábrica concluída com sucesso!',
      });
    } catch (err: any) {
      console.error('Erro ao restaurar padrão de fábrica:', err);
      return reply.status(500).send({
        error: 'Erro interno ao processar a restauração no banco de dados.',
        details: err?.message,
      });
    }
  });
}

