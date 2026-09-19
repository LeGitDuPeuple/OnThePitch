import { appelApi, URL_BASE } from "./api";
import type { EvenementProche, EvenementDetail, Evenement, NiveauRequis } from "../types/evenement";

export type ParametresRecherche = {
  latitude: number;
  longitude: number;
  rayonKm?: number;
};

// Corps de POST /evenements (voir schemas/evenementSchema.ts côté back — pas de
// paquet partagé entre les deux projets, donc pas d'import direct du schéma Zod :
// c'est le serveur qui valide, le front n'affiche que le message renvoyé).
export type CreationEvenement = {
  titre: string;
  description?: string;
  format?: string;
  adresse: string;
  nomLieu?: string;
  dateDebut: Date;
  dateFin: Date;
  nombrePlaces: number;
  estPrive: boolean;
  typeTerrain?: string;
  niveauRequis: NiveauRequis;
};

// Corps de PATCH /evenements/:id — modification partielle, jamais l'adresse
// (voir schemas/evenementSchema.ts côté back).
export type ModificationEvenement = {
  titre?: string;
  description?: string;
  format?: string;
  dateDebut?: Date;
  dateFin?: Date;
  nombrePlaces?: number;
  niveauRequis?: NiveauRequis;
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

  creer: (donnees: CreationEvenement): Promise<Evenement> => appelApi("/evenements", { methode: "POST", corps: donnees }),

  modifier: (id: number, donnees: ModificationEvenement): Promise<Evenement> =>
    appelApi(`/evenements/${id}`, { methode: "PATCH", corps: donnees }),

  // Annulation (soft delete) — réservée à l'organisateur, ou à un
  // administrateur (modération, voir CLAUDE.md tableau des rôles).
  annuler: (id: number): Promise<void> => appelApi(`/evenements/${id}`, { methode: "DELETE" }),

  // Clôture l'événement une fois les présences relevées — réservée à
  // l'organisateur (voir CLAUDE.md section 7).
  terminer: (id: number): Promise<void> => appelApi(`/evenements/${id}/terminer`, { methode: "POST" }),

  // Dépose (ou remplace) la photo du lieu — réservée à l'organisateur. Champ
  // multipart "photo", jpeg/png/webp uniquement, 2 Mo max (contrôlé côté
  // serveur, voir routes/photoRoute.ts — le front ne fait qu'un contrôle
  // indicatif sur l'extension via l'attribut accept du champ fichier).
  televerserPhoto: (id: number, fichier: File): Promise<void> => {
    const donnees = new FormData();
    donnees.append("photo", fichier);
    return appelApi(`/evenements/${id}/photo`, { methode: "POST", corps: donnees });
  },

  // Pas de fetch ici : consommée directement comme src d'une balise <img>.
  urlPhoto: (id: number): string => `${URL_BASE}/evenements/${id}/photo`,
};
