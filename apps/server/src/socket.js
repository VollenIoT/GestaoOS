"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketIO = initSocketIO;
exports.notifyVisitStatusUpdate = notifyVisitStatusUpdate;
const socket_io_1 = require("socket.io");
let io = null;
function initSocketIO(httpServer) {
    io = new socket_io_1.Server(httpServer, {
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
function notifyVisitStatusUpdate(data) {
    if (io) {
        console.log(`[Socket.io] Emitting visit_status_updated:`, data);
        io.emit('visit_status_updated', data);
    }
}
