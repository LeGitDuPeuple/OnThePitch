import { Evenement } from "../../src/domain/entities/Evenement";
import {
  EvenementRepositoryInterface,
  NouvelEvenement,
  ModificationEvenement,
  EvenementProche,
  EvenementDetail,
  LieuDetail,
  FiltresEvenementsAdmin,
  EvenementAvecOrganisateur,
} from "../../src/domain/interface/evenementRepositoryInterface";
import { RessourceIntrouvable } from "../../src/domain/erreurMetier";

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
      format: donnees.format,
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

    // Identité factice : ce double ne modélise pas les utilisateurs.
    return { evenement, lieu, organisateur: { nom: "Organisateur", prenom: `#${evenement.idOrganisateur}`, fiabilite: null } };
  }

  async modifier(id: number, donnees: ModificationEvenement): Promise<Evenement> {
    const evenement = this.evenements.find((e) => e.id === id);
    if (!evenement) throw new RessourceIntrouvable("Événement introuvable (double de test)");

    if (donnees.titre !== undefined) evenement.titre = donnees.titre;
    if (donnees.description !== undefined) evenement.description = donnees.description;
    if (donnees.format !== undefined) evenement.format = donnees.format;
    if (donnees.nombrePlaces !== undefined) evenement.nombrePlaces = donnees.nombrePlaces;
    if (donnees.dateDebut !== undefined) evenement.dateDebut = donnees.dateDebut;
    if (donnees.dateFin !== undefined) evenement.dateFin = donnees.dateFin;
    if (donnees.niveauRequis !== undefined) evenement.niveauRequis = donnees.niveauRequis;

    return evenement;
  }

  async rechercherParRayon(
    _longitude: number,
    _latitude: number,
    _rayonMetres: number,
    _skip: number,
    _take: number
  ): Promise<EvenementProche[]> {
    return [];
  }

  async listerParOrganisateur(idOrganisateur: number): Promise<Evenement[]> {
    return this.evenements.filter((evenement) => evenement.idOrganisateur === idOrganisateur && evenement.estActif());
  }

  async compterParStatut(): Promise<{ total: number; actifs: number; termines: number }> {
    return {
      total: this.evenements.length,
      actifs: this.evenements.filter((e) => e.estActif() && (e.statut === "Ouvert" || e.statut === "Complet")).length,
      termines: this.evenements.filter((e) => e.estActif() && e.statut === "Termine").length,
    };
  }

  async listerTousAdmin(filtres: FiltresEvenementsAdmin): Promise<EvenementAvecOrganisateur[]> {
    return this.evenements
      .filter((evenement) => {
        if (filtres.statut === "Annule") {
          if (evenement.estActif()) return false;
        } else if (filtres.statut) {
          if (!evenement.estActif() || evenement.statut !== filtres.statut) return false;
        }
        if (filtres.dateDebutMin && evenement.dateDebut < filtres.dateDebutMin) return false;
        if (filtres.dateDebutMax && evenement.dateDebut > filtres.dateDebutMax) return false;
        return true;
      })
      .map((evenement) => ({
        evenement,
        organisateur: { nom: "Organisateur", prenom: `#${evenement.idOrganisateur}`, fiabilite: null },
      }));
  }

  async desactiver(id: number): Promise<void> {
    const evenement = this.evenements.find((e) => e.id === id);
    if (evenement) evenement.dateDesactivation = new Date();
  }

  async terminer(id: number): Promise<void> {
    const evenement = this.evenements.find((e) => e.id === id);
    if (evenement) evenement.statut = "Termine";
  }

  async terminerAvantDate(dateLimite: Date): Promise<number[]> {
    const idsClotures: number[] = [];
    for (const evenement of this.evenements) {
      if (evenement.estActif() && evenement.statut !== "Termine" && evenement.dateFin < dateLimite) {
        evenement.statut = "Termine";
        idsClotures.push(evenement.id);
      }
    }
    return idsClotures;
  }
}
