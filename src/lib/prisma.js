import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Auto-reconnect wrapper for Prisma database operations to handle stale/dropped MySQL connections
export async function dbQuery(fn, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err?.message || '';
      const isConnError = 
        msg.includes('Server has closed the connection') ||
        msg.includes('Connection lost') ||
        msg.includes('ECONNRESET') ||
        msg.includes('EPIPE') ||
        msg.includes('Can\'t reach database server') ||
        msg.includes('Engine error') ||
        msg.includes('socket hung up');

      if (isConnError && i < retries) {
        console.warn(`[Prisma DB Connection Error] Reconnecting to MySQL (Attempt ${i + 1}/${retries})...`);
        try {
          await prisma.$disconnect();
        } catch (_) {}
        try {
          await prisma.$connect();
        } catch (connErr) {
          console.error('[Prisma Reconnect Failed]', connErr.message);
        }
        await new Promise(r => setTimeout(r, 300 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

export default prisma;

