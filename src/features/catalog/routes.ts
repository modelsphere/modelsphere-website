import type { Recipe } from './data';

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
  return '/models/report?' + params.toString();
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
  const params = new URLSearchParams(search);
  return reportRoute(
    params.get('modelId') ?? '',
    params.get('recipeId') ?? '',
    params.get('dataVersion') ?? '',
    params.get('returnTo') ?? undefined,
  );
}
