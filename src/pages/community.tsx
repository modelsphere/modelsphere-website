import React from 'react';
import Layout from '@theme/Layout';
import { CommunityContent } from '@site/src/features/community/components';
import styles from './community.module.css';

export default function Community() {
  return (
    <Layout
      title="社区生态"
      description="参与ModelSphere开源社区，共同推动AI基础设施发展。"
      wrapperClassName={styles.page}
    >
      <CommunityContent />
    </Layout>
  );
}
