-- Paiements réels d'abonnement (Bictorys / Moneroo) et virements manuels

create table public.abonnement_paiements (
    id uuid default gen_random_uuid() primary key,
    gie_id uuid references public.gies(id) on delete cascade not null,
    niveau varchar(50) not null references public.tarif_abonnement(niveau),
    montant numeric not null,
    devise varchar(10) not null default 'XOF',
    provider varchar(20) not null check (provider in ('bictorys', 'moneroo', 'virement')),
    moyen_paiement varchar(20) not null check (moyen_paiement in ('wave', 'orange', 'carte', 'virement')),
    provider_reference text,
    statut varchar(20) not null default 'pending' check (statut in ('pending', 'completed', 'failed')),
    raw_webhook jsonb,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Une seule ligne par transaction distante (les webhooks peuvent être renvoyés plusieurs fois)
create unique index abonnement_paiements_provider_reference_key
    on public.abonnement_paiements (provider, provider_reference)
    where provider_reference is not null;

create index abonnement_paiements_gie_id_idx on public.abonnement_paiements (gie_id);

alter table public.abonnement_paiements enable row level security;

create policy "Les utilisateurs voient les paiements de leur GIE"
on public.abonnement_paiements for select using (
    gie_id in (select gie_id from public.utilisateurs where id = auth.uid())
);

create policy "Les utilisateurs créent des paiements pour leur GIE"
on public.abonnement_paiements for insert with check (
    gie_id in (select gie_id from public.utilisateurs where id = auth.uid())
);

-- Le client autorisé (anon + session utilisateur) peut mettre à jour la référence
-- prestataire ou marquer un paiement en échec, mais ne peut jamais le passer lui-même
-- à 'completed' : seul le webhook (client admin, hors RLS) accorde l'abonnement.
create policy "Les utilisateurs modifient leurs paiements en attente"
on public.abonnement_paiements for update using (
    gie_id in (select gie_id from public.utilisateurs where id = auth.uid())
) with check (
    gie_id in (select gie_id from public.utilisateurs where id = auth.uid())
    and statut <> 'completed'
);

-- Dédoublonnage des webhooks (un événement identique peut être renvoyé par le prestataire)
create table public.paiement_webhook_events (
    event_hash text not null,
    provider varchar(20) not null,
    created_at timestamp with time zone default now(),
    primary key (provider, event_hash)
);

alter table public.paiement_webhook_events enable row level security;
-- Aucune policy select/insert : seul le client admin (service role) des webhooks y accède.
