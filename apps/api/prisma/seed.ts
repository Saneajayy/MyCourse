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
        businessName: process.env.BUSINESS_NAME || 'Hydraulic Engineering Academy',
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
          'Comprehensive practical masterclass on industrial hydraulic systems, pumps, valves, and troubleshooting by a hydraulic engineer with 20+ years of field experience.',
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

    // Section 1: Fundamentals
    const section1Id = uuidv7();
    await prisma.section.create({
      data: {
        id: section1Id,
        productId: product.id,
        title: 'Section 1: Fundamentals of Industrial Hydraulics',
        position: 1,
      },
    });

    await prisma.lesson.create({
      data: {
        id: uuidv7(),
        sectionId: section1Id,
        productId: product.id,
        title: 'Lesson 1.1: Welcome & Course Overview',
        description:
          'Introduction to course structure, hydraulic safety, and industrial applications.',
        position: 1,
        durationSeconds: 720, // 12 mins
        isFreePreview: true, // Free preview
        status: LessonStatus.READY,
        videoProviderId: 'sample-bunny-video-01',
      },
    });

    await prisma.lesson.create({
      data: {
        id: uuidv7(),
        sectionId: section1Id,
        productId: product.id,
        title: 'Lesson 1.2: Pascal’s Law & Fluid Power Physics',
        description:
          'Detailed analysis of pressure transmission, force multiplication, and practical calculations.',
        position: 2,
        durationSeconds: 1540,
        isFreePreview: false,
        status: LessonStatus.READY,
        videoProviderId: 'sample-bunny-video-02',
      },
    });

    // Section 2: Pumps & Actuators
    const section2Id = uuidv7();
    await prisma.section.create({
      data: {
        id: section2Id,
        productId: product.id,
        title: 'Section 2: Hydraulic Pumps & Actuators',
        position: 2,
      },
    });

    await prisma.lesson.create({
      data: {
        id: uuidv7(),
        sectionId: section2Id,
        productId: product.id,
        title: 'Lesson 2.1: Gear, Vane, and Piston Pump Architecture',
        description:
          'Comparative operational analysis, displacement calculations, and efficiency curves.',
        position: 1,
        durationSeconds: 1820,
        isFreePreview: false,
        status: LessonStatus.READY,
        videoProviderId: 'sample-bunny-video-03',
      },
    });

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

    console.log(`Seeded course: "${product.title}" with 2 sections and 3 lessons.`);
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
