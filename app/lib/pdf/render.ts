import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";

/**
 * Render a react-pdf document to a Buffer on the server (SPEC §5.6).
 *
 * The fonts are registered by lib/pdf/DesignBrief.tsx as filesystem paths, so nothing is
 * fetched while rendering.
 */
export async function renderPdf(doc: ReactElement): Promise<Buffer> {
  // @react-pdf's types want its own DocumentProps element; the component is one.
  return renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
}
