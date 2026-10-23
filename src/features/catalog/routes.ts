import type { Recipe } from './data';

export const recipeTabs = [
  { id: 'deployment', label: '部署配置' },
  { id: 'performance', label: '性能对照' },
  { id: 'history', label: '版本历史' },
] as const;
export type RecipeTab = (typeof recipeTabs)[number]['id'];

export function recipeTab(value: string | null): RecipeTab {
  return recipeTabs.find((tab) => tab.id === value)?.id ?? 'deployment';
}

export function recipeTabHref(search: string, tab: RecipeTab) {
  const params = new URLSearchParams(search);
  if (tab === 'deployment') params.delete('tab');
  else params.set('tab', tab);
  if (params.has('returnTo'))
    params.set('returnTo', catalogReturnTo(params.get('returnTo')));
  return '/models/recipe?' + params.toString();
}

export function catalogReturnTo(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith('/models') ||
    value.includes('\\') ||
    Array.from(value).some((char) => char.charCodeAt(0) <= 32)
  )
    return '/models';
  const url = new URL(value, 'https://catalog.invalid');
  if (url.origin !== 'https://catalog.invalid' || url.pathname !== '/models')
    return '/models';
  url.searchParams.delete('benchmark');
  return url.pathname + url.search;
}

export function reportHref(r: Recipe, commit: string, returnTo?: string) {
  return reportRoute(r.model.name, r.variant.id, commit, returnTo);
}

function reportRoute(
  modelId: string,
  recipeId: string,
  dataVersion: string,
  returnTo?: string,
) {
  const params = new URLSearchParams({ modelId, recipeId });
  if (dataVersion) params.set('dataVersion', dataVersion);
  if (returnTo) params.set('returnTo', catalogReturnTo(returnTo));
  return recipeTabHref(params.toString(), 'performance');
}

export function legacyCatalogReportHref(search: string): string | null {
  const params = new URLSearchParams(search);
  if (!params.has('benchmark')) return null;
  const key = params.get('benchmark') ?? '';
  const separator = key.indexOf('/');
  return reportRoute(
    separator < 0 ? key : key.slice(0, separator),
    separator < 0 ? '' : key.slice(separator + 1),
    params.get('dataVersion') ?? '',
    catalogReturnTo('/models' + search),
  );
}

export function legacyRecipeReportHref(search: string, hash: string) {
  if (hash !== '#benchmark') return null;
  return recipeTabHref(search, 'performance');
}
