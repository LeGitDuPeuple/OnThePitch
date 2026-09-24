import { Page, Locator } from "@playwright/test";

// Page "Mon compte" : une section par sujet (email, mot de passe), chacune
// avec son propre formulaire — les locators sont donc scopés par section.
export class MonComptePage {
  readonly page: Page;
  private readonly sectionEmail: Locator;
  private readonly sectionMotDePasse: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sectionEmail = page.locator("section", { has: page.getByRole("heading", { name: "Adresse email" }) });
    this.sectionMotDePasse = page.locator("section", { has: page.getByRole("heading", { name: "Mot de passe" }) });
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
}
