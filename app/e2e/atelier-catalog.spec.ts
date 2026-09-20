import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { E2E } from "../playwright.config";

/**
 * S1.4 smoke test: review a piece in the atelier catalog, approve it, and check it reaches
 * the client-side collection — and that an unapproved piece does not.
 */

function pieceIds(): string[] {
  try {
    return readdirSync(E2E.assetsDir)
      .filter((d) => d.startsWith("p_"))
      .sort();
  } catch {
    return [];
  }
}

function manifestOf(id: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(E2E.assetsDir, id, "manifest.json"), "utf-8"));
}

async function signIn(page: Page, code: string) {
  await page.goto("/gate");
  await page.getByRole("textbox").first().fill(code);
  await page.getByRole("button", { name: /enter|continue|open/i }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/gate"), { timeout: 30_000 });
}

const ids = pieceIds();
const NAME = "Thread of Evening";

test.describe("atelier catalog", () => {
  test.skip(ids.length === 0, "no pipeline output in private/assets_out to review");

  test("approve a piece, and it appears in the collection", async ({ page, browser }) => {
    const target = ids[0];

    await signIn(page, E2E.atelierCode);

    // The catalog lists every piece, approved or not.
    await page.goto("/atelier/catalog");
    await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();
    const cards = page.getByTestId("catalog-card");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBe(ids.length);

    // Open the piece and review it.
    await page.goto(`/atelier/catalog/${target}`);
    await expect(page.getByTestId("review-status")).toHaveText("pending");

    await page.getByTestId("field-name").fill(NAME);
    await page.getByRole("radio", { name: "Heirloom" }).click();
    await page.getByTestId("field-story").fill("Drawn in a single line of gold.");

    // Approving writes the review through the API.
    await page.getByTestId("approve").click();
    await expect(page.getByTestId("review-status")).toHaveText("approved");

    const manifest = manifestOf(target) as { review: Record<string, unknown> };
    expect(manifest.review).toMatchObject({
      status: "approved",
      name: NAME,
      collection: "Heirloom",
      story: "Drawn in a single line of gold.",
    });

    // A client sees the approved piece, and only that one.
    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();
    await signIn(clientPage, E2E.clientCode);
    await clientPage.goto("/collection");
    await expect(clientPage.getByText(NAME)).toBeVisible();

    const res = await clientPage.request.get("/api/pieces");
    const body = (await res.json()) as { pieces: Array<{ id: string }> };
    expect(body.pieces.map((p) => p.id)).toEqual([target]);
    await clientContext.close();
  });

  test("a piece cannot be approved without a name and a collection", async ({ page }) => {
    const target = ids.find((id) => {
      const m = manifestOf(id) as { review?: { status?: string } };
      return m.review?.status !== "approved";
    });
    test.skip(!target, "every piece is already approved");

    await signIn(page, E2E.atelierCode);
    await page.goto(`/atelier/catalog/${target}`);
    await page.getByTestId("field-name").fill("");
    await page.getByTestId("approve").click();

    await expect(page.locator(".qh-toast")).toContainText(/needs a name/i);
    await expect(page.getByTestId("review-status")).not.toHaveText("approved");
  });

  test("the catalog is closed to a client session", async ({ page }) => {
    await signIn(page, E2E.clientCode);
    await page.goto("/atelier/catalog");
    await expect(page).toHaveURL(/\/gate/);

    // The middleware turns an unauthorised atelier call into a redirect to the gate.
    const res = await page.request.get("/api/atelier/pieces", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toContain("/gate");
  });
});
