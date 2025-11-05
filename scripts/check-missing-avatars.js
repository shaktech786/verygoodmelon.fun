const fs = require('fs');
const path = require('path');

const thinkers = [
  'buddha', 'leonardo-da-vinci', 'harriet-tubman', 'frederick-douglass',
  'virginia-woolf', 'eleanor-roosevelt', 'malcolm-x', 'rosa-parks',
  'mother-teresa', 'maya-angelou', 'anne-frank', 'ruth-bader-ginsburg',
  'cesar-chavez', 'bob-marley', 'stephen-hawking', 'oscar-wilde'
];

const avatarsDir = path.join(__dirname, '../public/games/timeless-minds/avatars');

console.log('\n🔍 Checking for missing avatars:\n');

const missing = [];
thinkers.forEach(id => {
  const exists = fs.existsSync(path.join(avatarsDir, `${id}.png`));
  if (!exists) {
    console.log(`❌ Missing: ${id}`);
    missing.push(id);
  } else {
    console.log(`✅ Exists: ${id}`);
  }
});

console.log(`\n📊 Summary: ${thinkers.length - missing.length}/${thinkers.length} avatars exist`);
if (missing.length > 0) {
  console.log(`Missing: ${missing.join(', ')}\n`);
}
