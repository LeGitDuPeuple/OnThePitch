import { Evenement } from "../../src/domain/entities/Evenement";
import {
  EvenementRepositoryInterface,
  NouvelEvenement,
  EvenementProche,
} from "../../src/domain/interface/evenementRepositoryInterface";

// Double de test en mémoire : remplace la base pour tester EvenementService,
// RechercheEvenementService, InscriptionService et PresenceService isolément.
export class EvenementRepositoryFake implements EvenementRepositoryInterface {
  private evenements: Evenement[] = [];
  private prochainId = 1;

  // Prépare un état initial pour un test.
  ajouter(evenement: Evenement): void {
    this.evenements.push(evenement);
  }

  async creer(donnees: NouvelEvenement): Promise<Evenement> {
    const evenement = new Evenement({
      id: this.prochainId++,
      titre: donnees.titre,
      nombrePlaces: donnees.nombrePlaces,
      estPrive: donnees.estPrive,
      dateDebut: donnees.dateDebut,
      dateFin: donnees.dateFin,
      idLieu: 1,
      idOrganisateur: donnees.idOrganisateur,
      statut: "Ouvert",
      nombreInscrits: 0,
    });

    this.evenements.push(evenement);
    return evenement;
  }

  async trouverParId(id: number): Promise<Evenement | null> {
    return this.evenements.find((evenement) => evenement.id === id) ?? null;
  }

  async rechercherParRayon(): Promise<EvenementProche[]> {
    return [];
  }

  async desactiver(id: number): Promise<void> {
    const evenement = this.evenements.find((e) => e.id === id);
    if (evenement) evenement.dateDesactivation = new Date();
  }

  async terminer(id: number): Promise<void> {
    const evenement = this.evenements.find((e) => e.id === id);
    if (evenement) evenement.statut = "Termine";
  }
}
