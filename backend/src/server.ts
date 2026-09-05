import "./config/env";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandlerMiddleware } from "./middlewares/erreur";
import { authController } from "./config/container";
import { authRoutes, registerAuthRoutes } from "./routes/authRoute";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

// Sécurité et parsers — avant toute route
app.use(helmet());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dépendances assemblées dans config/container.ts — server.ts ne fait que brancher les routes.
registerAuthRoutes(authController);

// Route de santé, pour vérifier que l'API répond
app.get("/api/v1/sante", (_req, res) => {
  res.json({ statut: "ok" });
});

app.use("/api/v1/auth", authRoutes);

// Toujours en dernier : capture ce que les routes laissent remonter
app.use(errorHandlerMiddleware);

app.listen(PORT, () => {
  console.log(`API démarrée sur http://localhost:${PORT}`);
});