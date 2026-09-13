import { Evenement, NiveauRequis } from "../domain/entities/Evenement";
import { Role } from "../domain/entities/Utilisateur";
import { EvenementRepositoryInterface, EvenementDetail } from "../domain/interface/evenementRepositoryInterface";
import { GeocodeurInterface } from "../domain/interface/geocodeurInterface";
import { RessourceIntrouvable, AccesRefuse, RequeteInvalide, Conflit } from "../domain/erreurMetier";

const NIVEAU_REQUIS_DEFAUT: NiveauRequis = "tous_niveaux";

export type DemandeCreation = {
  titre: string;
  description?: string;
  adresse: string;
  nomLieu?: string;
  nombrePlaces: number;
  estPrive: boolean;
  dateDebut: Date;
  dateFin: Date;
  typeTerrain?: string;
  niveauRequis?: NiveauRequis;
};

// Modification partielle — l'adresse n'en fait pas partie (voir schemas/evenementSchema.ts).
export type DemandeModification = {
  titre?: string;
  description?: string;
  nombrePlaces?: number;
  dateDebut?: Date;
  dateFin?: Date;
  niveauRequis?: NiveauRequis;
};

export class EvenementService {
  constructor(
    private readonly evenementRepository: EvenementRepositoryInterface,
    private readonly geocodeur: GeocodeurInterface
  ) {}

  // Crée un événement : géocode l'adresse, puis enregistre lieu et événement.
  async creer(demande: DemandeCreation, idOrganisateur: number): Promise<Evenement> {
    // Un événement ne peut pas être créé dans le passé.
    if (demande.dateDebut <= new Date()) {
      throw new RequeteInvalide("La date de début doit être dans le futur");
    }

    // Sans coordonnées, l'événement serait invisible dans toutes les recherches.
    const coordonnees = await this.geocodeur.geocoder(demande.adresse);

    return this.evenementRepository.creer({
      titre: demande.titre,
      description: demande.description ?? null,
      nombrePlaces: demande.nombrePlaces,
      estPrive: demande.estPrive,
      dateDebut: demande.dateDebut,
      dateFin: demande.dateFin,
      idOrganisateur,
      niveauRequis: demande.niveauRequis ?? NIVEAU_REQUIS_DEFAUT,
      lieu: {
        nom: demande.nomLieu ?? null,
        adresse: coordonnees.adresse,
        ville: coordonnees.ville,
        codePostal: coordonnees.codePostal,
        latitude: coordonnees.latitude,
        longitude: coordonnees.longitude,
        typeTerrain: demande.typeTerrain ?? null,
      },
    });
  }

  // Récupère un événement par son identifiant.
  async trouverParId(id: number): Promise<Evenement> {
    const evenement = await this.evenementRepository.trouverParId(id);

    if (!evenement || !evenement.estActif()) {
      throw new RessourceIntrouvable("Événement introuvable");
    }

    return evenement;
  }

  // Récupère un événement avec le détail de son lieu — pour la fiche événement.
  async trouverDetailParId(id: number): Promise<EvenementDetail> {
    const detail = await this.evenementRepository.trouverAvecLieu(id);

    if (!detail || !detail.evenement.estActif()) {
      throw new RessourceIntrouvable("Événement introuvable");
    }

    return detail;
  }

  // Modifie un événement existant. Réservé à l'organisateur.
  async modifier(id: number, demande: DemandeModification, idOrganisateur: number): Promise<Evenement> {
    const evenement = await this.trouverParId(id);

    if (!evenement.estOrganisePar(idOrganisateur)) {
      throw new AccesRefuse("Seul l'organisateur peut modifier cet événement");
    }

    if (evenement.statut === "Termine") {
      throw new Conflit("Cet événement est déjà terminé");
    }

    // Même règle qu'à la création : un événement ne peut pas être déplacé dans le passé.
    if (demande.dateDebut && demande.dateDebut <= new Date()) {
      throw new RequeteInvalide("La date de début doit être dans le futur");
    }

    const dateDebutEffective = demande.dateDebut ?? evenement.dateDebut;
    const dateFinEffective = demande.dateFin ?? evenement.dateFin;
    if (dateFinEffective <= dateDebutEffective) {
      throw new RequeteInvalide("La date de fin doit suivre la date de début");
    }

    // On ne peut pas réduire les places sous le nombre de joueurs déjà acceptés.
    if (demande.nombrePlaces !== undefined && demande.nombrePlaces < evenement.nombreInscrits) {
      throw new RequeteInvalide(
        `Le nombre de places ne peut pas être inférieur au nombre d'inscrits (${evenement.nombreInscrits})`
      );
    }

    return this.evenementRepository.modifier(id, demande);
  }

  // Annule un événement. Réservé à l'organisateur, ou à un administrateur (modération).
  async annuler(id: number, idDemandeur: number, roleDemandeur: Role): Promise<void> {
    const evenement = await this.trouverParId(id);

    if (roleDemandeur !== "administrateur" && !evenement.estOrganisePar(idDemandeur)) {
      throw new AccesRefuse("Seul l'organisateur ou un administrateur peut annuler cet événement");
    }

    await this.evenementRepository.desactiver(id);
  }

  // Clôture l'événement une fois les présences relevées. Réservé à l'organisateur :
  // à la différence de l'annulation, ce n'est pas une action de modération.
  async terminer(id: number, idOrganisateur: number): Promise<void> {
    const evenement = await this.trouverParId(id);

    if (!evenement.estOrganisePar(idOrganisateur)) {
      throw new AccesRefuse("Seul l'organisateur peut terminer cet événement");
    }

    if (evenement.statut === "Termine") {
      throw new Conflit("Cet événement est déjà terminé");
    }

    await this.evenementRepository.terminer(id);
  }
}