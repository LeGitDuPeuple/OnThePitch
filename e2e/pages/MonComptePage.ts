import { Page, Locator } from "@playwright/test";

// Page "Mon compte" : une section par sujet (email, mot de passe), chacune
// avec son propre formulaire — les locators sont donc scopés par section.
export class MonComptePage {
  readonly page: Page;
  private readonly sectionEmail: Locator;
  private readonly sectionMotDePasse: Locator;
  private readonly sectionDoubleAuth: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sectionEmail = page.locator("section", { has: page.getByRole("heading", { name: "Adresse email" }) });
    this.sectionMotDePasse = page.locator("section", { has: page.getByRole("heading", { name: "Mot de passe" }) });
    this.sectionDoubleAuth = page.locator("section", { has: page.getByRole("heading", { name: "Double authentification" }) });
  }

  async aller(): Promise<void> {
    await this.page.goto("/compte");
  }

  async changerEmail(nouvelEmail: string, motDePasse: string): Promise<void> {
    await this.sectionEmail.getByLabel("Email").fill(nouvelEmail);
    await this.sectionEmail.getByLabel(/Mot de passe actuel/).fill(motDePasse);
    await this.sectionEmail.getByRole("button", { name: "Modifier l'adresse email" }).click();
  }

  async changerMotDePasse(actuel: string, nouveau: string): Promise<void> {
    await this.sectionMotDePasse.getByLabel("Mot de passe actuel", { exact: true }).fill(actuel);
    await this.sectionMotDePasse.getByLabel("Nouveau mot de passe", { exact: true }).fill(nouveau);
    await this.sectionMotDePasse.getByLabel("Confirmer le nouveau mot de passe").fill(nouveau);
    await this.sectionMotDePasse.getByRole("button", { name: "Modifier le mot de passe" }).click();
  }

  confirmationEmail(): Locator {
    return this.sectionEmail.getByRole("status");
  }

  confirmationMotDePasse(): Locator {
    return this.sectionMotDePasse.getByRole("status");
  }

  erreurEmailSection(): Locator {
    return this.sectionEmail.getByRole("alert");
  }

  // --- Double authentification ---------------------------------------------

  // Lance l'activation et renvoie le secret affiché sous le QR code (l'appli
  // d'authentification d'un vrai utilisateur le scannerait ; le test s'en sert
  // pour générer les codes à sa place).
  async commencerActivationDoubleAuth(): Promise<string> {
    await this.sectionDoubleAuth.getByRole("button", { name: "Activer la double authentification" }).click();
    const secretAffiche = await this.sectionDoubleAuth.locator(".secret-double-auth").textContent();
    return (secretAffiche ?? "").replace(/\s/g, "");
  }

  async confirmerActivationDoubleAuth(code: string): Promise<void> {
    await this.sectionDoubleAuth.getByLabel("Code à 6 chiffres").fill(code);
    await this.sectionDoubleAuth.getByRole("button", { name: "Confirmer et activer" }).click();
  }

  // Codes de secours affichés (une seule fois) après l'activation.
  async lireCodesSecours(): Promise<string[]> {
    // allTextContents() ne réessaie pas : attendre d'abord que l'écran des
    // codes soit affiché (le serveur les génère et hache avant de répondre).
    await this.sectionDoubleAuth.locator(".codes-secours").waitFor({ state: "visible" });
    return this.sectionDoubleAuth.locator(".codes-secours code").allTextContents();
  }

  async terminerCodesSecours(): Promise<void> {
    await this.sectionDoubleAuth.getByLabel("J'ai sauvegardé mes codes de secours").check();
    await this.sectionDoubleAuth.getByRole("button", { name: "Terminer" }).click();
  }

  async desactiverDoubleAuth(code: string): Promise<void> {
    await this.sectionDoubleAuth.getByRole("button", { name: "Désactiver la double authentification" }).click();
    await this.sectionDoubleAuth.getByLabel("Code de vérification").fill(code);
    await this.sectionDoubleAuth.getByRole("button", { name: "Désactiver", exact: true }).click();
  }

  badgeDoubleAuthActive(): Locator {
    return this.sectionDoubleAuth.locator(".badge", { hasText: "Activée" });
  }

  boutonActiverDoubleAuth(): Locator {
    return this.sectionDoubleAuth.getByRole("button", { name: "Activer la double authentification" });
  }

  erreurCodeSection(): Locator {
    return this.sectionDoubleAuth.getByRole("alert");
  }
}
