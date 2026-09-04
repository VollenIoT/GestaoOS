"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitRoutes = visitRoutes;
const db_1 = require("../db");
const shared_1 = require("@sistema-os/shared");
const socket_1 = require("../socket");
async function visitRoutes(fastify) {
    // List visits with filters (date, period, technician)
    fastify.get('/visits', async (request, reply) => {
        const { date, period, technician } = request.query;
        const where = {};
        if (date)
            where.date = date;
        if (period)
            where.period = period;
        if (technician) {
            where.technicianName = { contains: technician };
        }
        const visits = await db_1.prisma.visit.findMany({
            where,
            include: {
                order: {
                    include: {
                        client: true,
                        equipment: true,
                    },
                },
                partsUsed: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return reply.send(visits);
    });
    // Create or Update Visit for OS
    fastify.post('/visits', async (request, reply) => {
        const body = shared_1.VisitSchema.parse(request.body);
        if (!body.orderId) {
            return reply.status(400).send({ error: 'orderId é obrigatório' });
        }
        // Verifica se já existe uma visita ativa cadastrada para esta OS
        const existing = await db_1.prisma.visit.findFirst({
            where: {
                orderId: body.orderId,
            },
        });
        if (existing) {
            const updated = await db_1.prisma.visit.update({
                where: { id: existing.id },
                data: {
                    date: body.date || existing.date,
                    period: body.period || existing.period,
                    technicianName: body.technicianName || existing.technicianName,
                    status: body.status || existing.status,
                    notes: body.notes || existing.notes,
                },
                include: {
                    order: {
                        include: {
                            client: true,
                            equipment: true,
                        },
                    },
                },
            });
            return reply.send(updated);
        }
        const visit = await db_1.prisma.visit.create({
            data: {
                orderId: body.orderId,
                date: body.date,
                period: body.period,
                technicianName: body.technicianName || '',
                status: body.status || shared_1.VisitStatus.AGENDADA,
                notes: body.notes || null,
            },
            include: {
                order: {
                    include: {
                        client: true,
                        equipment: true,
                    },
                },
            },
        });
        return reply.status(201).send(visit);
    });
    // Update Visit status and details (mobile / desktop)
    fastify.patch('/visits/:id/status', async (request, reply) => {
        const { id } = request.params;
        const { status, notes, photos, signatureUrl, partsUsed } = request.body;
        const existingVisit = await db_1.prisma.visit.findUnique({ where: { id } });
        if (!existingVisit) {
            return reply.status(404).send({ error: 'Visita não encontrada' });
        }
        // Save parts if present
        if (partsUsed && partsUsed.length > 0) {
            await db_1.prisma.partUsed.deleteMany({ where: { visitId: id } });
            await db_1.prisma.partUsed.createMany({
                data: partsUsed.map((p) => ({
                    visitId: id,
                    name: p.name,
                    code: p.code || null,
                    price: p.price,
                    quantity: p.quantity,
                })),
            });
            // Update Service Order total amount
            const totalParts = partsUsed.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
            await db_1.prisma.serviceOrder.update({
                where: { id: existingVisit.orderId },
                data: { totalAmount: totalParts },
            });
        }
        const updatedVisit = await db_1.prisma.visit.update({
            where: { id },
            data: {
                status,
                ...(notes !== undefined ? { notes } : {}),
                ...(photos !== undefined ? { photos: JSON.stringify(photos) } : {}),
                ...(signatureUrl !== undefined ? { signatureUrl } : {}),
            },
            include: {
                order: {
                    include: {
                        client: true,
                        equipment: true,
                    },
                },
                partsUsed: true,
            },
        });
        // Notify WebSocket listeners in real-time!
        (0, socket_1.notifyVisitStatusUpdate)({
            visitId: updatedVisit.id,
            orderId: updatedVisit.orderId,
            status: updatedVisit.status,
            technicianName: updatedVisit.technicianName,
            updatedAt: new Date().toISOString(),
        });
        return reply.send(updatedVisit);
    });
    // Update Visit details (date, period, technicianName, notes, status)
    fastify.put('/visits/:id', async (request, reply) => {
        const { id } = request.params;
        const body = request.body;
        const updatedVisit = await db_1.prisma.visit.update({
            where: { id },
            data: {
                ...(body.date ? { date: body.date } : {}),
                ...(body.period ? { period: body.period } : {}),
                ...(body.technicianName !== undefined ? { technicianName: body.technicianName } : {}),
                ...(body.notes !== undefined ? { notes: body.notes } : {}),
                ...(body.status ? { status: body.status } : {}),
            },
            include: {
                order: {
                    include: {
                        client: true,
                        equipment: true,
                    },
                },
            },
        });
        return reply.send(updatedVisit);
    });
    // Delete Visit
    fastify.delete('/visits/:id', async (request, reply) => {
        const { id } = request.params;
        await db_1.prisma.visit.delete({ where: { id } });
        return reply.send({ success: true, message: 'Agendamento excluído' });
    });
}
