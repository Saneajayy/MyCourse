-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true;
