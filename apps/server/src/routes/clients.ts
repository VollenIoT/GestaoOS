import { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { ClientSchema } from '@sistema-os/shared';

export async function clientRoutes(fastify: FastifyInstance) {
  // List clients
  fastify.get('/clients', async (request, reply) => {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
    });
    return reply.send(clients);
  });

  // Create or Update client
  fastify.post('/clients', async (request, reply) => {
    try {
      const body = ClientSchema.parse(request.body);

      if (body.id) {
        const existing = await prisma.client.findUnique({ where: { id: body.id } });
        if (existing) {
          const updated = await prisma.client.update({
            where: { id: body.id },
            data: {
              code: body.code || existing.code,
              name: body.name || existing.name,
              phone: body.phone ?? existing.phone,
              whatsapp: body.whatsapp ?? existing.whatsapp,
              email: body.email ?? existing.email,
              cep: body.cep ?? existing.cep,
              address: body.address ?? existing.address,
              number: body.number ?? existing.number,
              complement: body.complement ?? existing.complement,
              neighborhood: body.neighborhood ?? existing.neighborhood,
              city: body.city ?? existing.city,
              state: body.state ?? existing.state,
              reference: body.reference ?? existing.reference,
            },
          });
          return reply.status(200).send(updated);
        }
      }

      // Calcula o próximo código de cliente baseado no MAX existente + 1
      let clientCode = body.code;
      if (!clientCode) {
        const allClients = await prisma.client.findMany({ select: { code: true } });
        const maxNum = allClients.reduce((max: number, c: { code: string | null }) => {
          const num = parseInt(String(c.code || '').replace(/\D/g, ''), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        clientCode = String(maxNum + 1).padStart(4, '0');
      }

      const client = await prisma.client.create({
        data: {
          code: clientCode,
          name: body.name || 'CLIENTE SEM NOME',
          phone: body.phone || '',
          whatsapp: body.whatsapp || null,
          email: body.email || null,
          cep: body.cep || '',
          address: body.address || '',
          number: body.number || '',
          complement: body.complement || null,
          neighborhood: body.neighborhood || '',
          city: body.city || '',
          state: body.state || '',
          reference: body.reference || null,
        },
      });
      return reply.status(201).send(client);
    } catch (err: any) {
      console.error('Erro Prisma ao salvar cliente:', err);
      return reply.status(400).send({ error: err.message });
    }
  });

  // Update client by ID
  fastify.put('/clients/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = ClientSchema.partial().parse(request.body);

      const updated = await prisma.client.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name || 'CLIENTE SEM NOME' } : {}),
          ...(body.phone !== undefined ? { phone: body.phone || '' } : {}),
          ...(body.whatsapp !== undefined ? { whatsapp: body.whatsapp ?? null } : {}),
          ...(body.email !== undefined ? { email: body.email ?? null } : {}),
          ...(body.cep !== undefined ? { cep: body.cep || '' } : {}),
          ...(body.address !== undefined ? { address: body.address || '' } : {}),
          ...(body.number !== undefined ? { number: body.number || '' } : {}),
          ...(body.complement !== undefined ? { complement: body.complement ?? null } : {}),
          ...(body.neighborhood !== undefined ? { neighborhood: body.neighborhood || '' } : {}),
          ...(body.city !== undefined ? { city: body.city || '' } : {}),
          ...(body.state !== undefined ? { state: body.state || '' } : {}),
          ...(body.reference !== undefined ? { reference: body.reference ?? null } : {}),
        },
      });
      return reply.send(updated);
    } catch (err: any) {
      console.error('Erro ao atualizar cliente:', err);
      return reply.status(400).send({ error: err.message });
    }
  });

  // Delete client
  fastify.delete('/clients/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await prisma.client.delete({
        where: { id },
      });
      return reply.send({ success: true });
    } catch (err: any) {
      console.error('Erro ao deletar cliente:', err);
      return reply.status(400).send({ error: err.message });
    }
  });
}
