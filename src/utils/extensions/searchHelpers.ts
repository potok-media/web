import type { RawStreamPayload } from "../../network/SDKTypes";

const getQualityScore = (quality?: string): number => {
  if (!quality) return 0;
  const q = quality.toLowerCase();
  if (q.includes("2160") || q.includes("4k") || q.includes("uhd")) return 100;
  if (q.includes("1440") || q.includes("2k")) return 80;
  if (q.includes("1080") || q.includes("fhd")) return 60;
  if (q.includes("720") || q.includes("hd")) return 40;
  if (q.includes("480") || q.includes("sd")) return 20;
  if (q.includes("360")) return 10;
  return 5;
};

const getCodecScore = (item: RawStreamPayload): number => {
  const text = `${item.title} ${item.quality || ''}`.toLowerCase();
  if (text.includes("h265") || text.includes("h.265") || text.includes("hevc") || text.includes("x265")) return 10;
  if (text.includes("h264") || text.includes("h.264") || text.includes("avc") || text.includes("x264")) return 5;
  if (text.includes("vp9")) return 8;
  if (text.includes("av1")) return 9;
  return 0;
};

const getInfoHash = (item: RawStreamPayload): string | null => {
  if (item.hash) return item.hash.toLowerCase();
  if (item.magnet) {
    const match = item.magnet.match(/btih:([a-fA-F0-9]{32,40})/);
    if (match) return match[1].toLowerCase();
  }
  return null;
};

const getStreamUrl = (item: RawStreamPayload): string | null => {
  return item.url || null;
};

export function processSearchResults(results: RawStreamPayload[]): RawStreamPayload[] {
  const seenHashes = new Set<string>();
  const seenUrls = new Set<string>();
  const seenSizeAndUrl = new Set<string>();
  
  const uniqueResults: RawStreamPayload[] = [];

  for (const item of results) {
    if (!item) continue;
    
    // Deduplicate by hash
    const hash = getInfoHash(item);
    if (hash) {
      if (seenHashes.has(hash)) continue;
      seenHashes.add(hash);
    }
    
    // Deduplicate by URL
    const url = getStreamUrl(item);
    if (url) {
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
    }
    
    // Deduplicate by size and URL
    const sizeStr = item.size !== undefined ? String(item.size) : "";
    if (sizeStr || url) {
      const key = `${sizeStr}_${url || ''}`;
      if (key !== "_" && seenSizeAndUrl.has(key)) {
        continue;
      }
      seenSizeAndUrl.add(key);
    }
    
    uniqueResults.push(item);
  }

  uniqueResults.sort((a, b) => {
    // 1. Compare Quality
    const qA = getQualityScore(a.quality);
    const qB = getQualityScore(b.quality);
    if (qA !== qB) return qB - qA;

    // 2. Compare Seeds
    const seedsA = a.seeds || 0;
    const seedsB = b.seeds || 0;
    if (seedsA !== seedsB) return seedsB - seedsA;

    // 3. Compare Codec Score
    const codecA = getCodecScore(a);
    const codecB = getCodecScore(b);
    if (codecA !== codecB) return codecB - codecA;

    // 4. Default: alphabetical title sorting
    return a.title.localeCompare(b.title);
  });

  return uniqueResults;
}
