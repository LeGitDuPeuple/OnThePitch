// Port d'envoi d'email, utilisé uniquement par NotificationService — jamais
// directement par les autres services (voir CLAUDE.md, "Évolutions envisagées").
export interface NotificationEmailInterface {
  envoyer(destinataire: string, sujet: string, corps: string): Promise<void>;
}
