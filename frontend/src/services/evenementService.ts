import { appelApi } from "./api";
import type { EvenementProche } from "../types/evenement";

export type ParametresRecherche = {
  latitude: number;
  longitude: number;
  rayonKm?: number;
};

export const evenementService = {
  rechercher: (parametres: ParametresRecherche): Promise<EvenementProche[]> => {
    const params = new URLSearchParams({
      latitude: String(parametres.latitude),
      longitude: String(parametres.longitude),
    });

    if (parametres.rayonKm !== undefined) {
      params.set("rayonKm", String(parametres.rayonKm));
    }

    return appelApi<EvenementProche[]>(`/evenements/recherche?${params.toString()}`);
  },
};
