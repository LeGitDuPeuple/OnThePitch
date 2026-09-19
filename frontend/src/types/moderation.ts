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
