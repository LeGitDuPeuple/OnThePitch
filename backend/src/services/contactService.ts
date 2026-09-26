import { NotificationEmailInterface } from "../domain/interface/notificationEmailInterface";

export type DemandeContact = {
  nom: string;
  email: string;
  message: string;
};

// Formulaire de contact de la page « Aide » : transmet le message à l'adresse
// de support par email. Rien n'est stocké en base (pas de table, pas de
// donnée personnelle conservée de plus — voir la politique de confidentialité).
export class ContactService {
  constructor(
    private readonly email: NotificationEmailInterface,
    private readonly adresseSupport: string
  ) {}

  async envoyer(demande: DemandeContact): Promise<void> {
    const corps = [
      `Message reçu via le formulaire de contact d'OnThePitch.`,
      ``,
      `De : ${demande.nom} <${demande.email}>`,
      ``,
      demande.message,
    ].join("\n");

    // Un échec d'envoi remonte tel quel (contrairement aux notifications) :
    // ici l'envoi EST l'action demandée, l'utilisateur doit savoir qu'elle a
    // échoué plutôt que croire son message parti.
    await this.email.envoyer(this.adresseSupport, `[Contact] Message de ${demande.nom}`, corps);
  }
}
