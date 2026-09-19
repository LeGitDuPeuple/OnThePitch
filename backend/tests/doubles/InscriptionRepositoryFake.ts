import { Inscription, StatutInscription } from "../../src/domain/entities/Inscription";
import { InscriptionRepositoryInterface, InscritDetail } from "../../src/domain/interface/inscriptionRepositoryInterface";

// Identité minimale d'un joueur, uniquement pour restituer nom/prénom dans listerParEvenement.
const IDENTITES_JOUEURS: Record<number, { nom: string; prenom: string }> = {
  1: { nom: "Organisateur", prenom: "Test" },
  2: { nom: "Deux", prenom: "Joueur" },
  3: { nom: "Trois", prenom: "Joueur" },
};

export class InscriptionRepositoryFake implements InscriptionRepositoryInterface {
  private inscriptions: Inscription[] = [];

  async listerParEvenement(idEvenement: number): Promise<InscritDetail[]> {
    return this.inscriptions
      .filter((inscription) => inscription.idEvenement === idEvenement)
      .map((inscription) => ({
        idJoueur: inscription.idJoueur,
        statut: inscription.statut,
        presence: inscription.presence,
        ...(IDENTITES_JOUEURS[inscription.idJoueur] ?? { nom: "Joueur", prenom: `#${inscription.idJoueur}` }),
      }));
  }

  ajouter(inscription: Inscription): void {
    this.inscriptions.push(inscription);
  }

  async trouver(idJoueur: number, idEvenement: number): Promise<Inscription | null> {
    return this.trouverInterne(idJoueur, idEvenement) ?? null;
  }

  async rejoindre(idJoueur: number, idEvenement: number, statutInitial: StatutInscription): Promise<Inscription> {
    const inscription = new Inscription({ idJoueur, idEvenement, dateInscription: new Date(), statut: statutInitial });
    this.inscriptions.push(inscription);
    return inscription;
  }

  async accepter(idJoueur: number, idEvenement: number): Promise<Inscription> {
    const inscription = this.trouverOuLever(idJoueur, idEvenement);
    inscription.statut = "acceptee";
    return inscription;
  }

  async refuser(idJoueur: number, idEvenement: number): Promise<Inscription> {
    const inscription = this.trouverOuLever(idJoueur, idEvenement);
    inscription.statut = "refusee";
    return inscription;
  }

  async desinscrire(idJoueur: number, idEvenement: number): Promise<void> {
    this.inscriptions = this.inscriptions.filter(
      (inscription) => !(inscription.idJoueur === idJoueur && inscription.idEvenement === idEvenement)
    );
  }

  async marquerPresence(idJoueur: number, idEvenement: number): Promise<Inscription> {
    const inscription = this.trouverOuLever(idJoueur, idEvenement);
    inscription.presence = new Date();
    return inscription;
  }

  private trouverInterne(idJoueur: number, idEvenement: number): Inscription | undefined {
    return this.inscriptions.find(
      (inscription) => inscription.idJoueur === idJoueur && inscription.idEvenement === idEvenement
    );
  }

  private trouverOuLever(idJoueur: number, idEvenement: number): Inscription {
    const inscription = this.trouverInterne(idJoueur, idEvenement);
    if (!inscription) throw new Error("Inscription introuvable (double de test)");
    return inscription;
  }
}
