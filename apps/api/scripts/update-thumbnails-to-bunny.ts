import { PrismaClient } from '@prisma/client';
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

async function main() {
  const cdnHostname = process.env.BUNNY_STREAM_CDN_HOSTNAME || 'vz-2f983eda-800.b-cdn.net';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const lessons = await prisma.lesson.findMany();
  let updatedCount = 0;

  for (const l of lessons) {
    if (l.videoProviderId && uuidRegex.test(l.videoProviderId)) {
      const cdnThumbnail = `https://${cdnHostname}/${l.videoProviderId}/thumbnail.jpg`;
      await prisma.lesson.update({
        where: { id: l.id },
        data: { thumbnailUrl: cdnThumbnail },
      });
      console.log(`Updated lesson "${l.title}" -> ${cdnThumbnail}`);
      updatedCount++;
    } else if (l.thumbnailUrl && l.thumbnailUrl.startsWith('/uploads/')) {
      await prisma.lesson.update({
        where: { id: l.id },
        data: { thumbnailUrl: null },
      });
      console.log(`Cleaned broken local upload on sample lesson "${l.title}"`);
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} lessons.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
