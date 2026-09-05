import { RequeteInvalide } from "../erreurMetier";

export type Role = "joueur" | "administrateur";

export class Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  private motDePasseHache: string;
  role: Role;
  ville: string | null;
  dateInscription: Date;

  constructor(params: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    motDePasseHache: string;
    role: Role;
    ville?: string | null;
    dateInscription: Date;
  }) {
    this.id = params.id;
    this.nom = params.nom;
    this.prenom = params.prenom;
    this.email = params.email;
    this.motDePasseHache = params.motDePasseHache;
    this.role = params.role;
    this.ville = params.ville ?? null;
    this.dateInscription = params.dateInscription;
  }

  // Vérifie que les champs obligatoires sont présents et le rôle valide.
  validerOuLever(): void {
    if (!this.email) throw new RequeteInvalide("L'email est obligatoire");
    if (!this.motDePasseHache) throw new RequeteInvalide("Le mot de passe est obligatoire");
    if (!this.nom) throw new RequeteInvalide("Le nom est obligatoire");
    if (this.role !== "joueur" && this.role !== "administrateur") {
      throw new RequeteInvalide(`Rôle inconnu : ${this.role}`);
    }
  }

  // Indique si l'utilisateur a les droits d'administration.
  estAdministrateur(): boolean {
    return this.role === "administrateur";
  }

  // Donne accès au mot de passe haché, uniquement pour la vérification à la connexion.
  get hachage(): string {
    return this.motDePasseHache;
  }

  // Renvoie l'utilisateur sans son mot de passe, pour les réponses de l'API.
  versReponse() {
    return {
      id: this.id,
      nom: this.nom,
      prenom: this.prenom,
      email: this.email,
      role: this.role,
      ville: this.ville,
    };
  }
}