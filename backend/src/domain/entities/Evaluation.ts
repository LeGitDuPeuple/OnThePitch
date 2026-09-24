export class Evaluation {
  idJoueur: number;
  idEvenement: number;
  note: number;
  dateEvaluation: Date;
  commentaire: string | null;

  constructor(params: {
    idJoueur: number;
    idEvenement: number;
    note: number;
    dateEvaluation: Date;
    commentaire?: string | null;
  }) {
    this.idJoueur = params.idJoueur;
    this.idEvenement = params.idEvenement;
    this.note = params.note;
    this.dateEvaluation = params.dateEvaluation;
    this.commentaire = params.commentaire ?? null;
  }

  // Représentation pour les réponses API.
  versReponse() {
    return {
      idJoueur: this.idJoueur,
      idEvenement: this.idEvenement,
      note: this.note,
      dateEvaluation: this.dateEvaluation,
      commentaire: this.commentaire,
    };
  }
}
