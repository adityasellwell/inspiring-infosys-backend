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
import employeeAuthRouter from './src/routes/employeeAuth.js';
import clientServicesRouter from './src/routes/clientServices.js';
import prisma from './src/lib/prisma.js';
import { normalizeEmpId } from './src/controllers/employeeController.js';
import { ensureDatabaseSynced } from './src/lib/dbInit.js';

// Load environment config (.env.production if present/production, otherwise fallback to .env)
dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env' });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────────────────────────
const allowedOrigins = [
  'https://inspiringinfosys.com',
  'https://www.inspiringinfosys.com',
  'http://inspiringinfosys.com',
  'http://www.inspiringinfosys.com',
  'http://localhost:5173',
  'http://localhost:3000'
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach(url => {
    const trimmed = url.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

// Global CORS Middleware - Executes first for ALL routes and OPTIONS requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

const corsOptions = {
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ── Routes ─────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/stats', statsRouter);
app.use('/api/testimonials', testimonialsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/consultations', consultationsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/turnover-options', turnoverOptionsRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/employee-portal', employeeAuthRouter);
app.use('/api/client-services', clientServicesRouter);
// ── Health Check & Root Route ──────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ success: true, message: 'Inspiring Infosys API Server is running smoothly', health: '/api/health' });
});

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Inspiring Infosys API is running' });
});

app.get('/api/sync-db', async (_req, res) => {
  try {
    await ensureDatabaseSynced();
    const allEmployees = await prisma.employee.findMany({ select: { id: true, empId: true, name: true, email: true } });
    return res.json({
      success: true,
      message: 'Prisma Hostinger Database auto-synced successfully!',
      employeeCount: allEmployees.length,
      employees: allEmployees
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── 404 Handler ────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ───────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Unhandled Server Error]', err);
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// ── Start Server ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Auth:   POST http://localhost:${PORT}/api/auth/login\n`);

  // Run background initialization asynchronously so server starts accepting requests immediately
  setImmediate(async () => {
    try {
      await ensureDatabaseSynced();
      const allEmployees = await prisma.employee.findMany({ select: { id: true, empId: true } });
      for (const emp of allEmployees) {
        const cleanId = normalizeEmpId(emp.empId, emp.id);
        if (emp.empId !== cleanId) {
          await prisma.employee.update({
            where: { id: emp.id },
            data: { empId: cleanId }
          });
          console.log(`[DB Auto-Migrate] Migrated Employee #${emp.id} from '${emp.empId}' to '${cleanId}'`);
        }
      }
    } catch (err) {
      console.warn('[DB Auto-Migrate Notice]', err.message);
    }
  });
});
