import { PrismaClient } from '@prisma/client';
import { APP_THEMES } from '../src/lib/color-catalog';

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching all themes...");
  const allThemes = await prisma.usernameColorShopItem.findMany({ where: { type: "theme" } });

  let updatedCount = 0;
  for (const theme of APP_THEMES) {
    const existing = allThemes.find(t => t.name === theme.name);
    if (existing && existing.colorValue !== theme.colorValue) {
      await prisma.usernameColorShopItem.update({
        where: { id: existing.id },
        data: { colorValue: theme.colorValue }
      });
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} themes successfully.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
