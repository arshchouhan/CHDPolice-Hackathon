const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure the output directory exists
const outputDir = path.join(__dirname, 'public', 'css');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create a temporary package.json to install tailwindcss
const tempPackageJson = {
  name: 'temp-tailwind-build',
  version: '1.0.0',
  private: true,
  scripts: {
    build: 'tailwindcss -i ./src/css/tailwind.css -o ./public/css/tailwind.css --minify'
  },
  devDependencies: {
    'tailwindcss': '^3.3.0',
    'autoprefixer': '^10.4.0',
    'postcss': '^8.4.0'
  }
};

// Write the temporary package.json
fs.writeFileSync('temp-package.json', JSON.stringify(tempPackageJson, null, 2));

console.log('Installing dependencies...');
try {
  // Install dependencies
  execSync('npm install --prefix ./temp --no-package-lock --no-save', { stdio: 'inherit' });
  
  // Run the build
  console.log('Building Tailwind CSS...');
  execSync('npm run build --prefix ./temp', { stdio: 'inherit' });
  
  console.log('Tailwind CSS built successfully!');
} catch (error) {
  console.error('Error building Tailwind CSS:', error);
  process.exit(1);
} finally {
  // Clean up
  try {
    fs.unlinkSync('temp-package.json');
    fs.rmSync('temp', { recursive: true, force: true });
  } catch (e) {
    console.error('Error cleaning up:', e);
  }
}
