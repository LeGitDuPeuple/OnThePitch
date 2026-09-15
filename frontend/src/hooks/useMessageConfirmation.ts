import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type EtatNavigation = { messageConfirmation?: string } | null;

// Lit un message de confirmation passé via navigate(url, { state: {...} }) —
// utile quand l'écran source disparaît après l'action (ex. fiche d'un
// événement qu'on vient d'annuler, qui renvoie 404 ensuite) et ne peut donc
// pas afficher lui-même la confirmation. Générique, réutilisable par n'importe
// quel écran de destination, pas seulement la carte de recherche.
export const useMessageConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(
    (location.state as EtatNavigation)?.messageConfirmation ?? null
  );

  useEffect(() => {
    if (!(location.state as EtatNavigation)?.messageConfirmation) return;
    // Efface le state de navigation : un F5 ou un retour arrière ne doit pas
    // réafficher le message indéfiniment.
    navigate(location.pathname, { replace: true, state: {} });
    // Volontairement une seule fois, au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effacer = () => setMessage(null);

  return { message, effacer };
};
