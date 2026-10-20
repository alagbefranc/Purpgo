'use strict';
// End-to-end run on the local fictional fixture site. Usage: node test/run-fixture.js [--out dir] [extra CLI args]
const { spawn } = require('child_process');
const path = require('path');
const { serve } = require('./serve');
(async () => {
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/`;
  const args = process.argv.slice(2);
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'bin', 'reverse-brand.js'), url, '--name', 'Lumen', ...args], { stdio: 'inherit' });
  child.on('close', (code) => { server.close(); process.exit(code); });
})();
