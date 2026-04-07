const fs = require('fs');
const appjs = fs.readFileSync('public/app.js', 'utf8');

const matches = [...appjs.matchAll(/(contextEditor|contextLoading|saveContextBtn)/g)];
console.log(matches.length, "occurrences of these variables in app.js.");

const declMatches = [...appjs.matchAll(/(const|let|var)\s+(contextEditor|contextLoading|saveContextBtn)/g)];
console.log(declMatches.length, "declarations.");
