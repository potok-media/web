import { useEffect, useState } from "react";

interface TimecodeRange {
  start: number;
  end: number;
}

export function useTimecodes(
  tmdbId: number,
  season: number | undefined,
  episode: number | undefined,
  isTv: boolean,
  duration: number
) {
  const [introRange, setIntroRange] = useState<TimecodeRange | null>(null);
  const [outroRange, setOutroRange] = useState<TimecodeRange | null>(null);

  // Fetch Intro & Outro from TheIntroDB
  useEffect(() => {
    if (!isTv) return;
    let isMounted = true;

    const fetchTimecodes = async () => {
      try {
        const s = season || 1;
        const e = episode || 1;
        const urlTidb = `https://api.theintrodb.org/v2/media?tmdb_id=${tmdbId}&season=${s}&episode=${e}`;
        const response = await fetch(urlTidb, { method: "GET", headers: { "Accept": "application/json" } });
        
        if (response.ok) {
          const data = await response.json();
          if (isMounted && data) {
            let foundIntro: TimecodeRange | null = null;
            let foundOutro: TimecodeRange | null = null;

            if (Array.isArray(data.intro) && data.intro.length > 0) {
              const introObj = data.intro[0];
              foundIntro = {
                start: (introObj.start_ms ?? 0) / 1000,
                end: (introObj.end_ms ?? 0) / 1000,
              };
            }

            if (Array.isArray(data.credits) && data.credits.length > 0) {
              const creditsObj = data.credits[0];
              foundOutro = {
                start: (creditsObj.start_ms ?? 0) / 1000,
                end: (creditsObj.end_ms ?? 0) / 1000,
              };
            }

            if (foundIntro) setIntroRange(foundIntro);
            if (foundOutro) setOutroRange(foundOutro);
            if (foundIntro || foundOutro) return;
          }
        }
      } catch (err) {
        console.warn("Could not retrieve segment data from TheIntroDB:", err);
      }

      // Default fallback if query fails
      if (isMounted) {
        setIntroRange({ start: 15, end: 95 });
      }
    };

    fetchTimecodes();
    return () => {
      isMounted = false;
    };
  }, [tmdbId, season, episode, isTv]);

  // Outro standard fallback based on video duration
  useEffect(() => {
    if (!isTv || outroRange || duration <= 0) return;
    if (duration > 180) {
      setOutroRange({ start: duration - 120, end: duration });
    }
  }, [duration, outroRange, isTv]);

  return { introRange, outroRange };
}
