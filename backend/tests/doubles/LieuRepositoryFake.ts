import { LieuRepositoryInterface, PhotoLieu } from "../../src/domain/interface/lieuRepositoryInterface";

export class LieuRepositoryFake implements LieuRepositoryInterface {
  private photos = new Map<number, PhotoLieu>();

  async enregistrerPhoto(idLieu: number, photo: PhotoLieu): Promise<void> {
    this.photos.set(idLieu, photo);
  }

  async trouverPhoto(idLieu: number): Promise<PhotoLieu | null> {
    return this.photos.get(idLieu) ?? null;
  }
}
