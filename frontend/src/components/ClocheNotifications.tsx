import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";
import { LIBELLES_NOTIFICATION } from "../types/notification";
import "../styles/notifications.css";

const formaterDate = (date: string) =>
  new Date(date).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

// Cloche de l'en-tête (voir CLAUDE.md, "Évolutions envisagées" — notifications) :
// pas de push mobile puisque ce n'est pas une app native, l'email générique
// prend le relais en parallèle (voir NotificationService côté back).
export const ClocheNotifications = () => {
  const { notifications, nombreNonLues, marquerLue } = useNotifications();
  const [ouvert, setOuvert] = useState(false);
  const navigate = useNavigate();
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;

    const fermerSiExterieur = (evenement: MouseEvent) => {
      if (conteneurRef.current && !conteneurRef.current.contains(evenement.target as Node)) {
        setOuvert(false);
      }
    };

    document.addEventListener("mousedown", fermerSiExterieur);
    return () => document.removeEventListener("mousedown", fermerSiExterieur);
  }, [ouvert]);

  const surClicNotification = async (id: number, idEvenement: number, lu: boolean) => {
    if (!lu) await marquerLue(id);
    setOuvert(false);
    navigate(`/evenements/${idEvenement}`);
  };

  return (
    <div className="cloche-notifications" ref={conteneurRef}>
      <button
        type="button"
        className="cloche-notifications-bouton"
        onClick={() => setOuvert((precedent) => !precedent)}
        aria-label="Notifications"
        aria-expanded={ouvert}
      >
        🔔
        {nombreNonLues > 0 && <span className="cloche-notifications-badge">{nombreNonLues}</span>}
      </button>

      {ouvert && (
        <div className="cloche-notifications-menu">
          {notifications.length === 0 ? (
            <p className="texte-attenue">Aucune notification.</p>
          ) : (
            <ul>
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    className={notification.lu ? "cloche-notifications-item lue" : "cloche-notifications-item"}
                    onClick={() => void surClicNotification(notification.id, notification.idEvenement, notification.lu)}
                  >
                    <span>{LIBELLES_NOTIFICATION[notification.type](notification.evenementTitre)}</span>
                    <span className="texte-attenue">{formaterDate(notification.dateCreation)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
