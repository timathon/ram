    // Load index.json data dynamically
    let indexData = {};
    fetch('wav/index.json')
      .then(response => response.json())
      .then(data => {
        indexData = data;
        buildUI();
      })
      .catch(err => {
        document.getElementById('sections').innerHTML = '<div style="color:red;">Failed to load wav/index.json.</div>';
      });
    