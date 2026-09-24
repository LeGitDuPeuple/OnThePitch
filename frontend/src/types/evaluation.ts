export type Evaluation = {
  idJoueur: number;
  idEvenement: number;
  note: number;
  dateEvaluation: string;
  commentaire: string | null;
};

// Corps de POST /evenements/:id/evaluations (voir schemas/evaluationSchema.ts côté back).
export type NouvelleEvaluation = {
  note: number;
  commentaire?: string;
};
