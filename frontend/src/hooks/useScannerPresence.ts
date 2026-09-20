import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { presenceService } from "../services/presenceService";
import { ErreurApi } from "../services/api";
import type { PresenceReponse } from "../types/evenement";

// Id du conteneur que html5-qrcode prend en charge lui-même (il y injecte sa
// propre vidéo) — une seule instance active à la fois, pas besoin de générer
// un id différent par montage.
const ID_CONTENEUR = "lecteur-qr-presence";

// Scan de présence par l'organisateur (cf. CLAUDE.md section 7 : le joueur
// affiche son QR, l'organisateur scanne). html5-qrcode pilote la caméra
// directement dans le DOM (voir composant ScannerPresence) ; ce hook ne gère
// que le cycle de vie (démarrage/arrêt) et l'appel au serveur à chaque QR lu —
// le composant ne raisonne pas (cf. CLAUDE.md, "Front React").
export const useScannerPresence = (idEvenement: number, onSucces: (reponse: PresenceReponse) => void) => {
  const [actif, setActif] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const enTraitementRef = useRef(false);

  const traiterJeton = useCallback(
    async (jeton: string) => {
      // Le lecteur continue d'envoyer des frames pendant l'appel réseau : sans
      // ce verrou, le même QR resté dans le champ de la caméra serait renvoyé
      // plusieurs fois avant que la première réponse revienne.
      if (enTraitementRef.current) return;
      enTraitementRef.current = true;
      setErreur(null);

      try {
        const reponse = await presenceService.scanner(idEvenement, jeton);
        onSucces(reponse);
      } catch (erreurRequete) {
        setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "QR invalide");
      } finally {
        // Laisse le temps au QR de sortir du cadre avant d'accepter le suivant.
        setTimeout(() => {
          enTraitementRef.current = false;
        }, 1500);
      }
    },
    [idEvenement, onSucces]
  );

  useEffect(() => {
    if (!actif) return;

    const lecteur = new Html5Qrcode(ID_CONTENEUR);
    let arrete = false;

    lecteur
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        (texteDecode) => void traiterJeton(texteDecode),
        () => {} // callback d'échec de décodage — appelé à chaque image sans QR dedans, rien à faire
      )
      .catch(() => {
        if (!arrete) setErreur("Impossible d'accéder à la caméra (autorisation refusée ou aucune caméra détectée)");
      });

    return () => {
      arrete = true;
      // stop() échoue si start() n'a jamais réellement démarré (caméra refusée) —
      // sans conséquence, on nettoie simplement au mieux.
      lecteur
        .stop()
        .then(() => lecteur.clear())
        .catch(() => {});
    };
  }, [actif, traiterJeton]);

  const demarrer = useCallback(() => {
    setErreur(null);
    setActif(true);
  }, []);

  const arreter = useCallback(() => setActif(false), []);

  return { actif, erreur, demarrer, arreter, idConteneur: ID_CONTENEUR };
};
