// Palette fixe, choisie pour rester lisible avec du texte blanc dessus.
const COULEURS = ["#1c7a44", "#2f6fa3", "#a35c2f", "#7a4fa3", "#b3261e", "#4f7a3f", "#5c5c9e"];

// Couleur dérivée du nom : stable pour un même joueur, sans dépendre d'une
// photo de profil (absente du MCD).
const couleurPour = (texte: string): string => {
  let somme = 0;
  for (let i = 0; i < texte.length; i++) somme += texte.charCodeAt(i);
  return COULEURS[somme % COULEURS.length];
};

type PropsAvatar = {
  nom: string;
  prenom: string;
  taille?: number;
};

export const Avatar = ({ nom, prenom, taille = 32 }: PropsAvatar) => {
  const initiales = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();

  return (
    <span
      className="avatar"
      style={{ width: taille, height: taille, fontSize: taille * 0.4, background: couleurPour(nom + prenom) }}
      aria-hidden="true"
    >
      {initiales}
    </span>
  );
};
