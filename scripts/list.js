// Load local index.json and index-old.json data
let indexData = {};
let indexOldData = {};

// Load local index.json with cache busting
const indexPromise = fetch(`wav/index.json?t=${Date.now()}`)
  .then(response => response.json())
  .then(data => {
    indexData = data;
  })
  .catch(err => {
    console.error('Error loading index.json:', err);
  });

// Load local index-old.json with cache busting
const indexOldPromise = fetch(`wav/index-old.json?t=${Date.now()}`)
  .then(response => response.json())
  .then(data => {
    indexOldData = data;
  })
  .catch(err => {
    console.error('Error loading index-old.json:', err);
  });

// Wait for both to complete
Promise.all([indexPromise, indexOldPromise])
  .then(() => {
    // Dispatch an event to notify that index data is loaded
    window.dispatchEvent(new CustomEvent('indexDataLoaded', { 
      detail: { 
        current: indexData, 
        old: indexOldData 
      } 
    }));
  })
  .catch(err => {
    console.error('Error loading index data:', err);
    // Dispatch an event with empty data
    window.dispatchEvent(new CustomEvent('indexDataLoaded', { detail: { current: {}, old: {} } }));
  });