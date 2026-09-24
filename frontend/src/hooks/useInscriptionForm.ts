import { useCallback, useState, type FormEvent, type FocusEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../store/hooks";
import { connexionReussie } from "../store/authSlice";
import { authService } from "../services/authService";
import { ErreurApi } from "../services/api";
import { validerEmail, validerMotDePasse } from "../utils/validation";

// Toute la logique du formulaire d'inscription : le composant Inscription ne
// fait qu'afficher ce que ce hook expose (voir CLAUDE.md, "Front React").
export const useInscriptionForm = () => {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [ville, setVille] = useState("");
  const [erreurEmail, setErreurEmail] = useState<string | null>(null);
  const [erreurMotDePasse, setErreurMotDePasse] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Validées à la perte de focus — un retour immédiat, avant l'envoi du formulaire.
  const validerChampEmail = useCallback((evenement: FocusEvent<HTMLInputElement>) => {
    setErreurEmail(validerEmail(evenement.target.value));
  }, []);

  const validerChampMotDePasse = useCallback((evenement: FocusEvent<HTMLInputElement>) => {
    setErreurMotDePasse(validerMotDePasse(evenement.target.value));
  }, []);

  const soumettre = useCallback(
    async (evenement: FormEvent) => {
      evenement.preventDefault();
      setErreur(null);

      // Revalidées à la soumission : une correction après le blur ne doit pas
      // laisser un message d'erreur périmé, ni un champ invalide passer.
      const messageEmail = validerEmail(email);
      const messageMotDePasse = validerMotDePasse(motDePasse);
      setErreurEmail(messageEmail);
      setErreurMotDePasse(messageMotDePasse);
      if (messageEmail || messageMotDePasse) return;

      setChargement(true);
      try {
        // POST /auth/inscription crée le compte mais ne connecte pas (voir
        // authService) : on enchaîne avec la connexion pour éviter à la
        // personne de retaper ses identifiants qu'elle vient de saisir.
        await authService.inscription({ nom, prenom, email, motDePasse, ville: ville.trim() || undefined });
        const reponse = await authService.connexion({ email, motDePasse });
        // Un compte tout juste créé n'a jamais la double authentification.
        if (!reponse.doubleAuthRequise) {
          dispatch(connexionReussie(reponse.utilisateur));
          // Invitation discrète (bandeau fermable) : la double authentification
          // est optionnelle, mais autant la proposer au moment où on pense à la
          // sécurité du compte — sans l'imposer dans le formulaire d'inscription.
          navigate("/", {
            state: {
              messageConfirmation: "Compte créé.",
              lienMessageConfirmation: { vers: "/compte", libelle: "Sécurisez-le avec la double authentification" },
            },
          });
        }
      } catch (erreurRequete) {
        if (erreurRequete instanceof ErreurApi) {
          setErreur(erreurRequete.message);
          // "Email déjà utilisé" (back) rejoint le même emplacement que la
          // validation de format (front) — un seul endroit à regarder.
          if (erreurRequete.erreursChamps["email"]) setErreurEmail(erreurRequete.erreursChamps["email"]);
        } else {
          setErreur("Une erreur est survenue");
        }
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
    erreurEmail,
    erreurMotDePasse,
    validerChampEmail,
    validerChampMotDePasse,
    erreur,
    chargement,
    soumettre,
  };
};
