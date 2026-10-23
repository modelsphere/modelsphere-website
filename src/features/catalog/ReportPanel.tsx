import React, { useEffect, useState } from 'react';
import { reportUrl, type Recipe } from './data';
import { loadReport, type ReportData } from './report';
import styles from './styles.module.css';
export default function ReportPanel({
  r,
  commit,
}: {
  r: Recipe;
  commit: string;
}) {
  const [data, setData] = useState<ReportData | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setData(null);
    setError('');
    loadReport(r, commit, c.signal)
      .then((x) => {
        if (!c.signal.aborted) setData(x);
      })
      .catch(() => {
        if (!c.signal.aborted)
          setError('结构化报告暂时不可用，仍可打开原报告。');
      });
    return () => c.abort();
  }, [r.key, commit, retry]);
  const runs = data
    ? [data.comparison.baseline, ...data.comparison.attempts]
    : [];
  return (
    <section
      id="benchmark"
      className={styles.report}
      aria-labelledby="benchmark-title"
    >
      <div className={styles.reportHeader}>
        <div>
          <span className={styles.kicker}>
            PERFORMANCE REPORT · 来源实测记录
          </span>
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
          打开完整原报告 ↗
        </a>
      </div>
      <p className={styles.notice}>
        记录来自公开报告，包含其特定负载与配置；不代表生产认证或跨配方统一性能排名。
      </p>
      {error ? (
        <p role="status">
          {error} <button onClick={() => setRetry((n) => n + 1)}>重试</button>
        </p>
      ) : !data ? (
        <p role="status">正在读取报告数据…</p>
      ) : (
        <>
          <div className={styles.conditionGrid}>
            {runs.map((run, i) => (
              <div key={i}>
                <strong>{i === 0 ? '基线配置' : `候选配置 ${i}`}</strong>
                <dl>
                  <div>
                    <dt>加速器</dt>
                    <dd>{run.environment?.gpu_name ?? '未提供'}</dd>
                  </div>
                  <div>
                    <dt>GPU 数量</dt>
                    <dd>{run.launch?.cards ?? '未提供'}</dd>
                  </div>
                  <div>
                    <dt>CUDA</dt>
                    <dd>{run.environment?.cuda_version ?? '未提供'}</dd>
                  </div>
                  <div>
                    <dt>Engine</dt>
                    <dd>
                      {run.environment?.engine_version ??
                        run.launch?.config?.engine ??
                        '未提供'}
                    </dd>
                  </div>
                  <div>
                    <dt>测量开始</dt>
                    <dd>{run.environment?.started_at ?? '未提供'}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
          <div className={styles.tableScroll}>
            <table>
              <caption>源报告记录的负载与 SLO 条件；缺失字段不推断</caption>
              <thead>
                <tr>
                  <th>负载</th>
                  <th>输入 tokens</th>
                  <th>输出 tokens</th>
                  <th>TTFT 门槛</th>
                  <th>单请求输出速度下限</th>
                </tr>
              </thead>
              <tbody>
                {(data.comparison.benchmark?.modules ?? [])
                  .filter((m) => m.params?.input_tokens != null)
                  .map((m) => (
                    <tr key={m.key}>
                      <th>{m.key}</th>
                      <td>{String(m.params?.input_tokens ?? '未提供')}</td>
                      <td>{String(m.params?.output_tokens ?? '未提供')}</td>
                      <td>
                        {m.params?.slo_max_ttft_ms == null
                          ? '未提供'
                          : `${m.params.slo_ttft_percentile ?? '分位未提供'} ≤ ${m.params.slo_max_ttft_ms} ms`}
                      </td>
                      <td>
                        {m.params?.slo_min_request_output_tps == null
                          ? '未提供'
                          : `${m.params.slo_min_request_output_tps} tokens/s`}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className={styles.tableScroll}>
            <table>
              <caption>
                元数据中保存的提升比例引用；完整吞吐、延迟、质量与计算口径请阅读原报告
              </caption>
              <thead>
                <tr>
                  <th>负载（输入 + 输出 tokens）</th>
                  <th>源记录增幅</th>
                  <th>测量版本</th>
                </tr>
              </thead>
              <tbody>
                {r.tuning.flatMap((t) =>
                  t.workloads.map((w) => (
                    <tr key={t.optimized + w.name}>
                      <th>{w.name}</th>
                      <td>
                        {w.uplift >= 0 ? '+' : ''}
                        {w.uplift.toFixed(1)}%
                      </td>
                      <td>{t.optimized}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
