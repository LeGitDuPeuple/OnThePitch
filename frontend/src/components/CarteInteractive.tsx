import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, Tooltip, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/carteInteractive.css";

// Marqueur en rond de couleur (pas d'image d'icône à charger — react-leaflet
// référence par défaut des PNG dont le chemin casse avec le bundler Vite).
const icone = (couleur: string, taille: number) =>
  L.divIcon({
    className: "marqueur-carte",
    html: `<span style="width:${taille}px;height:${taille}px;background:${couleur}"></span>`,
    iconSize: [taille, taille],
    iconAnchor: [taille / 2, taille / 2],
  });

// Bleu plutôt qu'une couleur de la palette de marque : convention universelle
// (Google Maps, Apple Plans...) pour "position actuelle", plus reconnaissable
// qu'un vert foncé proche du noir (signalé le 15/09/2026 par le porteur de
// projet — confondu avec un simple point neutre).
const ICONE_POINT_RECHERCHE = icone("#2563eb", 16);
const ICONE_EVENEMENT = icone("#1c7a44", 24);

// Rayon en km -> niveau de zoom approximatif, pour que le cercle de recherche
// tienne à peu près dans la vue initiale.
const zoomPourRayon = (rayonKm?: number): number => {
  if (!rayonKm) return 14;
  if (rayonKm <= 5) return 13;
  if (rayonKm <= 10) return 12;
  if (rayonKm <= 20) return 11;
  if (rayonKm <= 50) return 10;
  return 9;
};

// MapContainer ne fixe le centre qu'au premier rendu : ce composant enfant
// recentre la vue quand `centre` ou `zoom` changent ensuite (nouvelle adresse,
// nouveau rayon).
const Recentreur = ({ centre, zoom }: { centre: [number, number]; zoom: number }) => {
  const carte = useMap();
  useEffect(() => {
    carte.setView(centre, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centre[0], centre[1], zoom]);
  return null;
};

export type PointCarte = {
  id: string | number;
  latitude: number;
  longitude: number;
  label?: string;
  onClick?: () => void;
};

type PropsCarteInteractive = {
  latitude: number;
  longitude: number;
  rayonKm?: number;
  points?: PointCarte[];
  hauteur?: number | string;
  // Légende "Point de recherche / Événement à venir" (cf. maquette 2.2.a) —
  // seulement pertinente en contexte de recherche, pas sur la fiche événement
  // (un seul point, pas d'ambiguïté à lever).
  afficherLegende?: boolean;
};

// Carte OpenStreetMap (Leaflet) : point de recherche (ou lieu de l'événement),
// cercle de rayon le cas échéant, marqueurs cliquables pour les résultats.
export const CarteInteractive = ({
  latitude,
  longitude,
  rayonKm,
  points = [],
  hauteur = 320,
  afficherLegende = false,
}: PropsCarteInteractive) => {
  const centre: [number, number] = [latitude, longitude];
  const zoom = zoomPourRayon(rayonKm);

  return (
    <div className="conteneur-carte" style={{ height: hauteur }}>
      <MapContainer center={centre} zoom={zoom} zoomControl={false} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <Recentreur centre={centre} zoom={zoom} />
        <ZoomControl position="topright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {rayonKm && <Circle center={centre} radius={rayonKm * 1000} pathOptions={{ color: "#1c7a44", weight: 1, fillOpacity: 0.08 }} />}
        <Marker position={centre} icon={ICONE_POINT_RECHERCHE} />
        {points.map((point) => (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude]}
            icon={ICONE_EVENEMENT}
            eventHandlers={point.onClick ? { click: point.onClick } : undefined}
          >
            {point.label && (
              <Tooltip permanent direction="top" offset={[0, -13]} opacity={1} className="etiquette-carte">
                {point.label}
              </Tooltip>
            )}
          </Marker>
        ))}
      </MapContainer>

      {afficherLegende && rayonKm && (
        <div className="legende-carte">
          <strong>Rayon de {rayonKm} km</strong>
          <span>
            <i className="puce-legende puce-legende--recherche" /> Point de recherche
          </span>
          <span>
            <i className="puce-legende puce-legende--evenement" /> Événement à venir
          </span>
        </div>
      )}
    </div>
  );
};
