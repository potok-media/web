/** ARM carries TMDB-relative still paths as well as already resolved artwork URLs. */
export function resolveEpisodeStillUrl(path: string | null | undefined, gatewayBaseUrl: string): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const base = gatewayBaseUrl.replace(/\/$/, "");
  if (path.startsWith("/media/")) return `${base}${path}`;
  return `${base}/media/tmdb/t/p/w500/${path.replace(/^\//, "")}`;
}
