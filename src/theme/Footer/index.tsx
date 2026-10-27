import React from 'react';
import { CommunityFooter } from '@site/src/features/community/components';
import { useThemeConfig } from '@docusaurus/theme-common';

export default function Footer() {
  const { footer } = useThemeConfig();
  return footer ? <CommunityFooter /> : null;
}
