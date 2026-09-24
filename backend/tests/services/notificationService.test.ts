import { NotificationService } from "../../src/services/notificationService";
import { Utilisateur } from "../../src/domain/entities/Utilisateur";
import { NotificationRepositoryFake } from "../doubles/NotificationRepositoryFake";
import { NotificationEmailFake } from "../doubles/NotificationEmailFake";
import { UtilisateurRepositoryFake } from "../doubles/UtilisateurRepositoryFake";
import { NotificationEmailInterface } from "../../src/domain/interface/notificationEmailInterface";

const creerDestinataire = (utilisateurRepository: UtilisateurRepositoryFake) => {
  const utilisateur = new Utilisateur({
    id: 1,
    nom: "Test",
    prenom: "Joueur",
    email: "joueur@example.com",
    motDePasseHache: "hash",
    role: "joueur",
    dateInscription: new Date(),
  });
  utilisateurRepository.ajouter(utilisateur);
  return utilisateur;
};

describe("NotificationService", () => {
  describe("notifier", () => {
    it("crée la notification et envoie un email générique au destinataire", async () => {
      const notificationRepository = new NotificationRepositoryFake();
      const notificationEmail = new NotificationEmailFake();
      const utilisateurRepository = new UtilisateurRepositoryFake();
      creerDestinataire(utilisateurRepository);

      const service = new NotificationService(notificationRepository, notificationEmail, utilisateurRepository);

      await service.notifier(1, "nouvelle_demande", 42);

      const notifications = await notificationRepository.listerParJoueur(1);
      expect(notifications).toHaveLength(1);
      expect(notifications[0].notification.type).toBe("nouvelle_demande");
      expect(notifications[0].notification.idEvenement).toBe(42);
      expect(notifications[0].notification.lu).toBe(false);

      expect(notificationEmail.envoyes).toHaveLength(1);
      expect(notificationEmail.envoyes[0].destinataire).toBe("joueur@example.com");
    });

    it("n'échoue pas si l'envoi d'email échoue — la notification reste créée", async () => {
      const notificationRepository = new NotificationRepositoryFake();
      const emailDefaillant: NotificationEmailInterface = {
        envoyer: async () => {
          throw new Error("SMTP indisponible");
        },
      };
      const utilisateurRepository = new UtilisateurRepositoryFake();
      creerDestinataire(utilisateurRepository);

      const service = new NotificationService(notificationRepository, emailDefaillant, utilisateurRepository);

      await expect(service.notifier(1, "evenement_complet", 42)).resolves.toBeUndefined();
      expect(await notificationRepository.compterNonLues(1)).toBe(1);
    });

    it("ne plante pas si le destinataire n'existe pas (double de test dépourvu de l'utilisateur)", async () => {
      const notificationRepository = new NotificationRepositoryFake();
      const notificationEmail = new NotificationEmailFake();
      const utilisateurRepository = new UtilisateurRepositoryFake();

      const service = new NotificationService(notificationRepository, notificationEmail, utilisateurRepository);

      await expect(service.notifier(999, "evenement_annule", 1)).resolves.toBeUndefined();
      expect(notificationEmail.envoyes).toHaveLength(0);
    });
  });

  describe("lister / compterNonLues / marquerLue", () => {
    it("compte les non lues puis les repasse à zéro après lecture", async () => {
      const notificationRepository = new NotificationRepositoryFake();
      const notificationEmail = new NotificationEmailFake();
      const utilisateurRepository = new UtilisateurRepositoryFake();
      creerDestinataire(utilisateurRepository);

      const service = new NotificationService(notificationRepository, notificationEmail, utilisateurRepository);

      await service.notifier(1, "nouvelle_demande", 10);
      await service.notifier(1, "evenement_complet", 11);

      expect(await service.compterNonLues(1)).toBe(2);

      const [premiere] = await service.lister(1);
      await service.marquerLue(premiere.notification.id, 1);

      expect(await service.compterNonLues(1)).toBe(1);
    });
  });
});
