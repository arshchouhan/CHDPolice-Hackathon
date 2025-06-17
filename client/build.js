const fs = require('fs-extra');
const path = require('path');

async function copyPublicFiles() {
    try {
        // Ensure build directory exists
        await fs.ensureDir('build');

        // Copy all files from ../public to build
        await fs.copy('../public', 'build', {
            filter: (src) => {
                // Don't copy node_modules or git directories
                return !src.includes('node_modules') && !src.includes('.git');
            }
        });

        // Copy base-url.js to build/js
        await fs.ensureDir('build/js');
        await fs.copy('../public/js/base-url.js', 'build/js/base-url.js');

        // Copy auth.css to build/css
        await fs.ensureDir('build/css');
        await fs.copy('../public/css/auth.css', 'build/css/auth.css');

        console.log('Successfully copied public files to build directory');
    } catch (err) {
        console.error('Error copying files:', err);
        process.exit(1);
    }
}

copyPublicFiles();
