// Simple wrapper to start serve for PM2
const { exec } = require('child_process');

const serve = exec('npx serve -s frontend/dist -l 3001 -c ../serve.json');

serve.stdout.on('data', (data) => {
  console.log(data);
});

serve.stderr.on('data', (data) => {
  console.error(data);
});

serve.on('close', (code) => {
  console.log(`serve exited with code ${code}`);
  process.exit(code);
});
