import { LieuRepositoryInterface, PhotoLieu } from "../domain/interface/lieuRepositoryInterface";
import { EvenementRepositoryInterface } from "../domain/interface/evenementRepositoryInterface";
import { RessourceIntrouvable, AccesRefuse } from "../domain/erreurMetier";

export class PhotoService {
  constructor(
    private readonly lieuRepository: LieuRepositoryInterface,
    private readonly evenementRepository: EvenementRepositoryInterface
  ) {}

  // Dépose (ou remplace) la photo du lieu d'un événement. Réservé à l'organisateur :
  // la photo est rattachée au lieu, mais gérée à travers l'événement (pas de route /lieux).
  async televerser(idEvenement: number, idOrganisateur: number, photo: PhotoLieu): Promise<void> {
    const evenement = await this.evenementRepository.trouverParId(idEvenement);

    if (!evenement || !evenement.estActif()) {
      throw new RessourceIntrouvable("Événement introuvable");
    }

    if (!evenement.estOrganisePar(idOrganisateur)) {
      throw new AccesRefuse("Seul l'organisateur peut ajouter une photo à cet événement");
    }

    await this.lieuRepository.enregistrerPhoto(evenement.idLieu, photo);
  }

  // Récupère la photo du lieu d'un événement.
  async recuperer(idEvenement: number): Promise<PhotoLieu> {
    const evenement = await this.evenementRepository.trouverParId(idEvenement);

    if (!evenement) {
      throw new RessourceIntrouvable("Événement introuvable");
    }

    const photo = await this.lieuRepository.trouverPhoto(evenement.idLieu);

    if (!photo) {
      throw new RessourceIntrouvable("Aucune photo pour cet événement");
    }

    return photo;
  }
}
