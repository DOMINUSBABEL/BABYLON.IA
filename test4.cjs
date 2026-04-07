const fs = require('fs');
let appjs = fs.readFileSync('public/app.js', 'utf8');

// The diff tool appended at the start of app.js. That is perfectly fine.
