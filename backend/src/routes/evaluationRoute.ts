import { Router } from "express";
import { EvaluationController } from "../controllers/evaluationController";
import { authentifier } from "../middlewares/authentification";
import { verifierRole } from "../middlewares/autorisation";

// Ajoute la route d'évaluation sur le router /evenements existant (même
// ressource parente que les inscriptions, présences et signalements).
export const registerEvaluationRoutes = (router: Router, controller: EvaluationController) => {
  router.post("/:id/evaluations", authentifier, verifierRole("joueur"), controller.noter);
};
