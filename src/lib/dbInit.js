import bcrypt from 'bcryptjs';
import prisma from './prisma.js';

export async function ensureDatabaseSynced() {
  console.log('[DB Init] Checking initial database records...');

  try {
    // 1. Ensure Admin user exists
    const adminCount = await prisma.admin.count().catch(() => 0);
    if (adminCount === 0) {
      console.log('[DB Init] Seeding default Admin user...');
      const passwordHash = await bcrypt.hash('admin123', 10);
      await prisma.admin.upsert({
        where: { email: 'admin@inspiringinfosys.com' },
        update: {},
        create: {
          email: 'admin@inspiringinfosys.com',
          password: passwordHash,
          name: 'Admin',
        }
      }).catch(err => console.warn('[DB Init Admin Seed Warning]', err.message));
      console.log('[DB Init] ✅ Default Admin check complete');
    }

    // 2. Ensure default stats exist
    const statsCount = await prisma.stat.count().catch(() => 0);
    if (statsCount === 0) {
      await prisma.stat.createMany({
        data: [
          { label: 'Happy Clients', value: '300', suffix: '+', sortOrder: 1, isActive: true },
          { label: 'Projects Done', value: '800', suffix: '+', sortOrder: 2, isActive: true },
          { label: 'Years Experience', value: '10', suffix: '+', sortOrder: 3, isActive: true },
        ]
      }).catch(err => console.warn('[DB Init Stats Seed Warning]', err.message));
    }

    // 3. Ensure default testimonials exist
    const testimonialsCount = await prisma.testimonial.count().catch(() => 0);
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
      }).catch(err => console.warn('[DB Init Testimonials Seed Warning]', err.message));
    }

    // 4. Ensure tables exist in MySQL database
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS client_services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_name VARCHAR(191) NOT NULL,
        company_name VARCHAR(191) NOT NULL DEFAULT '',
        client_email VARCHAR(191) NOT NULL,
        client_phone VARCHAR(191) NOT NULL DEFAULT '',
        service_type VARCHAR(191) NOT NULL DEFAULT 'Domain Name',
        service_name VARCHAR(191) NOT NULL,
        provider VARCHAR(191) NOT NULL DEFAULT 'GoDaddy',
        purchase_date DATE NULL,
        expiry_date DATE NOT NULL,
        renewal_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        auto_renew TINYINT(1) NOT NULL DEFAULT 0,
        status VARCHAR(191) NOT NULL DEFAULT 'Active',
        last_alert_sent_at DATETIME(3) NULL,
        notes TEXT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `).catch(err => console.warn('[DB Init ClientServices Table Warning]', err.message));

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        changed_by VARCHAR(191) NOT NULL,
        action VARCHAR(191) NOT NULL,
        entity VARCHAR(191) NOT NULL,
        entity_id VARCHAR(191) NOT NULL,
        field VARCHAR(191) NOT NULL DEFAULT '',
        previous_value TEXT NULL,
        new_value TEXT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `).catch(err => console.warn('[DB Init AuditLogs Table Warning]', err.message));

    // 5. Ensure real initial employees exist ONLY if employee database is empty
    const empCount = await prisma.employee.count().catch(() => 0);
    if (empCount === 0) {
      console.log('[DB Init] Seeding initial employee records...');
      const realEmployees = [
        {
          empId: 'INS001',
          name: 'sahil mehta',
          email: 'sahilmehta2324@gmail.com',
          password: '$2a$10$SPXFnnICNFCojagJeLKlJOjmt/uq44HroHsmaTnhCIL7SL24lIsC2',
          phone: '8444040514',
          department: 'IT',
          designation: 'FULL STACK',
          reportingManager: 'HR Manager',
          joinDate: new Date('2026-09-05'),
          employmentType: 'Intern',
          status: 'Active',
          salary: 2222.00,
          address: 'R N B, ADARSH NIWAS, 408, 4th, Palghar'
        },
        {
          empId: 'INS003',
          name: 'yogi',
          email: 'inspiringinfos@gmail.com',
          password: '$2a$10$/3W5XN9x9UgXpPDWgtnG0uN4YOspE2qW6YfQlxh4fJWXUF3/Rxb4a',
          phone: '08444040514',
          department: 'IT',
          designation: 'Founder',
          reportingManager: 'HR Manager',
          joinDate: new Date('2026-09-05'),
          employmentType: 'Full-Time',
          status: 'Active',
          salary: 20000.00,
          address: 'OPP JK TOWER, NALASOPARA EAST'
        },
        {
          empId: 'INS004',
          name: 'Alam Ansari',
          email: 'hello@sellwell.co.in',
          password: '$2a$10$sSVrIIoAY8fBTIK7YO46XeYKAxgY3EphGes/s7owLgnJ6i.zPCaXS',
          phone: '8422953384',
          department: 'IT',
          designation: 'Software Engineer',
          reportingManager: 'HR Manager',
          joinDate: new Date('2026-09-15'),
          employmentType: 'Full-Time',
          status: 'Active',
          salary: 20000.00,
          address: 'R N B, ADARSH NIWAS, 408, 4th, Palghar'
        },
        {
          empId: 'INS005',
          name: 'Aditya  Jadhav',
          email: 'adityajadhav7123@gmail.com',
          password: '$2a$10$BIBDYpCrWd1p3NAf0wTDDeUrgzdtrn3ECNOhH9lB8Fs4pRDgzgPNi',
          phone: '9833379781',
          department: 'IT',
          designation: 'Full Stack Developer',
          reportingManager: 'CEO',
          joinDate: new Date('2026-09-15'),
          employmentType: 'Full-Time',
          status: 'Active',
          salary: 10000.00,
          address: 'Andheri West'
        }
      ];

      for (const emp of realEmployees) {
        await prisma.employee.create({ data: emp }).catch(err => console.warn('[DB Init Employee Seed Warning]', err.message));
      }
    }

  } catch (error) {
    console.error('[DB Init Error]', error);
  }
}
