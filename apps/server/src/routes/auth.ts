import { FastifyInstance } from 'fastify';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Gera o hash bcrypt de uma senha.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
}

/**
 * Verifica se uma string é um hash bcrypt ($2a$, $2b$, $2y$) ou SHA-256 (64 hex).
 */
export function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

export function isSha256Hash(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}

/**
 * Compara uma senha fornecida com a armazenada suportando:
 * 1. bcrypt (padrão seguro atual)
 * 2. SHA-256 legado
 * 3. Texto puro legado
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (isBcryptHash(stored)) {
    return bcrypt.compare(plain, stored);
  }
  if (isSha256Hash(stored)) {
    const legacyHash = createHash('sha256').update(plain).digest('hex');
    return legacyHash.toLowerCase() === stored.toLowerCase();
  }
  // Fallback para texto puro legado
  return plain === stored;
}

// Senha padrão inicial (pode ser sobrescrita por ADMIN_PASSWORD_HASH ou ADMIN_PASSWORD)
const ADMIN_PASSWORD_HASH =
  process.env.ADMIN_PASSWORD_HASH ||
  '$2a$10$wK1Ww6a4h.wAEvp0q3iFbeL0DqNfxXkM/K1qQZ41t/pYjZ7U1O.fW'; // bcrypt hash de '1234'

import { prisma } from '../db';

// Fallback padrão se banco estiver inicializando
export const DEFAULT_USERS = [
  { id: '1', name: 'Administrador', role: 'ADMIN', password: ADMIN_PASSWORD_HASH },
];

// Controle de Brute-force em memória
interface LoginAttemptTrack {
  attempts: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, LoginAttemptTrack>();

export async function authRoutes(fastify: FastifyInstance) {
  // Retorna a lista de usuários para o dropdown da tela de login (sem senha)
  fastify.get('/users', async (request, reply) => {
    try {
      const dbUsers = await prisma.user.findMany({
        select: { id: true, name: true, role: true },
        orderBy: { name: 'asc' },
      });
      if (dbUsers.length > 0) {
        return reply.send(dbUsers);
      }
    } catch (e) {
      console.warn('Erro ao consultar tabela de usuários no SQLite, usando fallback:', e);
    }
    return reply.send(
      DEFAULT_USERS.map((u) => ({ id: u.id, name: u.name, role: u.role }))
    );
  });

  // Validação do Login
  fastify.post('/login', async (request, reply) => {
    const ip = request.ip || 'unknown';
    const { userId, password } = request.body as { userId: string; password?: string };
    const now = Date.now();

    const trackKey = `${ip}_${userId}`;
    const track = loginAttempts.get(trackKey) || { attempts: 0, lockedUntil: 0 };

    // Verifica se está no período de bloqueio temporário (10 segundos)
    if (track.lockedUntil > now) {
      const remainingSecs = Math.ceil((track.lockedUntil - now) / 1000);
      return reply.status(429).send({
        error: `Muitas tentativas incorretas. Acesso bloqueado por ${remainingSecs} segundos.`,
        retryAfter: remainingSecs,
      });
    }

    let user: { id: string; name: string; role: string; password?: string; pass?: string } | null = null;
    try {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } catch {}

    if (!user) {
      user = DEFAULT_USERS.find((u) => u.id === userId) || null;
    }

    if (!user) {
      return reply.status(404).send({ error: 'Usuário não encontrado' });
    }

    const storedPass = user.password || (user as any).pass || ADMIN_PASSWORD_HASH;
    const isPasswordValid = password ? await verifyPassword(password, storedPass) : false;

    if (!password || !isPasswordValid) {
      track.attempts += 1;
      if (track.attempts >= 5) {
        track.lockedUntil = now + 10000; // 10 segundos de bloqueio
        track.attempts = 0;
        loginAttempts.set(trackKey, track);
        return reply.status(429).send({
          error: 'Muitas tentativas incorretas. Acesso bloqueado temporariamente por 10 segundos.',
          retryAfter: 10,
        });
      }
      loginAttempts.set(trackKey, track);
      const remaining = 5 - track.attempts;
      return reply.status(401).send({
        error: `Senha incorreta (${remaining} tentativa${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}).`,
      });
    }

    // Sucesso: reseta tentativas
    loginAttempts.delete(trackKey);

    // ✅ Segurança: token único por sessão baseado em timestamp
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
