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

  // ── 6. Turnover Options (Get Quote Step 3) ──────────────────────
  const turnoverCount = await prisma.turnoverOption.count();
  if (turnoverCount === 0) {
    await prisma.turnoverOption.createMany({
      data: [
        { label: 'Below ₹10 Lakhs', sortOrder: 1, isActive: true },
        { label: '₹10L to ₹40 Lakhs', sortOrder: 2, isActive: true },
        { label: 'Above ₹40 Lakhs', sortOrder: 3, isActive: true },
      ],
    });
    console.log('✅ Turnover options seeded (3 records)');
  } else {
    console.log('⏭️  Turnover options already exist — skipped');
  }

  console.log('\n🎉 Seed complete!');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
