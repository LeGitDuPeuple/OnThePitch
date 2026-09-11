export class Signalement {
  idJoueur: number;
  idEvenement: number;
  idMotif: number;
  dateSignalement: Date;
  texteLibre: string | null;

  constructor(params: {
    idJoueur: number;
    idEvenement: number;
    idMotif: number;
    dateSignalement: Date;
    texteLibre?: string | null;
  }) {
    this.idJoueur = params.idJoueur;
    this.idEvenement = params.idEvenement;
    this.idMotif = params.idMotif;
    this.dateSignalement = params.dateSignalement;
    this.texteLibre = params.texteLibre ?? null;
  }

  // Représentation pour les réponses API.
  versReponse() {
    return {
      idJoueur: this.idJoueur,
      idEvenement: this.idEvenement,
      idMotif: this.idMotif,
      dateSignalement: this.dateSignalement,
      texteLibre: this.texteLibre,
    };
  }
}
