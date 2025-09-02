// Player state
let playerState = {
  selectedFiles: [],
  loopCount: 1,
  fileIdx: 0,
  loopIdx: 1,
  isPlaying: false,
  playStartTime: null
}

// Global index data variable
let indexData = {};

// Play time tracking
let dailyPlayTime = {
  date: new Date().toDateString(),
  time: 0 // in seconds
};

// Track which files are from Gitee vs local
let fileSources = {};

// Get the appropriate URL for a file based on its source
function getFileUrl(textbook, unit, section, file, source) {
  if (source === 'gitee') {
    // Gitee URL format: https://gitee.com/timliu2117/temp/raw/master/uploads/{book}/{unit}/{section}/{file}
    return `https://gitee.com/timliu2117/temp/raw/master/uploads/${textbook}/${unit}/${section}/${file}`;
  } else {
    // Local URL format: wav/{book}/{unit}/{section}/{file}
    return `wav/${textbook}/${unit}/${section}/${file}`;
  }
}


function buildUI() {
  // Populate textbook dropdown
  // const sectionsDiv = document.getElementById('sections');
  // sectionsDiv.innerHTML = `
  // `;

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
    });
  }

  // Initial population - get textbooks from both local and Gitee data
  const localTextbooks = Object.keys(indexData.local || {});
  const giteeTextbooks = Object.keys(indexData.gitee || {});
  const allTextbooks = [...new Set([...localTextbooks, ...giteeTextbooks])]; // Merge and deduplicate
  
  if (allTextbooks.length === 0) {
    document.getElementById('fileListDiv').innerHTML = '<li>No textbooks found in index data.</li>';
    return;
  }
  populateDropdown(textbookSelect, allTextbooks);
  selectedTextbook = allTextbooks[0];

  // Prevent dropdown flickering on Windows browsers
  // function fixDropdownFlickering() {
  //   const allSelects = document.querySelectorAll('select');
  //   allSelects.forEach(select => {
  //     // Track if we're handling a mousedown to prevent double events
  //     let isMouseDown = false;

  //     select.addEventListener('mousedown', function (e) {
  //       isMouseDown = true;
  //       // Small delay to ensure focus is properly set
  //       setTimeout(() => {
  //         isMouseDown = false;
  //       }, 100);
  //     });

  //     select.addEventListener('focus', function (e) {
  //       // Only set the focused attribute if we're not handling a mousedown
  //       // This prevents flickering on Windows browsers
  //       if (!isMouseDown) {
  //         this.setAttribute('data-focused', 'true');
  //       }
  //     });

  //     select.addEventListener('blur', function () {
  //       this.removeAttribute('data-focused');
  //     });
  //   });
  // }

  // Call the fix after the UI is built
  // fixDropdownFlickering();

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
    });
  };
};
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
    }
  });
  updateLoopCountDisplay();
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
      file,
      source: fileSources[file] || 'local' // Default to local if not specified
    });
  });
  playerState.selectedFiles = selectedFiles;
  updateSelectAllCheckbox();
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
  
  // Get units from both local and Gitee data
  const localUnits = Object.keys((indexData.local || {})[selectedTextbook] || {});
  const giteeUnits = Object.keys((indexData.gitee || {})[selectedTextbook] || {});
  const allUnits = [...new Set([...localUnits, ...giteeUnits])]; // Merge and deduplicate
  
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
  
  // Get sections from both local and Gitee data
  const localSections = Object.keys(((indexData.local || {})[selectedTextbook] || {})[selectedUnit] || {});
  const giteeSections = Object.keys(((indexData.gitee || {})[selectedTextbook] || {})[selectedUnit] || {});
  const allSections = [...new Set([...localSections, ...giteeSections])]; // Merge and deduplicate
  
  populateDropdown(sectionSelect, allSections);
  selectedSection = allSections[0] || '';
  updateFiles();
}

// Update files list
function updateFiles() {
  const textbookSelect = document.getElementById('textbookSelect');
  const unitSelect = document.getElementById('unitSelect');
  const sectionSelect = document.getElementById('sectionSelect');
  const fileListDiv = document.getElementById('fileListDiv');
  
  // Clear file sources tracking
  fileSources = {};
  
  // Get files from both local and Gitee data
  let localFiles = ((indexData.local || {})[selectedTextbook] || {})[selectedUnit] || {};
  localFiles = localFiles[selectedSection] || [];
  
  let giteeFiles = ((indexData.gitee || {})[selectedTextbook] || {})[selectedUnit] || {};
  giteeFiles = giteeFiles[selectedSection] || [];
  
  // If localFiles or giteeFiles are objects (not arrays), extract the array
  if (!Array.isArray(localFiles) && localFiles.files) {
    localFiles = localFiles.files;
  }
  if (!Array.isArray(giteeFiles) && giteeFiles.files) {
    giteeFiles = giteeFiles.files;
  }
  
  // Ensure they are arrays
  if (!Array.isArray(localFiles)) localFiles = [];
  if (!Array.isArray(giteeFiles)) giteeFiles = [];
  
  // Track source for each file
  localFiles.forEach(file => {
    fileSources[file] = 'local';
  });
  giteeFiles.forEach(file => {
    fileSources[file] = 'gitee';
  });
  
  // Merge and deduplicate files
  const allFiles = [...new Set([...localFiles, ...giteeFiles])];
  
  fileListDiv.innerHTML = '';
  if (allFiles.length === 0) {
    fileListDiv.innerHTML = '<li>No files found for this section.</li>';
    updateSelectAllCheckbox();
    return;
  }
  
  allFiles.forEach((fileName, idx) => {
    const li = document.createElement('li');
    li.setAttribute('data-file-name', fileName); // For highlight
    const source = fileSources[fileName] || 'local';
    li.innerHTML = `
          <label>
            <input type="checkbox" class="file-checkbox" value="${fileName}" checked>
            ${fileName} ${source === 'gitee' ? '<span style="color: #007bff; font-size: 0.8em;">(Gitee)</span>' : ''}
          </label>
        `;
    fileListDiv.appendChild(li);
  });
  updateSelectAllCheckbox();
}

// Build UI for textbook -> unit -> section -> files structure
// Build UI for textbook -> unit -> section -> files structure




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
    }
  } catch (e) {
    console.error('Error loading daily play time:', e);
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

  let timeString = '';
  if (hours > 0) {
    timeString = `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    timeString = `${minutes}m ${seconds}s`;
  } else {
    timeString = `${seconds}s`;
  }

  // Update display in controls area
  let playTimeDisplay = document.getElementById('playTimeDisplay');
  if (!playTimeDisplay) {
    const controlsDiv = document.querySelector('.controls');
    playTimeDisplay = document.createElement('div');
    playTimeDisplay.id = 'playTimeDisplay';
    playTimeDisplay.style.marginLeft = '15px';
    playTimeDisplay.style.padding = '10px';
    playTimeDisplay.style.backgroundColor = '#f0f0f0';
    playTimeDisplay.style.borderRadius = '4px';
    playTimeDisplay.style.fontWeight = 'bold';
    controlsDiv.appendChild(playTimeDisplay);
  }
  playTimeDisplay.textContent = `Today: ${timeString}`;

  // Add playback speed control after play time display
  let speedControl = document.getElementById('speedControl');
  if (!speedControl) {
    const controlsDiv = document.querySelector('.controls');
    speedControl = document.createElement('select');
    speedControl.id = 'speedControl';
    speedControl.style.marginLeft = '15px';
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

    // Set default value to 1x (for local files)
    speedControl.value = '1';

    controlsDiv.appendChild(speedControl);

    // Add event listener to update playback speed
    speedControl.addEventListener('change', function() {
      const audio = document.getElementById('audio');
      audio.playbackRate = parseFloat(this.value);
    });
  }
}

// Start tracking play time
function startPlayTimeTracking() {
  playerState.playStartTime = Date.now();
}

// Stop tracking play time and update total
function stopPlayTimeTracking() {
  if (playerState.playStartTime) {
    const elapsedSeconds = (Date.now() - playerState.playStartTime) / 1000;
    dailyPlayTime.time += elapsedSeconds;
    playerState.playStartTime = null;
    saveDailyPlayTime();
    updatePlayTimeDisplay();
  }
};

// Play selected files with global loop count
// Play selected files with global loop count
async function startPlayback() {
  const selectedFiles = [];
  document.querySelectorAll('.file-checkbox:checked').forEach(cb => {
    const file = cb.value;
    selectedFiles.push({
      textbook: document.getElementById('textbookSelect').value,
      unit: document.getElementById('unitSelect').value,
      section: document.getElementById('sectionSelect').value,
      file,
      source: fileSources[file] || 'local' // Default to local if not specified
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

  // Set default playback speed based on file sources
  const speedControl = document.getElementById('speedControl');
  if (speedControl) {
    // If any file is from Gitee, use 0.75x as default, otherwise use 1x
    const hasGiteeFile = selectedFiles.some(fileObj => fileObj.source === 'gitee');
    const defaultSpeed = hasGiteeFile ? 0.75 : 1;
    speedControl.value = defaultSpeed;
  }

  // Start tracking play time
  startPlayTimeTracking();

  // Preload the second file if it exists
  if (selectedFiles.length > 1) {
    preloadAudio(selectedFiles[1]);
  }

  playCurrent();
}
// (Removed duplicate event listener for globalLoopCount; already handled in buildUI)
// Preload audio file
async function preloadAudio(fileObj) {
  if (!fileObj) return;

  const { textbook, unit, section, file, source } = fileObj;
  const audioUrl = getFileUrl(textbook, unit, section, file, source);
  
  // For Gitee files, we can't cache them in the same way as local files
  if (source === 'gitee') {
    console.log(`Gitee file (not cached): ${file}`);
    return;
  }
  
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
  
  // If not cached, fetch and cache it
  try {
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    await window.audioCache.saveAudioToCache(audioUrl, arrayBuffer);
    console.log(`Preloaded and cached: ${file}`);
  } catch (error) {
    console.log(`Failed to preload: ${file}`, error);
  }
}

async function playCurrent() {
  const audio = document.getElementById('audio');
  const files = playerState.selectedFiles;
  const idx = playerState.fileIdx;
  if (idx < 0 || idx >= files.length) {
    playerState.isPlaying = false;
    highlightPlayingFile(null);
    stopPlayTimeTracking(); // Stop tracking when playback finishes
    return;
  }
  const { textbook, unit, section, file, source } = files[idx];
  const audioUrl = getFileUrl(textbook, unit, section, file, source);
  
  // For Gitee files, we can't use the cache
  if (source === 'gitee') {
    console.log(`Playing from Gitee: ${file}`);
    audio.src = audioUrl;
  } else {
    // Check if file is in cache
    try {
      const cachedData = await window.audioCache.getAudioFromCache(audioUrl);
      if (cachedData) {
        console.log(`Playing from cache: ${file}`);
        const blob = new Blob([cachedData], { type: 'audio/mpeg' });
        audio.src = URL.createObjectURL(blob);
      } else {
        console.log(`Playing from network: ${file}`);
        audio.src = audioUrl;
      }
    } catch (error) {
      console.error('Error retrieving from cache, falling back to network:', error);
      audio.src = audioUrl;
    }
  }
  
  // Set playback speed based on file source
  const speedControl = document.getElementById('speedControl');
  if (speedControl) {
    // For the first file in a playlist, set default speed based on source
    // For subsequent files or loops, maintain user's selection unless it's the default
    const defaultSpeed = (source === 'gitee') ? 0.75 : 1;
    const userSpeed = parseFloat(speedControl.value);
    
    // If this is the first file (fileIdx = 0) and first loop (loopIdx = 1),
    // set the default speed based on source
    if (playerState.fileIdx === 0 && playerState.loopIdx === 1) {
      // Set default speed based on source
      audio.playbackRate = defaultSpeed;
      speedControl.value = defaultSpeed;
    } else {
      // For subsequent files or loops, maintain user's selection
      audio.playbackRate = userSpeed;
    }
  }
  
  audio.play();
  playerState.loopIdx = 1;
  highlightPlayingFile(file);

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
    } else {
      playerState.fileIdx++;
      playCurrent();
    }
  };

  // Stop tracking play time when audio is paused or stopped
  audio.onpause = function () {
    if (!playerState.isPlaying) {
      stopPlayTimeTracking();
    }
  };
  
  // Save to cache after playing (if not already cached and is a local file)
  audio.onplay = async function() {
    // Only cache local files
    if (source === 'local') {
      try {
        const isCached = await window.audioCache.isAudioInCache(audioUrl);
        if (!isCached) {
          // Fetch and cache the file
          fetch(audioUrl)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => window.audioCache.saveAudioToCache(audioUrl, arrayBuffer))
            .then(() => console.log(`Saved to cache: ${file}`))
            .catch(error => console.error('Error caching file:', error));
        }
      } catch (error) {
        console.error('Error checking cache status:', error);
      }
    }
  };
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
  } else {
    // Start playback
    await startPlayback();
    playBtn.textContent = 'Stop';
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
  // Set the global indexData variable
  indexData = event.detail;
  // Build the UI with the loaded data
  buildUI();
});
