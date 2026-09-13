// Représente une photo stockée en base (colonnes lieu.photo / lieu.photo_type).
// Écart assumé au MCD d'origine : voir CLAUDE.md, section 5.
export type PhotoLieu = {
  donnees: Uint8Array;
  typeMime: string;
};

export interface LieuRepositoryInterface {
  // Enregistre (ou remplace) la photo d'un lieu.
  enregistrerPhoto(idLieu: number, photo: PhotoLieu): Promise<void>;

  // Récupère la photo d'un lieu. Null si aucune n'a été déposée.
  trouverPhoto(idLieu: number): Promise<PhotoLieu | null>;
}
