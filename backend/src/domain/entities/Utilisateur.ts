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
  // Double authentification (voir CLAUDE.md, section Compte et sécurité).
  // Le secret et les hachages ne sortent jamais par versReponse().
  doubleAuthActive: boolean;
  private secretTotp: string | null;
  private hachagesCodesSecours: string[];

  constructor(params: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    motDePasseHache: string;
    role: Role;
    ville?: string | null;
    dateInscription: Date;
    doubleAuthActive?: boolean;
    secretTotp?: string | null;
    hachagesCodesSecours?: string[];
  }) {
    this.id = params.id;
    this.nom = params.nom;
    this.prenom = params.prenom;
    this.email = params.email;
    this.motDePasseHache = params.motDePasseHache;
    this.role = params.role;
    this.ville = params.ville ?? null;
    this.dateInscription = params.dateInscription;
    this.doubleAuthActive = params.doubleAuthActive ?? false;
    this.secretTotp = params.secretTotp ?? null;
    this.hachagesCodesSecours = params.hachagesCodesSecours ?? [];
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

  // Secret partagé avec l'application d'authentification, uniquement pour la
  // vérification d'un code (TOTP).
  get secretDoubleAuth(): string | null {
    return this.secretTotp;
  }

  // Hachages bcrypt des codes de secours restants (jamais les codes en clair).
  get codesSecours(): string[] {
    return this.hachagesCodesSecours;
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
      doubleAuthActive: this.doubleAuthActive,
    };
  }
}