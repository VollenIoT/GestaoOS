"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const shared_1 = require("@sistema-os/shared");
const prisma = new client_1.PrismaClient();
async function seed() {
    console.log('🌱 Populando banco de dados inicial...');
    await prisma.partUsed.deleteMany();
    await prisma.visit.deleteMany();
    await prisma.serviceOrder.deleteMany();
    await prisma.equipment.deleteMany();
    await prisma.client.deleteMany();
    // Cliente 1
    const client1 = await prisma.client.create({
        data: {
            name: 'Carlos Eduardo Silva',
            phone: '(11) 98765-4321',
            email: 'carlos.silva@email.com',
            cep: '01310-100',
            address: 'Av. Paulista',
            number: '1000',
            neighborhood: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
        },
    });
    // Cliente 2
    const client2 = await prisma.client.create({
        data: {
            name: 'Mariana Oliveira',
            phone: '(11) 91234-5678',
            email: 'mariana.oliveira@email.com',
            cep: '04571-010',
            address: 'Av. Engenheiro Luís Carlos Berrini',
            number: '500',
            neighborhood: 'Brooklin',
            city: 'São Paulo',
            state: 'SP',
        },
    });
    // Equipamento 1
    const eq1 = await prisma.equipment.create({
        data: {
            type: 'Geladeira Frost Free',
            brand: 'Brastemp',
            model: 'BRM54JK',
            serialNumber: 'SN-99887766',
        },
    });
    // Equipamento 2
    const eq2 = await prisma.equipment.create({
        data: {
            type: 'Lava e Seca 11kg',
            brand: 'Samsung',
            model: 'WD11M44530W',
            serialNumber: 'SN-44332211',
        },
    });
    // OS 1
    const os1 = await prisma.serviceOrder.create({
        data: {
            code: 'OS-0001',
            clientId: client1.id,
            equipmentId: eq1.id,
            problemDescription: 'Geladeira não está resfriando o compartimento inferior e apresentando ruído excessivo.',
            status: shared_1.OrderStatus.EM_ATENDIMENTO,
            totalAmount: 380.0,
        },
    });
    // OS 2
    const os2 = await prisma.serviceOrder.create({
        data: {
            code: 'OS-0002',
            clientId: client2.id,
            equipmentId: eq2.id,
            problemDescription: 'Máquina dando erro no ciclo de centrifugação e vazando água.',
            status: shared_1.OrderStatus.ABERTA,
            totalAmount: 0.0,
        },
    });
    const todayStr = new Date().toISOString().split('T')[0];
    // Visita 1 para hoje de manhã
    await prisma.visit.create({
        data: {
            orderId: os1.id,
            date: todayStr,
            period: shared_1.PeriodoVisita.MANHA,
            technicianName: 'Técnico Roberto',
            status: shared_1.VisitStatus.EM_ANDAMENTO,
            notes: 'Verificação do termostato e motor compressor.',
            partsUsed: {
                create: [
                    { name: 'Relé de Partida', code: 'REL-001', price: 80.0, quantity: 1 },
                    { name: 'Sensor de Defrost', code: 'SEN-002', price: 300.0, quantity: 1 },
                ],
            },
        },
    });
    // Visita 2 para hoje à tarde
    await prisma.visit.create({
        data: {
            orderId: os2.id,
            date: todayStr,
            period: shared_1.PeriodoVisita.TARDE,
            technicianName: 'Técnico Roberto',
            status: shared_1.VisitStatus.AGENDADA,
            notes: 'Visita técnica preventiva e diagnóstico.',
        },
    });
    console.log('✅ Banco de dados populado com sucesso!');
}
seed()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
