import { useEffect, useState } from 'react';
import { baseline, cachedCatalog, loadCatalog, type Catalog } from './data';
export function useCatalog(version = '') {
  const [state, setState] = useState<{
    catalog: Catalog;
    status: 'baseline' | 'loading' | 'live' | 'cached' | 'error';
    error: string;
  }>({ catalog: baseline, status: 'baseline', error: '' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, status: 'loading', error: '' }));
    loadCatalog(controller.signal)
      .then((current) => {
        if (controller.signal.aborted) return;
        const selected = version ? cachedCatalog(version) : current;
        if (!selected) {
          setState((s) => ({
            ...s,
            status: 'error',
            error:
              '指定目录版本不可用。公开来源没有完整快照接口，请返回当前目录。',
          }));
          return;
        }
        setState({
          catalog: selected,
          status: selected.commit === current.commit ? 'live' : 'cached',
          error: '',
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        const selected = version ? cachedCatalog(version) : undefined;
        setState((s) => ({
          ...s,
          catalog: selected ?? s.catalog,
          status: 'error',
          error:
            version && !selected
              ? '指定目录版本不可用，请返回当前目录。'
              : '公开数据暂时不可达，以下保留已标明版本的目录副本。',
        }));
      });
    return () => controller.abort();
  }, [version, retry]);
  return {
    ...state,
    reload: () => setRetry((n) => n + 1),
    unavailable: Boolean(version && state.catalog.commit !== version),
  };
}
