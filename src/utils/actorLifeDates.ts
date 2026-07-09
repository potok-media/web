/** Formats TMDB birthday/deathday for the actor profile header. */
export function formatActorLifeDates(
  birthday: string | undefined,
  deathday: string | undefined,
  locale: string,
  labels: {
    ageAtDeath: (age: number) => string;
    years: (count: number) => string;
  },
): string {
  if (!birthday) return "";

  const birthDate = new Date(birthday);
  if (Number.isNaN(birthDate.getTime())) return "";

  const birthStr = birthDate.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (deathday) {
    const deathDate = new Date(deathday);
    if (!Number.isNaN(deathDate.getTime())) {
      const deathStr = deathDate.toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      let age = deathDate.getFullYear() - birthDate.getFullYear();
      const monthDelta = deathDate.getMonth() - birthDate.getMonth();
      if (
        monthDelta < 0 ||
        (monthDelta === 0 && deathDate.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      return `${birthStr} – ${deathStr} (${labels.ageAtDeath(age)})`;
    }
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return `${birthStr} (${age} ${labels.years(age)})`;
}