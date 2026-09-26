import { test, expect } from "@playwright/test";
import { generateSync } from "otplib";
import { API, nouveauJoueur } from "./aide";
import { nouveauContexteApi } from "../utils/apiClient";
import { emailUnique, MOT_DE_PASSE_TEST } from "../utils/donneesTest";

test.describe("Intégration — authentification et compte", () => {
  test("inscription : 201, mot de passe jamais renvoyé, doublon d'email refusé (409, champ email)", async () => {
    const api = await nouveauContexteApi();
    const email = emailUnique("integ.auth");
    const donnees = { prenom: "Integ", nom: "Auth", email, motDePasse: MOT_DE_PASSE_TEST };

    const creation = await api.post(`${API}/auth/inscription`, { data: donnees });
    expect(creation.status()).toBe(201);
    const corps = await creation.json();
    expect(corps.email).toBe(email);
    expect(JSON.stringify(corps)).not.toContain(MOT_DE_PASSE_TEST);
    expect(corps).not.toHaveProperty("motDePasse");

    const doublon = await api.post(`${API}/auth/inscription`, { data: donnees });
    expect(doublon.status()).toBe(409);
    expect((await doublon.json()).champ).toBe("email");
  });

  test("validation : mot de passe trop court et email invalide renvoient 400 avec le détail des champs", async () => {
    const api = await nouveauContexteApi();
    const reponse = await api.post(`${API}/auth/inscription`, {
      data: { prenom: "Integ", nom: "Val", email: "pas-un-email", motDePasse: "court" },
    });

    expect(reponse.status()).toBe(400);
    const champs = (await reponse.json()).details.map((d: { champ: string }) => d.champ);
    expect(champs).toEqual(expect.arrayContaining(["email", "motDePasse"]));
  });

  test("connexion : jeton dans un cookie httpOnly (jamais dans le corps), profil accessible, refus sans cookie", async () => {
    const api = await nouveauContexteApi();
    const email = emailUnique("integ.cookie");
    await api.post(`${API}/auth/inscription`, {
      data: { prenom: "Integ", nom: "Cookie", email, motDePasse: MOT_DE_PASSE_TEST },
    });

    const connexion = await api.post(`${API}/auth/connexion`, { data: { email, motDePasse: MOT_DE_PASSE_TEST } });
    expect(connexion.status()).toBe(200);
    expect(JSON.stringify(await connexion.json())).not.toMatch(/eyJ/); // pas de JWT dans le corps
    const cookie = connexion.headers()["set-cookie"] ?? "";
    expect(cookie).toContain("onthepitch_jeton=");
    expect(cookie.toLowerCase()).toContain("httponly");

    expect((await api.get(`${API}/auth/profil`)).status()).toBe(200);
    const anonyme = await nouveauContexteApi();
    expect((await anonyme.get(`${API}/auth/profil`)).status()).toBe(401);
  });

  test("mauvais mot de passe : 401 avec le même message qu'un email inconnu (n'indique pas si le compte existe)", async () => {
    const joueur = await nouveauJoueur("integ.mdp");
    const api = await nouveauContexteApi();

    const mauvaisMotDePasse = await api.post(`${API}/auth/connexion`, {
      data: { email: joueur.email, motDePasse: "Mauvais123456!" },
    });
    const emailInconnu = await api.post(`${API}/auth/connexion`, {
      data: { email: "inconnu@example.com", motDePasse: "Mauvais123456!" },
    });

    expect(mauvaisMotDePasse.status()).toBe(401);
    expect(emailInconnu.status()).toBe(401);
    expect((await mauvaisMotDePasse.json()).message).toBe((await emailInconnu.json()).message);
  });

  test("double authentification : connexion en deux temps, jeton temporaire inutilisable comme session", async () => {
    const joueur = await nouveauJoueur("integ.2fa");

    // Activation avec un vrai code TOTP calculé à partir du secret renvoyé.
    const { secret } = await (await joueur.api.post(`${API}/compte/2fa/initialiser`)).json();
    const activation = await joueur.api.post(`${API}/compte/2fa/activer`, { data: { code: generateSync({ secret }) } });
    expect(activation.status()).toBe(200);
    const { codesSecours } = await activation.json();
    expect(codesSecours).toHaveLength(10);

    // Nouvelle connexion : pas de cookie, un jeton temporaire.
    const api = await nouveauContexteApi();
    const etape1 = await api.post(`${API}/auth/connexion`, { data: { email: joueur.email, motDePasse: MOT_DE_PASSE_TEST } });
    const corps1 = await etape1.json();
    expect(corps1.doubleAuthRequise).toBe(true);
    expect(etape1.headers()["set-cookie"]).toBeUndefined();

    // Le jeton temporaire posé à la main dans le cookie ne donne AUCUNE session.
    const forge = await api.get(`${API}/auth/profil`, { headers: { Cookie: `onthepitch_jeton=${corps1.jetonTemporaire}` } });
    expect(forge.status()).toBe(401);

    // Un mauvais code est refusé, le bon ouvre la session.
    const mauvais = await api.post(`${API}/auth/connexion/2fa`, { data: { jetonTemporaire: corps1.jetonTemporaire, code: "000000" } });
    expect(mauvais.status()).toBe(401);
    const bon = await api.post(`${API}/auth/connexion/2fa`, { data: { jetonTemporaire: corps1.jetonTemporaire, code: generateSync({ secret }) } });
    expect(bon.status()).toBe(200);
    expect((await api.get(`${API}/auth/profil`)).status()).toBe(200);

    // Un code de secours ne sert qu'une fois.
    const cycle = async () => {
      const a = await nouveauContexteApi();
      const e1 = await (await a.post(`${API}/auth/connexion`, { data: { email: joueur.email, motDePasse: MOT_DE_PASSE_TEST } })).json();
      return a.post(`${API}/auth/connexion/2fa`, { data: { jetonTemporaire: e1.jetonTemporaire, code: codesSecours[0] } });
    };
    expect((await cycle()).status()).toBe(200);
    expect((await cycle()).status()).toBe(401);
  });

  test("changement d'email : 409 si l'adresse est prise, 400 si le mot de passe est faux", async () => {
    const a = await nouveauJoueur("integ.mail.a");
    const b = await nouveauJoueur("integ.mail.b");

    const pris = await a.api.patch(`${API}/compte/email`, { data: { email: b.email, motDePasse: MOT_DE_PASSE_TEST } });
    expect(pris.status()).toBe(409);

    const faux = await a.api.patch(`${API}/compte/email`, { data: { email: emailUnique("integ.mail.c"), motDePasse: "Faux123456!" } });
    expect(faux.status()).toBe(400);
    expect((await faux.json()).champ).toBe("motDePasse");
  });

  test("contact (public) : 204 sans session, 400 si le message est trop court ou l'email invalide", async () => {
    const api = await nouveauContexteApi();
    const valide = { nom: "Visiteur", email: emailUnique("integ.contact"), message: "Bonjour, j'ai une question." };

    expect((await api.post(`${API}/aide/contact`, { data: valide })).status()).toBe(204);

    const court = await api.post(`${API}/aide/contact`, { data: { ...valide, message: "court" } });
    expect(court.status()).toBe(400);
    const mauvaisEmail = await api.post(`${API}/aide/contact`, { data: { ...valide, email: "pas-un-email" } });
    expect(mauvaisEmail.status()).toBe(400);
  });
});
