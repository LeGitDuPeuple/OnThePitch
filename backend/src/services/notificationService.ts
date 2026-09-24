import { TypeNotification } from "../domain/entities/Notification";
import { NotificationInterface } from "../domain/interface/notificationInterface";
import { NotificationRepositoryInterface, NotificationDetail } from "../domain/interface/notificationRepositoryInterface";
import { NotificationEmailInterface } from "../domain/interface/notificationEmailInterface";
import { UtilisateurRepositoryInterface } from "../domain/interface/utilisateurRepositoryInterface";

// Message générique volontairement identique pour tous les types de
// notification : jamais le détail dans l'email (voir CLAUDE.md, "Évolutions
// envisagées") — juste de quoi donner envie de se reconnecter.
const SUJET_EMAIL = "Nouvelle notification sur OnThePitch";
const CORPS_EMAIL = "Vous avez une nouvelle notification sur OnThePitch. Connectez-vous pour la consulter.";

export class NotificationService implements NotificationInterface {
  constructor(
    private readonly notificationRepository: NotificationRepositoryInterface,
    private readonly notificationEmail: NotificationEmailInterface,
    private readonly utilisateurRepository: UtilisateurRepositoryInterface
  ) {}

  // Implémente le port utilisé par InscriptionService/EvenementService.
  // L'échec de l'email ne remonte jamais : la notification en base est ce qui
  // compte réellement, l'email n'est qu'un rappel (voir CLAUDE.md).
  async notifier(idJoueur: number, type: TypeNotification, idEvenement: number): Promise<void> {
    await this.notificationRepository.creer({ idJoueur, idEvenement, type });

    const destinataire = await this.utilisateurRepository.trouverParId(idJoueur);
    if (!destinataire) return;

    try {
      await this.notificationEmail.envoyer(destinataire.email, SUJET_EMAIL, CORPS_EMAIL);
    } catch (erreur) {
      console.error("Échec de l'envoi d'email de notification :", erreur);
    }
  }

  // GET /notifications — les plus récentes d'abord.
  async lister(idJoueur: number): Promise<NotificationDetail[]> {
    return this.notificationRepository.listerParJoueur(idJoueur);
  }

  async compterNonLues(idJoueur: number): Promise<number> {
    return this.notificationRepository.compterNonLues(idJoueur);
  }

  async marquerLue(idNotification: number, idJoueur: number): Promise<void> {
    await this.notificationRepository.marquerLue(idNotification, idJoueur);
  }
}
