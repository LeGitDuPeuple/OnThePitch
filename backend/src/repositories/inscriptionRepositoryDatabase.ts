import { prisma } from "../config/prismaClient";
import { Prisma } from "../generated/prisma/client";
import { Inscription, StatutInscription } from "../domain/entities/Inscription";
import { InscriptionRepositoryInterface } from "../domain/interface/inscriptionRepositoryInterface";
import { Conflit, ServiceIndisponible } from "../domain/erreurMetier";

// Forme brute d'une ligne "rejoint" telle que renvoyée par Prisma.
type LigneRejoint = {
  idJoueur: number;
  idEvenement: number;
  dateInscription: Date;
  presence: Date | null;
  statutInscription: string;
};

const NOMBRE_TENTATIVES_MAX = 3;

export class InscriptionRepositoryDatabase implements InscriptionRepositoryInterface {
  async trouver(idJoueur: number, idEvenement: number): Promise<Inscription | null> {
    const ligne = await prisma.rejoint.findUnique({
      where: { idJoueur_idEvenement: { idJoueur, idEvenement } },
    });

    return ligne ? this.versEntite(ligne) : null;
  }

  async rejoindre(idJoueur: number, idEvenement: number, statutInitial: StatutInscription): Promise<Inscription> {
    try {
      // Événement privé : simple demande en attente, aucune place n'est encore consommée.
      if (statutInitial === "en_attente") {
        const ligne = await prisma.rejoint.create({
          data: { idJoueur, idEvenement, statutInscription: "en_attente" },
        });

        return this.versEntite(ligne);
      }

      // Événement public : la création consomme une place, donc sous contrôle transactionnel.
      const ligne = await this.executerAvecControleDesPlaces(idEvenement, (tx) =>
        tx.rejoint.create({ data: { idJoueur, idEvenement, statutInscription: "acceptee" } })
      );

      return this.versEntite(ligne);
    } catch (erreur) {
      throw this.traduireErreurDoublon(erreur);
    }
  }

  async accepter(idJoueur: number, idEvenement: number): Promise<Inscription> {
    const ligne = await this.executerAvecControleDesPlaces(idEvenement, (tx) =>
      tx.rejoint.update({
        where: { idJoueur_idEvenement: { idJoueur, idEvenement } },
        data: { statutInscription: "acceptee" },
      })
    );

    return this.versEntite(ligne);
  }

  async refuser(idJoueur: number, idEvenement: number): Promise<Inscription> {
    const ligne = await prisma.rejoint.update({
      where: { idJoueur_idEvenement: { idJoueur, idEvenement } },
      data: { statutInscription: "refusee" },
    });

    return this.versEntite(ligne);
  }

  // Retire l'inscription. Si elle occupait une place et que l'événement était
  // complet, une place se libère : il repasse en "Ouvert".
  async desinscrire(idJoueur: number, idEvenement: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const inscriptionSupprimee = await tx.rejoint.delete({
        where: { idJoueur_idEvenement: { idJoueur, idEvenement } },
      });

      if (inscriptionSupprimee.statutInscription !== "acceptee") return;

      const evenement = await tx.evenement.findUniqueOrThrow({
        where: { idEvenement },
        include: { statut: true },
      });

      if (evenement.statut.libelleEvent === "Complet") {
        const statutOuvert = await tx.statutEvent.findUniqueOrThrow({ where: { libelleEvent: "Ouvert" } });

        await tx.evenement.update({
          where: { idEvenement },
          data: { idStatutEvent: statutOuvert.idStatutEvent },
        });
      }
    });
  }

  async marquerPresence(idJoueur: number, idEvenement: number): Promise<Inscription> {
    const ligne = await prisma.rejoint.update({
      where: { idJoueur_idEvenement: { idJoueur, idEvenement } },
      data: { presence: new Date() },
    });

    return this.versEntite(ligne);
  }

  // Exécute `operation` (création ou mise à jour d'une inscription "acceptee") après avoir
  // vérifié qu'une place est disponible, et bascule l'événement en "Complet" le cas échéant —
  // le tout en isolation sérialisable, seul moyen d'empêcher deux joueurs de prendre la même
  // dernière place. Sur conflit de sérialisation (deux transactions concurrentes), on réessaie.
  private async executerAvecControleDesPlaces<T>(
    idEvenement: number,
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    for (let tentative = 1; tentative <= NOMBRE_TENTATIVES_MAX; tentative++) {
      try {
        return await prisma.$transaction(
          async (tx) => {
            const evenement = await tx.evenement.findUniqueOrThrow({ where: { idEvenement } });
            const nombreAcceptees = await tx.rejoint.count({
              where: { idEvenement, statutInscription: "acceptee" },
            });

            if (nombreAcceptees >= evenement.nombrePlaces) {
              throw new Conflit("Cet événement est complet");
            }

            const resultat = await operation(tx);

            if (nombreAcceptees + 1 >= evenement.nombrePlaces) {
              const statutComplet = await tx.statutEvent.findUniqueOrThrow({ where: { libelleEvent: "Complet" } });

              await tx.evenement.update({
                where: { idEvenement },
                data: { idStatutEvent: statutComplet.idStatutEvent },
              });
            }

            return resultat;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
      } catch (erreur) {
        const estConflitSerialisation =
          erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === "P2034";

        if (estConflitSerialisation && tentative < NOMBRE_TENTATIVES_MAX) {
          continue; // deux inscriptions concurrentes se sont télescopées : on retente
        }

        throw erreur;
      }
    }

    // Inatteignable : la boucle retourne ou lève à chaque itération.
    throw new ServiceIndisponible("Impossible de traiter l'inscription, réessayez");
  }

  private traduireErreurDoublon(erreur: unknown): Error {
    if (erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === "P2002") {
      return new Conflit("Vous êtes déjà inscrit ou en attente pour cet événement");
    }

    return erreur instanceof Error ? erreur : new Error(String(erreur));
  }

  private versEntite(ligne: LigneRejoint): Inscription {
    return new Inscription({
      idJoueur: ligne.idJoueur,
      idEvenement: ligne.idEvenement,
      dateInscription: ligne.dateInscription,
      presence: ligne.presence,
      statut: ligne.statutInscription as StatutInscription,
    });
  }
}
