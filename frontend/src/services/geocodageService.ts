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
};
