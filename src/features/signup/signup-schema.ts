import { z } from 'zod'

export const signupSchema = z.object({
  ign: z
    .string()
    .trim()
    .min(1, 'IGN ist Pflicht')
    .max(32, 'Maximal 32 Zeichen'),
  alliance_tag: z
    .string()
    .trim()
    .min(1, 'Alliance Tag ist Pflicht')
    .max(4, 'Maximal 4 Zeichen')
    .transform((s) => s.toUpperCase()),
  server: z
    .string()
    .trim()
    .regex(/^S\d+$/i, 'Format: S724')
    .transform((s) => s.toUpperCase()),
  tier: z.number().int().min(1).max(13),
  troop_type: z.enum(['fighter', 'shooter', 'rider']),
  max_solo_lair: z.number().int().min(1).max(200),
  rally_size: z
    .number({ invalid_type_error: 'Rally Size ist Pflicht' })
    .int()
    .positive('Rally Size muss > 0 sein'),
  /** Troops sent per march (each rally-join consumes one). Optional but
   *  recommended — capacity-fill Auto-Sort uses it; absence falls back to
   *  rally_size (overestimate, fewer defenders fit). 0 is allowed (player
   *  who only attends defense, never marches). Upper bound 100M is a sanity
   *  cap to catch paste errors — current game ceilings are well under 1M. */
  march_size: z
    .number()
    .int()
    .nonnegative('March Size darf nicht negativ sein')
    .max(100_000_000, 'March Size unplausibel hoch — wirklich >100M?')
    .nullable()
    .optional()
    .transform((v) => (v == null ? null : v)),
  true_might: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .optional()
    .transform((v) => (v == null ? null : v)),
  willing_captain: z.boolean(),
  shift_pref: z
    .string()
    .regex(/^[1-4](,[1-4]){0,3}$/, 'Mindestens eine Shift wählen'),
  agent_x_frags: z.number().int().nonnegative().default(0),
  dr_j_frags: z.number().int().nonnegative().default(0),
  nataly_frags: z.number().int().nonnegative().default(0),
})

export type SignupInput = z.infer<typeof signupSchema>
