import { NotificationEmailInterface } from "../../src/domain/interface/notificationEmailInterface";

export class NotificationEmailFake implements NotificationEmailInterface {
  envoyes: { destinataire: string; sujet: string; corps: string }[] = [];

  async envoyer(destinataire: string, sujet: string, corps: string): Promise<void> {
    this.envoyes.push({ destinataire, sujet, corps });
  }
}
