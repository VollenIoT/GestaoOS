import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Token interno que o desktop deve enviar em todas as requisições à API local.
 * Lido de variável de ambiente; se não configurado, usa o valor padrão de desenvolvimento.
 *
 * ✅ Segurança: garante que apenas o desktop app (que conhece o token) pode usar a API.
 * Isso bloqueia scripts, navegadores externos e outros processos na mesma máquina.
 */
const EXPECTED_TOKEN = process.env.INTERNAL_API_TOKEN || 'vollen-internal-token-2024';

/**
 * Middleware de autenticação interna para o servidor local.
 * Verifica o header 'x-internal-token' em todas as rotas protegidas.
 *
 * Rotas públicas (sem token): GET / e GET /health
 * Rotas protegidas (com token): /api/users, /api/login, /api/clients, /api/orders, /api/visits, /api/backup, /api/factory-reset
 */
export async function internalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = request.headers['x-internal-token'];

  if (!token || token !== EXPECTED_TOKEN) {
    reply.status(401).send({
      error: 'Não autorizado',
      message: 'Token interno ausente ou inválido. Apenas o aplicativo desktop pode acessar esta API.',
    });
  }
}
