import { translateCopy } from '@site/src/lib/translate-copy';
import Translate, { translate } from '@docusaurus/Translate';
import React from 'react';
import Link from '@docusaurus/Link';
import {
  detailHref,
  hardwareText,
  isDefault,
  modelHref,
  reportUrl,
  role,
  topologyLabel,
  type Recipe,
} from './data';
import { SourceLinks } from './components';
import styles from './styles.module.css';
import GainMeter from './GainMeter';

const workloadNames: Record<string, string> = {
  '50k + 1.5k': translate({
    id: 'site.906efc483453',
    message: 'Agent 长上下文',
  }),
  '8k + 1k': translate({ id: 'site.fa9ed6964a12', message: '文档问答' }),
};

export default function RecipeOverview({
  recipe,
  recipes,
  version,
  returnTo,
}: {
  recipe: Recipe;
  recipes: Recipe[];
  version: string;
  returnTo: string;
}) {
  const { model, variant } = recipe;
  const badge = role(recipe);
  const image = variant.image;
  const imageText = image
    ? `${image.repository}${image.tag ? `:${image.tag}` : image.digest ? `@${image.digest}` : ''}`
    : translate({ id: 'site.756762e293f2', message: '未提供' });
  const facts: [string, React.ReactNode][] = [
    [
      translate({ id: 'site.5f76b2bf82dd', message: '版本' }),
      <>
        {variant.version}
        <small>
          {variant.releaseDate
            ? translate(
                { id: 'site.41e48aedb06d', message: '发布于 {v0}' },
                { v0: variant.releaseDate },
              )
            : translate({ id: 'site.a2d8188544aa', message: '发布日期未提供' })}
        </small>
      </>,
    ],
    [
      translate({ id: 'site.78a7f252a6cb', message: '引擎' }),
      variant.engine ||
        translate({ id: 'site.756762e293f2', message: '未提供' }),
    ],
    [
      translate({ id: 'site.a0e5308a1627', message: '硬件' }),
      <>
        {translateCopy(hardwareText(variant))}
        {variant.requires.gpuProduct.length > 0 && (
          <small>{variant.requires.gpuProduct.join(' / ')}</small>
        )}
      </>,
    ],
    [
      translate({ id: 'site.a4ec8620a91e', message: '拓扑' }),
      translate({ message: topologyLabel(variant) }),
    ],
    [
      'Chart',
      [variant.chart.name, variant.chart.version].filter(Boolean).join(' ') ||
        translate({ id: 'site.756762e293f2', message: '未提供' }),
    ],
    [
      translate({ id: 'site.176c09844e0f', message: '镜像' }),
      <code>{imageText}</code>,
    ],
    [
      translate({ id: 'site.5df7bfb4b708', message: '服务名称' }),
      <code>
        {variant.servedName ||
          translate({ id: 'site.756762e293f2', message: '未提供' })}
      </code>,
    ],
  ];
  const scale = Math.max(
    1,
    ...recipe.tuning.flatMap((tuning) =>
      tuning.workloads.length
        ? tuning.workloads.map((workload) => workload.uplift)
        : [tuning.uplift ?? 0],
    ),
  );
  return (
    <header
      className={`${styles.detailBox} ${styles.recipeOverview}`}
      aria-label={translate({ id: 'site.9770f40287d5', message: '配方概览' })}
    >
      <div className={styles.detailTop}>
        <div>
          <h1 className={styles.recipeTitle}>{variant.id}</h1>
          <div className={styles.recipeBadges}>
            {isDefault(recipe) && (
              <span className={styles.badge}>
                {translate({ id: 'site.bb88a59baf57', message: '默认配方' })}
              </span>
            )}
            <span
              className={
                badge === 'optimized' ? styles.optimized : styles.badge
              }
            >
              {badge === 'optimized'
                ? translate({ id: 'site.c805b06152c6', message: '已调优' })
                : badge === 'baseline'
                  ? translate({ id: 'site.a7ac587ab52d', message: '基线' })
                  : translate({ id: 'site.8be3a0d72f4d', message: '部署配方' })}
            </span>
          </div>
          <p>
            {model.displayName ?? model.name}{' '}
            {translate({
              id: 'site.c40529702643',
              message: ' · 当前配方版本 ',
            })}
            {variant.version}
          </p>
        </div>
        <Link to={modelHref(model, version, returnTo)}>
          {translate({ id: 'site.8df99bc0b742', message: '全部模型配方 →' })}
        </Link>
      </div>
      {variant.description && <p>{variant.description}</p>}
      <dl className={styles.recipeFacts}>
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {recipe.tuning.map((tuning, index) => {
        const baseline = recipes.find(
          (r) => r.variant.id === tuning.baseline.split('@')[0],
        );
        const report = reportUrl(recipe, tuning);
        const rows = tuning.workloads.length
          ? tuning.workloads
          : tuning.uplift == null
            ? []
            : [
                {
                  name: translate({
                    id: 'site.56add17b2bb0',
                    message: '记录提升',
                  }),
                  uplift: tuning.uplift,
                },
              ];
        return (
          <section
            key={`${tuning.baseline}:${tuning.optimized}:${index}`}
            className={styles.recipeComparison}
            aria-label={translate(
              { id: 'site.e94a27ab8271', message: '配方调优对照 {v0}' },
              { v0: index + 1 },
            )}
          >
            <div className={styles.comparisonHeading}>
              <h2>
                <Translate
                  id="catalog.gainRelativeToBaseline"
                  values={{
                    baseline: baseline ? (
                      <Link
                        to={detailHref(
                          baseline,
                          version,
                          tuning.baseline.split('@')[1],
                          returnTo,
                        )}
                      >
                        {tuning.baseline}
                      </Link>
                    ) : (
                      tuning.baseline ||
                      translate({
                        id: 'site.ed4a64a60515',
                        message: '未提供的基线',
                      })
                    ),
                  }}
                >
                  {'相对 {baseline} 的提升'}
                </Translate>
              </h2>
              {report && (
                <a href={report} target="_blank" rel="noreferrer">
                  {translate({
                    id: 'site.44af1f54feba',
                    message: '完整对照报告 ↗',
                  })}
                </a>
              )}
            </div>
            <p className={styles.measurement}>
              {translate({ id: 'site.17a62f0d45c5', message: '测量版本：' })}
              {tuning.optimized}
            </p>
            {rows.length ? (
              <ul className={styles.workloadRows}>
                {rows.map((workload, row) => (
                  <li key={`${workload.name}:${row}`}>
                    <span>
                      {workloadNames[workload.name] || workload.name}
                      {workloadNames[workload.name] && (
                        <small>{workload.name} tokens</small>
                      )}
                    </span>
                    <GainMeter
                      value={workload.uplift}
                      max={scale}
                      layout="inline"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.measurement}>
                {translate({
                  id: 'site.e5c17efe9ee8',
                  message: '负载提升未提供',
                })}
              </p>
            )}
          </section>
        );
      })}
      <SourceLinks r={recipe} includeReport={false} />
    </header>
  );
}
