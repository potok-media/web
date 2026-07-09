import type { TFunction } from "i18next";

/** TMDB `known_for_department` values → i18n keys under `media:actor.departments.*`. */
const DEPARTMENT_KEY_BY_TMDB: Record<string, string> = {
  Acting: "departments.acting",
  Directing: "departments.directing",
  Writing: "departments.writing",
  Production: "departments.production",
};

export function resolveActorDepartmentLabel(
  department: string | undefined,
  t: TFunction<"media">,
): string | null {
  if (!department) return null;
  const key = DEPARTMENT_KEY_BY_TMDB[department];
  return key ? t(`actor.${key}`) : null;
}