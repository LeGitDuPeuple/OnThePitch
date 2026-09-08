export type StatutInscription = "en_attente" | "acceptee" | "refusee";

export class Inscription {
  idJoueur: number;
  idEvenement: number;
  dateInscription: Date;
  presence: Date | null;
  statut: StatutInscription;

  constructor(params: {
    idJoueur: number;
    idEvenement: number;
    dateInscription: Date;
    presence?: Date | null;
    statut: StatutInscription;
  }) {
    this.idJoueur = params.idJoueur;
    this.idEvenement = params.idEvenement;
    this.dateInscription = params.dateInscription;
    this.presence = params.presence ?? null;
    this.statut = params.statut;
  }

  estEnAttente(): boolean {
    return this.statut === "en_attente";
  }

  estAcceptee(): boolean {
    return this.statut === "acceptee";
  }

  // Représentation pour les réponses API.
  versReponse() {
    return {
      idJoueur: this.idJoueur,
      idEvenement: this.idEvenement,
      dateInscription: this.dateInscription,
      statut: this.statut,
      presence: this.presence,
    };
  }
}
