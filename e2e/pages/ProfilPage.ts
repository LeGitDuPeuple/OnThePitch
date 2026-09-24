import { Page, Locator } from "@playwright/test";

export class ProfilPage {
  readonly page: Page;
  readonly titrePage: Locator;
  readonly sectionOrganises: Locator;
  readonly sectionParticipe: Locator;
  readonly sectionEnAttente: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titrePage = page.locator(".profil-entete h1");
    this.sectionOrganises = page.locator(".profil-section", { hasText: "Événements que j'organise" });
    this.sectionParticipe = page.locator(".profil-section", { hasText: "Événements auxquels je participe" });
    this.sectionEnAttente = page.locator(".profil-section", { hasText: "Mes demandes en attente" });
  }

  async aller(): Promise<void> {
    await this.page.goto("/profil");
  }

  // Cherche dans "j'organise", à venir ET repliés dans "Terminés" (les ouvre
  // au besoin) — voir CLAUDE.md, Profil : les terminés sont dans un <details>.
  // Attend explicitement que la section existe avant de regarder dedans :
  // `.isVisible()` seul vérifie l'instant présent, sans réessayer — un chargement
  // encore en cours (page découpée en lazy loading, voir CLAUDE.md, ou simple
  // appel réseau) renverrait alors "false" à tort.
  async contientEvenementOrganise(titre: string): Promise<boolean> {
    await this.sectionOrganises.waitFor({ state: "visible" });
    const detailsTermines = this.sectionOrganises.locator("details");
    if (await detailsTermines.count()) await detailsTermines.locator("summary").click();
    return this.sectionOrganises.getByText(titre).isVisible();
  }
}
