import { useEffect } from "react";
import { useAppDispatch } from "../store/hooks";
import { hydratationTerminee } from "../store/authSlice";
import { authService } from "../services/authService";
import { ErreurApi } from "../services/api";

// Vérifie au démarrage si le cookie de session est encore valide, en interrogeant
// le serveur — le front ne peut pas lire un cookie httpOnly pour le savoir lui-même.
export const useHydrateAuth = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let annule = false;

    const verifierSession = async () => {
      try {
        const utilisateur = await authService.profil();
        if (!annule) dispatch(hydratationTerminee(utilisateur));
      } catch (erreur) {
        // Un 401 est attendu si personne n'est connecté : pas une erreur à signaler.
        if (!(erreur instanceof ErreurApi)) {
          console.error(erreur);
        }
        if (!annule) dispatch(hydratationTerminee(null));
      }
    };

    void verifierSession();

    return () => {
      annule = true;
    };
  }, [dispatch]);
};
