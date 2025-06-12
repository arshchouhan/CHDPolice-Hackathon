const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define absolute paths
const projectRoot = __dirname;
const publicCssDir = path.join(projectRoot, 'public', 'css');
const inputFile = path.join(publicCssDir, 'tailwind.css');
const outputFile = path.join(publicCssDir, 'tailwind.output.css');

// Ensure the output directory exists
if (!fs.existsSync(publicCssDir)) {
  console.log(`Creating directory: ${publicCssDir}`);
  fs.mkdirSync(publicCssDir, { recursive: true });
}

console.log(`Input file: ${inputFile}`);
console.log(`Output file: ${outputFile}`);

try {
  // Check if input file exists
  if (!fs.existsSync(inputFile)) {
    throw new Error(`Input file not found: ${inputFile}`);
  }

  // Build the Tailwind CSS
  console.log('Building Tailwind CSS...');
  const command = `npx tailwindcss -i "${inputFile}" -o "${outputFile}"`;
  execSync(command, { stdio: 'inherit' });
  
  // Verify the output file was created
  if (fs.existsSync(outputFile)) {
    console.log(`Successfully built Tailwind CSS: ${outputFile}`);
  } else {
    throw new Error(`Output file was not created: ${outputFile}`);
  }
} catch (error) {
  console.error('Error building Tailwind CSS:', error);
  process.exit(1);
}
