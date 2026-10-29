import { translate } from '@docusaurus/Translate';
import React, { useId } from 'react';
import { safeUrl, type Model } from './data';
import styles from './styles.module.css';

export function ModelOverviewCard({
  model,
  headingLevel = 1,
}: {
  model: Model;
  headingLevel?: 1 | 2;
}) {
  const titleId = useId();
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <header className={styles.modelOverview} aria-labelledby={titleId}>
      <Heading id={titleId} className={styles.modelOverviewTitle}>
        {model.displayName ?? model.name}
      </Heading>
      <p className={styles.modelOverviewDescription}>
        {model.description ??
          translate({ id: 'site.4acb91dda8b7', message: '暂无模型说明。' })}
      </p>
      <div className={styles.modelOverviewFooter}>
        <div className={`${styles.chips} ${styles.modelOverviewTags}`}>
          {model.family && <span>{model.family}</span>}
          {model.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        {model.source?.hf && (
          <a
            className={styles.modelOverviewSource}
            href={safeUrl(`https://huggingface.co/${model.source.hf}`) ?? '#'}
            target="_blank"
            rel="noreferrer"
          >
            <span>
              {translate({
                id: 'site.punctuation.huggingFace',
                message: 'Hugging Face：',
              })}
              {model.source.hf}
            </span>
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </header>
  );
}
