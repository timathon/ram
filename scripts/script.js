// Main script for the Pitter-Patter Player
// This file now just coordinates the modules

// Listen for index data loaded event
window.addEventListener('indexDataLoaded', function(event) {
  // Set the global indexData variables
  window.indexData = event.detail.current || event.detail;
  window.indexOldData = event.detail.old || {};
  
  // Wait for UI module to be loaded
  const checkUI = () => {
    if (window.ui && typeof window.ui.buildUI === 'function') {
      // Build the UI with the loaded data
      window.ui.buildUI();
    } else {
      // Try again in a short while
      setTimeout(checkUI, 100);
    }
  };
  
  checkUI();
});

// Save playback state when page is about to be unloaded
window.addEventListener('beforeunload', function() {
  if (window.state && typeof window.state.savePlaybackState === 'function') {
    window.state.savePlaybackState();
  }
});

// Add event listeners to audio element for play state changes
document.addEventListener('DOMContentLoaded', function() {
  const audio = document.getElementById('audio');
  if (audio) {
    // Ensure play time tracking is started when audio actually plays
    audio.addEventListener('play', function() {
      if (window.state && typeof window.state.startPlayTimeTracking === 'function') {
        window.state.startPlayTimeTracking();
      }
    });
    
    // Stop play time tracking when audio is paused
    audio.addEventListener('pause', function() {
      if (window.state && typeof window.state.stopPlayTimeTracking === 'function') {
        window.state.stopPlayTimeTracking();
      }
    });
    
    // Stop play time tracking when audio ends
    audio.addEventListener('ended', function() {
      if (window.state && typeof window.state.stopPlayTimeTracking === 'function') {
        window.state.stopPlayTimeTracking();
      }
    });
  }
});