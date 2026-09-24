// Types de notification possibles — chaîne libre côté base (comme
// rejoint.statutInscription), fermée uniquement ici par le type TypeScript.
export type TypeNotification =
  | "nouvelle_demande" // événement privé : une demande attend l'organisateur
  | "demande_acceptee"
  | "demande_refusee"
  | "evenement_complet" // pour l'organisateur
  | "evenement_annule" // pour chaque inscrit accepté
  | "evenement_termine"; // pour chaque inscrit accepté — invite à évaluer l'organisateur

export class Notification {
  id: number;
  idJoueur: number;
  idEvenement: number;
  type: TypeNotification;
  lu: boolean;
  dateCreation: Date;

  constructor(params: {
    id: number;
    idJoueur: number;
    idEvenement: number;
    type: TypeNotification;
    lu?: boolean;
    dateCreation: Date;
  }) {
    this.id = params.id;
    this.idJoueur = params.idJoueur;
    this.idEvenement = params.idEvenement;
    this.type = params.type;
    this.lu = params.lu ?? false;
    this.dateCreation = params.dateCreation;
  }
}
