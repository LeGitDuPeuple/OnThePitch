import { z } from "zod";

// Validation du corps de POST /evenements/:id/presences/scan
export const scanPresenceSchema = z.object({
  jeton: z.string().min(1),
});

// Validation du corps de POST /evenements/:id/presences/manuel
export const marquagePresenceManuelSchema = z.object({
  idJoueur: z.number().int().positive(),
});

export type ScanPresence = z.infer<typeof scanPresenceSchema>;
export type MarquagePresenceManuel = z.infer<typeof marquagePresenceManuelSchema>;
