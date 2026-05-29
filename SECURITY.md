# Security Policy

Wasteland Queen stores alliance roster data (in-game names, alliance tags,
troop stats) and gates every event behind per-event uuid tokens with
JWT-claim row-level security. We take token leakage and RLS-bypass issues
seriously.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Instead, use **GitHub → Security → [Report a vulnerability](https://github.com/HoiPolloi-labs/WastelandQueen/security/advisories/new)**
(private advisory). If that's unavailable, open a minimal public issue that
says only "security — please reach out" without details, and a maintainer
will set up a private channel.

Please include:

- What you found and the impact (data exposure, write access, auth bypass…).
- Steps to reproduce (a URL/role/token combination, a request, etc.).
- Whether it's already public.

We aim to acknowledge within a few days and to ship a fix promptly for
anything that exposes another user's data or grants unintended write access.

## What counts

In scope:

- Reading or writing event data without the matching role token
  (signup / planner / board).
- Escalating a signup or board JWT to planner privileges (e.g. reading
  `planner_token`).
- Bypassing the SECURITY DEFINER RPC role checks.
- Leaking Edge Function secrets (`JWT_PRIVATE_KEY`, `ANTHROPIC_API_KEY`,
  service-role key) or the Discord webhook URL.
- Stored XSS via roster/NAP/notes fields.

Out of scope:

- The per-event tokens are the security model by design — anyone holding a
  planner URL can edit that event. That's intentional ("no registration").
- Rate-limit tuning on the Vision-LLM endpoint (already 5/h per signup token).
- Findings that require a compromised Supabase project or leaked `.env.local`.

## Good to know for deployers

If you fork and deploy your own instance:

- Keep `JWT_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY`
  in Supabase **Function secrets** only — never in the client bundle or repo.
- The client only ever ships the **publishable** (anon) key, which is safe to
  expose; RLS does the gating.
- Rotate an event's tokens from the planner UI (Token Rotation) if a planner
  URL leaks.
