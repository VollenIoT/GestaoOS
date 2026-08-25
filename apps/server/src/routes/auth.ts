import { FastifyInstance } from 'fastify';

export const USERS = [
  { id: '1', name: 'Administrador', role: 'ADMIN', pass: '1234' },
];

export async function authRoutes(fastify: FastifyInstance) {
  // Retorna a lista de usuários para o dropdown da tela de login
  fastify.get('/users', async (request, reply) => {
    return reply.send(
      USERS.map((u) => ({ id: u.id, name: u.name, role: u.role }))
    );
  });

  // Validação do Login
  fastify.post('/login', async (request, reply) => {
    const { userId, password } = request.body as { userId: string; password?: string };
    const user = USERS.find((u) => u.id === userId);

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
