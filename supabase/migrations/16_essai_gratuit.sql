-- Période d'essai gratuite d'une semaine : le GIE obtient immédiatement le forfait
-- choisi à l'inscription, avec une date d'expiration d'essai. Si aucun paiement
-- n'est confirmé avant cette date, l'accès est verrouillé (voir middleware.ts).
-- Un paiement confirmé (webhook) efface cette date — voir lib/payments/fulfill.ts.

alter table public.gies add column essai_expire_le timestamp with time zone;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_gie_nom text;
  v_gie_id uuid;
  v_plan text;
begin
  v_gie_nom := coalesce(new.raw_user_meta_data->>'gie_nom', 'GIE Sans Nom');

  v_plan := coalesce(new.raw_user_meta_data->>'plan', 'standard');
  if v_plan not in ('standard', 'medium', 'premium') then
    v_plan := 'standard';
  end if;

  insert into public.gies (nom, abonnement_statut, subscription_tier, essai_expire_le)
  values (v_gie_nom, 'actif', v_plan, now() + interval '7 days')
  returning id into v_gie_id;

  insert into public.utilisateurs (id, gie_id, role)
  values (new.id, v_gie_id, 'admin');

  return new;
end;
$$ language plpgsql security definer;
