import { Page, Locator } from "@playwright/test";

export class InscriptionPage {
  readonly page: Page;
  readonly champPrenom: Locator;
  readonly champNom: Locator;
  readonly champEmail: Locator;
  readonly champMotDePasse: Locator;
  readonly boutonCreerCompte: Locator;

  constructor(page: Page) {
    this.page = page;
    this.champPrenom = page.getByLabel("Prénom");
    this.champNom = page.getByLabel("Nom", { exact: true });
    this.champEmail = page.getByLabel("Email");
    this.champMotDePasse = page.getByLabel("Mot de passe");
    this.boutonCreerCompte = page.getByRole("button", { name: "Créer mon compte" });
  }

  async aller(): Promise<void> {
    await this.page.goto("/inscription");
  }

  // Enchaîne automatiquement la connexion côté serveur (voir CLAUDE.md,
  // useInscriptionForm) — après cet appel, l'utilisateur est déjà connecté.
  // Attend explicitement la redirection vers "/" : sans ça, un `page.goto`
  // immédiat juste après (dans le test appelant) peut interrompre la requête
  // POST /auth/connexion encore en vol et repartir non authentifié.
  async inscrire(params: { prenom: string; nom: string; email: string; motDePasse: string }): Promise<void> {
    await this.aller();
    await this.champPrenom.fill(params.prenom);
    await this.champNom.fill(params.nom);
    await this.champEmail.fill(params.email);
    await this.champMotDePasse.fill(params.motDePasse);
    await this.boutonCreerCompte.click();
    await this.page.waitForURL("/");
  }
}
