import { RequeteInvalide, Conflit } from "../erreurMetier";

export type StatutEvenement = "Ouvert" | "Complet" | "Termine" | "Annule";

export class Evenement {
  id: number;
  titre: string;
  nombrePlaces: number;
  estPrive: boolean;
  dateDebut: Date;
  dateFin: Date;
  dateDesactivation: Date | null;
  idLieu: number;
  idOrganisateur: number;
  statut: StatutEvenement;
  nombreInscrits: number;

  constructor(params: {
    id: number;
    titre: string;
    nombrePlaces: number;
    estPrive: boolean;
    dateDebut: Date;
    dateFin: Date;
    dateDesactivation?: Date | null;
    idLieu: number;
    idOrganisateur: number;
    statut: StatutEvenement;
    nombreInscrits?: number;
  }) {
    this.id = params.id;
    this.titre = params.titre;
    this.nombrePlaces = params.nombrePlaces;
    this.estPrive = params.estPrive;
    this.dateDebut = params.dateDebut;
    this.dateFin = params.dateFin;
    this.dateDesactivation = params.dateDesactivation ?? null;
    this.idLieu = params.idLieu;
    this.idOrganisateur = params.idOrganisateur;
    this.statut = params.statut;
    this.nombreInscrits = params.nombreInscrits ?? 0;
  }

  // Vérifie la cohérence des champs obligatoires.
  validerOuLever(): void {
    if (!this.titre) throw new RequeteInvalide("Le titre est obligatoire");
    if (this.nombrePlaces < 2) throw new RequeteInvalide("Un événement doit compter au moins 2 places");
    if (this.dateFin <= this.dateDebut) throw new RequeteInvalide("La date de fin doit suivre la date de début");
  }

  // Un événement désactivé a été annulé ou modéré.
  estActif(): boolean {
    return this.dateDesactivation === null;
  }

  // Toutes les places sont prises.
  estComplet(): boolean {
    return this.nombreInscrits >= this.nombrePlaces;
  }

  // Nombre de places encore libres.
  placesRestantes(): number {
    return Math.max(0, this.nombrePlaces - this.nombreInscrits);
  }

  // L'événement a déjà commencé.
  estPasse(): boolean {
    return this.dateDebut <= new Date();
  }

  // Vérifie qu'un joueur peut encore rejoindre l'événement.
  // Lève une erreur métier explicite sinon.
  verifierInscriptionPossible(): void {
    if (!this.estActif()) throw new Conflit("Cet événement a été annulé");
    if (this.estPasse()) throw new Conflit("Cet événement a déjà commencé");
    if (this.estComplet()) throw new Conflit("Cet événement est complet");
  }

  // Seul l'organisateur peut modifier ou annuler son événement.
  estOrganisePar(idJoueur: number): boolean {
    return this.idOrganisateur === idJoueur;
  }

  // Représentation pour les réponses API.
  versReponse() {
    return {
      id: this.id,
      titre: this.titre,
      nombrePlaces: this.nombrePlaces,
      placesRestantes: this.placesRestantes(),
      estPrive: this.estPrive,
      dateDebut: this.dateDebut,
      dateFin: this.dateFin,
      statut: this.statut,
      idOrganisateur: this.idOrganisateur,
    };
  }
}