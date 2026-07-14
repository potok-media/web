// Playlist-scoped audio-track memory: remember the audio rendition the user picked and re-apply it on the
// next episode of the same playlist so they don't reselect it every time (very common with anime dubs).
// Matched by NAME word-similarity, never by index — episodes can carry the dub under a slightly different
// label or order. In-memory only, lives for the lifetime of the current playlist; not persisted by design.

export interface AudioPreference {
  name?: string;
}

const norm = (s?: string) => (s || "").toLowerCase().trim();
// Split a name into WORD tokens (Unicode-aware so Cyrillic dub names work). Nothing is stripped on purpose:
// the group identity often lives INSIDE brackets/parens — e.g. "Русский (AniLibria закадр)" — so removing
// them would collapse distinct dubs ("(AniStar …)" vs "(AniLibria …)") to the same words. Word-Dice + picking
// the max score keeps the exact rendition winning; shared generic words ("Русский", "закадр") only lower it.
const wordSet = (s?: string) => new Set(norm(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean));

// Sørensen–Dice coefficient over WORD tokens: 2·|A∩B| / (|A|+|B|). An exact name (tags aside) scores 1.0,
// "AniLibria" ≡ "AniLibria TV" scores 0.67, and two groups sharing only a generic word ("… TV") score 0.5 —
// below the threshold, so they don't cross-match.
const DICE_THRESHOLD = 0.6;
function diceWordSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  return (2 * inter) / (a.size + b.size);
}

/**
 * Index of the track whose name is most similar (word Sørensen–Dice) to the remembered preference and clears
 * the threshold, in a single pass. Returns -1 when nothing is similar enough — the caller then leaves hls.js
 * on the track it already selected (the manifest DEFAULT, not necessarily index 0).
 */
export function matchAudioTrack(tracks: { name?: string }[], pref: AudioPreference): number {
  const prefWords = wordSet(pref.name);
  if (prefWords.size === 0) return -1;

  let best = -1;
  let bestScore = 0;
  tracks.forEach((t, i) => {
    const score = diceWordSimilarity(prefWords, wordSet(t.name));
    if (score >= DICE_THRESHOLD && score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}
