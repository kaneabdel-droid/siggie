const fs = require('fs');
const path = require('path');

const replacements = {
  'Ã©': 'é',
  'Ã¨': 'è',
  'Ã ': 'à',
  'Ã¢': 'â',
  'Ãª': 'ê',
  'Ã®': 'î',
  'Ã´': 'ô',
  'Ã»': 'û',
  'Ã§': 'ç',
  'Ã¯': 'ï',
  'Ã«': 'ë',
  'Ã\\u00A0': 'à', // In case of non-breaking space
};

function walkDir(dir) {
  let files = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      files = files.concat(walkDir(fullPath));
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      files.push(fullPath);
    }
  });
  return files;
}

const files = walkDir('./app');

let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  for (const [garbled, fixed] of Object.entries(replacements)) {
    // Escape garbled if needed, but simple string split/join works too
    newContent = newContent.split(garbled).join(fixed);
  }

  // Handle the tricky 'Ã ' which might be a char code 195 followed by space or something else
  // Let's just do a regex replace for any Ã followed by space or \xa0
  newContent = newContent.replace(/Ã[\s\xA0]/g, 'à ');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedCount++;
    console.log('Fixed', file);
  }
});

console.log(`Fixed ${changedCount} files.`);
