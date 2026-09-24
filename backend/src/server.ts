import "./config/env";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { errorHandlerMiddleware } from "./middlewares/erreur";
import {
  authController,
  evenementController,
  inscriptionController,
  presenceController,
  moderationController,
  evaluationController,
  photoController,
  geocodageController,
  evenementService,
  notificationController,
} from "./config/container";
import { authRoutes, registerAuthRoutes } from "./routes/authRoute";
import { evenementRoutes, registerEvenementRoutes } from "./routes/evenementRoute";
import { registerInscriptionRoutes } from "./routes/inscriptionRoute";
import { registerPresenceRoutes } from "./routes/presenceRoute";
import { moderationRoutes, registerSignalementRoutes, registerModerationRoutes } from "./routes/moderationRoute";
import { registerEvaluationRoutes } from "./routes/evaluationRoute";
import { registerPhotoRoutes } from "./routes/photoRoute";
import { notificationRoutes, registerNotificationRoutes } from "./routes/notificationRoute";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

// Sécurité et parsers — avant toute route.
// crossOriginResourcePolicy: Helmet pose "same-origin" par défaut, qui bloque
// silencieusement le chargement de la photo du lieu par le <img> du front
// (localhost:5173 → localhost:3000, deux origines distinctes) — repéré en
// testant l'upload de photo, la requête réussissait (200) mais l'image ne
// s'affichait jamais. Sans risque ici : la photo est publique par conception
// (servie par une route dédiée, sans authentification, voir CLAUDE.md section
// "Photo du lieu"), et les routes qui doivent rester restreintes le sont déjà
// par CORS (origin unique + credentials) et par le cookie httpOnly.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Dépendances assemblées dans config/container.ts — server.ts ne fait que brancher les routes.
registerAuthRoutes(authController);
registerEvenementRoutes(evenementController, geocodageController);
registerInscriptionRoutes(evenementRoutes, inscriptionController);
registerPresenceRoutes(evenementRoutes, presenceController);
registerSignalementRoutes(evenementRoutes, moderationController);
registerEvaluationRoutes(evenementRoutes, evaluationController);
registerModerationRoutes(moderationController);
registerPhotoRoutes(evenementRoutes, photoController);
registerNotificationRoutes(notificationController);

// Route de santé, pour vérifier que l'API répond
app.get("/api/v1/sante", (_req, res) => {
  res.json({ statut: "ok" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/evenements", evenementRoutes);
app.use("/api/v1/moderation", moderationRoutes);
app.use("/api/v1/notifications", notificationRoutes);



// Toujours en dernier : capture ce que les routes laissent remonter
app.use(errorHandlerMiddleware);

// Filet de sécurité pour un organisateur qui a oublié de cliquer "Terminer
// l'événement" (voir CLAUDE.md, section Présences) : toutes les 30 min,
// clôture les événements terminés depuis plus de 3h. setInterval suffit ici,
// pas de cron externe ni de nouvelle dépendance — l'opération est idempotente
// (WHERE idStatutEvent != Termine), donc sans risque en cas de double exécution.
const INTERVALLE_CLOTURE_AUTO_MS = 30 * 60 * 1000;

const executerClotureAutomatique = () => {
  evenementService.terminerEvenementsExpires().catch((erreur: unknown) => {
    console.error("Échec de la clôture automatique des événements :", erreur);
  });
};

executerClotureAutomatique();
setInterval(executerClotureAutomatique, INTERVALLE_CLOTURE_AUTO_MS);

app.listen(PORT, () => {
  console.log(`API démarrée sur http://localhost:${PORT}`);
});