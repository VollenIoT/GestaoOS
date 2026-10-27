import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Solicitação de carga inicial de dados por um terminal recém-conectado
    socket.on('request_full_sync', () => {
      console.log(`[Socket.io] Terminal ${socket.id} solicitou sincronização inicial completa.`);
      socket.broadcast.emit('request_full_sync_from_server', { requesterId: socket.id });
    });

    // Resposta do Servidor com os dados completos para o terminal que pediu
    socket.on('send_full_sync_response', (data: { targetId?: string; payload: any }) => {
      if (data && data.targetId) {
        console.log(`[Socket.io] Enviando carga inicial para o terminal ${data.targetId}`);
        io?.to(data.targetId).emit('full_sync_data', data.payload);
      } else {
        socket.broadcast.emit('full_sync_data', data?.payload);
      }
    });

    // Reenvia atualizações de dados recebidas de um terminal para todos os outros na rede
    socket.on('data_sync', (data) => {
      console.log(`[Socket.io] Broadcasting data_sync event:`, data?.type);
      socket.broadcast.emit('data_sync', data);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function notifyVisitStatusUpdate(data: {
  visitId: string;
  orderId: string;
  status: string;
  technicianName: string;
  updatedAt: string;
}) {
  if (io) {
    console.log(`[Socket.io] Emitting visit_status_updated:`, data);
    io.emit('visit_status_updated', data);
  }
}
