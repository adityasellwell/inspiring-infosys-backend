// Express entry point — Inspiring Infosys Backend API
// Port: 3001 (frontend runs on 5173)

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRouter from './src/routes/auth.js';
import statsRouter from './src/routes/stats.js';
import testimonialsRouter from './src/routes/testimonials.js';
import projectsRouter from './src/routes/projects.js';
import quotesRouter from './src/routes/quotes.js';
import consultationsRouter from './src/routes/consultations.js';
import categoriesRouter from './src/routes/categories.js';
import turnoverOptionsRouter from './src/routes/turnoverOptions.js';
import employeesRouter from './src/routes/employees.js';
// Load environment config (.env.production if NODE_ENV=production, otherwise .env)
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: envFile });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────────────────────────
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : [
      'https://inspiringinfosys.com',
      'https://www.inspiringinfosys.com',
      'http://inspiringinfosys.com',
      'http://www.inspiringinfosys.com',
      'http://localhost:5173',
      'http://localhost:3000'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server, mobile app, CLI or missing origin requests
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow any subdomain of inspiringinfosys.com
    if (/^https?:\/\/(.+\.)?inspiringinfosys\.com$/i.test(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/stats', statsRouter);
app.use('/api/testimonials', testimonialsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/consultations', consultationsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/turnover-options', turnoverOptionsRouter);
app.use('/api/employees', employeesRouter)
// ── Health Check ───────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Inspiring Infosys API is running' });
});

// ── 404 Handler ────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Start Server ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Auth:   POST http://localhost:${PORT}/api/auth/login\n`);
});
