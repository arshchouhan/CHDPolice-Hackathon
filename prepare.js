const fs = require('fs');
const path = require('path');

// Create necessary directories if they don't exist
const dirs = [
  'public/css',
  'public/js',
  'public/images',
  'src/css'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Create empty tailwind.css if it doesn't exist
const tailwindCssPath = path.join('src', 'css', 'tailwind.css');
if (!fs.existsSync(tailwindCssPath)) {
  fs.writeFileSync(tailwindCssPath, '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');
  console.log('Created default tailwind.css');
}

console.log('Preparation complete!');
