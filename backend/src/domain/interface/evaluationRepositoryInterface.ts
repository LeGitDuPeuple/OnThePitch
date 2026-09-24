import { Evaluation } from "../entities/Evaluation";

export type NouvelleEvaluation = {
  idJoueur: number;
  idEvenement: number;
  note: number;
  commentaire?: string | null;
};

export interface EvaluationRepositoryInterface {
  // Enregistre une évaluation. Refuse un doublon (même joueur, même événement) —
  // porté par la clé primaire composite de la table `evaluation`, pas par une
  // vérification applicative en amont.
  creer(donnees: NouvelleEvaluation): Promise<Evaluation>;

  // Moyenne des notes reçues par un organisateur, tous ses événements confondus
  // (score de "Fiabilité" affiché sur la fiche événement). null si aucune
  // évaluation n'existe encore — pas 0, pour ne pas afficher une fiabilité
  // "mauvaise" quand elle est simplement absente.
  moyenneParOrganisateur(idOrganisateur: number): Promise<number | null>;
}
