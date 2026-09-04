"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USERS = void 0;
exports.authRoutes = authRoutes;
exports.USERS = [
    { id: '1', name: 'Administrador', role: 'ADMIN', pass: '1234' },
];
async function authRoutes(fastify) {
    // Retorna a lista de usuários para o dropdown da tela de login
    fastify.get('/users', async (request, reply) => {
        return reply.send(exports.USERS.map((u) => ({ id: u.id, name: u.name, role: u.role })));
    });
    // Validação do Login
    fastify.post('/login', async (request, reply) => {
        const { userId, password } = request.body;
        const user = exports.USERS.find((u) => u.id === userId);
        if (!user) {
            return reply.status(404).send({ error: 'Usuário não encontrado' });
        }
        if (user.pass !== password) {
            return reply.status(401).send({ error: 'Senha incorreta' });
        }
        return reply.send({
            id: user.id,
            name: user.name,
            role: user.role,
            token: `mock-token-${user.id}`,
        });
    });
}
