const fs = require('fs');
const path = require('path');

// Get all thinker IDs from thinkers.ts
const thinkersFile = fs.readFileSync(path.join(__dirname, '../lib/games/timeless-minds/thinkers.ts'), 'utf8');
const idMatches = thinkersFile.match(/id: '([^']+)'/g);
const thinkerIds = idMatches.map(match => match.match(/id: '([^']+)'/)[1]);

const avatarsDir = path.join(__dirname, '../public/games/timeless-minds/avatars');
const existing = fs.readdirSync(avatarsDir)
  .filter(f => f.endsWith('.png'))
  .map(f => f.replace('.png', ''));

console.log('\n📊 Avatar Coverage Report:\n');
console.log(`Total thinkers: ${thinkerIds.length}`);
console.log(`Existing avatars: ${existing.length}`);
console.log(`Missing: ${thinkerIds.length - existing.length}`);

const missing = thinkerIds.filter(id => !existing.includes(id));

if (missing.length > 0) {
  console.log('\n❌ Missing avatars:\n');
  missing.forEach(id => console.log(`  - ${id}`));
} else {
  console.log('\n✅ All avatars present!');
}

console.log('\n✅ Have avatars:\n');
const have = thinkerIds.filter(id => existing.includes(id));
have.forEach(id => console.log(`  - ${id}`));
