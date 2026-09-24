import { useCallback, useEffect, useState } from "react";
import { notificationService } from "../services/notificationService";
import { useAppSelector } from "../store/hooks";
import type { Notification } from "../types/notification";

// Pas de websocket ici (voir CLAUDE.md, "Évolutions envisagées" — hors
// périmètre) : un simple rafraîchissement périodique suffit pour une cloche.
const INTERVALLE_RAFRAICHISSEMENT_MS = 30_000;

// État et actions de la cloche de notifications. Le composant n'affiche que
// ce que ce hook expose (voir CLAUDE.md, "le composant affiche, il ne
// raisonne pas").
export const useNotifications = () => {
  const utilisateur = useAppSelector((state) => state.auth.utilisateur);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const rafraichir = useCallback(async () => {
    if (!utilisateur) {
      setNotifications([]);
      return;
    }
    try {
      setNotifications(await notificationService.lister());
    } catch {
      // Silencieux : un échec de rafraîchissement de la cloche ne doit jamais
      // bloquer ou polluer le reste de l'écran.
    }
  }, [utilisateur]);

  useEffect(() => {
    void rafraichir();
    if (!utilisateur) return;

    const intervalle = setInterval(() => void rafraichir(), INTERVALLE_RAFRAICHISSEMENT_MS);
    return () => clearInterval(intervalle);
  }, [utilisateur, rafraichir]);

  // Optimiste : la cloche ne doit pas attendre la réponse serveur pour
  // retirer visuellement le compteur au clic.
  const marquerLue = useCallback(
    async (id: number) => {
      setNotifications((precedentes) => precedentes.map((n) => (n.id === id ? { ...n, lu: true } : n)));
      try {
        await notificationService.marquerLue(id);
      } catch {
        void rafraichir();
      }
    },
    [rafraichir]
  );

  const nombreNonLues = notifications.filter((n) => !n.lu).length;

  return { notifications, nombreNonLues, marquerLue };
};
