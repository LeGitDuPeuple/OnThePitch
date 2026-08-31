import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandlerMiddleware } from "./middlewares/erreur";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

// Sécurité et parsers — avant toute route
app.use(helmet());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route de santé, pour vérifier que l'API répond
app.get("/api/v1/sante", (_req, res) => {
  res.json({ statut: "ok" });
});

// Toujours en dernier : capture ce que les routes laissent remonter
app.use(errorHandlerMiddleware);

app.listen(PORT, () => {
  console.log(`Le server à démarré sur http://localhost:${PORT}`);
});