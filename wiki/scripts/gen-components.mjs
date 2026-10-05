// SDK metadata and existing translations are the sources for the component reference.
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentGroups, componentSlug } from '../component-groups.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, '../..');
mkdirSync(join(here, '../public'), { recursive: true });
copyFileSync(join(web, 'public/favicon.svg'), join(here, '../public/favicon.svg'));
execFileSync(process.execPath, [join(web, 'scripts/document-sdk.js')], { stdio: 'pipe' });
const metadata = JSON.parse(readFileSync(join(web, 'src/pages/wiki/docs-metadata.json'), 'utf8'));
const names = componentGroups.flatMap((group) => group.names);
if (new Set(names).size !== names.length || names.length !== Object.keys(metadata).length || names.some((name) => !metadata[name])) {
  throw new Error('Update component-groups.mjs to cover each SDK component exactly once.');
}
const richText = (text) => String(text ?? '').replace(/<code>(.*?)<\/code>/g, '`$1`').replace(/<\/?(?:link|repo)>/g, '');
const cell = (text) => richText(text).replaceAll('|', '\\|').replace(/\r?\n/g, '<br>');
const inlineCode = (text) => `\`${cell(text)}\``;
const frontmatter = (title, description) => `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n---\n\n`;

for (const lang of ['ru', 'en']) {
  const en = lang === 'en';
  const wiki = JSON.parse(readFileSync(join(web, `src/i18n/locales/${lang}.json`), 'utf8')).wiki;
  const prefix = `/wiki/${en ? 'en/' : ''}`;
  const out = join(here, `../src/content/docs/${en ? 'en/' : ''}components`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const write = (slug, title, description, body) => writeFileSync(join(out, `${slug}.md`), frontmatter(title, description) + body + '\n');
  for (const name of names) {
    // Let Starlight display its untranslated-content notice for missing English references.
    if (en && !wiki.components?.[name]) continue;
    const fallback = metadata[name];
    const localized = wiki.components?.[name] ?? {};
    const doc = { ...fallback, ...localized, example: fallback.example };
    const methods = Object.keys({ ...fallback.methods, ...localized.methods }).map((method) => {
      const value = { ...fallback.methods[method], ...localized.methods?.[method] };
      return `| ${inlineCode(`${method}(v)`)} | ${inlineCode(value.argument)} | ${cell(value.description)}${value.default !== undefined ? `<br>${cell(wiki.componentDoc.defaultValue)} ${inlineCode(value.default)}` : ''} |`;
    });
    const table = methods.length ? `## ${wiki.componentDoc.specificMethods} ${name}\n\n| ${wiki.componentDoc.method} | ${wiki.tables.baseMethods.argument} | ${wiki.tables.baseMethods.description} |\n| --- | --- | --- |\n${methods.join('\n')}\n\n` : '';
    const inherited = `[${wiki.componentDoc.baseMethods}](${prefix}components/base-methods/)${doc.extendsLayout ? ` · [${wiki.componentDoc.layoutMethods}](${prefix}components/layout-methods/)` : ''}`;
    const example = fallback.example.trim();
    write(componentSlug(name), doc.title, richText(doc.description), `${richText(doc.description)}\n\n${table}${inherited}\n\n## ${wiki.componentDoc.example}\n\n\`\`\`js\n${example}\n\`\`\`\n\n[${wiki.componentDoc.runSandbox}](${prefix}sandbox/#code=${encodeURIComponent(example)})\n`);
  }
  const commonTables = [
    ['base-methods', 'baseMethods', [['id', 'string'], ['padding', 'number | string | object'], ['margin', 'number | string | object'], ['width', 'string | number'], ['height', 'string | number'], ['visible', 'boolean'], ['disabled', 'boolean'], ['flex', 'number'], ['style', 'string']]],
    ['layout-methods', 'layoutMethods', [['spacing', 'number'], ['alignItems', '"start" | "center" | "end" | "stretch"'], ['justifyContent', '"start" | "center" | "end" | "between" | "around"'], ['child', 'UIComponent'], ['children', 'UIComponent[]']]],
  ];
  for (const [slug, key, methods] of commonTables) {
    const t = wiki.tables[key];
    write(slug, wiki.componentDoc[key], wiki.componentDoc[key], `| ${t.method} | ${t.argument} | ${t.description} |\n| --- | --- | --- |\n${methods.map(([name, arg]) => `| ${inlineCode(`${name}(v)`)} | ${inlineCode(arg)} | ${cell(t.rows[name])} |`).join('\n')}\n`);
  }
  write('index', en ? 'SDK components' : 'Компоненты SDK', en ? 'UI builders, methods, and runnable examples.' : 'UI-билдеры, методы и работающие примеры.', componentGroups.map((group) => `## ${en ? group.en : group.label}\n\n${group.names.map((name) => `- [${name}](${prefix}components/${componentSlug(name)}/) — ${en && !wiki.components?.[name] ? 'Russian reference (translation pending).' : richText(wiki.components?.[name]?.description ?? metadata[name].description)}`).join('\n')}`).join('\n\n'));
}
console.log(`Generated reference for ${names.length} SDK components (ru, en with Starlight fallback).`);
