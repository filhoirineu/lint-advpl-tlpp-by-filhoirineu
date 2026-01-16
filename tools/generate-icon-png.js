const path = require('path');
const sharp = require('sharp');

const inPath = path.join(__dirname, '..', 'media', 'icon.svg');
const outPath = path.join(__dirname, '..', 'media', 'market-icon.png');

console.log('Reading', inPath);
sharp(inPath)
  .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ quality: 100 })
  .toFile(outPath)
  .then(info => {
    console.log('Wrote', outPath);
    console.log(info);
  })
  .catch(err => {
    console.error('Error generating PNG:', err);
    process.exit(1);
  });
