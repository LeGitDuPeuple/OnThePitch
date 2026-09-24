import { Page, Locator, expect } from "@playwright/test";

// Le bouton d'inscription change de libellé selon l'état (cf. CLAUDE.md,
// "Front React" — BoutonInscription) : ce Page Object expose une action par
// état plutôt qu'un unique "cliquer le bouton", plus lisible dans les tests.
export class FicheEvenementPage {
  readonly page: Page;
  readonly titre: Locator;
  readonly badges: Locator;
  readonly placesRestantes: Locator;
  readonly messageErreur: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titre = page.locator("h1");
    this.badges = page.locator(".badges-fiche .badge");
    this.placesRestantes = page.locator(".carte-places");
    this.messageErreur = page.getByRole("alert");
  }

  async aller(idEvenement: number): Promise<void> {
    await this.page.goto(`/evenements/${idEvenement}`);
  }

  async sinscrire(): Promise<void> {
    await this.page.getByRole("button", { name: "S'inscrire à cet événement" }).click();
  }

  async demanderARejoindre(): Promise<void> {
    await this.page.getByRole("button", { name: "Demander à rejoindre" }).click();
  }

  async seDesinscrire(): Promise<void> {
    await this.page.getByRole("button", { name: "Se désinscrire" }).click();
  }

  async annulerMaDemande(): Promise<void> {
    await this.page.getByRole("button", { name: "Annuler ma demande" }).click();
  }

  // Cherche la ligne de "Demandes en attente" contenant ce nom, puis clique
  // Accepter/Refuser dans cette ligne précise (plusieurs demandes possibles).
  private ligneDemande(nomComplet: string): Locator {
    return this.page.locator(".demandes-attente .ligne-demande", { hasText: nomComplet });
  }

  async accepterDemandeDe(nomComplet: string): Promise<void> {
    await this.ligneDemande(nomComplet).getByRole("button", { name: "Accepter" }).click();
  }

  async refuserDemandeDe(nomComplet: string): Promise<void> {
    await this.ligneDemande(nomComplet).getByRole("button", { name: "Refuser" }).click();
  }

  async attendreTitre(titre: string): Promise<void> {
    await expect(this.titre).toHaveText(titre);
  }

  messageDemandeRefusee(): Locator {
    return this.page.getByText("a été refusée par l'organisateur");
  }

  // Confirmation en deux temps (cf. CLAUDE.md, section Présences) : le premier
  // clic affiche "Oui, terminer l'événement" / "Non" à la place du bouton initial.
  async terminerEvenement(): Promise<void> {
    await this.page.getByRole("button", { name: "Terminer l'événement" }).click();
    await this.page.getByRole("button", { name: "Oui, terminer l'événement" }).click();
  }

  // Un seul bloc de formulaire "ouvert" à la fois dans ce parcours (le
  // signalement n'est jamais ouvert) — `.bloc-signalement` (classe partagée
  // avec le formulaire de signalement, voir FicheEvenement.tsx) ne désigne
  // donc que le formulaire d'évaluation ici.
  async evaluerOrganisateur(note: number, commentaire?: string): Promise<void> {
    await this.page.getByRole("button", { name: "Évaluer l'organisateur" }).click();
    await this.page.locator(".bloc-signalement select").selectOption(String(note));
    if (commentaire) await this.page.locator(".bloc-signalement textarea").fill(commentaire);
    await this.page.getByRole("button", { name: "Envoyer l'évaluation" }).click();
  }

  messageEvaluationEnvoyee(): Locator {
    return this.page.getByText("Merci, votre évaluation a été enregistrée.");
  }

  // Pastille "★ X.X/5" à côté du nom de l'organisateur (voir CLAUDE.md,
  // section Évaluations — moyenne de ses évaluations, tous événements confondus).
  pastilleFiabilite(): Locator {
    return this.page.locator(".pastille-fiabilite");
  }
}
