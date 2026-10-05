// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { componentGroups, componentSlug } from "./component-groups.mjs";

// Potok SDK documentation site (Astro Starlight). Served by the web container at /wiki/.
// ru is the default locale (the product is RU-first); en gets its own pages where translated,
// untranslated pages fall back to ru automatically.
export default defineConfig({
  site: process.env.POTOK_DOCS_SITE,
  base: "/wiki/",
  trailingSlash: "always",
  redirects: { "/intro": "/", "/en/intro": "/en/", "/api/client": "/api/http/", "/en/api/client": "/en/api/http/" },
  integrations: [
    starlight({
      title: "Potok Docs",
      description: "Документация Potok SDK для разработчиков плагинов",
      defaultLocale: "root",
      locales: {
        root: { label: "Русский", lang: "ru" },
        en: { label: "English", lang: "en" },
      },
      sidebar: [
        {
          label: "Начало",
          translations: { en: "Getting started" },
          items: [
            { slug: "" },
            { slug: "install" },
            { slug: "torrent-services" },
            { slug: "quickstart" },
          ],
        },
        {
          label: "API",
          items: [
            { slug: "api/manifest" },
            { slug: "api/state" },
            { slug: "api/http" },
            { slug: "api/storage" },
            { slug: "api/ui" },
            { slug: "i18n" },
            { slug: "api/streams" },
          ],
        },
        {
          label: "Компоненты",
          translations: { en: "Components" },
          items: [
            { slug: "components" },
            { slug: "components/base-methods" },
            { slug: "components/layout-methods" },
            ...componentGroups.map(({ label, en, names }) => ({
              label,
              translations: { en },
              collapsed: true,
              items: names.map((name) => ({ slug: `components/${componentSlug(name)}`, label: name })),
            })),
          ],
        },
        {
          label: "Песочница",
          translations: { en: "Sandbox" },
          items: [{ slug: "sandbox" }],
        },
      ],
      // Pagefind search is built in by default (static index, no external service).
      customCss: ["./src/styles/potok.css"],
      components: { SocialIcons: "./src/components/DocsLinks.astro" },
      expressiveCode: { defaultProps: { wrap: true } },
    }),
  ],
});
