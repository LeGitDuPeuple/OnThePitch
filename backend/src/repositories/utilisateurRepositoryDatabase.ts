import { prisma } from "../config/prismaClient";
import { Prisma } from "../generated/prisma/client";
import { Utilisateur, Role } from "../domain/entities/Utilisateur";
import { Conflit } from "../domain/erreurMetier";
import {
  UtilisateurRepositoryInterface,
  NouvelUtilisateur,
} from "../domain/interface/utilisateurRepositoryInterface";

export class UtilisateurRepositoryDatabase implements UtilisateurRepositoryInterface {
  // Recherche un utilisateur par son email. Null s'il n'existe pas.
  async trouverParEmail(email: string): Promise<Utilisateur | null> {
    const ligne = await prisma.utilisateur.findUnique({ where: { email } });
    return ligne ? this.versEntite(ligne) : null;
  }

  // Recherche un utilisateur par son identifiant. Null s'il n'existe pas.
  async trouverParId(id: number): Promise<Utilisateur | null> {
    const ligne = await prisma.utilisateur.findUnique({ where: { idJoueur: id } });
    return ligne ? this.versEntite(ligne) : null;
  }

  // Enregistre un nouvel utilisateur et renvoie l'entité créée.
  async creer(donnees: NouvelUtilisateur): Promise<Utilisateur> {
    const ligne = await prisma.utilisateur.create({
      data: {
        nom: donnees.nom,
        prenom: donnees.prenom,
        email: donnees.email,
        motDePasse: donnees.motDePasseHache,
        ville: donnees.ville ?? null,
        role: "joueur",
      },
    });

    return this.versEntite(ligne);
  }

  // Met à jour la date de dernière connexion.
  async majDerniereConnexion(id: number): Promise<void> {
    await prisma.utilisateur.update({
      where: { idJoueur: id },
      data: { lastLogin: new Date() },
    });
  }

  // Passe le statut de l'utilisateur à "averti" (modération).
  async avertir(id: number): Promise<void> {
    const statutAverti = await prisma.statutUtilisateur.findUniqueOrThrow({
      where: { libelleStatut: "averti" },
    });

    await prisma.utilisateur.update({
      where: { idJoueur: id },
      data: { idStatut: statutAverti.idStatut },
    });
  }

  async compterJoueurs(): Promise<number> {
    return prisma.utilisateur.count({ where: { role: "joueur" } });
  }

  async changerEmail(id: number, email: string): Promise<Utilisateur> {
    try {
      const ligne = await prisma.utilisateur.update({ where: { idJoueur: id }, data: { email } });
      return this.versEntite(ligne);
    } catch (erreur) {
      // Deux changements simultanés vers la même adresse : la contrainte
      // UNIQUE de la base tranche, la vérification du service ne suffit pas.
      if (erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === "P2002") {
        throw new Conflit("Un compte existe déjà avec cet email", "email");
      }
      throw erreur;
    }
  }

  async changerMotDePasse(id: number, motDePasseHache: string): Promise<void> {
    await prisma.utilisateur.update({ where: { idJoueur: id }, data: { motDePasse: motDePasseHache } });
  }

  // Convertit une ligne Prisma en entité du domaine.
  private versEntite(ligne: {
    idJoueur: number;
    nom: string;
    prenom: string;
    email: string;
    motDePasse: string;
    role: string;
    ville: string | null;
    dateInscription: Date;
  }): Utilisateur {
    return new Utilisateur({
      id: ligne.idJoueur,
      nom: ligne.nom,
      prenom: ligne.prenom,
      email: ligne.email,
      motDePasseHache: ligne.motDePasse,
      role: ligne.role as Role,
      ville: ligne.ville,
      dateInscription: ligne.dateInscription,
    });
  }
}