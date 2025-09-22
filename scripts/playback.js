// Playback functions for the Pitter-Patter Player

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
  
  // Update player state
  window.playerState.selectedFiles = selectedFiles;
  window.playerState.loopCount = loopCount;
  window.playerState.fileIdx = 0;
  window.playerState.loopIdx = 1;
  window.playerState.isPlaying = true;

  // Set default playback speed based on file origin
  // Default to 0.75x for all files
  // Except when playing only files from index-old.json, then use 1x
  const speedControl = document.getElementById('speedControl');
  if (speedControl) {
    // Check if all selected files are in the old index (and there's at least one file)
    const allOldFiles = selectedFiles.length > 0 && selectedFiles.every(fileObj => 
      window.utils.isFileInOldIndex(fileObj.textbook, fileObj.unit, fileObj.section, fileObj.file)
    );
    
    // Set default speed: 1x only if ALL files are in old index (pure old content),
    // otherwise 0.75x (default for mixed or new content)
    const defaultSpeed = allOldFiles ? 1 : 0.75;
    speedControl.value = defaultSpeed;
  }

  // Start tracking play time
  // Note: Actual time tracking starts when audio.onplay is triggered
  window.state.loadDailyPlayTime(); // Ensure we have the latest time data

  playCurrent();
}

// Preload audio file
async function preloadAudio(fileObj) {
  if (!fileObj) return;

  const { textbook, unit, section, file } = fileObj;
  const localAudioUrl = window.utils.getFileUrl(textbook, unit, section, file, 'local');
  
  // Check if file is in cache first
  try {
    const isCached = await window.audioCache.isAudioInCache(localAudioUrl);
    if (isCached) {
      console.log(`Next file already cached: ${file}`);
      return;
    }
  } catch (error) {
    console.error('Error checking cache status:', error);
  }
  
  // Cache the local file
  try {
    console.log(`Preloading from local file: ${file}`);
    const response = await fetch(localAudioUrl);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      await window.audioCache.saveAudioToCache(localAudioUrl, arrayBuffer);
      console.log(`Preloaded and cached local file: ${file}`);
    } else {
      console.log(`Failed to preload local file: ${file} (Status: ${response.status})`);
    }
  } catch (error) {
    console.error('Error preloading local file:', error);
  }
}

// Cache the next two files from local files
async function cacheNextTwoFiles() {
  const files = window.playerState.selectedFiles;
  const currentIdx = window.playerState.fileIdx;
  
  // Cache the next file
  if (currentIdx + 1 < files.length) {
    cacheNextFileFromLocal(files[currentIdx + 1]);
  }
  
  // Cache the file after next
  if (currentIdx + 2 < files.length) {
    cacheNextFileFromLocal(files[currentIdx + 2]);
  }
}

// Cache a single file from local storage
async function cacheNextFileFromLocal(fileObj) {
  if (!fileObj) return;

  const { textbook, unit, section, file } = fileObj;
  const localAudioUrl = window.utils.getFileUrl(textbook, unit, section, file, 'local');
  
  // Check if file is already in cache
  try {
    const isCached = await window.audioCache.isAudioInCache(localAudioUrl);
    if (isCached) {
      console.log(`File already cached: ${file}`);
      return;
    }
  } catch (error) {
    console.error('Error checking cache status:', error);
  }
  
  // Cache the local file
  try {
    console.log(`Caching local file: ${file}`);
    const response = await fetch(localAudioUrl);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      await window.audioCache.saveAudioToCache(localAudioUrl, arrayBuffer);
      console.log(`Cached local file: ${file}`);
    } else {
      console.log(`Failed to cache local file: ${file} (Status: ${response.status})`);
    }
  } catch (error) {
    console.error('Error caching local file:', error);
  }
}

// Play the current file
async function playCurrent() {
  const audio = document.getElementById('audio');
  const files = window.playerState.selectedFiles;
  const idx = window.playerState.fileIdx;
  if (idx < 0 || idx >= files.length) {
    // Check if continuous playback is enabled
    if (window.playerState.continuousPlayback && files.length > 0) {
      // Move to the next section in the same unit
      const currentTextbook = files[0].textbook;
      const currentUnit = files[0].unit;
      
      // Get all sections in the current unit
      const allSections = Object.keys(((window.indexData || {})[currentTextbook] || {})[currentUnit] || {});
      
      // Find the current section index
      const currentSection = files[0].section;
      const currentSectionIndex = allSections.indexOf(currentSection);
      
      // If there's a next section, load its files
      if (currentSectionIndex >= 0 && currentSectionIndex < allSections.length - 1) {
        const nextSection = allSections[currentSectionIndex + 1];
        const nextSectionFiles = (((window.indexData || {})[currentTextbook] || {})[currentUnit] || {})[nextSection] || [];
        
        console.log(`Continuous playback: Moving from section '${currentSection}' to '${nextSection}'`);
        
        // Convert to proper file objects
        const nextFiles = nextSectionFiles.map(file => ({
          textbook: currentTextbook,
          unit: currentUnit,
          section: nextSection,
          file: file
        }));
        
        // Update UI to show the next section
        document.getElementById('sectionSelect').value = nextSection;
        window.setSelectedValues(currentTextbook, currentUnit, nextSection);
        window.ui.updateFiles();
        
        // Select all files in the next section
        document.querySelectorAll('.file-checkbox').forEach(cb => {
          cb.checked = true;
        });
        
        // Update player state with new files
        window.playerState.selectedFiles = nextFiles;
        window.playerState.fileIdx = 0;
        window.playerState.loopIdx = 1;
        
        // Save state
        window.state.savePlaybackState();
        
        // Continue playing with the new files
        playCurrent();
        return;
      } else {
        console.log('Continuous playback: No more sections in this unit');
      }
    }
    
    // If no continuous playback or no more sections, stop playback
    window.playerState.isPlaying = false;
    window.ui.highlightPlayingFile(null);
    window.state.stopPlayTimeTracking(); // Stop tracking when playback finishes
    window.state.savePlaybackState(); // Save state when playback finishes
    console.log('Playback finished');
    return;
  }
  const { textbook, unit, section, file } = files[idx];
  
  // First check if file is in cache (synchronous check)
  const localAudioUrl = window.utils.getFileUrl(textbook, unit, section, file, 'local');
  
  try {
    // Check cache status first
    const isCached = await window.audioCache.isAudioInCache(localAudioUrl);
    
    if (isCached) {
      // Play from cache immediately
      console.log(`Playing from cache: ${file}`);
      const cachedFile = await window.audioCache.getAudioFromCache(localAudioUrl);
      const blob = new Blob([cachedFile.data], { type: cachedFile.mimeType });
      const audioUrl = URL.createObjectURL(blob);
      
      // Set the audio source and play immediately
      audio.src = audioUrl;
      setPlaybackSpeed(audio);
      audio.play();
      
      window.playerState.loopIdx = 1;
      window.ui.highlightPlayingFile(file);
      window.state.savePlaybackState();
    } else {
      // For non-cached files, try to play from Gitee API first
      try {
        console.log(`Playing from Gitee API: ${file}`);
        const giteeBlob = await window.utils.fetchFromGiteeApi(textbook, unit, section, file);
        
        // Play from Gitee blob immediately
        const audioUrl = URL.createObjectURL(giteeBlob);
        audio.src = audioUrl;
        setPlaybackSpeed(audio);
        audio.play();
        
        window.playerState.loopIdx = 1;
        window.ui.highlightPlayingFile(file);
        window.state.savePlaybackState();
        
        // Cache the Gitee blob for future use
        try {
          const arrayBuffer = await new Response(giteeBlob).arrayBuffer();
          await window.audioCache.saveAudioToCache(localAudioUrl, arrayBuffer);
          console.log(`Cached Gitee blob: ${file}`);
        } catch (cacheError) {
          console.error('Error caching Gitee blob:', cacheError);
        }
      } catch (giteeError) {
        // If Gitee API fails, fallback to local file
        console.log(`Gitee API failed, fallback to local file: ${file}`, giteeError);
        const audioUrl = localAudioUrl;
        
        // Set the audio source and play immediately
        audio.src = audioUrl;
        setPlaybackSpeed(audio);
        
        // Play the audio (don't await, let it happen asynchronously)
        audio.play().catch(error => {
          console.error('Error playing audio:', error);
        });
        
        window.playerState.loopIdx = 1;
        window.ui.highlightPlayingFile(file);
        window.state.savePlaybackState();
        
        // Don't cache from local file anymore
        console.log(`Not caching from local file: ${file}`);
      }
    }
    
    // Preload the next file if it exists
    if (idx + 1 < files.length) {
      preloadAudio(files[idx + 1]);
    }
    
    // Cache the next two files from local files
    cacheNextTwoFiles();
  } catch (error) {
    console.error('Error playing file:', error);
    // Fallback to local file if all else fails
    console.log(`Fallback to local file: ${file}`);
    const localAudioUrl = window.utils.getFileUrl(textbook, unit, section, file, 'local');
    audio.src = localAudioUrl;
    setPlaybackSpeed(audio);
    audio.play();
    window.playerState.loopIdx = 1;
    window.ui.highlightPlayingFile(file);
    window.state.savePlaybackState();
    
    // Preload the next file if it exists
    if (idx + 1 < files.length) {
      preloadAudio(files[idx + 1]);
    }
    
    // Cache the next two files from local files
    cacheNextTwoFiles();
  }

  // Set up event handlers
  setupAudioEventHandlers(audio, textbook, unit, section, file);
}

// Helper function to set playback speed
function setPlaybackSpeed(audio) {
  const speedControl = document.getElementById('speedControl');
  if (speedControl) {
    audio.playbackRate = parseFloat(speedControl.value);
  }
}

// Helper function to set up audio event handlers
function setupAudioEventHandlers(audio, textbook, unit, section, file) {
  const localAudioUrl = window.utils.getFileUrl(textbook, unit, section, file, 'local');
  
  audio.onended = function () {
    if (!window.playerState.isPlaying) return;
    if (window.playerState.loopIdx < window.playerState.loopCount) {
      window.playerState.loopIdx++;
      window.ui.updateLoopCountDisplay();
      audio.currentTime = 0;
      setPlaybackSpeed(audio);
      audio.play();
      window.state.savePlaybackState(); // Save state when looping
    } else {
      window.playerState.fileIdx++;
      playCurrent();
    }
  };

  // Start tracking play time when audio starts playing
  audio.onplay = async function() {
    window.state.startPlayTimeTracking();
    window.state.savePlaybackState(); // Save state when audio starts playing
  };
  
  // Save state when audio is paused
  audio.onpause = function () {
    window.state.savePlaybackState(); // Save state when audio is paused
    if (!window.playerState.isPlaying) {
      window.state.stopPlayTimeTracking();
    }
  };
  
  // Save state periodically while audio is playing (every 5 seconds)
  audio.ontimeupdate = function() {
    // Save state every 5 seconds to capture current time
    if (Math.floor(audio.currentTime) % 5 === 0) {
      window.state.savePlaybackState();
    }
  };
}

// Set up event listeners for playback controls
document.getElementById('playBtn').onclick = async function () {
  const playBtn = document.getElementById('playBtn');
  
  // Always keep the button text as "Play Selected"
  playBtn.textContent = 'Play Selected';
  
  if (window.playerState.isPlaying) {
    // If files are already playing, show alert with options
    const userChoice = confirm('Audio is currently playing. Click "OK" to start over or "Cancel" to continue playing.');
    
    if (userChoice) {
      // Start over - stop current playback and start new playback
      const audio = document.getElementById('audio');
      audio.pause();
      window.playerState.isPlaying = false;
      window.state.stopPlayTimeTracking();
      window.ui.highlightPlayingFile(null);
      
      // Start new playback
      await startPlayback();
      window.state.savePlaybackState(); // Save state when playback starts
    }
    // If user chooses to continue playing (cancels), do nothing
  } else {
    // Start playback
    await startPlayback();
    window.state.savePlaybackState(); // Save state when playback starts
  }
};

// Next and Previous button handlers
window.addEventListener('DOMContentLoaded', () => {
  // Wait for UI to be created by checking if buttons exist
  const checkButtons = () => {
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    
    if (nextBtn && prevBtn) {
      const audio = document.getElementById('audio');
      
      nextBtn.onclick = function () {
        if (!window.playerState.selectedFiles.length) return;
        
        // Stop current audio immediately for better responsiveness
        audio.pause();
        
        window.playerState.fileIdx++;
        if (window.playerState.fileIdx >= window.playerState.selectedFiles.length) {
          window.playerState.fileIdx = window.playerState.selectedFiles.length - 1;
        }
        window.playerState.loopIdx = 1;
        playCurrent();
      };
      
      prevBtn.onclick = function () {
        if (!window.playerState.selectedFiles.length) return;
        
        // Stop current audio immediately for better responsiveness
        audio.pause();
        
        window.playerState.fileIdx--;
        if (window.playerState.fileIdx < 0) window.playerState.fileIdx = 0;
        window.playerState.loopIdx = 1;
        playCurrent();
      };
    } else {
      // Try again in a short while
      setTimeout(checkButtons, 100);
    }
  };
  
  checkButtons();
});

// Export playback functions
window.playback = {
  startPlayback,
  playCurrent,
  setPlaybackSpeed,
  setupAudioEventHandlers
};