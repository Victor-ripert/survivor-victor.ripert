import { prisma } from './client.js';
import { certificationLevels } from './seed-data/certification-levels.js';
import { certificationQuestions } from './seed-data/certification-questions.js';

// Every seed function upserts on a deterministic key (never a fresh cuid),
// so `npm run db:seed` can be re-run safely without duplicating rows.

async function seedCertificationLevels(): Promise<void> {
  for (const level of certificationLevels) {
    await prisma.certificationLevel.upsert({
      where: { name: level.name },
      update: level,
      create: level,
    });
  }
  console.log(`Seeded ${certificationLevels.length} certification levels`);
}

async function seedCertificationQuestions(): Promise<void> {
  for (const { id, options, ...questionData } of certificationQuestions) {
    await prisma.certificationQuestion.upsert({
      where: { id },
      update: questionData,
      create: { id, ...questionData },
    });

    for (const { id: optionId, ...optionData } of options ?? []) {
      await prisma.certificationOption.upsert({
        where: { id: optionId },
        update: { ...optionData, questionId: id },
        create: { id: optionId, questionId: id, ...optionData },
      });
    }
  }
  console.log(`Seeded ${certificationQuestions.length} certification questions`);
}

async function main(): Promise<void> {
  await seedCertificationLevels();
  await seedCertificationQuestions();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
