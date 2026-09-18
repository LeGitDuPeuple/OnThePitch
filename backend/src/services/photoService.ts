import { LieuRepositoryInterface, PhotoLieu } from "../domain/interface/lieuRepositoryInterface";
import { EvenementRepositoryInterface } from "../domain/interface/evenementRepositoryInterface";
import { RessourceIntrouvable, AccesRefuse, RequeteInvalide } from "../domain/erreurMetier";

// Vérifie les premiers octets du fichier plutôt que de faire confiance au
// Content-Type déclaré par le client (voir routes/photoRoute.ts : Multer ne
// filtre que sur `fichier.mimetype`, une valeur que le client choisit
// librement — un exécutable renommé en .jpg passe ce filtre tel quel).
// Trouvé en testant SEC-05 (cahier de recette) : un .exe renommé en .jpg
// était accepté (204). Volontairement une vérification maison à 3 signatures
// plutôt qu'une dépendance (`file-type` récent est ESM-only, friction inutile
// sur ce périmètre — voir CLAUDE.md, "la simplicité prime").
const estUneVraieImage = (octets: Uint8Array): boolean => {
  const jpeg = octets.length >= 3 && octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff;
  const png =
    octets.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((valeur, index) => octets[index] === valeur);
  const webp =
    octets.length >= 12 &&
    Buffer.from(octets.slice(0, 4)).toString("ascii") === "RIFF" &&
    Buffer.from(octets.slice(8, 12)).toString("ascii") === "WEBP";

  return jpeg || png || webp;
};

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

    if (!estUneVraieImage(photo.donnees)) {
      throw new RequeteInvalide("Le fichier envoyé n'est pas une image valide (jpeg, png ou webp)");
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
