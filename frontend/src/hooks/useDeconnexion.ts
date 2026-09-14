import { useCallback, useState } from "react";
import { useAppDispatch } from "../store/hooks";
import { deconnexionReussie } from "../store/authSlice";
import { authService } from "../services/authService";

// Le cookie httpOnly ne peut être effacé que par le serveur (POST /auth/deconnexion,
// voir CLAUDE.md section 2) : pas de simple reset de state côté front.
export const useDeconnexion = () => {
  const [enCours, setEnCours] = useState(false);
  const dispatch = useAppDispatch();

  const deconnecter = useCallback(async () => {
    setEnCours(true);
    try {
      await authService.deconnexion();
    } finally {
      dispatch(deconnexionReussie());
      setEnCours(false);
    }
  }, [dispatch]);

  return { deconnecter, enCours };
};
