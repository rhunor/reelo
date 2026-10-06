export type TranslateVars = Record<string, string | number>;

// Fills {placeholders} in a translated string. Kept apart from dictionaries.ts so client
// components can use it without bundling every language's messages.
export function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}
