import { Evenement } from "../../src/domain/entities/Evenement";
import {
  EvenementRepositoryInterface,
  NouvelEvenement,
  EvenementProche,
  EvenementDetail,
  LieuDetail,
} from "../../src/domain/interface/evenementRepositoryInterface";

// Double de test en mémoire : remplace la base pour tester EvenementService,
// RechercheEvenementService, InscriptionService et PresenceService isolément.
export class EvenementRepositoryFake implements EvenementRepositoryInterface {
  private evenements: Evenement[] = [];
  private lieux = new Map<number, LieuDetail>();
  private prochainId = 1;

  // Prépare un état initial pour un test.
  ajouter(evenement: Evenement): void {
    this.evenements.push(evenement);
  }

  async creer(donnees: NouvelEvenement): Promise<Evenement> {
    const idLieu = this.prochainId; // un lieu par événement, comme en base

    const evenement = new Evenement({
      id: this.prochainId++,
      titre: donnees.titre,
      description: donnees.description,
      nombrePlaces: donnees.nombrePlaces,
      estPrive: donnees.estPrive,
      dateDebut: donnees.dateDebut,
      dateFin: donnees.dateFin,
      idLieu,
      idOrganisateur: donnees.idOrganisateur,
      statut: "Ouvert",
      niveauRequis: donnees.niveauRequis,
      nombreInscrits: 0,
    });

    this.evenements.push(evenement);
    this.lieux.set(evenement.id, {
      nom: donnees.lieu.nom ?? null,
      adresse: donnees.lieu.adresse,
      ville: donnees.lieu.ville,
      codePostal: donnees.lieu.codePostal,
      latitude: donnees.lieu.latitude,
      longitude: donnees.lieu.longitude,
      typeTerrain: donnees.lieu.typeTerrain ?? null,
      aUnePhoto: false,
    });

    return evenement;
  }

  async trouverParId(id: number): Promise<Evenement | null> {
    return this.evenements.find((evenement) => evenement.id === id) ?? null;
  }

  async trouverAvecLieu(id: number): Promise<EvenementDetail | null> {
    const evenement = await this.trouverParId(id);
    const lieu = this.lieux.get(id);

    if (!evenement || !lieu) return null;

    return { evenement, lieu };
  }

  async rechercherParRayon(_longitude: number, _latitude: number, _rayonMetres: number): Promise<EvenementProche[]> {
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
