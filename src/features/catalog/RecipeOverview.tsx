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
  '50k + 1.5k': 'Agent 长上下文',
  '8k + 1k': '文档问答',
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
    : '未提供';
  const facts: [string, React.ReactNode][] = [
    [
      '版本',
      <>
        {variant.version}
        <small>
          {variant.releaseDate
            ? `发布于 ${variant.releaseDate}`
            : '发布日期未提供'}
        </small>
      </>,
    ],
    ['引擎', variant.engine || '未提供'],
    [
      '硬件',
      <>
        {hardwareText(variant)}
        {variant.requires.gpuProduct.length > 0 && (
          <small>{variant.requires.gpuProduct.join(' / ')}</small>
        )}
      </>,
    ],
    ['拓扑', topologyLabel(variant)],
    [
      'Chart',
      [variant.chart.name, variant.chart.version].filter(Boolean).join(' ') ||
        '未提供',
    ],
    ['镜像', <code>{imageText}</code>],
    ['服务名称', <code>{variant.servedName || '未提供'}</code>],
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
      aria-label="配方概览"
    >
      <div className={styles.detailTop}>
        <div>
          <h1 className={styles.recipeTitle}>{variant.id}</h1>
          <div className={styles.recipeBadges}>
            {isDefault(recipe) && (
              <span className={styles.badge}>默认配方</span>
            )}
            <span
              className={
                badge === 'optimized' ? styles.optimized : styles.badge
              }
            >
              {badge === 'optimized'
                ? '已调优'
                : badge === 'baseline'
                  ? '基线'
                  : '部署配方'}
            </span>
          </div>
          <p>
            {model.displayName ?? model.name} · 当前配方版本 {variant.version}
          </p>
        </div>
        <Link to={modelHref(model, version, returnTo)}>全部模型配方 →</Link>
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
            : [{ name: '记录提升', uplift: tuning.uplift }];
        return (
          <section
            key={`${tuning.baseline}:${tuning.optimized}:${index}`}
            className={styles.recipeComparison}
            aria-label={`配方调优对照 ${index + 1}`}
          >
            <div className={styles.comparisonHeading}>
              <h2>
                相对{' '}
                {baseline ? (
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
                  tuning.baseline || '未提供的基线'
                )}{' '}
                的提升
              </h2>
              {report && (
                <a href={report} target="_blank" rel="noreferrer">
                  完整对照报告 ↗
                </a>
              )}
            </div>
            <p className={styles.measurement}>测量版本：{tuning.optimized}</p>
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
              <p className={styles.measurement}>负载提升未提供</p>
            )}
          </section>
        );
      })}
      <SourceLinks r={recipe} includeReport={false} />
    </header>
  );
}
