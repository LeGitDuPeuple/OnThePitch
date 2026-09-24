import { test, expect } from "@playwright/test";
import { ProfilPage } from "../pages/ProfilPage";
import { emailUnique, MOT_DE_PASSE_TEST } from "../utils/donneesTest";
import { creerCompteEtConnecter, creerEvenement, dateISODansNJours } from "../utils/apiClient";

test.describe("Profil", () => {
  test("l'organisateur retrouve son événement dans 'j'organise'", async ({ page }) => {
    // page.request partage le pot de cookies avec `page` : la page est déjà
    // connectée en tant que cet organisateur une fois l'appel terminé.
    await creerCompteEtConnecter(page.request, {
      prenom: "Organisateur",
      nom: "Profil",
      email: emailUnique("e2e.profil"),
      motDePasse: MOT_DE_PASSE_TEST,
    });

    const titre = `E2E profil ${Date.now()}`;
    await creerEvenement(page.request, {
      titre,
      dateDebutISO: dateISODansNJours(7),
      dateFinISO: dateISODansNJours(7, 20),
    });

    const profilPage = new ProfilPage(page);
    await profilPage.aller();

    expect(await profilPage.contientEvenementOrganise(titre)).toBe(true);
  });

  test("un visiteur non connecté est invité à se connecter", async ({ page }) => {
    const profilPage = new ProfilPage(page);
    await profilPage.aller();
    await expect(page.getByRole("link", { name: "Connectez-vous" })).toBeVisible();
  });
});
