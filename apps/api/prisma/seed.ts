import { PrismaClient, UserRole, UserStatus, ProductStatus, LessonStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { uuidv7 } from 'uuidv7';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

function validateAdminPassword(password: string): void {
  if (password.length < 12) {
    throw new Error('Admin password must be at least 12 characters long.');
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    throw new Error(
      'Admin password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    );
  }

  // Common passwords check
  const normalized = password.trim().toLowerCase();
  if (
    normalized.includes('password') ||
    normalized.includes('admin') ||
    normalized.includes('123456') ||
    normalized.includes('qwerty')
  ) {
    throw new Error('Admin password is too common or predictable.');
  }
}

async function main() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  console.log(`Starting database seed in [${nodeEnv}] mode...`);

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME ?? 'Administrator';

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be defined in the environment.');
  }

  // Enforce strong password rules for admin account
  validateAdminPassword(adminPassword);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail.toLowerCase() },
  });

  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
  });

  let adminId: string;

  if (!existingAdmin) {
    adminId = uuidv7();
    await prisma.user.create({
      data: {
        id: adminId,
        email: adminEmail.toLowerCase(),
        name: adminName,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: false, // Mandatory enrollment wizard triggered on first login
      },
    });
    console.log(`Created admin user: ${adminEmail} (ID: ${adminId})`);
  } else {
    adminId = existingAdmin.id;
    await prisma.user.update({
      where: { id: adminId },
      data: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: existingAdmin.emailVerifiedAt ?? new Date(),
      },
    });
    console.log(`Admin user already exists: ${adminEmail} (ID: ${adminId})`);
  }

  // Audit log for admin seeding
  await prisma.auditLog.create({
    data: {
      id: uuidv7(),
      actorUserId: adminId,
      action: 'ADMIN_SEEDED',
      entityType: 'User',
      entityId: adminId,
      afterState: { email: adminEmail.toLowerCase(), role: 'ADMIN' },
    },
  });

  // Seed first-run application settings if not already present
  const defaultSettings = [
    {
      key: 'business_profile',
      value: {
        businessName: process.env.BUSINESS_NAME || 'Hydro Basics',
        businessAddress:
          process.env.BUSINESS_ADDRESS || '123 Industrial Area, Phase 2, New Delhi, India',
        supportEmail: process.env.EMAIL_FROM || 'support@hydrobasics.com',
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
    const existing = await prisma.appSetting.findUnique({ where: { key: setting.key } });
    if (!existing) {
      await prisma.appSetting.create({
        data: {
          id: uuidv7(),
          key: setting.key,
          value: setting.value,
          description: setting.description,
        },
      });
      console.log(`Seeded default app setting: ${setting.key}`);
    }
  }

  // CRITICAL REQUIREMENT: Sample products must NEVER be seeded in production
  if (nodeEnv === 'production') {
    console.log('Production mode detected. Skipping sample product/course seeding.');
    return;
  }

  console.log('Development/Test mode detected. Seeding sample hydraulic engineering course...');

  const sampleSlug = 'hydraulic-engineering-mastery';
  const existingProduct = await prisma.product.findUnique({
    where: { slug: sampleSlug },
  });

  if (!existingProduct) {
    const productId = uuidv7();
    const product = await prisma.product.create({
      data: {
        id: productId,
        slug: sampleSlug,
        title: 'Industrial Hydraulic Systems & Circuit Design',
        description:
          'Learn the fundamentals of hydraulic systems from scratch. This course introduces you to the working principles of hydraulics, essential components, and hydraulic circuit basics through easy-to-understand video lessons.',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        pricePaise: 499900, // Rs 4,999.00
        compareAtPricePaise: 999900, // Rs 9,999.00
        currency: 'INR',
        validityDays: 365, // 1 year access
        allowRenewals: true,
        renewalWindowDays: 30,
        status: ProductStatus.PUBLISHED,
      },
    });

    // Seed the 4-module syllabus
    const curriculum = [
      {
        title: 'Module 1: Hydraulic Basics',
        lessons: [
          {
            title: 'How hydraulic systems work',
            description: 'Fundamental principles of fluid power, hydraulic circuit behavior, and practical workplace concepts.',
            durationSeconds: 720,
            isFreePreview: true,
            videoProviderId: 'sample-bunny-video-01',
          },
          {
            title: 'Pressure, flow and power in simple terms',
            description: 'Understanding Pascal’s law, pressure vs flow relationships, and calculating actuator power without heavy math.',
            durationSeconds: 980,
            isFreePreview: false,
            videoProviderId: 'sample-bunny-video-02',
          },
          {
            title: 'Main parts of a hydraulic circuit',
            description: 'Overview of power units, reservoirs, actuators, manifolds, and how components interact in real machines.',
            durationSeconds: 840,
            isFreePreview: false,
            videoProviderId: 'sample-bunny-video-03',
          },
          {
            title: 'Hydraulic oil and filters',
            description: 'Fluid selection, viscosity indexes, contamination control standards (ISO 4406), and filter sizing.',
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
            description: 'Gear, vane, and piston pumps compared: operational limits, noise, displacement, and plant sizing.',
            durationSeconds: 1120,
            isFreePreview: false,
            videoProviderId: 'sample-bunny-video-05',
          },
          {
            title: 'Directional and pressure control valves',
            description: 'Spool configurations, direct vs pilot operated relief valves, sequence valves, and counterbalance valves.',
            durationSeconds: 1250,
            isFreePreview: false,
            videoProviderId: 'sample-bunny-video-06',
          },
          {
            title: 'Proportional valves explained',
            description: 'Proportional solenoids, LVDT feedback, amplifier cards, ramp controls, and servo valve differences.',
            durationSeconds: 1340,
            isFreePreview: false,
            videoProviderId: 'sample-bunny-video-07',
          },
          {
            title: 'Reading hydraulic schematics',
            description: 'ISO 1219 standard symbol decoding, signal flow tracing, and breaking down complex industrial blueprints.',
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
            description: 'Overheating, aeration, cavitation, excessive vibration, and unresponsiveness diagnosis.',
            durationSeconds: 1190,
            isFreePreview: false,
            videoProviderId: 'sample-bunny-video-09',
          },
          {
            title: 'Step-by-step fault finding',
            description: 'Logical diagnostic procedures, pressure tap checks, flow meter tests, and isolation techniques.',
            durationSeconds: 1310,
            isFreePreview: false,
            videoProviderId: 'sample-bunny-video-10',
          },
          {
            title: 'Preventive maintenance checklist',
            description: 'Daily, weekly, and monthly maintenance routines for industrial hydraulic power units and accumulators.',
            durationSeconds: 880,
            isFreePreview: false,
            videoProviderId: 'sample-bunny-video-11',
          },
          {
            title: 'Real plant case studies',
            description: 'Detailed post-mortem analysis of actual plant breakdowns, root-cause investigations, and preventive fixes.',
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
            description: 'Core concepts interview questions: circuit efficiency, pump failure mechanisms, and relief valve settings.',
            durationSeconds: 960,
            isFreePreview: false,
            videoProviderId: 'sample-bunny-video-13',
          },
          {
            title: 'Interview Problem Part 2',
            description: 'Schematic tracing interview problems: analyzing multi-cylinder sequential automation circuits.',
            durationSeconds: 1040,
            isFreePreview: false,
            videoProviderId: 'sample-bunny-video-14',
          },
          {
            title: 'Interview Problem Part 3',
            description: 'Troubleshooting interview scenarios: low pressure with high motor current, hydraulic hammer, and slow actuation.',
            durationSeconds: 1110,
            isFreePreview: false,
            videoProviderId: 'sample-bunny-video-15',
          },
          {
            title: 'Interview Problem Part 4',
            description: 'Design and sizing challenge: selecting pump, motor HP, pipe diameters, and tank volume from machine specs.',
            durationSeconds: 1280,
            isFreePreview: false,
            videoProviderId: 'sample-bunny-video-16',
          },
        ],
      },
    ];

    for (let sIdx = 0; sIdx < curriculum.length; sIdx++) {
      const sData = curriculum[sIdx]!;
      const section = await prisma.section.create({
        data: {
          id: uuidv7(),
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

    // Seed a sample coupon (10% discount)
    await prisma.coupon.create({
      data: {
        id: uuidv7(),
        code: 'LAUNCH10',
        type: 'PERCENT',
        value: 10,
        maxRedemptions: 100,
        perUserLimit: 1,
        productId: product.id,
        isActive: true,
      },
    });

    console.log(`Seeded course: "${product.title}" with 4 sections and 16 lessons.`);
  } else {
    console.log(`Sample product "${sampleSlug}" already seeded.`);
  }

  console.log('Database seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Database seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
