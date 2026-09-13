import { appelApi, URL_BASE } from "./api";
import type { EvenementProche, EvenementDetail } from "../types/evenement";

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

  trouverParId: (id: number): Promise<EvenementDetail> => appelApi(`/evenements/${id}`),

  // Pas de fetch ici : consommée directement comme src d'une balise <img>.
  urlPhoto: (id: number): string => `${URL_BASE}/evenements/${id}/photo`,
};
