import { test, expect } from "@playwright/test";
import { InscriptionPage } from "../pages/InscriptionPage";
import { FicheEvenementPage } from "../pages/FicheEvenementPage";
import { emailUnique, MOT_DE_PASSE_TEST } from "../utils/donneesTest";
import { creerCompteEtConnecter, creerEvenement, dateISODansNJours } from "../utils/apiClient";

// Organisateur préparé une fois via l'API (plus rapide, la création
// d'événement par l'UI est déjà couverte par creation-evenement.spec.ts) :
// ici on vérifie le comportement de RECHERCHE... non, d'INSCRIPTION, pas la
// création. `page.request` partage le pot de cookies du navigateur — la page
// de l'organisateur est donc déjà connectée sans passer par /connexion.
const preparerOrganisateurConnecte = async (page: import("@playwright/test").Page) => {
  const email = emailUnique("e2e.organisateur");
  await creerCompteEtConnecter(page.request, { prenom: "Organisateur", nom: "Test", email, motDePasse: MOT_DE_PASSE_TEST });
};

test.describe("Rejoindre un événement", () => {
  test("un événement public s'inscrit directement, la désinscription libère la place", async ({ browser }) => {
    const contexteOrga = await browser.newContext();
    const pageOrga = await contexteOrga.newPage();
    await preparerOrganisateurConnecte(pageOrga);
    const idEvenement = await creerEvenement(pageOrga.request, {
      titre: `E2E public ${Date.now()}`,
      dateDebutISO: dateISODansNJours(4),
      dateFinISO: dateISODansNJours(4, 20),
      nombrePlaces: 4,
      estPrive: false,
    });

    const contexteJoueur = await browser.newContext();
    const pageJoueur = await contexteJoueur.newPage();
    const inscriptionPage = new InscriptionPage(pageJoueur);
    await inscriptionPage.inscrire({
      prenom: "Joueur",
      nom: "Public",
      email: emailUnique("e2e.joueur.public"),
      motDePasse: MOT_DE_PASSE_TEST,
    });

    const fiche = new FicheEvenementPage(pageJoueur);
    await fiche.aller(idEvenement);
    await fiche.sinscrire();
    await expect(pageJoueur.getByRole("button", { name: "Se désinscrire" })).toBeVisible();

    await fiche.seDesinscrire();
    await expect(pageJoueur.getByRole("button", { name: "S'inscrire à cet événement" })).toBeVisible();

    await contexteOrga.close();
    await contexteJoueur.close();
  });

  test("une demande sur événement privé, acceptée par l'organisateur", async ({ browser }) => {
    const contexteOrga = await browser.newContext();
    const pageOrga = await contexteOrga.newPage();
    await preparerOrganisateurConnecte(pageOrga);
    const idEvenement = await creerEvenement(pageOrga.request, {
      titre: `E2E privé accepté ${Date.now()}`,
      dateDebutISO: dateISODansNJours(4),
      dateFinISO: dateISODansNJours(4, 20),
      nombrePlaces: 4,
      estPrive: true,
    });

    const contexteJoueur = await browser.newContext();
    const pageJoueur = await contexteJoueur.newPage();
    const nomJoueur = `Accepte${Date.now()}`;
    await new InscriptionPage(pageJoueur).inscrire({
      prenom: nomJoueur,
      nom: "E2E",
      email: emailUnique("e2e.joueur.accepte"),
      motDePasse: MOT_DE_PASSE_TEST,
    });

    const ficheJoueur = new FicheEvenementPage(pageJoueur);
    await ficheJoueur.aller(idEvenement);
    await ficheJoueur.demanderARejoindre();
    await expect(pageJoueur.getByRole("button", { name: "Annuler ma demande" })).toBeVisible();

    // L'organisateur valide la demande depuis sa propre fiche.
    const ficheOrga = new FicheEvenementPage(pageOrga);
    await ficheOrga.aller(idEvenement);
    await ficheOrga.accepterDemandeDe(nomJoueur);

    // Le joueur, en rechargeant, voit son inscription acceptée.
    await pageJoueur.reload();
    await expect(pageJoueur.getByRole("button", { name: "Se désinscrire" })).toBeVisible();

    await contexteOrga.close();
    await contexteJoueur.close();
  });

  test("une demande refusée affiche un message clair, sans possibilité de re-demander", async ({ browser }) => {
    const contexteOrga = await browser.newContext();
    const pageOrga = await contexteOrga.newPage();
    await preparerOrganisateurConnecte(pageOrga);
    const idEvenement = await creerEvenement(pageOrga.request, {
      titre: `E2E privé refusé ${Date.now()}`,
      dateDebutISO: dateISODansNJours(4),
      dateFinISO: dateISODansNJours(4, 20),
      nombrePlaces: 4,
      estPrive: true,
    });

    const contexteJoueur = await browser.newContext();
    const pageJoueur = await contexteJoueur.newPage();
    const nomJoueur = `Refuse${Date.now()}`;
    await new InscriptionPage(pageJoueur).inscrire({
      prenom: nomJoueur,
      nom: "E2E",
      email: emailUnique("e2e.joueur.refuse"),
      motDePasse: MOT_DE_PASSE_TEST,
    });

    const ficheJoueur = new FicheEvenementPage(pageJoueur);
    await ficheJoueur.aller(idEvenement);
    await ficheJoueur.demanderARejoindre();

    const ficheOrga = new FicheEvenementPage(pageOrga);
    await ficheOrga.aller(idEvenement);
    await ficheOrga.refuserDemandeDe(nomJoueur);

    // Correctif du 20/09/2026 (voir CLAUDE.md) : plus de bouton de demande
    // après un refus, un message explicite à la place.
    await pageJoueur.reload();
    await expect(ficheJoueur.messageDemandeRefusee()).toBeVisible();
    await expect(pageJoueur.getByRole("button", { name: "Demander à rejoindre" })).toHaveCount(0);

    await contexteOrga.close();
    await contexteJoueur.close();
  });
});
