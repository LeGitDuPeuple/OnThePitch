import { prisma } from "../config/prismaClient";
import { Evenement, StatutEvenement } from "../domain/entities/Evenement";
import {
  EvenementRepositoryInterface,
  NouvelEvenement,
  EvenementProche,
} from "../domain/interface/evenementRepositoryInterface";

// Forme brute d'une ligne renvoyée par la requête PostGIS.
type LigneRecherche = {
  id_evenement: number;
  titre: string;
  nombre_places: number;
  type_prive_publique: boolean;
  date_debut: Date;
  date_fin: Date;
  id_lieu: number;
  id_joueur: number;
  libelle_event: string;
  nombre_inscrits: bigint;
  adresse: string;
  ville: string;
  distance: number;
};

export class EvenementRepositoryDatabase implements EvenementRepositoryInterface {
  // Crée le lieu puis l'événement dans une même transaction :
  // un lieu sans événement resterait orphelin en cas d'échec.
  async creer(donnees: NouvelEvenement): Promise<Evenement> {
    const ligne = await prisma.$transaction(async (tx) => {
      const lieu = await tx.lieu.create({
        data: {
          adresse: donnees.lieu.adresse,
          ville: donnees.lieu.ville,
          codePostal: donnees.lieu.codePostal,
          latitude: donnees.lieu.latitude,
          longitude: donnees.lieu.longitude,
          typeTerrain: donnees.lieu.typeTerrain ?? null,
        },
      });

      const statutOuvert = await tx.statutEvent.findUniqueOrThrow({
        where: { libelleEvent: "Ouvert" },
      });

      return tx.evenement.create({
        data: {
          titre: donnees.titre,
          nombrePlaces: donnees.nombrePlaces,
          typePrivePublique: donnees.estPrive,
          dateDebut: donnees.dateDebut,
          dateFin: donnees.dateFin,
          idLieu: lieu.idLieu,
          idStatutEvent: statutOuvert.idStatutEvent,
          idJoueur: donnees.idOrganisateur,
        },
        include: { statut: true },
      });
    });

    return new Evenement({
      id: ligne.idEvenement,
      titre: ligne.titre,
      nombrePlaces: ligne.nombrePlaces,
      estPrive: ligne.typePrivePublique,
      dateDebut: ligne.dateDebut,
      dateFin: ligne.dateFin,
      dateDesactivation: ligne.dateDesactivation,
      idLieu: ligne.idLieu,
      idOrganisateur: ligne.idJoueur,
      statut: ligne.statut.libelleEvent as StatutEvenement,
      nombreInscrits: 0,
    });
  }

  // Récupère un événement avec le compte de ses inscriptions acceptées.
  // Une demande "en_attente" ou "refusee" n'occupe pas de place : elle ne compte pas.
  async trouverParId(id: number): Promise<Evenement | null> {
    const [ligne, nombreAcceptees] = await Promise.all([
      prisma.evenement.findUnique({ where: { idEvenement: id }, include: { statut: true } }),
      prisma.rejoint.count({ where: { idEvenement: id, statutInscription: "acceptee" } }),
    ]);

    if (!ligne) return null;

    return new Evenement({
      id: ligne.idEvenement,
      titre: ligne.titre,
      nombrePlaces: ligne.nombrePlaces,
      estPrive: ligne.typePrivePublique,
      dateDebut: ligne.dateDebut,
      dateFin: ligne.dateFin,
      dateDesactivation: ligne.dateDesactivation,
      idLieu: ligne.idLieu,
      idOrganisateur: ligne.idJoueur,
      statut: ligne.statut.libelleEvent as StatutEvenement,
      nombreInscrits: nombreAcceptees,
    });
  }

  // Recherche géolocalisée : seule requête SQL brute du projet.
  // Prisma ne modélise pas les types géographiques de PostGIS.
  // Les paramètres sont liés par le tagged template, jamais concaténés.
  async rechercherParRayon(
    longitude: number,
    latitude: number,
    rayonMetres: number
  ): Promise<EvenementProche[]> {
    const lignes = await prisma.$queryRaw<LigneRecherche[]>`
      SELECT e.id_evenement, e.titre, e.nombre_places, e.type_prive_publique,
             e.date_debut, e.date_fin, e.id_lieu, e.id_joueur,
             s.libelle_event,
             l.adresse, l.ville,
             COUNT(r.id_joueur) AS nombre_inscrits,
             ST_Distance(
               ST_MakePoint(l.longitude::float8, l.latitude::float8)::geography,
               ST_MakePoint(${longitude}::float8, ${latitude}::float8)::geography
             ) AS distance
      FROM evenement e
      JOIN lieu l ON l.id_lieu = e.id_lieu
      JOIN statut_event s ON s.id_statut_event = e.id_statut_event
      LEFT JOIN rejoint r ON r.id_evenement = e.id_evenement AND r.statut_inscription = 'acceptee'
      WHERE ST_DWithin(
              ST_MakePoint(l.longitude::float8, l.latitude::float8)::geography,
              ST_MakePoint(${longitude}::float8, ${latitude}::float8)::geography,
              ${rayonMetres}::float8
            )
        AND e.type_prive_publique = false
        AND e.date_debut > NOW()
        AND e.date_desactivation IS NULL
      GROUP BY e.id_evenement, s.libelle_event, l.adresse, l.ville, l.longitude, l.latitude
      ORDER BY distance ASC
    `;

    return lignes.map((ligne) => ({
      evenement: new Evenement({
        id: ligne.id_evenement,
        titre: ligne.titre,
        nombrePlaces: ligne.nombre_places,
        estPrive: ligne.type_prive_publique,
        dateDebut: ligne.date_debut,
        dateFin: ligne.date_fin,
        idLieu: ligne.id_lieu,
        idOrganisateur: ligne.id_joueur,
        statut: ligne.libelle_event as StatutEvenement,
        nombreInscrits: Number(ligne.nombre_inscrits),
      }),
      distanceKm: Math.round((ligne.distance / 1000) * 10) / 10,
      ville: ligne.ville,
      adresse: ligne.adresse,
    }));
  }

  // Soft delete : on ne supprime jamais physiquement un événement.
  async desactiver(id: number): Promise<void> {
    await prisma.evenement.update({
      where: { idEvenement: id },
      data: { dateDesactivation: new Date() },
    });
  }
}