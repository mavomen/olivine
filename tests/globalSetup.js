const { execSync } = require('node:child_process');
const path = require('node:path');

module.exports = async () => {
  execSync('npm run build', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
};
