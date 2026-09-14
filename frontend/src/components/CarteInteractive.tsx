import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, Tooltip, useMap } from "react-leaflet";
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

const ICONE_POINT_RECHERCHE = icone("#0e3b2a", 16);
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
};

// Carte OpenStreetMap (Leaflet) : point de recherche (ou lieu de l'événement),
// cercle de rayon le cas échéant, marqueurs cliquables pour les résultats.
export const CarteInteractive = ({ latitude, longitude, rayonKm, points = [], hauteur = 320 }: PropsCarteInteractive) => {
  const centre: [number, number] = [latitude, longitude];
  const zoom = zoomPourRayon(rayonKm);

  return (
    <div className="conteneur-carte" style={{ height: hauteur }}>
      <MapContainer center={centre} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <Recentreur centre={centre} zoom={zoom} />
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
              <Tooltip direction="top" offset={[0, -12]} opacity={1} className="etiquette-carte">
                {point.label}
              </Tooltip>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
