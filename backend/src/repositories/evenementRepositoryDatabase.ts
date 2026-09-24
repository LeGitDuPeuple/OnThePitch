import { prisma } from "../config/prismaClient";
import { Prisma } from "../generated/prisma/client";
import { Evenement, StatutEvenement, NiveauRequis } from "../domain/entities/Evenement";
import { ServiceIndisponible } from "../domain/erreurMetier";
import {
  EvenementRepositoryInterface,
  NouvelEvenement,
  ModificationEvenement,
  EvenementProche,
  EvenementDetail,
  FiltresEvenementsAdmin,
  EvenementAvecOrganisateur,
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
  libelle_niveau_event: string;
  nombre_inscrits: bigint;
  nom_lieu: string | null;
  adresse: string;
  ville: string;
  latitude: number;
  longitude: number;
  distance: number;
  format: string | null;
};

export class EvenementRepositoryDatabase implements EvenementRepositoryInterface {
  // Crée le lieu puis l'événement dans une même transaction :
  // un lieu sans événement resterait orphelin en cas d'échec.
  async creer(donnees: NouvelEvenement): Promise<Evenement> {
    const ligne = await prisma.$transaction(async (tx) => {
      const lieu = await tx.lieu.create({
        data: {
          nom: donnees.lieu.nom ?? null,
          adresse: donnees.lieu.adresse,
          ville: donnees.lieu.ville,
          codePostal: donnees.lieu.codePostal,
          latitude: donnees.lieu.latitude,
          longitude: donnees.lieu.longitude,
          typeTerrain: donnees.lieu.typeTerrain ?? null,
        },
      });

      const [statutOuvert, niveau] = await Promise.all([
        tx.statutEvent.findUniqueOrThrow({ where: { libelleEvent: "Ouvert" } }),
        tx.niveauEvent.findUniqueOrThrow({ where: { libelleNiveauEvent: donnees.niveauRequis } }),
      ]);

      const evenementCree = await tx.evenement.create({
        data: {
          titre: donnees.titre,
          description: donnees.description ?? null,
          format: donnees.format ?? null,
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

      await tx.requiert.create({
        data: { idEvenement: evenementCree.idEvenement, idNiveauEvent: niveau.idNiveauEvent },
      });

      return evenementCree;
    });

    return new Evenement({
      id: ligne.idEvenement,
      titre: ligne.titre,
      description: ligne.description,
      format: ligne.format,
      nombrePlaces: ligne.nombrePlaces,
      estPrive: ligne.typePrivePublique,
      dateDebut: ligne.dateDebut,
      dateFin: ligne.dateFin,
      dateDesactivation: ligne.dateDesactivation,
      idLieu: ligne.idLieu,
      idOrganisateur: ligne.idJoueur,
      statut: ligne.statut.libelleEvent as StatutEvenement,
      niveauRequis: donnees.niveauRequis,
      nombreInscrits: 0,
    });
  }

  // Récupère un événement avec le compte de ses inscriptions acceptées.
  // Une demande "en_attente" ou "refusee" n'occupe pas de place : elle ne compte pas.
  async trouverParId(id: number): Promise<Evenement | null> {
    const [ligne, nombreAcceptees] = await Promise.all([
      prisma.evenement.findUnique({
        where: { idEvenement: id },
        include: { statut: true, niveaux: { include: { niveau: true } } },
      }),
      prisma.rejoint.count({ where: { idEvenement: id, statutInscription: "acceptee" } }),
    ]);

    if (!ligne) return null;

    return new Evenement({
      id: ligne.idEvenement,
      titre: ligne.titre,
      description: ligne.description,
      format: ligne.format,
      nombrePlaces: ligne.nombrePlaces,
      estPrive: ligne.typePrivePublique,
      dateDebut: ligne.dateDebut,
      dateFin: ligne.dateFin,
      dateDesactivation: ligne.dateDesactivation,
      idLieu: ligne.idLieu,
      idOrganisateur: ligne.idJoueur,
      statut: ligne.statut.libelleEvent as StatutEvenement,
      niveauRequis: (ligne.niveaux[0]?.niveau.libelleNiveauEvent as NiveauRequis) ?? "tous_niveaux",
      nombreInscrits: nombreAcceptees,
    });
  }

  // Récupère un événement avec le détail de son lieu — pour la fiche événement
  // (carte, adresse complète). La photo n'est jamais chargée ici : seule sa
  // présence est signalée, l'image se récupère à part (voir routes/photoRoute.ts).
  async trouverAvecLieu(id: number): Promise<EvenementDetail | null> {
    const [ligne, nombreAcceptees] = await Promise.all([
      prisma.evenement.findUnique({
        where: { idEvenement: id },
        include: { statut: true, niveaux: { include: { niveau: true } }, lieu: true, organisateur: true },
      }),
      prisma.rejoint.count({ where: { idEvenement: id, statutInscription: "acceptee" } }),
    ]);

    if (!ligne) return null;

    return {
      evenement: new Evenement({
        id: ligne.idEvenement,
        titre: ligne.titre,
        description: ligne.description,
        format: ligne.format,
        nombrePlaces: ligne.nombrePlaces,
        estPrive: ligne.typePrivePublique,
        dateDebut: ligne.dateDebut,
        dateFin: ligne.dateFin,
        dateDesactivation: ligne.dateDesactivation,
        idLieu: ligne.idLieu,
        idOrganisateur: ligne.idJoueur,
        statut: ligne.statut.libelleEvent as StatutEvenement,
        niveauRequis: (ligne.niveaux[0]?.niveau.libelleNiveauEvent as NiveauRequis) ?? "tous_niveaux",
        nombreInscrits: nombreAcceptees,
      }),
      lieu: {
        nom: ligne.lieu.nom,
        adresse: ligne.lieu.adresse,
        ville: ligne.lieu.ville,
        codePostal: ligne.lieu.codePostal,
        latitude: Number(ligne.lieu.latitude),
        longitude: Number(ligne.lieu.longitude),
        typeTerrain: ligne.lieu.typeTerrain,
        aUnePhoto: ligne.lieu.photo !== null,
      },
      organisateur: {
        nom: ligne.organisateur.nom,
        prenom: ligne.organisateur.prenom,
        // Complété par EvenementService.trouverDetailParId (EvaluationRepository) —
        // ce repository ne connaît pas la table evaluation.
        fiabilite: null,
      },
    };
  }

  // Modifie les champs fournis. Le niveau requis vit dans une table à part
  // (requiert, clé composite id_evenement/id_niveau_event) : pas d'update simple,
  // on retire l'ancienne ligne et on pose la nouvelle, dans la même transaction
  // que la mise à jour de l'événement pour éviter un état incohérent.
  async modifier(id: number, donnees: ModificationEvenement): Promise<Evenement> {
    await prisma.$transaction(async (tx) => {
      await tx.evenement.update({
        where: { idEvenement: id },
        data: {
          titre: donnees.titre,
          description: donnees.description,
          format: donnees.format,
          nombrePlaces: donnees.nombrePlaces,
          dateDebut: donnees.dateDebut,
          dateFin: donnees.dateFin,
        },
      });

      if (donnees.niveauRequis) {
        const niveau = await tx.niveauEvent.findUniqueOrThrow({
          where: { libelleNiveauEvent: donnees.niveauRequis },
        });

        await tx.requiert.deleteMany({ where: { idEvenement: id } });
        await tx.requiert.create({ data: { idEvenement: id, idNiveauEvent: niveau.idNiveauEvent } });
      }
    });

    const evenement = await this.trouverParId(id);
    if (!evenement) {
      throw new ServiceIndisponible("Événement introuvable juste après sa modification");
    }

    return evenement;
  }

  // Recherche géolocalisée : seule requête SQL brute du projet.
  // Prisma ne modélise pas les types géographiques de PostGIS.
  // Les paramètres sont liés par le tagged template, jamais concaténés.
  // Public ET privé apparaissent : "privé" ne change que le mécanisme d'inscription
  // (demande à valider par l'organisateur), pas la visibilité — voir CLAUDE.md section 6.
  async rechercherParRayon(
    longitude: number,
    latitude: number,
    rayonMetres: number,
    skip: number,
    take: number
  ): Promise<EvenementProche[]> {
    const lignes = await prisma.$queryRaw<LigneRecherche[]>`
      SELECT e.id_evenement, e.titre, e.format, e.nombre_places, e.type_prive_publique,
             e.date_debut, e.date_fin, e.id_lieu, e.id_joueur,
             s.libelle_event, n.libelle_niveau_event,
             l.nom AS nom_lieu, l.adresse, l.ville,
             l.latitude::float8 AS latitude, l.longitude::float8 AS longitude,
             COUNT(r.id_joueur) AS nombre_inscrits,
             ST_Distance(
               ST_MakePoint(l.longitude::float8, l.latitude::float8)::geography,
               ST_MakePoint(${longitude}::float8, ${latitude}::float8)::geography
             ) AS distance
      FROM evenement e
      JOIN lieu l ON l.id_lieu = e.id_lieu
      JOIN statut_event s ON s.id_statut_event = e.id_statut_event
      JOIN requiert req ON req.id_evenement = e.id_evenement
      JOIN niveau_event n ON n.id_niveau_event = req.id_niveau_event
      LEFT JOIN rejoint r ON r.id_evenement = e.id_evenement AND r.statut_inscription = 'acceptee'
      WHERE ST_DWithin(
              ST_MakePoint(l.longitude::float8, l.latitude::float8)::geography,
              ST_MakePoint(${longitude}::float8, ${latitude}::float8)::geography,
              ${rayonMetres}::float8
            )
        AND e.date_debut > NOW()
        AND e.date_desactivation IS NULL
      GROUP BY e.id_evenement, s.libelle_event, n.libelle_niveau_event, l.nom, l.adresse, l.ville, l.longitude, l.latitude
      ORDER BY distance ASC
      LIMIT ${take}::int OFFSET ${skip}::int
    `;

    return lignes.map((ligne) => ({
      evenement: new Evenement({
        id: ligne.id_evenement,
        titre: ligne.titre,
        format: ligne.format,
        nombrePlaces: ligne.nombre_places,
        estPrive: ligne.type_prive_publique,
        dateDebut: ligne.date_debut,
        dateFin: ligne.date_fin,
        idLieu: ligne.id_lieu,
        idOrganisateur: ligne.id_joueur,
        statut: ligne.libelle_event as StatutEvenement,
        niveauRequis: ligne.libelle_niveau_event as NiveauRequis,
        nombreInscrits: Number(ligne.nombre_inscrits),
      }),
      distanceKm: Math.round((ligne.distance / 1000) * 10) / 10,
      nomLieu: ligne.nom_lieu,
      ville: ligne.ville,
      adresse: ligne.adresse,
      latitude: ligne.latitude,
      longitude: ligne.longitude,
    }));
  }

  // Vue d'ensemble admin : tous les événements, filtrables par statut et par
  // plage de date de début. "Annule" se traduit par dateDesactivation non
  // nulle (voir FiltresEvenementsAdmin) — les autres statuts excluent
  // implicitement les événements annulés, comme partout ailleurs.
  async listerTousAdmin(filtres: FiltresEvenementsAdmin): Promise<EvenementAvecOrganisateur[]> {
    const ou: Prisma.EvenementWhereInput = {};

    if (filtres.statut === "Annule") {
      ou.dateDesactivation = { not: null };
    } else if (filtres.statut) {
      ou.dateDesactivation = null;
      ou.statut = { libelleEvent: filtres.statut };
    }

    if (filtres.dateDebutMin || filtres.dateDebutMax) {
      ou.dateDebut = {
        ...(filtres.dateDebutMin ? { gte: filtres.dateDebutMin } : {}),
        ...(filtres.dateDebutMax ? { lte: filtres.dateDebutMax } : {}),
      };
    }

    const lignes = await prisma.evenement.findMany({
      where: ou,
      include: {
        statut: true,
        niveaux: { include: { niveau: true } },
        inscriptions: { where: { statutInscription: "acceptee" } },
        organisateur: true,
      },
      orderBy: { dateDebut: "desc" },
    });

    return lignes.map((ligne) => ({
      evenement: new Evenement({
        id: ligne.idEvenement,
        titre: ligne.titre,
        description: ligne.description,
        format: ligne.format,
        nombrePlaces: ligne.nombrePlaces,
        estPrive: ligne.typePrivePublique,
        dateDebut: ligne.dateDebut,
        dateFin: ligne.dateFin,
        dateDesactivation: ligne.dateDesactivation,
        idLieu: ligne.idLieu,
        idOrganisateur: ligne.idJoueur,
        statut: ligne.statut.libelleEvent as StatutEvenement,
        niveauRequis: (ligne.niveaux[0]?.niveau.libelleNiveauEvent as NiveauRequis) ?? "tous_niveaux",
        nombreInscrits: ligne.inscriptions.length,
      }),
      organisateur: { nom: ligne.organisateur.nom, prenom: ligne.organisateur.prenom, fiabilite: null },
    }));
  }

  // Événements organisés par ce joueur — écran Profil. Les annulés (soft delete)
  // n'y figurent pas, comme partout ailleurs dans le projet.
  async listerParOrganisateur(idOrganisateur: number): Promise<Evenement[]> {
    const lignes = await prisma.evenement.findMany({
      where: { idJoueur: idOrganisateur, dateDesactivation: null },
      include: {
        statut: true,
        niveaux: { include: { niveau: true } },
        inscriptions: { where: { statutInscription: "acceptee" } },
      },
      orderBy: { dateDebut: "desc" },
    });

    return lignes.map(
      (ligne) =>
        new Evenement({
          id: ligne.idEvenement,
          titre: ligne.titre,
          description: ligne.description,
          format: ligne.format,
          nombrePlaces: ligne.nombrePlaces,
          estPrive: ligne.typePrivePublique,
          dateDebut: ligne.dateDebut,
          dateFin: ligne.dateFin,
          dateDesactivation: ligne.dateDesactivation,
          idLieu: ligne.idLieu,
          idOrganisateur: ligne.idJoueur,
          statut: ligne.statut.libelleEvent as StatutEvenement,
          niveauRequis: (ligne.niveaux[0]?.niveau.libelleNiveauEvent as NiveauRequis) ?? "tous_niveaux",
          nombreInscrits: ligne.inscriptions.length,
        })
    );
  }

  // Compteurs pour la vue d'ensemble du tableau de bord admin — "total" compte
  // tous les événements jamais créés (même annulés depuis), "actifs" et
  // "termines" excluent les annulés (dateDesactivation non nulle).
  async compterParStatut(): Promise<{ total: number; actifs: number; termines: number }> {
    const [total, actifs, termines] = await Promise.all([
      prisma.evenement.count(),
      prisma.evenement.count({
        where: { dateDesactivation: null, statut: { libelleEvent: { in: ["Ouvert", "Complet"] } } },
      }),
      prisma.evenement.count({
        where: { dateDesactivation: null, statut: { libelleEvent: "Termine" } },
      }),
    ]);

    return { total, actifs, termines };
  }

  // Soft delete : on ne supprime jamais physiquement un événement.
  async desactiver(id: number): Promise<void> {
    await prisma.evenement.update({
      where: { idEvenement: id },
      data: { dateDesactivation: new Date() },
    });
  }

  // Bascule l'événement en "Termine" une fois les présences relevées.
  async terminer(id: number): Promise<void> {
    const statutTermine = await prisma.statutEvent.findUniqueOrThrow({
      where: { libelleEvent: "Termine" },
    });

    await prisma.evenement.update({
      where: { idEvenement: id },
      data: { idStatutEvent: statutTermine.idStatutEvent },
    });
  }

  async terminerAvantDate(dateLimite: Date): Promise<number[]> {
    const statutTermine = await prisma.statutEvent.findUniqueOrThrow({
      where: { libelleEvent: "Termine" },
    });

    const critere = {
      dateFin: { lt: dateLimite },
      dateDesactivation: null,
      idStatutEvent: { not: statutTermine.idStatutEvent },
    };

    // findMany puis updateMany plutôt qu'un seul updateMany : Prisma ne
    // renvoie pas les lignes affectées par un updateMany (juste un compte),
    // et EvenementService a besoin des identifiants pour notifier les
    // inscrits de chaque événement concerné.
    const evenementsAClore = await prisma.evenement.findMany({
      where: critere,
      select: { idEvenement: true },
    });
    const idsAClore = evenementsAClore.map((evenement) => evenement.idEvenement);

    if (idsAClore.length === 0) return [];

    await prisma.evenement.updateMany({
      where: { idEvenement: { in: idsAClore } },
      data: { idStatutEvent: statutTermine.idStatutEvent },
    });

    return idsAClore;
  }
}