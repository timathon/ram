// Utility functions for the Pitter-Patter Player

// Get the appropriate URL for a file
function getFileUrl(textbook, unit, section, file, type = 'local') {
  // Local URL format: wav/{book}/{unit}/{section}/{file}
  const localUrl = `wav/${textbook}/${unit}/${section}/${file}`;
  
  // Gitee URL format: https://gitee.com/timliu2117/ram/raw/master/wav/{book}/{unit}/{section}/{file}
  const giteeRawUrl = `https://gitee.com/timliu2117/ram/raw/master/wav/${textbook}/${unit}/${section}/${file}`;
  
  // Gitee API URL format: https://gitee.com/api/v5/repos/timliu2117/ram/contents/wav/{book}/{unit}/{section}/{file}
  const giteeApiUrl = `https://gitee.com/api/v5/repos/timliu2117/ram/contents/wav/${textbook}/${unit}/${section}/${file}`;
  
  // Return appropriate URL based on type
  switch (type) {
    case 'gitee-raw':
      return giteeRawUrl;
    case 'gitee-api':
      return giteeApiUrl;
    case 'local':
    default:
      return localUrl;
  }
}

// Function to fetch file from Gitee API and return as Blob
async function fetchFromGiteeApi(textbook, unit, section, file) {
  try {
    const giteeApiUrl = getFileUrl(textbook, unit, section, file, 'gitee-api');
    console.log(`Fetching from Gitee API: ${file}`);
    
    const response = await fetch(giteeApiUrl);
    if (!response.ok) {
      throw new Error(`Gitee API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if response contains content
    if (!data || !data.content) {
      throw new Error('Invalid response from Gitee API');
    }
    
    // Decode base64 content
    const byteString = atob(data.content);
    const mimeType = data.encoding === 'base64' ? getMimeTypeFromFileName(file) : 'audio/mpeg';
    
    // Convert to ArrayBuffer
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    
    // Create Blob
    const blob = new Blob([arrayBuffer], { type: mimeType });
    return blob;
  } catch (error) {
    console.error('Error fetching from Gitee API:', error);
    throw error;
  }
}

// Helper function to determine MIME type from file extension
function getMimeTypeFromFileName(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    'mp3': 'audio/mpeg',
    'aac': 'audio/aac',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4'
  };
  return mimeTypes[ext] || 'audio/mpeg'; // default to mp3
}

// Helper function to remove file extension
function removeFileExtension(filename) {
  return filename.replace(/\.[^/.]+$/, "");
}

// Helper function to check if a file is in the old index
function isFileInOldIndex(textbook, unit, section, fileName) {
  try {
    const sectionData = ((window.indexOldData || {})[textbook] || {})[unit] || {};
    const files = sectionData[section] || [];
    
    // If files is an object (not array), extract the array
    const fileArray = Array.isArray(files) ? files : (files.files || []);
    
    // Check if the file exists in the array
    return fileArray.includes(fileName);
  } catch (e) {
    console.error('Error checking if file is in old index:', e);
    return false;
  }
}

// Export functions for use in other modules
window.utils = {
  getFileUrl,
  fetchFromGiteeApi,
  getMimeTypeFromFileName,
  removeFileExtension,
  isFileInOldIndex
};