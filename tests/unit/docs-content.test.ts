import { describe, it, expect } from 'vitest';
import {
  parseDoc,
  validateCollection,
  readMockDocs,
} from '../../scripts/check-docs';
function text(body: string, id = 'example-one', slug = '/') {
  return `---\nid: ${id}\ntitle: Title\ndescription: Description\nslug: ${slug}\nsidebar_position: 1\n---\n${body}`;
}
describe('Markdown boundary', () => {
  it('accepts the two real fixtures and their relative links', async () => {
    expect(await readMockDocs(process.cwd())).toHaveLength(2);
  });
  it.each([
    '<script>alert(1)</script>',
    '<Component />',
    'import X from "x"',
    '{process.env.SECRET}',
    '<div>raw html</div>',
  ])('rejects executable content: %s', (body) => {
    expect(() => parseDoc('overview.md', text(body))).toThrow();
  });
  it('preserves executable-looking text within code fences', () => {
    expect(() =>
      parseDoc(
        'overview.md',
        text('```jsx\n<Component />\n{process.env.SECRET}\n```'),
      ),
    ).not.toThrow();
  });
  it('rejects unsupported directives and duplicated h1', () => {
    expect(() =>
      parseDoc('overview.md', text(':::custom\ncontent\n:::')),
    ).toThrow();
    expect(() => parseDoc('overview.md', text('# Duplicate title'))).toThrow();
    expect(() =>
      parseDoc('overview.md', text(':::info{style="color:red"}\ncontent\n:::')),
    ).toThrow();
  });
  it.each([
    'javascript:alert%281%29',
    'data:text/html,x',
    'file:///etc/passwd',
    '../outside.md',
    '%2e%2e%2foutside.md',
    '//example.test',
  ])('rejects unsafe destination %s', (url) => {
    const doc = parseDoc('overview.md', text(`[link](${url})`));
    expect(() => validateCollection([doc])).toThrow();
  });
  it('checks destination headings and repeated slugs', () => {
    const a = parseDoc('overview.md', text('[next](quickstart.md#missing)'));
    const b = parseDoc(
      'quickstart.md',
      text('## Valid', 'example-two', '/quickstart'),
    );
    expect(() => validateCollection([a, b])).toThrow('锚点');
    expect(() => validateCollection([b, b])).toThrow('重复');
  });
  it('rejects malformed or ambiguous frontmatter', () => {
    expect(() => parseDoc('overview.md', 'no frontmatter')).toThrow();
    expect(() =>
      parseDoc(
        'overview.md',
        text('text').replace('title: Title', 'title: Title\ntitle: Other'),
      ),
    ).toThrow();
  });
});
