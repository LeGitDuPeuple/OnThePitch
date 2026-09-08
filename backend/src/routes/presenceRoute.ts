import { Router } from "express";
import { PresenceController } from "../controllers/presenceController";
import { authentifier } from "../middlewares/authentification";
import { verifierRole } from "../middlewares/autorisation";

// Ajoute les routes de présence sur le router /evenements existant.
export const registerPresenceRoutes = (router: Router, controller: PresenceController) => {
  router.get("/:id/presences/jeton", authentifier, verifierRole("joueur"), controller.genererJeton);
  router.post("/:id/presences/scan", authentifier, verifierRole("joueur"), controller.scanner);
  router.post("/:id/presences/manuel", authentifier, verifierRole("joueur"), controller.marquerManuellement);
};
