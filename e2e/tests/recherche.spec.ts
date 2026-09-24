import { test, expect } from "@playwright/test";
import { CarteRecherchePage } from "../pages/CarteRecherchePage";
import { emailUnique, MOT_DE_PASSE_TEST } from "../utils/donneesTest";
import { creerCompteEtConnecter, creerEvenement, annulerEvenement, dateISODansNJours, nouveauContexteApi } from "../utils/apiClient";

test.describe("Recherche géolocalisée", () => {
  // Onze événements réels au même endroit : garantit une pagination sur deux
  // pages (taille de page 10, voir CLAUDE.md, section Recherche géolocalisée).
  // Adresse volontairement différente de celle utilisée par les autres tests
  // (Paris) : sur une base de dev partagée qui accumule des événements d'une
  // exécution à l'autre, un rayon autour de Paris n'a aucun total garanti —
  // repéré en pratique (le test échouait selon ce qui traînait déjà en base).
  test("pagination : la page suivante montre le reliquat, puis se désactive", async ({ page }) => {
    const api = await nouveauContexteApi();
    await creerCompteEtConnecter(api, {
      prenom: "Seed",
      nom: "Recherche",
      email: emailUnique("e2e.seed.recherche"),
      motDePasse: MOT_DE_PASSE_TEST,
    });

    const titrePrefixe = `E2E pagination ${Date.now()}`;
    const idsCrees: number[] = [];
    for (let i = 0; i < 11; i++) {
      idsCrees.push(
        await creerEvenement(api, {
          titre: `${titrePrefixe} ${i}`,
          dateDebutISO: dateISODansNJours(6),
          dateFinISO: dateISODansNJours(6, 20),
          adresse: "Place Bellecour, Lyon",
        })
      );
    }

    try {
      const recherchePage = new CarteRecherchePage(page);
      await recherchePage.aller();
      await recherchePage.rechercherParAdresse("Place Bellecour, Lyon", 5);

      await expect(recherchePage.resultats).toHaveCount(10);
      await expect(recherchePage.boutonPrecedent).toBeDisabled();
      await expect(recherchePage.boutonSuivant).toBeEnabled();

      await recherchePage.pageSuivante();

      await expect(recherchePage.boutonPrecedent).toBeEnabled();
      await expect(recherchePage.boutonSuivant).toBeDisabled();

      await recherchePage.pagePrecedente();
      await expect(recherchePage.boutonPrecedent).toBeDisabled();
    } finally {
      // Sans ce nettoyage, ces événements restent en base et faussent le
      // total à la prochaine exécution de ce même test (repéré en pratique).
      for (const id of idsCrees) await annulerEvenement(api, id);
      await api.dispose();
    }
  });

  test("une zone sans événement renvoie une liste vide, pas une erreur", async ({ page }) => {
    const recherchePage = new CarteRecherchePage(page);
    await recherchePage.aller();
    // L'API Adresse (gouvernement français) ne couvre que la France : une
    // ville française réelle, mais loin de Paris où tous les événements de
    // test sont créés — pas une zone au hasard sur la carte, qui échouerait
    // au géocodage plutôt que de renvoyer une liste vide.
    await recherchePage.rechercherParAdresse("Brest", 5);

    await expect(recherchePage.resultats).toHaveCount(0);
    await expect(page.getByText(/0 résultat/)).toBeVisible();
  });
});
