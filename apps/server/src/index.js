"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const clients_1 = require("./routes/clients");
const auth_1 = require("./routes/auth");
const backup_1 = require("./routes/backup");
const orders_1 = require("./routes/orders");
const visits_1 = require("./routes/visits");
const socket_1 = require("./socket");
const app = (0, fastify_1.default)({ logger: true });
async function main() {
    await app.register(cors_1.default, { origin: '*' });
    app.get('/', async () => ({
        app: 'Sistema OS Server API',
        status: 'online',
        version: '1.0.0',
        endpoints: ['/api/auth/login', '/api/clients', '/api/orders', '/api/visits', '/api/backup', '/health'],
    }));
    app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
    await app.register(auth_1.authRoutes, { prefix: '/api' });
    await app.register(backup_1.backupRoutes, { prefix: '/api' });
    await app.register(clients_1.clientRoutes, { prefix: '/api' });
    await app.register(orders_1.orderRoutes, { prefix: '/api' });
    await app.register(visits_1.visitRoutes, { prefix: '/api' });
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3333;
    app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
        if (err) {
            app.log.error(err);
            process.exit(1);
        }
        // Initialize Socket.io attached to Fastify's HTTP server
        (0, socket_1.initSocketIO)(app.server);
        console.log(`🚀 Servidor rodando em ${address}`);
        console.log(`⚡ WebSocket Socket.io ativo na porta ${PORT}`);
    });
}
main();
