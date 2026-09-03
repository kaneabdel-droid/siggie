-- Script 4: Inscription des membres aux campagnes

create table public.campagne_membres (
    campagne_id uuid references public.campagnes(id) on delete cascade not null,
    membre_id uuid references public.membres(id) on delete cascade not null,
    gie_id uuid references public.gies(id) on delete cascade not null,
    created_at timestamp with time zone default now(),
    primary key (campagne_id, membre_id)
);

alter table public.campagne_membres enable row level security;

create policy "Acces campagne_membres par GIE" 
on public.campagne_membres for all using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));
