import { APIRequestContext, request as playwrightRequest } from "@playwright/test";
import { ADRESSE_TEST } from "./donneesTest";

const API_BASE = "http://localhost:3000/api/v1";

// URLs toujours absolues (jamais relatives à `use.baseURL` de la config, qui
// pointe le FRONT sur :5173) : ces fonctions doivent marcher aussi bien avec
// un contexte à part (`nouveauContexteApi`) qu'avec `page.request` — ce
// dernier partage le pot de cookies du navigateur, pratique pour préparer un
// compte déjà connecté avant un test qui vérifie une page authentifiée.
export const nouveauContexteApi = async (): Promise<APIRequestContext> => playwrightRequest.newContext();

export const creerCompteEtConnecter = async (
  api: APIRequestContext,
  params: { prenom: string; nom: string; email: string; motDePasse: string }
): Promise<void> => {
  await api.post(`${API_BASE}/auth/inscription`, { data: params });
  const reponse = await api.post(`${API_BASE}/auth/connexion`, {
    data: { email: params.email, motDePasse: params.motDePasse },
  });
  if (!reponse.ok()) throw new Error(`Connexion API échouée : ${reponse.status()} ${await reponse.text()}`);
};

export type EvenementSeed = {
  titre: string;
  dateDebutISO: string;
  dateFinISO: string;
  nombrePlaces?: number;
  estPrive?: boolean;
  adresse?: string;
};

const attendre = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Le contexte `api` doit déjà être connecté (creerCompteEtConnecter) — le
// cookie httpOnly de session est géré automatiquement par le pot de cookies
// du contexte, comme le ferait un vrai navigateur.
//
// GeocodageService appelle la vraie API Adresse du gouvernement à chaque
// création (voir CLAUDE.md — pas de cache, volontairement, cf. "Évolutions
// envisagées") : un test qui crée plusieurs événements de suite peut se faire
// répondre 503 "service indisponible" si le débit est trop élevé. Quelques
// tentatives avec un court délai suffisent, plutôt que ralentir tous les
// appels par précaution.
export const creerEvenement = async (api: APIRequestContext, donnees: EvenementSeed, tentative = 1): Promise<number> => {
  const reponse = await api.post(`${API_BASE}/evenements`, {
    data: {
      titre: donnees.titre,
      adresse: donnees.adresse ?? ADRESSE_TEST,
      dateDebut: donnees.dateDebutISO,
      dateFin: donnees.dateFinISO,
      nombrePlaces: donnees.nombrePlaces ?? 10,
      estPrive: donnees.estPrive ?? false,
    },
  });

  if (reponse.status() === 503 && tentative < 8) {
    await attendre(1500 * tentative);
    return creerEvenement(api, donnees, tentative + 1);
  }

  if (!reponse.ok()) throw new Error(`Création d'événement échouée : ${reponse.status()} ${await reponse.text()}`);
  const corps = await reponse.json();
  return corps.id as number;
};

// Nettoyage de fin de test : sans ça, des événements créés pour un seul test
// (ex. vérifier une pagination sur un total précis) s'accumulent d'une
// exécution à l'autre et faussent le compte des exécutions suivantes — repéré
// en pratique en relançant la suite deux fois de suite.
export const annulerEvenement = async (api: APIRequestContext, idEvenement: number): Promise<void> => {
  await api.delete(`${API_BASE}/evenements/${idEvenement}`);
};

export const dateISODansNJours = (n: number, heure = 18): string => {
  const d = new Date(Date.now() + n * 24 * 60 * 60 * 1000);
  d.setUTCHours(heure, 0, 0, 0);
  return d.toISOString();
};
