const { spawnSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const env = {
  ...process.env,
  REACT_APP_API_URL: 'https://hankstank.uc.r.appspot.com/api',
  REACT_APP_ENV: 'production',
  REACT_APP_DEBUG: 'false',
  REACT_APP_DEFAULT_SEASON: '2026',
};

const result = process.platform === 'win32'
  ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm run build'], {
      cwd: repoRoot,
      env,
      stdio: 'inherit',
    })
  : spawnSync('npm', ['run', 'build'], {
      cwd: repoRoot,
      env,
      stdio: 'inherit',
    });

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
