import { Signalement } from "../entities/Signalement";

// Motif de signalement (table de référence `motif`) — libellés fixes, gérés
// en base, pas en dur côté front (voir CLAUDE.md, "Front React").
export type MotifSignalement = {
  id: number;
  libelle: string;
};

export type NouveauSignalement = {
  idJoueur: number;
  idEvenement: number;
  idMotif: number;
  texteLibre?: string | null;
};

// Signalement enrichi pour le tableau de bord admin : le motif et l'événement
// sont affichés en clair, pas juste leurs identifiants.
export type SignalementDetaille = {
  signalement: Signalement;
  motifLibelle: string;
  evenementTitre: string;
};

export interface SignalementRepositoryInterface {
  // Enregistre un signalement. Refuse un doublon (même joueur, événement, motif).
  creer(donnees: NouveauSignalement): Promise<Signalement>;

  // Liste les signalements dont l'événement est encore actif — un événement déjà
  // désactivé (sanctionné ou annulé) n'a plus besoin d'être traité.
  listerEnAttente(): Promise<SignalementDetaille[]>;

  // Retire tous les signalements d'un événement (faux signalement).
  retirer(idEvenement: number): Promise<void>;

  // Liste des motifs disponibles pour signaler un événement (table de référence).
  listerMotifs(): Promise<MotifSignalement[]>;
}
