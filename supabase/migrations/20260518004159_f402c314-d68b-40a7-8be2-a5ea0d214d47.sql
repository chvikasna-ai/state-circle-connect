create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

create or replace function private.current_state()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select state_code from public.profiles where id = auth.uid()
$$;

grant execute on function private.has_role(uuid, public.app_role) to authenticated;
grant execute on function private.current_state() to authenticated;

alter policy "profiles readable by same-state users" on public.profiles
  using ((state_code = private.current_state()) or (id = auth.uid()));

alter policy "users read own roles" on public.user_roles
  using ((user_id = auth.uid()) or private.has_role(auth.uid(), 'admin'));

alter policy "admins manage roles" on public.user_roles
  using (private.has_role(auth.uid(), 'admin'))
  with check (private.has_role(auth.uid(), 'admin'));

alter policy "messages readable same state" on public.room_messages
  using (state_code = private.current_state());

alter policy "messages insert own" on public.room_messages
  with check ((user_id = auth.uid()) and (state_code = private.current_state()));

alter policy "messages delete own or admin" on public.room_messages
  using ((user_id = auth.uid()) or private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'helper'));

alter policy "questions readable same state" on public.questions
  using (state_code = private.current_state());

alter policy "questions insert own" on public.questions
  with check ((user_id = auth.uid()) and (state_code = private.current_state()));

alter policy "questions delete own or admin" on public.questions
  using ((user_id = auth.uid()) or private.has_role(auth.uid(), 'admin'));

alter policy "answers readable same state" on public.answers
  using (state_code = private.current_state());

alter policy "answers insert own" on public.answers
  with check ((user_id = auth.uid()) and (state_code = private.current_state()));

alter policy "answers delete own or admin" on public.answers
  using ((user_id = auth.uid()) or private.has_role(auth.uid(), 'admin'));

alter policy "news readable same state" on public.news_posts
  using (state_code = private.current_state());

alter policy "news insert helper/admin" on public.news_posts
  with check (((private.has_role(auth.uid(), 'helper')) or (private.has_role(auth.uid(), 'admin'))) and (author_id = auth.uid()) and (state_code = private.current_state()));

alter policy "news update author admin" on public.news_posts
  using ((author_id = auth.uid()) or private.has_role(auth.uid(), 'admin'));

alter policy "news delete author admin" on public.news_posts
  using ((author_id = auth.uid()) or private.has_role(auth.uid(), 'admin'));

alter policy "events readable same state" on public.events
  using ((state_code = private.current_state()) and (approved or (submitted_by = auth.uid()) or private.has_role(auth.uid(), 'admin')));

alter policy "events insert own" on public.events
  with check ((submitted_by = auth.uid()) and (state_code = private.current_state()));

alter policy "events update admin or submitter" on public.events
  using (private.has_role(auth.uid(), 'admin') or (submitted_by = auth.uid()));

alter policy "events delete admin or submitter" on public.events
  using (private.has_role(auth.uid(), 'admin') or (submitted_by = auth.uid()));

revoke execute on function public.has_role(uuid, public.app_role) from authenticated;
revoke execute on function public.current_state() from authenticated;