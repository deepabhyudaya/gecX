const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function patch() {
  const themes = await prisma.usernameColorShopItem.findMany({
    where: { shade: 'gradient', type: 'theme' }
  });

  let patched = 0;
  for (const t of themes) {
    try {
      let vars = JSON.parse(t.colorValue);
      let changed = false;

      if (vars['--card'] === '255 255% 255% / 0.1' || vars['--card'] === '255 255% 255% / 0.2') {
        vars['--card'] = '0 0% 0% / 0.25';
        vars['--secondary'] = '0 0% 0% / 0.35';
        vars['--muted'] = '0 0% 0% / 0.4';
        vars['--accent'] = '0 0% 0% / 0.5';
        changed = true;
      }

      if (changed) {
        await prisma.usernameColorShopItem.update({
          where: { id: t.id },
          data: { colorValue: JSON.stringify(vars) }
        });
        patched++;
        console.log(`Patched ${t.name}`);
      }
    } catch(e) {}
  }
  console.log(`Patched ${patched} themes`);
}

patch().then(() => process.exit(0));
