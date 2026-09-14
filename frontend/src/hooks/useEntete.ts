import { useState } from "react";
import { useAppSelector } from "../store/hooks";
import { useDeconnexion } from "./useDeconnexion";

// État et action de l'en-tête : ouverture du menu mobile, déconnexion. Le
// composant Entete n'affiche que ce que ce hook expose (voir CLAUDE.md, "Front React").
export const useEntete = () => {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const { utilisateur } = useAppSelector((state) => state.auth);
  const { deconnecter, enCours } = useDeconnexion();

  const basculerMenu = () => setMenuOuvert((ouvert) => !ouvert);
  const fermerMenu = () => setMenuOuvert(false);

  return { menuOuvert, basculerMenu, fermerMenu, utilisateur, deconnecter, deconnexionEnCours: enCours };
};
