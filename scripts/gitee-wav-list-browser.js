/**
 * Browser-compatible version of the Gitee WAV list generator
 */

// Configuration
const CONFIG = {
  owner: "timliu2117",
  repo: "temp",
  branch: "master",
  watchFolder: "uploads/"
};

/**
 * Build a hierarchical tree structure from flat file list
 */
function buildTreeStructure(files) {
  const tree = {};
  
  // Filter files in the watch folder
  const filteredFiles = files.filter(file => 
    file.path.startsWith(CONFIG.watchFolder) && 
    (file.path.endsWith('.mp3') || file.path.endsWith('.wav') || file.path.endsWith('.aac'))
  );
  
  // Process each file
  filteredFiles.forEach(file => {
    // Remove the watch folder prefix and split into parts
    const relativePath = file.path.substring(CONFIG.watchFolder.length);
    const pathParts = relativePath.split('/');
    
    // Navigate/create the tree structure
    let current = tree;
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      
      // If this is the last part, it's a file
      if (i === pathParts.length - 1) {
        // Ensure files array exists
        if (!current.files) {
          current.files = [];
        }
        
        // Add just the file name to the array
        current.files.push(part);
      } else {
        // This is a folder
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
  });
  
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
  
  return simplifyStructure(tree);
}

/**
 * Main function to scan repo and generate list
 */
async function scanAndGenerateList() {
  try {
    console.log('Scanning repository...');
    
    // Get the repository tree
    const treeUrl = `https://gitee.com/api/v5/repos/${CONFIG.owner}/${CONFIG.repo}/git/trees/${CONFIG.branch}?recursive=1`;
    
    const response = await fetch(treeUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const files = data.tree;
    console.log(`Found ${files.length} items in repository`);
    
    // Build the hierarchical structure
    const treeStructure = buildTreeStructure(files);
    console.log('Built tree structure');
    
    // Convert to JSON
    const jsonContent = JSON.stringify(treeStructure, null, 2);
    
    // Log the list to console
    console.log('Generated file list:');
    console.log(jsonContent);
    
    return treeStructure;
  } catch (error) {
    console.error('Error scanning and generating list:', error.message);
    throw error;
  }
}

// Export for use in other modules
window.giteeWavList = {
  scanAndGenerateList,
  buildTreeStructure
};

// Run automatically when loaded
scanAndGenerateList()
  .then(() => console.log('Gitee WAV list generation completed'))
  .catch(error => console.error('Gitee WAV list generation failed:', error));