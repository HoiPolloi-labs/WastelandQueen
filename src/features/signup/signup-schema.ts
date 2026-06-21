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
  /** Troops sent per single march (each rally-join consumes one). Required —
   *  capacity-fill Auto-Sort needs the real number; without it the algorithm
   *  can only fall back to rally_size, which is ~8× too large and wrecks the
   *  capacity math. Mirrors rally_size: nullable in the DB (legacy rows) but
   *  mandatory on the form. Upper bound 100M catches paste errors — current
   *  game ceilings are well under 1M. */
  march_size: z
    .number({ invalid_type_error: 'March Size ist Pflicht' })
    .int()
    .positive('March Size muss > 0 sein')
    .max(100_000_000, 'March Size unplausibel hoch — wirklich >100M?'),
  /** Secondary troop type(s) the player can also field (1–3 of the troop enum)
   *  + its highest tier. Optional — display/filter only, never feeds auto-sort.
   *  Empty selection normalizes to null so chip markers/filters see one shape. */
  secondary_troop_types: z
    .array(z.enum(['fighter', 'shooter', 'rider']))
    .max(3)
    .nullable()
    .optional()
    .transform((v) => (v == null || v.length === 0 ? null : v)),
  secondary_tier: z
    .number()
    .int()
    .min(1)
    .max(13)
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
  /** Available at WLK start to defend the home Hub if attacked. */
  defend_at_start: z.boolean().default(false),
  /** Consents to be placed on the Hit-Squad (take a foreign state's Hub). */
  willing_foreign_hub: z.boolean().default(false),
  shift_pref: z
    .string()
    .regex(/^[1-4](,[1-4]){0,3}$/, 'Mindestens eine Shift wählen'),
  agent_x_frags: z.number().int().nonnegative().default(0),
  dr_j_frags: z.number().int().nonnegative().default(0),
  nataly_frags: z.number().int().nonnegative().default(0),
})

export type SignupInput = z.infer<typeof signupSchema>
