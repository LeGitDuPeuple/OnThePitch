import { appelApi } from "./api";

export type Coordonnees = {
  latitude: number;
  longitude: number;
  adresse: string;
  ville: string;
  codePostal: string;
};

// Le front ne contacte jamais l'API Adresse directement — il passe par le backend
// (voir CLAUDE.md, section 3 "Géocodage des adresses").
export const geocodageService = {
  geocoder: (adresse: string): Promise<Coordonnees> => {
    const params = new URLSearchParams({ adresse });
    return appelApi<Coordonnees>(`/evenements/geocoder?${params.toString()}`);
  },

  // Autocomplétion pendant la saisie — jusqu'à 5 candidats, jamais d'erreur
  // si rien ne correspond encore (voir GeocodageService.suggerer côté back).
  suggerer: (adresse: string): Promise<Coordonnees[]> => {
    const params = new URLSearchParams({ adresse });
    return appelApi<Coordonnees[]>(`/evenements/geocoder/suggestions?${params.toString()}`);
  },
};
