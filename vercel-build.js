const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Vercel build process...');

// Ensure public/css directory exists
const cssDir = path.join(__dirname, 'public', 'css');
if (!fs.existsSync(cssDir)) {
  fs.mkdirSync(cssDir, { recursive: true });
}

// Install dependencies
try {
  console.log('Installing dependencies...');
  execSync('npm install --production=false', { stdio: 'inherit' });
  
  console.log('Installing Tailwind CSS and PostCSS...');
  execSync('npm install -D tailwindcss postcss autoprefixer', { stdio: 'inherit' });
  
  // Run the build
  console.log('Running build...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
