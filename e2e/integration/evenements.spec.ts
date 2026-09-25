import { test, expect } from "@playwright/test";
import { API, nouveauJoueur, dansMs, attendre } from "./aide";
import { creerEvenement, dateISODansNJours } from "../utils/apiClient";

const seed = (titre: string, extra: Record<string, unknown> = {}) => ({
  titre,
  dateDebutISO: dateISODansNJours(5),
  dateFinISO: dateISODansNJours(5, 20),
  ...extra,
});

test.describe("Intégration — événements, inscriptions, recherche", () => {
  test("création : géocodage réel, refus sans session (401) et pour une date passée (400)", async () => {
    const orga = await nouveauJoueur("integ.creation");

    const id = await creerEvenement(orga.api, seed(`Integ création ${Date.now()}`));
    const detail = await (await orga.api.get(`${API}/evenements/${id}`)).json();
    expect(detail.lieu.latitude).toBeGreaterThan(48); // adresse réellement résolue
    expect(detail.statut).toBe("Ouvert");
    expect(detail.idOrganisateur).toBe(orga.id);

    const passee = await orga.api.post(`${API}/evenements`, {
      data: { titre: "Passé", adresse: "1 Place de la Concorde, Paris", dateDebut: dansMs(-3600_000), dateFin: dansMs(3600_000), nombrePlaces: 4, estPrive: false },
    });
    expect(passee.status()).toBe(400);
  });

  test("annulation : seulement l'organisateur (403 sinon), soft delete (l'événement disparaît, 404)", async () => {
    const orga = await nouveauJoueur("integ.annul.o");
    const autre = await nouveauJoueur("integ.annul.a");
    const id = await creerEvenement(orga.api, seed(`Integ annulation ${Date.now()}`));

    expect((await autre.api.delete(`${API}/evenements/${id}`)).status()).toBe(403);
    expect((await orga.api.delete(`${API}/evenements/${id}`)).status()).toBe(204);
    expect((await orga.api.get(`${API}/evenements/${id}`)).status()).toBe(404);
  });

  test("inscription : doublon 409, événement complet 409, le statut passe à Complet puis repasse à Ouvert", async () => {
    const orga = await nouveauJoueur("integ.insc.o");
    const [j1, j2, j3] = await Promise.all([nouveauJoueur("integ.insc.1"), nouveauJoueur("integ.insc.2"), nouveauJoueur("integ.insc.3")]);
    const id = await creerEvenement(orga.api, seed(`Integ inscription ${Date.now()}`, { nombrePlaces: 2 }));

    expect((await j1.api.post(`${API}/evenements/${id}/inscriptions`)).status()).toBe(201);
    expect((await j1.api.post(`${API}/evenements/${id}/inscriptions`)).status()).toBe(409); // déjà inscrit
    expect((await j2.api.post(`${API}/evenements/${id}/inscriptions`)).status()).toBe(201);
    expect((await (await orga.api.get(`${API}/evenements/${id}`)).json()).statut).toBe("Complet");
    expect((await j3.api.post(`${API}/evenements/${id}/inscriptions`)).status()).toBe(409); // complet

    expect((await j1.api.delete(`${API}/evenements/${id}/inscriptions`)).status()).toBe(204);
    expect((await (await orga.api.get(`${API}/evenements/${id}`)).json()).statut).toBe("Ouvert");
  });

  test("concurrence : 8 inscriptions simultanées sur 2 places — exactement 2 acceptées (transaction Serializable)", async () => {
    const orga = await nouveauJoueur("integ.conc.o");
    const joueurs = await Promise.all(Array.from({ length: 8 }, (_, i) => nouveauJoueur(`integ.conc.${i}`)));
    const id = await creerEvenement(orga.api, seed(`Integ concurrence ${Date.now()}`, { nombrePlaces: 2 }));

    const reponses = await Promise.all(joueurs.map((j) => j.api.post(`${API}/evenements/${id}/inscriptions`)));
    const statuts = reponses.map((r) => r.status());

    expect(statuts.filter((s) => s === 201)).toHaveLength(2);
    expect(statuts.filter((s) => s === 409)).toHaveLength(6);
    const inscrits = await (await orga.api.get(`${API}/evenements/${id}/inscriptions`)).json();
    expect(inscrits.filter((i: { statut: string }) => i.statut === "acceptee")).toHaveLength(2);
  });

  test("événement privé : demande en attente, seul l'organisateur peut accepter (403 sinon)", async () => {
    const orga = await nouveauJoueur("integ.priv.o");
    const demandeur = await nouveauJoueur("integ.priv.d");
    const intrus = await nouveauJoueur("integ.priv.i");
    const id = await creerEvenement(orga.api, seed(`Integ privé ${Date.now()}`, { estPrive: true }));

    const demande = await demandeur.api.post(`${API}/evenements/${id}/inscriptions`);
    expect(demande.status()).toBe(201);
    expect((await demande.json()).statut).toBe("en_attente");

    const decision = { data: { accepter: true } };
    expect((await intrus.api.patch(`${API}/evenements/${id}/inscriptions/${demandeur.id}`, decision)).status()).toBe(403);
    expect((await orga.api.patch(`${API}/evenements/${id}/inscriptions/${demandeur.id}`, decision)).status()).toBe(200);
    const inscrits = await (await orga.api.get(`${API}/evenements/${id}/inscriptions`)).json();
    expect(inscrits.find((i: { idJoueur: number }) => i.idJoueur === demandeur.id).statut).toBe("acceptee");
  });

  test("recherche géolocalisée : l'événement est trouvé avec sa distance, rayon > 100 km refusé, pagination", async () => {
    const orga = await nouveauJoueur("integ.rech");
    const titre = `Integ recherche ${Date.now()}`;
    // Adresse propre à ce test (et non la Concorde, où tous les autres tests
    // créent leurs événements) : sur une base qui en contient beaucoup, notre
    // événement, à distance égale, pourrait tomber hors de la première page.
    await creerEvenement(orga.api, seed(titre, { adresse: "Place du Capitole, 31000 Toulouse" }));
    const parametres = "latitude=43.6045&longitude=1.4442";

    const trouves = await (await orga.api.get(`${API}/evenements/recherche?${parametres}&rayonKm=5&take=50`)).json();
    const notre = trouves.find((e: { titre: string }) => e.titre === titre);
    expect(notre).toBeDefined();
    expect(notre.distanceKm).toBeLessThan(1);

    expect((await orga.api.get(`${API}/evenements/recherche?${parametres}&rayonKm=500`)).status()).toBe(400);
    const page = await (await orga.api.get(`${API}/evenements/recherche?${parametres}&rayonKm=50&take=2`)).json();
    expect(page.length).toBeLessThanOrEqual(2);
  });

  test("clôture puis évaluation : refus avant le début (409), doublon 409, auto-évaluation 403, fiabilité recalculée", async () => {
    const orga = await nouveauJoueur("integ.eval.o");
    const joueur = await nouveauJoueur("integ.eval.j");
    // Débute dans 6 s : le joueur doit s'inscrire AVANT (règle existante), l'organisateur clôturer APRÈS.
    const debut = Date.now() + 6000;
    const id = await creerEvenement(orga.api, {
      titre: `Integ évaluation ${Date.now()}`,
      dateDebutISO: new Date(debut).toISOString(),
      dateFinISO: new Date(debut + 90 * 60_000).toISOString(),
      nombrePlaces: 4,
    });
    expect((await joueur.api.post(`${API}/evenements/${id}/inscriptions`)).status()).toBe(201);

    expect((await orga.api.post(`${API}/evenements/${id}/terminer`)).status()).toBe(409); // pas encore commencé
    expect((await joueur.api.post(`${API}/evenements/${id}/evaluations`, { data: { note: 5 } })).status()).toBe(409); // pas terminé

    await attendre(Math.max(0, debut - Date.now()) + 500);
    expect((await orga.api.post(`${API}/evenements/${id}/terminer`)).status()).toBe(204);
    expect((await orga.api.post(`${API}/evenements/${id}/terminer`)).status()).toBe(409); // déjà terminé

    expect((await orga.api.post(`${API}/evenements/${id}/evaluations`, { data: { note: 5 } })).status()).toBe(403); // auto-évaluation
    const note = await joueur.api.post(`${API}/evenements/${id}/evaluations`, { data: { note: 4, commentaire: "Bien" } });
    expect(note.status()).toBe(201);
    expect((await joueur.api.post(`${API}/evenements/${id}/evaluations`, { data: { note: 2 } })).status()).toBe(409); // doublon

    const detail = await (await orga.api.get(`${API}/evenements/${id}`)).json();
    expect(detail.organisateur.fiabilite).toBe(4);

    // La notification "événement terminé" a bien été créée pour le joueur inscrit.
    const notifications = await (await joueur.api.get(`${API}/notifications`)).json();
    expect(notifications.some((n: { type: string; idEvenement: number }) => n.type === "evenement_termine" && n.idEvenement === id)).toBe(true);
  });

  test("photo : un fichier qui n'est pas une image est refusé même déguisé en .jpg (400)", async () => {
    const orga = await nouveauJoueur("integ.photo");
    const id = await creerEvenement(orga.api, seed(`Integ photo ${Date.now()}`));

    const faux = await orga.api.post(`${API}/evenements/${id}/photo`, {
      multipart: { photo: { name: "virus.jpg", mimeType: "image/jpeg", buffer: Buffer.from("MZ contenu executable, pas une image") } },
    });
    expect(faux.status()).toBe(400);

    // Un vrai PNG (signature 89 50 4E 47) est accepté.
    const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000" + "1f15c4890000000d49444154789c6360000002000001e221bc330000000049454e44ae426082", "hex");
    const vrai = await orga.api.post(`${API}/evenements/${id}/photo`, { multipart: { photo: { name: "ok.png", mimeType: "image/png", buffer: png } } });
    expect(vrai.status()).toBe(204);
  });
});
