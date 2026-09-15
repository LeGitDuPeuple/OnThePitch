import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export type TypeMessageConfirmation = "succes" | "avertissement";

type EtatNavigation = { messageConfirmation?: string; typeMessageConfirmation?: TypeMessageConfirmation } | null;

// Lit un message de confirmation (ou d'avertissement) passé via
// navigate(url, { state: {...} }) — utile quand l'écran source disparaît après
// l'action (ex. fiche d'un événement qu'on vient d'annuler, qui renvoie 404
// ensuite) et ne peut donc pas afficher lui-même le message. Générique,
// réutilisable par n'importe quel écran de destination.
export const useMessageConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const etatInitial = location.state as EtatNavigation;
  const [message, setMessage] = useState<string | null>(etatInitial?.messageConfirmation ?? null);
  // Pas de setter : le type n'a de sens que tant que le message l'accompagne,
  // fixé une fois pour toutes à la lecture du state de navigation.
  const [type] = useState<TypeMessageConfirmation>(etatInitial?.typeMessageConfirmation ?? "succes");

  useEffect(() => {
    if (!(location.state as EtatNavigation)?.messageConfirmation) return;
    // Efface le state de navigation : un F5 ou un retour arrière ne doit pas
    // réafficher le message indéfiniment.
    navigate(location.pathname, { replace: true, state: {} });
    // Volontairement une seule fois, au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effacer = () => setMessage(null);

  return { message, type, effacer };
};
