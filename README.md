# Party Multiplayer Games

Eight party games for a group. React 19 + Vite, no build step beyond `vite`.

Most games are pass-and-play on one device. **Avalon** additionally supports
online play, where each person joins a room from their own phone.

## Running locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev -- --host  # also reachable from phones on the same wifi
```

## Online play (Avalon)

Online mode needs a Supabase project. Without one the site still works —
"Play online" is disabled and pass-and-play is unaffected.

Copy `.env.example` to `.env` and fill in your project URL and anon key
(Supabase dashboard → Project Settings → API), then apply
`supabase/schema.sql`.

### How secrets are kept

Avalon is a hidden-role game, so "the client can see the state" is not an
acceptable answer. Three things must never reach another player's browser:
who holds which role, who played Fail on a quest, and how someone voted
before everyone has committed.

None of them live in the shared room row:

- `room_members`, `room_secrets` and `room_submissions` have RLS enabled and
  **no policies at all**, so the anon key cannot read or write them.
- Everything goes through `security definer` functions that check the
  caller's per-device token first. `my_role()` returns your role and nobody
  else's; `reveal_roles()` refuses until the game is over.
- Roles are dealt **server-side** by `deal_avalon()`. If a client dealt them,
  the host would know the whole table.
- Player tokens are never published. Earlier they sat in `rooms.seats`,
  which meant anyone could read another player's token and ask the server
  for their role — the public row now carries display names only.
- `submit_action()` writes votes and quest cards to a table nobody can read,
  and resolves the round in the same call that completes it. Only counts are
  public while a round is open, and quest results report *how many* failed,
  never *who*.
- The server rejects a good player trying to play Fail, a non-host trying to
  deal, and a non-Assassin trying to assassinate.

### Deploying

**`VITE_*` variables are baked in at build time, not read at runtime.** The
`.env` file is gitignored, so setting it locally does nothing for a deploy —
the host needs its own copy, and the site must be rebuilt after adding them.

On Vercel: Project → Settings → Environment Variables → add
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for all environments, then
redeploy. If online mode shows as unavailable in production, this is why.

The anon key is meant to be public and ships in the client bundle. Access is
governed by the RLS policy above, not by hiding the key.

### How the sync works

Whole game state lives in one `jsonb` column and is driven by the same pure
reducer as pass-and-play (`src/games/Avalon/state.js`). Clients subscribe to
`postgres_changes`; a 5s poll runs alongside because a cold realtime socket
can miss its first event. Writes take an optimistic lock on `version` with
randomised backoff, so ten phones voting at once don't lose each other's
writes.

**Roles are readable in devtools.** The full state row is visible to any
client. Fine among friends; not cheat-proof.

## Scripts

| | |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build to `dist/` |
| `npm run preview` | serve the built output |
| `npm run lint` | oxlint |
