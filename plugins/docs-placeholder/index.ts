import type { Plugin } from '@docusaurus/types';
export default function docsPlaceholder(): Plugin {
  return {
    name: 'docs-placeholder',
    async contentLoaded({ actions }) {
      actions.addRoute({
        path: '/docs',
        component: '@site/src/components/DocsPreparing/index.tsx',
        exact: true,
      });
    },
  };
}
