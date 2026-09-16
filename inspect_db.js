import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function inspect() {
  console.log('=== DATABASE CONTENT INSPECTION ===');
  const adminCount = await prisma.admin.count();
  const employeeCount = await prisma.employee.count();
  const statCount = await prisma.stat.count();
  const testiCount = await prisma.testimonial.count();
  const projCount = await prisma.project.count();
  const quoteCount = await prisma.quoteRequest.count();
  const consultCount = await prisma.consultationRequest.count();

  console.log(`Admins: ${adminCount}`);
  console.log(`Employees: ${employeeCount}`);
  console.log(`Stats: ${statCount}`);
  console.log(`Testimonials: ${testiCount}`);
  console.log(`Projects: ${projCount}`);
  console.log(`Quote Requests: ${quoteCount}`);
  console.log(`Consultations: ${consultCount}`);

  if (employeeCount > 0) {
    const emps = await prisma.employee.findMany();
    console.log('Employees:', emps);
  }
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
