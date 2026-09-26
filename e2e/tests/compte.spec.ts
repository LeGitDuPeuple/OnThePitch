import { test, expect } from "@playwright/test";
import { InscriptionPage } from "../pages/InscriptionPage";
import { ConnexionPage } from "../pages/ConnexionPage";
import { EntetePage } from "../pages/EntetePage";
import { MonComptePage } from "../pages/MonComptePage";
import { emailUnique, MOT_DE_PASSE_TEST } from "../utils/donneesTest";

// Gestion du compte par son propriétaire : changement d'email puis de mot de
// passe, chacun confirmé par une reconnexion réelle avec le nouvel
// identifiant (voir CLAUDE.md, section Compte).
test.describe("Mon compte", () => {
  test("changer d'email puis de mot de passe, et se reconnecter avec les nouveaux", async ({ page }) => {
    const ancienEmail = emailUnique("e2e.compte");
    const nouvelEmail = emailUnique("e2e.compte.new");
    const nouveauMotDePasse = "NouveauMdp456!";

    await new InscriptionPage(page).inscrire({
      prenom: "Compte",
      nom: "E2E",
      email: ancienEmail,
      motDePasse: MOT_DE_PASSE_TEST,
    });

    // L'avatar de l'en-tête mène à "Mon compte".
    const entete = new EntetePage(page);
    await entete.avatarCompte.click();
    await expect(page).toHaveURL("/compte");

    const compte = new MonComptePage(page);

    // Un mot de passe faux est refusé, sans changer l'email.
    await compte.changerEmail(nouvelEmail, "MauvaisMotDePasse1!");
    await expect(compte.erreurEmailSection()).toContainText("Mot de passe incorrect");

    await compte.changerEmail(nouvelEmail, MOT_DE_PASSE_TEST);
    await expect(compte.confirmationEmail()).toContainText("Adresse email mise à jour");

    await compte.changerMotDePasse(MOT_DE_PASSE_TEST, nouveauMotDePasse);
    await expect(compte.confirmationMotDePasse()).toContainText("Mot de passe mis à jour");

    // Reconnexion avec le nouvel email ET le nouveau mot de passe.
    await entete.deconnecter();
    const connexion = new ConnexionPage(page);
    await connexion.connecter(nouvelEmail, nouveauMotDePasse);
    await expect(page).toHaveURL("/");
    await expect(entete.boutonDeconnexion).toBeVisible();
  });

  test("un visiteur non connecté est invité à se connecter", async ({ page }) => {
    await new MonComptePage(page).aller();

    await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
  });

  test("supprimer son compte : mot de passe faux refusé, puis déconnexion et connexion impossible", async ({ page }) => {
    const email = emailUnique("e2e.suppr");
    await new InscriptionPage(page).inscrire({ prenom: "Suppr", nom: "E2E", email, motDePasse: MOT_DE_PASSE_TEST });

    const entete = new EntetePage(page);
    await entete.avatarCompte.click();
    const compte = new MonComptePage(page);

    await compte.ouvrirSuppression();
    await compte.confirmerSuppression("MauvaisMotDePasse1!");
    await expect(compte.erreurSuppression()).toContainText("Mot de passe incorrect");
    await expect(page).toHaveURL("/compte");

    await compte.confirmerSuppression(MOT_DE_PASSE_TEST);
    await expect(page).toHaveURL("/");
    await expect(entete.boutonDeconnexion).toBeHidden();

    await new ConnexionPage(page).connecter(email, MOT_DE_PASSE_TEST);
    await expect(page).not.toHaveURL("/");
  });
});
