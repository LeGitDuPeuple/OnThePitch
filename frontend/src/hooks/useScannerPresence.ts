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
  const lecteurRef = useRef<Html5Qrcode | null>(null);

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

  // Arrête la caméra et laisse html5-qrcode retirer lui-même la vidéo qu'il a
  // injectée dans #lecteur-qr-presence. Doit impérativement se terminer AVANT
  // que React ne démonte ce conteneur (voir arreter ci-dessous) : sinon les
  // deux se disputent le même nœud DOM et React plante en pleine
  // réconciliation (écran blanc — bug remonté par le porteur de projet le
  // 20/09/2026). idempotent : lecteurRef passe à null dès le premier appel,
  // un second appel (ex. depuis le cleanup de l'effet juste après) ne fait rien.
  const detruire = useCallback(async () => {
    const lecteur = lecteurRef.current;
    lecteurRef.current = null;
    if (!lecteur) return;
    try {
      await lecteur.stop();
      await lecteur.clear();
    } catch {
      // Déjà arrêté, ou jamais vraiment démarré (caméra refusée) — rien à faire.
    }
  }, []);

  useEffect(() => {
    if (!actif) return;

    const lecteur = new Html5Qrcode(ID_CONTENEUR);
    lecteurRef.current = lecteur;

    lecteur
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        (texteDecode) => void traiterJeton(texteDecode),
        () => {} // callback d'échec de décodage — appelé à chaque image sans QR dedans, rien à faire
      )
      .catch(() => setErreur("Impossible d'accéder à la caméra (autorisation refusée ou aucune caméra détectée)"));

    // Filet de sécurité si le composant disparaît pendant que le scan tourne
    // (navigation hors de la page...) — le chemin normal passe par arreter(),
    // qui a déjà tout nettoyé avant que ce cleanup s'exécute.
    return () => {
      void detruire();
    };
  }, [actif, traiterJeton, detruire]);

  const demarrer = useCallback(() => {
    setErreur(null);
    setActif(true);
  }, []);

  const arreter = useCallback(async () => {
    await detruire();
    setActif(false);
  }, [detruire]);

  return { actif, erreur, demarrer, arreter, idConteneur: ID_CONTENEUR };
};
