    // Load both local index.json and Gitee WAV list
    let localIndexData = {};
    let giteeIndexData = {};
    
    // Clear Gitee cache to ensure fresh data on page load
    try {
      localStorage.removeItem('giteeWavListCache');
      localStorage.removeItem('giteeApiSkip');
    } catch (e) {
      console.error('Error clearing Gitee cache:', e);
    }
    
    // Load local index.json with cache busting
    const localPromise = fetch(`wav/index.json?t=${Date.now()}`)
      .then(response => response.json())
      .then(data => {
        localIndexData = data;
      })
      .catch(err => {
        console.error('Failed to load local wav/index.json:', err);
      });
    
    // Load Gitee WAV list (if giteeWavList is available)
    const giteePromise = new Promise((resolve) => {
      if (window.giteeWavList && typeof window.giteeWavList.scanAndGenerateList === 'function') {
        window.giteeWavList.scanAndGenerateList()
          .then(data => {
            // Even if data is empty due to rate limiting, we still resolve
            giteeIndexData = data || {};
            resolve();
          })
          .catch(err => {
            console.error('Failed to load Gitee WAV list:', err);
            // Resolve with empty object to not block the UI
            resolve();
          });
      } else {
        resolve(); // Resolve immediately if giteeWavList is not available
      }
    });
    
    // Wait for both to complete
    Promise.all([localPromise, giteePromise])
      .then(() => {
        // Merge the data, with Gitee data taking precedence
        indexData = mergeIndexData(localIndexData, giteeIndexData);
        // Dispatch an event to notify that index data is loaded
        window.dispatchEvent(new CustomEvent('indexDataLoaded', { detail: indexData }));
      })
      .catch(err => {
        console.error('Error loading index data:', err);
        // Fall back to local data only
        indexData = localIndexData;
        // Dispatch an event to notify that index data is loaded
        window.dispatchEvent(new CustomEvent('indexDataLoaded', { detail: indexData }));
      });
    
    // Helper function to merge local and Gitee index data
    function mergeIndexData(localData, giteeData) {
      // For now, we'll keep both separate and handle them in the UI
      // In a more advanced implementation, we might merge them
      return {
        local: localData,
        gitee: giteeData && Object.keys(giteeData).length > 0 ? giteeData : {} // Only include non-empty gitee data
      };
    }
    