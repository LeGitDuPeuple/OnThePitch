import { useCallback, useState, type FormEvent } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { connexionReussie } from "../store/authSlice";
import { compteService } from "../services/compteService";
import { ErreurApi } from "../services/api";

type Etape = "repos" | "configuration" | "codesSecours" | "desactivation";

type Configuration = { secret: string; uri: string };

// Activation et désactivation de la double authentification depuis "Mon
// compte". L'étape "codesSecours" est l'unique moment où les 10 codes existent
// en clair (le serveur ne conserve que leurs hachages) : ils ne vivent que
// dans l'état de ce hook, jamais dans le stockage du navigateur.
export const useDoubleAuth = () => {
  const utilisateur = useAppSelector((state) => state.auth.utilisateur);
  const dispatch = useAppDispatch();
  const [etape, setEtape] = useState<Etape>("repos");
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [codesSecours, setCodesSecours] = useState<string[]>([]);
  const [codesSauvegardes, setCodesSauvegardes] = useState(false);
  const [codesCopies, setCodesCopies] = useState(false);
  const [code, setCode] = useState("");
  const [erreurCode, setErreurCode] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const active = utilisateur?.doubleAuthActive ?? false;

  const reinitialiserSaisie = () => {
    setCode("");
    setErreurCode(null);
    setErreur(null);
  };

  const traiterErreur = (erreurRequete: unknown) => {
    if (erreurRequete instanceof ErreurApi) {
      if (erreurRequete.erreursChamps["code"]) setErreurCode(erreurRequete.erreursChamps["code"]);
      else setErreur(erreurRequete.message);
    } else {
      setErreur("Une erreur est survenue");
    }
  };

  // Met à jour l'état d'authentification global (le profil affiche l'état de la 2FA).
  const mettreAJourActive = useCallback(
    (doubleAuthActive: boolean) => {
      if (utilisateur) dispatch(connexionReussie({ ...utilisateur, doubleAuthActive }));
    },
    [utilisateur, dispatch]
  );

  const commencerActivation = useCallback(async () => {
    reinitialiserSaisie();
    setChargement(true);
    try {
      setConfiguration(await compteService.initialiserDoubleAuth());
      setEtape("configuration");
    } catch (erreurRequete) {
      traiterErreur(erreurRequete);
    } finally {
      setChargement(false);
    }
  }, []);

  const confirmerActivation = useCallback(
    async (evenement: FormEvent) => {
      evenement.preventDefault();
      setErreurCode(null);
      setErreur(null);
      setChargement(true);
      try {
        const { codesSecours: codes } = await compteService.activerDoubleAuth(code);
        setCodesSecours(codes);
        setCodesSauvegardes(false);
        setCodesCopies(false);
        setConfiguration(null);
        setCode("");
        setEtape("codesSecours");
        mettreAJourActive(true);
      } catch (erreurRequete) {
        traiterErreur(erreurRequete);
      } finally {
        setChargement(false);
      }
    },
    [code, mettreAJourActive]
  );

  // Ferme l'écran des codes de secours : irréversible, ils ne seront plus affichés.
  const terminerCodesSecours = useCallback(() => {
    setCodesSecours([]);
    setEtape("repos");
  }, []);

  const copierCodesSecours = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codesSecours.join("\n"));
      setCodesCopies(true);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé...) : les codes restent affichés, à recopier à la main.
    }
  }, [codesSecours]);

  const annuler = useCallback(() => {
    reinitialiserSaisie();
    setConfiguration(null);
    setEtape("repos");
  }, []);

  const commencerDesactivation = useCallback(() => {
    reinitialiserSaisie();
    setEtape("desactivation");
  }, []);

  const confirmerDesactivation = useCallback(
    async (evenement: FormEvent) => {
      evenement.preventDefault();
      setErreurCode(null);
      setErreur(null);
      setChargement(true);
      try {
        await compteService.desactiverDoubleAuth(code);
        setCode("");
        setEtape("repos");
        mettreAJourActive(false);
      } catch (erreurRequete) {
        traiterErreur(erreurRequete);
      } finally {
        setChargement(false);
      }
    },
    [code, mettreAJourActive]
  );

  return {
    active,
    etape,
    configuration,
    codesSecours,
    codesSauvegardes,
    setCodesSauvegardes,
    codesCopies,
    code,
    setCode,
    erreurCode,
    erreur,
    chargement,
    commencerActivation,
    confirmerActivation,
    terminerCodesSecours,
    copierCodesSecours,
    annuler,
    commencerDesactivation,
    confirmerDesactivation,
  };
};
