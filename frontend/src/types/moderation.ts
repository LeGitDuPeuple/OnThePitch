import type { Evenement, StatutEvenement } from "./evenement";

// Motif de signalement (table de référence côté back, voir GET /moderation/motifs) —
// jamais codé en dur côté front (voir CLAUDE.md, "Front React").
export type Motif = {
  id: number;
  libelle: string;
};

// Un signalement en attente tel que renvoyé par GET /moderation/signalements —
// enrichi du libellé du motif et du titre de l'événement (voir moderationController
// côté back). N'inclut jamais les événements déjà désactivés.
export type SignalementDetail = {
  idJoueur: number;
  idEvenement: number;
  idMotif: number;
  dateSignalement: string;
  texteLibre: string | null;
  motifLibelle: string;
  evenementTitre: string;
};

// Vue d'ensemble du tableau de bord admin — voir GET /moderation/statistiques.
export type StatistiquesAdmin = {
  totalEvenements: number;
  evenementsActifs: number;
  evenementsTermines: number;
  totalJoueurs: number;
};

// Un événement tel que renvoyé par GET /moderation/evenements — enrichi de
// l'organisateur et d'un booléen explicite pour "Annulé" (estAnnule) : le
// champ `statut` seul ne suffit pas, un événement annulé garde son statut
// d'avant l'annulation côté base (voir CLAUDE.md, section Modération).
export type EvenementAdmin = Evenement & {
  estAnnule: boolean;
  organisateur: { nom: string; prenom: string };
};

export type FiltresEvenementsAdmin = {
  statut?: StatutEvenement;
  dateDebutMin?: string;
  dateDebutMax?: string;
};
