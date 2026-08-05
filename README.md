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

1. Copy `.env.example` to `.env` and fill in your project URL and anon key
   (Supabase dashboard → Project Settings → API).
2. Create the `rooms` table:

```sql
create table public.rooms (
  code        text primary key,
  host_token  text not null,
  phase       text not null default 'lobby',
  state       jsonb not null default '{}'::jsonb,
  seats       jsonb not null default '[]'::jsonb,
  version     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.rooms enable row level security;
create policy "anon full access" on public.rooms
  for all to anon using (true) with check (true);

alter publication supabase_realtime add table public.rooms;
alter table public.rooms replica identity full;
```

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
