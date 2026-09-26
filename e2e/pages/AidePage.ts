import { Page, Locator } from "@playwright/test";

// Page "Aide" : FAQ dépliable + formulaire de contact.
export class AidePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async aller(): Promise<void> {
    await this.page.goto("/aide");
  }

  question(intitule: RegExp): Locator {
    return this.page.locator("details", { hasText: intitule });
  }

  async ecrire(nom: string, email: string, message: string): Promise<void> {
    await this.page.getByLabel("Nom").fill(nom);
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Message").fill(message);
    await this.page.getByRole("button", { name: "Envoyer" }).click();
  }

  confirmation(): Locator {
    return this.page.getByRole("status");
  }
}
