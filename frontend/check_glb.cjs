const fs = require('fs');
['cubesat.glb', 'cubesat-1RU.glb', 'mars.glb'].forEach(file => {
  try {
    const buffer = fs.readFileSync('public/models/' + file);
    const chunk0Length = buffer.readUInt32LE(12);
    const jsonBuffer = buffer.slice(20, 20 + chunk0Length);
    const json = JSON.parse(jsonBuffer.toString('utf8'));
    console.log(`${file}: ${json.images ? json.images.length : 0} images`);
  } catch (e) {
    console.log(`${file}: error`);
  }
});
