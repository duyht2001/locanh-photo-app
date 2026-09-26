/**
 * Helper to encode and extract maxSelections seamlessly across Supabase and local storage,
 * even when the remote database table does not yet have the maxSelections column.
 */

export function extractMaxSelections(album: any, localFallback?: any): number | null {
  if (album?.maxSelections !== undefined && album?.maxSelections !== null && album?.maxSelections !== "") {
    const parsed = parseInt(String(album.maxSelections), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // Check metadata encoded in bannerUrl: "__ms__10" or "url#__ms__10"
  if (typeof album?.bannerUrl === "string") {
    const match = album.bannerUrl.match(/__ms__(\d+)/);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }

  // Check metadata encoded in logoUrl
  if (typeof album?.logoUrl === "string") {
    const match = album.logoUrl.match(/__ms__(\d+)/);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }

  // Check local fallback
  if (localFallback?.maxSelections !== undefined && localFallback?.maxSelections !== null && localFallback?.maxSelections !== "") {
    const parsed = parseInt(String(localFallback.maxSelections), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  return null;
}

export function cleanBannerUrl(bannerUrl?: string | null): string | null {
  if (!bannerUrl) return null;
  if (bannerUrl.startsWith("__ms__")) return null;
  const cleaned = bannerUrl.replace(/#__ms__\d+$/, "").replace(/__ms__\d+$/, "");
  return cleaned || null;
}

export function encodeBannerWithMaxSelections(
  bannerUrl: string | null | undefined,
  maxSelections: number | null | undefined
): string | null {
  const clean = cleanBannerUrl(bannerUrl);
  if (!maxSelections || maxSelections <= 0) {
    return clean;
  }
  if (!clean) {
    return `__ms__${maxSelections}`;
  }
  return `${clean}#__ms__${maxSelections}`;
}
