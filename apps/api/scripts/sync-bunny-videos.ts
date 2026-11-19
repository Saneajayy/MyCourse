import { PrismaClient, LessonStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

interface BunnyVideoItem {
  guid: string;
  title: string;
  length: number;
  thumbnailUrl: string;
  status: number;
  encodeProgress: number;
}

interface BunnyVideoResponse {
  totalItems: number;
  items: BunnyVideoItem[];
}

async function syncBunnyVideos() {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || '780987';
  const apiKey = process.env.BUNNY_STREAM_API_KEY || '';

  console.log(`Fetching videos from Bunny Stream library ${libraryId}...`);

  const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
    headers: {
      AccessKey: apiKey,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to query Bunny Stream: HTTP ${res.status}`);
  }

  const data = (await res.json()) as BunnyVideoResponse;
  console.log(`Found ${data.items.length} videos in Bunny Stream:`);
  for (const item of data.items) {
    console.log(` - [${item.guid}] "${item.title}" (${item.length}s) -> ${item.thumbnailUrl}`);
  }

  // Sort them by upload date or logical order: "Introduction to course" first, then "Basics of hydraulics"
  const sortedVideos = [...data.items].sort((a, b) => {
    if (a.title.toLowerCase().includes('intro')) return -1;
    if (b.title.toLowerCase().includes('intro')) return 1;
    return 0;
  });

  // Find the course
  const product = await prisma.product.findFirst({
    where: { deletedAt: null },
    include: {
      sections: {
        orderBy: { position: 'asc' },
        include: {
          lessons: {
            orderBy: { position: 'asc' },
          },
        },
      },
    },
  });

  if (!product) {
    throw new Error('No product found in database. Please run seed first.');
  }

  console.log(`Target Course: "${product.title}" (${product.id})`);

  let section = product.sections[0];
  if (!section) {
    section = await prisma.section.create({
      data: {
        id: crypto.randomUUID(),
        productId: product.id,
        title: 'Module 1: Hydraulic Basics',
        position: 1,
        isPublished: true,
      },
      include: { lessons: true },
    });
  }

  console.log(`Target Section: "${section.title}" (${section.id})`);

  // For each video from Bunny, update or create the lesson
  for (let i = 0; i < sortedVideos.length; i++) {
    const video = sortedVideos[i]!;
    const position = i + 1;
    const existingLesson = section.lessons[i];

    if (existingLesson) {
      const updated = await prisma.lesson.update({
        where: { id: existingLesson.id },
        data: {
          title: video.title,
          videoProviderId: video.guid,
          durationSeconds: video.length,
          thumbnailUrl: video.thumbnailUrl,
          status: LessonStatus.READY,
          isPublished: true,
          isFreePreview: i === 0, // make first video free preview
        },
      });
      console.log(`Updated Lesson ${position}: "${updated.title}" with Bunny video ${video.guid}`);
    } else {
      const created = await prisma.lesson.create({
        data: {
          id: crypto.randomUUID(),
          sectionId: section.id,
          productId: product.id,
          title: video.title,
          description: `Comprehensive video covering ${video.title}.`,
          position,
          videoProviderId: video.guid,
          durationSeconds: video.length,
          thumbnailUrl: video.thumbnailUrl,
          status: LessonStatus.READY,
          isPublished: true,
          isFreePreview: i === 0,
        },
      });
      console.log(`Created Lesson ${position}: "${created.title}" with Bunny video ${video.guid}`);
    }
  }

  console.log('\nSync successfully completed!');
  await prisma.$disconnect();
}

syncBunnyVideos().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
