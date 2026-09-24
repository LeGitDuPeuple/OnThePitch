import { Inscription, StatutInscription } from "../entities/Inscription";

// Un inscrit, tel qu'affiché sur la fiche événement : identité du joueur + statut
// de sa demande. Permet aussi à l'organisateur de retrouver les demandes en attente
// à valider (PATCH .../inscriptions/:idJoueur).
export type InscritDetail = {
  idJoueur: number;
  nom: string;
  prenom: string;
  statut: StatutInscription;
  // Date du scan QR (ou marquage manuel), null tant qu'il n'a pas eu lieu —
  // sert au front à savoir si tous les inscrits acceptés ont été pointés
  // avant de proposer "Terminer l'événement" (voir FicheEvenement.tsx).
  presence: Date | null;
};

export interface InscriptionRepositoryInterface {
  // Cherche une inscription existante, tous statuts confondus.
  trouver(idJoueur: number, idEvenement: number): Promise<Inscription | null>;

  // Liste les inscrits d'un événement (tous statuts), pour la fiche événement.
  listerParEvenement(idEvenement: number): Promise<InscritDetail[]>;

  // Inscriptions d'un joueur, filtrées par statut — pour l'écran Profil.
  // Renvoie des Inscription, pas des Evenement : la résolution vers l'événement
  // (et l'exclusion des annulés) reste au Service, qui connaît déjà les deux repos.
  listerParJoueur(idJoueur: number, statuts: StatutInscription[]): Promise<Inscription[]>;

  // Crée l'inscription. Si statutInitial vaut "acceptee" (événement public), le
  // contrôle des places et le passage en "Complet" ont lieu dans la même transaction.
  rejoindre(idJoueur: number, idEvenement: number, statutInitial: StatutInscription): Promise<Inscription>;

  // Accepte une demande en attente (événement privé) : mêmes garanties que rejoindre().
  accepter(idJoueur: number, idEvenement: number): Promise<Inscription>;

  // Refuse une demande en attente.
  refuser(idJoueur: number, idEvenement: number): Promise<Inscription>;

  // Retire l'inscription. Si elle était acceptée et l'événement complet,
  // celui-ci repasse en "Ouvert" dans la même transaction.
  desinscrire(idJoueur: number, idEvenement: number): Promise<void>;

  // Alimente rejoint.presence — scan du QR par l'organisateur, ou marquage manuel.
  marquerPresence(idJoueur: number, idEvenement: number): Promise<Inscription>;
}
