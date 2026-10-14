-- Venessa Study: core schema
-- Every table has Row Level Security enabled.
-- Integrity-critical tables (questions, answer keys, attempts, marks, mistakes, jobs, usage)
-- are read-only for end users. All writes go through authenticated server routes that use
-- the service role and always scope by the verified user id.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles & preferences
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Venessa Ponohazo'
    check (char_length(display_name) between 1 and 80),
  avatar_path text,
  subjects text[] not null default '{}',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  education_level text check (char_length(education_level) <= 120),
  curriculum text check (char_length(curriculum) <= 160),
  explanation_style text not null default 'simple'
    check (explanation_style in ('simple', 'detailed', 'examples_first')),
  preferred_difficulty text not null default 'mixed'
    check (preferred_difficulty in ('easy', 'medium', 'hard', 'mixed')),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  text_scale real not null default 1 check (text_scale between 0.85 and 1.5),
  reduced_motion text not null default 'system'
    check (reduced_motion in ('system', 'reduce', 'no-preference')),
  haptics boolean not null default true,
  streak_enabled boolean not null default true,
  notifications_enabled boolean not null default false,
  reminder_hour smallint check (reminder_hour between 0 and 23),
  timezone text check (char_length(timezone) <= 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create profile + preferences automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- study material
-- ---------------------------------------------------------------------------
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  subject text check (char_length(subject) <= 80),
  source_type text not null check (source_type in ('pdf', 'docx', 'pptx', 'images', 'text')),
  status text not null default 'uploading'
    check (status in ('uploading', 'queued', 'processing', 'ready', 'failed')),
  page_count integer not null default 0,
  topics text[] not null default '{}',
  summary text,
  key_concepts jsonb not null default '[]'::jsonb,
  total_bytes bigint not null default 0,
  low_text boolean not null default false,
  error_code text,
  reading_position jsonb,
  last_studied_at timestamptz,
  search tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index materials_user_idx on public.materials (user_id, created_at desc);
create index materials_search_idx on public.materials using gin (search);

create or replace function public.materials_search_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search :=
    setweight(to_tsvector('english'::regconfig, coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(new.subject, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, array_to_string(new.topics, ' ')), 'B');
  return new;
end;
$$;
create trigger materials_search_trg
  before insert or update of title, subject, topics on public.materials
  for each row execute function public.materials_search_update();

create table public.material_files (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  original_name text not null check (char_length(original_name) <= 255),
  position integer not null default 0,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index material_files_material_idx on public.material_files (material_id, position);

create table public.material_pages (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  page_number integer not null check (page_number >= 1),
  label text not null,
  content text not null default '',
  file_id uuid references public.material_files (id) on delete set null,
  is_scan boolean not null default false,
  created_at timestamptz not null default now(),
  unique (material_id, page_number)
);

create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  chunk_index integer not null,
  page_number integer not null,
  page_label text not null,
  heading text,
  content text not null,
  token_count integer not null default 0,
  embedding extensions.vector(768),
  fts tsvector generated always as (
    to_tsvector('english'::regconfig, coalesce(heading, '') || ' ' || content)
  ) stored,
  created_at timestamptz not null default now(),
  unique (material_id, chunk_index)
);
create index chunks_user_material_idx on public.chunks (user_id, material_id);
create index chunks_fts_idx on public.chunks using gin (fts);
create index chunks_embedding_idx on public.chunks
  using hnsw (embedding extensions.vector_cosine_ops);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  material_id uuid references public.materials (id) on delete cascade,
  subject text,
  name text not null check (char_length(name) <= 160),
  created_at timestamptz not null default now()
);
create index topics_user_idx on public.topics (user_id, material_id);

create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  topic text,
  term text not null check (char_length(term) <= 200),
  definition text not null,
  page_number integer,
  created_at timestamptz not null default now()
);
create index concepts_material_idx on public.concepts (material_id);

-- ---------------------------------------------------------------------------
-- background jobs
-- ---------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('process_material')),
  material_id uuid references public.materials (id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed')),
  stage text not null default 'extract'
    check (stage in ('extract', 'structure', 'chunk', 'embed', 'analyze', 'done')),
  progress integer not null default 0 check (progress between 0 and 100),
  detail jsonb not null default '{}'::jsonb,
  run_count integer not null default 0,
  error_code text,
  error_detail text,
  locked_until timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_material_idx on public.jobs (material_id);
create index jobs_pending_idx on public.jobs (status, locked_until) where status in ('queued', 'running');

-- ---------------------------------------------------------------------------
-- lessons & tutor chat
-- ---------------------------------------------------------------------------
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('notes', 'topic')),
  title text not null check (char_length(title) between 1 and 200),
  subject text,
  topic text,
  material_ids uuid[] not null default '{}',
  params jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
  sections_done integer not null default 0,
  sections_total integer not null default 0,
  error_code text,
  reading_progress real not null default 0 check (reading_progress between 0 and 1),
  last_studied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lessons_user_idx on public.lessons (user_id, created_at desc);

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  context_type text not null default 'general'
    check (context_type in ('general', 'material', 'lesson', 'question')),
  context_id uuid,
  context_label text check (char_length(context_label) <= 200),
  title text not null default 'New conversation' check (char_length(title) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index chat_threads_context_uniq
  on public.chat_threads (user_id, context_type, context_id)
  where context_id is not null;

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 40000),
  created_at timestamptz not null default now()
);
create index chat_messages_thread_idx on public.chat_messages (thread_id, created_at);

-- ---------------------------------------------------------------------------
-- quizzes
-- ---------------------------------------------------------------------------
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  source_type text not null
    check (source_type in ('notes', 'lesson', 'topic', 'weak_areas', 'similar')),
  source_material_ids uuid[] not null default '{}',
  source_lesson_id uuid references public.lessons (id) on delete set null,
  subject text,
  topic text,
  settings jsonb not null default '{}'::jsonb,
  question_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index quizzes_user_idx on public.quizzes (user_id, created_at desc);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  position integer not null,
  type text not null check (type in ('mcq', 'true_false', 'short_answer', 'fill_blank')),
  prompt text not null,
  options jsonb,
  subject text,
  topic text,
  concept text,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  max_marks numeric(5, 2) not null default 1 check (max_marks > 0),
  source_material_id uuid references public.materials (id) on delete set null,
  source_chunk_id uuid references public.chunks (id) on delete set null,
  source_page integer,
  created_at timestamptz not null default now(),
  unique (quiz_id, position)
);

-- RESTRICTED: never readable by end users. RLS is enabled and there are no policies,
-- so only the service role (server) can read it. The server exposes answers only
-- through the results endpoint after an attempt has been submitted.
create table public.question_answer_keys (
  question_id uuid primary key references public.questions (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  correct_option smallint,
  correct_bool boolean,
  accepted_answers text[] not null default '{}',
  rubric jsonb,
  model_answer text,
  explanation text not null default '',
  remember_tip text not null default ''
);
create index answer_keys_quiz_idx on public.question_answer_keys (quiz_id);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  mode text not null default 'practice' check (mode in ('practice', 'exam')),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'marking', 'marked', 'failed')),
  started_at timestamptz not null default now(),
  deadline timestamptz,
  duration_seconds integer,
  submitted_at timestamptz,
  marked_at timestamptz,
  auto_submitted boolean not null default false,
  score numeric(7, 2),
  max_score numeric(7, 2),
  correct_count integer,
  partial_count integer,
  incorrect_count integer,
  unanswered_count integer,
  time_taken_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index attempts_user_idx on public.attempts (user_id, created_at desc);
create index attempts_quiz_idx on public.attempts (quiz_id);

create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  answer jsonb,
  flagged boolean not null default false,
  saved_at timestamptz not null default now(),
  awarded_marks numeric(5, 2),
  max_marks numeric(5, 2),
  verdict text check (verdict in ('correct', 'partial', 'incorrect', 'unanswered')),
  feedback jsonb,
  unique (attempt_id, question_id)
);
create index attempt_answers_user_idx on public.attempt_answers (user_id);

create table public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dedupe_key text not null,
  question_id uuid references public.questions (id) on delete set null,
  quiz_id uuid references public.quizzes (id) on delete set null,
  subject text,
  topic text,
  concept text,
  question_type text not null,
  prompt text not null,
  options jsonb,
  user_answer text,
  correct_answer text not null,
  explanation text not null default '',
  remember_tip text not null default '',
  last_verdict text not null check (last_verdict in ('partial', 'incorrect', 'unanswered')),
  times_missed integer not null default 1,
  status text not null default 'active' check (status in ('active', 'understood')),
  suggest_understood boolean not null default false,
  first_missed_at timestamptz not null default now(),
  last_missed_at timestamptz not null default now(),
  understood_at timestamptz,
  unique (user_id, dedupe_key)
);
create index mistakes_user_status_idx on public.mistakes (user_id, status, last_missed_at desc);

-- ---------------------------------------------------------------------------
-- study activity
-- ---------------------------------------------------------------------------
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity text not null check (activity in ('reading', 'lesson', 'quiz', 'exam', 'tutor')),
  ref_id uuid,
  local_date date not null,
  started_at timestamptz not null default now(),
  last_beat_at timestamptz not null default now(),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);
create index study_sessions_user_day_idx on public.study_sessions (user_id, local_date);

-- ---------------------------------------------------------------------------
-- abuse & cost controls
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (user_id, bucket, window_start)
);

create table public.usage_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  ai_requests integer not null default 0,
  primary key (user_id, day)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger preferences_updated before update on public.preferences
  for each row execute function public.set_updated_at();
create trigger materials_updated before update on public.materials
  for each row execute function public.set_updated_at();
create trigger jobs_updated before update on public.jobs
  for each row execute function public.set_updated_at();
create trigger lessons_updated before update on public.lessons
  for each row execute function public.set_updated_at();
create trigger chat_threads_updated before update on public.chat_threads
  for each row execute function public.set_updated_at();
create trigger attempts_updated before update on public.attempts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.preferences enable row level security;
alter table public.materials enable row level security;
alter table public.material_files enable row level security;
alter table public.material_pages enable row level security;
alter table public.chunks enable row level security;
alter table public.topics enable row level security;
alter table public.concepts enable row level security;
alter table public.jobs enable row level security;
alter table public.lessons enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.question_answer_keys enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.mistakes enable row level security;
alter table public.study_sessions enable row level security;
alter table public.rate_limits enable row level security;
alter table public.usage_limits enable row level security;
alter table public.push_subscriptions enable row level security;

-- profiles / preferences: read + update own
create policy "own profile read" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "own profile update" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "own prefs read" on public.preferences for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own prefs update" on public.preferences for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- materials: full control of own rows (status is advisory; processing is server-side)
create policy "own materials read" on public.materials for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own materials update" on public.materials for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own materials delete" on public.materials for delete to authenticated
  using ((select auth.uid()) = user_id);

-- read-only own rows
create policy "own files read" on public.material_files for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own pages read" on public.material_pages for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own chunks read" on public.chunks for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own topics read" on public.topics for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own concepts read" on public.concepts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own jobs read" on public.jobs for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "own lessons read" on public.lessons for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own lessons delete" on public.lessons for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "own threads read" on public.chat_threads for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own threads delete" on public.chat_threads for delete to authenticated
  using ((select auth.uid()) = user_id);
create policy "own messages read" on public.chat_messages for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "own quizzes read" on public.quizzes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own quizzes delete" on public.quizzes for delete to authenticated
  using ((select auth.uid()) = user_id);
create policy "own questions read" on public.questions for select to authenticated
  using ((select auth.uid()) = user_id);
-- question_answer_keys: intentionally NO policies.

create policy "own attempts read" on public.attempts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own attempt answers read" on public.attempt_answers for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own mistakes read" on public.mistakes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own sessions read" on public.study_sessions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own usage read" on public.usage_limits for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own push read" on public.push_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own push delete" on public.push_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Belt and braces: anon has no table access at all; answer keys are server-only.
revoke all on all tables in schema public from anon;
revoke all on public.question_answer_keys from authenticated;
revoke all on public.rate_limits from authenticated;

-- Column-level protection: end users may only change harmless columns directly.
revoke update on public.materials from authenticated;
grant update (title, subject, reading_position, last_studied_at) on public.materials to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, subjects, onboarding_completed_at) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- functions
-- ---------------------------------------------------------------------------

-- Hybrid retrieval (vector + keyword) fused with Reciprocal Rank Fusion.
-- SECURITY INVOKER: when called with a user JWT, RLS limits rows to that user.
-- p_keywords must be a sanitized to_tsquery expression like 'cell | membrane'.
create or replace function public.hybrid_search_chunks(
  p_user_id uuid,
  p_keywords text,
  p_embedding extensions.vector(768),
  p_match_count integer default 8,
  p_material_ids uuid[] default null,
  p_rrf_k integer default 50
)
returns table (
  id uuid,
  material_id uuid,
  page_number integer,
  page_label text,
  heading text,
  content text,
  score double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with vec as (
    select c.id, row_number() over (order by c.embedding <=> p_embedding) as rnk
    from public.chunks c
    where p_embedding is not null
      and c.user_id = p_user_id
      and c.embedding is not null
      and (p_material_ids is null or c.material_id = any (p_material_ids))
    order by c.embedding <=> p_embedding
    limit greatest(p_match_count, 1) * 4
  ),
  kw as (
    select c.id, row_number() over (order by ts_rank_cd(c.fts, q.query) desc) as rnk
    from public.chunks c,
      lateral (select to_tsquery('english'::regconfig, p_keywords) as query) q
    where coalesce(p_keywords, '') <> ''
      and c.user_id = p_user_id
      and (p_material_ids is null or c.material_id = any (p_material_ids))
      and c.fts @@ q.query
    order by ts_rank_cd(c.fts, q.query) desc
    limit greatest(p_match_count, 1) * 4
  )
  select c.id, c.material_id, c.page_number, c.page_label, c.heading, c.content,
    (coalesce(1.0 / (p_rrf_k + vec.rnk), 0) + coalesce(1.0 / (p_rrf_k + kw.rnk), 0))::double precision as score
  from vec
  full outer join kw on vec.id = kw.id
  join public.chunks c on c.id = coalesce(vec.id, kw.id)
  order by score desc
  limit greatest(p_match_count, 1);
$$;

-- Library search: titles/subjects/topics plus note content.
create or replace function public.search_materials(p_keywords text)
returns table (material_id uuid, rank real)
language sql
stable
security invoker
set search_path = public
as $$
  with q as (select to_tsquery('english'::regconfig, p_keywords) as query),
  m as (
    select mt.id as material_id, ts_rank(mt.search, q.query) * 2 as rank
    from public.materials mt, q
    where mt.user_id = (select auth.uid()) and mt.search @@ q.query
  ),
  c as (
    select ch.material_id, max(ts_rank(ch.fts, q.query)) as rank
    from public.chunks ch, q
    where ch.user_id = (select auth.uid()) and ch.fts @@ q.query
    group by ch.material_id
  )
  select material_id, sum(rank)::real as rank
  from (select * from m union all select * from c) u
  group by material_id
  order by rank desc
  limit 50;
$$;

-- Atomic fixed-window rate limiter (server only).
create or replace function public.consume_rate_limit(
  p_user uuid, p_bucket text, p_limit integer, p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits (user_id, bucket, window_start, count)
  values (p_user, p_bucket, v_window, 1)
  on conflict (user_id, bucket, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;

  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_count <= p_limit;
end;
$$;

-- Daily AI budget (server only). Returns false once the cap is reached.
create or replace function public.consume_ai_budget(p_user uuid, p_daily_cap integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.usage_limits (user_id, day, ai_requests)
  values (p_user, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
  do update set ai_requests = public.usage_limits.ai_requests + 1
  returning ai_requests into v_count;
  return v_count <= p_daily_cap;
end;
$$;

-- Record (or bump) a mistake, de-duplicated by concept/question key (server only).
create or replace function public.record_mistake(
  p_user uuid,
  p_dedupe_key text,
  p_question_id uuid,
  p_quiz_id uuid,
  p_subject text,
  p_topic text,
  p_concept text,
  p_question_type text,
  p_prompt text,
  p_options jsonb,
  p_user_answer text,
  p_correct_answer text,
  p_explanation text,
  p_remember_tip text,
  p_verdict text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.mistakes (
    user_id, dedupe_key, question_id, quiz_id, subject, topic, concept, question_type,
    prompt, options, user_answer, correct_answer, explanation, remember_tip, last_verdict
  ) values (
    p_user, p_dedupe_key, p_question_id, p_quiz_id, p_subject, p_topic, p_concept, p_question_type,
    p_prompt, p_options, p_user_answer, p_correct_answer, p_explanation, p_remember_tip, p_verdict
  )
  on conflict (user_id, dedupe_key) do update set
    question_id = excluded.question_id,
    quiz_id = excluded.quiz_id,
    prompt = excluded.prompt,
    options = excluded.options,
    user_answer = excluded.user_answer,
    correct_answer = excluded.correct_answer,
    explanation = excluded.explanation,
    remember_tip = excluded.remember_tip,
    last_verdict = excluded.last_verdict,
    times_missed = public.mistakes.times_missed + 1,
    status = 'active',
    suggest_understood = false,
    understood_at = null,
    last_missed_at = now();
end;
$$;

revoke all on function public.consume_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function public.consume_ai_budget(uuid, integer) from public, anon, authenticated;
revoke all on function public.record_mistake(uuid, text, uuid, uuid, text, text, text, text, text, jsonb, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.hybrid_search_chunks(uuid, text, extensions.vector, integer, uuid[], integer) from public, anon;
revoke all on function public.search_materials(text) from public, anon;
grant execute on function public.hybrid_search_chunks(uuid, text, extensions.vector, integer, uuid[], integer) to authenticated, service_role;
grant execute on function public.search_materials(text) to authenticated, service_role;
grant execute on function public.consume_rate_limit(uuid, text, integer, integer) to service_role;
grant execute on function public.consume_ai_budget(uuid, integer) to service_role;
grant execute on function public.record_mistake(uuid, text, uuid, uuid, text, text, text, text, text, jsonb, text, text, text, text, text) to service_role;
