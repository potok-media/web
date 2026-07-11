/**
 * Centralized utility to read environment variables dynamically.
 * Supporting both compile-time Vite environment injection (build-time `.env`)
 * and dynamic runtime Docker environment variable injection (production).
 */
export function getEnv(key: string): string {
  if (typeof window !== "undefined" && window.POTOK_CONFIG) {
    const val = window.POTOK_CONFIG[key];
    // Check if the value is defined and is not a placeholder template
    if (val && typeof val === "string" && !val.startsWith("__VITE_") && !val.endsWith("__")) {
      return val;
    }
  }
  
  // Fallback to compile-time Vite variables
  return (import.meta.env[key] as string) || "";
}
