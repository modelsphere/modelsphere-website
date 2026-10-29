import { translate } from '@docusaurus/Translate';

/** Display text from domain helpers without translating their stored values. */
export function translateCopy(message: string): string {
  const request = /^来源请求失败（(\d+)）$/.exec(message);
  if (request)
    return translate(
      { id: 'catalog.requestFailed', message: '来源请求失败（{status}）' },
      { status: request[1] },
    );
  return translate({ message })
    .replaceAll('无需 GPU', translate({ message: '无需 GPU' }))
    .replaceAll('GPU 未指定', translate({ message: 'GPU 未指定' }))
    .replace(/ 节点$/, translate({ id: 'catalog.nodes', message: ' 节点' }));
}
