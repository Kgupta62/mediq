import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import cors from 'cors';
import apiRoutes from './routes/apiRoutes.js';
import { notificationService } from './services/notificationService.js';
import { seedInitialData } from './seedData.js';
import { db } from './config/db.js';
import { defaultState } from './config/schema.js';
import { corsOptions } from './middleware/cors.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();
const server = http.createServer(app);

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(cors(corsOptions));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '100kb' }));
app.use(requestLogger);

const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 20000,
  pingInterval: 25000
});

app.set('io', io);
notificationService.setSocketIO(io);

const safe = (fn, fallback) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

function buildInitialState() {
  return {
    clinic: safe(() => db.getClinic(), defaultState.clinic),
    queue: safe(() => db.getQueueTokens(), []),
    analytics: safe(() => db.getAnalytics(), null)
  };
}

io.on('connection', (socket) => {
  console.log(`\x1b[35m[SOCKET CONNECTED]\x1b[0m Client ID: ${socket.id}`);

  const sendState = () => {
    try {
      socket.emit('INITIAL_STATE', buildInitialState());
    } catch (err) {
      console.error('\x1b[31m[SOCKET STATE ERROR]\x1b[0m', err.message);
    }
  };

  sendState();
  socket.on('REQUEST_STATE', sendState);

  socket.on('disconnect', (reason) => {
    console.log(`\x1b[33m[SOCKET DISCONNECTED]\x1b[0m Client ID: ${socket.id} (${reason})`);
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), uptime: Math.round(process.uptime()) });
});

app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

let heartbeat;
let shuttingDown = false;

export function start(port = Number(process.env.PORT) || 5000) {
  seedInitialData();
  heartbeat = setInterval(() => io.emit('HEARTBEAT', { timestamp: Date.now() }), 30000);
  heartbeat.unref();
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (err) => {
    console.error('\x1b[31m[UNHANDLED REJECTION]\x1b[0m', err);
  });

  const PORT = port;
  return server.listen(PORT, () => {
  console.log(`
  =============================================================
  🏥 HOSPITAL APPOINTMENT & QUEUE MANAGEMENT SYSTEM (BACKEND)
  =============================================================
  🚀 Server Running:   http://localhost:${PORT}
  📡 WebSocket Ready:  Port ${PORT} (Socket.io)
  📑 REST API:         http://localhost:${PORT}/api
  📊 Analytics:        http://localhost:${PORT}/api/analytics
  =============================================================
  `);
  });
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(heartbeat);
  console.log(`\n[SHUTDOWN] ${signal} received, closing connections`);

  const forceExit = setTimeout(() => {
    console.error('[SHUTDOWN] Forced exit after timeout');
    process.exit(1);
  }, 10000);
  forceExit.unref();

  io.close(() => {
    server.close(() => {
      try {
        db.close();
      } catch (err) {
        console.error('[SHUTDOWN] DB close failed:', err.message);
      }
      console.log('[SHUTDOWN] Complete');
      process.exit(0);
    });
  });
}

export { app, server, io };

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) start();
