const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('c:/Users/advwa/OneDrive/Documents/NextJS/New folder (2)/sms/src');
let changedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  content = content.replace(/bg-foreground\s+hover:bg-foreground\/90\s+text-background/g, 'bg-primary hover:bg-primary/90 text-primary-foreground');
  content = content.replace(/bg-foreground\s+hover:bg-foreground\/90\s+transition-colors\s+text-background/g, 'bg-primary hover:bg-primary/90 transition-colors text-primary-foreground');
  content = content.replace(/bg-foreground\s+text-background\s+hover:bg-foreground\/90/g, 'bg-primary text-primary-foreground hover:bg-primary/90');
  content = content.replace(/bg-foreground\s+text-background/g, 'bg-primary text-primary-foreground');

  content = content.replace(/bg-blue-500 text-white/g, 'bg-primary text-primary-foreground');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
    changedFiles++;
  }
}

console.log(`Finished updating ${changedFiles} files.`);
