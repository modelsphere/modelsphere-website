import type { Plugin } from '@docusaurus/types';
import type { LoadContext } from '@docusaurus/types';
export default function docsPlaceholder(context: LoadContext): Plugin {
  return {
    name: 'docs-placeholder',
    async contentLoaded({ actions }) {
      actions.addRoute({
        path: `${context.baseUrl}docs`,
        component: '@site/src/components/DocsPreparing/index.tsx',
        exact: true,
      });
    },
  };
}
