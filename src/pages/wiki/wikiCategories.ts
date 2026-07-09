/** Stable category keys used in page registry and sidebar grouping. */
export const WIKI_CATEGORY_KEYS = {
  intro: "intro",
  api: "api",
  uiContainers: "uiContainers",
  uiText: "uiText",
  uiForms: "uiForms",
  uiMedia: "uiMedia",
  uiStreaming: "uiStreaming",
  sandbox: "sandbox",
} as const;

export type WikiCategoryKey = (typeof WIKI_CATEGORY_KEYS)[keyof typeof WIKI_CATEGORY_KEYS];