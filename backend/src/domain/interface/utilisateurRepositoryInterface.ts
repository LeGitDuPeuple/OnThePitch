import { Utilisateur } from "../entities/Utilisateur";

// Données nécessaires pour créer un utilisateur en base.
export type NouvelUtilisateur = {
  nom: string;
  prenom: string;
  email: string;
  motDePasseHache: string;
  ville?: string | null;
};

export interface UtilisateurRepositoryInterface {
  // Recherche un utilisateur par son email. Null s'il n'existe pas.
  trouverParEmail(email: string): Promise<Utilisateur | null>;

  // Recherche un utilisateur par son identifiant. Null s'il n'existe pas.
  trouverParId(id: number): Promise<Utilisateur | null>;

  // Enregistre un nouvel utilisateur et renvoie l'entité créée.
  creer(donnees: NouvelUtilisateur): Promise<Utilisateur>;

  // Met à jour la date de dernière connexion.
  majDerniereConnexion(id: number): Promise<void>;

  // Passe le statut de l'utilisateur à "averti" (modération).
  avertir(id: number): Promise<void>;

  // Anonymise le compte (droit à l'effacement) : nom, prénom, email, ville
  // remplacés, mot de passe rendu inutilisable, 2FA effacée, date de
  // suppression posée. La ligne reste (l'historique lui est rattaché) ; l'email
  // d'origine est libéré (contrainte UNIQUE).
  anonymiser(id: number): Promise<void>;

  // Nombre de comptes joueurs (hors comptes supprimés) — vue d'ensemble du tableau de bord admin.
  compterJoueurs(): Promise<number>;

  // Remplace l'email (identifiant de connexion et destinataire des
  // notifications). Lève Conflit si un autre compte l'utilise déjà.
  changerEmail(id: number, email: string): Promise<Utilisateur>;

  // Remplace le mot de passe (déjà haché par le service).
  changerMotDePasse(id: number, motDePasseHache: string): Promise<void>;

  // Double authentification. Le secret est posé dès la configuration mais reste
  // inactif tant que activerDoubleAuth n'a pas été appelé (code confirmé).
  enregistrerSecretTotp(id: number, secret: string): Promise<void>;

  // Active la 2FA avec ses codes de secours (déjà hachés par le service).
  activerDoubleAuth(id: number, hachagesCodesSecours: string[]): Promise<void>;

  // Désactive la 2FA : efface le secret ET les codes de secours restants.
  desactiverDoubleAuth(id: number): Promise<void>;

  // Remplace la liste des codes de secours restants (après usage d'un code).
  mettreAJourCodesSecours(id: number, hachagesCodesSecours: string[]): Promise<void>;
}