import { prisma } from "../config/prismaClient";
import { Prisma } from "../generated/prisma/client";
import { Evaluation } from "../domain/entities/Evaluation";
import { EvaluationRepositoryInterface, NouvelleEvaluation } from "../domain/interface/evaluationRepositoryInterface";
import { Conflit } from "../domain/erreurMetier";

export class EvaluationRepositoryDatabase implements EvaluationRepositoryInterface {
  async creer(donnees: NouvelleEvaluation): Promise<Evaluation> {
    try {
      const ligne = await prisma.evaluation.create({
        data: {
          idJoueur: donnees.idJoueur,
          idEvenement: donnees.idEvenement,
          note: donnees.note,
          commentaire: donnees.commentaire ?? null,
        },
      });

      return new Evaluation({ ...ligne });
    } catch (erreur) {
      if (erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === "P2002") {
        throw new Conflit("Vous avez déjà évalué cet événement");
      }
      throw erreur;
    }
  }

  async moyenneParOrganisateur(idOrganisateur: number): Promise<number | null> {
    const resultat = await prisma.evaluation.aggregate({
      _avg: { note: true },
      // idJoueur : nom du champ Prisma sur Evenement (mappé sur id_joueur en
      // base), pas idOrganisateur — celui-ci n'existe que côté domaine
      // (Evenement.idOrganisateur, voir EvenementRepositoryDatabase.versEntite).
      where: { evenement: { idJoueur: idOrganisateur } },
    });

    return resultat._avg.note;
  }
}
