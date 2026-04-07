const fs = require('fs');
let appjs = fs.readFileSync('public/app.js', 'utf8');

// We need to add logic to sync the textarea to the highlight container.
// find a good place to put updateHighlight.
