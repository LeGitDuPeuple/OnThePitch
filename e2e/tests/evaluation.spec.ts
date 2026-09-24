import { test, expect } from "@playwright/test";
import { InscriptionPage } from "../pages/InscriptionPage";
import { FicheEvenementPage } from "../pages/FicheEvenementPage";
import { EntetePage } from "../pages/EntetePage";
import { emailUnique, MOT_DE_PASSE_TEST } from "../utils/donneesTest";
import { creerCompteEtConnecter, creerEvenement } from "../utils/apiClient";

// Parcours complet côté créateur ET joueur, du dépôt de l'annonce à
// l'évaluation (voir CLAUDE.md, sections "Évaluations" et "Notifications",
// ajoutées le 23-24/09/2026). La création d'événement par l'UI est déjà
// couverte par creation-evenement.spec.ts : l'organisateur est préparé via
// l'API ici, pour ne pas dupliquer ce qui est déjà vérifié ailleurs et
// concentrer ce test sur ce qui est nouveau (clôture, notification, évaluation).
test.describe("Évaluation de l'organisateur", () => {
  test("inscription → clôture → notification → évaluation → fiabilité affichée", async ({ browser }) => {
    const contexteOrga = await browser.newContext();
    const pageOrga = await contexteOrga.newPage();
    await creerCompteEtConnecter(pageOrga.request, {
      prenom: "Organisateur",
      nom: "Eval",
      email: emailUnique("e2e.orga.eval"),
      motDePasse: MOT_DE_PASSE_TEST,
    });
    // dateDebut tout proche plutôt que dans N jours : la création exige une
    // date future (voir CLAUDE.md, section Événements), et rejoindre un
    // événement l'exige aussi (`Evenement.verifierInscriptionPossible`, déjà
    // existant — "Cet événement a déjà commencé" sinon). Mais "Terminer
    // l'événement" exige désormais l'inverse (règle ajoutée le 24/09/2026,
    // voir CLAUDE.md section Présences) : il faut donc que le joueur rejoigne
    // AVANT cette échéance, puis que l'organisateur clôture APRÈS — d'où la
    // marge de 8s (le temps que l'inscription du joueur, via l'UI, se termine)
    // et l'attente explicite plus bas avant de cliquer "Terminer".
    const dateDebut = new Date(Date.now() + 8000);
    const idEvenement = await creerEvenement(pageOrga.request, {
      titre: `E2E évaluation ${Date.now()}`,
      dateDebutISO: dateDebut.toISOString(),
      dateFinISO: new Date(dateDebut.getTime() + 90 * 60 * 1000).toISOString(),
      nombrePlaces: 4,
      estPrive: false,
    });

    // Le joueur, lui, est créé via l'UI (parcours visible en --headed).
    const contexteJoueur = await browser.newContext();
    const pageJoueur = await contexteJoueur.newPage();
    await new InscriptionPage(pageJoueur).inscrire({
      prenom: "Joueur",
      nom: "Eval",
      email: emailUnique("e2e.joueur.eval"),
      motDePasse: MOT_DE_PASSE_TEST,
    });

    const ficheJoueur = new FicheEvenementPage(pageJoueur);
    await ficheJoueur.aller(idEvenement);
    await ficheJoueur.sinscrire();
    await expect(pageJoueur.getByRole("button", { name: "Se désinscrire" })).toBeVisible();

    // L'organisateur clôture l'événement, une fois celui-ci commencé.
    const delaiRestant = dateDebut.getTime() - Date.now();
    if (delaiRestant > 0) await pageOrga.waitForTimeout(delaiRestant + 500);

    const ficheOrga = new FicheEvenementPage(pageOrga);
    await ficheOrga.aller(idEvenement);
    await ficheOrga.terminerEvenement();
    await expect(pageOrga.getByText("Terminé", { exact: true })).toBeVisible();

    // Le joueur reçoit la notification "événement terminé" (5ᵉ déclencheur,
    // ajouté le 24/09/2026 — voir CLAUDE.md, section Notifications).
    await pageJoueur.reload();
    const entete = new EntetePage(pageJoueur);
    await expect(entete.badgeNotifications).toHaveText("1");
    await entete.ouvrirNotifications();
    const [texteNotification] = await entete.texteNotifications();
    expect(texteNotification).toContain("est terminé");

    // Cliquer la notification marque comme lue et renvoie sur la fiche —
    // exactement là où se trouve le bouton "Évaluer l'organisateur".
    await entete.cliquerPremiereNotification();
    await expect(pageJoueur).toHaveURL(`/evenements/${idEvenement}`);

    await ficheJoueur.evaluerOrganisateur(5, "Super organisation, à refaire !");
    await expect(ficheJoueur.messageEvaluationEnvoyee()).toBeVisible();

    // La fiabilité (moyenne des évaluations reçues par l'organisateur, tous
    // ses événements confondus) est désormais visible par n'importe qui —
    // pastille dédiée depuis le 24/09/2026 (voir CLAUDE.md).
    await pageJoueur.reload();
    await expect(ficheJoueur.pastilleFiabilite()).toHaveText("★ 5.0/5");

    await contexteOrga.close();
    await contexteJoueur.close();
  });
});
