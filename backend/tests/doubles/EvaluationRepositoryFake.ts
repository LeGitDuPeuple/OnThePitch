import { Evaluation } from "../../src/domain/entities/Evaluation";
import { EvaluationRepositoryInterface, NouvelleEvaluation } from "../../src/domain/interface/evaluationRepositoryInterface";

export class EvaluationRepositoryFake implements EvaluationRepositoryInterface {
  private evaluations: Evaluation[] = [];
  // La vraie implémentation résout l'organisateur via la relation Prisma
  // evaluation -> evenement (voir moyenneParOrganisateur) ; ce double n'a pas
  // de table evenement à joindre, d'où cette correspondance fournie à part
  // par les tests qui en ont besoin.
  private organisateurParEvenement: Record<number, number> = {};

  definirOrganisateur(idEvenement: number, idOrganisateur: number): void {
    this.organisateurParEvenement[idEvenement] = idOrganisateur;
  }

  async creer(donnees: NouvelleEvaluation): Promise<Evaluation> {
    const evaluation = new Evaluation({ ...donnees, dateEvaluation: new Date() });
    this.evaluations.push(evaluation);
    return evaluation;
  }

  async moyenneParOrganisateur(idOrganisateur: number): Promise<number | null> {
    const notes = this.evaluations
      .filter((evaluation) => this.organisateurParEvenement[evaluation.idEvenement] === idOrganisateur)
      .map((evaluation) => evaluation.note);

    if (notes.length === 0) return null;
    return notes.reduce((total, note) => total + note, 0) / notes.length;
  }
}
