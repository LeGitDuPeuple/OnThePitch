import { GeocodeurInterface, Coordonnees } from "../domain/interface/geocodeurInterface";
import { RequeteInvalide, ServiceIndisponible } from "../domain/erreurMetier";

// Forme de la réponse de l'API Adresse (GeoJSON), typée explicitement.
type ReponseApiAdresse = {
  features: Array<{
    geometry: { coordinates: [number, number] };
    properties: {
      label: string;
      city: string;
      postcode: string;
    };
  }>;
};

const LIMITE_SUGGESTIONS = 5;

export class GeocodageService implements GeocodeurInterface {
  constructor(
    private readonly urlApi = "https://api-adresse.data.gouv.fr/search"
  ) {}

  // Convertit une adresse en coordonnées via l'API Adresse du gouvernement.
  // Utilisé à la création/modification d'un événement : une seule adresse
  // attendue, son absence est une erreur (voir CLAUDE.md, section 3).
  async geocoder(adresse: string): Promise<Coordonnees> {
    const resultats = await this.interrogerApiAdresse(adresse, 1);
    const resultat = resultats[0];

    // L'API renvoie une liste vide quand elle ne reconnaît pas l'adresse.
    if (!resultat) {
      throw new RequeteInvalide("Adresse introuvable, vérifiez la saisie");
    }

    return resultat;
  }

  // Autocomplétion pendant la saisie (recherche géolocalisée, création
  // d'événement) : plusieurs candidats, jamais d'erreur si rien ne correspond
  // encore — une saisie en cours n'est pas une adresse invalide.
  async suggerer(adresse: string): Promise<Coordonnees[]> {
    return this.interrogerApiAdresse(adresse, LIMITE_SUGGESTIONS);
  }

  private async interrogerApiAdresse(adresse: string, limite: number): Promise<Coordonnees[]> {
    const url = `${this.urlApi}/?q=${encodeURIComponent(adresse)}&limit=${limite}`;

    let reponse: Response;

    try {
      reponse = await fetch(url);
    } catch {
      throw new ServiceIndisponible("Service de géocodage indisponible, réessayez plus tard");
    }

    if (!reponse.ok) {
      throw new ServiceIndisponible("Service de géocodage indisponible, réessayez plus tard");
    }

    const donnees = (await reponse.json()) as ReponseApiAdresse;

    // L'API renvoie [longitude, latitude], dans cet ordre.
    return donnees.features.map((resultat) => {
      const [longitude, latitude] = resultat.geometry.coordinates;
      return {
        latitude,
        longitude,
        adresse: resultat.properties.label,
        ville: resultat.properties.city,
        codePostal: resultat.properties.postcode,
      };
    });
  }
}
