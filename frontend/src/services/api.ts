// Exportée pour les rares cas où l'URL sert hors de appelApi (ex. src d'une <img>
// pour la photo du lieu, qui n'est jamais chargée via fetch — voir evenementService).
export const URL_BASE = "http://localhost:3000/api/v1";

// Erreur homogène pour tous les appels API : le message vient du backend
// (déjà en français, déjà explicite — voir gestionnaire d'erreurs centralisé de l'API).
export class ErreurApi extends Error {
  constructor(
    message: string,
    public readonly statut: number
  ) {
    super(message);
    this.name = "ErreurApi";
  }
}

type Methode = "GET" | "POST" | "PATCH" | "DELETE";

type OptionsRequete = {
  methode?: Methode;
  corps?: unknown;
};

type ReponseErreur = { message?: string };

const estReponseErreur = (valeur: unknown): valeur is ReponseErreur => typeof valeur === "object" && valeur !== null;

// Point d'entrée unique vers l'API : URL de base, cookie de session envoyé
// automatiquement (credentials: "include" — le jeton est httpOnly, le front n'y
// touche jamais), erreurs traduites en ErreurApi. Aucun fetch() en dur ailleurs
// dans le code (voir CLAUDE.md).
export const appelApi = async <T>(chemin: string, options: OptionsRequete = {}): Promise<T> => {
  const entetes: Record<string, string> = {};

  if (options.corps !== undefined) {
    entetes["Content-Type"] = "application/json";
  }

  let reponse: Response;
  try {
    reponse = await fetch(`${URL_BASE}${chemin}`, {
      method: options.methode ?? "GET",
      headers: entetes,
      credentials: "include",
      body: options.corps !== undefined ? JSON.stringify(options.corps) : undefined,
    });
  } catch {
    throw new ErreurApi("Impossible de contacter le serveur", 0);
  }

  if (reponse.status === 204) {
    return undefined as T;
  }

  const donnees: unknown = await reponse.json().catch(() => null);

  if (!reponse.ok) {
    const message = estReponseErreur(donnees) && typeof donnees.message === "string" ? donnees.message : "Une erreur est survenue";
    throw new ErreurApi(message, reponse.status);
  }

  return donnees as T;
};
