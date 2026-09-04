import { FastifyInstance } from 'fastify';
import { createHash } from 'crypto';

/**
 * Gera o hash SHA-256 de uma string usando o módulo crypto nativo do Node.
 * Compatível com o hashUtils.ts do lado cliente (browser).
 */
export function hashPassword(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}

/**
 * Verifica se uma string parece ser um hash SHA-256 (64 caracteres hex).
 * Usado para migração progressiva de senhas em texto puro.
 */
export function isHashed(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

/**
 * Compara uma senha (podendo ser hash ou texto puro) com a armazenada,
 * suportando migração progressiva.
 */
export function verifyPassword(plain: string, stored: string): boolean {
  if (isHashed(stored)) {
    // Senha armazenada já é hash — compara via hash
    return hashPassword(plain) === stored;
  }
  // Texto puro legado — comparação direta (será atualizado na próxima oportunidade)
  return plain === stored;
}

// ✅ Segurança: Hash SHA-256 de '1234' pré-calculado para o usuário padrão.
// Para alterar a senha, recalcule: echo -n 'novaSenha' | sha256sum
const ADMIN_PASSWORD_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';

export const USERS = [
  { id: '1', name: 'Administrador', role: 'ADMIN', pass: ADMIN_PASSWORD_HASH },
];

export async function authRoutes(fastify: FastifyInstance) {
  // Retorna a lista de usuários para o dropdown da tela de login (sem senha)
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

    if (!password || !verifyPassword(password, user.pass)) {
      return reply.status(401).send({ error: 'Senha incorreta' });
    }

    // ✅ Segurança: token único por sessão baseado em timestamp — não mais "mock-token-1"
    const sessionToken = createHash('sha256')
      .update(`${user.id}-${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 32);

    return reply.send({
      id: user.id,
      name: user.name,
      role: user.role,
      token: sessionToken,
    });
  });
}
