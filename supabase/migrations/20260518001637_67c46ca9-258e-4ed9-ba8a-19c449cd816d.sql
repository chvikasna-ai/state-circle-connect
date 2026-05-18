
-- Roles enum + table
create type public.app_role as enum ('admin', 'helper', 'member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  state_code text not null,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

-- Security definer helpers
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.current_state()
returns text language sql stable security definer set search_path = public as $$
  select state_code from public.profiles where id = auth.uid()
$$;

-- Rooms (fixed categories)
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.rooms enable row level security;

insert into public.rooms (slug, name, description, sort_order) values
  ('homework-help', 'Homework Help', 'Get help with school assignments and studies.', 1),
  ('local-events', 'Local Events', 'Discuss upcoming events in your state.', 2),
  ('community-news', 'Community News', 'Discuss verified local news.', 3),
  ('teen-advice', 'Teen Advice', 'Friendly advice from peers and helpers.', 4),
  ('lost-and-found', 'Lost & Found', 'Help reunite lost items with their owners.', 5),
  ('study-groups', 'Study Groups', 'Form and join study groups.', 6);

-- Room messages
create table public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  state_code text not null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
alter table public.room_messages enable row level security;
create index on public.room_messages (room_id, state_code, created_at desc);

-- Q&A
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state_code text not null,
  title text not null check (char_length(title) between 3 and 200),
  body text check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);
alter table public.questions enable row level security;
create index on public.questions (state_code, created_at desc);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  state_code text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table public.answers enable row level security;
create index on public.answers (question_id, created_at);

-- News
create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  state_code text not null,
  headline text not null check (char_length(headline) between 5 and 160),
  summary text not null check (char_length(summary) between 5 and 600),
  source_url text,
  created_at timestamptz not null default now()
);
alter table public.news_posts enable row level security;
create index on public.news_posts (state_code, created_at desc);

create table public.news_reactions (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null references public.news_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('like','support','important')),
  created_at timestamptz not null default now(),
  unique(news_id, user_id, reaction)
);
alter table public.news_reactions enable row level security;

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users(id) on delete cascade,
  state_code text not null,
  title text not null check (char_length(title) between 3 and 160),
  description text check (char_length(description) <= 1000),
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  approved boolean not null default false,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
create index on public.events (state_code, starts_at);

-- RLS Policies
-- profiles: each user can read profiles of same state, manage own
create policy "profiles readable by same-state users" on public.profiles
  for select to authenticated using (state_code = public.current_state() or id = auth.uid());
create policy "users insert own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid());

-- user_roles: users read own; admins manage all
create policy "users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- rooms: readable to all authenticated
create policy "rooms readable" on public.rooms for select to authenticated using (true);

-- room_messages: read same state, insert own with own state
create policy "messages readable same state" on public.room_messages
  for select to authenticated using (state_code = public.current_state());
create policy "messages insert own" on public.room_messages
  for insert to authenticated with check (user_id = auth.uid() and state_code = public.current_state());
create policy "messages delete own or admin" on public.room_messages
  for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'helper'));

-- questions
create policy "questions readable same state" on public.questions
  for select to authenticated using (state_code = public.current_state());
create policy "questions insert own" on public.questions
  for insert to authenticated with check (user_id = auth.uid() and state_code = public.current_state());
create policy "questions update own" on public.questions
  for update to authenticated using (user_id = auth.uid());
create policy "questions delete own or admin" on public.questions
  for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- answers
create policy "answers readable same state" on public.answers
  for select to authenticated using (state_code = public.current_state());
create policy "answers insert own" on public.answers
  for insert to authenticated with check (user_id = auth.uid() and state_code = public.current_state());
create policy "answers update own" on public.answers
  for update to authenticated using (user_id = auth.uid());
create policy "answers delete own or admin" on public.answers
  for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- news_posts: same-state read; only helpers/admins insert
create policy "news readable same state" on public.news_posts
  for select to authenticated using (state_code = public.current_state());
create policy "news insert helper/admin" on public.news_posts
  for insert to authenticated with check (
    (public.has_role(auth.uid(),'helper') or public.has_role(auth.uid(),'admin'))
    and author_id = auth.uid() and state_code = public.current_state()
  );
create policy "news update author admin" on public.news_posts
  for update to authenticated using (author_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "news delete author admin" on public.news_posts
  for delete to authenticated using (author_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- news_reactions
create policy "reactions readable" on public.news_reactions
  for select to authenticated using (true);
create policy "reactions insert own" on public.news_reactions
  for insert to authenticated with check (user_id = auth.uid());
create policy "reactions delete own" on public.news_reactions
  for delete to authenticated using (user_id = auth.uid());

-- events: same-state can read approved (or own); members submit; admins approve
create policy "events readable same state" on public.events
  for select to authenticated using (
    state_code = public.current_state() and (approved or submitted_by = auth.uid() or public.has_role(auth.uid(),'admin'))
  );
create policy "events insert own" on public.events
  for insert to authenticated with check (submitted_by = auth.uid() and state_code = public.current_state());
create policy "events update admin or submitter" on public.events
  for update to authenticated using (public.has_role(auth.uid(),'admin') or submitted_by = auth.uid());
create policy "events delete admin or submitter" on public.events
  for delete to authenticated using (public.has_role(auth.uid(),'admin') or submitted_by = auth.uid());

-- Auto-create member role on new profile
create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles (user_id, role) values (new.id, 'member')
    on conflict do nothing;
  return new;
end; $$;

create trigger on_profile_created after insert on public.profiles
  for each row execute function public.handle_new_profile();
