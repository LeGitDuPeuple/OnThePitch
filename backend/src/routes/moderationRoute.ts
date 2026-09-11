import { Router } from "express";
import { ModerationController } from "../controllers/moderationController";
import { authentifier } from "../middlewares/authentification";
import { verifierRole } from "../middlewares/autorisation";

// Signalement : ajouté sur le router /evenements existant (même ressource parente
// que les inscriptions et les présences).
export const registerSignalementRoutes = (router: Router, controller: ModerationController) => {
  router.post("/:id/signalements", authentifier, verifierRole("joueur"), controller.signaler);
};

// Actions réservées à l'administrateur : router dédié, monté sur /api/v1/moderation
// (pas un backoffice séparé — juste un préfixe de ressource, voir CLAUDE.md section 8).
export const moderationRoutes = Router();

export const registerModerationRoutes = (controller: ModerationController) => {
  moderationRoutes.get("/signalements", authentifier, verifierRole("administrateur"), controller.lister);

  moderationRoutes.post(
    "/evenements/:id/sanctionner",
    authentifier,
    verifierRole("administrateur"),
    controller.sanctionner
  );

  moderationRoutes.delete(
    "/evenements/:id/signalements",
    authentifier,
    verifierRole("administrateur"),
    controller.rejeter
  );
};
