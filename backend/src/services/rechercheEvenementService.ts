import { EvenementRepositoryInterface } from "../domain/interface/evenementRepositoryInterface";
import { RequeteInvalide } from "../domain/erreurMetier";

export interface ParametresRecherche {
  latitude: number;
  longitude: number;
  rayonKm?: number;
}

const RAYON_DEFAUT_KM = 10;
const RAYON_MAXIMUM_KM = 100;

export class RechercheEvenementService {
  constructor(private readonly evenementRepository: EvenementRepositoryInterface) {}

  // Recherche les événements publics à venir dans un rayon donné.
  async rechercherAProximite(parametres: ParametresRecherche) {
    const rayonKm = parametres.rayonKm ?? RAYON_DEFAUT_KM;

    // Rayon plafonné : au-delà, le volume de résultats devient inexploitable.
    if (rayonKm <= 0 || rayonKm > RAYON_MAXIMUM_KM) {
      throw new RequeteInvalide(`Le rayon doit être compris entre 1 et ${RAYON_MAXIMUM_KM} km`);
    }

    // PostGIS raisonne en mètres : la conversion est une règle métier.
    const rayonMetres = rayonKm * 1000;

    const resultats = await this.evenementRepository.rechercherParRayon(
      parametres.longitude,
      parametres.latitude,
      rayonMetres
    );

    // Une zone sans événement est un résultat valide, pas une erreur.
    return resultats.map((resultat) => ({
      ...resultat.evenement.versReponse(),
      distanceKm: resultat.distanceKm,
      ville: resultat.ville,
      adresse: resultat.adresse,
    }));
  }
}