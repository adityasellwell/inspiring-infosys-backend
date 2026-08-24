// Shared Prisma client instance — import this everywhere instead of creating new PrismaClient() each time.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
