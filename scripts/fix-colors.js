const fs = require('fs');
const path = require('path');

const files = [
  'src/components/support/SupportChatClient.tsx',
  'src/components/PublicTicketAdminView.tsx',
  'src/components/servers/ServerChatView.tsx',
  'src/components/messages/DirectMessageClient.tsx',
  'src/components/messages/GroupChatView.tsx',
  'src/components/sidebar-inner.tsx',
  'src/components/TableSearch.tsx'
];

for (const file of files) {
  const p = path.join(__dirname, '..', file);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/bg-\[#fafafa\] dark:bg-\[#111113\]/g, 'bg-background');
    content = content.replace(/bg-\[#f4f4f5\] dark:bg-\[#111113\]/g, 'bg-background');
    fs.writeFileSync(p, content);
    console.log('Fixed', file);
  }
}
