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
  photoController,
  geocodageController,
} from "./config/container";
import { authRoutes, registerAuthRoutes } from "./routes/authRoute";
import { evenementRoutes, registerEvenementRoutes } from "./routes/evenementRoute";
import { registerInscriptionRoutes } from "./routes/inscriptionRoute";
import { registerPresenceRoutes } from "./routes/presenceRoute";
import { moderationRoutes, registerSignalementRoutes, registerModerationRoutes } from "./routes/moderationRoute";
import { registerPhotoRoutes } from "./routes/photoRoute";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

// Sécurité et parsers — avant toute route
app.use(helmet());
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
registerModerationRoutes(moderationController);
registerPhotoRoutes(evenementRoutes, photoController);

// Route de santé, pour vérifier que l'API répond
app.get("/api/v1/sante", (_req, res) => {
  res.json({ statut: "ok" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/evenements", evenementRoutes);
app.use("/api/v1/moderation", moderationRoutes);



// Toujours en dernier : capture ce que les routes laissent remonter
app.use(errorHandlerMiddleware);

app.listen(PORT, () => {
  console.log(`API démarrée sur http://localhost:${PORT}`);
});