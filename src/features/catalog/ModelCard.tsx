import { translate } from '@docusaurus/Translate';
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
import GainMeter from './GainMeter';

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
  return (
    <div className={styles.modelTuning}>
      <div className={styles.gain}>
        <GainMeter
          value={best?.gain ?? null}
          label={translate({
            id: 'site.9d6b32790955',
            message: '调优配方最佳提升',
          })}
          valueHref={
            best && reportUrl(best.recipe)
              ? reportHref(best.recipe, version, returnTo)
              : undefined
          }
          valueLabel={
            best
              ? translate(
                  { id: 'site.50123e2643ec', message: '查看 {v0} 性能对照' },
                  { v0: best.recipe.variant.id },
                )
              : undefined
          }
        />
        {best && (
          <p className={styles.measurement}>
            {best.workload
              ? `${best.workload} tokens`
              : translate({
                  id: 'site.26e392942cda',
                  message: '负载未提供',
                })}{' '}
            {translate({ id: 'site.54130614ce4a', message: ' · 测于 v' })}
            {best.tuning.optimized.split('@')[1] ||
              translate({ id: 'site.756762e293f2', message: '未提供' })}
          </p>
        )}
      </div>
      <dl className={styles.modelTuningFacts}>
        <div>
          <dt>{translate({ id: 'site.23727d36d91b', message: '调优配方' })}</dt>
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
              translate({ id: 'site.756762e293f2', message: '未提供' })
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
                {best.tuning.baseline ||
                  translate({ id: 'site.756762e293f2', message: '未提供' })}
              </Link>
            ) : (
              best?.tuning.baseline ||
              translate({ id: 'site.756762e293f2', message: '未提供' })
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
              ? translate({ id: 'site.c805b06152c6', message: '已调优' })
              : role(r) === 'baseline'
                ? translate({ id: 'site.a7ac587ab52d', message: '基线' })
                : translate({ id: 'site.8be3a0d72f4d', message: '部署配方' })}
          </span>
        </li>
      ))}
    </ul>
  ) : (
    <p className={styles.measurement}>
      {translate({ id: 'site.ea677bf1a4fc', message: '暂无配方' })}
    </p>
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
            <p className={styles.kicker}>
              {model.family ||
                translate({ id: 'site.c98e118e0a43', message: '模型' })}
            </p>
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
            <span>
              {translate({ id: 'site.c5591decc296', message: '可用配方' })}
            </span>{' '}
            <strong>{summary.recipes.length}</strong>
          </span>
        </div>
        <p className={styles.description}>
          {model.description ||
            translate({ id: 'site.4acb91dda8b7', message: '暂无模型说明。' })}
        </p>
        <ModelTuning {...props} />
      </div>
      <div className={styles.cardFooter}>
        <Link
          className={styles.secondary}
          to={modelHref(model, version, returnTo)}
        >
          {translate({ id: 'site.53d096fa52c4', message: '查看模型详情' })}
        </Link>
      </div>
    </article>
  );
}
