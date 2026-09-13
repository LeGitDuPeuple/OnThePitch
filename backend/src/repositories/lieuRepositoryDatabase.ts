import { prisma } from "../config/prismaClient";
import { LieuRepositoryInterface, PhotoLieu } from "../domain/interface/lieuRepositoryInterface";

export class LieuRepositoryDatabase implements LieuRepositoryInterface {
  async enregistrerPhoto(idLieu: number, photo: PhotoLieu): Promise<void> {
    // Buffer.from(...) : Prisma exige un Uint8Array<ArrayBuffer> précis, un Buffer le satisfait toujours.
    await prisma.lieu.update({
      where: { idLieu },
      data: { photo: Buffer.from(photo.donnees), photoType: photo.typeMime },
    });
  }

  async trouverPhoto(idLieu: number): Promise<PhotoLieu | null> {
    const ligne = await prisma.lieu.findUnique({
      where: { idLieu },
      select: { photo: true, photoType: true },
    });

    if (!ligne || !ligne.photo || !ligne.photoType) return null;

    return { donnees: ligne.photo, typeMime: ligne.photoType };
  }
}
