const fs = require('fs');
const { execSync } = require('child_process');

console.log('WARNING: Ensure you are using n8n Credentials feature and NOT hardcoding API keys in HTTP Request nodes before committing.');

try {
  // Export workflows inside the container
  execSync('docker exec coati-n8n n8n export:workflow --backup --output=/tmp/n8n_backup', { stdio: 'inherit' });

  // Ensure the host workflows directory exists
  fs.mkdirSync('./backend/n8n/workflows', { recursive: true });

  // Copy exported files from container to host
  execSync('docker cp coati-n8n:/tmp/n8n_backup/. ./backend/n8n/workflows/', { stdio: 'inherit' });

  console.log('n8n workflows backed up successfully to backend/n8n/workflows/');
} catch (error) {
  console.error('Error during n8n backup:', error.message);
  console.error('Please ensure Docker is running and the n8n container is started.');
  process.exit(1);
}
