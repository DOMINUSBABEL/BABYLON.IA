const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const appjs = fs.readFileSync('public/app.js', 'utf8');

const regex = /document\.getElementById\('([^']+)'\)/g;
let match;
const idsInAppjs = new Set();
while ((match = regex.exec(appjs)) !== null) {
  idsInAppjs.add(match[1]);
}

console.log("IDs in app.js not found in index.html:");
for (const id of idsInAppjs) {
  if (!html.includes('id="' + id + '"')) {
    console.log(id);
  }
}
