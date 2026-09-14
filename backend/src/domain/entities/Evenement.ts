import { RequeteInvalide, Conflit } from "../erreurMetier";

export type StatutEvenement = "Ouvert" | "Complet" | "Termine" | "Annule";

// Correspond aux libellés de la table de référence niveau_event.
export type NiveauRequis = "debutant" | "intermediaire" | "confirme" | "tous_niveaux";

export class Evenement {
  id: number;
  titre: string;
  description: string | null;
  // Format de jeu ("5 contre 5"...) — libre, comme lieu.typeTerrain. Absent du
  // MCD initial, ajouté suite à la maquette (blocs "Caractéristiques" et fiche
  // événement). À AJOUTER au MCD Looping.
  format: string | null;
  nombrePlaces: number;
  estPrive: boolean;
  dateDebut: Date;
  dateFin: Date;
  dateDesactivation: Date | null;
  idLieu: number;
  idOrganisateur: number;
  statut: StatutEvenement;
  niveauRequis: NiveauRequis;
  nombreInscrits: number;

  constructor(params: {
    id: number;
    titre: string;
    description?: string | null;
    format?: string | null;
    nombrePlaces: number;
    estPrive: boolean;
    dateDebut: Date;
    dateFin: Date;
    dateDesactivation?: Date | null;
    idLieu: number;
    idOrganisateur: number;
    statut: StatutEvenement;
    niveauRequis: NiveauRequis;
    nombreInscrits?: number;
  }) {
    this.id = params.id;
    this.titre = params.titre;
    this.description = params.description ?? null;
    this.format = params.format ?? null;
    this.nombrePlaces = params.nombrePlaces;
    this.estPrive = params.estPrive;
    this.dateDebut = params.dateDebut;
    this.dateFin = params.dateFin;
    this.dateDesactivation = params.dateDesactivation ?? null;
    this.idLieu = params.idLieu;
    this.idOrganisateur = params.idOrganisateur;
    this.statut = params.statut;
    this.niveauRequis = params.niveauRequis;
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
      description: this.description,
      format: this.format,
      nombrePlaces: this.nombrePlaces,
      placesRestantes: this.placesRestantes(),
      estPrive: this.estPrive,
      dateDebut: this.dateDebut,
      dateFin: this.dateFin,
      statut: this.statut,
      niveauRequis: this.niveauRequis,
      idOrganisateur: this.idOrganisateur,
    };
  }
}