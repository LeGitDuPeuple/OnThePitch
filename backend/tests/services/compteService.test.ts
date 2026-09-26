import bcrypt from "bcrypt";
import { CompteService } from "../../src/services/compteService";
import { AuthService } from "../../src/services/authService";
import { EvenementService } from "../../src/services/evenementService";
import { DoubleAuthService } from "../../src/services/doubleAuthService";
import { Evenement } from "../../src/domain/entities/Evenement";
import { Inscription } from "../../src/domain/entities/Inscription";
import { AccesRefuse, Conflit, NonAuthentifie, RequeteInvalide, RessourceIntrouvable } from "../../src/domain/erreurMetier";
import { UtilisateurRepositoryFake } from "../doubles/UtilisateurRepositoryFake";
import { EvenementRepositoryFake } from "../doubles/EvenementRepositoryFake";
import { InscriptionRepositoryFake } from "../doubles/InscriptionRepositoryFake";
import { EvaluationRepositoryFake } from "../doubles/EvaluationRepositoryFake";
import { NotificationFake } from "../doubles/NotificationFake";
import { GeocodeurFake, coordonneesTest } from "../doubles/GeocodeurFake";
import { TotpFake, CODE_TOTP_VALIDE } from "../doubles/TotpFake";

const MOT_DE_PASSE = "MotDePasse123!";

// Prépare un compte réel (haché comme en production) et le service à tester.
const preparer = async (email = "jean@example.com") => {
  const repository = new UtilisateurRepositoryFake();
  const utilisateur = await new AuthService(repository).inscrire({
    nom: "Dupont",
    prenom: "Jean",
    email,
    motDePasse: MOT_DE_PASSE,
  });
  const evenements = new EvenementRepositoryFake();
  const inscriptions = new InscriptionRepositoryFake();
  const notification = new NotificationFake();
  const doubleAuth = new DoubleAuthService(repository, new TotpFake());
  const evenementService = new EvenementService(
    evenements,
    new GeocodeurFake(coordonneesTest),
    inscriptions,
    notification,
    new EvaluationRepositoryFake()
  );
  const service = new CompteService(repository, evenements, inscriptions, evenementService, doubleAuth);
  return { repository, utilisateur, service, evenements, inscriptions, notification, doubleAuth };
};

const JOUR = 24 * 60 * 60 * 1000;

// Événement organisé par `idOrganisateur`, décalé de `decalageJours` par rapport à maintenant.
const evenementDe = (id: number, idOrganisateur: number, decalageJours: number, statut: "Ouvert" | "Termine" = "Ouvert") =>
  new Evenement({
    id,
    titre: `Événement ${id}`,
    nombrePlaces: 10,
    estPrive: false,
    dateDebut: new Date(Date.now() + decalageJours * JOUR),
    dateFin: new Date(Date.now() + decalageJours * JOUR + 2 * 60 * 60 * 1000),
    idLieu: id,
    idOrganisateur,
    statut,
    niveauRequis: "tous_niveaux",
  });

describe("CompteService", () => {
  describe("changerEmail", () => {
    it("change l'email quand le mot de passe est bon", async () => {
      const { service, utilisateur } = await preparer();

      const misAJour = await service.changerEmail(utilisateur.id, "nouveau@example.com", MOT_DE_PASSE);

      expect(misAJour.email).toBe("nouveau@example.com");
    });

    it("la nouvelle adresse sert ensuite à se connecter, l'ancienne plus", async () => {
      const { repository, service, utilisateur } = await preparer();
      await service.changerEmail(utilisateur.id, "nouveau@example.com", MOT_DE_PASSE);
      const auth = new AuthService(repository);

      await expect(auth.connecter({ email: "nouveau@example.com", motDePasse: MOT_DE_PASSE })).resolves.toBeDefined();
      await expect(auth.connecter({ email: "jean@example.com", motDePasse: MOT_DE_PASSE })).rejects.toBeInstanceOf(
        NonAuthentifie
      );
    });

    it("refuse un mot de passe incorrect, sur le champ motDePasse", async () => {
      const { service, utilisateur } = await preparer();

      const tentative = service.changerEmail(utilisateur.id, "nouveau@example.com", "MauvaisMotDePasse1!");

      await expect(tentative).rejects.toBeInstanceOf(RequeteInvalide);
      await expect(tentative).rejects.toMatchObject({ champ: "motDePasse" });
    });

    it("refuse une adresse déjà utilisée par un autre compte (409, champ email)", async () => {
      const { repository, service, utilisateur } = await preparer();
      await new AuthService(repository).inscrire({
        nom: "Martin",
        prenom: "Paul",
        email: "pris@example.com",
        motDePasse: MOT_DE_PASSE,
      });

      const tentative = service.changerEmail(utilisateur.id, "pris@example.com", MOT_DE_PASSE);

      await expect(tentative).rejects.toBeInstanceOf(Conflit);
      await expect(tentative).rejects.toMatchObject({ champ: "email" });
    });

    it("refuse de « changer » vers l'adresse actuelle", async () => {
      const { service, utilisateur } = await preparer();

      await expect(service.changerEmail(utilisateur.id, "jean@example.com", MOT_DE_PASSE)).rejects.toBeInstanceOf(
        RequeteInvalide
      );
    });

    it("lève RessourceIntrouvable pour un utilisateur inconnu", async () => {
      const { service } = await preparer();

      await expect(service.changerEmail(999, "nouveau@example.com", MOT_DE_PASSE)).rejects.toBeInstanceOf(
        RessourceIntrouvable
      );
    });
  });

  describe("changerMotDePasse", () => {
    it("change le mot de passe : le nouveau fonctionne, l'ancien plus", async () => {
      const { repository, service, utilisateur } = await preparer();

      await service.changerMotDePasse(utilisateur.id, MOT_DE_PASSE, "NouveauMdp456!");

      const auth = new AuthService(repository);
      await expect(auth.connecter({ email: "jean@example.com", motDePasse: "NouveauMdp456!" })).resolves.toBeDefined();
      await expect(auth.connecter({ email: "jean@example.com", motDePasse: MOT_DE_PASSE })).rejects.toBeInstanceOf(
        NonAuthentifie
      );
    });

    it("stocke un hachage, jamais le mot de passe en clair", async () => {
      const { repository, service, utilisateur } = await preparer();

      await service.changerMotDePasse(utilisateur.id, MOT_DE_PASSE, "NouveauMdp456!");

      const relu = await repository.trouverParId(utilisateur.id);
      expect(relu?.hachage).not.toBe("NouveauMdp456!");
      expect(await bcrypt.compare("NouveauMdp456!", relu!.hachage)).toBe(true);
    });

    it("refuse un mot de passe actuel incorrect, sur le champ motDePasseActuel", async () => {
      const { service, utilisateur } = await preparer();

      const tentative = service.changerMotDePasse(utilisateur.id, "Faux123456!", "NouveauMdp456!");

      await expect(tentative).rejects.toBeInstanceOf(RequeteInvalide);
      await expect(tentative).rejects.toMatchObject({ champ: "motDePasseActuel" });
    });

    it("refuse un nouveau mot de passe identique à l'actuel", async () => {
      const { service, utilisateur } = await preparer();

      await expect(service.changerMotDePasse(utilisateur.id, MOT_DE_PASSE, MOT_DE_PASSE)).rejects.toMatchObject({
        champ: "nouveauMotDePasse",
      });
    });
  });

  describe("supprimerCompte", () => {
    it("anonymise le compte : identité effacée, connexion impossible, email libéré", async () => {
      const { repository, service, utilisateur } = await preparer();

      await service.supprimerCompte(utilisateur.id, MOT_DE_PASSE);

      const relu = await repository.trouverParId(utilisateur.id);
      expect(relu?.nom).toBe("Utilisateur");
      expect(relu?.prenom).toBe("supprimé");
      expect(relu?.email).not.toBe("jean@example.com");
      expect(repository.idsAnonymises).toEqual([utilisateur.id]);
      await expect(
        new AuthService(repository).connecter({ email: "jean@example.com", motDePasse: MOT_DE_PASSE })
      ).rejects.toBeInstanceOf(NonAuthentifie);
      // L'adresse d'origine peut servir à ouvrir un nouveau compte.
      await expect(
        new AuthService(repository).inscrire({ nom: "Neuf", prenom: "Jean", email: "jean@example.com", motDePasse: MOT_DE_PASSE })
      ).resolves.toBeDefined();
    });

    it("refuse un mot de passe incorrect et ne touche à rien", async () => {
      const { repository, service, utilisateur } = await preparer();

      await expect(service.supprimerCompte(utilisateur.id, "Faux123456!")).rejects.toMatchObject({
        champ: "motDePasse",
      });
      expect(repository.idsAnonymises).toEqual([]);
    });

    it("refuse de supprimer un compte administrateur", async () => {
      const { repository, service, utilisateur } = await preparer();
      utilisateur.role = "administrateur";

      await expect(service.supprimerCompte(utilisateur.id, MOT_DE_PASSE)).rejects.toBeInstanceOf(AccesRefuse);
      expect(repository.idsAnonymises).toEqual([]);
    });

    it("exige un code quand la double authentification est active", async () => {
      const { repository, service, utilisateur, doubleAuth } = await preparer();
      await doubleAuth.initialiser(utilisateur.id);
      await doubleAuth.activer(utilisateur.id, CODE_TOTP_VALIDE);

      await expect(service.supprimerCompte(utilisateur.id, MOT_DE_PASSE)).rejects.toMatchObject({ champ: "code" });
      await expect(service.supprimerCompte(utilisateur.id, MOT_DE_PASSE, "000000")).rejects.toMatchObject({
        champ: "code",
      });
      expect(repository.idsAnonymises).toEqual([]);

      await service.supprimerCompte(utilisateur.id, MOT_DE_PASSE, CODE_TOTP_VALIDE);
      expect(repository.idsAnonymises).toEqual([utilisateur.id]);
    });

    it("annule ses événements à venir et prévient les inscrits acceptés", async () => {
      const { service, utilisateur, evenements, inscriptions, notification } = await preparer();
      evenements.ajouter(evenementDe(10, utilisateur.id, 3));
      inscriptions.ajouter(new Inscription({ idJoueur: 2, idEvenement: 10, dateInscription: new Date(), statut: "acceptee" }));

      await service.supprimerCompte(utilisateur.id, MOT_DE_PASSE);

      expect((await evenements.trouverParId(10))?.estActif()).toBe(false);
      expect(notification.appels).toEqual([{ idJoueur: 2, type: "evenement_annule", idEvenement: 10 }]);
    });

    it("laisse intacts ses événements terminés", async () => {
      const { service, utilisateur, evenements } = await preparer();
      evenements.ajouter(evenementDe(11, utilisateur.id, -5, "Termine"));

      await service.supprimerCompte(utilisateur.id, MOT_DE_PASSE);

      expect((await evenements.trouverParId(11))?.estActif()).toBe(true);
    });

    it("retire ses inscriptions à venir mais garde l'historique des événements passés", async () => {
      const { service, utilisateur, evenements, inscriptions } = await preparer();
      evenements.ajouter(evenementDe(20, 99, 3));
      evenements.ajouter(evenementDe(21, 99, -5, "Termine"));
      inscriptions.ajouter(new Inscription({ idJoueur: utilisateur.id, idEvenement: 20, dateInscription: new Date(), statut: "acceptee" }));
      inscriptions.ajouter(new Inscription({ idJoueur: utilisateur.id, idEvenement: 21, dateInscription: new Date(), statut: "acceptee" }));

      await service.supprimerCompte(utilisateur.id, MOT_DE_PASSE);

      expect(await inscriptions.trouver(utilisateur.id, 20)).toBeNull();
      expect(await inscriptions.trouver(utilisateur.id, 21)).not.toBeNull();
    });
  });
});
