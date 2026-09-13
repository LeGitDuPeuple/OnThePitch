import { Router } from "express";
import { InscriptionController } from "../controllers/inscriptionController";
import { authentifier } from "../middlewares/authentification";
import { verifierRole } from "../middlewares/autorisation";

// Ajoute les routes d'inscription sur le router /evenements existant
// (mêmes ressources parentes, contrôleur distinct — voir CLAUDE.md, responsabilité unique).
export const registerInscriptionRoutes = (router: Router, controller: InscriptionController) => {
  router.get("/:id/inscriptions", controller.lister);
  router.post("/:id/inscriptions", authentifier, verifierRole("joueur"), controller.rejoindre);
  router.patch("/:id/inscriptions/:idJoueur", authentifier, verifierRole("joueur"), controller.validerDemande);
  router.delete("/:id/inscriptions", authentifier, verifierRole("joueur"), controller.seDesinscrire);
};
