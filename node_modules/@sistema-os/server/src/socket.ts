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
