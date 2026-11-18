import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Compatibility entry point. The policy lives in readBlog, shared by content
// checks and all content builds, and no longer depends on Git diff/history.
const result = spawnSync(
  process.execPath,
  [
    '--import',
    'tsx',
    fileURLToPath(new URL('./check-blog.ts', import.meta.url)),
  ],
  { stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
