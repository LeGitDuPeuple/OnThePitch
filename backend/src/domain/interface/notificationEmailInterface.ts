// Port d'envoi d'email, utilisé par NotificationService (notifications) et
// ContactService (formulaire de contact) — jamais par les autres services.
export interface NotificationEmailInterface {
  envoyer(destinataire: string, sujet: string, corps: string): Promise<void>;
}
