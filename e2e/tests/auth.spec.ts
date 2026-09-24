import { test, expect } from "@playwright/test";
import { InscriptionPage } from "../pages/InscriptionPage";
import { ConnexionPage } from "../pages/ConnexionPage";
import { EntetePage } from "../pages/EntetePage";
import { emailUnique, MOT_DE_PASSE_TEST } from "../utils/donneesTest";

test.describe("Authentification", () => {
  test("l'inscription connecte automatiquement, puis déconnexion/reconnexion", async ({ page }) => {
    const inscriptionPage = new InscriptionPage(page);
    const entete = new EntetePage(page);
    const email = emailUnique("e2e.auth");

    await inscriptionPage.inscrire({ prenom: "Test", nom: "E2E", email, motDePasse: MOT_DE_PASSE_TEST });

    // POST /auth/inscription ne pose pas de cookie (voir CLAUDE.md, section 2) :
    // useInscriptionForm enchaîne la connexion pour éviter de resaisir.
    await expect(page).toHaveURL("/");
    await expect(entete.boutonDeconnexion).toBeVisible();

    await entete.deconnecter();

    const connexionPage = new ConnexionPage(page);
    await connexionPage.connecter(email, MOT_DE_PASSE_TEST);
    await expect(page).toHaveURL("/");
    await expect(entete.boutonDeconnexion).toBeVisible();
  });

  test("refuse la connexion avec un mauvais mot de passe", async ({ page }) => {
    const inscriptionPage = new InscriptionPage(page);
    const entete = new EntetePage(page);
    const email = emailUnique("e2e.authko");
    await inscriptionPage.inscrire({ prenom: "Test", nom: "KO", email, motDePasse: MOT_DE_PASSE_TEST });
    await entete.deconnecter();

    const connexionPage = new ConnexionPage(page);
    await connexionPage.connecter(email, "MauvaisMotDePasse1!");

    await expect(connexionPage.messageErreur).toBeVisible();
    await expect(page).toHaveURL("/connexion");
  });
});
