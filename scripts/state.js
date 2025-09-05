// State management functions for the Pitter-Patter Player

// Player state
let playerState = {
  selectedFiles: [],
  loopCount: 1,
  fileIdx: 0,
  loopIdx: 1,
  isPlaying: false,
  playStartTime: null
};

// Make playerState globally accessible
window.playerState = playerState;

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

// Get daily play time
function getDailyPlayTime() {
  return dailyPlayTime;
}

// Save playback state to localStorage
function savePlaybackState() {
  try {
    // Get current audio position
    const audio = document.getElementById('audio');
    const currentTime = audio ? audio.currentTime : 0;
    
    // Get selected values
    const selectedValues = window.getSelectedValues ? window.getSelectedValues() : {
      textbook: '',
      unit: '',
      section: ''
    };
    
    // Create playback state object
    const state = {
      textbook: selectedValues.textbook,
      unit: selectedValues.unit,
      section: selectedValues.section,
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
      if (window.setSelectedValues) {
        window.setSelectedValues(state.textbook, state.unit, state.section);
      }
      window.ui.updateUnits();
      
      // Wait a bit for units to populate
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Set unit
      if (unitSelect && Array.from(unitSelect.options).some(option => option.value === state.unit)) {
        unitSelect.value = state.unit;
        // Wait a bit for sections to populate
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Set section
        if (sectionSelect && Array.from(sectionSelect.options).some(option => option.value === state.section)) {
          sectionSelect.value = state.section;
          window.ui.updateFiles();
          
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
            window.ui.updateSelectAllCheckbox();
            
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
                const audioUrl = window.utils.getFileUrl(
                  fileObj.textbook, 
                  fileObj.unit, 
                  fileObj.section, 
                  fileObj.file
                );
                
                // Set the audio source
                audio.src = audioUrl;
                audio.currentTime = state.currentTime || 0;
                
                // Update UI - always keep button text as "Play Selected"
                document.getElementById('playBtn').textContent = 'Play Selected';
                window.ui.highlightPlayingFile(fileObj.file);
                
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
  window.ui.updatePlayTimeDisplay();
}

// Save daily play time to localStorage
function saveDailyPlayTime() {
  try {
    localStorage.setItem('dailyPlayTime', JSON.stringify(dailyPlayTime));
  } catch (e) {
    console.error('Error saving daily play time:', e);
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
      window.ui.updatePlayTimeDisplay();
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
  window.ui.updatePlayTimeDisplay();
}

// Export state functions
window.state = {
  getDailyPlayTime,
  savePlaybackState,
  loadPlaybackState,
  applyPlaybackState,
  loadDailyPlayTime,
  saveDailyPlayTime,
  startPlayTimeTracking,
  stopPlayTimeTracking
};