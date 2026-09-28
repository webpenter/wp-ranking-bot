const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// 1x1 blue PNG
const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWMrwHwAEsgGuXmF+eAAAAABJRU5ErkJggg==',
  'base64'
);

fs.writeFileSync(path.join(dir, 'icon16.png'), pngBuffer);
fs.writeFileSync(path.join(dir, 'icon48.png'), pngBuffer);
fs.writeFileSync(path.join(dir, 'icon128.png'), pngBuffer);
console.log('Icons created.');
