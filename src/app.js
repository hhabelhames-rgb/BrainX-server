require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { globalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const matchRoutes = require('./routes/match.routes');
const conversationRoutes = require('./routes/conversation.routes');
const messageRoutes = require('./routes/message.routes');
const sessionRoutes = require('./routes/session.routes');
const notificationRoutes = require('./routes/notification.routes');
const reviewRoutes = require('./routes/review.routes');
const reportRoutes = require('./routes/report.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
      .split(',')
      .map(url => url.trim().replace(/\/$/, ''));
      
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.error('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ─── NoSQL Injection Prevention ───────────────────────────────────────────────
// (Removed express-mongo-sanitize as it causes TypeError with req.query getter)

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── Global Rate Limit ────────────────────────────────────────────────────────
app.use('/api', globalLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'BrainX API is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// Serve local uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// ─── 404 & Error Handlers ─────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
