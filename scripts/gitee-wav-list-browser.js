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
 * Load cached Gitee data if available and not expired
 */
function loadCachedGiteeData() {
  try {
    const cached = localStorage.getItem('giteeWavListCache');
    if (cached) {
      const data = JSON.parse(cached);
      const now = Date.now();
      // Cache expires after 6 hours (21600000 ms) to reduce API calls
      if (now - data.timestamp < 21600000) {
        console.log('Using cached Gitee file list');
        return data.treeStructure;
      } else {
        console.log('Cached Gitee file list expired');
        // Remove expired cache
        localStorage.removeItem('giteeWavListCache');
      }
    }
  } catch (e) {
    console.error('Error loading cached Gitee data:', e);
  }
  return null;
}

/**
 * Save Gitee data to cache
 */
function saveGiteeDataToCache(treeStructure) {
  try {
    const data = {
      treeStructure: treeStructure,
      timestamp: Date.now()
    };
    localStorage.setItem('giteeWavListCache', JSON.stringify(data));
  } catch (e) {
    console.error('Error saving Gitee data to cache:', e);
  }
}

/**
 * Check if we should skip Gitee API call (rate limiting protection)
 */
function shouldSkipGiteeApi() {
  try {
    const skipData = localStorage.getItem('giteeApiSkip');
    if (skipData) {
      const data = JSON.parse(skipData);
      const now = Date.now();
      // Skip API calls for 15 minutes after a rate limit error
      if (now - data.timestamp < 900000) {
        console.log('Skipping Gitee API call due to recent rate limit error');
        return true;
      } else {
        // Clear skip flag
        localStorage.removeItem('giteeApiSkip');
      }
    }
  } catch (e) {
    console.error('Error checking Gitee API skip flag:', e);
  }
  return false;
}

/**
 * Set skip flag after rate limit error
 */
function setSkipGiteeApi() {
  try {
    const data = {
      timestamp: Date.now()
    };
    localStorage.setItem('giteeApiSkip', JSON.stringify(data));
  } catch (e) {
    console.error('Error setting Gitee API skip flag:', e);
  }
}

/**
 * Load fallback Gitee data from local file
 */
async function loadFallbackGiteeData() {
  try {
    console.log('Loading fallback Gitee data from local file');
    // Add cache-busting parameter to prevent browser caching
    const timestamp = Date.now();
    const response = await fetch(`wav/gitee-wav-list.json?t=${timestamp}`);
    if (!response.ok) {
      throw new Error(`Failed to load fallback Gitee data: ${response.status}`);
    }
    const data = await response.json();
    console.log('Loaded fallback Gitee data successfully');
    return data;
  } catch (error) {
    console.error('Error loading fallback Gitee data:', error.message);
    return {};
  }
}

/**
 * Main function to scan repo and generate list with comprehensive rate limiting protection and fallback
 */
async function scanAndGenerateList() {
  // First, try to load from cache
  const cachedData = loadCachedGiteeData();
  if (cachedData) {
    return cachedData;
  }
  
  // Check if we should skip API call due to rate limiting
  if (shouldSkipGiteeApi()) {
    console.log('Skipping Gitee API call to avoid rate limiting, using fallback data');
    return await loadFallbackGiteeData();
  }
  
  try {
    console.log('Scanning repository...');
    
    // Get the repository tree
    const treeUrl = `https://gitee.com/api/v5/repos/${CONFIG.owner}/${CONFIG.repo}/git/trees/${CONFIG.branch}?recursive=1`;
    
    const response = await fetch(treeUrl);
    
    // Check if we hit rate limit
    if (response.status === 403) {
      console.error('Gitee API rate limit exceeded. Using fallback data.');
      setSkipGiteeApi();
      return await loadFallbackGiteeData();
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const files = data.tree;
    console.log(`Found ${files.length} items in repository`);
    
    // Build the hierarchical structure
    const treeStructure = buildTreeStructure(files);
    console.log('Built tree structure');
    
    // Cache the result
    saveGiteeDataToCache(treeStructure);
    
    // Convert to JSON
    const jsonContent = JSON.stringify(treeStructure, null, 2);
    
    // Log the list to console
    console.log('Generated file list:');
    console.log(jsonContent);
    
    return treeStructure;
  } catch (error) {
    console.error('Error scanning and generating list:', error.message);
    // Fallback to local Gitee data file
    console.log('Falling back to local Gitee data file');
    return await loadFallbackGiteeData();
  }
}

// Export for use in other modules
window.giteeWavList = {
  scanAndGenerateList,
  buildTreeStructure
};

// Run automatically when loaded (but with error handling)
scanAndGenerateList()
  .then(() => console.log('Gitee WAV list generation completed'))
  .catch(error => {
    console.error('Gitee WAV list generation failed:', error);
    // Don't throw the error to prevent breaking the application
    // The list.js file will handle this gracefully
  });