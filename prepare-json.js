const fs = require('fs');
const path = require('path');

const wavFolder = path.join(__dirname, 'wav');
console.log(wavFolder)
const outputFile = path.join(wavFolder, 'index.json');

// Helper to recursively scan directories and build the structure
function scanDir(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  // Arrays to store files and directories separately
  const files = [];
  const subdirs = {};

  items.forEach(item => {
    const itemPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      // Recursively scan subdirectories
      subdirs[item.name] = scanDir(itemPath);
    } else if (item.isFile() && /\.(wav|mp3|aac)$/i.test(item.name)) {
      // Collect file names
      files.push(item.name);
    }
  });

  // If this directory contains only files and no subdirectories,
  // return the files array directly
  if (files.length > 0 && Object.keys(subdirs).length === 0) {
    return files;
  }
  
  // If this directory contains subdirectories, add them to the result
  const result = { ...subdirs };
  
  // If this directory also contains files, add them as a "files" property
  // (This maintains backward compatibility for mixed directories)
  if (files.length > 0) {
    result.files = files;
  }
  
  return result;
}

// Build the structure
const indexJson = scanDir(wavFolder);

// Post-process to replace objects with only "files" property with the array directly
function simplifyStructure(obj) {
  if (Array.isArray(obj)) {
    return obj;
  }
  
  if (obj && typeof obj === 'object') {
    // If this object has only one property called "files" which is an array,
    // replace it with the array directly
    const keys = Object.keys(obj);
    if (keys.length === 1 && keys[0] === 'files' && Array.isArray(obj.files)) {
      return obj.files;
    }
    
    // Otherwise, recursively process all properties
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = simplifyStructure(value);
    }
    return result;
  }
  
  return obj;
}

const simplifiedIndexJson = simplifyStructure(indexJson);

// Write to index.json
fs.writeFileSync(outputFile, JSON.stringify(simplifiedIndexJson, null, 2), 'utf8');

console.log('index.json generated successfully.');