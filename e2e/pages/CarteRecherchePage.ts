import { Page, Locator } from "@playwright/test";

export class CarteRecherchePage {
  readonly page: Page;
  readonly champAdresse: Locator;
  readonly boutonRechercher: Locator;
  readonly selectRayon: Locator;
  readonly resultats: Locator;
  readonly compteResultats: Locator;
  readonly boutonPrecedent: Locator;
  readonly boutonSuivant: Locator;

  constructor(page: Page) {
    this.page = page;
    this.champAdresse = page.getByLabel("Où chercher");
    this.boutonRechercher = page.getByRole("button", { name: "Rechercher" });
    this.selectRayon = page.getByLabel("Rayon");
    this.resultats = page.locator(".carte-evenement");
    this.compteResultats = page.locator(".entete-resultats span").first();
    this.boutonPrecedent = page.getByRole("button", { name: "Précédent" });
    this.boutonSuivant = page.getByRole("button", { name: "Suivant" });
  }

  async aller(): Promise<void> {
    await this.page.goto("/");
  }

  // Tape l'adresse puis ferme la liste de suggestions sans en choisir une
  // (Escape + clic ailleurs) avant de soumettre — reproduit une recherche
  // par ville plutôt que par une adresse précise suggérée.
  async rechercherParAdresse(adresse: string, rayonKm?: number): Promise<void> {
    await this.champAdresse.fill(adresse);
    await this.page.keyboard.press("Escape");
    if (rayonKm !== undefined) {
      await this.selectRayon.selectOption(String(rayonKm));
    }
    await this.boutonRechercher.click();
    await this.page.waitForLoadState("networkidle");
  }

  async ouvrirResultat(titre: string): Promise<void> {
    await this.page.locator(".carte-evenement", { hasText: titre }).click();
  }

  async pageSuivante(): Promise<void> {
    await this.boutonSuivant.click();
    await this.page.waitForLoadState("networkidle");
  }

  async pagePrecedente(): Promise<void> {
    await this.boutonPrecedent.click();
    await this.page.waitForLoadState("networkidle");
  }
}
