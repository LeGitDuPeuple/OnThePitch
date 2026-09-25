import { APIRequestContext } from "@playwright/test";
import { creerCompteEtConnecter, nouveauContexteApi } from "../utils/apiClient";
import { emailUnique, MOT_DE_PASSE_TEST } from "../utils/donneesTest";

// Tests d'INTÉGRATION : l'API réelle contre la vraie base (PostgreSQL + PostGIS),
// appelée directement en HTTP, sans navigateur. Ils vérifient ce que les tests
// Jest (doubles en mémoire) ne peuvent pas voir — contraintes SQL, transactions,
// cookies, codes HTTP réels — et ce que les E2E (via l'interface) ne voient qu'
// indirectement. Voir docs/tests.md.

export const API = "http://localhost:3000/api/v1";

export type Joueur = {
  api: APIRequestContext;
  id: number;
  email: string;
  nomComplet: string;
};

// Crée un compte joueur ET le connecte : le contexte `api` porte le cookie de
// session (httpOnly), comme le ferait un navigateur.
export const nouveauJoueur = async (prefixe: string): Promise<Joueur> => {
  const api = await nouveauContexteApi();
  const email = emailUnique(prefixe);
  await creerCompteEtConnecter(api, { prenom: "Integ", nom: prefixe, email, motDePasse: MOT_DE_PASSE_TEST });
  const profil = await (await api.get(`${API}/auth/profil`)).json();
  return { api, id: profil.id as number, email, nomComplet: `Integ ${prefixe}` };
};

export const dansMs = (ms: number): string => new Date(Date.now() + ms).toISOString();
export const attendre = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
