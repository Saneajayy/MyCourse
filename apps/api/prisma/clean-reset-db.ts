import { PrismaClient, ProductStatus, LessonStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { uuidv7 } from 'uuidv7';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Redis } from 'ioredis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔄 Cleaning database and initializing from scratch (NO USERS)...');

  // 1. Truncate all user-related tables with CASCADE
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "User",
      "RefreshToken",
      "EmailVerificationToken",
      "PasswordResetToken",
      "Order",
      "Payment",
      "Refund",
      "Entitlement",
      "LessonProgress",
      "CouponRedemption",
      "WebhookEvent",
      "AuditLog",
      "Invoice",
      "EmailLog",
      "EmailSuppression",
      "ContactSubmission"
    CASCADE;
  `);

  console.log('✅ Truncated all user, auth, order, invoice, and tracking tables.');

  // 2. Remove all leftover test products/sections/lessons
  await prisma.lesson.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.product.deleteMany({});
  console.log('✅ Cleared old products and lessons.');

  // 3. Ensure default application settings
  const defaultSettings = [
    {
      key: 'business_profile',
      value: {
        businessName: process.env.BUSINESS_NAME || 'Hydro Basics',
        businessAddress:
          process.env.BUSINESS_ADDRESS || '123 Industrial Area, Phase 2, New Delhi, India',
        supportEmail: process.env.EMAIL_FROM || 'support@hydrauliccourse.com',
      },
      description: 'Business name, address, and contact details for invoices and receipts',
    },
    {
      key: 'tax_config',
      value: {
        gstin: process.env.GSTIN || '',
        gstRatePercent: Number(process.env.GST_RATE_PERCENT || 0),
        pricesTaxInclusive: process.env.PRICES_TAX_INCLUSIVE !== 'false',
      },
      description: 'GST taxation configuration and tax-inclusive pricing display mode',
    },
    {
      key: 'invoice_config',
      value: {
        invoicePrefix: 'INV',
        financialYearFormat: 'YYYY-YYYY',
        currentSequence: 1,
      },
      description: 'Sequential invoice numbering and financial year configuration',
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      create: {
        id: uuidv7(),
        key: setting.key,
        value: setting.value,
        description: setting.description,
      },
      update: {
        value: setting.value,
      },
    });
  }
  console.log('✅ Configured default app settings.');

  // 4. Seed the clean course: "Hydraulic System Basics"
  const slug = 'hydraulic-engineering-mastery';
  const productId = uuidv7();

  const product = await prisma.product.create({
    data: {
      id: productId,
      slug,
      title: 'Hydraulic System Basics',
      description:
        'Learn the fundamentals of hydraulic systems from scratch. This course introduces you to the working principles of hydraulics, essential components, and hydraulic circuit basics through easy-to-understand video lessons.',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      pricePaise: 499900, // ₹4,999.00
      compareAtPricePaise: 999900, // ₹9,999.00
      currency: 'INR',
      validityDays: 365,
      allowRenewals: true,
      renewalWindowDays: 30,
      status: ProductStatus.PUBLISHED,
    },
  });
  console.log(`✅ Created course product: "${product.title}" (${product.slug})`);

  // 5. Seed the 4-module official syllabus and 16 lessons
  const curriculum = [
    {
      title: 'Module 1: Hydraulic Basics',
      lessons: [
        {
          title: 'How hydraulic systems work',
          description:
            'Fundamental principles of fluid power, hydraulic circuit behavior, and practical workplace concepts.',
          durationSeconds: 720,
          isFreePreview: true,
          videoProviderId: 'sample-bunny-video-01',
        },
        {
          title: 'Pressure, flow and power in simple terms',
          description:
            'Understanding Pascal’s law, pressure vs flow relationships, and calculating actuator power without heavy math.',
          durationSeconds: 980,
          isFreePreview: false,
          videoProviderId: 'sample-bunny-video-02',
        },
        {
          title: 'Main parts of a hydraulic circuit',
          description:
            'Overview of power units, reservoirs, actuators, manifolds, and how components interact in real machines.',
          durationSeconds: 840,
          isFreePreview: false,
          videoProviderId: 'sample-bunny-video-03',
        },
        {
          title: 'Hydraulic oil and filters',
          description:
            'Fluid selection, viscosity indexes, contamination control standards (ISO 4406), and filter sizing.',
          durationSeconds: 910,
          isFreePreview: false,
          videoProviderId: 'sample-bunny-video-04',
        },
      ],
    },
    {
      title: 'Module 2: Pumps, Valves and Circuits',
      lessons: [
        {
          title: 'Choosing the right pump',
          description:
            'Gear, vane, and piston pumps compared: operational limits, noise, displacement, and plant sizing.',
          durationSeconds: 1120,
          isFreePreview: false,
          videoProviderId: 'sample-bunny-video-05',
        },
        {
          title: 'Directional and pressure control valves',
          description:
            'Spool configurations, direct vs pilot operated relief valves, sequence valves, and counterbalance valves.',
          durationSeconds: 1250,
          isFreePreview: false,
          videoProviderId: 'sample-bunny-video-06',
        },
        {
          title: 'Proportional valves explained',
          description:
            'Proportional solenoids, LVDT feedback, amplifier cards, ramp controls, and servo valve differences.',
          durationSeconds: 1340,
          isFreePreview: false,
          videoProviderId: 'sample-bunny-video-07',
        },
        {
          title: 'Reading hydraulic schematics',
          description:
            'ISO 1219 standard symbol decoding, signal flow tracing, and breaking down complex industrial blueprints.',
          durationSeconds: 1480,
          isFreePreview: false,
          videoProviderId: 'sample-bunny-video-08',
        },
      ],
    },
    {
      title: 'Module 3: Troubleshooting and Maintenance',
      lessons: [
        {
          title: 'Common hydraulic problems and their causes',
          description:
            'Overheating, aeration, cavitation, excessive vibration, and unresponsiveness diagnosis.',
          durationSeconds: 1190,
          isFreePreview: false,
          videoProviderId: 'sample-bunny-video-09',
        },
        {
          title: 'Step-by-step fault finding',
          description:
            'Logical diagnostic procedures, pressure tap checks, flow meter tests, and isolation techniques.',
          durationSeconds: 1310,
          isFreePreview: false,
          videoProviderId: 'sample-bunny-video-10',
        },
        {
          title: 'Preventive maintenance checklist',
          description:
            'Daily, weekly, and monthly maintenance routines for industrial hydraulic power units and accumulators.',
          durationSeconds: 880,
          isFreePreview: false,
          videoProviderId: 'sample-bunny-video-11',
        },
        {
          title: 'Real plant case studies',
          description:
            'Detailed post-mortem analysis of actual plant breakdowns, root-cause investigations, and preventive fixes.',
          durationSeconds: 1420,
          isFreePreview: false,
          videoProviderId: 'sample-bunny-video-12',
        },
      ],
    },
    {
      title: 'Module 4: Interview Problems',
      lessons: [
        {
          title: 'Interview Problem Part 1',
          description:
            'Core concepts interview questions: circuit efficiency, pump failure mechanisms, and relief valve settings.',
          durationSeconds: 960,
          isFreePreview: false,
          videoProviderId: 'sample-bunny-video-13',
        },
        {
          title: 'Interview Problem Part 2',
          description:
            'Schematic tracing interview problems: analyzing multi-cylinder sequential automation circuits.',
          durationSeconds: 1040,
          isFreePreview: false,
          videoProviderId: 'sample-bunny-video-14',
        },
        {
          title: 'Interview Problem Part 3',
          description:
            'Troubleshooting interview scenarios: low pressure with high motor current, hydraulic hammer, and slow actuation.',
          durationSeconds: 1110,
          isFreePreview: false,
          videoProviderId: 'sample-bunny-video-15',
        },
        {
          title: 'Interview Problem Part 4',
          description:
            'Design and sizing challenge: selecting pump, motor HP, pipe diameters, and tank volume from machine specs.',
          durationSeconds: 1280,
          isFreePreview: false,
          videoProviderId: 'sample-bunny-video-16',
        },
      ],
    },
  ];

  for (let sIdx = 0; sIdx < curriculum.length; sIdx++) {
    const sData = curriculum[sIdx]!;
    const sectionId = uuidv7();
    const section = await prisma.section.create({
      data: {
        id: sectionId,
        productId: product.id,
        title: sData.title,
        position: sIdx + 1,
        isPublished: true,
      },
    });

    for (let lIdx = 0; lIdx < sData.lessons.length; lIdx++) {
      const lData = sData.lessons[lIdx]!;
      await prisma.lesson.create({
        data: {
          id: uuidv7(),
          sectionId: section.id,
          productId: product.id,
          title: lData.title,
          description: lData.description,
          position: lIdx + 1,
          durationSeconds: lData.durationSeconds,
          isFreePreview: lData.isFreePreview,
          isPublished: true,
          status: LessonStatus.READY,
          videoProviderId: lData.videoProviderId,
        },
      });
    }
  }

  console.log('✅ Seeded 4 modules with 16 lessons.');

  // 6. Flush Redis to remove old sessions, lockouts, and caches
  if (process.env.REDIS_URL) {
    try {
      const redis = new Redis(process.env.REDIS_URL);
      await redis.flushdb();
      console.log('✅ Flushed Redis cache, sessions, and rate-limit keys.');
      await redis.quit();
    } catch (e) {
      console.warn('⚠️ Redis flush warning:', e);
    }
  }

  // 7. Verification Counts
  const userCount = await prisma.user.count();
  const tokenCount = await prisma.emailVerificationToken.count();
  const orderCount = await prisma.order.count();
  const productCount = await prisma.product.count();
  const sectionCount = await prisma.section.count();
  const lessonCount = await prisma.lesson.count();

  console.log('\n📊 Clean Database Verification Report:');
  console.log(`• Users:                    ${userCount} (Target: 0)`);
  console.log(`• EmailVerificationTokens:  ${tokenCount} (Target: 0)`);
  console.log(`• Orders:                   ${orderCount} (Target: 0)`);
  console.log(`• Products:                 ${productCount} (${product.title})`);
  console.log(`• Course Sections (Modules): ${sectionCount}`);
  console.log(`• Course Lessons:           ${lessonCount}`);
  console.log('\n🎉 Database is clean and initialized from scratch with NO users!');
}

main()
  .catch((e) => {
    console.error('❌ Error cleaning database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
