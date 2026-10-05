/** Deterministic pastel gradient per seed, used as the poster placeholder for poster-less cards. */
export function placeholderGradient(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  const hue = hash % 360;
  return `linear-gradient(145deg, hsl(${hue} 45% 32%), hsl(${(hue + 40) % 360} 50% 18%))`;
}
