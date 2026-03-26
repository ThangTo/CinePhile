const { Server } = require('socket.io');

let ioInstance = null;

function initProgressSocket(httpServer) {
  const allowedOrigins = [
    process.env.CLIENT_URL,
    process.env.CLIENT_URL_LOCAL || 'http://localhost:5001',
  ].filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
          cb(null, true);
        } else {
          cb(new Error('CORS blocked'));
        }
      },
      credentials: true,
    },
    path: '/viral-progress-ws',
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`[ProgressSocket] Client connected: ${socket.id}`);
    
    // Clients can join a room based on jobId or movieId to listen
    socket.on('join_job', (jobId) => {
      socket.join(`job_${jobId}`);
      console.log(`[ProgressSocket] Client ${socket.id} joined room job_${jobId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[ProgressSocket] Client disconnected: ${socket.id}`);
    });
  });

  ioInstance = io;
  console.log('[ProgressSocket] 🚀 Progress WebSocket server initialized on path /viral-progress-ws');
  return io;
}

/**
 * Emit progress update to specific job room
 */
function emitJobProgress(roomId, payload) {
  if (ioInstance) {
    ioInstance.to(`job_${roomId}`).emit('progress_update', payload);
  }
}

module.exports = {
  initProgressSocket,
  emitJobProgress
};
