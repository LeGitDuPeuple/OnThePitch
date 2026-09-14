import { useCallback, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../store/hooks";
import { connexionReussie } from "../store/authSlice";
import { authService } from "../services/authService";
import { ErreurApi } from "../services/api";

// Toute la logique du formulaire d'inscription : le composant Inscription ne
// fait qu'afficher ce que ce hook expose (voir CLAUDE.md, "Front React").
export const useInscriptionForm = () => {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [ville, setVille] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const soumettre = useCallback(
    async (evenement: FormEvent) => {
      evenement.preventDefault();
      setErreur(null);
      setChargement(true);

      try {
        // POST /auth/inscription crée le compte mais ne connecte pas (voir
        // authService) : on enchaîne avec la connexion pour éviter à la
        // personne de retaper ses identifiants qu'elle vient de saisir.
        await authService.inscription({ nom, prenom, email, motDePasse, ville: ville.trim() || undefined });
        const { utilisateur } = await authService.connexion({ email, motDePasse });
        dispatch(connexionReussie(utilisateur));
        navigate("/");
      } catch (erreurRequete) {
        setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
      } finally {
        setChargement(false);
      }
    },
    [nom, prenom, email, motDePasse, ville, dispatch, navigate]
  );

  return {
    nom,
    setNom,
    prenom,
    setPrenom,
    email,
    setEmail,
    motDePasse,
    setMotDePasse,
    ville,
    setVille,
    erreur,
    chargement,
    soumettre,
  };
};
