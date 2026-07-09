import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const locales = ["ru.json", "en.json"];

const BANNED = [
  { pattern: /\(ниже\)|\(below\)|пример ниже|example below/i, label: "below-pointer" },
  { pattern: /Создайте папку|Create a folder/i, label: "create-folder" },
  { pattern: /Ниже привед/i, label: "below-introduced" },
  { pattern: /не копируйте|not something to copy/i, label: "dont-copy" },
];

const WARN = [
  { pattern: /предоставляет|позволяет|должен содержать|provides a|allows the plugin/i, label: "tutorial-voice" },
];

function collectStrings(node, path, out) {
  if (typeof node === "string") {
    out.push({ path, value: node });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectStrings(item, `${path}[${i}]`, out));
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, val] of Object.entries(node)) {
      collectStrings(val, path ? `${path}.${key}` : key, out);
    }
  }
}

let failed = false;

for (const file of locales) {
  const json = JSON.parse(readFileSync(join(root, "src/i18n/locales", file), "utf8"));
  const wiki = json.wiki;
  if (!wiki) continue;

  const strings = [];
  if (wiki.pages) collectStrings(wiki.pages, "pages", strings);
  if (wiki.components) collectStrings(wiki.components, "components", strings);

  for (const { path, value } of strings) {
    for (const { pattern, label } of BANNED) {
      if (pattern.test(value)) {
        console.error(`[${file}] ${label}: ${path}`);
        console.error(`  ${value.slice(0, 120)}${value.length > 120 ? "…" : ""}`);
        failed = true;
      }
    }
    for (const { pattern, label } of WARN) {
      if (pattern.test(value)) {
        console.warn(`[${file}] warn:${label}: ${path}`);
      }
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("wiki copy lint: ok");