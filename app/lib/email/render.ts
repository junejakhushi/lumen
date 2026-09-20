/**
 * The Mustache subset the delivered email templates use (public/brand/emails/README.md):
 * `{{value}}` and `{{#section}}…{{/section}}`, where a section is a boolean (show/hide)
 * or a list (repeat, with the item's fields in scope).
 *
 * Values are HTML-escaped on insert; `{{{value}}}` inserts raw (used for pre-built markup).
 */

export type TemplateValue = string | number | boolean | null | undefined | TemplateData | TemplateData[];
export interface TemplateData {
  [key: string]: TemplateValue;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function lookup(scopes: TemplateData[], key: string): TemplateValue {
  for (let i = scopes.length - 1; i >= 0; i--) {
    const value = scopes[i][key];
    if (value !== undefined) return value;
  }
  return undefined;
}

function isTruthy(value: TemplateValue): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

const SECTION = /\{\{([#^])\s*([\w.]+)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/;

export function renderTemplate(template: string, data: TemplateData): string {
  return render(template, [data]);
}

function render(template: string, scopes: TemplateData[]): string {
  let out = template;

  // sections first, innermost resolved by recursion
  for (let match = SECTION.exec(out); match; match = SECTION.exec(out)) {
    const [whole, kind, key, body] = match;
    const value = lookup(scopes, key);
    let replacement = "";
    if (kind === "#") {
      if (Array.isArray(value)) {
        replacement = value.map((item) => render(body, [...scopes, item])).join("");
      } else if (isTruthy(value)) {
        const scope = typeof value === "object" && value !== null ? (value as TemplateData) : {};
        replacement = render(body, [...scopes, scope]);
      }
    } else if (!isTruthy(value)) {
      replacement = render(body, scopes);
    }
    out = out.slice(0, match.index) + replacement + out.slice(match.index + whole.length);
  }

  // raw, then escaped values
  out = out.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, key: string) => {
    const value = lookup(scopes, key);
    return value === undefined || value === null ? "" : String(value);
  });
  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const value = lookup(scopes, key);
    return value === undefined || value === null ? "" : escapeHtml(String(value));
  });
  return out;
}

/** Plain-text fallback, so the email is readable without HTML. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|table)>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
