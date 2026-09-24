-- Messages envoyés depuis le formulaire "Aide & Support". Chaque message est d'abord
-- enregistré ici (aucune demande perdue même si l'email échoue), puis transféré par
-- email (Resend) à la boîte support, avec Reply-To = email du client pour répondre
-- directement depuis la messagerie. email_envoye trace l'échec éventuel de l'envoi.
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  gie_id uuid not null references public.gies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  sujet text not null check (char_length(sujet) between 1 and 200),
  message text not null check (char_length(message) between 1 and 5000),
  statut varchar(20) not null default 'nouveau' check (statut in ('nouveau', 'en_cours', 'resolu')),
  email_envoye boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_messages_gie on public.support_messages (gie_id, created_at desc);

alter table public.support_messages enable row level security;

-- Un utilisateur crée et consulte les demandes de son GIE ; il ne peut ni les modifier
-- ni les supprimer (le statut est géré par l'admin plateforme via le service role).
create policy "Lecture support_messages par GIE"
on public.support_messages for select
using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));

create policy "Creation support_messages par GIE"
on public.support_messages for insert
with check (
  user_id = auth.uid()
  and gie_id in (select gie_id from public.utilisateurs where id = auth.uid())
);
