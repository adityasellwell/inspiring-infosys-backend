// Seed script — run with: node prisma/seed.js
// Seeds the admin user and initial CMS data from the existing hardcoded arrays.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── 1. Admin User ─────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.admin.upsert({
    where: { email: 'admin@inspiringinfosys.com' },
    update: {},
    create: {
      email: 'admin@inspiringinfosys.com',
      password: passwordHash,
      name: 'Admin',
    },
  });

  console.log('✅ Admin user created');
  console.log('   Email:    admin@inspiringinfosys.com');
  console.log('   Password: admin123');
  console.log('   ⚠️  Change this password after first login!\n');

  // ── 2. Hero Stats ──────────────────────────────────────────────
  const statsCount = await prisma.stat.count();
  if (statsCount === 0) {
    await prisma.stat.createMany({
      data: [
        { label: 'Happy Clients', value: '300', suffix: '+', sortOrder: 1, isActive: true },
        { label: 'Projects Done', value: '800', suffix: '+', sortOrder: 2, isActive: true },
        { label: 'Years Experience', value: '10', suffix: '+', sortOrder: 3, isActive: true },
      ],
    });
    console.log('✅ Stats seeded (3 records)');
  } else {
    console.log('⏭️  Stats already exist — skipped');
  }

  // ── 3. Testimonials ────────────────────────────────────────────
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
        },
        {
          name: 'Neha Kapoor',
          initials: 'NK',
          timeAgo: '2 months ago',
          rating: 5,
          text: 'Our marketing campaigns are very easy to run now. The WhatsApp API templates and broadcasts save our marketing team a significant amount of time.',
          colorClass: 'badge-cyan',
          sortOrder: 4,
          isActive: true,
        },
        {
          name: 'Ravi Sharma',
          initials: 'RS',
          timeAgo: '1 month ago',
          rating: 5,
          text: 'The automated WhatsApp business API solution has helped us automate purchase notifications and increase customer engagement significantly.',
          colorClass: 'badge-orange',
          sortOrder: 5,
          isActive: true,
        },
      ],
    });
    console.log('✅ Testimonials seeded (5 records)');
  } else {
    console.log('⏭️  Testimonials already exist — skipped');
  }

  // ── 4. Portfolio Projects ──────────────────────────────────────
  const projectsCount = await prisma.project.count();
  if (projectsCount === 0) {
    await prisma.project.createMany({
      data: [
        {
          title: 'SellWell',
          category: 'E-Commerce',
          imgUrl: '/img/portsellwellimage.png',
          link: 'https://sellwellone.com/',
          description: 'Centralized e-commerce automation dashboard to manage inventory, orders, and performance across multiple marketplace seller accounts.',
          sortOrder: 1,
          isActive: true,
        },
        {
          title: 'Spartan Nutrition',
          category: 'Websites',
          imgUrl: '/img/web-spartan.png',
          link: 'https://spartannutrition.com/',
          description: 'Custom designed high-performance responsive website for sports nutrition products.',
          sortOrder: 2,
          isActive: true,
        },
        {
          title: 'Tap2Cash',
          category: 'Software',
          imgUrl: '/img/taptocash.png',
          link: 'https://tap2cash.in/',
          description: 'Interactive POS and financial transaction software solution.',
          sortOrder: 3,
          isActive: true,
        },
        {
          title: 'Lactra B2B',
          category: 'E-Commerce',
          imgUrl: '/img/web-lactra.png',
          link: 'https://www.lactra.in/',
          description: 'Wholesale B2B ordering portal and e-commerce listing management solution.',
          sortOrder: 4,
          isActive: true,
        },
        {
          title: 'Ayaan Toys',
          category: 'E-Commerce',
          imgUrl: '/img/Web-ayantoys.png',
          link: 'https://ayaantoys.in',
          description: 'Product catalog setup, inventory tracking and seller account automation.',
          sortOrder: 5,
          isActive: true,
        },
        {
          title: 'Clasi Air',
          category: 'Websites',
          imgUrl: '/img/Web-clasair.png',
          link: 'https://clasiair.com',
          description: 'Brand website optimized for page speed, search visibility, and conversion.',
          sortOrder: 6,
          isActive: true,
        },
        {
          title: 'Lycot Swimwear',
          category: 'E-Commerce',
          imgUrl: '/img/Web-lycot.png',
          link: 'https://www.lycot.com/password',
          description: 'Marketplace account setup, listings optimization, and active ad campaign management.',
          sortOrder: 7,
          isActive: true,
        },
      ],
    });
    console.log('✅ Projects seeded (7 records)');
  } else {
    console.log('⏭️  Projects already exist — skipped');
  }

  // ── 5. Service Categories & Filings ─────────────────────────────
  const categoriesCount = await prisma.serviceCategory.count();
  if (categoriesCount === 0) {
    // Create categories first
    await prisma.serviceCategory.createMany({
      data: [
        {
          id: 'ecommerce',
          title: 'E-Commerce & Marketplaces',
          desc: 'Scale your online sales with account management, marketing, and catalog automation.',
          iconName: 'FiShoppingCart',
          sortOrder: 1,
          isActive: true,
        },
        {
          id: 'whatsapp',
          title: 'WhatsApp API & Business Tools',
          desc: 'Automate customer support, send broadcast campaigns, and sync orders via WhatsApp.',
          iconName: 'FiMessageCircle',
          sortOrder: 2,
          isActive: true,
        },
        {
          id: 'development',
          title: 'Development & Custom Software',
          desc: 'Build robust e-commerce websites, CRM systems, and tailored software solutions.',
          iconName: 'FiCode',
          sortOrder: 3,
          isActive: true,
        },
      ],
    });

    // Create filings
    await prisma.serviceFiling.createMany({
      data: [
        // Ecommerce filings
        { categoryId: 'ecommerce', name: 'Account Management', sortOrder: 1, isActive: true },
        { categoryId: 'ecommerce', name: 'Advertising & Marketing', sortOrder: 2, isActive: true },
        { categoryId: 'ecommerce', name: 'Product Content Listing', sortOrder: 3, isActive: true },
        { categoryId: 'ecommerce', name: 'Inventory & Order Sync', sortOrder: 4, isActive: true },
        { categoryId: 'ecommerce', name: 'Automated Pricing', sortOrder: 5, isActive: true },
        { categoryId: 'ecommerce', name: 'Brand Protection', sortOrder: 6, isActive: true },

        // Whatsapp filings
        { categoryId: 'whatsapp', name: 'Connect WhatsApp API', sortOrder: 1, isActive: true },
        { categoryId: 'whatsapp', name: 'Shared Live Chat', sortOrder: 2, isActive: true },
        { categoryId: 'whatsapp', name: 'Contact Organizer', sortOrder: 3, isActive: true },
        { categoryId: 'whatsapp', name: 'Message Templates', sortOrder: 4, isActive: true },
        { categoryId: 'whatsapp', name: 'Broadcast Campaigns', sortOrder: 5, isActive: true },
        { categoryId: 'whatsapp', name: 'Automated Order Alerts', sortOrder: 6, isActive: true },

        // Development filings
        { categoryId: 'development', name: 'E-commerce Website (Shopify/Custom)', sortOrder: 1, isActive: true },
        { categoryId: 'development', name: 'CRM Development', sortOrder: 2, isActive: true },
        { categoryId: 'development', name: 'Custom Software Development', sortOrder: 3, isActive: true },
        { categoryId: 'development', name: 'App Development', sortOrder: 4, isActive: true },
        { categoryId: 'development', name: 'SEO Services', sortOrder: 5, isActive: true },
        { categoryId: 'development', name: 'Bulk SMS / Voice Call', sortOrder: 6, isActive: true },
      ],
    });
    console.log('✅ Service Categories & Filings seeded');
  } else {
    console.log('⏭️  Service Categories & Filings already exist — skipped');
  }

  // ── 7. Initial Employee Records ────────────────────────────────
  const employeesCount = await prisma.employee.count();
  if (employeesCount === 0) {
    const empPasswordHash = await bcrypt.hash('Inspire#2026', 10);

    const emp1 = await prisma.employee.create({
      data: {
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
      }
    });

    const emp2 = await prisma.employee.create({
      data: {
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
      }
    });

    const emp3 = await prisma.employee.create({
      data: {
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
    });

    // Initial Attendance Punch Logs
    const today = new Date();
    await prisma.attendance.createMany({
      data: [
        {
          employeeId: emp1.id,
          date: today,
          checkIn: new Date(today.getTime() - 6 * 3600 * 1000),
          checkOut: new Date(today.getTime() - 1 * 3600 * 1000),
          status: 'Present'
        },
        {
          employeeId: emp2.id,
          date: today,
          checkIn: new Date(today.getTime() - 5 * 3600 * 1000),
          checkOut: null,
          status: 'Clocked In'
        },
        {
          employeeId: emp3.id,
          date: today,
          checkIn: new Date(today.getTime() - 4 * 3600 * 1000),
          checkOut: null,
          status: 'Clocked In'
        }
      ]
    });

    // Sample Leave Request
    await prisma.leaveRequest.create({
      data: {
        employeeId: emp2.id,
        leaveType: 'Casual',
        startDate: new Date('2026-09-10'),
        endDate: new Date('2026-09-12'),
        reason: 'Family function in hometown.',
        status: 'Pending'
      }
    });

    // Sample Employee Query
    await prisma.employeeQuery.create({
      data: {
        employeeId: emp1.id,
        subject: 'Salary Slip Update',
        message: 'Could you please issue the salary slip for September?',
        status: 'Pending'
      }
    });

    // Sample Documents
    await prisma.employeeDocument.createMany({
      data: [
        { employeeId: emp1.id, documentName: 'Rahul_Offer_Letter.pdf', category: 'Offer Letter', fileUrl: '/docs/offer_INS001.pdf', uploadedBy: 'HR Admin', status: 'Verified' },
        { employeeId: emp1.id, documentName: 'Rahul_Aadhar_Card.png', category: 'Identity Documents', fileUrl: '/docs/aadhar_INS001.png', uploadedBy: 'Rahul Sharma', status: 'Verified' },
        { employeeId: emp2.id, documentName: 'Ananya_Experience_Letter.pdf', category: 'Experience Letter', fileUrl: '/docs/exp_emp2.pdf', uploadedBy: 'HR Admin', status: 'Verified' },
        { employeeId: emp3.id, documentName: 'Atul_Joining_Letter.pdf', category: 'Joining Letter', fileUrl: '/docs/join_emp3.pdf', uploadedBy: 'HR Admin', status: 'Verified' }
      ]
    });

    // Sample HR Letters
    await prisma.hRLetter.createMany({
      data: [
        { employeeId: emp1.id, letterType: 'Offer Letter', title: 'Offer of Employment — Senior Software Engineer', content: 'Dear Rahul Sharma, We are pleased to offer you...', sentToEmployee: true },
        { employeeId: emp3.id, letterType: 'Appointment Letter', title: 'Appointment Letter — FULL STACK Engineer', content: 'Dear Atul Mishra, Welcome to Inspiring Infosys...', sentToEmployee: true }
      ]
    });

    // Sample Employee Requests
    await prisma.employeeRequest.createMany({
      data: [
        { employeeId: emp2.id, requestType: 'WFH', title: 'Work From Home Request — Sept 15', description: 'Working remotely due to internet installation at home.', status: 'Pending', assignedTo: 'HR Admin' },
        { employeeId: emp3.id, requestType: 'Profile Change', title: 'Mobile Number Update Request', description: 'Requested to change mobile number', oldValue: '8444040514', newValue: '9876500000', status: 'Pending', assignedTo: 'HR Admin' }
      ]
    });

    console.log('✅ Sample employees, attendance, leaves, queries, documents, letters, & requests seeded');
  } else {
    console.log('⏭️  Employees already exist — skipped');
  }

  console.log('\n🎉 Seed complete!');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
