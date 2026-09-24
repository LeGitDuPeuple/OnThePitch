import { Page, Locator } from "@playwright/test";

export type DonneesEvenement = {
  adresse: string;
  date: string; // YYYY-MM-DD
  heureDebut: string; // HH:MM
  heureFin: string; // HH:MM
  titre: string;
  nombrePlaces: number;
  estPrive?: boolean;
};

export class CreationAnnoncePage {
  readonly page: Page;
  readonly champAdresse: Locator;
  readonly champDate: Locator;
  readonly champHeureDebut: Locator;
  readonly champHeureFin: Locator;
  readonly champTitre: Locator;
  readonly champNombrePlaces: Locator;
  readonly optionEvenementPrive: Locator;
  readonly boutonPublier: Locator;
  readonly messageErreur: Locator;

  constructor(page: Page) {
    this.page = page;
    this.champAdresse = page.getByLabel("Adresse du terrain");
    this.champDate = page.getByLabel("Date");
    this.champHeureDebut = page.getByLabel("Heure de début");
    this.champHeureFin = page.getByLabel("Heure de fin");
    this.champTitre = page.getByLabel("Titre de l'annonce");
    this.champNombrePlaces = page.getByLabel("Nombre de places");
    // Label imbriqué (texte dans un <strong>) : le clic sur le texte
    // bascule quand même le radio associé (comportement natif d'un <label>).
    this.optionEvenementPrive = page.getByText("Événement privé", { exact: true });
    this.boutonPublier = page.getByRole("button", { name: "Publier l'annonce" });
    this.messageErreur = page.getByRole("alert");
  }

  async aller(): Promise<void> {
    await this.page.goto("/creer");
  }

  async remplirEtPublier(donnees: DonneesEvenement): Promise<void> {
    await this.aller();
    await this.champAdresse.fill(donnees.adresse);
    await this.page.keyboard.press("Escape"); // ferme les suggestions d'adresse
    await this.champDate.fill(donnees.date);
    await this.champHeureDebut.fill(donnees.heureDebut);
    await this.champHeureFin.fill(donnees.heureFin);
    await this.champTitre.fill(donnees.titre);
    await this.champNombrePlaces.fill(String(donnees.nombrePlaces));
    if (donnees.estPrive) {
      await this.optionEvenementPrive.click();
    }

    // GeocodageService appelle la vraie API Adresse du gouvernement (voir
    // CLAUDE.md — pas de cache, volontairement) : un 503 "service
    // indisponible" transitoire est possible si la suite de tests a créé
    // beaucoup d'événements de suite juste avant. On réessaie, comme le
    // ferait un vrai utilisateur voyant ce message.
    for (let tentative = 1; tentative <= 4; tentative++) {
      await this.boutonPublier.click();
      const resultat = await Promise.race([
        this.page.waitForURL(/\/evenements\/\d+/, { timeout: 8_000 }).then(() => "succes" as const),
        this.messageErreur.waitFor({ state: "visible", timeout: 8_000 }).then(() => "erreur" as const),
      ]).catch(() => "aucun" as const);

      if (resultat === "succes") return;
      if (tentative === 4) throw new Error("Publication de l'annonce toujours en échec après plusieurs tentatives");
      await this.page.waitForTimeout(800 * tentative);
    }
  }
}
