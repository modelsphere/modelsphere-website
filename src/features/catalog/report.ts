import { rawUrl, requestText, type Recipe } from './data';

export async function loadReportDocument(
  r: Recipe,
  commit: string,
  signal?: AbortSignal,
): Promise<string> {
  const t = r.tuning[0];
  if (!t?.report || !r.model.reports.includes(t.report))
    throw new Error('该配方未关联性能报告');
  const html = await requestText(
    rawUrl(commit, `models/${r.model.name}/${t.report}`),
    signal,
  );
  if (!/<html[\s>]/i.test(html) || !/<body[\s>]/i.test(html))
    throw new Error('性能报告不是完整的 HTML 文档');
  return html;
}
