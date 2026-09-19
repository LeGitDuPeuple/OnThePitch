import { prisma } from "../config/prismaClient";
import { Prisma } from "../generated/prisma/client";
import { Signalement } from "../domain/entities/Signalement";
import {
  SignalementRepositoryInterface,
  NouveauSignalement,
  SignalementDetaille,
  MotifSignalement,
} from "../domain/interface/signalementRepositoryInterface";
import { Conflit } from "../domain/erreurMetier";

type LigneSignal = {
  idJoueur: number;
  idEvenement: number;
  idMotif: number;
  dateSignalement: Date;
  texteLibre: string | null;
};

export class SignalementRepositoryDatabase implements SignalementRepositoryInterface {
  async creer(donnees: NouveauSignalement): Promise<Signalement> {
    try {
      const ligne = await prisma.signal.create({
        data: {
          idJoueur: donnees.idJoueur,
          idEvenement: donnees.idEvenement,
          idMotif: donnees.idMotif,
          texteLibre: donnees.texteLibre ?? null,
        },
      });

      return this.versEntite(ligne);
    } catch (erreur) {
      if (erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === "P2002") {
        throw new Conflit("Vous avez déjà signalé cet événement pour ce motif");
      }
      throw erreur;
    }
  }

  async listerEnAttente(): Promise<SignalementDetaille[]> {
    const lignes = await prisma.signal.findMany({
      where: { evenement: { dateDesactivation: null } },
      include: { motif: true, evenement: true },
      orderBy: { dateSignalement: "desc" },
    });

    return lignes.map((ligne) => ({
      signalement: this.versEntite(ligne),
      motifLibelle: ligne.motif.libelle,
      evenementTitre: ligne.evenement.titre,
    }));
  }

  async retirer(idEvenement: number): Promise<void> {
    await prisma.signal.deleteMany({ where: { idEvenement } });
  }

  async listerMotifs(): Promise<MotifSignalement[]> {
    const motifs = await prisma.motif.findMany({ orderBy: { idMotif: "asc" } });
    return motifs.map((motif) => ({ id: motif.idMotif, libelle: motif.libelle }));
  }

  private versEntite(ligne: LigneSignal): Signalement {
    return new Signalement({
      idJoueur: ligne.idJoueur,
      idEvenement: ligne.idEvenement,
      idMotif: ligne.idMotif,
      dateSignalement: ligne.dateSignalement,
      texteLibre: ligne.texteLibre,
    });
  }
}
