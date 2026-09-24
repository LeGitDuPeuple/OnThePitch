import { Utilisateur } from "../../src/domain/entities/Utilisateur";
import {
  UtilisateurRepositoryInterface,
  NouvelUtilisateur,
} from "../../src/domain/interface/utilisateurRepositoryInterface";

export class UtilisateurRepositoryFake implements UtilisateurRepositoryInterface {
  private utilisateurs: Utilisateur[] = [];
  private prochainId = 1;

  // Trace des appels, pour que les tests vérifient qu'un avertissement a bien eu lieu.
  idsAvertis: number[] = [];

  ajouter(utilisateur: Utilisateur): void {
    this.utilisateurs.push(utilisateur);
  }

  async trouverParEmail(email: string): Promise<Utilisateur | null> {
    return this.utilisateurs.find((utilisateur) => utilisateur.email === email) ?? null;
  }

  async trouverParId(id: number): Promise<Utilisateur | null> {
    return this.utilisateurs.find((utilisateur) => utilisateur.id === id) ?? null;
  }

  async creer(donnees: NouvelUtilisateur): Promise<Utilisateur> {
    const utilisateur = new Utilisateur({
      id: this.prochainId++,
      nom: donnees.nom,
      prenom: donnees.prenom,
      email: donnees.email,
      motDePasseHache: donnees.motDePasseHache,
      role: "joueur",
      ville: donnees.ville,
      dateInscription: new Date(),
    });

    this.utilisateurs.push(utilisateur);
    return utilisateur;
  }

  async majDerniereConnexion(): Promise<void> {
    // Non observé par les tests actuels : rien à simuler.
  }

  async avertir(id: number): Promise<void> {
    this.idsAvertis.push(id);
  }

  async compterJoueurs(): Promise<number> {
    return this.utilisateurs.filter((utilisateur) => utilisateur.role === "joueur").length;
  }

  async changerEmail(id: number, email: string): Promise<Utilisateur> {
    const utilisateur = this.utilisateurs.find((u) => u.id === id);
    if (!utilisateur) throw new Error("Utilisateur introuvable (double de test)");
    utilisateur.email = email;
    return utilisateur;
  }

  async changerMotDePasse(id: number, motDePasseHache: string): Promise<void> {
    const index = this.utilisateurs.findIndex((u) => u.id === id);
    if (index === -1) throw new Error("Utilisateur introuvable (double de test)");
    const ancien = this.utilisateurs[index];
    // Le hachage est privé dans l'entité : on la reconstruit plutôt que d'ouvrir un setter.
    this.utilisateurs[index] = new Utilisateur({
      id: ancien.id,
      nom: ancien.nom,
      prenom: ancien.prenom,
      email: ancien.email,
      motDePasseHache,
      role: ancien.role,
      ville: ancien.ville,
      dateInscription: ancien.dateInscription,
    });
  }
}
