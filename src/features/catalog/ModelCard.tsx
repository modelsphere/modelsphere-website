import React from 'react';
import Link from '@docusaurus/Link';
import {
  detailHref,
  modelHref,
  reportUrl,
  role,
  type ModelSummary,
} from './data';
import { reportHref } from './routes';
import styles from './styles.module.css';

interface Props {
  summary: ModelSummary;
  version: string;
  returnTo?: string;
}

export function ModelTuning({ summary, version, returnTo }: Props) {
  const best = summary.best;
  const baseline =
    best &&
    summary.recipes.find(
      (r) => r.variant.id === best.tuning.baseline.split('@')[0],
    );
  const gain = best
    ? `${best.gain >= 0 ? '+' : ''}${best.gain.toFixed(1)}%`
    : '未提供';
  return (
    <div className={styles.modelTuning}>
      <div
        className={styles.gain}
        style={
          {
            '--gain-progress': `${Math.max(0, Math.min(100, best?.gain ?? 0))}%`,
          } as React.CSSProperties
        }
      >
        <div>
          <span>调优配方最佳提升</span>
          {best && reportUrl(best.recipe) ? (
            <Link
              className={styles.gainLink}
              to={reportHref(best.recipe, version, returnTo)}
              aria-label={`查看 ${best.recipe.variant.id} 性能对照`}
            >
              <strong>{gain}</strong>
            </Link>
          ) : (
            <strong className={best ? undefined : styles.unavailableGain}>
              {gain}
            </strong>
          )}
        </div>
        {best && (
          <div className={styles.bar}>
            <span />
          </div>
        )}
        {best && (
          <p className={styles.measurement}>
            {best.workload ? `${best.workload} tokens` : '负载未提供'} · 测于 v
            {best.tuning.optimized.split('@')[1] || '未提供'}
          </p>
        )}
      </div>
      <dl className={styles.modelTuningFacts}>
        <div>
          <dt>调优配方</dt>
          <dd>
            {best ? (
              <Link
                to={detailHref(
                  best.recipe,
                  version,
                  best.tuning.optimized.split('@')[1],
                  returnTo,
                )}
              >
                {best.tuning.optimized}
              </Link>
            ) : (
              '未提供'
            )}
          </dd>
        </div>
        <div>
          <dt>Baseline</dt>
          <dd>
            {baseline && best ? (
              <Link
                to={detailHref(
                  baseline,
                  version,
                  best.tuning.baseline.split('@')[1],
                  returnTo,
                )}
              >
                {best.tuning.baseline || '未提供'}
              </Link>
            ) : (
              best?.tuning.baseline || '未提供'
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function ModelRecipeList({ summary, version, returnTo }: Props) {
  return summary.recipes.length ? (
    <ul className={styles.modelRecipeList}>
      {summary.recipes.map((r) => (
        <li key={r.key}>
          <Link to={detailHref(r, version, undefined, returnTo)}>
            {r.variant.id}
          </Link>
          <span>
            {role(r) === 'optimized'
              ? '已调优'
              : role(r) === 'baseline'
                ? '基线'
                : '部署配方'}
          </span>
        </li>
      ))}
    </ul>
  ) : (
    <p className={styles.measurement}>暂无配方</p>
  );
}

export default function ModelCard(props: Props) {
  const { summary, version, returnTo } = props;
  const { model } = summary;
  return (
    <article
      className={`${styles.recipeCard} ${styles.modelCard}`}
      data-model-id={model.name}
    >
      <div className={styles.cardBody}>
        <div className={styles.cardHeading}>
          <div>
            <p className={styles.kicker}>{model.family || '模型'}</p>
            <h2>
              <Link
                to={modelHref(model, version, returnTo)}
                title={model.displayName || model.name}
              >
                {model.displayName || model.name}
              </Link>
            </h2>
          </div>
          <span className={styles.recipeCount}>
            <span>可用配方</span> <strong>{summary.recipes.length}</strong>
          </span>
        </div>
        <p className={styles.description}>
          {model.description || '暂无模型说明。'}
        </p>
        <ModelTuning {...props} />
      </div>
      <div className={styles.cardFooter}>
        <Link
          className={styles.secondary}
          to={modelHref(model, version, returnTo)}
        >
          查看模型详情
        </Link>
      </div>
    </article>
  );
}
