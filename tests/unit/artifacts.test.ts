import { it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkArtifacts } from '../../scripts/check-artifacts';
it('rejects fixture text inside a release JS bundle even with a valid preparation page', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'modelsphere-artifacts-'));
  try {
    await mkdir(path.join(root, 'build/assets'), { recursive: true });
    await writeFile(
      path.join(root, 'build/docs.html'),
      '<html>文档准备中</html>',
    );
    await writeFile(path.join(root, 'build/404.html'), '<html>404</html>');
    await writeFile(
      path.join(root, 'build/assets/content.js'),
      'const model="placeholder-model"',
    );
    await expect(
      checkArtifacts(root, {
        target: 'release',
        source: 'none',
        origin: 'https://example.test',
      }),
    ).rejects.toThrow('Mock 内容泄漏');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it('rejects cached CSS asset URLs from a different deployment prefix', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'modelsphere-css-prefix-'));
  try {
    await mkdir(path.join(root, 'build/assets'), { recursive: true });
    await writeFile(
      path.join(root, 'build/docs.html'),
      '<html>文档准备中</html>',
    );
    await writeFile(
      path.join(root, 'build/assets/styles.css'),
      '@font-face{src:url(/assets/fonts/example.woff2)}',
    );
    await expect(
      checkArtifacts(root, {
        target: 'release',
        source: 'none',
        origin: 'https://example.test',
        baseUrl: '/project/',
      }),
    ).rejects.toThrow('CSS 静态资源缺少部署前缀');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
