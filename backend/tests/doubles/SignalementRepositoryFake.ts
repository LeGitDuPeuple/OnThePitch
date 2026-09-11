import { Signalement } from "../../src/domain/entities/Signalement";
import {
  SignalementRepositoryInterface,
  NouveauSignalement,
  SignalementDetaille,
} from "../../src/domain/interface/signalementRepositoryInterface";

export class SignalementRepositoryFake implements SignalementRepositoryInterface {
  private signalements: Signalement[] = [];

  async creer(donnees: NouveauSignalement): Promise<Signalement> {
    const signalement = new Signalement({ ...donnees, dateSignalement: new Date() });
    this.signalements.push(signalement);
    return signalement;
  }

  async listerEnAttente(): Promise<SignalementDetaille[]> {
    return this.signalements.map((signalement) => ({
      signalement,
      motifLibelle: "Motif de test",
      evenementTitre: "Événement de test",
    }));
  }

  async retirer(idEvenement: number): Promise<void> {
    this.signalements = this.signalements.filter((signalement) => signalement.idEvenement !== idEvenement);
  }
}
