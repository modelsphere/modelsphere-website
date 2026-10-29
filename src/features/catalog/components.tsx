import React, { useId, useState } from 'react';
import Link from '@docusaurus/Link';
import {
  baselineInfo,
  config,
  detailHref,
  hardwareText,
  isDefault,
  modelHref,
  reportUrl,
  role,
  sourceUrl,
  stats,
  topologyLabel,
  type Catalog,
  type Recipe,
} from './data';
import { reportHref } from './routes';
import styles from './styles.module.css';
import GainMeter from './GainMeter';

export function Icon({
  name,
}: {
  name:
    | 'search'
    | 'copy'
    | 'grid'
    | 'table'
    | 'tune'
    | 'arrow'
    | 'box'
    | 'code'
    | 'compare'
    | 'report'
    | 'chip'
    | 'speed'
    | 'rocket'
    | 'chevron';
}) {
  const paths = {
    speed: (
      <>
        <path d="M4 18a9 9 0 1 1 16 0M12 12l5-5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    rocket: (
      <>
        <path d="M9 15C7 9 13 3 21 3c0 8-6 14-12 12ZM9 9H5l-3 5h6m7 1v4l-5 3v-6M6 18l-3 3" />
        <circle cx="16" cy="8" r="2" />
      </>
    ),
    chevron: <path d="m6 9 6 6 6-6" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="3" width="12" height="15" rx="1" />
        <path d="M16 21H4V7" />
      </>
    ),
    grid: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />,
    table: <path d="M3 3h18v5H3zM3 11h18v4H3zM3 18h18v3H3z" />,
    tune: <path d="M3 6h18M3 12h18M3 18h18M8 3v6M16 9v6M8 15v6" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    box: (
      <>
        <path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9" />
      </>
    ),
    code: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m6 8 4 4-4 4m7 0h5" />
      </>
    ),
    compare: <path d="M3 8h14m-4-4 4 4-4 4m8 4H7m4-4-4 4 4 4" />,
    report: (
      <>
        <path d="M5 2h10l4 4v16H5zM15 2v5h4M8 12h8M8 16h8" />
      </>
    ),
    chip: (
      <>
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function SourceState({
  catalog,
  status,
  error,
  reload,
}: {
  catalog: Catalog;
  status: string;
  error: string;
  reload: () => void;
}) {
  return (
    <div className={styles.sourceState}>
      <span className={styles.sourceBadge}>
        <span aria-hidden="true">●</span>{' '}
        {status === 'live'
          ? '公开目录'
          : catalog.commit === baselineInfo.dataCommit
            ? '构建基线'
            : '已缓存目录'}{' '}
        · {catalog.commit.slice(0, 7)}
      </span>
      <span>
        {status === 'loading'
          ? '正在读取当前数据…'
          : status === 'live'
            ? 'Model Catalog'
            : catalog.commit === baselineInfo.dataCommit
              ? '基线读取于 ' + baselineInfo.retrievedAt.slice(0, 10)
              : '保留所选版本的数据副本'}
      </span>
      {error && (
        <span className={styles.error} role="status">
          {error} <button onClick={reload}>重试</button>
        </span>
      )}
    </div>
  );
}
export function Stats({ catalog }: { catalog: Catalog }) {
  const s = stats(catalog);
  const percent = (value: number | null) =>
    value == null ? '未提供' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  const items = [
    ['MODELS', s.models, '模型总数', 'box'],
    ['RECIPES', s.recipes, s.engines, 'code'],
    [
      'OPTIMIZED PAIRS',
      s.optimizedPairs,
      `覆盖 ${s.optimizedCoverage}% 模型`,
      'compare',
    ],
    [
      'MEDIAN IMPROVEMENT',
      percent(s.medianImprovement),
      s.minImprovement == null
        ? '暂无有效提升记录'
        : `最佳负载 · 范围 ${percent(s.minImprovement)} 至 ${percent(s.bestImprovement)}`,
      'speed',
    ],
    [
      'BEST IMPROVEMENT',
      percent(s.bestImprovement),
      s.bestRecipe ? (
        <Link to={reportHref(s.bestRecipe, catalog.commit)}>
          {s.bestRecipe.model.name} · {s.bestRecipe.variant.id}
        </Link>
      ) : (
        '暂无有效提升记录'
      ),
      'rocket',
    ],
  ] as const;
  return (
    <section className={styles.stats} aria-label="目录统计">
      {items.map(([name, value, sub, icon]) => (
        <div className={styles.stat} key={name}>
          <div>
            <span>{name}</span>
            <Icon name={icon} />
          </div>
          <strong>{value}</strong>
          <small>{sub}</small>
        </div>
      ))}
    </section>
  );
}
export function CopyButton({
  getText,
  label = '复制完整配方',
}: {
  getText: () => Promise<string>;
  label?: string;
}) {
  const tooltipId = useId();
  const [tooltipDismissed, setTooltipDismissed] = useState(false);
  const [state, setState] = useState('');
  return (
    <span className={styles.copyWrap}>
      <button
        className={styles.copy}
        aria-label={label}
        aria-describedby={tooltipId}
        disabled={state === '复制中…'}
        onMouseEnter={() => setTooltipDismissed(false)}
        onFocus={() => setTooltipDismissed(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setTooltipDismissed(true);
        }}
        onClick={async () => {
          setState('复制中…');
          try {
            const text = await getText();
            if (!navigator.clipboard) throw new Error();
            await navigator.clipboard.writeText(text);
            setState('已复制');
            setTimeout(() => setState(''), 2000);
          } catch {
            setState('复制失败，请在详情中手动选择');
          }
        }}
      >
        <Icon name="copy" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={styles.copyTooltip}
        hidden={Boolean(state) || tooltipDismissed}
      >
        {label}
      </span>
      <span className={styles.copyStatus} role="status">
        {state}
      </span>
    </span>
  );
}
export function RecipeCard({
  r,
  version,
  returnTo,
  copy,
  context = 'catalog',
}: {
  r: Recipe;
  version: string;
  returnTo?: string;
  copy: () => Promise<string>;
  context?: 'catalog' | 'model';
}) {
  const badge = role(r);
  const Heading = context === 'model' ? 'h3' : 'h2';
  return (
    <article
      className={`${styles.recipeCard}${context === 'model' ? ` ${styles.modelRecipe}` : ''}`}
      data-recipe-id={r.key}
    >
      <div className={styles.cardBody}>
        <div className={styles.cardHeading}>
          <div>
            <p className={styles.kicker}>
              {r.model.family ?? '模型'}{' '}
              <span>· {topologyLabel(r.variant)}</span>
            </p>
            <Heading>
              <Link
                to={detailHref(r, version, undefined, returnTo)}
                title={r.variant.id}
              >
                {r.variant.id}
              </Link>
            </Heading>
          </div>
          <span
            className={badge === 'optimized' ? styles.optimized : styles.badge}
          >
            {badge === 'optimized'
              ? '已调优'
              : badge === 'baseline'
                ? '基线'
                : '部署配方'}
          </span>
        </div>
        <dl className={styles.recipeModel}>
          <div>
            <dt>模型</dt>
            <dd>
              <Link to={modelHref(r.model, version, returnTo)}>
                {r.model.displayName || r.model.name}
              </Link>
            </dd>
          </div>
        </dl>
        <div className={styles.gain}>
          <GainMeter
            value={r.quotedGain}
            label="吞吐量提升"
            valueHref={
              reportUrl(r) ? reportHref(r, version, returnTo) : undefined
            }
            valueLabel={`查看 ${r.variant.id} 性能对照`}
          />
        </div>
        <div className={styles.chips}>
          <span>{hardwareText(r.variant)}</span>
          <span>{r.variant.engine}</span>
          {isDefault(r) && <span>默认配方</span>}
          {(r.model.deprecated || r.variant.deprecated) && <span>已弃用</span>}
        </div>
        <p className={styles.description}>
          {r.variant.description ?? r.model.description ?? '暂无说明。'}
        </p>
        {r.quotedGain != null && (
          <p className={styles.measurement}>
            {r.workload ?? '负载未提供'}
            {r.workload ? ' tokens' : ''} · 测于 v
            {r.tuning[0]?.optimized.split('@')[1] ?? '未提供'}
          </p>
        )}
      </div>
      <div className={styles.cardFooter}>
        <dl>
          <div>
            <dt>Engine</dt>
            <dd>{r.variant.engine}</dd>
          </div>
          <div>
            <dt>Chart</dt>
            <dd>
              {r.variant.chart.name} {r.variant.chart.version ?? '未提供'}
            </dd>
          </div>
          <div>
            <dt>Image</dt>
            <dd>
              {r.variant.image
                ? `${r.variant.image.repository}:${r.variant.image.tag ?? '标签未提供'}`
                : '未提供'}
            </dd>
          </div>
        </dl>
        <div className={styles.cardActions}>
          <Link
            className={styles.secondary}
            to={
              badge === 'optimized'
                ? reportHref(r, version, returnTo)
                : detailHref(r, version, undefined, returnTo)
            }
          >
            {badge === 'optimized' ? '查看对照报告' : '查看部署配置'}
          </Link>
          <CopyButton getText={copy} label="复制部署配置" />
        </div>
      </div>
    </article>
  );
}
export function SourceLinks({
  r,
  includeReport = true,
}: {
  r: Recipe;
  includeReport?: boolean;
}) {
  return (
    <div className={styles.actions}>
      <a href={sourceUrl(r.variant)} target="_blank" rel="noreferrer">
        查看配方文件 ↗
      </a>
      {includeReport && reportUrl(r) && (
        <a href={reportUrl(r)!} target="_blank" rel="noreferrer">
          查看性能报告 ↗
        </a>
      )}
      <a href={config.repository} target="_blank" rel="noreferrer">
        贡献配方 ↗
      </a>
    </div>
  );
}
