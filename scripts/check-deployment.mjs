import { setTimeout } from 'node:timers/promises';

const [address, commit] = process.argv.slice(2);
if (!address || !/^[a-f0-9]{40}$/.test(commit ?? ''))
  throw new Error(
    'Usage: node scripts/check-deployment.mjs <site-url> <commit>',
  );
const base = new URL(address.endsWith('/') ? address : address + '/');
let deployed = false;
for (let attempt = 0; attempt < 24; attempt++) {
  try {
    const response = await fetch(
      new URL(`version.json?commit=${commit}`, base),
      { signal: AbortSignal.timeout(10000) },
    );
    const version = response.ok ? await response.json() : null;
    if (
      version?.commit === commit &&
      version.target === 'release' &&
      version.baseUrl === base.pathname
    ) {
      deployed = true;
      break;
    }
  } catch {
    /* Wait for the new Pages deployment to propagate. */
  }
  await setTimeout(5000);
}
if (!deployed) throw new Error(`Deployed version does not match ${commit}`);
for (const route of [
  '',
  'models',
  'models/detail?modelId=mimo-v2.5',
  'models/recipe?modelId=mimo-v2.5',
  'blog',
  'docs',
  'community',
]) {
  const response = await fetch(new URL(route, base), {
    signal: AbortSignal.timeout(15000),
  });
  if (response.status !== 200)
    throw new Error(`${route}: HTTP ${response.status}`);
  const html = await response.text();
  if (!html.includes('<html')) throw new Error(`${route}: missing HTML`);
  const assets = [
    ...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css|png)(?:\?[^" ]*)?)"/g),
  ].map((match) => new URL(match[1], base));
  for (const asset of new Map(
    assets
      .filter((url) => url.origin === base.origin)
      .map((url) => [url.href, url]),
  ).values()) {
    if (!asset.pathname.startsWith(base.pathname))
      throw new Error(`Asset escapes deployment path: ${asset}`);
    const result = await fetch(asset, { signal: AbortSignal.timeout(15000) });
    if (!result.ok)
      throw new Error(`Asset failed: ${asset} (${result.status})`);
    await result.arrayBuffer();
  }
}
if (
  (
    await fetch(new URL('missing-deployment-route', base), {
      signal: AbortSignal.timeout(15000),
    })
  ).status !== 404
)
  throw new Error('Unknown routes must return HTTP 404');
console.log(`Deployment verified: ${base.href} @ ${commit}`);
