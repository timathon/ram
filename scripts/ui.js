// UI functions for the Pitter-Patter Player

// Selected values - consolidated into one state object
let selectedValues = {
  textbook: '',
  unit: '',
  section: ''
};

// Set selected values (needed for other modules to update these)
window.setSelectedValues = function(textbook, unit, section) {
  selectedValues.textbook = textbook;
  selectedValues.unit = unit;
  selectedValues.section = section;
};

// Get selected values
window.getSelectedValues = function() {
  return {
    textbook: selectedValues.textbook,
    unit: selectedValues.unit,
    section: selectedValues.section
  };
};

// Get player state from window
function getPlayerState() {
  return window.playerState;
}

// Build the main UI
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
      getPlayerState().loopCount = newLoopCount;
      updateLoopCountDisplay();
      window.state.savePlaybackState(); // Save state when loop count changes
    });
  }
  
  // Add event listener for continuousPlayback checkbox
  const continuousPlaybackInput = document.getElementById('continuousPlayback');
  if (continuousPlaybackInput) {
    continuousPlaybackInput.addEventListener('change', function () {
      const newValue = this.checked;
      getPlayerState().continuousPlayback = newValue;
      window.state.savePlaybackState(); // Save state when continuous playback changes
      console.log('Continuous playback setting changed to:', newValue);
    });
  }

  // Initial population - get textbooks from local data only
  const allTextbooks = Object.keys(window.indexData || {});
  
  if (allTextbooks.length === 0) {
    document.getElementById('fileListDiv').innerHTML = '<li>No textbooks found in index data.</li>';
    return;
  }
  populateDropdown(textbookSelect, allTextbooks);
  selectedValues.textbook = allTextbooks[0];

  textbookSelect.onchange = function () {
    selectedValues.textbook = this.value;
    updateUnits();
  };
  unitSelect.onchange = function () {
    selectedValues.unit = this.value;
    updateSections();
  };
  sectionSelect.onchange = function () {
    selectedValues.section = this.value;
    updateFiles();
  };

  updateUnits();
}

// Patch dropdown change handlers after buildUI
const originalBuildUI = buildUI;
buildUI = function () {
  originalBuildUI();

  const textbookSelect = document.getElementById('textbookSelect');
  const unitSelect = document.getElementById('unitSelect');
  const sectionSelect = document.getElementById('sectionSelect');

  textbookSelect.onchange = function () {
    window.ui.confirmDropdownChange(() => {
      selectedValues.textbook = this.value;
      getPlayerState().isPlaying = false;
      getPlayerState().selectedFiles = [];
      document.getElementById('audio').pause();
      document.getElementById('audio').src = '';
      document.getElementById('playBtn').textContent = 'Play Selected';
      window.state.stopPlayTimeTracking();
      updateUnits();
      window.state.savePlaybackState(); // Save state when textbook changes
      
      // Log the change with full context
      console.log('Changed to:', selectedValues.textbook, selectedValues.unit, selectedValues.section);
    });
  };
  unitSelect.onchange = function () {
    window.ui.confirmDropdownChange(() => {
      selectedValues.unit = this.value;
      getPlayerState().isPlaying = false;
      getPlayerState().selectedFiles = [];
      document.getElementById('audio').pause();
      document.getElementById('audio').src = '';
      document.getElementById('playBtn').textContent = 'Play Selected';
      window.state.stopPlayTimeTracking();
      updateSections();
      window.state.savePlaybackState(); // Save state when unit changes
      
      // Log the change with full context
      console.log('Changed to:', selectedValues.textbook, selectedValues.unit, selectedValues.section);
    });
  };
  sectionSelect.onchange = function () {
    window.ui.confirmDropdownChange(() => {
      selectedValues.section = this.value;
      getPlayerState().isPlaying = false;
      getPlayerState().selectedFiles = [];
      document.getElementById('audio').pause();
      document.getElementById('audio').src = '';
      document.getElementById('playBtn').textContent = 'Play Selected';
      window.state.stopPlayTimeTracking();
      updateFiles();
      window.state.savePlaybackState(); // Save state when section changes
      
      // Log the change with full context
      console.log('Changed to:', selectedValues.textbook, selectedValues.unit, selectedValues.section);
    });
  };
  
  // Load and apply saved playback state after UI is built
  const savedState = window.state.loadPlaybackState();
  if (savedState) {
    setTimeout(async () => {
      await window.state.applyPlaybackState(savedState);
      // Log selected values after state has been fully restored
      setTimeout(() => {
        console.log('Initial selection:', selectedValues.textbook, selectedValues.unit, selectedValues.section);
      }, 150);
    }, 100);
  } else {
    // Log initial selected values if no saved state
    setTimeout(() => {
      console.log('Initial selection:', selectedValues.textbook, selectedValues.unit, selectedValues.section);
    }, 150);
  };
};

// Confirmation dialog when dropdowns change
function confirmDropdownChange(callback) {
  if (
    getPlayerState().isPlaying ||
    getPlayerState().selectedFiles.length > 0
  ) {
    if (confirm('Changing selection will reset current playback and selected files. Continue?')) {
      callback();
    }
  } else {
    callback();
  }
}

// Update loop count display during playback
function updateLoopCountDisplay() {
  // Remove all existing loop count spans
  document.querySelectorAll('#fileListDiv .loop-count-span').forEach(span => span.remove());

  // If playing, add loop count to the currently playing file
  if (
    getPlayerState().isPlaying &&
    getPlayerState().selectedFiles.length > 0 &&
    getPlayerState().fileIdx < getPlayerState().selectedFiles.length
  ) {
    const currentFile = getPlayerState().selectedFiles[getPlayerState().fileIdx].file;
    const currentLi = document.querySelector(`#fileListDiv li[data-file-name="${currentFile}"]`);

    if (currentLi) {
      const span = document.createElement('span');
      span.className = 'loop-count-span';
      span.style.marginLeft = '10px';
      span.style.color = '#888';
      span.textContent = `(looping ${getPlayerState().loopIdx} of ${getPlayerState().loopCount})`;
      currentLi.appendChild(span);
    }
  }
}

// Highlight the currently playing file
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
      file
    });
  });
  getPlayerState().selectedFiles = selectedFiles;
  updateSelectAllCheckbox();
  window.state.savePlaybackState(); // Save state when files are selected
}

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
  const allUnits = Object.keys((window.indexData || {})[selectedValues.textbook] || {});
  
  populateDropdown(unitSelect, allUnits);
  selectedValues.unit = allUnits[0] || '';
  updateSections();
}

// Update sections dropdown
function updateSections() {
  const textbookSelect = document.getElementById('textbookSelect');
  const unitSelect = document.getElementById('unitSelect');
  const sectionSelect = document.getElementById('sectionSelect');
  const fileListDiv = document.getElementById('fileListDiv');
  
  // Get sections from local data only
  const allSections = Object.keys(((window.indexData || {})[selectedValues.textbook] || {})[selectedValues.unit] || {});
  
  populateDropdown(sectionSelect, allSections);
  selectedValues.section = allSections[0] || '';
  updateFiles();
}

// Update files list
function updateFiles() {
  const textbookSelect = document.getElementById('textbookSelect');
  const unitSelect = document.getElementById('unitSelect');
  const sectionSelect = document.getElementById('sectionSelect');
  const fileListDiv = document.getElementById('fileListDiv');
  
  // Get files from local data only
  let files = ((window.indexData || {})[selectedValues.textbook] || {})[selectedValues.unit] || {};
  files = files[selectedValues.section] || [];
  
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
    const displayName = window.utils.removeFileExtension(fileName);
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

// Update the play time display
function updatePlayTimeDisplay() {
  const dailyPlayTime = window.state.getDailyPlayTime();
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

  // Update progress bar (0-900 seconds = 0-100%)
  const maxTime = 900; // 15 minutes in seconds
  const progressPercent = Math.min(100, (dailyPlayTime.time / maxTime) * 100);
  
  // Update display in controls area
  let playTimeDisplay = document.getElementById('playTimeDisplay');
  if (playTimeDisplay) {
    // Update progress bar width
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
      progressBar.style.width = `${progressPercent}%`;
    }
    
    // Update text
    const progressText = document.getElementById('progressText');
    if (progressText) {
      progressText.textContent = `Today: ${timeString}`;
    }
  }
}

// Add Next and Previous buttons to controls
window.addEventListener('DOMContentLoaded', () => {
  // Initialize daily play time tracking
  window.state.loadDailyPlayTime();
  
  // Add event listener to speed control
  const speedControl = document.getElementById('speedControl');
  if (speedControl) {
    speedControl.addEventListener('change', function() {
      const audio = document.getElementById('audio');
      audio.playbackRate = parseFloat(this.value);
    });
  }
});

// Document event listeners for checkboxes
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

// Export UI functions
window.ui = {
  buildUI,
  confirmDropdownChange,
  updateLoopCountDisplay,
  highlightPlayingFile,
  updateSelectedFiles,
  updateSelectAllCheckbox,
  populateDropdown,
  updateUnits,
  updateSections,
  updateFiles,
  updatePlayTimeDisplay
};