import { Router } from "express";
import { NotificationController } from "../controllers/notificationController";
import { authentifier } from "../middlewares/authentification";

// Notifications : toujours "les miennes", jamais de ressource publique ici —
// authentification systématique, pas de garde de rôle (joueur ou administrateur
// peuvent tous deux en recevoir).
export const notificationRoutes = Router();

export const registerNotificationRoutes = (controller: NotificationController) => {
  notificationRoutes.get("/", authentifier, controller.lister);
  notificationRoutes.post("/:id/lue", authentifier, controller.marquerLue);
};
