import { translate } from '@docusaurus/Translate';
import React from 'react';
import Link from '@docusaurus/Link';
import styles from './GainMeter.module.css';

export default function GainMeter({
  value,
  label,
  valueHref,
  valueLabel,
  layout = 'stacked',
  max = 100,
}: {
  value: number | null;
  label?: React.ReactNode;
  valueHref?: string;
  valueLabel?: string;
  layout?: 'stacked' | 'inline';
  max?: number;
}) {
  const bounded = (number: number) => Math.max(0, Math.min(100, number));
  const progress = bounded(((value ?? 0) / (max > 0 ? max : 100)) * 100);
  const text =
    value == null
      ? translate({ id: 'site.756762e293f2', message: '未提供' })
      : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  return (
    <div
      className={`${styles.meter}${layout === 'inline' ? ` ${styles.inline}` : ''}`}
      data-gain-value={value ?? undefined}
      style={
        {
          '--gain-progress': `${progress}%`,
          '--gain-value-progress': `${bounded(value ?? 0)}%`,
        } as React.CSSProperties
      }
    >
      {label && <span className={styles.label}>{label}</span>}
      {value != null && valueHref ? (
        <Link className={styles.value} to={valueHref} aria-label={valueLabel}>
          <strong>{text}</strong>
        </Link>
      ) : (
        <strong
          className={`${styles.value}${value == null ? ` ${styles.missing}` : ''}`}
        >
          {text}
        </strong>
      )}
      {value != null && (
        <div className={styles.bar} data-gain-bar aria-hidden="true">
          <span />
        </div>
      )}
    </div>
  );
}
