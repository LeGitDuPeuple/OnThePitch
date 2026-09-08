import { Inscription, StatutInscription } from "../entities/Inscription";

export interface InscriptionRepositoryInterface {
  // Cherche une inscription existante, tous statuts confondus.
  trouver(idJoueur: number, idEvenement: number): Promise<Inscription | null>;

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
}
