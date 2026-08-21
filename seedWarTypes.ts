import { PrismaClient } from "@prisma/client";
import { WAR_TYPES } from "./src/lib/war-types";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding War Types...");

  for (const type of WAR_TYPES) {
    if (type.id === "AUTO_RANDOM") continue;

    await prisma.warType.upsert({
      where: { id: type.id },
      update: {
        name: type.name,
        description: type.description,
        requiresTeacher: type.requiresTeacher,
        minDurationHours: type.durationHint.includes("Mins") ? 1 : parseInt(type.durationHint) * 24 || 24,
        maxDurationHours: type.durationHint.includes("Mins") ? 1 : parseInt(type.durationHint) * 24 || 24,
        probabilityWeightForRandom: 15,
      },
      create: {
        id: type.id,
        name: type.name,
        description: type.description,
        requiresTeacher: type.requiresTeacher,
        minDurationHours: type.durationHint.includes("Mins") ? 1 : parseInt(type.durationHint) * 24 || 24,
        maxDurationHours: type.durationHint.includes("Mins") ? 1 : parseInt(type.durationHint) * 24 || 24,
        probabilityWeightForRandom: 15,
      },
    });
    console.log(`Upserted ${type.name}`);
  }

  console.log("War Types seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
