const fs = require('fs');
const path = require('path');

const files = [
  'src/components/animate-ui/components/community/pin-list.tsx',
  'src/components/animate-ui/components/community/notification-list.tsx',
];

for (const file of files) {
  const p = path.join(__dirname, '..', file);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/bg-neutral-200 dark:bg-neutral-900/g, 'bg-card');
    content = content.replace(/bg-neutral-100 dark:bg-neutral-800/g, 'bg-secondary');
    content = content.replace(/bg-neutral-200 dark:bg-neutral-800/g, 'bg-card');
    content = content.replace(/bg-neutral-400 dark:bg-neutral-600/g, 'bg-muted-foreground/30');
    fs.writeFileSync(p, content);
    console.log('Fixed', file);
  }
}
