import { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { ServiceOrderSchema } from '@sistema-os/shared';

export async function orderRoutes(fastify: FastifyInstance) {
  // Get all Service Orders with clients and visits (suporta includeDeleted query)
  fastify.get('/orders', async (request, reply) => {
    const { includeDeleted } = request.query as { includeDeleted?: string };
    const whereClause = includeDeleted === 'true' ? {} : { status: { not: 'EXCLUIDA' } };

    const orders = await prisma.serviceOrder.findMany({
      where: whereClause,
      include: {
        client: true,
        equipment: true,
        visits: {
          include: {
            partsUsed: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(orders);
  });

  // Get single order
  fastify.get('/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        client: true,
        equipment: true,
        visits: {
          include: {
            partsUsed: true,
          },
        },
      },
    });
    if (!order) return reply.status(404).send({ error: 'Ordem de serviço não encontrada' });
    return reply.send(order);
  });

  // Create Service Order
  fastify.post('/orders', async (request, reply) => {
    const body = ServiceOrderSchema.parse(request.body);

    // Respeita o código fornecido pelo cliente ou gera com base no contador
    let code = body.code;
    if (!code) {
      const counter = await prisma.counter.upsert({
        where: { id: 'os_counter' },
        create: { id: 'os_counter', value: 1 },
        update: { value: { increment: 1 } },
      });
      code = `OS-${String(counter.value).padStart(4, '0')}`;
    } else {
      // Atualiza o contador para ficar sincronizado se o código manual for maior
      const num = parseInt(code.replace(/\D/g, ''), 10);
      if (!isNaN(num)) {
        await prisma.counter.upsert({
          where: { id: 'os_counter' },
          create: { id: 'os_counter', value: num },
          update: { value: num },
        });
      }
    }

    const equipment = await prisma.equipment.create({
      data: {
        type: body.equipment.type || '',
        brand: body.equipment.brand || '',
        model: body.equipment.model || '',
        serialNumber: body.equipment.serialNumber || null,
      },
    });

    const order = await prisma.serviceOrder.create({
      data: {
        code,
        clientId: body.clientId,
        equipmentId: equipment.id,
        problemDescription: body.problemDescription || '',
        status: body.status || 'ABERTA',
        type: body.type || 'ORCAMENTO',
        warrantyType: body.warrantyType || 'NAO_SE_APLICA',
        travelCost: body.travelCost || null,
        discountCost: body.discountCost || null,
        nfNumber: body.nfNumber || null,
        nfValue: body.nfValue || null,
        purchaseDate: body.purchaseDate || null,
        retailerName: body.retailerName || null,
        cnpj: body.cnpj || null,
        authorizedCode: body.authorizedCode || null,
        guarantor: body.guarantor || null,
        additionalNotes: body.additionalNotes || null,
        exitDate: body.exitDate || null,
        totalAmount: body.totalAmount || 0,
      },
      include: {
        client: true,
        equipment: true,
        visits: true,
      },
    });

    return reply.status(201).send(order);
  });

  // Update Service Order
  fastify.put('/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = ServiceOrderSchema.partial().parse(request.body);

    const existingOrder = await prisma.serviceOrder.findUnique({
      where: { id },
      include: { equipment: true },
    });

    if (!existingOrder) return reply.status(404).send({ error: 'Ordem de serviço não encontrada' });

    if (body.equipment && existingOrder.equipmentId) {
      await prisma.equipment.update({
        where: { id: existingOrder.equipmentId },
        data: {
          type: body.equipment.type || '',
          brand: body.equipment.brand || '',
          model: body.equipment.model || '',
          serialNumber: body.equipment.serialNumber || null,
        },
      });
    }

    const updatedOrder = await prisma.serviceOrder.update({
      where: { id },
      data: {
        problemDescription: body.problemDescription !== undefined ? (body.problemDescription || '') : existingOrder.problemDescription,
        status: body.status !== undefined ? body.status : existingOrder.status,
        type: body.type !== undefined ? (body.type || 'ORCAMENTO') : existingOrder.type,
        warrantyType: body.warrantyType !== undefined ? (body.warrantyType || 'NAO_SE_APLICA') : existingOrder.warrantyType,
        travelCost: body.travelCost !== undefined ? body.travelCost : existingOrder.travelCost,
        discountCost: body.discountCost !== undefined ? body.discountCost : existingOrder.discountCost,
        nfNumber: body.nfNumber !== undefined ? body.nfNumber : existingOrder.nfNumber,
        nfValue: body.nfValue !== undefined ? body.nfValue : existingOrder.nfValue,
        purchaseDate: body.purchaseDate !== undefined ? body.purchaseDate : existingOrder.purchaseDate,
        retailerName: body.retailerName !== undefined ? body.retailerName : existingOrder.retailerName,
        cnpj: body.cnpj !== undefined ? body.cnpj : existingOrder.cnpj,
        authorizedCode: body.authorizedCode !== undefined ? body.authorizedCode : existingOrder.authorizedCode,
        guarantor: body.guarantor !== undefined ? body.guarantor : existingOrder.guarantor,
        additionalNotes: body.additionalNotes !== undefined ? body.additionalNotes : existingOrder.additionalNotes,
        exitDate: body.exitDate !== undefined ? body.exitDate : existingOrder.exitDate,
        totalAmount: body.totalAmount !== undefined ? body.totalAmount : existingOrder.totalAmount,
      },
      include: {
        client: true,
        equipment: true,
        visits: true,
      },
    });

    // Se o status da OS mudou e não é mais o de agendamento inicial (VISITA_TECNICA, EM_ATENDIMENTO ou ABERTA), conclui os agendamentos pendentes
    if (body.status && body.status !== 'VISITA_TECNICA' && body.status !== 'EM_ATENDIMENTO' && body.status !== 'ABERTA') {
      await prisma.visit.updateMany({
        where: { orderId: id, status: 'AGENDADA' },
        data: { status: 'CONCLUIDA' },
      });
    }

    return reply.send(updatedOrder);
  });

  // Delete Service Order (Soft-delete: marca status como EXCLUIDA e cancela visitas)
  fastify.delete('/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Cancela visitas pendentes
    await prisma.visit.updateMany({
      where: { orderId: id, status: { not: 'CONCLUIDA' } },
      data: { status: 'CANCELADA' },
    });

    // Atualiza status da OS para EXCLUIDA
    const updated = await prisma.serviceOrder.update({
      where: { id },
      data: { status: 'EXCLUIDA' },
    });

    return reply.send({ success: true, message: 'Ordem de Serviço marcada como EXCLUÍDA', order: updated });
  });

  // Dashboard Stats
  fastify.get('/dashboard/stats', async (request, reply) => {
    const todayStr = new Date().toISOString().split('T')[0];

    const todayVisitsCount = await prisma.visit.count({
      where: { date: todayStr },
    });

    const completedToday = await prisma.visit.count({
      where: { date: todayStr, status: 'CONCLUIDA' },
    });

    const inProgressToday = await prisma.visit.count({
      where: { date: todayStr, status: 'EM_ANDAMENTO' },
    });

    const orders = await prisma.serviceOrder.findMany({
      select: { totalAmount: true },
    });
    const totalBilling = orders.reduce((acc, curr) => acc + curr.totalAmount, 0);

    return reply.send({
      todayVisitsCount,
      completedToday,
      inProgressToday,
      totalBilling,
    });
  });
}
