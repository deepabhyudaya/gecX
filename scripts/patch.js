const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function patch() {
  const allThemes = await prisma.usernameColorShopItem.findMany({ where: { type: "theme" } });
  for (const t of allThemes) {
    if (t.name.includes('Light')) {
      console.log(t.name);
      console.log(t.colorValue);
      break;
    }
  }
}
patch().catch(console.error).finally(() => prisma.$disconnect());
