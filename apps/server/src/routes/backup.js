"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupRoutes = backupRoutes;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("../db");
const auth_1 = require("./auth");
async function backupRoutes(fastify) {
    // Download do arquivo de backup do banco de dados SQLite
    fastify.get('/backup', async (request, reply) => {
        const dbPath = path_1.default.resolve(__dirname, '../../prisma/dev.db');
        if (!fs_1.default.existsSync(dbPath)) {
            return reply.status(404).send({ error: 'Arquivo de banco de dados não encontrado.' });
        }
        const dbBuffer = fs_1.default.readFileSync(dbPath);
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
        const { userId, password, resetClients, resetOrders, } = request.body;
        const user = auth_1.USERS.find((u) => u.id === userId || u.name === userId || u.role === 'ADMIN');
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
                await db_1.prisma.partUsed.deleteMany({});
                await db_1.prisma.visit.deleteMany({});
                await db_1.prisma.serviceOrder.deleteMany({});
                await db_1.prisma.counter.deleteMany({ where: { id: 'os_counter' } });
            }
            // 2. Reset de Clientes
            if (resetClients) {
                // Se não resetou as ordens, é necessário limpar dependências antes
                if (!resetOrders) {
                    await db_1.prisma.partUsed.deleteMany({});
                    await db_1.prisma.visit.deleteMany({});
                    await db_1.prisma.serviceOrder.deleteMany({});
                    await db_1.prisma.counter.deleteMany({ where: { id: 'os_counter' } });
                }
                await db_1.prisma.client.deleteMany({});
            }
            return reply.send({
                success: true,
                message: 'Restauração de padrão de fábrica concluída com sucesso!',
            });
        }
        catch (err) {
            console.error('Erro ao restaurar padrão de fábrica:', err);
            return reply.status(500).send({
                error: 'Erro interno ao processar a restauração no banco de dados.',
                details: err?.message,
            });
        }
    });
}
