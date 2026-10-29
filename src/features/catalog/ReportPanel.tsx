import React, { useEffect, useState } from 'react';
import { reportUrl, type Recipe } from './data';
import { loadReportDocument } from './report';
import styles from './styles.module.css';
export default function ReportPanel({
  r,
  commit,
}: {
  r: Recipe;
  commit: string;
}) {
  const [data, setData] = useState<string | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setData(null);
    setError('');
    loadReportDocument(r, commit, c.signal)
      .then((x) => {
        if (!c.signal.aborted) setData(x);
      })
      .catch(() => {
        if (!c.signal.aborted)
          setError('报告数据加载失败，请重试或查看完整报告。');
      });
    return () => c.abort();
  }, [r.key, commit, retry]);
  return (
    <section
      id="benchmark"
      className={styles.report}
      aria-labelledby="benchmark-title"
    >
      <div className={styles.reportHeader}>
        <div>
          <span className={styles.kicker}>PERFORMANCE REPORT</span>
          <h2 id="benchmark-title">基线与调优对照</h2>
          <p>
            {r.tuning[0]?.baseline} → {r.tuning[0]?.optimized}
          </p>
        </div>
        <a
          className={styles.primary}
          href={reportUrl(r)!}
          target="_blank"
          rel="noreferrer"
        >
          查看完整报告 ↗
        </a>
      </div>
      {error ? (
        <p role="status">
          {error} <button onClick={() => setRetry((n) => n + 1)}>重试</button>
        </p>
      ) : !data ? (
        <p role="status">正在读取报告数据…</p>
      ) : (
        <iframe
          className={styles.reportFrame}
          title="原始性能对照报告"
          srcDoc={data}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
        />
      )}
    </section>
  );
}
