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
    // const indexData = {
    //   "A7B": {
    //     "U5": {
    //       "A9-U6-A-1b": {
    //         "files": [
    //           { "name": "A9-U6-A-1b_01.mp3", "path": "A7B/U5/A9-U6-A-1b/A9-U6-A-1b_01.mp3" },
    //           { "name": "A9-U6-A-1b_02.mp3", "path": "A7B/U5/A9-U6-A-1b/A9-U6-A-1b_02.mp3" },
    //           { "name": "A9-U6-A-1b_03.mp3", "path": "A7B/U5/A9-U6-A-1b/A9-U6-A-1b_03.mp3" },
    //           { "name": "A9-U6-A-1b_04.mp3", "path": "A7B/U5/A9-U6-A-1b/A9-U6-A-1b_04.mp3" },
    //           { "name": "A9-U6-A-1b_05.mp3", "path": "A7B/U5/A9-U6-A-1b/A9-U6-A-1b_05.mp3" },
    //           { "name": "A9-U6-A-1b_06.mp3", "path": "A7B/U5/A9-U6-A-1b/A9-U6-A-1b_06.mp3" },
    //           { "name": "A9-U6-A-1b_07.mp3", "path": "A7B/U5/A9-U6-A-1b/A9-U6-A-1b_07.mp3" },
    //           { "name": "A9-U6-A-1b_08.mp3", "path": "A7B/U5/A9-U6-A-1b/A9-U6-A-1b_08.mp3" }
    //         ]
    //       }
    //     }
    //   },
    //   "A9": {
    //     "U6": {
    //       "A9-U6-A-2d": {
    //         "files": [
    //           { "name": "A9-U6-A-2d_01.mp3", "path": "A9/U6/A9-U6-A-2d/A9-U6-A-2d_01.mp3" },
    //           { "name": "A9-U6-A-2d_02.mp3", "path": "A9/U6/A9-U6-A-2d/A9-U6-A-2d_02.mp3" },
    //           { "name": "A9-U6-A-2d_03.mp3", "path": "A9/U6/A9-U6-A-2d/A9-U6-A-2d_03.mp3" },
    //           { "name": "A9-U6-A-2d_04.mp3", "path": "A9/U6/A9-U6-A-2d/A9-U6-A-2d_04.mp3" },
    //           { "name": "A9-U6-A-2d_05.mp3", "path": "A9/U6/A9-U6-A-2d/A9-U6-A-2d_05.mp3" },
    //           { "name": "A9-U6-A-2d_06.mp3", "path": "A9/U6/A9-U6-A-2d/A9-U6-A-2d_06.mp3" },
    //           { "name": "A9-U6-A-2d_07.mp3", "path": "A9/U6/A9-U6-A-2d/A9-U6-A-2d_07.mp3" },
    //           { "name": "A9-U6-A-2d_08.mp3", "path": "A9/U6/A9-U6-A-2d/A9-U6-A-2d_08.mp3" }
    //         ]
    //       }
    //     }
    //   }
    // };
    // Show loop count next to currently playing file
    // Build UI for textbook -> unit -> section -> files structure
