import React, { useEffect, useRef, useState } from 'react';
import { reportUrl, type Recipe } from './data';
import { loadReportDocument } from './report';
import styles from './styles.module.css';
export default function ReportPanel({
  r,
  commit,
  active = true,
}: {
  r: Recipe;
  commit: string;
  active?: boolean;
}) {
  const [data, setData] = useState<string | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0),
    [fullscreen, setFullscreen] = useState(false),
    [fullscreenError, setFullscreenError] = useState('');
  const reportFrame = useRef<HTMLIFrameElement>(null);
  const fullscreenButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let wasFullscreen = false;
    const syncFullscreen = () => {
      const frame = reportFrame.current;
      const active = !!frame && document.fullscreenElement === frame;
      setFullscreen(active);
      if (
        wasFullscreen &&
        !active &&
        !fullscreenButton.current?.closest('[hidden]')
      )
        fullscreenButton.current?.focus({ preventScroll: true });
      wasFullscreen = active;
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () =>
      document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);
  useEffect(() => {
    if (
      !active &&
      reportFrame.current &&
      document.fullscreenElement === reportFrame.current
    )
      void document.exitFullscreen().catch(() => {});
  }, [active, fullscreen]);
  async function toggleFullscreen() {
    setFullscreenError('');
    try {
      if (!reportFrame.current) return;
      if (document.fullscreenElement === reportFrame.current)
        await document.exitFullscreen();
      else if (reportFrame.current?.requestFullscreen)
        await reportFrame.current.requestFullscreen();
      else throw new Error('Fullscreen unavailable');
    } catch {
      setFullscreenError('暂时无法全屏观看，请使用“查看完整报告”。');
    }
  }

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
        <div className={styles.reportActions}>
          <button
            ref={fullscreenButton}
            className={styles.secondary}
            type="button"
            disabled={!data && !fullscreen}
            aria-pressed={fullscreen}
            aria-controls="benchmark-report"
            onClick={toggleFullscreen}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                d={
                  fullscreen
                    ? 'M9 3v6H3m18 0h-6V3M3 15h6v6m6 0v-6h6'
                    : 'M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6'
                }
              />
            </svg>
            {fullscreen ? '退出全屏' : '全屏观看'}
          </button>
          <a
            className={styles.primary}
            href={reportUrl(r)!}
            target="_blank"
            rel="noreferrer"
          >
            查看完整报告 ↗
          </a>
        </div>
      </div>
      {fullscreenError && <p role="status">{fullscreenError}</p>}
      {error ? (
        <p role="status">
          {error} <button onClick={() => setRetry((n) => n + 1)}>重试</button>
        </p>
      ) : !data ? (
        <p role="status">正在读取报告数据…</p>
      ) : (
        <iframe
          ref={reportFrame}
          id="benchmark-report"
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
