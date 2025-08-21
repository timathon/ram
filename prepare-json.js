const fs = require('fs');
const path = require('path');

const wavFolder = path.join(__dirname, 'wav');
console.log(wavFolder)
const outputFile = path.join(wavFolder, 'index.json');

// Helper to recursively scan directories and build the structure
function scanDir(dir, relPath = '') {
  const result = {};
  const items = fs.readdirSync(dir, { withFileTypes: true });

  items.forEach(item => {
    const itemPath = path.join(dir, item.name);
    const itemRelPath = path.join(relPath, item.name);

    if (item.isDirectory()) {
      // Recursively scan subdirectories
      result[item.name] = scanDir(itemPath, itemRelPath);
    } else if (item.isFile() && /\.(wav|mp3)$/i.test(item.name)) {
      // Add file info
      if (!result.files) result.files = [];
      result.files.push({
        name: item.name,
        path: itemRelPath.replace(/\\/g, '/')
      });
    }
  });

  // Remove empty 'files' arrays
  if (result.files && result.files.length === 0) {
    delete result.files;
  }

  return result;
}

// Build the structure
const indexJson = scanDir(wavFolder);

// Write to index.json
fs.writeFileSync(outputFile, JSON.stringify(indexJson, null, 2), 'utf8');

console.log('index.json generated successfully.');