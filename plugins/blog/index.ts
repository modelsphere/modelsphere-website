import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pluginContentBlog, {
  validateOptions,
} from '@docusaurus/plugin-content-blog';
import type { PluginOptions } from '@docusaurus/plugin-content-blog';
import type { LoadContext } from '@docusaurus/types';
import type { BlogIndex } from '../../src/features/blog/types';
export { validateOptions };
// Keep the official Markdown/detail pipeline, replacing the list's body imports
// with our independently validated summary index at the public route boundary.
export default async function blog(
  context: LoadContext,
  options: PluginOptions,
) {
  const plugin = await pluginContentBlog(context, options);
  const contentLoaded = plugin.contentLoaded;
  return {
    ...plugin,
    async contentLoaded(
      args: Parameters<NonNullable<typeof contentLoaded>>[0],
    ) {
      const index: BlogIndex = JSON.parse(
        await readFile(
          path.join(
            context.siteDir,
            context.i18n.currentLocale === 'en'
              ? '.generated/blog-index.en.json'
              : '.generated/blog-index.json',
          ),
          'utf8',
        ),
      );
      args.actions.setGlobalData(index);
      let listAdded = false;
      await contentLoaded?.({
        ...args,
        actions: {
          ...args.actions,
          addRoute(route) {
            if (route.path === `${context.baseUrl}blog`) {
              listAdded = true;
              args.actions.addRoute({ ...route, modules: {}, props: {} });
            } else args.actions.addRoute(route);
          },
        },
      });
      if (!listAdded)
        args.actions.addRoute({
          path: `${context.baseUrl}blog`,
          component: options.blogListComponent,
          exact: true,
        });
    },
  };
}
