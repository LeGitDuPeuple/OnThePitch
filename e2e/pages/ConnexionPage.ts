import { Page, Locator } from "@playwright/test";

export class ConnexionPage {
  readonly page: Page;
  readonly champEmail: Locator;
  readonly champMotDePasse: Locator;
  readonly boutonSeConnecter: Locator;
  readonly messageErreur: Locator;

  constructor(page: Page) {
    this.page = page;
    this.champEmail = page.getByLabel("Email");
    this.champMotDePasse = page.getByLabel("Mot de passe");
    this.boutonSeConnecter = page.getByRole("button", { name: "Se connecter" });
    this.messageErreur = page.getByRole("alert");
  }

  async aller(): Promise<void> {
    await this.page.goto("/connexion");
  }

  async connecter(email: string, motDePasse: string): Promise<void> {
    await this.aller();
    await this.champEmail.fill(email);
    await this.champMotDePasse.fill(motDePasse);
    await this.boutonSeConnecter.click();
  }

  // Seconde étape, pour un compte avec double authentification.
  async saisirCode(code: string): Promise<void> {
    await this.page.getByLabel("Code de vérification").fill(code);
    await this.page.getByRole("button", { name: "Valider le code" }).click();
  }

  champCode(): Locator {
    return this.page.getByLabel("Code de vérification");
  }
}
