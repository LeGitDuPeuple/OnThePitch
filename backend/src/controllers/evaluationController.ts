import { Request, Response, NextFunction } from "express";
import { EvaluationService } from "../services/evaluationService";
import { evaluationSchema } from "../schemas/evaluationSchema";
import { RequeteInvalide } from "../domain/erreurMetier";

export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  // POST /evenements/:id/evaluations — un joueur note l'organisateur
  noter = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idEvenement = this.extraireId(req);
      const { note, commentaire } = evaluationSchema.parse(req.body);

      const evaluation = await this.evaluationService.noter(idEvenement, req.utilisateur!.id, note, commentaire);

      res.status(201).json(evaluation.versReponse());
    } catch (erreur) {
      next(erreur);
    }
  };

  private extraireId(req: Request): number {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      throw new RequeteInvalide("Identifiant d'événement invalide");
    }

    return id;
  }
}
