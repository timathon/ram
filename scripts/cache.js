// IndexedDB setup for caching audio files
const DB_NAME = 'AudioCache';
const DB_VERSION = 2; // Updated version to handle the new structure
const STORE_NAME = 'audioFiles';

let db;

// Helper function to determine MIME type based on file extension
function getMimeTypeFromExtension(fileName) {
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

// Open IndexedDB connection
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('lastModified', 'lastModified', { unique: false });
      } else if (event.oldVersion < 2) {
        // Upgrade from version 1 to 2
        const store = event.target.transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains('lastModified')) {
          store.createIndex('lastModified', 'lastModified', { unique: false });
        }
      }
    };
  });
}

// Save audio file to cache with last modified timestamp and MIME type
async function saveAudioToCache(url, arrayBuffer, lastModified = Date.now()) {
  if (!db) await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Extract filename from URL for MIME type detection
    const fileName = url.split('/').pop();
    const mimeType = getMimeTypeFromExtension(fileName);
    
    const data = {
      url: url,
      data: arrayBuffer,
      timestamp: Date.now(),
      lastModified: lastModified,
      mimeType: mimeType // Store MIME type for proper playback
    };
    
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Retrieve audio file from cache
async function getAudioFromCache(url) {
  if (!db) await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.get(url);
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Check if audio file exists in cache
async function isAudioInCache(url) {
  if (!db) await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.count(url);
    request.onsuccess = () => resolve(request.result > 0);
    request.onerror = () => reject(request.error);
  });
}

// Get cached file info including lastModified timestamp
async function getCachedFileInfo(url) {
  if (!db) await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.get(url);
    request.onsuccess = () => {
      if (request.result) {
        resolve({
          lastModified: request.result.lastModified,
          timestamp: request.result.timestamp,
          mimeType: request.result.mimeType
        });
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Check if cached file is outdated by comparing with server
async function isCachedFileOutdated(url) {
  try {
    // Get cached file info
    const cachedInfo = await getCachedFileInfo(url);
    if (!cachedInfo) return true; // Not in cache, so it's "outdated"
    
    // Fetch file headers only to check last modified time
    const headResponse = await fetch(url, { method: 'HEAD' });
    const serverLastModified = headResponse.headers.get('Last-Modified');
    
    if (!serverLastModified) return true; // Can't determine server time, assume outdated
    
    const serverTime = new Date(serverLastModified).getTime();
    const cachedTime = cachedInfo.lastModified;
    
    // File is outdated if server version is newer
    return serverTime > cachedTime;
  } catch (error) {
    console.error('Error checking if file is outdated:', error);
    return true; // Assume outdated if we can't check
  }
}

// Initialize the database when the module loads
openDB().catch(console.error);

// Export functions
window.audioCache = {
  saveAudioToCache,
  getAudioFromCache,
  isAudioInCache,
  getCachedFileInfo,
  isCachedFileOutdated
};