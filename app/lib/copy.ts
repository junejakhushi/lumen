import copyData from "@/public/brand/copy.en.json";

const copy = copyData as Record<string, unknown>;

/**
 * Look up a dot-path in copy.en.json and interpolate {{var}} placeholders.
 * Returns the raw string or the path itself if not found.
 */
export function t(
  path: string,
  vars?: Record<string, string | number>
): string {
  const keys = path.split(".");
  let node: unknown = copy;
  for (const k of keys) {
    if (node && typeof node === "object" && k in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[k];
    } else {
      return path;
    }
  }
  if (typeof node !== "string") return path;
  if (!vars) return node;
  return node.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`
  );
}

export default copyData;
