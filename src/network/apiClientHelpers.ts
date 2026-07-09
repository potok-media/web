import { ApiError } from "./ApiTypes";

export function ensureAbsoluteURL(url: string): string {
  if (!url) return "";
  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `http://${normalized}`;
  }
  return normalized;
}

export function populateProgressPercentage(data: unknown): unknown {
  if (!data) return data;
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      data[i] = populateProgressPercentage(data[i]);
    }
    return data;
  }
  if (typeof data !== "object") return data;

  const record = data as Record<string, unknown>;
  const progress = record.progress;
  if (progress && typeof progress === "object" && !Array.isArray(progress)) {
    const p = progress as Record<string, unknown>;
    const percentage = p.percentage;
    if (percentage === undefined || (typeof percentage === "number" && isNaN(percentage))) {
      const aired = typeof p.aired === "number" ? p.aired : 0;
      const completed = typeof p.completed === "number" ? p.completed : 0;
      if (aired > 0) {
        p.percentage = (completed * 100) / aired;
      } else if (p.completed !== undefined) {
        p.percentage = completed > 0 ? 100 : 0;
      } else {
        p.percentage = 0;
      }
    }
  }

  for (const key of Object.keys(record)) {
    record[key] = populateProgressPercentage(record[key]);
  }
  return record;
}

export async function handleApiResponse<T>(res: Response, fallbackMsg: string): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new ApiError(`${fallbackMsg} (Status ${res.status})`, res.status, errorText);
  }
  const json = await res.json();
  return populateProgressPercentage(json) as T;
}