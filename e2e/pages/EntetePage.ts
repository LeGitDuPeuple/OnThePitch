import { Page, Locator, expect } from "@playwright/test";

// En-tête commun à tous les écrans (voir CLAUDE.md, "Front React", Entete.tsx).
// Composé dans les autres Page Objects plutôt qu'hérité : l'en-tête n'est pas
// une "page" à part entière, mais un morceau présent sur toutes.
export class EntetePage {
  readonly page: Page;
  readonly lienRechercher: Locator;
  readonly lienMonProfil: Locator;
  readonly lienCreerAnnonce: Locator;
  // .first() : l'en-tête rend une version mobile ET une version desktop de ces
  // éléments (repli CSS selon la largeur, voir CLAUDE.md "Responsive") — les
  // deux existent dans le DOM en même temps, seule leur visibilité change.
  readonly boutonCloche: Locator;
  readonly badgeNotifications: Locator;
  readonly boutonDeconnexion: Locator;
  readonly lienConnexionInscription: Locator;

  constructor(page: Page) {
    this.page = page;
    this.lienRechercher = page.getByRole("link", { name: "Rechercher" });
    this.lienMonProfil = page.getByRole("link", { name: "Mon profil" });
    this.lienCreerAnnonce = page.getByRole("link", { name: "Créer une annonce" });
    // Scopé sur la variante desktop, contrairement à boutonDeconnexion/
    // lienConnexionInscription plus haut : ceux-là passent par getByRole, qui
    // exclut déjà les éléments display:none de l'arbre d'accessibilité — un
    // simple .first() y suffit donc. Ici, .locator() sur une classe CSS
    // renvoie tous les éléments du DOM indépendamment de leur visibilité, et
    // la variante mobile (display:none en desktop) apparaît EN PREMIER dans
    // le DOM (voir Entete.tsx) : un .first() aurait ciblé le bouton caché.
    this.boutonCloche = page.locator(".entete-compte--desktop .cloche-notifications-bouton");
    this.badgeNotifications = page.locator(".entete-compte--desktop .cloche-notifications-badge");
    this.boutonDeconnexion = page.getByRole("button", { name: "Se déconnecter" }).first();
    this.lienConnexionInscription = page.getByRole("link", { name: "Connexion / Inscription" }).first();
  }

  async deconnecter(): Promise<void> {
    await this.boutonDeconnexion.click();
    await expect(this.lienConnexionInscription).toBeVisible();
  }

  async ouvrirNotifications(): Promise<void> {
    await this.boutonCloche.click();
  }

  async compteNotificationsNonLues(): Promise<number> {
    const badge = this.page.locator(".cloche-notifications-badge").first();
    if (!(await badge.isVisible().catch(() => false))) return 0;
    return Number(await badge.textContent());
  }

  // Le menu doit déjà être ouvert (voir ouvrirNotifications).
  async texteNotifications(): Promise<string[]> {
    return this.page.locator(".cloche-notifications-item").allTextContents();
  }

  // Clique la première notification (la plus récente, cf. tri
  // `orderBy: dateCreation desc` côté back) — marque comme lue et navigue
  // vers l'événement concerné (voir ClocheNotifications.tsx).
  async cliquerPremiereNotification(): Promise<void> {
    await this.page.locator(".cloche-notifications-item").first().click();
  }
}
