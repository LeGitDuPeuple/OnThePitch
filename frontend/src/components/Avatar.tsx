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
  // Cercle bordé neutre plutôt que coloré — réservé à "mon compte" dans
  // l'en-tête (cf. maquette 2.2.a), pour le distinguer des avatars colorés
  // utilisés partout ailleurs (organisateur, joueurs inscrits).
  neutre?: boolean;
};

export const Avatar = ({ nom, prenom, taille = 32, neutre = false }: PropsAvatar) => {
  const initiales = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();

  const style = neutre
    ? { width: taille, height: taille, fontSize: taille * 0.4, background: "#fff", color: "var(--texte)", border: "1.5px solid var(--texte)" }
    : { width: taille, height: taille, fontSize: taille * 0.4, background: couleurPour(nom + prenom) };

  return (
    <span className="avatar" style={style} aria-hidden="true">
      {initiales}
    </span>
  );
};
