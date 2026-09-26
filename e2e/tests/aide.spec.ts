import { test, expect } from "@playwright/test";
import { AidePage } from "../pages/AidePage";
import { emailUnique } from "../utils/donneesTest";

// Page Aide, accessible sans compte : FAQ, formulaire de contact, pages légales.
test.describe("Aide", () => {
  test("un visiteur consulte la FAQ et envoie un message au support", async ({ page }) => {
    const aide = new AidePage(page);
    await aide.aller();

    await aide.question(/Comment supprimer mon compte/).locator("summary").click();
    await expect(aide.question(/Comment supprimer mon compte/)).toContainText("Mon compte");

    // Message trop court : refusé côté formulaire, rien n'est envoyé.
    await aide.ecrire("Visiteur", emailUnique("e2e.aide"), "court");
    await expect(page.getByText("au moins 10 caractères")).toBeVisible();

    await aide.ecrire("Visiteur", emailUnique("e2e.aide"), "Bonjour, j'ai une question sur l'application.");
    await expect(aide.confirmation()).toContainText("bien été envoyé");
  });

  test("les pages légales sont accessibles depuis le pied de page", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("contentinfo").getByRole("link", { name: "Mentions légales" }).click();
    await expect(page.getByRole("heading", { name: "Mentions légales" })).toBeVisible();

    await page.getByRole("contentinfo").getByRole("link", { name: "Confidentialité" }).click();
    await expect(page.getByRole("heading", { name: "Politique de confidentialité" })).toBeVisible();
  });
});
