create table if not exists public.rooms (
  code        text primary key,
  host_token  text not null,
  phase       text not null default 'lobby',
  state       jsonb not null default '{}'::jsonb,
  seats       jsonb not null default '[]'::jsonb,
  version     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists rooms_created_at_idx on public.rooms (created_at);

alter table public.rooms enable row level security;

drop policy if exists "anon full access" on public.rooms;
create policy "anon full access" on public.rooms
  for all to anon
  using (true) with check (true);

-- keep updated_at fresh so clients can detect staleness
create or replace function public.rooms_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists rooms_touch on public.rooms;
create trigger rooms_touch before update on public.rooms
  for each row execute function public.rooms_touch_updated_at();

-- realtime: clients subscribe to postgres_changes on this table
alter publication supabase_realtime add table public.rooms;

-- full row payloads on UPDATE so subscribers get the new state directly
alter table public.rooms replica identity full;
-- ═══════════════════════════════════════════════════════════
-- Secrets never enter the shared room row.
--
-- Both tables below have RLS enabled and NO policies, so the anon key
-- cannot read or write them at all. The only way in is through the
-- SECURITY DEFINER functions further down, each of which checks the
-- caller's per-device token before telling them anything.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.room_secrets (
  code    text not null,
  seat    integer not null,
  token   text not null,
  role    text not null,
  team    text not null,
  knows   jsonb not null default '{}'::jsonb,
  primary key (code, seat)
);
alter table public.room_secrets enable row level security;

-- Pending votes and quest cards. Hidden until the round resolves, so
-- nobody can peek at how others voted before committing.
create table if not exists public.room_submissions (
  code      text not null,
  round_key text not null,
  seat      integer not null,
  kind      text not null,
  value     text not null,
  primary key (code, round_key, seat, kind)
);
alter table public.room_submissions enable row level security;

create index if not exists room_secrets_code_idx on public.room_secrets (code);
create index if not exists room_submissions_code_idx on public.room_submissions (code);

-- ── Role dealing ───────────────────────────────────────────
-- Runs server-side precisely so the host cannot see the deal. A client
-- doing this would know everyone's role.
create or replace function public.deal_avalon(p_code text, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_room     public.rooms%rowtype;
  v_seats    jsonb;
  v_n        integer;
  v_counts   integer[];
  v_roles    text[] := '{}';
  v_good     text[] := '{}';
  v_evil     text[] := '{}';
  v_opts     jsonb;
  v_players  jsonb := '[]'::jsonb;
  v_seat     jsonb;
  i          integer;
  v_role     text;
  v_team     text;
  v_knows    jsonb;
begin
  select * into v_room from public.rooms where code = p_code for update;
  if not found then raise exception 'Room not found'; end if;
  if v_room.host_token is distinct from p_token then
    raise exception 'Only the host can start the game';
  end if;

  v_seats := v_room.seats;
  v_n := jsonb_array_length(v_seats);
  if v_n < 5 or v_n > 10 then raise exception 'Avalon needs 5-10 players'; end if;

  v_counts := case v_n
    when 5 then array[3,2] when 6 then array[4,2] when 7 then array[4,3]
    when 8 then array[5,3] when 9 then array[6,3] else array[6,4] end;

  v_opts := coalesce(v_room.state -> 'roles', '{}'::jsonb);

  -- Merlin and the Assassin are always in. Percival implies Morgana:
  -- Percival's ambiguity is meaningless without someone to imitate Merlin.
  v_good := array['merlin'];
  v_evil := array['assassin'];
  if coalesce((v_opts->>'percival')::boolean, false) then
    v_good := v_good || 'percival'::text; v_evil := v_evil || 'morgana'::text;
  end if;
  if coalesce((v_opts->>'mordred')::boolean, false) then v_evil := v_evil || 'mordred'::text; end if;
  if coalesce((v_opts->>'oberon')::boolean, false)  then v_evil := v_evil || 'oberon'::text;  end if;

  if array_length(v_evil,1) > v_counts[2] then
    raise exception 'Too many special evil roles for % players', v_n;
  end if;

  while array_length(v_good,1) < v_counts[1] loop v_good := v_good || 'loyal'::text; end loop;
  while array_length(v_evil,1) < v_counts[2] loop v_evil := v_evil || 'minion'::text; end loop;

  -- Shuffle with a cryptographically-seeded order.
  select array_agg(r order by random()) into v_roles
  from unnest(v_good || v_evil) as r;

  delete from public.room_secrets   where code = p_code;
  delete from public.room_submissions where code = p_code;

  for i in 0 .. v_n - 1 loop
    v_seat := v_seats -> i;
    v_role := v_roles[i + 1];
    v_team := case when v_role in ('merlin','percival','loyal') then 'good' else 'evil' end;
    v_players := v_players || jsonb_build_array(
      jsonb_build_object('id', i, 'name', v_seat ->> 'name'));
    insert into public.room_secrets(code, seat, token, role, team)
    values (p_code, i, v_seat ->> 'token', v_role, v_team);
  end loop;

  -- Private knowledge, derived after every role is placed.
  for i in 0 .. v_n - 1 loop
    select role, team into v_role, v_team from public.room_secrets where code = p_code and seat = i;
    if v_role = 'merlin' then
      -- Mordred is hidden from Merlin.
      select jsonb_build_object('text','These players are evil:','seats',
             coalesce(jsonb_agg(s.seat order by s.seat),'[]'::jsonb))
        into v_knows from public.room_secrets s
        where s.code = p_code and s.team='evil' and s.role <> 'mordred' and s.seat <> i;
    elsif v_role = 'percival' then
      select jsonb_build_object('text','One of these is Merlin, the other is Morgana:','seats',
             coalesce(jsonb_agg(s.seat order by random()),'[]'::jsonb))
        into v_knows from public.room_secrets s
        where s.code = p_code and s.role in ('merlin','morgana');
    elsif v_team = 'evil' and v_role <> 'oberon' then
      -- Oberon is invisible to the other evils, and they to Oberon.
      select jsonb_build_object('text','These players are also evil:','seats',
             coalesce(jsonb_agg(s.seat order by s.seat),'[]'::jsonb))
        into v_knows from public.room_secrets s
        where s.code = p_code and s.team='evil' and s.role <> 'oberon' and s.seat <> i;
    else
      v_knows := jsonb_build_object('text','You have no special knowledge.','seats','[]'::jsonb);
    end if;
    update public.room_secrets set knows = v_knows where code = p_code and seat = i;
  end loop;

  -- Public state carries names only. No roles, no teams.
  update public.rooms
     set state = jsonb_set(
                   jsonb_set(v_room.state, '{players}', v_players),
                   '{phase}', '"reveal"'),
         phase = 'reveal',
         version = version + 1
   where code = p_code;

  return jsonb_build_object('ok', true, 'players', v_players);
end $$;

-- ── A player learns only their own role ────────────────────
create or replace function public.my_role(p_code text, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  select jsonb_build_object('seat',seat,'role',role,'team',team,'knows',knows)
    into v from public.room_secrets where code = p_code and token = p_token;
  if v is null then return null; end if;
  return v;
end $$;

-- ── Private submissions ────────────────────────────────────
-- The value is written to a table the anon key cannot read. Only the
-- aggregate ("4 of 5 voted") is public until the round resolves.
create or replace function public.submit_action(
  p_code text, p_token text, p_round text, p_kind text, p_value text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_seat integer; v_team text; v_total integer; v_done integer;
  v_room public.rooms%rowtype;
begin
  select seat, team into v_seat, v_team from public.room_secrets
   where code = p_code and token = p_token;
  if v_seat is null then raise exception 'You are not in this game'; end if;

  select * into v_room from public.rooms where code = p_code;

  if p_kind = 'quest' then
    -- Server-side enforcement: only evil may fail a quest. A tampered
    -- client cannot sneak a fail through.
    if p_value = 'fail' and v_team <> 'evil' then
      raise exception 'Good players must play Success';
    end if;
    if not (v_room.state -> 'quests' -> ((v_room.state->>'questIndex')::int) -> 'team'
            @> to_jsonb(v_seat)) then
      raise exception 'You are not on this quest';
    end if;
    select jsonb_array_length(v_room.state -> 'quests' -> ((v_room.state->>'questIndex')::int) -> 'team')
      into v_total;
  else
    select jsonb_array_length(v_room.state -> 'players') into v_total;
  end if;

  insert into public.room_submissions(code, round_key, seat, kind, value)
  values (p_code, p_round, v_seat, p_kind, p_value)
  on conflict (code, round_key, seat, kind) do nothing;

  select count(*) into v_done from public.room_submissions
   where code = p_code and round_key = p_round and kind = p_kind;

  return jsonb_build_object('done', v_done, 'total', v_total, 'complete', v_done >= v_total);
end $$;

-- Reveals the round's submissions only once every player has committed.
create or replace function public.resolve_round(p_code text, p_round text, p_kind text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_total integer; v_done integer; v_room public.rooms%rowtype; v_vals jsonb;
begin
  select * into v_room from public.rooms where code = p_code;
  if p_kind = 'quest' then
    select jsonb_array_length(v_room.state -> 'quests' -> ((v_room.state->>'questIndex')::int) -> 'team') into v_total;
  else
    select jsonb_array_length(v_room.state -> 'players') into v_total;
  end if;

  select count(*) into v_done from public.room_submissions
   where code = p_code and round_key = p_round and kind = p_kind;
  if v_done < v_total then
    return jsonb_build_object('complete', false, 'done', v_done, 'total', v_total);
  end if;

  -- Quest cards are returned unattributed: how many failed, never who.
  if p_kind = 'quest' then
    select jsonb_build_object('fails', count(*) filter (where value = 'fail'))
      into v_vals from public.room_submissions
     where code = p_code and round_key = p_round and kind = p_kind;
  else
    select jsonb_object_agg(seat::text, value) into v_vals
      from public.room_submissions
     where code = p_code and round_key = p_round and kind = p_kind;
  end if;

  return jsonb_build_object('complete', true, 'values', v_vals, 'done', v_done, 'total', v_total);
end $$;

-- ── Assassination ──────────────────────────────────────────
create or replace function public.assassin_guess(p_code text, p_token text, p_target integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_role text; v_merlin integer; v_correct boolean; v_name text; v_room public.rooms%rowtype;
begin
  select role into v_role from public.room_secrets where code = p_code and token = p_token;
  if v_role is distinct from 'assassin' then raise exception 'Only the Assassin may guess'; end if;

  select seat into v_merlin from public.room_secrets where code = p_code and role = 'merlin';
  v_correct := (v_merlin = p_target);

  select * into v_room from public.rooms where code = p_code;
  select v_room.state -> 'players' -> p_target ->> 'name' into v_name;

  update public.rooms set
    state = v_room.state
            || jsonb_build_object(
                 'phase','end',
                 'assassinGuess', p_target,
                 'winner', case when v_correct then 'evil' else 'good' end,
                 'merlinKilled', v_correct,
                 'reason', case when v_correct
                   then v_name || ' was Merlin — the Assassin guessed right, so evil wins.'
                   else v_name || ' was not Merlin, so good wins.' end),
    phase = 'end',
    version = version + 1
  where code = p_code;

  return jsonb_build_object('correct', v_correct);
end $$;

-- ── Endgame reveal ─────────────────────────────────────────
-- Every role, but only once the game is actually over.
create or replace function public.reveal_roles(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_phase text; v jsonb;
begin
  select phase into v_phase from public.rooms where code = p_code;
  if v_phase is distinct from 'end' then
    raise exception 'Roles are revealed when the game ends';
  end if;
  select jsonb_agg(jsonb_build_object('seat',seat,'role',role,'team',team) order by seat)
    into v from public.room_secrets where code = p_code;
  return coalesce(v, '[]'::jsonb);
end $$;

-- Secrets die with the room.
create or replace function public.cascade_room_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.room_secrets     where code = old.code;
  delete from public.room_submissions where code = old.code;
  return old;
end $$;
drop trigger if exists rooms_cascade on public.rooms;
create trigger rooms_cascade after delete on public.rooms
  for each row execute function public.cascade_room_delete();

grant execute on function public.deal_avalon(text,text)                      to anon;
grant execute on function public.my_role(text,text)                          to anon;
grant execute on function public.submit_action(text,text,text,text,text)     to anon;
grant execute on function public.resolve_round(text,text,text)               to anon;
grant execute on function public.assassin_guess(text,text,integer)           to anon;
grant execute on function public.reveal_roles(text)                          to anon;
-- ═══════════════════════════════════════════════════════════
-- Tokens are credentials, so they must never appear in the public row.
-- Membership moves to a private table; rooms.seats keeps display names
-- only, and host identity is proven through an RPC rather than by
-- reading a column anyone can select.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.room_members (
  code    text not null,
  seat    integer not null,
  token   text not null,
  name    text not null,
  is_host boolean not null default false,
  primary key (code, seat)
);
alter table public.room_members enable row level security;   -- no policies: anon cannot touch it
create unique index if not exists room_members_token_idx on public.room_members (code, token);

-- ── Create ─────────────────────────────────────────────────
create or replace function public.create_room(p_token text, p_name text, p_state jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_code text;
  i integer;
begin
  delete from public.rooms where created_at < now() - interval '12 hours';

  for i in 1 .. 8 loop
    v_code := '';
    for i in 1 .. 4 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where code = v_code);
    v_code := null;
  end loop;
  if v_code is null then raise exception 'Could not allocate a room code'; end if;

  insert into public.rooms(code, host_token, phase, state, seats, version)
  values (v_code, 'private', 'lobby', p_state,
          jsonb_build_array(jsonb_build_object('seat', 0, 'name', p_name)), 0);

  insert into public.room_members(code, seat, token, name, is_host)
  values (v_code, 0, p_token, p_name, true);

  return jsonb_build_object('code', v_code, 'seat', 0, 'isHost', true);
end $$;

-- ── Join ───────────────────────────────────────────────────
create or replace function public.join_room(p_code text, p_token text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room public.rooms%rowtype; v_seat integer; v_n integer;
begin
  select * into v_room from public.rooms where code = p_code for update;
  if not found then raise exception 'Room not found'; end if;

  -- Reconnecting: same device, same seat.
  select seat into v_seat from public.room_members where code = p_code and token = p_token;
  if v_seat is not null then
    update public.room_members set name = p_name where code = p_code and token = p_token;
    update public.rooms set
      seats = (select jsonb_agg(jsonb_build_object('seat', m.seat, 'name', m.name) order by m.seat)
                 from public.room_members m where m.code = p_code),
      version = version + 1
     where code = p_code;
    return jsonb_build_object('code', p_code, 'seat', v_seat,
             'isHost', (select is_host from public.room_members where code = p_code and token = p_token));
  end if;

  if v_room.phase <> 'lobby' then raise exception 'That game has already started'; end if;
  select count(*) into v_n from public.room_members where code = p_code;
  if v_n >= 10 then raise exception 'That room is full'; end if;
  if exists (select 1 from public.room_members where code = p_code and lower(name) = lower(p_name)) then
    raise exception 'Someone in the room already has that name';
  end if;

  v_seat := v_n;
  insert into public.room_members(code, seat, token, name, is_host)
  values (p_code, v_seat, p_token, p_name, false);

  update public.rooms set
    seats = (select jsonb_agg(jsonb_build_object('seat', m.seat, 'name', m.name) order by m.seat)
               from public.room_members m where m.code = p_code),
    version = version + 1
   where code = p_code;

  return jsonb_build_object('code', p_code, 'seat', v_seat, 'isHost', false);
end $$;

-- ── Who am I ───────────────────────────────────────────────
create or replace function public.my_seat(p_code text, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  select jsonb_build_object('seat', seat, 'name', name, 'isHost', is_host)
    into v from public.room_members where code = p_code and token = p_token;
  return v;
end $$;

-- ── Leave (lobby only; mid-game the seat is kept for reconnect) ──
create or replace function public.leave_room(p_code text, p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_phase text;
begin
  select phase into v_phase from public.rooms where code = p_code;
  if v_phase is distinct from 'lobby' then return false; end if;

  delete from public.room_members where code = p_code and token = p_token;
  -- Renumber so seats stay contiguous.
  with ordered as (
    select ctid, row_number() over (order by seat) - 1 as new_seat
      from public.room_members where code = p_code)
  update public.room_members m set seat = o.new_seat from ordered o where m.ctid = o.ctid;

  update public.rooms set
    seats = coalesce((select jsonb_agg(jsonb_build_object('seat', m.seat, 'name', m.name) order by m.seat)
                        from public.room_members m where m.code = p_code), '[]'::jsonb),
    version = version + 1
   where code = p_code;
  return true;
end $$;

-- ── Rewire the existing functions to the private membership table ──
create or replace function public.deal_avalon(p_code text, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_room public.rooms%rowtype; v_n integer; v_counts integer[];
  v_roles text[] := '{}'; v_good text[] := '{}'; v_evil text[] := '{}';
  v_opts jsonb; v_players jsonb := '[]'::jsonb;
  i integer; v_role text; v_team text; v_knows jsonb; v_name text;
begin
  select * into v_room from public.rooms where code = p_code for update;
  if not found then raise exception 'Room not found'; end if;
  if not exists (select 1 from public.room_members
                  where code = p_code and token = p_token and is_host) then
    raise exception 'Only the host can start the game';
  end if;

  select count(*) into v_n from public.room_members where code = p_code;
  if v_n < 5 or v_n > 10 then raise exception 'Avalon needs 5-10 players'; end if;

  v_counts := case v_n
    when 5 then array[3,2] when 6 then array[4,2] when 7 then array[4,3]
    when 8 then array[5,3] when 9 then array[6,3] else array[6,4] end;

  v_opts := coalesce(v_room.state -> 'roles', '{}'::jsonb);
  v_good := array['merlin']; v_evil := array['assassin'];
  if coalesce((v_opts->>'percival')::boolean,false) then
    v_good := v_good || 'percival'::text; v_evil := v_evil || 'morgana'::text; end if;
  if coalesce((v_opts->>'mordred')::boolean,false) then v_evil := v_evil || 'mordred'::text; end if;
  if coalesce((v_opts->>'oberon')::boolean,false)  then v_evil := v_evil || 'oberon'::text;  end if;
  if array_length(v_evil,1) > v_counts[2] then
    raise exception 'Too many special evil roles for % players', v_n; end if;
  while array_length(v_good,1) < v_counts[1] loop v_good := v_good || 'loyal'::text; end loop;
  while array_length(v_evil,1) < v_counts[2] loop v_evil := v_evil || 'minion'::text; end loop;

  select array_agg(r order by random()) into v_roles from unnest(v_good || v_evil) as r;

  delete from public.room_secrets     where code = p_code;
  delete from public.room_submissions where code = p_code;

  for i in 0 .. v_n - 1 loop
    select name into v_name from public.room_members where code = p_code and seat = i;
    v_role := v_roles[i + 1];
    v_team := case when v_role in ('merlin','percival','loyal') then 'good' else 'evil' end;
    v_players := v_players || jsonb_build_array(jsonb_build_object('id', i, 'name', v_name));
    insert into public.room_secrets(code, seat, token, role, team)
    select p_code, i, m.token, v_role, v_team from public.room_members m
     where m.code = p_code and m.seat = i;
  end loop;

  for i in 0 .. v_n - 1 loop
    select role, team into v_role, v_team from public.room_secrets where code = p_code and seat = i;
    if v_role = 'merlin' then
      select jsonb_build_object('text','These players are evil:','seats',
             coalesce(jsonb_agg(s.seat order by s.seat),'[]'::jsonb)) into v_knows
        from public.room_secrets s
       where s.code=p_code and s.team='evil' and s.role<>'mordred' and s.seat<>i;
    elsif v_role = 'percival' then
      select jsonb_build_object('text','One of these is Merlin, the other is Morgana:','seats',
             coalesce(jsonb_agg(s.seat order by random()),'[]'::jsonb)) into v_knows
        from public.room_secrets s where s.code=p_code and s.role in ('merlin','morgana');
    elsif v_team='evil' and v_role<>'oberon' then
      select jsonb_build_object('text','These players are also evil:','seats',
             coalesce(jsonb_agg(s.seat order by s.seat),'[]'::jsonb)) into v_knows
        from public.room_secrets s
       where s.code=p_code and s.team='evil' and s.role<>'oberon' and s.seat<>i;
    else
      v_knows := jsonb_build_object('text','You have no special knowledge.','seats','[]'::jsonb);
    end if;
    update public.room_secrets set knows = v_knows where code = p_code and seat = i;
  end loop;

  update public.rooms
     set state = jsonb_set(jsonb_set(v_room.state,'{players}',v_players),'{phase}','"reveal"'),
         phase = 'reveal', version = version + 1
   where code = p_code;

  return jsonb_build_object('ok', true, 'players', v_players);
end $$;

create or replace function public.close_room(p_code text, p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.rooms where code = p_code) then return false; end if;
  if not exists (select 1 from public.room_members
                  where code = p_code and token = p_token and is_host) then
    raise exception 'Only the host can close this room';
  end if;
  delete from public.rooms where code = p_code;
  return true;
end $$;

create or replace function public.cascade_room_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.room_secrets     where code = old.code;
  delete from public.room_submissions where code = old.code;
  delete from public.room_members     where code = old.code;
  return old;
end $$;

-- host_token is now vestigial; blank it so nothing useful is published.
update public.rooms set host_token = 'private';

grant execute on function public.create_room(text,text,jsonb) to anon;
grant execute on function public.join_room(text,text,text)    to anon;
grant execute on function public.my_seat(text,text)           to anon;
grant execute on function public.leave_room(text,text)        to anon;

-- Direct writes to rooms.seats would let a client forge membership.
revoke insert on public.rooms from anon;
drop policy if exists "anon create rooms" on public.rooms;
-- The deal must lay out the quest track too, or the client has no board.
-- Sizes and the two-fails rule on quest 4 for 7+ players are the standard
-- Avalon tables.
create or replace function public.avalon_quests(p_n integer)
returns jsonb language plpgsql immutable as $$
declare
  v_sizes integer[]; v_out jsonb := '[]'::jsonb; i integer; v_req integer;
begin
  v_sizes := case p_n
    when 5 then array[2,3,2,3,3] when 6 then array[2,3,4,3,4]
    when 7 then array[2,3,3,4,4] else array[3,4,4,5,5] end;
  for i in 1 .. 5 loop
    v_req := case when p_n >= 7 and i = 4 then 2 else 1 end;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'size', v_sizes[i], 'requiredFails', v_req,
      'team', '[]'::jsonb, 'votes', '{}'::jsonb, 'cards', '{}'::jsonb, 'result', 'pending'));
  end loop;
  return v_out;
end $$;

create or replace function public.deal_avalon(p_code text, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_room public.rooms%rowtype; v_n integer; v_counts integer[];
  v_roles text[] := '{}'; v_good text[] := '{}'; v_evil text[] := '{}';
  v_opts jsonb; v_players jsonb := '[]'::jsonb; v_names jsonb := '[]'::jsonb;
  i integer; v_role text; v_team text; v_knows jsonb; v_name text;
begin
  select * into v_room from public.rooms where code = p_code for update;
  if not found then raise exception 'Room not found'; end if;
  if not exists (select 1 from public.room_members
                  where code = p_code and token = p_token and is_host) then
    raise exception 'Only the host can start the game';
  end if;

  select count(*) into v_n from public.room_members where code = p_code;
  if v_n < 5 or v_n > 10 then raise exception 'Avalon needs 5-10 players'; end if;

  v_counts := case v_n
    when 5 then array[3,2] when 6 then array[4,2] when 7 then array[4,3]
    when 8 then array[5,3] when 9 then array[6,3] else array[6,4] end;

  v_opts := coalesce(v_room.state -> 'roles', '{}'::jsonb);
  v_good := array['merlin']; v_evil := array['assassin'];
  if coalesce((v_opts->>'percival')::boolean,false) then
    v_good := v_good || 'percival'::text; v_evil := v_evil || 'morgana'::text; end if;
  if coalesce((v_opts->>'mordred')::boolean,false) then v_evil := v_evil || 'mordred'::text; end if;
  if coalesce((v_opts->>'oberon')::boolean,false)  then v_evil := v_evil || 'oberon'::text;  end if;
  if array_length(v_evil,1) > v_counts[2] then
    raise exception 'Too many special evil roles for % players', v_n; end if;
  while array_length(v_good,1) < v_counts[1] loop v_good := v_good || 'loyal'::text; end loop;
  while array_length(v_evil,1) < v_counts[2] loop v_evil := v_evil || 'minion'::text; end loop;

  select array_agg(r order by random()) into v_roles from unnest(v_good || v_evil) as r;

  delete from public.room_secrets     where code = p_code;
  delete from public.room_submissions where code = p_code;

  for i in 0 .. v_n - 1 loop
    select name into v_name from public.room_members where code = p_code and seat = i;
    v_role := v_roles[i + 1];
    v_team := case when v_role in ('merlin','percival','loyal') then 'good' else 'evil' end;
    v_players := v_players || jsonb_build_array(jsonb_build_object('id', i, 'name', v_name));
    v_names   := v_names   || jsonb_build_array(to_jsonb(v_name));
    insert into public.room_secrets(code, seat, token, role, team)
    select p_code, i, m.token, v_role, v_team from public.room_members m
     where m.code = p_code and m.seat = i;
  end loop;

  for i in 0 .. v_n - 1 loop
    select role, team into v_role, v_team from public.room_secrets where code = p_code and seat = i;
    if v_role = 'merlin' then
      select jsonb_build_object('text','These players are evil:','seats',
             coalesce(jsonb_agg(s.seat order by s.seat),'[]'::jsonb)) into v_knows
        from public.room_secrets s
       where s.code=p_code and s.team='evil' and s.role<>'mordred' and s.seat<>i;
    elsif v_role = 'percival' then
      select jsonb_build_object('text','One of these is Merlin, the other is Morgana:','seats',
             coalesce(jsonb_agg(s.seat order by random()),'[]'::jsonb)) into v_knows
        from public.room_secrets s where s.code=p_code and s.role in ('merlin','morgana');
    elsif v_team='evil' and v_role<>'oberon' then
      select jsonb_build_object('text','These players are also evil:','seats',
             coalesce(jsonb_agg(s.seat order by s.seat),'[]'::jsonb)) into v_knows
        from public.room_secrets s
       where s.code=p_code and s.team='evil' and s.role<>'oberon' and s.seat<>i;
    else
      v_knows := jsonb_build_object('text','You have no special knowledge.','seats','[]'::jsonb);
    end if;
    update public.room_secrets set knows = v_knows where code = p_code and seat = i;
  end loop;

  -- Fresh public board. Everything secret is already in room_secrets.
  update public.rooms
     set state = v_room.state || jsonb_build_object(
           'phase','reveal', 'players', v_players, 'names', v_names,
           'playerCount', v_n, 'quests', public.avalon_quests(v_n),
           'leaderIndex', 0, 'questIndex', 0, 'rejectCount', 0,
           'voteHistory','[]'::jsonb, 'proposedTeam','[]'::jsonb,
           'currentVotes','{}'::jsonb, 'voteResult', null,
           'questCards','{}'::jsonb, 'questResult', null,
           'ready','{}'::jsonb, 'assassinGuess', null, 'winner', null,
           'merlinKilled', false, 'reason','', 'error', null) - 'pending',
         phase = 'reveal', version = version + 1
   where code = p_code;

  return jsonb_build_object('ok', true, 'players', v_players);
end $$;
grant execute on function public.deal_avalon(text,text) to anon;
grant execute on function public.avalon_quests(integer) to anon;
-- Resolving inside the same call that completes the round keeps it atomic:
-- no client has to notice "everyone voted" and race to write the result.
create or replace function public.submit_action(
  p_code text, p_token text, p_round text, p_kind text, p_value text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_seat integer; v_team text; v_total integer; v_done integer;
  v_room public.rooms%rowtype; v_state jsonb; v_qi integer;
  v_app integer; v_rej integer; v_fails integer; v_req integer; v_votes jsonb;
begin
  select seat, team into v_seat, v_team from public.room_secrets
   where code = p_code and token = p_token;
  if v_seat is null then raise exception 'You are not in this game'; end if;

  select * into v_room from public.rooms where code = p_code for update;
  v_state := v_room.state;
  v_qi := coalesce((v_state->>'questIndex')::int, 0);

  if p_kind = 'quest' then
    if p_value = 'fail' and v_team <> 'evil' then
      raise exception 'Good players must play Success';
    end if;
    if not (v_state->'quests'->v_qi->'team' @> to_jsonb(v_seat)) then
      raise exception 'You are not on this quest';
    end if;
    v_total := jsonb_array_length(v_state->'quests'->v_qi->'team');
  else
    v_total := jsonb_array_length(v_state->'players');
  end if;

  insert into public.room_submissions(code, round_key, seat, kind, value)
  values (p_code, p_round, v_seat, p_kind, p_value)
  on conflict (code, round_key, seat, kind) do nothing;

  select count(*) into v_done from public.room_submissions
   where code = p_code and round_key = p_round and kind = p_kind;

  if v_done < v_total then
    -- Publish the count only. Never who, never what.
    update public.rooms set
      state = jsonb_set(v_state, '{pending}', jsonb_build_object('done',v_done,'total',v_total)),
      version = version + 1
     where code = p_code;
    return jsonb_build_object('complete', false, 'done', v_done, 'total', v_total);
  end if;

  if p_kind = 'vote' then
    select count(*) filter (where value='approve'), count(*) filter (where value='reject')
      into v_app, v_rej from public.room_submissions
     where code=p_code and round_key=p_round and kind='vote';
    select jsonb_object_agg(seat::text, value) into v_votes
      from public.room_submissions where code=p_code and round_key=p_round and kind='vote';
    v_state := v_state
      || jsonb_build_object(
           'currentVotes', v_votes,
           'voteResult', jsonb_build_object('approve',v_app,'reject',v_rej,
                          'result', case when v_app > v_rej then 'approved' else 'rejected' end),
           'phase','vote_result')
      - 'pending';
  else
    select count(*) filter (where value='fail') into v_fails
      from public.room_submissions where code=p_code and round_key=p_round and kind='quest';
    v_req := coalesce((v_state->'quests'->v_qi->>'requiredFails')::int, 1);
    -- Only the tally is published; the per-player cards are never exposed.
    v_state := v_state
      || jsonb_build_object(
           'questResult', jsonb_build_object('failCount',v_fails,'required',v_req,
                            'passed', v_fails < v_req),
           'phase','quest_result')
      - 'pending';
  end if;

  update public.rooms set state = v_state, phase = v_state->>'phase', version = version + 1
   where code = p_code;

  return jsonb_build_object('complete', true, 'done', v_done, 'total', v_total);
end $$;
grant execute on function public.submit_action(text,text,text,text,text) to anon;
