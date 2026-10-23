import { z } from 'zod';
import { rawUrl, requestText, type Recipe } from './data';
const run = z.object({
  label: z.string().nullish(),
  launch: z
    .object({
      cards: z.number().nullish(),
      config: z
        .object({ engine: z.string().nullish(), image: z.string().nullish() })
        .nullish(),
    })
    .nullish(),
  environment: z
    .object({
      gpu_name: z.string().nullish(),
      cuda_version: z.string().nullish(),
      engine_version: z.string().nullish(),
      started_at: z.string().nullish(),
    })
    .nullish(),
  results: z
    .object({
      scenarios: z
        .array(
          z.object({
            key: z.string(),
            label: z.string().nullish(),
            input_tokens: z.number().nullish(),
            output_tokens: z.number().nullish(),
            metrics: z.record(z.string(), z.unknown()).nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
});
const schema = z.object({
  reports: z.array(
    z.object({
      lang: z.string().nullish(),
      title: z.string(),
      comparison: z.object({
        baseline: run,
        attempts: z.array(run),
        benchmark: z
          .object({
            modules: z.array(
              z.object({
                key: z.string(),
                params: z.record(z.string(), z.unknown()).nullish(),
              }),
            ),
          })
          .nullish(),
      }),
    }),
  ),
});
export type ReportData = z.infer<typeof schema>['reports'][number];
export function parseReport(html: string): ReportData {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const block = doc.querySelector(
    'script#autotune-report-data[type="application/json"]',
  );
  if (!block?.textContent)
    throw new Error('报告没有可识别的结构化数据，请阅读原报告');
  const data = schema.parse(JSON.parse(block.textContent));
  const report = data.reports.find((r) => r.lang === 'zh') ?? data.reports[0];
  if (!report) throw new Error('报告为空');
  return report;
}
export async function loadReport(
  r: Recipe,
  commit: string,
  signal?: AbortSignal,
) {
  const t = r.tuning[0];
  if (!t?.report || !r.model.reports.includes(t.report))
    throw new Error('该配方未关联性能报告');
  return parseReport(
    await requestText(
      rawUrl(commit, `models/${r.model.name}/${t.report}`),
      signal,
    ),
  );
}
