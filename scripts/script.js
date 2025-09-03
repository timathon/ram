// Player state
let playerState = {
  selectedFiles: [],
  loopCount: 1,
  fileIdx: 0,
  loopIdx: 1,
  isPlaying: false,
  playStartTime: null
}

// Global index data variables (will be set by list.js)
// These are declared in list.js and set through the indexDataLoaded event
// var indexData; // Current index data
// var indexOldData; // Old index data for default speed determination

// Play time tracking
let dailyPlayTime = {
  date: new Date().toDateString(),
  time: 0 // in seconds
};

// Timer for tracking play time while audio is playing
let playTimeTimer = null;
let lastCheckTime = null;

// Playback state for saving/restoring session
let playbackState = {
  textbook: null,
  unit: null,
  section: null,
  selectedFiles: [],
  currentFileIdx: 0,
  currentTime: 0,
  isPlaying: false,
  loopCount: 1
};

// Get the appropriate URL for a file (always local now)
function getFileUrl(textbook, unit, section, file) {
  // Local URL format: wav/{book}/{unit}/{section}/{file}
  return `wav/${textbook}/${unit}/${section}/${file}`;
}

function buildUI() {
  // Populate textbook dropdown
  const textbookSelect = document.getElementById('textbookSelect');
  const unitSelect = document.getElementById('unitSelect');
  const sectionSelect = document.getElementById('sectionSelect');

  // Add event listener for globalLoopCount after element is created
  const globalLoopCountInput = document.getElementById('globalLoopCount');
  if (globalLoopCountInput) {
    globalLoopCountInput.addEventListener('change', function () {
      const newLoopCount = parseInt(this.value) || 1;
      playerState.loopCount = newLoopCount;
      updateLoopCountDisplay();
      savePlaybackState(); // Save state when loop count changes
    });
  }

  // Initial population - get textbooks from local data only
  const allTextbooks = Object.keys(indexData || {});
  
  if (allTextbooks.length === 0) {
    document.getElementById('fileListDiv').innerHTML = '<li>No textbooks found in index data.</li>';
    return;
  }
  populateDropdown(textbookSelect, allTextbooks);
  selectedTextbook = allTextbooks[0];

  textbookSelect.onchange = function () {
    selectedTextbook = this.value;
    updateUnits();
  };
  unitSelect.onchange = function () {
    selectedUnit = this.value;
    updateSections();
  };
  sectionSelect.onchange = function () {
    selectedSection = this.value;
    updateFiles();
  };

  updateUnits();
}

// Confirmation dialog when dropdowns change
function confirmDropdownChange(callback) {
  if (
    playerState.isPlaying ||
    playerState.selectedFiles.length > 0
  ) {
    if (confirm('Changing selection will reset current playback and selected files. Continue?')) {
      callback();
    }
  } else {
    callback();
  }
}

// Patch dropdown change handlers after buildUI
const originalBuildUI = buildUI;
buildUI = function () {
  originalBuildUI();

  const textbookSelect = document.getElementById('textbookSelect');
  const unitSelect = document.getElementById('unitSelect');
  const sectionSelect = document.getElementById('sectionSelect');

  textbookSelect.onchange = function () {
    confirmDropdownChange(() => {
      selectedTextbook = this.value;
      playerState.isPlaying = false;
      playerState.selectedFiles = [];
      document.getElementById('audio').pause();
      document.getElementById('audio').src = '';
      document.getElementById('playBtn').textContent = 'Play Selected';
      stopPlayTimeTracking();
      updateUnits();
      savePlaybackState(); // Save state when textbook changes
    });
  };
  unitSelect.onchange = function () {
    confirmDropdownChange(() => {
      selectedUnit = this.value;
      playerState.isPlaying = false;
      playerState.selectedFiles = [];
      document.getElementById('audio').pause();
      document.getElementById('audio').src = '';
      document.getElementById('playBtn').textContent = 'Play Selected';
      stopPlayTimeTracking();
      updateSections();
      savePlaybackState(); // Save state when unit changes
    });
  };
  sectionSelect.onchange = function () {
    confirmDropdownChange(() => {
      selectedSection = this.value;
      playerState.isPlaying = false;
      playerState.selectedFiles = [];
      document.getElementById('audio').pause();
      document.getElementById('audio').src = '';
      document.getElementById('playBtn').textContent = 'Play Selected';
      stopPlayTimeTracking();
      updateFiles();
      savePlaybackState(); // Save state when section changes
    });
  };
  
  // Load and apply saved playback state after UI is built
  const savedState = loadPlaybackState();
  if (savedState) {
    setTimeout(() => {
      applyPlaybackState(savedState);
    }, 100);
  };
}

function updateLoopCountDisplay() {
  // Remove all existing loop count spans
  document.querySelectorAll('#fileListDiv .loop-count-span').forEach(span => span.remove());

  // If playing, add loop count to the currently playing file
  if (
    playerState.isPlaying &&
    playerState.selectedFiles.length > 0 &&
    playerState.fileIdx < playerState.selectedFiles.length
  ) {
    const currentFile = playerState.selectedFiles[playerState.fileIdx].file;
    const currentLi = document.querySelector(`#fileListDiv li[data-file-name="${currentFile}"]`);

    if (currentLi) {
      const span = document.createElement('span');
      span.className = 'loop-count-span';
      span.style.marginLeft = '10px';
      span.style.color = '#888';
      span.textContent = `(looping ${playerState.loopIdx} of ${playerState.loopCount})`;
      currentLi.appendChild(span);
    }
  }
}

// Call updateLoopCountDisplay whenever playback changes
function highlightPlayingFile(fileName) {
  document.querySelectorAll('#fileListDiv li').forEach(li => {
    if (li.getAttribute('data-file-name') === fileName) {
      li.style.background = '#ffeeba';
      li.style.fontWeight = 'bold';

      // Add refresh button to the currently playing file
      addRefreshButtonToFile(li, fileName);

      // Scroll the file into view if it's not visible
      const fileListDiv = document.getElementById('fileListDiv');
      const fileRect = li.getBoundingClientRect();
      const containerRect = fileListDiv.getBoundingClientRect();

      // Check if the element is outside the viewable area
      if (fileRect.top < containerRect.top || fileRect.bottom > containerRect.bottom) {
        // Scroll to the top of the element with some offset for better visibility
        const container = document.getElementById('fileListDiv');
        const scrollTop = li.offsetTop - container.offsetTop;
        container.scrollTop = scrollTop;
      }
    } else {
      li.style.background = '';
      li.style.fontWeight = '';
      
      // Remove refresh button from non-playing files
      const existingRefreshBtn = li.querySelector('.refresh-file-btn');
      if (existingRefreshBtn) {
        existingRefreshBtn.remove();
      }
    }
  });
  updateLoopCountDisplay();
}

// Function to add refresh button to a file list item
function addRefreshButtonToFile(li, fileName) {
  // Check if refresh button already exists
  if (li.querySelector('.refresh-file-btn')) {
    return;
  }

  // Create refresh button
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'refresh-file-btn';
  refreshBtn.title = 'Refresh this file';
  refreshBtn.textContent = '↻';
  refreshBtn.style.marginLeft = '10px';
  refreshBtn.style.padding = '2px 6px';
  refreshBtn.style.fontSize = '12px';
  refreshBtn.style.cursor = 'pointer';
  refreshBtn.style.border = '1px solid #ccc';
  refreshBtn.style.borderRadius = '4px';
  refreshBtn.style.backgroundColor = '#f5f5f5';
  refreshBtn.style.transition = 'background-color 0.2s';
  
  // Add hover effect
  refreshBtn.addEventListener('mouseenter', function() {
    this.style.backgroundColor = '#e0e0e0';
  });
  refreshBtn.addEventListener('mouseleave', function() {
    this.style.backgroundColor = '#f5f5f5';
  });
  
  // Add click event
  refreshBtn.addEventListener('click', function(e) {
    e.stopPropagation(); // Prevent checkbox from being toggled
    refreshSpecificFile(fileName);
  });
  
  // Add button to list item
  li.appendChild(refreshBtn);
}

// Function to refresh a specific file
async function refreshSpecificFile(fileName) {
  // Check if we're currently playing a file
  if (!playerState.isPlaying || playerState.selectedFiles.length === 0) {
    console.log('No file is currently playing');
    return;
  }

  const files = playerState.selectedFiles;
  const idx = playerState.fileIdx;
  
  if (idx < 0 || idx >= files.length) {
    console.log('Invalid file index');
    return;
  }
  
  // Check if this is the currently playing file
  const currentFile = files[idx];
  if (currentFile.file !== fileName) {
    console.log('This is not the currently playing file');
    return;
  }
  
  const { textbook, unit, section, file } = currentFile;
  const audioUrl = getFileUrl(textbook, unit, section, file);
  const audio = document.getElementById('audio');
  
  // Find the refresh button for this file
  const li = document.querySelector(`#fileListDiv li[data-file-name="${fileName}"]`);
  const refreshBtn = li ? li.querySelector('.refresh-file-btn') : null;
  
  // Show loading indicator on the refresh button
  const originalText = refreshBtn ? refreshBtn.textContent : '↻';
  if (refreshBtn) {
    refreshBtn.textContent = '...';
    refreshBtn.disabled = true;
  }
  
  try {
    // Reset the audio source to force a re-download
    console.log(`Refreshing file: ${file}`);
    audio.src = '';
    audio.src = audioUrl;
    
    // Set playback speed to user's selection
    const speedControl = document.getElementById('speedControl');
    if (speedControl) {
      audio.playbackRate = parseFloat(speedControl.value);
    }
    
    // Always play the audio after refresh
    await audio.play();
    
    // Update cache with the fresh file in the background
    updateCacheAfterRefresh(audioUrl, file);
    
    console.log(`File refreshed and playing: ${file}`);
  } catch (error) {
    console.error('Error refreshing file:', error);
    alert('Failed to refresh the file. Please try again.');
  } finally {
    // Restore button
    if (refreshBtn) {
      refreshBtn.textContent = originalText;
      refreshBtn.disabled = false;
    }
  }
}

// Update selected files immediately when checkboxes change
function updateSelectedFiles() {
  const selectedFiles = [];
  document.querySelectorAll('.file-checkbox:checked').forEach(cb => {
    const file = cb.value;
    selectedFiles.push({
      textbook: document.getElementById('textbookSelect').value,
      unit: document.getElementById('unitSelect').value,
      section: document.getElementById('sectionSelect').value,
      file
    });
  });
  playerState.selectedFiles = selectedFiles;
  updateSelectAllCheckbox();
  savePlaybackState(); // Save state when files are selected
}

// Remove restriction on unchecking last remaining file
document.addEventListener('change', function (e) {
  if (e.target.classList.contains('file-checkbox')) {
    updateSelectedFiles();
  }
  if (e.target.id === 'selectAllFiles') {
    const checked = e.target.checked;
    document.querySelectorAll('.file-checkbox').forEach(cb => {
      cb.checked = checked;
    });
    updateSelectedFiles();
  }
});

// Update "select all" checkbox state
function updateSelectAllCheckbox() {
  const allCheckboxes = document.querySelectorAll('.file-checkbox');
  const checkedCheckboxes = document.querySelectorAll('.file-checkbox:checked');
  const selectAll = document.getElementById('selectAllFiles');

  // Update file counter for all file-box-title elements
  const fileBoxTitles = document.querySelectorAll('.file-box-title');
  fileBoxTitles.forEach(title => {
    title.textContent = `Files: ${checkedCheckboxes.length} of ${allCheckboxes.length} selected`;
  });

  if (!selectAll) return;
  if (checkedCheckboxes.length === 0) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
  } else if (checkedCheckboxes.length === allCheckboxes.length) {
    selectAll.checked = true;
    selectAll.indeterminate = false;
  } else {
    selectAll.checked = false;
    selectAll.indeterminate = true;
  }
}

let selectedTextbook = '';
let selectedUnit = '';
let selectedSection = '';

// Add Next and Previous buttons to controls
window.addEventListener('DOMContentLoaded', () => {
  const controlsDiv = document.querySelector('.controls');
  const prevBtn = document.createElement('button');
  prevBtn.id = 'prevBtn';
  prevBtn.textContent = '<<';
  controlsDiv.appendChild(prevBtn);

  const nextBtn = document.createElement('button');
  nextBtn.id = 'nextBtn';
  nextBtn.textContent = '>>';
  controlsDiv.appendChild(nextBtn);

  // Initialize daily play time tracking
  loadDailyPlayTime();
});

// Helper to populate dropdowns
function populateDropdown(select, options) {
  select.innerHTML = '';
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    select.appendChild(option);
  });
}

// Update units dropdown
function updateUnits() {
  const textbookSelect = document.getElementById('textbookSelect');
  const unitSelect = document.getElementById('unitSelect');
  const sectionSelect = document.getElementById('sectionSelect');
  const fileListDiv = document.getElementById('fileListDiv');
  
  // Get units from local data only
  const allUnits = Object.keys((indexData || {})[selectedTextbook] || {});
  
  populateDropdown(unitSelect, allUnits);
  selectedUnit = allUnits[0] || '';
  updateSections();
}

// Update sections dropdown
function updateSections() {
  const textbookSelect = document.getElementById('textbookSelect');
  const unitSelect = document.getElementById('unitSelect');
  const sectionSelect = document.getElementById('sectionSelect');
  const fileListDiv = document.getElementById('fileListDiv');
  
  // Get sections from local data only
  const allSections = Object.keys(((indexData || {})[selectedTextbook] || {})[selectedUnit] || {});
  
  populateDropdown(sectionSelect, allSections);
  selectedSection = allSections[0] || '';
  updateFiles();
}

// Update files list
// Helper function to remove file extension
function removeFileExtension(filename) {
  return filename.replace(/\.[^/.]+$/, "");
}

// Helper function to check if a file is in the old index
function isFileInOldIndex(textbook, unit, section, fileName) {
  try {
    const sectionData = ((indexOldData || {})[textbook] || {})[unit] || {};
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

function updateFiles() {
  const textbookSelect = document.getElementById('textbookSelect');
  const unitSelect = document.getElementById('unitSelect');
  const sectionSelect = document.getElementById('sectionSelect');
  const fileListDiv = document.getElementById('fileListDiv');
  
  // Get files from local data only
  let files = ((indexData || {})[selectedTextbook] || {})[selectedUnit] || {};
  files = files[selectedSection] || [];
  
  // If files is an object (not array), extract the array
  if (!Array.isArray(files) && files.files) {
    files = files.files;
  }
  
  // Ensure it's an array
  if (!Array.isArray(files)) files = [];
  
  fileListDiv.innerHTML = '';
  if (files.length === 0) {
    fileListDiv.innerHTML = '<li>No files found for this section.</li>';
    updateSelectAllCheckbox();
    return;
  }
  
  files.forEach((fileName, idx) => {
    const li = document.createElement('li');
    li.setAttribute('data-file-name', fileName); // For highlight
    const displayName = removeFileExtension(fileName);
    // All files are local now
    const fileColor = '#000000'; // Black for local files
    li.innerHTML = `
          <label>
            <input type="checkbox" class="file-checkbox" value="${fileName}" checked>
            <span style="color: ${fileColor};">${displayName}</span>
          </label>
        `;
    fileListDiv.appendChild(li);
  });
  updateSelectAllCheckbox();
}

// Save playback state to localStorage
function savePlaybackState() {
  try {
    // Get current audio position
    const audio = document.getElementById('audio');
    const currentTime = audio ? audio.currentTime : 0;
    
    // Create playback state object
    const state = {
      textbook: selectedTextbook,
      unit: selectedUnit,
      section: selectedSection,
      selectedFiles: playerState.selectedFiles,
      currentFileIdx: playerState.fileIdx,
      currentTime: currentTime,
      isPlaying: playerState.isPlaying,
      loopCount: playerState.loopCount,
      date: new Date().toDateString() // For expiration check
    };
    
    // Save to localStorage
    localStorage.setItem('playbackState', JSON.stringify(state));
  } catch (e) {
    console.error('Error saving playback state:', e);
  }
}

// Load playback state from localStorage
function loadPlaybackState() {
  try {
    const saved = localStorage.getItem('playbackState');
    if (saved) {
      const state = JSON.parse(saved);
      
      // Check if it's from today
      if (state.date === new Date().toDateString()) {
        playbackState = state;
        return state;
      } else {
        // Clear expired state
        localStorage.removeItem('playbackState');
      }
    }
  } catch (e) {
    console.error('Error loading playback state:', e);
  }
  return null;
}

// Apply saved playback state to UI
async function applyPlaybackState(state) {
  if (!state) return;
  
  try {
    // Set dropdown values
    const textbookSelect = document.getElementById('textbookSelect');
    const unitSelect = document.getElementById('unitSelect');
    const sectionSelect = document.getElementById('sectionSelect');
    const globalLoopCount = document.getElementById('globalLoopCount');
    
    // Set textbook
    if (textbookSelect && Array.from(textbookSelect.options).some(option => option.value === state.textbook)) {
      textbookSelect.value = state.textbook;
      selectedTextbook = state.textbook;
      updateUnits();
      
      // Wait a bit for units to populate
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Set unit
      if (unitSelect && Array.from(unitSelect.options).some(option => option.value === state.unit)) {
        unitSelect.value = state.unit;
        selectedUnit = state.unit;
        updateSections();
        
        // Wait a bit for sections to populate
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Set section
        if (sectionSelect && Array.from(sectionSelect.options).some(option => option.value === state.section)) {
          sectionSelect.value = state.section;
          selectedSection = state.section;
          updateFiles();
          
          // Wait a bit for files to populate
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Restore selected files
          if (state.selectedFiles && state.selectedFiles.length > 0) {
            // Update checkboxes
            document.querySelectorAll('.file-checkbox').forEach(checkbox => {
              const fileName = checkbox.value;
              const shouldBeChecked = state.selectedFiles.some(fileObj => fileObj.file === fileName);
              checkbox.checked = shouldBeChecked;
            });
            
            // Update player state
            playerState.selectedFiles = state.selectedFiles;
            playerState.fileIdx = state.currentFileIdx || 0;
            playerState.loopCount = state.loopCount || 1;
            playerState.isPlaying = state.isPlaying || false;
            
            // Update select all checkbox
            updateSelectAllCheckbox();
            
            // Set loop count
            if (globalLoopCount) {
              globalLoopCount.value = playerState.loopCount;
            }
            
            // If was playing, restore playback
            if (state.isPlaying) {
              // Wait for UI to update
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Set the audio source and time
              const audio = document.getElementById('audio');
              if (audio && playerState.selectedFiles[playerState.fileIdx]) {
                const fileObj = playerState.selectedFiles[playerState.fileIdx];
                const audioUrl = getFileUrl(
                  fileObj.textbook, 
                  fileObj.unit, 
                  fileObj.section, 
                  fileObj.file
                );
                
                // Set the audio source
                audio.src = audioUrl;
                audio.currentTime = state.currentTime || 0;
                
                // Update UI
                document.getElementById('playBtn').textContent = 'Stop';
                highlightPlayingFile(fileObj.file);
                
                // Start playback
                // audio.play(); // Don't auto-play, let user click play
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Error applying playback state:', e);
  }
}

// Load daily play time from localStorage
function loadDailyPlayTime() {
  try {
    const saved = localStorage.getItem('dailyPlayTime');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Reset if it's a new day
      if (parsed.date !== new Date().toDateString()) {
        dailyPlayTime = {
          date: new Date().toDateString(),
          time: 0
        };
      } else {
        dailyPlayTime = parsed;
      }
    } else {
      // Initialize if no saved data
      dailyPlayTime = {
        date: new Date().toDateString(),
        time: 0
      };
    }
  } catch (e) {
    console.error('Error loading daily play time:', e);
    // Initialize on error
    dailyPlayTime = {
      date: new Date().toDateString(),
      time: 0
    };
  }
  updatePlayTimeDisplay();
}

// Save daily play time to localStorage
function saveDailyPlayTime() {
  try {
    localStorage.setItem('dailyPlayTime', JSON.stringify(dailyPlayTime));
  } catch (e) {
    console.error('Error saving daily play time:', e);
  }
}

// Update the play time display
function updatePlayTimeDisplay() {
  const hours = Math.floor(dailyPlayTime.time / 3600);
  const minutes = Math.floor((dailyPlayTime.time % 3600) / 60);
  const seconds = Math.floor(dailyPlayTime.time % 60);

  // Pad single digit seconds with a 0
  const paddedSeconds = seconds < 10 ? `0${seconds}` : seconds;
  const paddedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const paddedHours = hours < 10 ? `0${hours}` : hours;

  let timeString = '';
  if (hours > 0) {
    timeString = `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
  } else {
    timeString = `${paddedMinutes}:${paddedSeconds}`;
  }

  // Create a container for play time and speed control to keep them together
  let infoContainer = document.getElementById('infoContainer');
  if (!infoContainer) {
    const controlsDiv = document.querySelector('.controls');
    infoContainer = document.createElement('div');
    infoContainer.id = 'infoContainer';
    infoContainer.style.display = 'flex';
    infoContainer.style.alignItems = 'center';
    infoContainer.style.flexWrap = 'wrap';
    infoContainer.style.gap = '15px';
    infoContainer.style.marginLeft = '15px';
    controlsDiv.appendChild(infoContainer);
  }

  // Update display in controls area
  let playTimeDisplay = document.getElementById('playTimeDisplay');
  if (!playTimeDisplay) {
    playTimeDisplay = document.createElement('div');
    playTimeDisplay.id = 'playTimeDisplay';
    playTimeDisplay.style.padding = '10px';
    playTimeDisplay.style.backgroundColor = '#f0f0f0';
    playTimeDisplay.style.borderRadius = '4px';
    playTimeDisplay.style.fontWeight = 'bold';
    infoContainer.appendChild(playTimeDisplay);
  }
  playTimeDisplay.textContent = `Today: ${timeString}`;

  // Add playback speed control after play time display
  let speedControl = document.getElementById('speedControl');
  if (!speedControl) {
    speedControl = document.createElement('select');
    speedControl.id = 'speedControl';
    speedControl.style.padding = '8px';
    speedControl.style.borderRadius = '4px';
    speedControl.style.border = '1px solid #ccc';
    speedControl.style.fontSize = '14px';
    speedControl.style.backgroundColor = 'white';

    // Add speed options
    const speedOptions = [
      { value: '0.5', text: '0.5x' },
      { value: '0.75', text: '0.75x' },
      { value: '1', text: '1x' },
      { value: '1.25', text: '1.25x' },
      { value: '1.5', text: '1.5x' }
    ];

    speedOptions.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.text;
      speedControl.appendChild(opt);
    });

    // Set default value to 1x
    speedControl.value = '1';

    infoContainer.appendChild(speedControl);

    // Add event listener to update playback speed
    speedControl.addEventListener('change', function() {
      const audio = document.getElementById('audio');
      audio.playbackRate = parseFloat(this.value);
    });
  }
}

// Start tracking play time while audio is playing
function startPlayTimeTracking() {
  // Clear any existing timer
  if (playTimeTimer) {
    clearInterval(playTimeTimer);
  }
  
  // Start a timer that updates play time every second while audio is playing
  playTimeTimer = setInterval(() => {
    // Only accumulate time if audio is actually playing
    const audio = document.getElementById('audio');
    if (audio && !audio.paused && !audio.ended) {
      dailyPlayTime.time += 1; // Add 1 second
      saveDailyPlayTime();
      updatePlayTimeDisplay();
    }
  }, 1000); // Update every second
}

// Stop tracking play time
function stopPlayTimeTracking() {
  // Clear the timer
  if (playTimeTimer) {
    clearInterval(playTimeTimer);
    playTimeTimer = null;
  }
  lastCheckTime = null;
  
  // Save the final time
  saveDailyPlayTime();
  updatePlayTimeDisplay();
}

// Play selected files with global loop count
async function startPlayback() {
  const selectedFiles = [];
  document.querySelectorAll('.file-checkbox:checked').forEach(cb => {
    const file = cb.value;
    selectedFiles.push({
      textbook: document.getElementById('textbookSelect').value,
      unit: document.getElementById('unitSelect').value,
      section: document.getElementById('sectionSelect').value,
      file
    });
  });

  const loopCount = parseInt(document.getElementById('globalLoopCount').value) || 1;

  if (selectedFiles.length === 0) {
    alert('No files selected.');
    return;
  }
  // Update loop count during playback if globalLoopCount changes
  // Moved to buildUI after element creation
  playerState.selectedFiles = selectedFiles;
  playerState.loopCount = loopCount;
  playerState.fileIdx = 0;
  playerState.loopIdx = 1;
  playerState.isPlaying = true;

  // Set default playback speed based on file origin
  // Default to 0.75x for all files
  // Except when playing only files from index-old.json, then use 1x
  const speedControl = document.getElementById('speedControl');
  if (speedControl) {
    // Check if all selected files are in the old index (and there's at least one file)
    const allOldFiles = selectedFiles.length > 0 && selectedFiles.every(fileObj => 
      isFileInOldIndex(fileObj.textbook, fileObj.unit, fileObj.section, fileObj.file)
    );
    
    // Set default speed: 1x only if ALL files are in old index (pure old content),
    // otherwise 0.75x (default for mixed or new content)
    const defaultSpeed = allOldFiles ? 1 : 0.75;
    speedControl.value = defaultSpeed;
  }

  // Start tracking play time
  // Note: Actual time tracking starts when audio.onplay is triggered
  loadDailyPlayTime(); // Ensure we have the latest time data

  // Preload the second file if it exists
  if (selectedFiles.length > 1) {
    preloadAudio(selectedFiles[1]);
  }

  playCurrent();
}

// Preload audio file
// Preload audio file (lightweight version for better streaming)
async function preloadAudio(fileObj) {
  if (!fileObj) return;

  const { textbook, unit, section, file } = fileObj;
  const audioUrl = getFileUrl(textbook, unit, section, file);
  
  // Check if file is in cache first
  try {
    const isCached = await window.audioCache.isAudioInCache(audioUrl);
    if (isCached) {
      console.log(`File already cached: ${file}`);
      return;
    }
  } catch (error) {
    console.error('Error checking cache status:', error);
  }
  
  // For preloading, we just check if the file exists without downloading it completely
  // This is more efficient for streaming scenarios
  try {
    const response = await fetch(audioUrl, { method: 'HEAD' });
    if (response.ok) {
      console.log(`File available for streaming: ${file}`);
      // Optionally, we can start a background fetch to cache the file
      // but we don't block the UI or playback for it
      preloadAndCacheInBackground(audioUrl, file);
    }
  } catch (error) {
    console.log(`File not available for streaming: ${file}`, error);
  }
}

// Background caching without blocking playback
async function preloadAndCacheInBackground(audioUrl, fileName) {
  // Add a delay before caching to prioritize current playback
  setTimeout(async () => {
    try {
      const response = await fetch(audioUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        await window.audioCache.saveAudioToCache(audioUrl, arrayBuffer);
        console.log(`Preloaded and cached in background: ${fileName}`);
      }
    } catch (error) {
      console.log(`Failed to preload in background: ${fileName}`, error);
    }
  }, 5000); // 5 second delay to prioritize current playback
}

async function playCurrent() {
  const audio = document.getElementById('audio');
  const files = playerState.selectedFiles;
  const idx = playerState.fileIdx;
  if (idx < 0 || idx >= files.length) {
    playerState.isPlaying = false;
    highlightPlayingFile(null);
    stopPlayTimeTracking(); // Stop tracking when playback finishes
    savePlaybackState(); // Save state when playback finishes
    return;
  }
  const { textbook, unit, section, file } = files[idx];
  const audioUrl = getFileUrl(textbook, unit, section, file);
  
  // Set the audio source directly for streaming playback
  // This allows the browser to stream the file without waiting for complete download
  console.log(`Playing from network (streaming): ${file}`);
  audio.src = audioUrl;
  
  // Set playback speed to user's selection
  const speedControl = document.getElementById('speedControl');
  if (speedControl) {
    audio.playbackRate = parseFloat(speedControl.value);
  }
  
  audio.play();
  playerState.loopIdx = 1;
  highlightPlayingFile(file);
  savePlaybackState(); // Save state when starting to play a new file

  // Preload the next file if it exists
  if (idx + 1 < files.length) {
    preloadAudio(files[idx + 1]);
  }

  audio.onended = function () {
    if (!playerState.isPlaying) return;
    if (playerState.loopIdx < playerState.loopCount) {
      playerState.loopIdx++;
      updateLoopCountDisplay();
      audio.currentTime = 0;
      // Set playback speed for looped playback
      const speedControl = document.getElementById('speedControl');
      if (speedControl) {
        // For looping, maintain the current speed setting
        audio.playbackRate = parseFloat(speedControl.value);
      }
      audio.play();
      savePlaybackState(); // Save state when looping
    } else {
      playerState.fileIdx++;
      playCurrent();
    }
  };

  // Start tracking play time when audio starts playing
  audio.onplay = async function() {
    startPlayTimeTracking();
    savePlaybackState(); // Save state when audio starts playing
    
    // Save to cache after playing (non-blocking)
    cacheAudioAfterPlayback(audioUrl, file);
  };
  
  // Save state when audio is paused
  audio.onpause = function () {
    savePlaybackState(); // Save state when audio is paused
    if (!playerState.isPlaying) {
      stopPlayTimeTracking();
    }
  };
  
  // Save state periodically while audio is playing (every 5 seconds)
  audio.ontimeupdate = function() {
    // Save state every 5 seconds to capture current time
    if (Math.floor(audio.currentTime) % 5 === 0) {
      savePlaybackState();
    }
  };
}

// Non-blocking cache function that runs after playback starts
async function cacheAudioAfterPlayback(audioUrl, fileName) {
  try {
    const isCached = await window.audioCache.isAudioInCache(audioUrl);
    if (!isCached) {
      // Fetch and cache the file in the background (non-blocking)
      // We use a small delay to ensure playback has started
      setTimeout(async () => {
        try {
          const response = await fetch(audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          await window.audioCache.saveAudioToCache(audioUrl, arrayBuffer);
          console.log(`Saved to cache: ${fileName}`);
        } catch (error) {
          console.error('Error caching file:', error);
        }
      }, 1000); // 1 second delay to ensure playback has started
    }
  } catch (error) {
    console.error('Error checking cache status:', error);
  }
}

// Function to refresh the currently playing file
// Function to update cache after refreshing a file
async function updateCacheAfterRefresh(audioUrl, fileName) {
  try {
    // Fetch and cache the file in the background (non-blocking)
    setTimeout(async () => {
      try {
        const response = await fetch(audioUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          await window.audioCache.saveAudioToCache(audioUrl, arrayBuffer);
          console.log(`Cache updated with fresh file: ${fileName}`);
        }
      } catch (error) {
        console.error('Error updating cache after refresh:', error);
      }
    }, 1000); // 1 second delay to ensure playback has started
  } catch (error) {
    console.error('Error initiating cache update:', error);
  }
}

document.getElementById('playBtn').onclick = async function () {
  const playBtn = document.getElementById('playBtn');
  if (playerState.isPlaying) {
    // Stop playback
    const audio = document.getElementById('audio');
    audio.pause();
    playerState.isPlaying = false;
    playBtn.textContent = 'Play Selected';
    stopPlayTimeTracking();
    highlightPlayingFile(null);
    savePlaybackState(); // Save state when playback stops
  } else {
    // Start playback
    await startPlayback();
    playBtn.textContent = 'Stop';
    savePlaybackState(); // Save state when playback starts
  }
};

// Next and Previous button handlers
window.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('audio');
  document.getElementById('nextBtn').onclick = function () {
    if (!playerState.selectedFiles.length) return;
    playerState.fileIdx++;
    if (playerState.fileIdx >= playerState.selectedFiles.length) {
      playerState.fileIdx = playerState.selectedFiles.length - 1;
    }
    playerState.loopIdx = 1;
    playCurrent();
  };
  document.getElementById('prevBtn').onclick = function () {
    if (!playerState.selectedFiles.length) return;
    playerState.fileIdx--;
    if (playerState.fileIdx < 0) playerState.fileIdx = 0;
    playerState.loopIdx = 1;
    playCurrent();
  };
});

// Listen for index data loaded event
window.addEventListener('indexDataLoaded', function(event) {
  // Set the global indexData variables
  indexData = event.detail.current || event.detail;
  indexOldData = event.detail.old || {};
  // Build the UI with the loaded data
  buildUI();
});

// Function to reload JSON data
async function reloadJsonData() {
  // Show loading indicator
  const refreshBtn = document.getElementById('refreshBtn');
  const originalText = refreshBtn.textContent;
  refreshBtn.textContent = '...';
  refreshBtn.disabled = true;
  
  try {
    // Reload local index.json with cache busting
    const response = await fetch(`wav/index.json?t=${Date.now()}`);
    const localIndexData = await response.json();
    
    // Update global indexData variable
    indexData = localIndexData;
    
    // Rebuild the UI with the new data
    buildUI();
    
    console.log('JSON data reloaded successfully');
  } catch (error) {
    console.error('Error reloading JSON data:', error);
    alert('Failed to reload file lists. Please try again.');
  } finally {
    // Restore button
    refreshBtn.textContent = originalText;
    refreshBtn.disabled = false;
  }
}

// Add event listener for refresh button
window.addEventListener('DOMContentLoaded', function() {
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', reloadJsonData);
  }
  
  
});

// Save playback state when page is about to be unloaded
window.addEventListener('beforeunload', function() {
  savePlaybackState();
});