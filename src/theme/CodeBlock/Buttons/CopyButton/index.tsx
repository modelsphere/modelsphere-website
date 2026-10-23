import React, { useEffect, useRef, useState } from 'react';
import { useCodeBlockContext } from '@docusaurus/theme-common/internal';
import type { Props } from '@theme/CodeBlock/Buttons/CopyButton';
export default function CopyButton({ className }: Props) {
  const {
    metadata: { code },
  } = useCodeBlockContext();
  const [status, setStatus] = useState<'idle' | 'copying' | 'done' | 'failed'>(
    'idle',
  );
  const generation = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    generation.current++;
    setStatus('idle');
    return () => {
      generation.current++;
      clearTimeout(timeout.current);
    };
  }, [code]);
  async function copy() {
    const current = generation.current;
    setStatus('copying');
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code);
      if (current !== generation.current) return;
      setStatus('done');
      timeout.current = setTimeout(() => setStatus('idle'), 2000);
    } catch {
      if (current === generation.current) setStatus('failed');
    }
  }
  return (
    <span className="copy-control js-control">
      <button
        type="button"
        className={`${className ?? ''} copy-button`}
        disabled={status === 'copying'}
        onClick={copy}
        aria-label="复制代码"
      >
        {status === 'done'
          ? '已复制'
          : status === 'copying'
            ? '复制中'
            : '复制代码'}
      </button>
      <span
        role="status"
        className={status === 'failed' ? 'copy-error' : 'sr-only'}
      >
        {status === 'failed'
          ? '复制失败，请手动选择代码'
          : status === 'done'
            ? '代码已复制'
            : ''}
      </span>
    </span>
  );
}
