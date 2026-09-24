import { test, expect } from "@playwright/test";
import { InscriptionPage } from "../pages/InscriptionPage";
import { CreationAnnoncePage } from "../pages/CreationAnnoncePage";
import { FicheEvenementPage } from "../pages/FicheEvenementPage";
import { emailUnique, MOT_DE_PASSE_TEST, ADRESSE_TEST, dansNJours } from "../utils/donneesTest";

test.describe("Création d'événement", () => {
  test("un joueur publie une annonce et arrive sur sa fiche", async ({ page }) => {
    const inscriptionPage = new InscriptionPage(page);
    await inscriptionPage.inscrire({
      prenom: "Organisateur",
      nom: "E2E",
      email: emailUnique("e2e.creation"),
      motDePasse: MOT_DE_PASSE_TEST,
    });

    const { date, heure } = dansNJours(5);
    const titre = `E2E création ${Date.now()}`;
    const creationPage = new CreationAnnoncePage(page);
    await creationPage.remplirEtPublier({
      adresse: ADRESSE_TEST,
      date,
      heureDebut: heure,
      heureFin: "20:00",
      titre,
      nombrePlaces: 8,
    });

    const fichePage = new FicheEvenementPage(page);
    await fichePage.attendreTitre(titre);
  });

  test("un visiteur non connecté ne peut pas accéder au formulaire", async ({ page }) => {
    await page.goto("/creer");
    await expect(page.getByText("Connectez-vous pour créer un événement")).toBeVisible();
  });
});
