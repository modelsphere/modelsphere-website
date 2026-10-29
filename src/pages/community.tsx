import { translate } from '@docusaurus/Translate';
import React from 'react';
import Layout from '@theme/Layout';
import { CommunityContent } from '@site/src/features/community/components';
import styles from './community.module.css';

export default function Community() {
  return (
    <Layout
      title={translate({ id: 'site.01cca2c2836f', message: '社区生态' })}
      description={translate({
        id: 'site.cbb8c5a8bdb7',
        message: '参与ModelSphere开源社区，共同推动AI基础设施发展。',
      })}
      wrapperClassName={styles.page}
    >
      <CommunityContent />
    </Layout>
  );
}
