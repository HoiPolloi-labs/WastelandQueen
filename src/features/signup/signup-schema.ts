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
  tier: z.number().int().min(1).max(12),
  troop_type: z.enum(['fighter', 'shooter', 'rider']),
  max_solo_lair: z.number().int().min(1).max(10),
  rally_size: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .optional()
    .transform((v) => (v == null ? null : v)),
  willing_captain: z.boolean(),
  shift_pref: z.enum(['first', 'second', 'both']),
})

export type SignupInput = z.infer<typeof signupSchema>
