import { config } from "dotenv";
import path from "node:path";

// Le .env vit à la racine du repo (à côté de docker-compose.yml), pas dans backend/.
config({ path: path.resolve(__dirname, "../../../.env") });
