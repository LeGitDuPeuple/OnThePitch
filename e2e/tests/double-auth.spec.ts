import { test, expect } from "@playwright/test";
import { generateSync } from "otplib";
import { InscriptionPage } from "../pages/InscriptionPage";
import { ConnexionPage } from "../pages/ConnexionPage";
import { EntetePage } from "../pages/EntetePage";
import { MonComptePage } from "../pages/MonComptePage";
import { emailUnique, MOT_DE_PASSE_TEST } from "../utils/donneesTest";

// Double authentification par application (TOTP), de bout en bout : le test
// joue le rôle de l'application d'authentification en générant les codes à
// partir du secret affiché (voir CLAUDE.md, section Compte et sécurité).
test.describe("Double authentification", () => {
  test("activer, se connecter avec un code, avec un code de secours (usage unique), puis désactiver", async ({ page }) => {
    const email = emailUnique("e2e.2fa");
    await new InscriptionPage(page).inscrire({ prenom: "Double", nom: "Auth", email, motDePasse: MOT_DE_PASSE_TEST });

    // L'inscription propose la 2FA sans l'imposer : bandeau fermable avec un lien.
    await expect(page.getByRole("status")).toContainText("Compte créé");
    await page.getByRole("link", { name: /double authentification/i }).click();
    await expect(page).toHaveURL("/compte");

    // --- Activation : secret, premier code, puis 10 codes de secours affichés une fois.
    const compte = new MonComptePage(page);
    const secret = await compte.commencerActivationDoubleAuth();
    expect(secret.length).toBeGreaterThanOrEqual(16);

    await compte.confirmerActivationDoubleAuth("000000");
    await expect(compte.erreurCodeSection()).toContainText("Code invalide");

    await compte.confirmerActivationDoubleAuth(generateSync({ secret }));
    const codesSecours = await compte.lireCodesSecours();
    expect(codesSecours).toHaveLength(10);
    await compte.terminerCodesSecours();
    await expect(compte.badgeDoubleAuthActive()).toBeVisible();

    // Les codes ne sont plus jamais réaffichés (seuls leurs hachages existent).
    await page.reload();
    await expect(compte.badgeDoubleAuthActive()).toBeVisible();
    await expect(page.locator(".codes-secours")).toHaveCount(0);

    // --- Connexion en deux temps avec un code de l'application.
    const entete = new EntetePage(page);
    const connexion = new ConnexionPage(page);
    await entete.deconnecter();
    await connexion.connecter(email, MOT_DE_PASSE_TEST);
    await expect(connexion.champCode()).toBeVisible();
    await expect(page).toHaveURL("/connexion");

    await connexion.saisirCode("000000");
    await expect(page.getByRole("alert")).toContainText("Code invalide");

    await connexion.saisirCode(generateSync({ secret }));
    await expect(page).toHaveURL("/");
    await expect(entete.boutonDeconnexion).toBeVisible();

    // --- Connexion avec un code de secours : marche une fois, pas deux.
    await entete.deconnecter();
    await connexion.connecter(email, MOT_DE_PASSE_TEST);
    await connexion.saisirCode(codesSecours[0]);
    await expect(page).toHaveURL("/");

    await entete.deconnecter();
    await connexion.connecter(email, MOT_DE_PASSE_TEST);
    await connexion.saisirCode(codesSecours[0]);
    await expect(page.getByRole("alert")).toContainText("Code invalide");

    // --- Désactivation : exige un code valide, puis la connexion redevient directe.
    await connexion.saisirCode(generateSync({ secret }));
    await expect(page).toHaveURL("/");
    await new MonComptePage(page).aller();
    await compte.desactiverDoubleAuth(generateSync({ secret }));
    await expect(compte.boutonActiverDoubleAuth()).toBeVisible();

    await entete.deconnecter();
    await connexion.connecter(email, MOT_DE_PASSE_TEST);
    await expect(page).toHaveURL("/");
  });
});
