import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

/**
 * The package READMEs repeat the package title and start with a language
 * switcher whose target file is not shipped; both are redundant next to the
 * detail page header.
 */
export function cleanReadme(markdown: string): string {
  let out = markdown;
  out = out.replace(/^#\s+@deepseek-ai\/[^\n]*\r?\n+/, '');
  out = out.replace(/^English\s*\|\s*\[[^\]]*\]\([^)]*\)\s*\r?\n+/m, '');
  return out;
}

export function renderMarkdown(markdown: string): string {
  return marked.parse(cleanReadme(markdown), { async: false }) as string;
}

/** Pretty-print a row config (or any JSON-ish value) for the YAML-ish panels. */
export function stringifyConfig(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
