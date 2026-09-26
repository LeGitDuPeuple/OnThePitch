import { useEffect } from "react";

type Props = {
  titre: string;
  description: string;
  // Faux pour les pages privées (compte, admin...) : demande aux moteurs de
  // recherche de ne pas les indexer, en plus du fichier robots.txt.
  indexable?: boolean;
};

// Référencement naturel : titre, description et consigne d'indexation propres
// à chaque page. L'application étant une page unique (le navigateur change
// d'écran sans recharger), index.html porte les valeurs par défaut et chaque
// écran les remplace en s'affichant.
export const TitrePage = ({ titre, description, indexable = true }: Props) => {
  useEffect(() => {
    document.title = `${titre} | OnThePitch`;
    poserMeta("description", description);
    poserMeta("robots", indexable ? null : "noindex, nofollow");
  }, [titre, description, indexable]);

  return null;
};

// Crée, met à jour ou retire (contenu null) une balise <meta name="...">.
const poserMeta = (nom: string, contenu: string | null) => {
  let balise = document.head.querySelector<HTMLMetaElement>(`meta[name="${nom}"]`);

  if (contenu === null) {
    balise?.remove();
    return;
  }

  if (!balise) {
    balise = document.createElement("meta");
    balise.name = nom;
    document.head.appendChild(balise);
  }
  balise.content = contenu;
};
