const PROXIED_HOSTS = [
  "thumbnail.image.rakuten.co.jp",
  "image.rakuten.co.jp",
  "shop.r10s.jp",
];

export function toProxiedImageUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!PROXIED_HOSTS.includes(u.hostname)) return url;
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}
