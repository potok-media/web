export const getFileExtension = (url: string): string => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const lastDot = pathname.lastIndexOf(".");
    if (lastDot !== -1) {
      return pathname.slice(lastDot + 1).toLowerCase();
    }
  } catch {
    const cleanUrl = url.split("?")[0];
    const lastDot = cleanUrl.lastIndexOf(".");
    if (lastDot !== -1) {
      return cleanUrl.slice(lastDot + 1).toLowerCase();
    }
  }
  return "";
};

export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds === Infinity || seconds <= 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

