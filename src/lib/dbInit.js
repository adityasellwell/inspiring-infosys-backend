import { execSync } from 'child_process';
import bcrypt from 'bcryptjs';
import prisma from './prisma.js';

export async function ensureDatabaseSynced() {
  console.log('[DB Init] Syncing database schema with Hostinger MySQL...');

  try {
    // 1. Run Prisma DB Push automatically to ensure all tables exist
    try {
      execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
      console.log('[DB Init] ✅ Database schema pushed successfully');
    } catch (pushErr) {
      console.warn('[DB Init Notice] Schema push warning:', pushErr.message);
    }

    // 2. Ensure Admin user exists
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
      console.log('[DB Init] Seeding default Admin user...');
      const passwordHash = await bcrypt.hash('admin123', 10);
      await prisma.admin.create({
        data: {
          email: 'admin@inspiringinfosys.com',
          password: passwordHash,
          name: 'Admin',
        }
      });
      console.log('[DB Init] ✅ Default Admin created (admin@inspiringinfosys.com / admin123)');
    }

    // 3. Ensure default stats exist
    const statsCount = await prisma.stat.count();
    if (statsCount === 0) {
      await prisma.stat.createMany({
        data: [
          { label: 'Happy Clients', value: '300', suffix: '+', sortOrder: 1, isActive: true },
          { label: 'Projects Done', value: '800', suffix: '+', sortOrder: 2, isActive: true },
          { label: 'Years Experience', value: '10', suffix: '+', sortOrder: 3, isActive: true },
        ]
      });
      console.log('[DB Init] ✅ Default Stats created');
    }

    // 4. Ensure default testimonials exist
    const testimonialsCount = await prisma.testimonial.count();
    if (testimonialsCount === 0) {
      await prisma.testimonial.createMany({
        data: [
          {
            name: 'Shambhu Gupta',
            initials: 'SG',
            timeAgo: '4 weeks ago',
            rating: 5,
            text: 'Best learning places for e-commerce services in Mumbai ... Amazon onboarding Myntra onboarding',
            colorClass: 'badge-purple',
            sortOrder: 1,
            isActive: true,
          },
          {
            name: 'Intact Media',
            initials: 'IM',
            timeAgo: '8 months ago',
            rating: 5,
            text: 'Great places for E-commerce solutions and websites designed and developing also helping selling on Myntra and quick commerce',
            colorClass: 'badge-blue',
            sortOrder: 2,
            isActive: true,
          },
          {
            name: 'Manzoor Ansari',
            initials: 'MA',
            timeAgo: '2 years ago',
            rating: 5,
            text: 'Great place to learn and start ecommerce own business from zero. The best part is I can learn all technical skills about amazon seller, flipkart seller Centre...Highly recommended sell well services',
            colorClass: 'badge-pink',
            sortOrder: 3,
            isActive: true,
          }
        ]
      });
      console.log('[DB Init] ✅ Default Testimonials created');
    }

    // 5. Ensure default employees exist
    const employeesCount = await prisma.employee.count();
    if (employeesCount === 0) {
      const empPasswordHash = await bcrypt.hash('Inspire#2026', 10);
      await prisma.employee.createMany({
        data: [
          {
            empId: 'INS001',
            name: 'Rahul Sharma',
            email: 'rahul.sharma@inspiringinfosys.com',
            password: empPasswordHash,
            phone: '9876543210',
            department: 'IT',
            designation: 'Senior Software Engineer',
            joinDate: new Date('2024-01-15'),
            salary: 65000.00,
            status: 'Active',
            address: 'Mumbai, Maharashtra'
          },
          {
            empId: 'INS002',
            name: 'Ananya Patel',
            email: 'ananya.patel@inspiringinfosys.com',
            password: empPasswordHash,
            phone: '9812345678',
            department: 'E-Commerce',
            designation: 'Marketplace Specialist',
            joinDate: new Date('2024-06-01'),
            salary: 48000.00,
            status: 'Active',
            address: 'Navi Mumbai, Maharashtra'
          },
          {
            empId: 'INS003',
            name: 'Atul Mishra',
            email: 'info4alam@gmail.com',
            password: empPasswordHash,
            phone: '8444040514',
            department: 'IT',
            designation: 'FULL STACK',
            joinDate: new Date('2026-09-01'),
            salary: 75000.00,
            status: 'Active',
            address: 'Mumbai, India'
          }
        ]
      });
      console.log('[DB Init] ✅ Default Employees created');
    }

  } catch (error) {
    console.error('[DB Init Error]', error);
  }
}
