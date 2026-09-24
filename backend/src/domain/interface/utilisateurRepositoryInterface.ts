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

  // Nombre de comptes joueurs — vue d'ensemble du tableau de bord admin.
  compterJoueurs(): Promise<number>;
}