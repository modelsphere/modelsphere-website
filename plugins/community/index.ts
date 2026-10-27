import type { LoadContext, Plugin } from '@docusaurus/types';
import { readCommunity } from '../../scripts/community-content';
import { resolveBuildMode } from '../../src/lib/build-mode';
import type { CommunityIndex } from '../../src/features/community/types';

export default function community(
  context: LoadContext,
): Plugin<CommunityIndex> {
  return {
    name: 'community-content',
    getPathsToWatch() {
      return [`${context.siteDir}/content/community/**/*.{yaml,md}`];
    },
    loadContent() {
      return readCommunity(
        context.siteDir,
        resolveBuildMode(process.env).target !== 'release',
      );
    },
    async contentLoaded({ content, actions }) {
      actions.setGlobalData(content);
    },
  };
}
