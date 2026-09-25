import { prisma } from "../config/prismaClient";
import { Prisma } from "../generated/prisma/client";
import { Inscription, StatutInscription } from "../domain/entities/Inscription";
import { InscriptionRepositoryInterface, InscritDetail } from "../domain/interface/inscriptionRepositoryInterface";
import { Conflit, ServiceIndisponible } from "../domain/erreurMetier";

// Forme brute d'une ligne "rejoint" telle que renvoyée par Prisma.
type LigneRejoint = {
  idJoueur: number;
  idEvenement: number;
  dateInscription: Date;
  presence: Date | null;
  statutInscription: string;
};

// Autant de tentatives que de contendants plausibles sur les mêmes lignes : à
// chaque vague de conflits, une seule transaction passe (les autres sont
// annulées par PostgreSQL et rejouées). 3 tentatives ne suffisaient pas dès
// que ~8 joueurs s'inscrivaient à la fois (constaté par le test d'intégration
// de concurrence : des 500).
const NOMBRE_TENTATIVES_MAX = 12;

// Petit délai aléatoire avant de rejouer : sans lui, les transactions
// perdantes repartent toutes au même instant et se télescopent à nouveau.
const attendre = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const delaiAleatoireMs = (tentative: number) => Math.random() * 15 * tentative;

// Conflit de sérialisation PostgreSQL (SQLSTATE 40001), sous ses DEUX formes :
// P2034 (erreur Prisma "classique") ou, avec l'adaptateur `pg` utilisé ici, une
// DriverAdapterError dont `cause.kind` vaut "TransactionWriteConflict". Ne
// reconnaître que P2034 laissait passer le second cas : aucune reprise, et
// l'erreur brute remontait en 500 sous concurrence.
const estConflitDeSerialisation = (erreur: unknown): boolean => {
  if (erreur instanceof Prisma.PrismaClientKnownRequestError) return erreur.code === "P2034";

  if (typeof erreur === "object" && erreur !== null && "cause" in erreur) {
    const cause = (erreur as { cause?: { kind?: unknown; originalCode?: unknown } }).cause;
    return cause?.kind === "TransactionWriteConflict" || cause?.originalCode === "40001";
  }

  return false;
};

export class InscriptionRepositoryDatabase implements InscriptionRepositoryInterface {
  async trouver(idJoueur: number, idEvenement: number): Promise<Inscription | null> {
    const ligne = await prisma.rejoint.findUnique({
      where: { idJoueur_idEvenement: { idJoueur, idEvenement } },
    });

    return ligne ? this.versEntite(ligne) : null;
  }

  async listerParEvenement(idEvenement: number): Promise<InscritDetail[]> {
    const lignes = await prisma.rejoint.findMany({
      where: { idEvenement },
      include: { joueur: true },
      orderBy: { dateInscription: "asc" },
    });

    return lignes.map((ligne) => ({
      idJoueur: ligne.idJoueur,
      nom: ligne.joueur.nom,
      prenom: ligne.joueur.prenom,
      statut: ligne.statutInscription as StatutInscription,
      presence: ligne.presence,
    }));
  }

  async listerParJoueur(idJoueur: number, statuts: StatutInscription[]): Promise<Inscription[]> {
    const lignes = await prisma.rejoint.findMany({
      where: { idJoueur, statutInscription: { in: statuts } },
      orderBy: { dateInscription: "desc" },
    });

    return lignes.map((ligne) => this.versEntite(ligne));
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
        if (!estConflitDeSerialisation(erreur)) throw erreur;

        // Deux inscriptions concurrentes se sont télescopées : on retente.
        await attendre(delaiAleatoireMs(tentative));
      }
    }

    // Toutes les tentatives ont échoué à cause de la concurrence : 503 clair et
    // réessayable, plutôt qu'une erreur interne brute.
    throw new ServiceIndisponible("Trop d'inscriptions simultanées sur cet événement, réessayez");
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
