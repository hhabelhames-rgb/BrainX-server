require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initSocket } = require('./src/socket/socketHandler');
const seedDatabase = require('./seed/seed');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialise Socket.IO
const io = new Server(server, {
  cors: {
    origin: (process.env.CLIENT_URL || 'http://localhost:3000').split(','),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Attach io to app so controllers can emit events
app.set('io', io);

// Initialise socket handlers
initSocket(io);

// Connect to MongoDB then start server
const start = async () => {
  try {
    await connectDB();

    if (process.env.MONGO_URI === 'memory') {
      console.log('🌱 Running seed script for memory database...');
      await seedDatabase();
    }

    server.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════╗
║           🧠 BrainX API Server           ║
╠══════════════════════════════════════════╣
║  Status:  ✅ Running                     ║
║  Port:    ${PORT}                            ║
║  Env:     ${(process.env.NODE_ENV || 'development').padEnd(30)}║
║  DB:      ✅ Connected                   ║
╚══════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('❌ Server failed to start:', err.message);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  console.error('🔴 Unhandled Rejection:', err.message);
  shutdown('Unhandled Rejection');
});

start();
