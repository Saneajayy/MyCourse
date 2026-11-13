import { PrismaClient, LessonStatus } from '@prisma/client';
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
  const slug = 'hydraulic-engineering-mastery';
  const product = await prisma.product.findUnique({
    where: { slug },
  });

  if (!product) {
    throw new Error(`Product with slug "${slug}" not found.`);
  }

  console.log(`Found product: ${product.title} (${product.id})`);

  // First check if there's an existing free preview lesson to keep its videoProviderId
  const existingPreview = await prisma.lesson.findFirst({
    where: {
      productId: product.id,
      isFreePreview: true,
    },
  });

  const previewVideoProviderId = existingPreview?.videoProviderId || 'sample-bunny-video-01';
  console.log(`Using preview videoProviderId: ${previewVideoProviderId}`);

  // Delete existing sections & lessons for this product
  await prisma.section.deleteMany({
    where: { productId: product.id },
  });
  console.log('Deleted previous sections and lessons.');

  // Syllabus structure to insert
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
          videoProviderId: previewVideoProviderId,
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

  console.log('Successfully inserted all 4 modules and 16 lessons into the database!');

  // Clear redis cache
  if (process.env.REDIS_URL) {
    try {
      const redis = new Redis(process.env.REDIS_URL);
      await redis.del(`catalog:course:${slug}`);
      console.log(`Cleared Redis cache for catalog:course:${slug}`);
      await redis.quit();
    } catch (e) {
      console.warn('Redis cache clear warning:', e);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
