export type TypeNotification =
  | "nouvelle_demande"
  | "demande_acceptee"
  | "demande_refusee"
  | "evenement_complet"
  | "evenement_annule"
  | "evenement_termine";

export type Notification = {
  id: number;
  type: TypeNotification;
  idEvenement: number;
  evenementTitre: string;
  lu: boolean;
  dateCreation: string;
};

// Message composé côté front, jamais stocké en base (voir CLAUDE.md) — un
// changement de formulation n'implique aucune migration.
export const LIBELLES_NOTIFICATION: Record<TypeNotification, (titre: string) => string> = {
  nouvelle_demande: (titre) => `Une validation est en attente sur votre événement "${titre}".`,
  demande_acceptee: (titre) => `Votre demande pour rejoindre "${titre}" a été acceptée.`,
  demande_refusee: (titre) => `Votre demande pour rejoindre "${titre}" a été refusée.`,
  evenement_complet: (titre) => `"${titre}" est complet.`,
  evenement_annule: (titre) => `"${titre}" a été annulé.`,
  evenement_termine: (titre) => `"${titre}" est terminé — donnez votre avis sur l'organisateur.`,
};
