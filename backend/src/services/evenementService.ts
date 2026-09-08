import { Evenement } from "../domain/entities/Evenement";
import { Role } from "../domain/entities/Utilisateur";
import { EvenementRepositoryInterface } from "../domain/interface/evenementRepositoryInterface";
import { GeocodeurInterface } from "../domain/interface/geocodeurInterface";
import { RessourceIntrouvable, AccesRefuse, RequeteInvalide } from "../domain/erreurMetier";

export type DemandeCreation = {
  titre: string;
  adresse: string;
  nombrePlaces: number;
  estPrive: boolean;
  dateDebut: Date;
  dateFin: Date;
  typeTerrain?: string;
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
      nombrePlaces: demande.nombrePlaces,
      estPrive: demande.estPrive,
      dateDebut: demande.dateDebut,
      dateFin: demande.dateFin,
      idOrganisateur,
      lieu: {
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

  // Annule un événement. Réservé à l'organisateur, ou à un administrateur (modération).
  async annuler(id: number, idDemandeur: number, roleDemandeur: Role): Promise<void> {
    const evenement = await this.trouverParId(id);

    if (roleDemandeur !== "administrateur" && !evenement.estOrganisePar(idDemandeur)) {
      throw new AccesRefuse("Seul l'organisateur ou un administrateur peut annuler cet événement");
    }

    await this.evenementRepository.desactiver(id);
  }
}